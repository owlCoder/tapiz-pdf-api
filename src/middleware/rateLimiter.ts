import { rateLimiter, RedisStore } from "hono-rate-limiter";
import { getValkeyClient } from "../core/valkeyClient.ts";

/**
 * Thin ioredis → hono-rate-limiter adapter.
 * Mirrors the pattern in the Tapiz REST API rateLimiter.ts.
 */
function makeRedisStore(prefix: string) {
  const redis = getValkeyClient();

  const client = {
    scriptLoad: (script: string): Promise<string> =>
      (redis.script("LOAD", script) as Promise<string>),

    evalsha: <TArgs extends unknown[], TData = unknown>(
      sha1: string,
      keys: string[],
      args: TArgs,
    ): Promise<TData> => {
      const flatArgs = [...(args as (string | number)[])];
      return redis.evalsha(
        sha1,
        keys.length,
        ...(keys as (string | Buffer | number)[]),
        ...flatArgs,
      ) as Promise<TData>;
    },

    decr: (key: string): Promise<number> => redis.decr(key),
    del:  (key: string): Promise<number>  => redis.del(key),
  };

  return new RedisStore({ client, prefix });
}

/**
 * 10 PDF generation requests per IP per 15 minutes.
 * Errors silently if Valkey is unavailable (in-memory fallback via hono-rate-limiter).
 */
export const pdfRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-6",
  keyGenerator: (c) =>
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
  message: { error: "Previše zahteva. Pokušajte ponovo za 15 minuta." },
  store: makeRedisStore("rl:pdf:"),
});

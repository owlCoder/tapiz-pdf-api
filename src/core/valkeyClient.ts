import Redis from "ioredis";

let client: Redis | null = null;

export function getValkeyClient(): Redis {
  if (!client) {
    client = new Redis(process.env.VALKEY_URL ?? "redis://localhost:6379", {
      tls: process.env.VALKEY_URL?.startsWith("rediss://") ? {} : undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 4000,
      commandTimeout: 2000,
    });

    client.on("error", () => {
      // suppress — rate limiter degrades gracefully if Valkey is unavailable
    });
  }
  return client;
}

import type { Context } from "hono";

export function errorHandler(err: unknown, c: Context) {
  console.error("[PDF Service] Unhandled error:", err);
  return c.json(
    { error: "Interna greška servera", details: String(err) },
    500,
  );
}

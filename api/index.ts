import "dotenv/config";
import type { IncomingMessage, ServerResponse } from "http";
import { app } from "../src/app.ts";

export const config = { runtime: "nodejs" };

// ── Bridge: Node.js IncomingMessage → Web Request → Web Response → Node ServerResponse ──

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const proto = (req.headers["x-forwarded-proto"] as string) ?? "https";
  const host  = req.headers.host ?? "localhost";
  const url   = `${proto}://${host}${req.url}`;

  const body = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
    else headers.set(key, value);
  }

  const method = req.method ?? "GET";
  const webReq = new Request(url, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : new Uint8Array(body),
  });

  const webRes = await app.fetch(webReq);
  res.writeHead(webRes.status, Object.fromEntries(webRes.headers.entries()));
  const responseBody = await webRes.arrayBuffer();
  res.end(Buffer.from(responseBody));
}

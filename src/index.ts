import "dotenv/config";
import { serve } from "@hono/node-server";
import { app } from "./app";

const PORT = parseInt(process.env.PORT ?? "3002", 10);

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`[Tapiz PDF Service] Running at http://localhost:${PORT}`);
  console.log(`[Tapiz PDF Service] Docs at      http://localhost:${PORT}/`);
});

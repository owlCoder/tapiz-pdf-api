import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { errorHandler } from "./middleware/errorHandler";
import { pdfRateLimiter } from "./middleware/rateLimiter";
import { statsRouter } from "./routes/statsRoute";
import { scoresheetRouter } from "./routes/scoresheetRoute";
import { attendancesRouter, formsRouter } from "./routes/attendancesFormsRoute";
import { sessionsRouter } from "./routes/sessionsRoute";
import { docsHtml } from "./core/docs";

const app = new Hono();

// ── CORS ──────────────────────────────────────────────────────────
const allowedOrigins = process.env.CLIENT_URL?.split(",").map((u) => u.trim()) ?? ["*"];
app.use("*", cors({ origin: allowedOrigins }));

// ── Body limit (50 MB, matches original) ─────────────────────────
app.use("/api/pdf/*", bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// ── Rate limiter (applied to all PDF routes) ──────────────────────
app.use("/api/pdf/*", pdfRateLimiter);

// ── PDF routes ────────────────────────────────────────────────────
app.route("/api/pdf/stats",        statsRouter);
app.route("/api/pdf/scoresheet",   scoresheetRouter);
app.route("/api/pdf/attendances",  attendancesRouter);
app.route("/api/pdf/forms",        formsRouter);
app.route("/api/pdf/sessions",     sessionsRouter);

// ── Health check ──────────────────────────────────────────────────
app.get("/api/health", (c) => c.json({ status: "ok", ts: new Date().toISOString() }));

// ── API docs (root + /api/docs) ───────────────────────────────────
app.get("/",          (c) => c.html(docsHtml));
app.get("/api/docs",  (c) => c.html(docsHtml));

// ── Global error handler ──────────────────────────────────────────
app.onError(errorHandler);

export { app };
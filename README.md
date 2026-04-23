# Tapiz PDF Service

Serverless PDF generation microservice for the Tapiz academic management platform. Handles attendance statistics, score sheets, attendance logs, and form response exports.

Built with **Hono** + **TypeScript** on Node.js, deployed as a Vercel serverless function.

---

## Tech Stack

| | |
|---|---|
| HTTP framework | [Hono](https://hono.dev/) |
| PDF engine | jsPDF + jspdf-autotable |
| Rate limiting | hono-rate-limiter (Valkey-backed) |
| Cache / ephemeral | Valkey (Redis-compatible, via ioredis) |
| Runtime | Node.js ≥ 18 |
| Deployment | Vercel Serverless |

---

## Project Structure

```
src/
├── app.ts                      # Hono app — route mounting, middleware, docs
├── index.ts                    # Local dev entry point
├── core/
│   ├── colors.ts               # Teal RGB palette (matches frontend CSS vars)
│   ├── docs.ts                 # OpenAPI-style HTML docs page
│   ├── Result.ts               # Ok / Err result type
│   └── valkeyClient.ts         # ioredis singleton
├── helpers/
│   ├── pdf.ts                  # Drawing primitives: header, footer, KPI cards, charts, table styles
│   └── text.ts                 # cyrillicToLatin, formatDate, formatDateTime
├── middleware/
│   ├── errorHandler.ts         # Global Hono error handler
│   └── rateLimiter.ts          # 10 req / 15 min per IP, Valkey-backed
└── routes/
    ├── statsRoute.ts           # POST /api/pdf/stats
    ├── scoresheetRoute.ts      # POST /api/pdf/scoresheet
    └── attendancesFormsRoute.ts # POST /api/pdf/attendances  +  POST /api/pdf/forms
api/
└── index.ts                    # Vercel serverless handler (Node → Web Request bridge)
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- A running Valkey / Redis instance (optional — rate limiter falls back to in-memory if unavailable)

### Install

```bash
npm install
```

### Environment Variables

Copy the example and fill in your values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `PORT` | | Local dev port (default: `3002`) |
| `CLIENT_URL` | | CORS allowed origin(s), comma-separated (default: `*`) |
| `VALKEY_URL` | | Redis-compatible URL, e.g. `redis://localhost:6379` or `rediss://...` for TLS |

### Development

```bash
npm run dev
```

Server starts at `http://localhost:3002`.  
Interactive API docs are available at `http://localhost:3002/`.

### Type Check

```bash
npm run typecheck
```

### Production Build

This project is designed for Vercel serverless deployment — no build step is needed locally. For a standalone Node.js build, `tsc` output goes to `dist/`.

---

## API Reference

All endpoints are prefixed with `/api`. A health check is available at:

```
GET /api/health  →  { "status": "ok", "ts": "..." }
```

Interactive docs with full request/response schemas are served at the root URL:

```
GET /  →  HTML docs page
```

### Endpoints

| Method | Path | Description | Output |
|---|---|---|---|
| `POST` | `/api/pdf/stats` | Attendance statistics PDF | Portrait A4 |
| `POST` | `/api/pdf/scoresheet` | Score sheet PDF with statistics grid | Landscape A4 |
| `POST` | `/api/pdf/attendances` | Detailed attendance log PDF | Portrait A4 |
| `POST` | `/api/pdf/forms` | Form responses export PDF | Portrait A4 |

All endpoints:
- Accept `Content-Type: application/json` with a 50 MB body limit
- Return `Content-Type: application/pdf` with `Content-Disposition: attachment`
- Filenames are automatically transliterated from Cyrillic/diacritics to Latin
- Return `429` when the rate limit is exceeded

### Rate Limiting

**10 requests per IP per 15 minutes**, applied across all `/api/pdf/*` routes.  
Backed by Valkey for consistency across serverless instances. Degrades gracefully to in-memory if Valkey is unavailable.

---

### POST `/api/pdf/stats`

Generates an attendance statistics PDF with KPI cards, a per-session bar chart, an overall progress bar with absence threshold marker, and a per-student status table.

```json
{
  "subject": {
    "name": "Programiranje 1",
    "code": "P1",
    "absenceThreshold": 30
  },
  "stats": {
    "totalSessions": 12,
    "totalStudents": 45,
    "perSession": [
      { "sessionNumber": "1", "count": "38" }
    ],
    "perStudent": [
      {
        "lastName": "Petrovic", "firstName": "Ana",
        "smer": "PR", "indexNumber": "42", "enrollmentYear": "2023",
        "count": "10"
      }
    ]
  },
  "matrix": { "enrolledCount": 45 }
}
```

`absenceThreshold` is the maximum allowed absence percentage. The attendance requirement displayed is `100 - absenceThreshold`. `matrix.enrolledCount` is optional — falls back to `stats.totalStudents`.

---

### POST `/api/pdf/scoresheet`

Generates a multi-page landscape PDF: a main data table with Min/Max/Avg header rows, a statistics card grid (up to 9 columns, 3×N layout), and a student summary table for graded columns only.

```json
{
  "name": "Tabela poena — Kolokvijum 1",
  "academicYear": "2024/25",
  "columns": [
    { "id": 1, "name": "Domaci",     "type": "number",  "maxPoints": 10,  "isHidden": false },
    { "id": 2, "name": "Kolokvijum", "type": "number",  "maxPoints": 30,  "isHidden": false },
    { "id": 3, "name": "Ukupno",     "type": "formula", "isHidden": false }
  ],
  "rows": [
    {
      "studentName": "Petrovic Ana",
      "indexNumber": "PR 42/2023",
      "computedCells": { "1": "8", "2": "24", "3": "32" }
    }
  ]
}
```

Column types: `number` cells are color-coded green/amber/red by percentage of `maxPoints`. `formula` cells are highlighted in primary teal. Columns with `isHidden: true` are excluded entirely.

---

### POST `/api/pdf/attendances`

Generates a detailed attendance log PDF with KPI cards, a per-session bar chart, and a sortable attendance table including session type color-coding.

```json
{
  "subject": { "name": "Programiranje 1", "code": "P1" },
  "attendances": [
    {
      "recordedAt": "2025-03-10T09:14:00Z",
      "student": {
        "id": 7,
        "lastName": "Jovic", "firstName": "Marko",
        "smer": "SI", "indexNumber": "15", "enrollmentYear": "2022"
      },
      "session": { "sessionNumber": 3, "sessionType": "Racunarske vezbe" }
    }
  ]
}
```

Session types: `Predavanja`, `Racunarske vezbe`, `Auditorne vezbe`, `Labaratorijske vezbe` — each rendered in a distinct color.

---

### POST `/api/pdf/forms`

Generates a form responses export PDF. Questions become columns, responses become rows.

```json
{
  "formTitle": "Anketa — Zadovoljstvo nastavom",
  "questions": [
    { "id": "q1", "label": "Kako ocenjujete predavanja?" },
    { "id": "q2", "label": "Predlog za poboljsanje" }
  ],
  "responses": [
    {
      "submittedAt": "2025-04-01T11:00:00Z",
      "answers": { "q1": "5", "q2": "Vise primera" }
    }
  ]
}
```

Array-type answers are joined with `, `. All text is transliterated before rendering.

---

## PDF Design

All PDFs share a consistent visual language that matches the Tapiz frontend:

- **Primary color**: Teal `#2f9d93` (matches `--color-primary-500` CSS variable)
- **Page header**: White background with a teal bottom accent line, title, subtitle, and right-aligned date
- **Page footer**: Gray separator line, left-side label, right-side page number (`Strana N od M`)
- **KPI cards**: White cards with a colored top accent bar, large value, and small label
- **Tables**: Clean grid theme with `gray-50` header, alternating row shading, and semantic text colors for status cells
- **Section titles**: Left teal accent bar + bold heading

---

## Deployment

The project is configured for Vercel via `vercel.json`. The `api/index.ts` file acts as the serverless handler — it bridges Node.js `IncomingMessage` / `ServerResponse` to the Hono Web Request API, matching the same pattern used in the Tapiz REST API.

```bash
vercel deploy
```

No additional configuration is needed beyond setting the environment variables in the Vercel dashboard.

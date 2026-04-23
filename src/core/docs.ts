export const docsHtml = /* html */ `<!DOCTYPE html>
<html lang="sr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tapiz PDF Service — API Docs</title>
  <style>
    :root {
      --primary:     #a08040;
      --primary-50: #faf7f2;
  --primary-100: #f0e8d8;
  --primary-200: #ddd0b0;
  --primary-300: #c8b888;
  --primary-400: #c0a870;
  --primary-500: #a08040;
  --primary-600: #7a5e28;
  --primary-700: #603e18;
  --primary-800: #503c14;
  --primary-900: #38280c;
  --primary-950: #200e04;
      --gray-50:  #f9fafb;
      --gray-100: #f3f4f6;
      --gray-200: #e5e7eb;
      --gray-400: #9ca3af;
      --gray-500: #6b7280;
      --gray-600: #4b5563;
      --gray-700: #374151;
      --gray-800: #1f2937;
      --emerald:  #10b94d;
      --red:      #dc2626;
      --amber:    #d97706;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--gray-50);
      color: var(--gray-800);
      line-height: 1.6;
    }

    /* ── Nav ── */
    nav {
      background: var(--primary-900);
      border-bottom: 3px solid var(--primary);
      padding: 0 2rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      height: 56px;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    nav .logo {
      font-size: 1.1rem;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.3px;
    }
    nav .logo span { color: var(--primary); }
    nav .badge {
      font-size: 0.65rem;
      background: var(--primary);
      color: #fff;
      padding: 2px 8px;
      border-radius: 999px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    nav .spacer { flex: 1; }
    nav .rate-info {
      font-size: 0.75rem;
      color: var(--gray-400);
    }

    /* ── Layout ── */
    .container {
      max-width: 860px;
      margin: 0 auto;
      padding: 2.5rem 1.5rem 4rem;
    }

    /* ── Hero ── */
    .hero {
      background: linear-gradient(135deg, var(--primary-800) 0%, var(--primary-900) 100%);
      border-radius: 12px;
      padding: 2rem 2.5rem;
      margin-bottom: 2rem;
      color: #fff;
    }
    .hero h1 { font-size: 1.6rem; font-weight: 700; margin-bottom: 0.4rem; }
    .hero p  { font-size: 0.9rem; color: var(--primary-100); max-width: 480px; }
    .hero .meta {
      display: flex;
      gap: 1.5rem;
      margin-top: 1.2rem;
      font-size: 0.8rem;
      color: var(--primary-100);
    }
    .hero .meta span::before { content: "• "; }

    /* ── Section titles ── */
    h2 {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--gray-500);
      margin: 2rem 0 0.75rem;
    }

    /* ── Endpoint card ── */
    .endpoint {
      background: #fff;
      border: 1px solid var(--gray-200);
      border-radius: 10px;
      margin-bottom: 1rem;
      overflow: hidden;
    }
    .endpoint-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      cursor: pointer;
      user-select: none;
      transition: background 0.15s;
    }
    .endpoint-header:hover { background: var(--gray-50); }
    .method {
      font-size: 0.72rem;
      font-weight: 700;
      background: var(--primary);
      color: #fff;
      padding: 3px 9px;
      border-radius: 5px;
      letter-spacing: 0.5px;
      flex-shrink: 0;
    }
    .path {
      font-family: "SFMono-Regular", Consolas, monospace;
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--gray-800);
    }
    .desc {
      font-size: 0.82rem;
      color: var(--gray-500);
      margin-left: auto;
    }
    .chevron {
      color: var(--gray-400);
      font-size: 0.8rem;
      transition: transform 0.2s;
      flex-shrink: 0;
    }
    .endpoint.open .chevron { transform: rotate(180deg); }

    /* ── Endpoint body ── */
    .endpoint-body {
      display: none;
      border-top: 1px solid var(--gray-100);
      padding: 1.25rem 1.5rem;
    }
    .endpoint.open .endpoint-body { display: block; }

    /* ── Schema block ── */
    .schema-label {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--gray-500);
      margin-bottom: 0.5rem;
    }
    pre {
      background: var(--gray-50);
      border: 1px solid var(--gray-200);
      border-radius: 8px;
      padding: 1rem 1.25rem;
      font-size: 0.8rem;
      line-height: 1.7;
      overflow-x: auto;
      color: var(--gray-700);
      margin-bottom: 1rem;
    }
    .kv { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem 1rem; margin-bottom: 1rem; }
    .kv-item { font-size: 0.82rem; }
    .kv-item .k { color: var(--gray-500); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.6px; }
    .kv-item .v { font-weight: 600; color: var(--gray-800); }

    /* ── Response pill ── */
    .responses { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.25rem; }
    .resp-pill {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.78rem;
      background: var(--gray-100);
      border-radius: 6px;
      padding: 4px 10px;
    }
    .resp-pill .code { font-weight: 700; }
    .code-200 { color: var(--emerald); }
    .code-400 { color: var(--amber); }
    .code-429 { color: var(--red); }
    .code-500 { color: var(--red); }

    /* ── Info box ── */
    .info-box {
      background: var(--primary-50);
      border: 1px solid var(--primary-100);
      border-left: 3px solid var(--primary);
      border-radius: 6px;
      padding: 0.75rem 1rem;
      font-size: 0.82rem;
      color: var(--primary-700);
      margin-top: 1rem;
    }

    /* ── Health card ── */
    .health-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: #fff;
      border: 1px solid var(--gray-200);
      border-radius: 10px;
      padding: 1rem 1.25rem;
      font-size: 0.85rem;
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--emerald); flex-shrink: 0; }
  </style>
</head>
<body>

<nav>
  <div class="logo">tapiz<span>pdf</span></div>
  <span class="badge">v2.0</span>
  <div class="spacer"></div>
  <span class="rate-info">Rate limit: 10 req / 15 min per IP</span>
</nav>

<div class="container">

  <div class="hero">
    <h1>Tapiz PDF Service</h1>
    <p>Serverless PDF generation for attendance statistics, score sheets, attendance logs and form responses.</p>
    <div class="meta">
      <span>Hono + TypeScript</span>
      <span>jsPDF + autoTable</span>
      <span>Teal primary theme</span>
      <span>Vercel Serverless</span>
    </div>
  </div>

  <!-- Health -->
  <h2>Status</h2>
  <div class="health-row">
    <div class="dot"></div>
    <code>GET /api/health</code>
    <span style="color:var(--gray-500);font-size:0.8rem">→ <code>{ "status": "ok", "ts": "..." }</code></span>
  </div>

  <!-- Endpoints -->
  <h2>Endpoints</h2>

  <!-- Stats -->
  <div class="endpoint" id="ep-stats">
    <div class="endpoint-header" onclick="toggle('ep-stats')">
      <span class="method">POST</span>
      <span class="path">/api/pdf/stats</span>
      <span class="desc">Attendance statistics PDF</span>
      <span class="chevron">▼</span>
    </div>
    <div class="endpoint-body">
      <div class="kv">
        <div class="kv-item"><div class="k">Content-Type</div><div class="v">application/json</div></div>
        <div class="kv-item"><div class="k">Body limit</div><div class="v">50 MB</div></div>
        <div class="kv-item"><div class="k">Response</div><div class="v">application/pdf</div></div>
        <div class="kv-item"><div class="k">Orientation</div><div class="v">Portrait A4</div></div>
      </div>
      <div class="schema-label">Request body</div>
      <pre>{
  "subject": {
    "name": "Programiranje 1",
    "code": "P1",
    "absenceThreshold": 30       // max allowed absence %
  },
  "stats": {
    "totalSessions": 12,
    "totalStudents": 45,
    "perSession": [
      { "sessionNumber": "1", "count": "38" },
      ...
    ],
    "perStudent": [
      {
        "lastName": "Petrovic", "firstName": "Ana",
        "smer": "PR", "indexNumber": "42", "enrollmentYear": "2023",
        "count": "10"
      },
      ...
    ]
  },
  "matrix": { "enrolledCount": 45 }   // optional override
}</pre>
      <div class="schema-label">Responses</div>
      <div class="responses">
        <span class="resp-pill"><span class="code code-200">200</span> PDF binary stream</span>
        <span class="resp-pill"><span class="code code-400">400</span> Missing required fields</span>
        <span class="resp-pill"><span class="code code-429">429</span> Rate limit exceeded</span>
        <span class="resp-pill"><span class="code code-500">500</span> Generation error</span>
      </div>
    </div>
  </div>

  <!-- Scoresheet -->
  <div class="endpoint" id="ep-sheet">
    <div class="endpoint-header" onclick="toggle('ep-sheet')">
      <span class="method">POST</span>
      <span class="path">/api/pdf/scoresheet</span>
      <span class="desc">Grade / score sheet PDF with statistics</span>
      <span class="chevron">▼</span>
    </div>
    <div class="endpoint-body">
      <div class="kv">
        <div class="kv-item"><div class="k">Content-Type</div><div class="v">application/json</div></div>
        <div class="kv-item"><div class="k">Orientation</div><div class="v">Landscape A4</div></div>
        <div class="kv-item"><div class="k">Pages</div><div class="v">Data table + stats grid + student summary</div></div>
      </div>
      <div class="schema-label">Request body</div>
      <pre>{
  "name": "Tabela poena — Kolokvijum 1",
  "academicYear": "2024/25",
  "columns": [
    { "id": 1, "name": "Domaci",     "type": "number",  "maxPoints": 10, "isHidden": false },
    { "id": 2, "name": "Kolokvijum", "type": "number",  "maxPoints": 30, "isHidden": false },
    { "id": 3, "name": "Ukupno",     "type": "formula", "formula": "SUM(col1,col2)", "isHidden": false }
  ],
  "rows": [
    {
      "studentName": "Petrovic Ana",
      "indexNumber": "PR 42/2023",
      "computedCells": { "1": "8", "2": "24", "3": "32" }
    },
    ...
  ]
}</pre>
      <div class="schema-label">Column types</div>
      <pre>"number"  — plain numeric cell (colored by % of maxPoints)
"formula" — computed cell (highlighted in teal)
isHidden: true — column excluded from the exported PDF</pre>
      <div class="responses">
        <span class="resp-pill"><span class="code code-200">200</span> PDF binary stream</span>
        <span class="resp-pill"><span class="code code-400">400</span> Missing required fields</span>
        <span class="resp-pill"><span class="code code-429">429</span> Rate limit exceeded</span>
        <span class="resp-pill"><span class="code code-500">500</span> Generation error</span>
      </div>
    </div>
  </div>

  <!-- Attendances -->
  <div class="endpoint" id="ep-att">
    <div class="endpoint-header" onclick="toggle('ep-att')">
      <span class="method">POST</span>
      <span class="path">/api/pdf/attendances</span>
      <span class="desc">Detailed attendance log PDF</span>
      <span class="chevron">▼</span>
    </div>
    <div class="endpoint-body">
      <div class="kv">
        <div class="kv-item"><div class="k">Content-Type</div><div class="v">application/json</div></div>
        <div class="kv-item"><div class="k">Orientation</div><div class="v">Portrait A4</div></div>
      </div>
      <div class="schema-label">Request body</div>
      <pre>{
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
    },
    ...
  ]
}</pre>
      <div class="schema-label">Session types</div>
      <pre>Predavanja | Racunarske vezbe | Auditorne vezbe | Labaratorijske vezbe</pre>
      <div class="responses">
        <span class="resp-pill"><span class="code code-200">200</span> PDF binary stream</span>
        <span class="resp-pill"><span class="code code-400">400</span> Missing required fields</span>
        <span class="resp-pill"><span class="code code-429">429</span> Rate limit exceeded</span>
        <span class="resp-pill"><span class="code code-500">500</span> Generation error</span>
      </div>
    </div>
  </div>

  <!-- Forms -->
  <div class="endpoint" id="ep-forms">
    <div class="endpoint-header" onclick="toggle('ep-forms')">
      <span class="method">POST</span>
      <span class="path">/api/pdf/forms</span>
      <span class="desc">Form responses PDF export</span>
      <span class="chevron">▼</span>
    </div>
    <div class="endpoint-body">
      <div class="kv">
        <div class="kv-item"><div class="k">Content-Type</div><div class="v">application/json</div></div>
        <div class="kv-item"><div class="k">Orientation</div><div class="v">Portrait A4</div></div>
      </div>
      <div class="schema-label">Request body</div>
      <pre>{
  "formTitle": "Anketa — Zadovoljstvo nastavom",
  "questions": [
    { "id": "q1", "label": "Kako ocenjujete predavanja?" },
    { "id": "q2", "label": "Predlog za poboljsanje" }
  ],
  "responses": [
    {
      "submittedAt": "2025-04-01T11:00:00Z",
      "answers": { "q1": "5", "q2": "Vise primera" }
    },
    ...
  ]
}</pre>
      <div class="responses">
        <span class="resp-pill"><span class="code code-200">200</span> PDF binary stream</span>
        <span class="resp-pill"><span class="code code-400">400</span> Missing required fields</span>
        <span class="resp-pill"><span class="code code-429">429</span> Rate limit exceeded</span>
        <span class="resp-pill"><span class="code code-500">500</span> Generation error</span>
      </div>
    </div>
  </div>

  <div class="info-box">
    All endpoints return <strong>Content-Disposition: attachment</strong> with a transliterated Latin filename.
    Cyrillic characters and diacritics (č, ć, š, đ, ž) are automatically converted.
    Rate limit is shared across all <code>/api/pdf/*</code> routes — 10 requests per IP per 15 minutes.
  </div>

</div>

<script>
  function toggle(id) {
    document.getElementById(id).classList.toggle('open');
  }
</script>
</body>
</html>`;

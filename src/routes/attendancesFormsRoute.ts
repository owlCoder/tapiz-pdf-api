import { Hono } from "hono";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { C } from "../core/colors";
import { cyrillicToLatin, formatDate, formatDateTime } from "../helpers/text";
import {
  drawPageHeader, drawFooter, kpiCards, sessionBars,
  sectionTitle, roundRect,
  tableHeadStyles, tableBodyStyles, tableAltRowStyles,
} from "../helpers/pdf";

export const attendancesRouter = new Hono();
export const formsRouter = new Hono();

// ──────────────────────────────────────────────────────────────────
//  POST /api/pdf/attendances
//  Body: { attendances, subject }
// ──────────────────────────────────────────────────────────────────
attendancesRouter.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Neispravan JSON" }, 400);

  const { attendances, subject } = body as {
    attendances: Array<{
      recordedAt: string;
      student?: { id?: number; lastName?: string; firstName?: string; smer?: string; indexNumber?: string; enrollmentYear?: string };
      session?: { sessionNumber?: number; sessionType?: string };
    }>;
    subject: { name: string; code: string };
  };

  if (!attendances || !subject)
    return c.json({ error: "Nedostaju obavezna polja: attendances, subject" }, 400);

  const sessionCounts: Record<number, number> = {};
  attendances.forEach((a) => {
    const n = a.session?.sessionNumber;
    if (n) sessionCounts[n] = (sessionCounts[n] ?? 0) + 1;
  });
  const sessionNums    = Object.keys(sessionCounts).map(Number).sort((a, b) => a - b);
  const uniqueStudents = new Set(attendances.map((a) => a.student?.id)).size;
  const avgPerSession  = sessionNums.length ? Math.round(attendances.length / sessionNums.length) : 0;

  const doc   = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  drawPageHeader(
    doc, pageW,
    "Evidencija prisustva",
    `${cyrillicToLatin(subject.name)} (${subject.code})`,
    `Generisano: ${formatDate(new Date().toISOString())} · ${attendances.length} zapisa`,
  );
  let y = 32;

  y = kpiCards(doc, pageW, y, [
    { label: "Ukupno zapisa",     value: String(attendances.length), color: C.primary },
    { label: "Razlicitih stud.",  value: String(uniqueStudents),     color: C.blue },
    { label: "Termina",           value: String(sessionNums.length), color: C.gray700 },
    { label: "Prosek / termin",   value: String(avgPerSession),      color: C.emerald },
  ]);

  if (sessionNums.length > 0) {
    sectionTitle(doc, y, "Odaziv po terminu");
    y += 8;
    roundRect(doc, 12, y, pageW - 24, 48, 4, C.white);
    doc.setDrawColor(...C.gray200);
    doc.roundedRect(12, y, pageW - 24, 48, 4, 4, "S");
    y += 8;
    y = sessionBars(
      doc, pageW, y,
      sessionNums.map((n) => ({ sessionNumber: String(n), count: String(sessionCounts[n]) })),
      uniqueStudents,
    );
    y += 6;
  }

  if (y > 200) {
    doc.addPage();
    drawPageHeader(doc, pageW, "Evidencija prisustva (nastavak)", "", "");
    y = 32;
  }

  sectionTitle(doc, y, "Detaljna evidencija");
  y += 8;

  const bodyRows = [...attendances]
    .sort((a, b) => (a.student?.lastName ?? "").localeCompare(b.student?.lastName ?? ""))
    .map((a) => [
      cyrillicToLatin(`${a.student?.lastName ?? ""} ${a.student?.firstName ?? ""}`),
      `${a.student?.smer ?? ""} ${a.student?.indexNumber ?? ""}/${a.student?.enrollmentYear ?? ""}`,
      `T${a.session?.sessionNumber ?? "?"}`,
      cyrillicToLatin(a.session?.sessionType ?? ""),
      formatDateTime(a.recordedAt),
    ]);

  autoTable(doc, {
    startY: y,
    head: [["Student", "Indeks", "Termin", "Tip termina", "Evidentirano"]],
    body: bodyRows,
    headStyles: tableHeadStyles,
    bodyStyles: tableBodyStyles,
    alternateRowStyles: tableAltRowStyles,
    columnStyles: {
      0: { cellWidth: 48 },
      1: { cellWidth: 32, font: "courier", fontSize: 7 },
      2: { cellWidth: 16, halign: "center" },
      3: { cellWidth: 30, halign: "center" },
      4: { cellWidth: "auto", halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      if (data.column.index === 2) {
        data.cell.styles.textColor = C.primary;
        data.cell.styles.fillColor = C.primary50;
        data.cell.styles.fontStyle = "bold";
      }
      if (data.column.index === 3) {
        const type = data.cell.text[0];
        if (type === "Predavanja")            data.cell.styles.textColor = C.blue;
        else if (type === "Racunarske vezbe") data.cell.styles.textColor = C.primary;
        else if (type === "Auditorne vezbe")  data.cell.styles.textColor = C.amber;
        else if (type === "Labaratorijske vezbe") data.cell.styles.textColor = C.emerald;
        data.cell.styles.fontStyle = "bold";
      }
    },
    margin: { left: 12, right: 12 },
  });

  drawFooter(doc, `Tapiz · ${cyrillicToLatin(subject.name)}`);

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  const filename  = cyrillicToLatin(`prisustva_${subject.code}_${new Date().toISOString().slice(0, 10)}.pdf`);
  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});

// ──────────────────────────────────────────────────────────────────
//  POST /api/pdf/forms
//  Body: { formTitle, questions, responses }
// ──────────────────────────────────────────────────────────────────
formsRouter.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Neispravan JSON" }, 400);

  const { formTitle, questions, responses } = body as {
    formTitle?: string;
    questions: Array<{ id: string | number; label: string }>;
    responses: Array<{ submittedAt: string; answers: Record<string, unknown> }>;
  };

  if (!questions || !responses)
    return c.json({ error: "Nedostaju obavezna polja: questions, responses" }, 400);

  const doc   = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const title = formTitle ?? "Odgovori";
  const last  = responses.length ? formatDateTime(responses[responses.length - 1].submittedAt) : "Nema";

  drawPageHeader(
    doc, pageW,
    cyrillicToLatin(title),
    `Ukupno odgovora: ${responses.length} | Poslednji: ${last}`,
    `Generisano: ${formatDate(new Date().toISOString())}`,
  );

  const head = [["#", "Datum", ...questions.map((q) => cyrillicToLatin(q.label))]];
  const tableBody = responses.map((r, idx) => [
    String(idx + 1),
    formatDateTime(r.submittedAt),
    ...questions.map((q) => {
      let v = r.answers[String(q.id)];
      if (Array.isArray(v)) v = (v as unknown[]).filter(Boolean).join(", ");
      return cyrillicToLatin(v != null ? String(v) : "");
    }),
  ]);

  const remaining   = pageW - 28 - 24;
  const perQuestion = questions.length > 0 ? remaining / questions.length : remaining;
  const colStyles   = [8, 28, ...questions.map(() => perQuestion)].reduce<
    Record<number, { cellWidth: number }>
  >((acc, w, i) => { acc[i] = { cellWidth: w }; return acc; }, {});

  autoTable(doc, {
    startY: 32,
    head, body: tableBody,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2, overflow: "linebreak" },
    headStyles: tableHeadStyles,
    bodyStyles: tableBodyStyles,
    alternateRowStyles: tableAltRowStyles,
    columnStyles: colStyles,
    margin: { left: 12, right: 12 },
  });

  drawFooter(doc, `Tapiz · ${cyrillicToLatin(title)}`);

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  const filename  = cyrillicToLatin(`${title}_${new Date().toISOString().slice(0, 10)}.pdf`);
  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});

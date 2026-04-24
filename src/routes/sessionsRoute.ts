import { Hono } from "hono";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { C } from "../core/colors";
import { cyrillicToLatin, formatDate, formatDateTime } from "../helpers/text";
import {
  drawPageHeader, drawFooter, kpiCards, sectionTitle,
  tableHeadStyles, tableBodyStyles, tableAltRowStyles,
  roundRect,
} from "../helpers/pdf";

export const sessionsRouter = new Hono();

// ──────────────────────────────────────────────────────────────────
//  POST /api/pdf/sessions
//  Body: {
//    subjectName: string,
//    exportedAt:  string,          // ISO
//    sessions: Array<{
//      id:            number,
//      sessionNumber: number,
//      sessionType:   string,
//      date:          string,      // ISO (createdAt)
//    }>
//  }
// ──────────────────────────────────────────────────────────────────
sessionsRouter.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Neispravan JSON" }, 400);

  const { subjectName, exportedAt, sessions } = body as {
    subjectName: string;
    exportedAt:  string;
    sessions: Array<{
      id:            number;
      sessionNumber: number;
      sessionType:   string;
      date:          string;
    }>;
  };

  if (!subjectName || !Array.isArray(sessions))
    return c.json({ error: "Nedostaju obavezna polja: subjectName, sessions" }, 400);

  // ── Derived stats ────────────────────────────────────────────────
  const total = sessions.length;

  const typeCounts = sessions.reduce<Record<string, number>>((acc, s) => {
    acc[s.sessionType] = (acc[s.sessionType] ?? 0) + 1;
    return acc;
  }, {});

  const typeEntries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

  // ── Document setup ───────────────────────────────────────────────
  const doc   = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  drawPageHeader(
    doc, pageW,
    "Lista termina",
    cyrillicToLatin(subjectName),
    `Generisano: ${formatDateTime(exportedAt ?? new Date().toISOString())}`,
  );
  let y = 32;

  // ── KPI cards ─────────────────────────────────────────────────────
  const kpiData = [
    { label: "Ukupno termina", value: String(total), color: C.primary },
    ...typeEntries.slice(0, 3).map(([type, count]) => ({
      label: cyrillicToLatin(type),
      value: String(count),
      color: C.blue,
    })),
  ];

  // Pad to 4 cards if fewer types
  while (kpiData.length < 4) {
    kpiData.push({ label: "", value: "", color: C.gray200 });
  }

  y = kpiCards(doc, pageW, y, kpiData.slice(0, 4));

  // ── Type breakdown bar ────────────────────────────────────────────
  if (typeEntries.length > 0) {
    sectionTitle(doc, y, "Raspodela po tipu termina");
    y += 8;

    const barAreaW = pageW - 24;
    const barH     = 7;
    const gap      = 5;

    typeEntries.forEach(([type, count], i) => {
      const pct  = total > 0 ? count / total : 0;
      const fillW = Math.max(2, pct * barAreaW);
      const color = [C.primary, C.blue, C.emerald, C.amber][i % 4];

      // Track label
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...C.gray700);
      doc.text(cyrillicToLatin(type), 12, y + barH - 1);

      const labelW = doc.getTextWidth(cyrillicToLatin(type)) + 3;

      // Background track
      roundRect(doc, 12 + labelW, y, barAreaW - labelW, barH, 3, C.gray100);
      // Fill
      roundRect(doc, 12 + labelW, y, Math.max(2, fillW - labelW), barH, 3, color);

      // Count badge
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.white);
      const fillEnd = 12 + labelW + Math.max(2, fillW - labelW);
      if (fillW - labelW > 14) {
        doc.text(`${count}`, fillEnd - 4, y + barH - 2, { align: "right" });
      }

      // Percentage on the right
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...C.gray500);
      doc.text(`${Math.round(pct * 100)}%`, pageW - 12, y + barH - 2, { align: "right" });

      y += barH + gap;
    });

    y += 4;
  }

  // ── Sessions table ───────────────────────────────────────────────
  if (sessions.length > 0) {
    if (y > 200) {
      doc.addPage();
      drawPageHeader(doc, pageW, "Lista termina (nastavak)", cyrillicToLatin(subjectName), "");
      y = 32;
    }

    sectionTitle(doc, y, "Pregled svih termina");
    y += 6;

    const rows = sessions
      .slice()
      .sort((a, b) => a.sessionNumber - b.sessionNumber)
      .map((s) => [
        String(s.sessionNumber),
        cyrillicToLatin(s.sessionType),
        formatDate(s.date),
      ]);

    autoTable(doc, {
      startY: y,
      head: [["Br.", "Tip termina", "Datum kreiranja"]],
      body: rows,
      headStyles: tableHeadStyles,
      bodyStyles: tableBodyStyles,
      alternateRowStyles: tableAltRowStyles,
      columnStyles: {
        0: { cellWidth: 14, halign: "center", fontStyle: "bold" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 40, halign: "center" },
      },
      didParseCell: (data) => {
        if (data.section !== "body" || data.column.index !== 1) return;
        const type = data.cell.text[0];
        const idx  = typeEntries.findIndex(([t]) => cyrillicToLatin(t) === type);
        const color = [C.primary, C.blue, C.emerald, C.amber][idx % 4] ?? C.gray500;
        data.cell.styles.textColor = color;
        data.cell.styles.fontStyle = "bold";
      },
      margin: { left: 12, right: 12 },
    });
  }

  drawFooter(doc, `Tapiz · ${cyrillicToLatin(subjectName)}`);

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  const slug      = cyrillicToLatin(subjectName).toLowerCase().replace(/\s+/g, "_");
  const filename  = `termini_${slug}_${new Date().toISOString().slice(0, 10)}.pdf`;

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
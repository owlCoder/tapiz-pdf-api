import { Hono } from "hono";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { C } from "../core/colors";
import { cyrillicToLatin, formatDate } from "../helpers/text";
import {
  drawPageHeader, drawFooter, sectionTitle, roundRect,
  tableHeadStyles, tableBodyStyles, tableAltRowStyles,
} from "../helpers/pdf";

export const scoresheetRouter = new Hono();

// ──────────────────────────────────────────────────────────────────
//  Statistics helpers
// ──────────────────────────────────────────────────────────────────

interface ColStats {
  count: number;
  sum: number | null;
  average: number | null;
  min: number | null;
  max: number | null;
  median: number | null;
  stdDev: number | null;
  maxPoints: number | null;
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function stdDev(values: number[], mean: number): number {
  return Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
}

function calcStatistics(
  rows: Array<{ computedCells?: Record<string, unknown> }>,
  cols: Array<{ id: string | number; maxPoints?: number | null }>,
): Record<string, ColStats> {
  const stats: Record<string, ColStats> = {};
  for (const col of cols) {
    const key = String(col.id);
    const values: number[] = [];
    for (const row of rows) {
      const val = row.computedCells?.[key];
      if (val !== undefined && val !== null && val !== "") {
        const n = parseFloat(String(val));
        if (!isNaN(n)) values.push(n);
      }
    }
    if (values.length > 0) {
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      stats[key] = {
        count: values.length, sum, average: avg,
        min: Math.min(...values), max: Math.max(...values),
        median: median(values), stdDev: stdDev(values, avg),
        maxPoints: col.maxPoints ?? null,
      };
    } else {
      stats[key] = { count: 0, sum: null, average: null, min: null, max: null, median: null, stdDev: null, maxPoints: col.maxPoints ?? null };
    }
  }
  return stats;
}

// ──────────────────────────────────────────────────────────────────
//  POST /api/pdf/scoresheet
//  Body: { name, academicYear, columns, rows }
// ──────────────────────────────────────────────────────────────────
scoresheetRouter.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Neispravan JSON" }, 400);

  const { name, academicYear, columns, rows } = body as {
    name: string;
    academicYear?: string;
    columns: Array<{ id: string | number; name: string; type?: string; isHidden?: boolean; maxPoints?: number | null; formula?: string }>;
    rows: Array<{ studentName?: string; indexNumber?: string; computedCells?: Record<string, unknown> }>;
  };

  if (!name || !columns || !rows)
    return c.json({ error: "Nedostaju obavezna polja: name, columns, rows" }, 400);

  const visibleCols = columns.filter((c) => !c.isHidden);
  const statsCols   = visibleCols.slice(0, 9);
  const statistics  = calcStatistics(rows, visibleCols);

  const doc   = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  drawPageHeader(
    doc, pageW,
    cyrillicToLatin(name),
    `Akademska ${cyrillicToLatin(academicYear ?? "")}`,
    `Generisano: ${formatDate(new Date().toISOString())}`,
  );

  // ── Main data table ──────────────────────────────────────────────
  const head     = [["#", "Student", "Indeks", ...visibleCols.map((col) => cyrillicToLatin(col.name))]];
  const minRow   = ["", "", "Min:",    ...visibleCols.map((col) => { const s = statistics[String(col.id)]; return s?.min    != null ? s.min.toFixed(2)    : "-"; })];
  const maxRow   = ["", "", "Max:",    ...visibleCols.map((col) => { const s = statistics[String(col.id)]; return s?.max    != null ? s.max.toFixed(2)    : "-"; })];
  const avgRow   = ["", "", "Prosek:", ...visibleCols.map((col) => { const s = statistics[String(col.id)]; return s?.average != null ? s.average.toFixed(2) : "-"; })];
  const dataRows = rows.map((row, idx) => [
    String(idx + 1),
    cyrillicToLatin(row.studentName ?? ""),
    cyrillicToLatin(row.indexNumber ?? ""),
    ...visibleCols.map((col) => {
      const val = row.computedCells?.[String(col.id)];
      if (val === undefined || val === null) return "";
      const n = parseFloat(String(val));
      return !isNaN(n) && String(val) !== "" ? n : cyrillicToLatin(String(val));
    }),
  ]);

  const marginLeft = 10, marginRight = 10;
  const availW   = pageW - marginLeft - marginRight;
  const col0w = 10, col1w = 44, col2w = 28;
  const dynW  = visibleCols.length > 0 ? Math.max(18, (availW - col0w - col1w - col2w) / visibleCols.length) : 0;

  const colStyles: Record<number, { cellWidth: number | "auto"; halign?: "center"; font?: string; fontSize?: number }> = {
    0: { cellWidth: col0w, halign: "center" },
    1: { cellWidth: col1w },
    2: { cellWidth: col2w, halign: "center" },
  };
  for (let i = 0; i < visibleCols.length; i++) colStyles[3 + i] = { cellWidth: dynW, halign: "center" };

  autoTable(doc, {
    startY: 32,
    head,
    body: [minRow, maxRow, avgRow, ...dataRows],
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8, cellPadding: 1.5, overflow: "linebreak" },
    headStyles: { fillColor: C.gray50, textColor: C.gray700, fontStyle: "bold", halign: "center" },
    bodyStyles: tableBodyStyles,
    alternateRowStyles: tableAltRowStyles,
    columnStyles: colStyles,
    didParseCell: (data) => {
      if (data.section !== "body") return;
      // Min / Max / Avg rows
      if (data.row.index < 3) {
        data.cell.styles.fillColor  = C.primary50;
        data.cell.styles.fontStyle  = "bold";
        data.cell.styles.textColor  = C.primary800;
        return;
      }
      const colIdx = data.column.index;
      if (colIdx > 2) {
        const col = visibleCols[colIdx - 3];
        // Formula column highlight
        if (col?.type === "formula") {
          data.cell.styles.fontStyle  = "bold";
          data.cell.styles.textColor  = C.primary;
          data.cell.styles.fillColor  = C.primary100;
          return;
        }
        // Score color by percentage of maxPoints
        const n = parseFloat(data.cell.text[0]);
        if (!isNaN(n) && col?.maxPoints) {
          const pct = (n / col.maxPoints) * 100;
          if (pct >= 80)           data.cell.styles.textColor = C.emerald;
          else if (pct >= 60)      data.cell.styles.textColor = C.amber;
          else if (pct < 60 && n > 0) data.cell.styles.textColor = C.red;
        }
      }
    },
    margin: { left: marginLeft, right: marginRight },
    pageBreak: "auto",
  });

  // ── Statistics grid (3-column cards, up to 9 columns) ────────────
  doc.addPage();
  drawPageHeader(
    doc, pageW,
    `Statistike — ${cyrillicToLatin(name)}`,
    "Detaljni proracuni po aktivnostima",
    `Generisano: ${formatDate(new Date().toISOString())}`,
  );

  let currentY = 32;
  const cardGap = 4, cardMargin = 12;
  const cardW = (pageW - 2 * cardMargin - 2 * cardGap) / 3;

  function drawStatsCard(doc: jsPDF, x: number, y: number, col: typeof statsCols[0], stats: ColStats): number {
    const maxP  = col.maxPoints ? ` (max ${col.maxPoints})` : "";
    const title = `${cyrillicToLatin(col.name)}${maxP}`;
    const statRows: [string, string][] = [
      ["Broj studenata sa poenima:", String(stats.count)],
      ["Ukupno poena:", stats.sum !== null ? stats.sum.toFixed(2) : "-"],
      ["Prosek poena:", stats.average !== null ? stats.average.toFixed(2) : "-"],
      ["Medijana:", stats.median !== null ? stats.median.toFixed(2) : "-"],
      ["Standardna devijacija:", stats.stdDev !== null ? stats.stdDev.toFixed(2) : "-"],
      ["Min / Max:", stats.min !== null && stats.max !== null ? `${stats.min.toFixed(2)} / ${stats.max.toFixed(2)}` : "-"],
    ];
    if (col.maxPoints && stats.average !== null) {
      statRows.push(["Procentualni prosek:", `${((stats.average / col.maxPoints) * 100).toFixed(2)}%`]);
    }
    const lineH  = 4;
    const headerH = 10;
    const cardH  = headerH + statRows.length * lineH + 5;

    doc.setFillColor(...C.white);
    doc.roundedRect(x, y, cardW, cardH, 3, 3, "F");
    doc.setDrawColor(...C.gray200);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardW, cardH, 3, 3, "S");

    doc.setFillColor(...C.primary);
    doc.roundedRect(x, y, cardW, 3, 1.5, 1.5, "F");
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.primary800);
    doc.text(title, x + 4, y + 7);

    doc.setFontSize(7);
    let textY = y + 13;
    for (const [label, value] of statRows) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...C.gray600);
      doc.text(cyrillicToLatin(label), x + 4, textY);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.gray900);
      doc.text(value, x + cardW - 4, textY, { align: "right" });
      textY += lineH;
    }
    return cardH;
  }

  const pageH = doc.internal.pageSize.getHeight();
  for (let i = 0; i < statsCols.length; i += 3) {
    const rowCols = statsCols.slice(i, i + 3);
    const rowH = Math.max(
      ...rowCols.map((col) => {
        const s = statistics[String(col.id)];
        const rows = 7 + (col.maxPoints && s?.average !== null ? 1 : 0);
        return 10 + rows * 4 + 5;
      }),
      0,
    );
    if (currentY + rowH + cardGap > pageH - 20) {
      doc.addPage();
      drawPageHeader(doc, pageW, `Statistike — ${cyrillicToLatin(name)} (nastavak)`, "", `Generisano: ${formatDate(new Date().toISOString())}`);
      currentY = 32;
    }
    for (let j = 0; j < rowCols.length; j++) {
      const col = rowCols[j];
      const stats = statistics[String(col.id)];
      if (!stats) continue;
      drawStatsCard(doc, cardMargin + j * (cardW + cardGap), currentY, col, stats);
    }
    currentY += rowH + cardGap;
  }

  // ── Student summary table ────────────────────────────────────────
  const gradedCols = visibleCols.filter((c) => c.maxPoints);
  const summaries = rows.map((row) => {
    let total = 0, maxTotal = 0;
    for (const col of gradedCols) {
      const val = row.computedCells?.[String(col.id)];
      const n = parseFloat(String(val));
      if (!isNaN(n) && col.maxPoints) { total += n; maxTotal += col.maxPoints; }
    }
    return { total, maxTotal, pct: maxTotal > 0 ? (total / maxTotal) * 100 : null, studentName: row.studentName, indexNumber: row.indexNumber };
  });

  if (currentY > pageH - 50) {
    doc.addPage();
    drawPageHeader(doc, pageW, "Pregled po studentima", "", `Generisano: ${formatDate(new Date().toISOString())}`);
    currentY = 32;
  } else { currentY += 6; }

  sectionTitle(doc, currentY, "Pregled po studentima (samo bodovne aktivnosti)");
  currentY += 8;

  autoTable(doc, {
    startY: currentY,
    head: [["#", "Student", "Indeks", "Osvojeno", "Maksimum", "Procenat", "Status"]],
    body: summaries.map((s, idx) => [
      String(idx + 1),
      cyrillicToLatin(s.studentName ?? ""),
      cyrillicToLatin(s.indexNumber ?? ""),
      s.maxTotal > 0 ? s.total.toFixed(2) : "-",
      s.maxTotal > 0 ? s.maxTotal.toFixed(2) : "-",
      s.pct !== null ? `${s.pct.toFixed(2)}%` : "-",
      s.pct !== null ? (s.pct >= 60 ? "Polozio" : s.pct >= 40 ? "Uslovno" : "Pao") : "N/A",
    ]),
    theme: "grid",
    headStyles: tableHeadStyles,
    bodyStyles: tableBodyStyles,
    alternateRowStyles: tableAltRowStyles,
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 42 },
      2: { cellWidth: 28 },
      3: { cellWidth: 20, halign: "center" },
      4: { cellWidth: 20, halign: "center" },
      5: { cellWidth: 20, halign: "center" },
      6: { cellWidth: "auto", halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 6) {
        const st = data.cell.text[0];
        if (st === "Polozio")      data.cell.styles.textColor = C.emerald;
        else if (st === "Uslovno") data.cell.styles.textColor = C.amber;
        else if (st === "Pao")     data.cell.styles.textColor = C.red;
        data.cell.styles.fontStyle = "bold";
      }
    },
    margin: { left: 12, right: 12 },
  });

  drawFooter(doc, `Tapiz · ${cyrillicToLatin(name)}`);

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  const filename  = cyrillicToLatin(`${name}_${academicYear ?? ""}.pdf`.replace(/[^a-z0-9_\- ]/gi, "_"));
  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});

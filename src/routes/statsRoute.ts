import { Hono } from "hono";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { C } from "../core/colors";
import { cyrillicToLatin, formatDate } from "../helpers/text";
import {
  drawPageHeader, drawFooter, kpiCards, progressBar,
  sessionBars, sectionTitle, roundRect,
  tableHeadStyles, tableBodyStyles, tableAltRowStyles,
} from "../helpers/pdf";

export const statsRouter = new Hono();

// ──────────────────────────────────────────────────────────────────
//  POST /api/pdf/stats
//  Body: { stats, matrix?, subject }
// ──────────────────────────────────────────────────────────────────
statsRouter.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Neispravan JSON" }, 400);

  const { stats, matrix, subject } = body as {
    stats: {
      perStudent: Array<{ count: string; lastName?: string; firstName?: string; smer?: string; indexNumber?: string; enrollmentYear?: string }>;
      perSession: Array<{ sessionNumber: string; count: string }>;
      totalSessions: number;
      totalStudents: number;
    };
    matrix?: { enrolledCount?: number };
    subject: { name: string; code: string; absenceThreshold?: number };
  };

  if (!stats || !subject)
    return c.json({ error: "Nedostaju obavezna polja: stats, subject" }, 400);

  const perStudent  = Array.isArray(stats.perStudent)  ? stats.perStudent  : [];
  const perSession  = Array.isArray(stats.perSession)   ? stats.perSession  : [];
  const totalSessions  = stats.totalSessions  ?? 0;
  const enrolledCount  = matrix?.enrolledCount ?? stats.totalStudents ?? 0;
  const attendanceRequired = 100 - (subject.absenceThreshold ?? 0);

  const avgPct =
    totalSessions > 0 && perStudent.length > 0
      ? Math.round(
          (perStudent.reduce((acc, s) => acc + parseInt(s.count ?? "0"), 0) /
            perStudent.length /
            totalSessions) *
            100,
        )
      : 0;

  const passing = perStudent.filter(
    (s) =>
      Math.round((parseInt(s.count ?? "0") / totalSessions) * 100) >= attendanceRequired,
  ).length;

  const doc  = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  drawPageHeader(
    doc, pageW,
    "Statistike prisustva",
    `${cyrillicToLatin(subject.name)} (${subject.code})`,
    `Generisano: ${formatDate(new Date().toISOString())}`,
  );
  let y = 32;

  // KPI cards
  y = kpiCards(doc, pageW, y, [
    { label: "Upisanih studenata",    value: String(enrolledCount), color: C.primary },
    { label: "Termina odrzano",       value: String(totalSessions), color: C.blue },
    { label: "Prosecno prisustvo",    value: `${avgPct}%`,          color: avgPct >= attendanceRequired ? C.emerald : C.amber },
    { label: `Ispunili ${attendanceRequired}%`, value: `${passing}/${perStudent.length}`, color: passing === perStudent.length ? C.emerald : C.red },
  ]);

  // Overall attendance card
  y += 2;
  roundRect(doc, 12, y, pageW - 24, 28, 4, C.white);
  doc.setDrawColor(...C.gray200);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, y, pageW - 24, 28, 4, 4, "S");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.gray800);
  doc.text("Ukupno prisustvo", 18, y + 7);

  const badgeText = avgPct >= attendanceRequired
    ? "Prosek ispunjava normu"
    : `Prosek ispod ${attendanceRequired}%`;
  const badgeColor = avgPct >= attendanceRequired ? C.emerald : C.amber;
  const badgeBg    = avgPct >= attendanceRequired ? C.emerald50 : C.amber50;
  const tw = doc.getTextWidth(cyrillicToLatin(badgeText));
  roundRect(doc, pageW - 12 - tw - 6, y + 3, tw + 8, 5, 2, badgeBg);
  doc.setFontSize(6.5);
  doc.setTextColor(...badgeColor);
  doc.setFont("helvetica", "bold");
  doc.text(cyrillicToLatin(badgeText), pageW - 12 - 3, y + 6.5, { align: "right" });

  progressBar(doc, 18, y + 13, pageW - 36, avgPct, attendanceRequired);
  y += 34;

  // Per-session bar chart
  if (perSession.length > 0) {
    sectionTitle(doc, y, "Prisustvo po terminu");
    y += 8;
    roundRect(doc, 12, y, pageW - 24, 48, 4, C.white);
    doc.setDrawColor(...C.gray200);
    doc.roundedRect(12, y, pageW - 24, 48, 4, 4, "S");
    y += 8;
    y = sessionBars(doc, pageW, y, perSession, enrolledCount);
    y += 6;
  }

  // Per-student table
  if (perStudent.length > 0) {
    if (y > 200) {
      doc.addPage();
      drawPageHeader(doc, pageW, "Statistike prisustva (nastavak)", "", "");
      y = 32;
    }
    sectionTitle(doc, y, "Prisustvo po studentu");
    y += 6;

    const bodyRows = perStudent.map((s) => {
      const count  = Number(s.count ?? 0);
      const p      = totalSessions > 0 ? Math.round((count / totalSessions) * 100) : 0;
      const status = (totalSessions - count) <= (subject.absenceThreshold ?? 0) ? "Ispunio" : "Nije ispunio";
      return [
        `${cyrillicToLatin(s.lastName ?? "")} ${cyrillicToLatin(s.firstName ?? "")}`,
        `${s.smer ?? ""} ${s.indexNumber ?? ""}/${s.enrollmentYear ?? ""}`,
        `${count}/${totalSessions}`,
        `${p}%`,
        status,
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["Student", "Indeks", "Prisustvo", "%", "Status"]],
      body: bodyRows,
      headStyles: tableHeadStyles,
      bodyStyles: tableBodyStyles,
      alternateRowStyles: tableAltRowStyles,
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 34, font: "courier", fontSize: 7 },
        2: { cellWidth: 22, halign: "center" },
        3: { cellWidth: 16, halign: "center", fontStyle: "bold" },
        4: { cellWidth: "auto", halign: "center" },
      },
      didParseCell: (data) => {
        if (data.section !== "body") return;
        if (data.column.index === 4) {
          const ok = data.cell.text[0] === "Ispunio";
          data.cell.styles.textColor = ok ? C.emerald : C.red;
          data.cell.styles.fillColor = ok ? C.emerald50 : C.red50;
          data.cell.styles.fontStyle = "bold";
        }
        if (data.column.index === 3) {
          const pct = parseInt(data.cell.text[0]);
          if (pct >= attendanceRequired)  data.cell.styles.textColor = C.emerald;
          else if (pct >= 50)             data.cell.styles.textColor = C.amber;
          else                            data.cell.styles.textColor = C.red;
        }
      },
      margin: { left: 12, right: 12 },
    });
  }

  drawFooter(doc, `Tapiz · ${cyrillicToLatin(subject.name)}`);

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  const filename  = cyrillicToLatin(`statistike_${subject.code}_${new Date().toISOString().slice(0, 10)}.pdf`);
  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});

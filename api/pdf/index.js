// api/pdf/index.js
const express = require("express");
const cors = require("cors");
const { jsPDF, GState } = require("jspdf");
const autoTable = require("jspdf-autotable").default;

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" }));

// ─── Serbian Latin normalizer ─────────────────────────────────────────────
function srl(text) {
  return String(text)
    .replace(/š/g, "s").replace(/Š/g, "S")
    .replace(/đ/g, "dj").replace(/Đ/g, "Dj")
    .replace(/č/g, "c").replace(/Č/g, "C")
    .replace(/ć/g, "c").replace(/Ć/g, "C")
    .replace(/ž/g, "z").replace(/Ž/g, "Z");
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("sr-RS", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("sr-RS", { day: "2-digit", month: "2-digit", year: "numeric" })} ${d.toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" })}`;
}

// ─── Design tokens ────────────────────────────────────────────────────────
const C = {
  primary:    [23,  94,  141],
  primary50:  [242, 248, 253],
  primary100: [228, 240, 250],
  primary800: [23,  80,  117],
  emerald:    [22,  163,  74],
  emerald50:  [240, 253, 244],
  amber:      [217, 119,   6],
  amber50:    [255, 251, 235],
  red:        [220,  38,  38],
  red50:      [254, 242, 242],
  gray50:     [249, 250, 251],
  gray100:    [243, 244, 246],
  gray200:    [229, 231, 235],
  gray400:    [156, 163, 175],
  gray500:    [107, 114, 128],
  gray700:    [55,   65,  81],
  gray900:    [17,   24,  39],
  white:      [255, 255, 255],
};

function roundRect(doc, x, y, w, h, r, fill) {
  doc.setFillColor(...fill);
  doc.roundedRect(x, y, w, h, r, r, "F");
}

function badge(doc, x, y, text, bg, fg, fontSize = 7) {
  doc.setFontSize(fontSize);
  const tw = doc.getTextWidth(text);
  const pw = tw + 5;
  const ph = fontSize * 0.60;
  roundRect(doc, x, y - ph + 0.5, pw, ph + 1.5, 1.5, bg);
  doc.setTextColor(...fg);
  doc.setFont("helvetica", "bold");
  doc.text(text, x + 2.5, y, { baseline: "bottom" });
}

function drawPageHeader(doc, pageW, title, subtitle, dateLabel) {
  doc.setFillColor(...C.primary800);
  doc.rect(0, 0, pageW, 30, "F");
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, pageW * 0.55, 30, "F");

  doc.setFillColor(255, 255, 255);
  if (typeof doc.setGState === "function") doc.setGState(new GState({ opacity: 0.07 }));
  doc.circle(pageW - 8, -5, 22, "F");
  doc.circle(pageW - 2, 30, 14, "F");
  if (typeof doc.setGState === "function") doc.setGState(new GState({ opacity: 1.0 }));

  doc.setTextColor(...C.white);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(srl(title), 14, 14);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(195, 225, 248);
  doc.text(srl(subtitle), 14, 22);
  doc.setFontSize(7);
  doc.setTextColor(170, 210, 240);
  doc.text(srl(dateLabel), pageW - 10, 7, { align: "right" });
  doc.setTextColor(...C.gray900);
}

function sectionTitle(doc, text, y) {
  doc.setFillColor(...C.primary);
  doc.rect(14, y - 3.8, 2.5, 5.8, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.gray900);
  doc.text(srl(text), 19, y);
  return y + 5;
}

function kpiCards(doc, pageW, y, cards) {
  const margin = 14, gap = 3, n = cards.length;
  const cardW = (pageW - margin * 2 - gap * (n - 1)) / n;
  const cardH = 21;
  cards.forEach((c, i) => {
    const cx = margin + i * (cardW + gap);
    roundRect(doc, cx, y, cardW, cardH, 3, C.white);
    doc.setDrawColor(...C.gray200); doc.setLineWidth(0.3);
    doc.roundedRect(cx, y, cardW, cardH, 3, 3, "S");
    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(...c.color);
    doc.text(srl(c.value), cx + cardW / 2, y + 9.5, { align: "center" });
    doc.setFontSize(6.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...C.gray500);
    doc.text(srl(c.label), cx + cardW / 2, y + 14.5, { align: "center" });
    if (c.sub) {
      doc.setFontSize(5.5); doc.setTextColor(...C.gray400);
      doc.text(srl(c.sub), cx + cardW / 2, y + 18.5, { align: "center" });
    }
  });
  return y + cardH + 6;
}

function progressBar(doc, x, y, w, pct, required) {
  const h = 5;
  const color = pct >= required ? C.emerald : pct >= 50 ? C.amber : C.red;
  roundRect(doc, x, y, w, h, 2.5, C.gray100);
  if (pct > 0) roundRect(doc, x, y, Math.max(4, w * pct / 100), h, 2.5, color);
  const markerX = x + w * required / 100;
  doc.setDrawColor(...C.amber); doc.setLineWidth(0.5);
  doc.line(markerX, y - 1, markerX, y + h + 1);
  doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.gray400); doc.text("0%", x, y + h + 4);
  doc.setTextColor(...C.amber); doc.text(srl(`${required}% (prag)`), markerX, y + h + 4, { align: "center" });
  doc.setTextColor(...C.gray400); doc.text("100%", x + w, y + h + 4, { align: "right" });
}

function sessionBars(doc, pageW, y, sessions, total) {
  const margin = 19, chartW = pageW - margin * 2, maxH = 26, n = sessions.length;
  if (n === 0) return y;
  const barW = Math.min(10, (chartW - (n - 1) * 1.5) / n);
  const totalBarsW = n * barW + (n - 1) * 1.5;
  const startX = margin + (chartW - totalBarsW) / 2;
  doc.setDrawColor(...C.gray200); doc.setLineWidth(0.25);
  doc.line(margin, y + maxH, margin + chartW, y + maxH);
  sessions.forEach((s, i) => {
    const p = total > 0 ? parseInt(s.count) / total : 0;
    const bh = Math.max(1.5, p * maxH);
    const bx = startX + i * (barW + 1.5), by = y + maxH - bh;
    const col = p >= 0.7 ? C.emerald : p >= 0.5 ? C.amber : C.primary;
    roundRect(doc, bx, by, barW, bh, 1.5, col);
    doc.setFontSize(5.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...C.gray500);
    doc.text(`T${s.sessionNumber}`, bx + barW / 2, y + maxH + 4.5, { align: "center" });
    if (bh > 6) {
      doc.setFontSize(5); doc.setTextColor(...C.white);
      doc.text(`${Math.round(p * 100)}%`, bx + barW / 2, by + bh - 1.5, { align: "center" });
    }
  });
  return y + maxH + 9;
}

function drawFooters(doc, pageW, label) {
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C.gray200); doc.setLineWidth(0.25);
    doc.line(14, 286, pageW - 14, 286);
    doc.setFontSize(6.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...C.gray400);
    doc.text(srl(label), 14, 290);
    doc.text(srl(`Strana ${i} od ${total}`), pageW - 14, 290, { align: "right" });
  }
}

const tHead = { fillColor: C.gray50, textColor: C.gray500, fontStyle: "bold", fontSize: 7.5, lineColor: C.gray200, lineWidth: 0.3 };
const tBody = { fontSize: 8, textColor: C.gray700, lineColor: C.gray100, lineWidth: 0.2 };
const tAlt  = { fillColor: C.gray50 };

// ─── Statistics PDF endpoint ──────────────────────────────────────────────
app.post("/api/pdf/stats", async (req, res) => {
  try {
    const { stats, matrix, subject } = req.body;

    if (!stats || !subject) {
      return res.status(400).json({ error: "Missing required fields: stats, subject" });
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    const attendanceRequired = 100 - subject.absenceThreshold;
    const enrolledCount = matrix?.enrolledCount ?? stats.totalStudents;
    const avgPct = stats.totalSessions > 0 && stats.perStudent.length > 0
      ? Math.round(
          stats.perStudent.reduce((acc, s) => acc + parseInt(s.count), 0) /
          stats.perStudent.length / stats.totalSessions * 100
        )
      : 0;
    const passing = stats.perStudent.filter((s) =>
      Math.round(parseInt(s.count) / stats.totalSessions * 100) >= attendanceRequired
    ).length;

    drawPageHeader(doc, pageW,
      "Statistike prisustva",
      `${subject.name} (${subject.code})`,
      `Generisano: ${formatDate(new Date().toISOString())}`,
    );

    let y = 38;

    y = kpiCards(doc, pageW, y, [
      { label: "Upisanih studenata",              value: String(enrolledCount),               color: C.primary },
      { label: "Termina odrzano",                 value: String(stats.totalSessions),         color: [14, 165, 233] },
      { label: "Prosecno prisustvo",              value: `${avgPct}%`,                        color: avgPct >= attendanceRequired ? C.emerald : C.amber },
      { label: `Ispunili ${attendanceRequired}%`, value: `${passing}/${stats.perStudent.length}`, color: passing === stats.perStudent.length ? C.emerald : C.red },
    ]);

    y += 1;
    const okReq = avgPct >= attendanceRequired;
    roundRect(doc, 14, y, pageW - 28, 25, 3, C.white);
    doc.setDrawColor(...C.gray200); doc.setLineWidth(0.3);
    doc.roundedRect(14, y, pageW - 28, 25, 3, 3, "S");

    doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...C.gray900);
    doc.text(srl("Ukupno prisustvo"), 19, y + 6.5);
    badge(doc, pageW - 70, y + 5,
      srl(okReq ? "Prosek ispunjava normu" : `Prosek ispod ${attendanceRequired}%`),
      okReq ? C.emerald50 : C.amber50,
      okReq ? C.emerald : C.amber,
    );
    progressBar(doc, 19, y + 11, pageW - 42, avgPct, attendanceRequired);
    y += 33;

    if (stats.perSession.length > 0) {
      y = sectionTitle(doc, "Prisustvo po terminu", y) + 2;
      roundRect(doc, 14, y, pageW - 28, 46, 3, C.white);
      doc.setDrawColor(...C.gray200); doc.setLineWidth(0.3);
      doc.roundedRect(14, y, pageW - 28, 46, 3, 3, "S");
      y += 6;
      y = sessionBars(doc, pageW, y, stats.perSession, enrolledCount);
      y += 2;
    }

    if (stats.perStudent.length > 0) {
      if (y > 200) { doc.addPage(); y = 16; }
      y = sectionTitle(doc, "Prisustvo po studentu", y) + 2;

      autoTable(doc, {
        startY: y,
        head: [[srl("Student"), srl("Indeks"), srl("Prisustvo"), "%", "Status"]],
        body: stats.perStudent.map((s) => {
          const p = stats.totalSessions > 0 ? Math.round(parseInt(s.count) / stats.totalSessions * 100) : 0;
          return [
            srl(`${s.lastName} ${s.firstName}`),
            `${s.smer} ${s.indexNumber}/${s.enrollmentYear}`,
            `${s.count}/${stats.totalSessions}`,
            `${p}%`,
            p >= attendanceRequired ? "Ispunjeno" : "Nije ispunjeno",
          ];
        }),
        headStyles: tHead,
        bodyStyles: tBody,
        alternateRowStyles: tAlt,
        columnStyles: {
          0: { cellWidth: 52 },
          1: { cellWidth: 34, font: "courier", fontSize: 7 },
          2: { cellWidth: 22, halign: "center" },
          3: { cellWidth: 14, halign: "center", fontStyle: "bold" },
          4: { cellWidth: 30, halign: "center" },
        },
        didParseCell: (data) => {
          if (data.column.index === 4 && data.section === "body") {
            const ok = data.cell.text[0]?.startsWith("Ispunjeno");
            data.cell.styles.textColor = ok ? C.emerald : C.red;
            data.cell.styles.fillColor = ok ? C.emerald50 : C.red50;
            data.cell.styles.fontStyle = "bold";
          }
          if (data.column.index === 3 && data.section === "body") {
            const p2 = parseInt(data.cell.text[0]);
            data.cell.styles.textColor = p2 >= attendanceRequired ? C.emerald : p2 >= 50 ? C.amber : C.red;
          }
        },
        margin: { left: 14, right: 14 },
      });
    }

    drawFooters(doc, pageW, `Evidentiraj · ${srl(subject.name)}`);

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const filename = `statistike_${subject.code}_${new Date().toISOString().slice(0, 10)}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    
    return res.status(200).send(pdfBuffer);

  } catch (err) {
    console.error("PDF stats generation error:", err);
    return res.status(500).json({ error: "Failed to generate PDF", details: String(err) });
  }
});

// ─── Scoresheet PDF endpoint ─────────────────────────────────────────────
app.post("/api/pdf/scoresheet", async (req, res) => {
  try {
    const { name, academicYear, columns, rows } = req.body;
    
    if (!name || !columns || !rows) {
      return res.status(400).json({ error: "Missing fields: name, columns, rows are required" });
    }

    const visCols = columns.filter(c => !c.isHidden);
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFillColor(23, 94, 141);
    doc.rect(0, 0, pageW, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.text(name, 10, 10);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(academicYear ?? "", 10, 17);
    doc.text(`Generisano: ${new Date().toLocaleDateString("sr-RS")}`, pageW - 10, 17, { align: "right" });

    const head = [["#", "Student", "Indeks", ...visCols.map(c => c.name + (c.maxPoints ? `\n(max ${c.maxPoints})` : ""))]];
    const body = rows.map((r, i) => [
      String(i + 1),
      r.studentName ?? "",
      r.indexNumber ?? "",
      ...visCols.map(c => r.computedCells[c.id] ?? ""),
    ]);

    autoTable(doc, {
      head, body, startY: 26, theme: "grid",
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: [23, 94, 141], textColor: 255, fontSize: 8, fontStyle: "bold", halign: "center" },
      columnStyles: { 0: { halign: "center", cellWidth: 8 }, 1: { cellWidth: 42 }, 2: { cellWidth: 28, halign: "center" } },
      alternateRowStyles: { fillColor: [242, 248, 253] },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index > 2) {
          const col = visCols[data.column.index - 3];
          if (col?.type === "formula") {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.textColor = [23, 94, 141];
            data.cell.styles.fillColor = [228, 240, 250];
          }
          data.cell.styles.halign = "center";
        }
      },
      margin: { left: 10, right: 10 },
    });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const filename = `${name}_${academicYear ?? ""}.pdf`.replace(/[^a-z0-9_\- ]/gi, "_");
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error("PDF scoresheet generation error:", err);
    return res.status(500).json({ error: "Failed to generate PDF", details: String(err) });
  }
});

// ─── Attendances PDF endpoint ────────────────────────────────────────────
app.post("/api/pdf/attendances", async (req, res) => {
  try {
    const { attendances, subject } = req.body;

    if (!attendances || !subject) {
      return res.status(400).json({ error: "Missing required fields: attendances, subject" });
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    const sessionCounts = {};
    attendances.forEach((a) => {
      sessionCounts[a.session.sessionNumber] = (sessionCounts[a.session.sessionNumber] ?? 0) + 1;
    });
    const sessionNums = Object.keys(sessionCounts).map(Number).sort((a, b) => a - b);
    const uniqueStudents = new Set(attendances.map((a) => a.student.id)).size;
    const avgPerSession = sessionNums.length > 0 ? Math.round(attendances.length / sessionNums.length) : 0;

    drawPageHeader(doc, pageW,
      "Evidentiraj",
      `${subject.name} (${subject.code})`,
      `Generisano: ${formatDate(new Date().toISOString())}  ·  ${attendances.length} zapisa`,
    );

    let y = 38;

    y = kpiCards(doc, pageW, y, [
      { label: "Ukupno zapisa",    value: String(attendances.length), color: C.primary },
      { label: "Razlicitih stud.", value: String(uniqueStudents),     color: [14, 165, 233] },
      { label: "Termina",          value: String(sessionNums.length), color: C.gray700 },
      { label: "Prosek / termin",  value: String(avgPerSession),      color: C.emerald },
    ]);

    if (sessionNums.length > 0) {
      y = sectionTitle(doc, "Odaziv po terminu", y) + 2;
      roundRect(doc, 14, y, pageW - 28, 46, 3, C.white);
      doc.setDrawColor(...C.gray200); doc.setLineWidth(0.3);
      doc.roundedRect(14, y, pageW - 28, 46, 3, 3, "S");
      y += 6;
      y = sessionBars(doc, pageW, y,
        sessionNums.map((n) => ({ sessionNumber: String(n), count: String(sessionCounts[n]) })),
        uniqueStudents,
      );
      y += 2;
    }

    if (y > 200) { doc.addPage(); y = 16; }
    y = sectionTitle(doc, "Detaljna evidencija", y) + 2;

    autoTable(doc, {
      startY: y,
      head: [[srl("Student"), srl("Indeks"), srl("Termin"), srl("Evidentirano")]],
      body: [...attendances]
        .sort((a, b) => a.student.lastName.localeCompare(b.student.lastName))
        .map((a) => [
          srl(`${a.student.lastName} ${a.student.firstName}`),
          `${a.student.smer} ${a.student.indexNumber}/${a.student.enrollmentYear}`,
          `T${a.session.sessionNumber}`,
          formatDateTime(a.recordedAt),
        ]),
      headStyles: tHead,
      bodyStyles: tBody,
      alternateRowStyles: tAlt,
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 35, font: "courier", fontSize: 7 },
        2: { cellWidth: 16, halign: "center" },
        3: { cellWidth: 50 },
      },
      didParseCell: (data) => {
        if (data.column.index === 2 && data.section === "body") {
          data.cell.styles.textColor = C.primary;
          data.cell.styles.fillColor = C.primary50;
          data.cell.styles.fontStyle = "bold";
        }
      },
      margin: { left: 14, right: 14 },
    });

    drawFooters(doc, pageW, `Evidentiraj · ${srl(subject.name)}`);

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const filename = `prisustva_${subject.code}_${new Date().toISOString().slice(0, 10)}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    
    return res.status(200).send(pdfBuffer);

  } catch (err) {
    console.error("PDF attendances generation error:", err);
    return res.status(500).json({ error: "Failed to generate PDF", details: String(err) });
  }
});

// Health check
app.get("/api/pdf/health", (_req, res) => res.json({ ok: true }));

// Export for Vercel
module.exports = app;
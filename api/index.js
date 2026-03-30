// api/pdf/index.js
const express = require("express");
const cors = require("cors");
const { jsPDF, GState } = require("jspdf");
const autoTable = require("jspdf-autotable").default;

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" }));

// ─── Konverzija ćirilice i latiničnih dijakritika u osnovnu latinicu ────
function cyrillicToLatin(str) {
  if (!str) return "";
  // Prvo prebacujemo latinične dijakritike (č, ć, š, đ, ž)
  let result = str
    .replace(/č/g, 'c').replace(/Č/g, 'C')
    .replace(/ć/g, 'c').replace(/Ć/g, 'C')
    .replace(/š/g, 's').replace(/Š/g, 'S')
    .replace(/đ/g, 'dj').replace(/Đ/g, 'Dj')
    .replace(/ž/g, 'z').replace(/Ž/g, 'Z');
  // Zatim ćirilična slova
  const cyrillicMap = {
    'А':'A','а':'a','Б':'B','б':'b','В':'V','в':'v','Г':'G','г':'g','Д':'D','д':'d',
    'Ђ':'Dj','ђ':'dj','Е':'E','е':'e','Ж':'Z','ж':'z','З':'Z','з':'z','И':'I','и':'i',
    'Ј':'J','ј':'j','К':'K','к':'k','Л':'L','л':'l','Љ':'Lj','љ':'lj','М':'M','м':'m',
    'Н':'N','н':'n','Њ':'Nj','њ':'nj','О':'O','о':'o','П':'P','п':'p','Р':'R','р':'r',
    'С':'S','с':'s','Т':'T','т':'t','Ћ':'C','ћ':'c','У':'U','у':'u','Ф':'F','ф':'f',
    'Х':'H','х':'h','Ц':'C','ц':'c','Ч':'C','ч':'c','Џ':'Dz','џ':'dz','Ш':'S','ш':'s'
  };
  result = result.split('').map(ch => cyrillicMap[ch] || ch).join('');
  return result;
}

// ─── Pomoćne funkcije za formatiranje datuma ─────────────────────────────
function formatDate(iso) {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}.`;
}

function formatDateTime(iso) {
  const d = new Date(iso);
  const dateStr = formatDate(iso);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${dateStr} ${hours}:${minutes}`;
}

// ─── Dizajn (boje, zaobljenja, značke) ───────────────────────────────────
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
  const tw = doc.getTextWidth(cyrillicToLatin(text));
  const pw = tw + 5;
  const ph = fontSize * 0.60;
  roundRect(doc, x, y - ph + 0.5, pw, ph + 1.5, 1.5, bg);
  doc.setTextColor(...fg);
  doc.setFont("helvetica", "bold");
  doc.text(cyrillicToLatin(text), x + 2.5, y, { baseline: "bottom" });
}

// ─── Zajedničko zaglavlje i podnožje ─────────────────────────────────────
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
  doc.text(cyrillicToLatin(title), 14, 14);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(195, 225, 248);
  doc.text(cyrillicToLatin(subtitle), 14, 22);
  doc.setFontSize(7);
  doc.setTextColor(170, 210, 240);
  doc.text(cyrillicToLatin(dateLabel), pageW - 10, 7, { align: "right" });
  doc.setTextColor(...C.gray900);
}

function drawFooters(doc, footerText) {
  const totalPages = doc.internal.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C.gray200);
    doc.setLineWidth(0.25);
    doc.line(14, pageHeight - 10, doc.internal.pageSize.getWidth() - 14, pageHeight - 10);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.gray400);
    doc.text(cyrillicToLatin(footerText), 14, pageHeight - 5);
    doc.text(`Strana ${i} od ${totalPages}`, doc.internal.pageSize.getWidth() - 14, pageHeight - 5, { align: "right" });
  }
}

function sectionTitle(doc, text, y) {
  doc.setFillColor(...C.primary);
  doc.rect(14, y - 3.8, 2.5, 5.8, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.gray900);
  doc.text(cyrillicToLatin(text), 19, y);
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
    doc.text(cyrillicToLatin(c.value), cx + cardW / 2, y + 9.5, { align: "center" });
    doc.setFontSize(6.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...C.gray500);
    doc.text(cyrillicToLatin(c.label), cx + cardW / 2, y + 14.5, { align: "center" });
    if (c.sub) {
      doc.setFontSize(5.5); doc.setTextColor(...C.gray400);
      doc.text(cyrillicToLatin(c.sub), cx + cardW / 2, y + 18.5, { align: "center" });
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
  doc.setTextColor(...C.amber); doc.text(cyrillicToLatin(`${required}% (prag)`), markerX, y + h + 4, { align: "center" });
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

// ─── Stilovi tabela (ujednačeni) ─────────────────────────────────────────
const tHead = { fillColor: C.gray50, textColor: C.gray500, fontStyle: "bold", fontSize: 7.5, lineColor: C.gray200, lineWidth: 0.3 };
const tBody = { fontSize: 8, textColor: C.gray700, lineColor: C.gray100, lineWidth: 0.2 };
const tAlt  = { fillColor: C.gray50 };

// ─── ENDPOINT: Statistike prisustva ──────────────────────────────────────
app.post("/api/pdf/stats", async (req, res) => {
  try {
    const { stats, matrix, subject } = req.body;
    if (!stats || !subject) {
      return res.status(400).json({ error: "Nedostaju obavezna polja: stats, subject" });
    }

    const perStudent = Array.isArray(stats.perStudent) ? stats.perStudent : [];
    const perSession = Array.isArray(stats.perSession) ? stats.perSession : [];
    const totalSessions = stats.totalSessions || 0;
    const totalStudents = stats.totalStudents || 0;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    const attendanceRequired = 100 - (subject.absenceThreshold || 0);
    const enrolledCount = matrix?.enrolledCount ?? totalStudents;
    const avgPct = totalSessions > 0 && perStudent.length > 0
      ? Math.round(
          perStudent.reduce((acc, s) => acc + parseInt(s.count || 0), 0) /
          perStudent.length / totalSessions * 100
        )
      : 0;
    const passing = perStudent.filter((s) =>
      Math.round(parseInt(s.count || 0) / totalSessions * 100) >= attendanceRequired
    ).length;

    drawPageHeader(doc, pageW,
      "Statistike prisustva",
      `${cyrillicToLatin(subject.name)} (${subject.code})`,
      `Generisano: ${formatDate(new Date().toISOString())}`,
    );

    let y = 38;
    y = kpiCards(doc, pageW, y, [
      { label: "Upisanih studenata",              value: String(enrolledCount),               color: C.primary },
      { label: "Termina odrzano",                 value: String(totalSessions),               color: [14, 165, 233] },
      { label: "Prosecno prisustvo",              value: `${avgPct}%`,                        color: avgPct >= attendanceRequired ? C.emerald : C.amber },
      { label: `Ispunili ${attendanceRequired}%`, value: `${passing}/${perStudent.length}`,   color: passing === perStudent.length ? C.emerald : C.red },
    ]);

    y += 1;
    const okReq = avgPct >= attendanceRequired;
    roundRect(doc, 14, y, pageW - 28, 25, 3, C.white);
    doc.setDrawColor(...C.gray200); doc.setLineWidth(0.3);
    doc.roundedRect(14, y, pageW - 28, 25, 3, 3, "S");

    doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...C.gray900);
    doc.text(cyrillicToLatin("Ukupno prisustvo"), 19, y + 6.5);
    badge(doc, pageW - 70, y + 5,
      okReq ? "Prosek ispunjava normu" : `Prosek ispod ${attendanceRequired}%`,
      okReq ? C.emerald50 : C.amber50,
      okReq ? C.emerald : C.amber,
    );
    progressBar(doc, 19, y + 11, pageW - 42, avgPct, attendanceRequired);
    y += 33;

    if (perSession.length > 0) {
      y = sectionTitle(doc, "Prisustvo po terminu", y) + 2;
      roundRect(doc, 14, y, pageW - 28, 46, 3, C.white);
      doc.setDrawColor(...C.gray200); doc.setLineWidth(0.3);
      doc.roundedRect(14, y, pageW - 28, 46, 3, 3, "S");
      y += 6;
      y = sessionBars(doc, pageW, y, perSession, enrolledCount);
      y += 2;
    }

    if (perStudent.length > 0) {
      if (y > 200) { doc.addPage(); y = 16; }
      y = sectionTitle(doc, "Prisustvo po studentu", y) + 2;

      const bodyRows = perStudent.map((s) => {
        const count = Number(s.count ?? 0);
        const absences = totalSessions - count;

        const p = totalSessions > 0 ? Math.round((count / totalSessions) * 100) : 0;

        const status = absences <= subject.absenceThreshold ? "Ispunjeno" : "Nije ispunjeno";

        return [
          cyrillicToLatin(`${s.lastName || ""} ${s.firstName || ""}`),
          `${s.smer || ""} ${s.indexNumber || ""}/${s.enrollmentYear || ""}`,
          `${count}/${totalSessions}`,
          `${p}%`,
          status,
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [[cyrillicToLatin("Student"), cyrillicToLatin("Indeks"), cyrillicToLatin("Prisustvo"), "%", cyrillicToLatin("Status")]],
        body: bodyRows,
        headStyles: tHead,
        bodyStyles: tBody,
        alternateRowStyles: tAlt,
        columnStyles: {
          0: { cellWidth: 52 },
          1: { cellWidth: 34, font: "courier", fontSize: 7 },
          2: { cellWidth: 22, halign: "center" },
          3: { cellWidth: 14, halign: "center", fontStyle: "bold" },
          4: { halign: "center" },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 4) {
            const status = data.cell.text[0];
            if (status === "Ispunjeno") {
              data.cell.styles.textColor = C.emerald;
              data.cell.styles.fillColor = C.emerald50;
            } else {
              data.cell.styles.textColor = C.red;
              data.cell.styles.fillColor = C.red50;
            }
            data.cell.styles.fontStyle = "bold";
          }

          if (data.section === "body" && data.column.index === 3) {
            const pct = parseInt(data.cell.text[0]);
            if (pct >= attendanceRequired) {
              data.cell.styles.textColor = C.emerald;
            } else if (pct >= 50) {
              data.cell.styles.textColor = C.amber;
            } else {
              data.cell.styles.textColor = C.red;
            }
          }
        },
        margin: { left: 14, right: 14 },
        tableWidth: "auto",
      });
    }

    drawFooters(doc, `Evidentiraj · ${cyrillicToLatin(subject.name)}`);

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const filename = `statistike_${subject.code}_${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${cyrillicToLatin(filename)}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error("PDF stats generation error:", err);
    return res.status(500).json({ error: "Neuspesno generisanje PDF-a", details: String(err) });
  }
});

// ─── ENDPOINT: Bodovna lista (scoresheet) ────────────────────────────────
app.post("/api/pdf/scoresheet", async (req, res) => {
  try {
    const { name, academicYear, columns, rows } = req.body;
    if (!name || !columns || !rows) {
      return res.status(400).json({ error: "Nedostaju obavezna polja: name, columns, rows" });
    }

    const visCols = (columns || []).filter(c => !c.isHidden);
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    drawPageHeader(doc, pageW,
      cyrillicToLatin(name),
      "Akademska " + cyrillicToLatin(academicYear || ""),
      `Generisano: ${formatDate(new Date().toISOString())}`
    );

    const head = [
      [
        cyrillicToLatin("#"),
        cyrillicToLatin("Student"),
        cyrillicToLatin("Indeks"),
        ...visCols.map(c => cyrillicToLatin(c.name + (c.maxPoints ? ` (max ${c.maxPoints})` : "")))
      ]
    ];

    const body = rows.map((r, i) => [
      String(i + 1),
      cyrillicToLatin(r.studentName || ""),
      cyrillicToLatin(r.indexNumber || ""),
      ...visCols.map(c => {
        let val = r.computedCells?.[c.id];
        if (val === undefined || val === null) val = "";
        return cyrillicToLatin(String(val));
      })
    ]);

    // Širina kolona – prva kolona 12 mm (za trocifrene brojeve)
    const marginLeft = 10;
    const marginRight = 10;
    const availableWidth = pageW - marginLeft - marginRight;
    const col0Width = 12;
    const col1Width = 42;
    const col2Width = 28;
    const fixedTotal = col0Width + col1Width + col2Width;
    const remainingWidth = availableWidth - fixedTotal;
    const dynamicColCount = visCols.length;
    const dynamicColWidth = dynamicColCount > 0 
      ? Math.max(20, remainingWidth / dynamicColCount) 
      : 0;

    const columnStyles = {
      0: { cellWidth: col0Width, halign: "center" },
      1: { cellWidth: col1Width },
      2: { cellWidth: col2Width, halign: "center" },
    };
    for (let i = 0; i < dynamicColCount; i++) {
      columnStyles[3 + i] = { cellWidth: dynamicColWidth, halign: "center" };
    }

    autoTable(doc, {
      head, body, startY: 38, theme: "grid",
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2, overflow: "linebreak" },
      headStyles: tHead,
      bodyStyles: tBody,
      alternateRowStyles: tAlt,
      columnStyles: columnStyles,
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index > 2) {
          const col = visCols[data.column.index - 3];
          if (col?.type === "formula") {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.textColor = C.primary;
            data.cell.styles.fillColor = C.primary100;
          }
        }
      },
      margin: { left: marginLeft, right: marginRight },
    });

    drawFooters(doc, `Bodovna lista · ${cyrillicToLatin(name)}`);

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    let filename = `${name}_${academicYear || ""}.pdf`.replace(/[^a-z0-9_\- ]/gi, "_");
    filename = cyrillicToLatin(filename);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error("PDF scoresheet generation error:", err);
    return res.status(500).json({ error: "Neuspesno generisanje PDF-a", details: String(err) });
  }
});

// ─── ENDPOINT: Evidencija prisustva (attendances) ────────────────────────
app.post("/api/pdf/attendances", async (req, res) => {
  try {
    const { attendances, subject } = req.body;
    if (!attendances || !subject) {
      return res.status(400).json({ error: "Nedostaju obavezna polja: attendances, subject" });
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    const sessionCounts = {};
    attendances.forEach((a) => {
      const sn = a.session?.sessionNumber;
      if (sn) sessionCounts[sn] = (sessionCounts[sn] ?? 0) + 1;
    });
    const sessionNums = Object.keys(sessionCounts).map(Number).sort((a, b) => a - b);
    const uniqueStudents = new Set(attendances.map((a) => a.student?.id)).size;
    const avgPerSession = sessionNums.length > 0 ? Math.round(attendances.length / sessionNums.length) : 0;

    drawPageHeader(doc, pageW,
      "Evidencija prisustva",
      `${cyrillicToLatin(subject.name)} (${subject.code})`,
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

    const bodyRows = [...attendances]
      .sort((a, b) => (a.student?.lastName || "").localeCompare(b.student?.lastName || ""))
      .map((a) => [
        cyrillicToLatin(`${a.student?.lastName || ""} ${a.student?.firstName || ""}`),
        `${a.student?.smer || ""} ${a.student?.indexNumber || ""}/${a.student?.enrollmentYear || ""}`,
        `T${a.session?.sessionNumber || "?"}`,
        formatDateTime(a.recordedAt),
      ]);

    autoTable(doc, {
      startY: y,
      head: [[cyrillicToLatin("Student"), cyrillicToLatin("Indeks"), cyrillicToLatin("Termin"), cyrillicToLatin("Evidentirano")]],
      body: bodyRows,
      headStyles: tHead,
      bodyStyles: tBody,
      alternateRowStyles: tAlt,
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 35, font: "courier", fontSize: 7 },
        2: { cellWidth: 16, halign: "center" },
        3: { },
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

    drawFooters(doc, `Evidentiraj · ${cyrillicToLatin(subject.name)}`);

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const filename = `prisustva_${subject.code}_${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${cyrillicToLatin(filename)}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error("PDF attendances generation error:", err);
    return res.status(500).json({ error: "Neuspesno generisanje PDF-a", details: String(err) });
  }
});

// ─── ENDPOINT: Izvoz odgovora forme u PDF ─────────────────────────────────
app.post("/api/pdf/forms", async (req, res) => {
  try {
    const { formTitle, questions, responses } = req.body;
    if (!questions || !responses) {
      return res.status(400).json({ error: "questions and responses are required" });
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    // Zaglavlje
    drawPageHeader(doc, pageW,
      cyrillicToLatin(formTitle || "Odgovori"),
      `Ukupno odgovora: ${responses.length} | ${responses.length > 0 ? `Poslednji: ${formatDateTime(responses[responses.length-1].submittedAt)}` : "Nema odgovora"}`,
      `Generisano: ${formatDate(new Date().toISOString())}`
    );

    let y = 38;

    // Tabela sa odgovorima
    const head = [
      [
        cyrillicToLatin("#"),
        cyrillicToLatin("Datum"),
        ...questions.map(q => cyrillicToLatin(q.label))
      ]
    ];

    const body = responses.map((r, idx) => [
      String(idx + 1),
      formatDateTime(r.submittedAt),
      ...questions.map(q => {
        let val = r.answers[q.id];
        if (Array.isArray(val)) val = val.filter(Boolean).join(", ");
        return cyrillicToLatin(val != null ? String(val) : "");
      })
    ]);

    // Širine kolona: prva 8mm, druga 28mm, ostale jednake
    const colWidths = [8, 28];
    const remaining = pageW - 28 - 14 - 14; // 14 margina sa svake strane
    const perQuestion = remaining / questions.length;
    for (let i = 0; i < questions.length; i++) {
      colWidths.push(perQuestion);
    }

    autoTable(doc, {
      startY: y,
      head,
      body,
      theme: "grid",
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2, overflow: "linebreak" },
      headStyles: tHead,
      bodyStyles: tBody,
      alternateRowStyles: tAlt,
      columnStyles: colWidths.reduce((acc, w, idx) => { acc[idx] = { cellWidth: w }; return acc; }, {}),
      margin: { left: 14, right: 14 },
    });

    // Podnožje
    drawFooters(doc, `Evidentiraj · ${cyrillicToLatin(formTitle)}`);

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const filename = `${formTitle || "odgovori"}_${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${cyrillicToLatin(filename)}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error("PDF forms export error:", err);
    return res.status(500).json({ error: "Neuspesno generisanje PDF-a", details: String(err) });
  }
});

module.exports = app;
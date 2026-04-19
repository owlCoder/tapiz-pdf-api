const express = require("express");
const cors = require("cors");
const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable").default;

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" }));

// ──────────────────────────────────────────────────────────────────
//  Text conversion (Cyrillic & diacritics to Latin)
// ──────────────────────────────────────────────────────────────────
function cyrillicToLatin(str) {
  if (!str) return "";
  let result = str
    .replace(/č/g, 'c').replace(/Č/g, 'C')
    .replace(/ć/g, 'c').replace(/Ć/g, 'C')
    .replace(/š/g, 's').replace(/Š/g, 'S')
    .replace(/đ/g, 'dj').replace(/Đ/g, 'Dj')
    .replace(/ž/g, 'z').replace(/Ž/g, 'Z');
  const map = {
    'А':'A','а':'a','Б':'B','б':'b','В':'V','в':'v','Г':'G','г':'g',
    'Д':'D','д':'d','Ђ':'Dj','ђ':'dj','Е':'E','е':'e','Ж':'Z','ж':'z',
    'З':'Z','з':'z','И':'I','и':'i','Ј':'J','ј':'j','К':'K','к':'k',
    'Л':'L','л':'l','Љ':'Lj','љ':'lj','М':'M','м':'m','Н':'N','н':'n',
    'Њ':'Nj','њ':'nj','О':'O','о':'o','П':'P','п':'p','Р':'R','р':'r',
    'С':'S','с':'s','Т':'T','т':'t','Ћ':'C','ћ':'c','У':'U','у':'u',
    'Ф':'F','ф':'f','Х':'H','х':'h','Ц':'C','ц':'c','Ч':'C','ч':'c',
    'Џ':'Dz','џ':'dz','Ш':'S','ш':'s'
  };
  result = result.split('').map(ch => map[ch] || ch).join('');
  return result;
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}.${d.getFullYear()}.`;
}

function formatDateTime(iso) {
  return `${formatDate(iso)} ${new Date(iso).getHours().toString().padStart(2,'0')}:${new Date(iso).getMinutes().toString().padStart(2,'0')}`;
}

// ──────────────────────────────────────────────────────────────────
//  Teal Primary Color Palette (matches your CSS)
// ──────────────────────────────────────────────────────────────────
const C = {
  // Primary teal shades
  primary: [47, 157, 147],      // 500
  primary50: [238, 250, 248],   // 50
  primary100: [213, 242, 239],  // 100
  primary200: [171, 228, 222],  // 200
  primary300: [122, 210, 201],  // 300
  primary400: [76, 188, 177],   // 400
  primary600: [35, 125, 117],   // 600
  primary700: [27, 95, 89],     // 700
  primary800: [19, 69, 64],     // 800
  primary900: [12, 46, 43],     // 900

  // Semantic colors
  emerald: [16, 185, 77],
  emerald50: [236, 253, 243],
  amber: [217, 119, 6],
  amber50: [255, 251, 235],
  red: [220, 38, 38],
  red50: [254, 242, 242],
  blue: [59, 130, 246],
  blue50: [239, 246, 255],

  // Grayscale
  gray50: [249, 250, 251],
  gray100: [243, 244, 246],
  gray200: [229, 231, 235],
  gray300: [209, 213, 219],
  gray400: [156, 163, 175],
  gray500: [107, 114, 128],
  gray600: [75, 85, 99],
  gray700: [55, 65, 81],
  gray800: [31, 41, 55],
  gray900: [17, 24, 39],
  white: [255, 255, 255],
};

// ──────────────────────────────────────────────────────────────────
//  Enhanced Page Header
// ──────────────────────────────────────────────────────────────────
function drawPageHeader(doc, pageW, title, subtitle, dateLabel) {
  const headerH = 24;
  // White background
  doc.setFillColor(...C.white);
  doc.rect(0, 0, pageW, headerH, "F");

  // Decorative top line (thin)
  doc.setDrawColor(...C.primary200);
  doc.setLineWidth(0.3);
  doc.line(0, headerH, pageW, headerH);

  // Thick accent line (primary)
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(1.2);
  doc.line(12, headerH - 1, pageW - 12, headerH - 1);

  // Title
  doc.setTextColor(...C.primary800);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(cyrillicToLatin(title), 12, 12);

  // Subtitle
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.gray500);
  doc.text(cyrillicToLatin(subtitle), 12, 19);

  // Date / info on the right
  doc.setFontSize(7);
  doc.setTextColor(...C.gray400);
  doc.text(cyrillicToLatin(dateLabel), pageW - 12, 10, { align: "right" });
}

// ──────────────────────────────────────────────────────────────────
//  Modern Footer
// ──────────────────────────────────────────────────────────────────
function drawFooter(doc, footerText) {
  const totalPages = doc.internal.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // Separator line
    doc.setDrawColor(...C.gray200);
    doc.setLineWidth(0.3);
    doc.line(12, pageHeight - 10, doc.internal.pageSize.getWidth() - 12, pageHeight - 10);
    // Left text
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.gray400);
    doc.text(cyrillicToLatin(footerText), 12, pageHeight - 5);
    // Page number
    doc.text(`Strana ${i} od ${totalPages}`, doc.internal.pageSize.getWidth() - 12, pageHeight - 5, { align: "right" });
  }
}

// ──────────────────────────────────────────────────────────────────
//  Enhanced KPI Cards (with hover-like shadow effect)
// ──────────────────────────────────────────────────────────────────
function kpiCards(doc, pageW, y, cards) {
  const margin = 12;
  const gap = 4;
  const n = cards.length;
  const cardW = (pageW - margin * 2 - gap * (n - 1)) / n;
  const cardH = 24;

  cards.forEach((c, i) => {
    const cx = margin + i * (cardW + gap);
    // White card with subtle border
    doc.setFillColor(...C.white);
    doc.roundedRect(cx, y, cardW, cardH, 3, 3, "F");
    doc.setDrawColor(...C.gray200);
    doc.setLineWidth(0.4);
    doc.roundedRect(cx, y, cardW, cardH, 3, 3, "S");

    // Optional: small colored top accent
    doc.setFillColor(...c.color);
    doc.roundedRect(cx, y, cardW, 3, 1.5, 1.5, "F");

    // Value
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...c.color);
    doc.text(cyrillicToLatin(c.value), cx + cardW / 2, y + 12, { align: "center" });

    // Label
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.gray600);
    doc.text(cyrillicToLatin(c.label), cx + cardW / 2, y + 18.5, { align: "center" });

    // Optional subtext
    if (c.sub) {
      doc.setFontSize(5);
      doc.setTextColor(...C.gray400);
      doc.text(cyrillicToLatin(c.sub), cx + cardW / 2, y + 22, { align: "center" });
    }
  });
  return y + cardH + 8;
}

// ──────────────────────────────────────────────────────────────────
//  Modern Progress Bar with threshold marker
// ──────────────────────────────────────────────────────────────────
function progressBar(doc, x, y, w, pct, required) {
  const barH = 6;
  // Background
  roundRect(doc, x, y, w, barH, 3, C.gray100);
  // Fill
  const fillW = Math.max(2, w * Math.min(pct, 100) / 100);
  const fillColor = pct >= required ? C.emerald : (pct >= 50 ? C.amber : C.red);
  roundRect(doc, x, y, fillW, barH, 3, fillColor);

  // Threshold marker
  const markerX = x + w * required / 100;
  doc.setDrawColor(...C.amber);
  doc.setLineWidth(0.5);
  doc.line(markerX, y - 1.5, markerX, y + barH + 1.5);

  // Labels
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.gray400);
  doc.text("0%", x, y + barH + 3.5);
  doc.setTextColor(...C.amber);
  doc.text(`${required}% (prag)`, markerX, y + barH + 3.5, { align: "center" });
  doc.setTextColor(...C.gray400);
  doc.text("100%", x + w, y + barH + 3.5, { align: "right" });
  // Show current percentage inside bar if wide enough
  if (fillW > 20 && pct > 15) {
    doc.setFontSize(5);
    doc.setTextColor(...C.white);
    doc.text(`${Math.round(pct)}%`, x + fillW - 3, y + barH - 1.5, { align: "right" });
  }
}

// ──────────────────────────────────────────────────────────────────
//  Helper: Rounded rectangle
// ──────────────────────────────────────────────────────────────────
function roundRect(doc, x, y, w, h, r, fill) {
  doc.setFillColor(...fill);
  doc.roundedRect(x, y, w, h, r, r, "F");
}

// ──────────────────────────────────────────────────────────────────
//  Session Bars (improved bar chart)
// ──────────────────────────────────────────────────────────────────
function sessionBars(doc, pageW, y, sessions, total) {
  const margin = 19;
  const chartW = pageW - margin * 2;
  const maxH = 28;
  const n = sessions.length;
  if (n === 0) return y;

  const barW = Math.min(12, (chartW - (n - 1) * 2) / n);
  const totalBarsW = n * barW + (n - 1) * 2;
  const startX = margin + (chartW - totalBarsW) / 2;

  // Base line
  doc.setDrawColor(...C.gray200);
  doc.setLineWidth(0.3);
  doc.line(margin, y + maxH, margin + chartW, y + maxH);

  sessions.forEach((s, i) => {
    const p = total > 0 ? parseInt(s.count) / total : 0;
    const barH = Math.max(2, p * maxH);
    const bx = startX + i * (barW + 2);
    const by = y + maxH - barH;
    const color = p >= 0.7 ? C.emerald : (p >= 0.5 ? C.amber : C.primary);
    roundRect(doc, bx, by, barW, barH, 2, color);

    // Session label
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.gray600);
    doc.text(`T${s.sessionNumber}`, bx + barW / 2, y + maxH + 4, { align: "center" });

    // Percentage inside bar if tall enough
    if (barH > 10) {
      doc.setFontSize(4.5);
      doc.setTextColor(...C.white);
      doc.text(`${Math.round(p * 100)}%`, bx + barW / 2, by + barH - 2, { align: "center" });
    }
  });
  return y + maxH + 10;
}

// ──────────────────────────────────────────────────────────────────
//  Table Styles (modern, clean)
// ──────────────────────────────────────────────────────────────────
const tableHeadStyles = {
  fillColor: C.gray50,
  textColor: C.gray700,
  fontStyle: "bold",
  fontSize: 7.5,
  lineColor: C.gray200,
  lineWidth: 0.2,
  halign: "center",
  valign: "middle",
};

const tableBodyStyles = {
  fontSize: 8,
  textColor: C.gray700,
  lineColor: C.gray100,
  lineWidth: 0.1,
  valign: "middle",
};

const tableAltRowStyles = {
  fillColor: C.gray50,
};

// ──────────────────────────────────────────────────────────────────
//  API: Attendance Statistics (improved design)
// ──────────────────────────────────────────────────────────────────
app.post("/api/pdf/stats", async (req, res) => {
  try {
    const { stats, matrix, subject } = req.body;
    if (!stats || !subject) return res.status(400).json({ error: "Nedostaju obavezna polja: stats, subject" });

    const perStudent = Array.isArray(stats.perStudent) ? stats.perStudent : [];
    const perSession = Array.isArray(stats.perSession) ? stats.perSession : [];
    const totalSessions = stats.totalSessions || 0;
    const totalStudents = stats.totalStudents || 0;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const attendanceRequired = 100 - (subject.absenceThreshold || 0);
    const enrolledCount = matrix?.enrolledCount ?? totalStudents;
    const avgPct = totalSessions > 0 && perStudent.length > 0
      ? Math.round(perStudent.reduce((acc, s) => acc + parseInt(s.count || 0), 0) / perStudent.length / totalSessions * 100)
      : 0;
    const passing = perStudent.filter(s => Math.round(parseInt(s.count || 0) / totalSessions * 100) >= attendanceRequired).length;

    drawPageHeader(doc, pageW, "Statistike prisustva", `${cyrillicToLatin(subject.name)} (${subject.code})`, `Generisano: ${formatDate(new Date().toISOString())}`);
    let y = 32;

    // KPI Cards
    y = kpiCards(doc, pageW, y, [
      { label: "Upisanih studenata", value: String(enrolledCount), color: C.primary },
      { label: "Termina održano", value: String(totalSessions), color: C.blue },
      { label: "Prosečno prisustvo", value: `${avgPct}%`, color: avgPct >= attendanceRequired ? C.emerald : C.amber },
      { label: `Ispunili ${attendanceRequired}%`, value: `${passing}/${perStudent.length}`, color: passing === perStudent.length ? C.emerald : C.red }
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

    // Badge
    const badgeText = avgPct >= attendanceRequired ? "Prosek ispunjava normu" : `Prosek ispod ${attendanceRequired}%`;
    const badgeColor = avgPct >= attendanceRequired ? C.emerald : C.amber;
    const badgeBg = avgPct >= attendanceRequired ? C.emerald50 : C.amber50;
    doc.setFontSize(6.5);
    const tw = doc.getTextWidth(cyrillicToLatin(badgeText));
    roundRect(doc, pageW - 12 - tw - 6, y + 3, tw + 8, 5, 2, badgeBg);
    doc.setTextColor(...badgeColor);
    doc.setFont("helvetica", "bold");
    doc.text(cyrillicToLatin(badgeText), pageW - 12 - 3, y + 6.5, { align: "right" });

    progressBar(doc, 18, y + 13, pageW - 36, avgPct, attendanceRequired);
    y += 34;

    // Per session chart
    if (perSession.length > 0) {
      // Section title with accent
      doc.setFillColor(...C.primary);
      doc.rect(12, y - 2, 3, 6, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.gray800);
      doc.text("Prisustvo po terminu", 18, y + 2);
      y += 8;

      roundRect(doc, 12, y, pageW - 24, 48, 4, C.white);
      doc.setDrawColor(...C.gray200);
      doc.roundedRect(12, y, pageW - 24, 48, 4, 4, "S");
      y += 8;
      y = sessionBars(doc, pageW, y, perSession, enrolledCount);
      y += 6;
    }

    // Per student table
    if (perStudent.length > 0) {
      if (y > 200) {
        doc.addPage();
        drawPageHeader(doc, pageW, "Statistike prisustva (nastavak)", "", "");
        y = 32;
      }
      doc.setFillColor(...C.primary);
      doc.rect(12, y - 2, 3, 6, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.gray800);
      doc.text("Prisustvo po studentu", 18, y + 2);
      y += 6;

      const bodyRows = perStudent.map(s => {
        const count = Number(s.count ?? 0);
        const p = totalSessions > 0 ? Math.round((count / totalSessions) * 100) : 0;
        const status = (totalSessions - count) <= subject.absenceThreshold ? "Ispunio" : "Nije ispunio";
        return [
          `${cyrillicToLatin(s.lastName || "")} ${cyrillicToLatin(s.firstName || "")}`,
          `${s.smer || ""} ${s.indexNumber || ""}/${s.enrollmentYear || ""}`,
          `${count}/${totalSessions}`,
          `${p}%`,
          status
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
          4: { cellWidth: 'auto', halign: "center" } 
        },
        didParseCell: (data) => {
          if (data.section === "body") {
            if (data.column.index === 4) {
              const status = data.cell.text[0];
              data.cell.styles.textColor = status === "Ispunio" ? C.emerald : C.red;
              data.cell.styles.fillColor = status === "Ispunio" ? C.emerald50 : C.red50;
              data.cell.styles.fontStyle = "bold";
            }
            if (data.column.index === 3) {
              const pct = parseInt(data.cell.text[0]);
              if (pct >= attendanceRequired) data.cell.styles.textColor = C.emerald;
              else if (pct >= 50) data.cell.styles.textColor = C.amber;
              else data.cell.styles.textColor = C.red;
            }
          }
        },
        margin: { left: 12, right: 12 }
      });
    }

    drawFooter(doc, `Evidentiraj · ${cyrillicToLatin(subject.name)}`);
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const filename = `statistike_${subject.code}_${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${cyrillicToLatin(filename)}"`);
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error("PDF stats error:", err);
    return res.status(500).json({ error: "Neuspešno generisanje PDF-a", details: String(err) });
  }
});

// ──────────────────────────────────────────────────────────────────
//  API: Scoresheet (improved statistics & layout)
// ──────────────────────────────────────────────────────────────────
app.post("/api/pdf/scoresheet", async (req, res) => {
  try {
    const { name, academicYear, columns, rows } = req.body;
    if (!name || !columns || !rows) return res.status(400).json({ error: "Nedostaju obavezna polja" });

    const visibleCols = (columns || []).filter(c => !c.isHidden);
    // Limit to 9 for stats grid
    const statsCols = visibleCols.slice(0, 9);

    // Statistics calculations (same as before, but we keep them)
    const calculateMedian = (arr) => {
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    };
    const calculateStandardDeviation = (values, mean) => {
      if (values.length === 0) return null;
      const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
      return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
    };
    const calculateStatistics = (rows, cols) => {
      const stats = {};
      cols.forEach(col => {
        const values = [];
        rows.forEach(row => {
          const val = row.computedCells?.[col.id];
          if (val !== undefined && val !== null && val !== "") {
            const num = parseFloat(val);
            if (!isNaN(num)) values.push(num);
          }
        });
        if (values.length > 0) {
          const sum = values.reduce((a, b) => a + b, 0);
          const avg = sum / values.length;
          stats[col.id] = {
            count: values.length,
            sum: sum,
            average: avg,
            min: Math.min(...values),
            max: Math.max(...values),
            median: calculateMedian(values),
            stdDev: calculateStandardDeviation(values, avg),
            maxPoints: col.maxPoints || null
          };
        } else {
          stats[col.id] = { count: 0, sum: null, average: null, min: null, max: null, median: null, stdDev: null, maxPoints: col.maxPoints || null };
        }
      });
      return stats;
    };
    const statistics = calculateStatistics(rows, visibleCols);

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    drawPageHeader(doc, pageW, cyrillicToLatin(name), `Akademska ${cyrillicToLatin(academicYear || "")}`, `Generisano: ${formatDate(new Date().toISOString())}`);

    // ----- Main table with MIN/MAX/AVG rows -----
    const colNames = ["#", "Student", "Indeks", ...visibleCols.map(c => cyrillicToLatin(c.name))];
    const head = [colNames];
    const minRow = ["", "", "Min:", ...visibleCols.map(c => statistics[c.id]?.min !== null ? statistics[c.id].min.toFixed(2) : "-")];
    const maxRow = ["", "", "Max:", ...visibleCols.map(c => statistics[c.id]?.max !== null ? statistics[c.id].max.toFixed(2) : "-")];
    const avgRow = ["", "", "Prosek:", ...visibleCols.map(c => statistics[c.id]?.average !== null ? statistics[c.id].average.toFixed(2) : "-")];
    const dataRows = rows.map((row, idx) => [
      String(idx + 1),
      cyrillicToLatin(row.studentName || ""),
      cyrillicToLatin(row.indexNumber || ""),
      ...visibleCols.map(c => {
        let val = row.computedCells?.[c.id];
        if (val === undefined || val === null) val = "";
        const num = parseFloat(val);
        return !isNaN(num) && val !== "" ? num : cyrillicToLatin(String(val));
      })
    ]);

    const marginLeft = 10, marginRight = 10;
    const availableWidth = pageW - marginLeft - marginRight;
    const col0w = 10, col1w = 44, col2w = 28;
    const fixedTotal = col0w + col1w + col2w;
    const remaining = availableWidth - fixedTotal;
    const dynCols = visibleCols.length;
    const dynWidth = dynCols > 0 ? Math.max(18, remaining / dynCols) : 0;
    const colStyles = {
      0: { cellWidth: col0w, halign: "center" },
      1: { cellWidth: col1w },
      2: { cellWidth: col2w, halign: "center" }
    };
    for (let i = 0; i < dynCols; i++) colStyles[3 + i] = { cellWidth: dynWidth, halign: "center" };

    const firstPageBody = [minRow, maxRow, avgRow, ...dataRows];
    autoTable(doc, {
      startY: 32,
      head: head,
      body: firstPageBody,
      theme: "grid",
      styles: { font: "helvetica", fontSize: 8, cellPadding: 1.5, overflow: "linebreak" },
      headStyles: { fillColor: C.gray50, textColor: C.gray700, fontStyle: "bold", halign: "center" },
      bodyStyles: tableBodyStyles,
      alternateRowStyles: tableAltRowStyles,
      columnStyles: colStyles,
      didParseCell: (data) => {
        if (data.section === "body" && data.row.index < 3) {
          data.cell.styles.fillColor = C.primary50;
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.textColor = C.primary800;
        }
        if (data.section === "body" && data.row.index >= 3) {
          const colIdx = data.column.index;
          if (colIdx > 2) {
            const col = visibleCols[colIdx - 3];
            const cellVal = data.cell.text[0];
            const num = parseFloat(cellVal);
            if (!isNaN(num) && col?.maxPoints) {
              const pct = (num / col.maxPoints) * 100;
              if (pct >= 80) data.cell.styles.textColor = C.emerald;
              else if (pct >= 60) data.cell.styles.textColor = C.amber;
              else if (pct < 60 && num > 0) data.cell.styles.textColor = C.red;
            }
            if (col?.type === "formula") {
              data.cell.styles.fontStyle = "bold";
              data.cell.styles.textColor = C.primary;
              data.cell.styles.fillColor = C.primary100;
            }
          }
        }
      },
      margin: { left: marginLeft, right: marginRight },
      pageBreak: 'auto'
    });

    // ----- Statistics Grid (3x3 cards) -----
    doc.addPage();
    drawPageHeader(doc, pageW, `Statistike — ${cyrillicToLatin(name)}`, `Detaljni proračuni po aktivnostima`, `Generisano: ${formatDate(new Date().toISOString())}`);

    let currentY = 32;
    const cardMargin = 12;
    const cardGap = 4;
    const cardWidth = (pageW - 2 * cardMargin - 2 * cardGap) / 3;
    const leftMargin = cardMargin;

    function drawStatsCard(doc, x, y, col, stats) {
      const maxP = col.maxPoints ? ` (max ${col.maxPoints})` : "";
      const title = `${cyrillicToLatin(col.name)}${maxP}`;
      const statRows = [
        ["Broj studenata sa poenima:", stats.count],
        ["Ukupno poena:", stats.sum !== null ? stats.sum.toFixed(2) : "-"],
        ["Prosek poena:", stats.average !== null ? stats.average.toFixed(2) : "-"],
        ["Medijana:", stats.median !== null ? stats.median.toFixed(2) : "-"],
        ["Standardna devijacija:", stats.stdDev !== null ? stats.stdDev.toFixed(2) : "-"],
        ["Min / Max:", stats.min !== null ? `${stats.min.toFixed(2)} / ${stats.max.toFixed(2)}` : "-"]
      ];
      if (col.maxPoints && stats.average !== null) {
        statRows.push(["Procentualni prosek:", `${((stats.average / col.maxPoints) * 100).toFixed(2)}%`]);
      }
      const lineHeight = 4;
      const headerHeight = 10;
      const bottomPadding = 5;
      const cardHeight = headerHeight + statRows.length * lineHeight + bottomPadding;

      // Card background and border
      doc.setFillColor(...C.white);
      doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, "F");
      doc.setDrawColor(...C.gray200);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, "S");

      // Title with teal accent
      doc.setFillColor(...C.primary);
      doc.roundedRect(x, y, cardWidth, 3, 1.5, 1.5, "F");
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.primary800);
      doc.text(title, x + 4, y + 7);

      // Stats rows
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      let textY = y + 13;
      for (const [label, value] of statRows) {
        doc.setTextColor(...C.gray600);
        doc.text(cyrillicToLatin(label), x + 4, textY);
        doc.setTextColor(...C.gray900);
        doc.setFont("helvetica", "bold");
        doc.text(String(value), x + cardWidth - 4, textY, { align: "right" });
        doc.setFont("helvetica", "normal");
        textY += lineHeight;
      }
      return cardHeight;
    }

    // Display first 9 columns in a 3x3 grid
    for (let i = 0; i < statsCols.length; i += 3) {
      const colsInRow = statsCols.slice(i, i + 3);
      const rowHeights = [];
      for (let j = 0; j < colsInRow.length; j++) {
        const stats = statistics[colsInRow[j].id];
        if (!stats) continue;
        const statRowsCount = 7 + (colsInRow[j].maxPoints && stats.average !== null ? 1 : 0);
        const cardHeight = 10 + statRowsCount * 4 + 5;
        rowHeights.push(cardHeight);
      }
      const maxRowHeight = Math.max(...rowHeights, 0);
      if (currentY + maxRowHeight + cardGap > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        drawPageHeader(doc, pageW, `Statistike — ${cyrillicToLatin(name)} (nastavak)`, "", `Generisano: ${formatDate(new Date().toISOString())}`);
        currentY = 32;
      }
      for (let j = 0; j < colsInRow.length; j++) {
        const col = colsInRow[j];
        const stats = statistics[col.id];
        if (!stats) continue;
        const x = leftMargin + j * (cardWidth + cardGap);
        drawStatsCard(doc, x, currentY, col, stats);
      }
      currentY += maxRowHeight + cardGap;
    }

    // ----- Student summary table -----
    const gradedCols = visibleCols.filter(c => c.maxPoints);
    const studentSummaries = rows.map(row => {
      let total = 0, maxTotal = 0;
      gradedCols.forEach(c => {
        const val = row.computedCells?.[c.id];
        const num = parseFloat(val);
        if (!isNaN(num) && c.maxPoints) {
          total += num;
          maxTotal += c.maxPoints;
        }
      });
      const pct = maxTotal > 0 ? (total / maxTotal) * 100 : null;
      return { total, maxTotal, pct, studentName: row.studentName, indexNumber: row.indexNumber };
    });

    if (currentY > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      drawPageHeader(doc, pageW, "Pregled po studentima", "", `Generisano: ${formatDate(new Date().toISOString())}`);
      currentY = 32;
    } else {
      currentY += 6;
    }

    doc.setFillColor(...C.primary);
    doc.rect(12, currentY - 2, 3, 6, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.gray800);
    doc.text("Pregled po studentima (samo bodovne aktivnosti)", 18, currentY + 2);
    currentY += 8;

    const studentBody = studentSummaries.map((s, idx) => [
      String(idx + 1),
      cyrillicToLatin(s.studentName || ""),
      cyrillicToLatin(s.indexNumber || ""),
      s.maxTotal > 0 ? s.total.toFixed(2) : "-",
      s.maxTotal > 0 ? s.maxTotal.toFixed(2) : "-",
      s.pct !== null ? `${s.pct.toFixed(2)}%` : "-",
      s.pct !== null ? (s.pct >= 60 ? "Položio" : s.pct >= 40 ? "Uslovno" : "Pao") : "N/A"
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["#", "Student", "Indeks", "Osvojeno", "Maksimum", "Procenat", "Status"]],
      body: studentBody,
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
        6: { cellWidth: 'auto', halign: "center" } 
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 6) {
          const st = data.cell.text[0];
          if (st === "Položio") data.cell.styles.textColor = C.emerald;
          else if (st === "Uslovno") data.cell.styles.textColor = C.amber;
          else if (st === "Pao") data.cell.styles.textColor = C.red;
          data.cell.styles.fontStyle = "bold";
        }
      },
      margin: { left: 12, right: 12 }
    });

    drawFooter(doc, `Evidentiraj · ${cyrillicToLatin(name)}`);
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    let filename = `${name}_${academicYear || ""}.pdf`.replace(/[^a-z0-9_\- ]/gi, "_");
    filename = cyrillicToLatin(filename);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error("PDF scoresheet error:", err);
    return res.status(500).json({ error: "Neuspešno generisanje PDF-a", details: String(err) });
  }
});

// ──────────────────────────────────────────────────────────────────
//  API: Attendance Log 
// ──────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────
//  API: Attendance Log (with session type)
// ──────────────────────────────────────────────────────────────────
app.post("/api/pdf/attendances", async (req, res) => {
  try {
    const { attendances, subject } = req.body;
    if (!attendances || !subject) return res.status(400).json({ error: "Nedostaju obavezna polja" });
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    const sessionCounts = {};
    const sessionTypeCounts = {}; // optional: count per type
    attendances.forEach(a => {
      if (a.session?.sessionNumber) sessionCounts[a.session.sessionNumber] = (sessionCounts[a.session.sessionNumber] || 0) + 1;
      if (a.session?.sessionType) sessionTypeCounts[a.session.sessionType] = (sessionTypeCounts[a.session.sessionType] || 0) + 1;
    });
    const sessionNums = Object.keys(sessionCounts).map(Number).sort((a,b)=>a-b);
    const uniqueStudents = new Set(attendances.map(a => a.student?.id)).size;
    const avgPerSession = sessionNums.length ? Math.round(attendances.length / sessionNums.length) : 0;

    drawPageHeader(doc, pageW, "Evidencija prisustva", `${cyrillicToLatin(subject.name)} (${subject.code})`, `Generisano: ${formatDate(new Date().toISOString())} · ${attendances.length} zapisa`);
    let y = 32;
    y = kpiCards(doc, pageW, y, [
      { label: "Ukupno zapisa", value: String(attendances.length), color: C.primary },
      { label: "Različitih stud.", value: String(uniqueStudents), color: C.blue },
      { label: "Termina", value: String(sessionNums.length), color: C.gray700 },
      { label: "Prosek / termin", value: String(avgPerSession), color: C.emerald }
    ]);

    if (sessionNums.length) {
      doc.setFillColor(...C.primary);
      doc.rect(12, y - 2, 3, 6, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.gray800);
      doc.text("Odaziv po terminu", 18, y + 2);
      y += 8;
      roundRect(doc, 12, y, pageW - 24, 48, 4, C.white);
      doc.setDrawColor(...C.gray200);
      doc.roundedRect(12, y, pageW - 24, 48, 4, 4, "S");
      y += 8;
      y = sessionBars(doc, pageW, y, sessionNums.map(n => ({ sessionNumber: String(n), count: String(sessionCounts[n]) })), uniqueStudents);
      y += 6;
    }

    if (y > 200) {
      doc.addPage();
      drawPageHeader(doc, pageW, "Evidencija prisustva (nastavak)", "", "");
      y = 32;
    }
    doc.setFillColor(...C.primary);
    doc.rect(12, y - 2, 3, 6, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.gray800);
    doc.text("Detaljna evidencija", 18, y + 2);
    y += 8;

    // Build rows with session type
    const bodyRows = [...attendances].sort((a,b) => (a.student?.lastName||"").localeCompare(b.student?.lastName||"")).map(a => [
      cyrillicToLatin(`${a.student?.lastName || ""} ${a.student?.firstName || ""}`),
      `${a.student?.smer || ""} ${a.student?.indexNumber || ""}/${a.student?.enrollmentYear || ""}`,
      `T${a.session?.sessionNumber || "?"}`,
      cyrillicToLatin(a.session?.sessionType || ""),
      formatDateTime(a.recordedAt)
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
        4: { cellWidth: 'auto', halign: "center" }
      },
      didParseCell: (data) => {
        if (data.column.index === 2 && data.section === "body") {
          data.cell.styles.textColor = C.primary;
          data.cell.styles.fillColor = C.primary50;
          data.cell.styles.fontStyle = "bold";
        }
        if (data.column.index === 3 && data.section === "body") {
          const type = data.cell.text[0];
          if (type === "Predavanja") data.cell.styles.textColor = C.blue;
          else if (type === "Računarske vežbe") data.cell.styles.textColor = C.primary;
          else if (type === "Auditorne vežbe") data.cell.styles.textColor = C.amber;
          else if (type === "Labaratorijske vežbe") data.cell.styles.textColor = C.emerald;
          data.cell.styles.fontStyle = "bold";
        }
      },
      margin: { left: 12, right: 12 }
    });

    drawFooter(doc, `Evidentiraj · ${cyrillicToLatin(subject.name)}`);
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const filename = `prisustva_${subject.code}_${new Date().toISOString().slice(0,10)}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${cyrillicToLatin(filename)}"`);
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error("PDF attendances error:", err);
    return res.status(500).json({ error: "Neuspešno generisanje PDF-a", details: String(err) });
  }
});

// ──────────────────────────────────────────────────────────────────
//  API: Form Responses (improved)
// ──────────────────────────────────────────────────────────────────
app.post("/api/pdf/forms", async (req, res) => {
  try {
    const { formTitle, questions, responses } = req.body;
    if (!questions || !responses) return res.status(400).json({ error: "questions and responses are required" });
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    drawPageHeader(doc, pageW, cyrillicToLatin(formTitle || "Odgovori"), `Ukupno odgovora: ${responses.length} | Poslednji: ${responses.length ? formatDateTime(responses[responses.length-1].submittedAt) : "Nema"}`, `Generisano: ${formatDate(new Date().toISOString())}`);

    const head = [["#", "Datum", ...questions.map(q => cyrillicToLatin(q.label))]];
    const body = responses.map((r, idx) => [
      String(idx + 1),
      formatDateTime(r.submittedAt),
      ...questions.map(q => {
        let v = r.answers[q.id];
        if (Array.isArray(v)) v = v.filter(Boolean).join(", ");
        return cyrillicToLatin(v != null ? String(v) : "");
      })
    ]);

    const colWidths = [8, 28];
    const remaining = pageW - 28 - 24;
    const perQuestion = remaining / questions.length;
    for (let i = 0; i < questions.length; i++) colWidths.push(perQuestion);

    autoTable(doc, {
      startY: 32,
      head, body,
      theme: "grid",
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2, overflow: "linebreak" },
      headStyles: tableHeadStyles,
      bodyStyles: tableBodyStyles,
      alternateRowStyles: tableAltRowStyles,
      columnStyles: colWidths.reduce((acc, w, i) => { acc[i] = { cellWidth: w }; return acc; }, {}),
      margin: { left: 12, right: 12 }
    });

    drawFooter(doc, `Evidentiraj · ${cyrillicToLatin(formTitle)}`);
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const filename = `${formTitle || "odgovori"}_${new Date().toISOString().slice(0,10)}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${cyrillicToLatin(filename)}"`);
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error("PDF forms error:", err);
    return res.status(500).json({ error: "Neuspešno generisanje PDF-a", details: String(err) });
  }
});

module.exports = app;

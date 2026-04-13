// api/pdf/index.js – cijeli fajl (zamijenite postojeći)

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
  // Prvo latinične dijakritike
  let result = str
    .replace(/č/g, 'c').replace(/Č/g, 'C')
    .replace(/ć/g, 'c').replace(/Ć/g, 'C')
    .replace(/š/g, 's').replace(/Š/g, 'S')
    .replace(/đ/g, 'dj').replace(/Đ/g, 'Dj')
    .replace(/ž/g, 'z').replace(/Ž/g, 'Z');
  // Zatim ćirilica
  const map = {
    'А': 'A', 'а': 'a', 'Б': 'B', 'б': 'b', 'В': 'V', 'в': 'v', 'Г': 'G', 'г': 'g', 'Д': 'D', 'д': 'd',
    'Ђ': 'Dj', 'ђ': 'dj', 'Е': 'E', 'е': 'e', 'Ж': 'Z', 'ж': 'z', 'З': 'Z', 'з': 'z', 'И': 'I', 'и': 'i',
    'Ј': 'J', 'ј': 'j', 'К': 'K', 'к': 'k', 'Л': 'L', 'л': 'l', 'Љ': 'Lj', 'љ': 'lj', 'М': 'M', 'м': 'm',
    'Н': 'N', 'н': 'n', 'Њ': 'Nj', 'њ': 'nj', 'О': 'O', 'о': 'o', 'П': 'P', 'п': 'p', 'Р': 'R', 'р': 'r',
    'С': 'S', 'с': 's', 'Т': 'T', 'т': 't', 'Ћ': 'C', 'ћ': 'c', 'У': 'U', 'у': 'u', 'Ф': 'F', 'ф': 'f',
    'Х': 'H', 'х': 'h', 'Ц': 'C', 'ц': 'c', 'Ч': 'C', 'ч': 'c', 'Џ': 'Dz', 'џ': 'dz', 'Ш': 'S', 'ш': 's'
  };
  result = result.split('').map(ch => map[ch] || ch).join('');
  return result;
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}.`;
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return `${formatDate(iso)} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

// ─── Boje (usklađene sa Excel verzijom) ──────────────────────────────────
const C = {
  primary: [23, 94, 141],  // #175E8D
  primary50: [242, 248, 253],
  primary100: [228, 240, 250],
  primary800: [23, 80, 117],
  emerald: [22, 163, 74],
  emerald50: [240, 253, 244],
  amber: [217, 119, 6],
  amber50: [255, 251, 235],
  red: [220, 38, 38],
  red50: [254, 242, 242],
  gray50: [249, 250, 251],
  gray100: [243, 244, 246],
  gray200: [229, 231, 235],
  gray400: [156, 163, 175],
  gray500: [107, 114, 128],
  gray700: [55, 65, 81],
  gray900: [17, 24, 39],
  white: [255, 255, 255],
};

function drawPageHeaderMinimal(doc, pageW, title, subtitle, dateLabel) {
  const headerH = 18; // još niži, 18 mm
  // Pozadina – samo tanka linija, bez teškog preljeva
  doc.setFillColor(...C.white);
  doc.rect(0, 0, pageW, headerH, "F");
  
  // Linija ispod headera (primarna boja)
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(0.5);
  doc.line(10, headerH, pageW - 10, headerH);
  
  // Naslov – lijevo
  doc.setTextColor(...C.primary);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(cyrillicToLatin(title), 12, 10);
  
  // Podnaslov – odmah ispod naslova (manji font)
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.gray500);
  doc.text(cyrillicToLatin(subtitle), 12, 16);
  
  // Datum – desno, vertikalno centriran
  doc.setFontSize(6.5);
  doc.setTextColor(...C.gray400);
  doc.text(cyrillicToLatin(dateLabel), pageW - 12, 8, { align: "right" });
}

// ─── Ostale pomoćne funkcije (roundRect, badge, kpiCards, progressBar, sessionBars) ───
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

function kpiCards(doc, pageW, y, cards) {
  const margin = 12, gap = 3, n = cards.length;
  const cardW = (pageW - margin * 2 - gap * (n - 1)) / n;
  const cardH = 19;
  cards.forEach((c, i) => {
    const cx = margin + i * (cardW + gap);
    roundRect(doc, cx, y, cardW, cardH, 3, C.white);
    doc.setDrawColor(...C.gray200); doc.setLineWidth(0.3);
    doc.roundedRect(cx, y, cardW, cardH, 3, 3, "S");
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(...c.color);
    doc.text(cyrillicToLatin(c.value), cx + cardW / 2, y + 8.5, { align: "center" });
    doc.setFontSize(6); doc.setFont("helvetica", "normal"); doc.setTextColor(...C.gray500);
    doc.text(cyrillicToLatin(c.label), cx + cardW / 2, y + 13.5, { align: "center" });
    if (c.sub) {
      doc.setFontSize(5); doc.setTextColor(...C.gray400);
      doc.text(cyrillicToLatin(c.sub), cx + cardW / 2, y + 17, { align: "center" });
    }
  });
  return y + cardH + 5;
}

function progressBar(doc, x, y, w, pct, required) {
  const h = 4.5;
  const color = pct >= required ? C.emerald : pct >= 50 ? C.amber : C.red;
  roundRect(doc, x, y, w, h, 2, C.gray100);
  if (pct > 0) roundRect(doc, x, y, Math.max(3, w * pct / 100), h, 2, color);
  const markerX = x + w * required / 100;
  doc.setDrawColor(...C.amber); doc.setLineWidth(0.4);
  doc.line(markerX, y - 1, markerX, y + h + 1);
  doc.setFontSize(6); doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.gray400); doc.text("0%", x, y + h + 3.5);
  doc.setTextColor(...C.amber); doc.text(`${required}% (prag)`, markerX, y + h + 3.5, { align: "center" });
  doc.setTextColor(...C.gray400); doc.text("100%", x + w, y + h + 3.5, { align: "right" });
}

function sessionBars(doc, pageW, y, sessions, total) {
  const margin = 19, chartW = pageW - margin * 2, maxH = 24, n = sessions.length;
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
    doc.setFontSize(5); doc.setFont("helvetica", "normal"); doc.setTextColor(...C.gray500);
    doc.text(`T${s.sessionNumber}`, bx + barW / 2, y + maxH + 4, { align: "center" });
    if (bh > 5) {
      doc.setFontSize(4.5); doc.setTextColor(...C.white);
      doc.text(`${Math.round(p * 100)}%`, bx + barW / 2, by + bh - 1.5, { align: "center" });
    }
  });
  return y + maxH + 8;
}

const tHead = { fillColor: C.gray50, textColor: C.gray500, fontStyle: "bold", fontSize: 7.5, lineColor: C.gray200, lineWidth: 0.3 };
const tBody = { fontSize: 8, textColor: C.gray700, lineColor: C.gray100, lineWidth: 0.2 };
const tAlt = { fillColor: C.gray50 };

function drawFooters(doc, footerText) {
  const totalPages = doc.internal.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C.gray200);
    doc.setLineWidth(0.25);
    doc.line(12, pageHeight - 8, doc.internal.pageSize.getWidth() - 12, pageHeight - 8);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.gray400);
    doc.text(cyrillicToLatin(footerText), 12, pageHeight - 4);
    doc.text(`Strana ${i} od ${totalPages}`, doc.internal.pageSize.getWidth() - 12, pageHeight - 4, { align: "right" });
  }
}

// ─── Statistike prisustva ────────────────────────────────────────────────
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

    drawPageHeaderCompact(doc, pageW, "Statistike prisustva", `${cyrillicToLatin(subject.name)} (${subject.code})`, `Generisano: ${formatDate(new Date().toISOString())}`);
    let y = 34;
    y = kpiCards(doc, pageW, y, [
      { label: "Upisanih studenata", value: String(enrolledCount), color: C.primary },
      { label: "Termina održano", value: String(totalSessions), color: [14, 165, 233] },
      { label: "Prosečno prisustvo", value: `${avgPct}%`, color: avgPct >= attendanceRequired ? C.emerald : C.amber },
      { label: `Ispunili ${attendanceRequired}%`, value: `${passing}/${perStudent.length}`, color: passing === perStudent.length ? C.emerald : C.red }
    ]);
    y += 1;
    roundRect(doc, 12, y, pageW - 24, 23, 3, C.white);
    doc.setDrawColor(...C.gray200); doc.setLineWidth(0.3);
    doc.roundedRect(12, y, pageW - 24, 23, 3, 3, "S");
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...C.gray900);
    doc.text("Ukupno prisustvo", 17, y + 6);
    badge(doc, pageW - 68, y + 5, avgPct >= attendanceRequired ? "Prosek ispunjava normu" : `Prosek ispod ${attendanceRequired}%`, avgPct >= attendanceRequired ? C.emerald50 : C.amber50, avgPct >= attendanceRequired ? C.emerald : C.amber);
    progressBar(doc, 17, y + 10, pageW - 38, avgPct, attendanceRequired);
    y += 30;
    if (perSession.length > 0) {
      doc.setFillColor(...C.primary);
      doc.rect(12, y - 3, 2.5, 5, "F");
      doc.setFontSize(9.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...C.gray900);
      doc.text("Prisustvo po terminu", 17, y);
      y += 4;
      roundRect(doc, 12, y, pageW - 24, 44, 3, C.white);
      doc.setDrawColor(...C.gray200); doc.setLineWidth(0.3);
      doc.roundedRect(12, y, pageW - 24, 44, 3, 3, "S");
      y += 6;
      y = sessionBars(doc, pageW, y, perSession, enrolledCount);
      y += 4;
    }
    if (perStudent.length > 0) {
      if (y > 200) { doc.addPage(); drawPageHeaderCompact(doc, pageW, "Statistike prisustva (nastavak)", "", ""); y = 30; }
      doc.setFillColor(...C.primary);
      doc.rect(12, y - 3, 2.5, 5, "F");
      doc.setFontSize(9.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...C.gray900);
      doc.text("Prisustvo po studentu", 17, y);
      y += 4;
      const bodyRows = perStudent.map(s => {
        const count = Number(s.count ?? 0);
        const absences = totalSessions - count;
        const p = totalSessions > 0 ? Math.round((count / totalSessions) * 100) : 0;
        const status = absences <= subject.absenceThreshold ? "Ispunjeno" : "Nije ispunjeno";
        return [`${cyrillicToLatin(s.lastName || "")} ${cyrillicToLatin(s.firstName || "")}`, `${s.smer || ""} ${s.indexNumber || ""}/${s.enrollmentYear || ""}`, `${count}/${totalSessions}`, `${p}%`, status];
      });
      autoTable(doc, {
        startY: y,
        head: [["Student", "Indeks", "Prisustvo", "%", "Status"]],
        body: bodyRows,
        headStyles: tHead,
        bodyStyles: tBody,
        alternateRowStyles: tAlt,
        columnStyles: { 0: { cellWidth: 52 }, 1: { cellWidth: 34, font: "courier", fontSize: 7 }, 2: { cellWidth: 22, halign: "center" }, 3: { cellWidth: 14, halign: "center", fontStyle: "bold" }, 4: { halign: "center" } },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 4) {
            const status = data.cell.text[0];
            data.cell.styles.textColor = status === "Ispunjeno" ? C.emerald : C.red;
            data.cell.styles.fillColor = status === "Ispunjeno" ? C.emerald50 : C.red50;
            data.cell.styles.fontStyle = "bold";
          }
          if (data.section === "body" && data.column.index === 3) {
            const pct = parseInt(data.cell.text[0]);
            if (pct >= attendanceRequired) data.cell.styles.textColor = C.emerald;
            else if (pct >= 50) data.cell.styles.textColor = C.amber;
            else data.cell.styles.textColor = C.red;
          }
        },
        margin: { left: 12, right: 12 }
      });
    }
    drawFooters(doc, `Evidentiraj · ${cyrillicToLatin(subject.name)}`);
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

// ─── Bodovna lista (sa MIN, MAX, PROSEK redovima samo na prvoj strani) ───
app.post("/api/pdf/scoresheet", async (req, res) => {
  try {
    const { name, academicYear, columns, rows } = req.body;
    if (!name || !columns || !rows) return res.status(400).json({ error: "Nedostaju obavezna polja" });

    const visibleCols = (columns || []).filter(c => !c.isHidden);
    // Funkcije za statistiku (identične Excelu)
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
          stats[col.id] = { count: values.length, sum, average: avg, min: Math.min(...values), max: Math.max(...values), median: calculateMedian(values), stdDev: calculateStandardDeviation(values, avg), maxPoints: col.maxPoints || null };
        } else {
          stats[col.id] = { count: 0, sum: null, average: null, min: null, max: null, median: null, stdDev: null, maxPoints: col.maxPoints || null };
        }
      });
      return stats;
    };
    const calculateMedian = (arr) => { const s = [...arr].sort((a, b) => a - b), m = Math.floor(s.length / 2); return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m]; };
    const calculateStandardDeviation = (vals, mean) => Math.sqrt(vals.map(v => Math.pow(v - mean, 2)).reduce((a, b) => a + b, 0) / vals.length);
    const statistics = calculateStatistics(rows, visibleCols);

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    drawPageHeaderCompact(doc, pageW, cyrillicToLatin(name), `Akademska ${cyrillicToLatin(academicYear || "")}`, `Generisano: ${formatDate(new Date().toISOString())}`);

    // Zaglavlje tabele (samo nazivi kolona)
    const colNames = ["#", "Student", "Indeks", ...visibleCols.map(c => cyrillicToLatin(c.name))];
    const head = [colNames];

    // Priprema podataka za statističke redove (MIN, MAX, PROSEK) – samo za prvu stranu
    const minRow = ["", "", "Min:", ...visibleCols.map(c => statistics[c.id]?.min !== null ? statistics[c.id].min.toFixed(2) : "-")];
    const maxRow = ["", "", "Max:", ...visibleCols.map(c => statistics[c.id]?.max !== null ? statistics[c.id].max.toFixed(2) : "-")];
    const avgRow = ["", "", "Prosek:", ...visibleCols.map(c => statistics[c.id]?.average !== null ? statistics[c.id].average.toFixed(2) : "-")];

    // Podaci
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

    // Širine kolona
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

    // Prva strana: crtamo tabelu sa dodatnim redovima (min, max, prosek) kao dio body-ja
    // Da bismo ih prikazali odmah ispod zaglavlja, dodajemo ih na početak body-ja i postavljamo posebne stilove.
    const firstPageBody = [minRow, maxRow, avgRow, ...dataRows];
    autoTable(doc, {
      startY: 34,
      head: head,
      body: firstPageBody,
      theme: "grid",
      styles: { font: "helvetica", fontSize: 8, cellPadding: 1.5, overflow: "linebreak" },
      headStyles: { fillColor: C.gray50, textColor: C.gray700, fontStyle: "bold", halign: "center" },
      bodyStyles: tBody,
      alternateRowStyles: tAlt,
      columnStyles: colStyles,
      didParseCell: (data) => {
        if (data.section === "body" && data.row.index < 3) { // min, max, prosek redovi
          data.cell.styles.fillColor = C.primary50;
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.textColor = C.primary;
          if (data.cell.text[0] === "-") data.cell.styles.textColor = C.gray400;
          if (data.column.index === 2) data.cell.styles.halign = "right";
        }
        if (data.section === "body" && data.row.index >= 3) { // podaci studenata
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

    // Za naredne strane (ako tabela pređe na novu stranicu) potrebno je da se ne ponavljaju min/max/prosek redovi.
    // autoTable automatski ponavlja head, ali ne i dodatne redove. Međutim, pošto smo ih stavili u body,
    // oni će se pojaviti samo na prvoj strani jer su dio prvog dijela tabele. autoTable će nastaviti sa ostatkom body-ja
    // na sljedećim stranama, ali će prva tri reda (statistike) ostati na prvoj strani. To je upravo ono što želimo.

    // ---- Statistike (dodatna strana) ----
    doc.addPage();
    drawPageHeaderCompact(doc, pageW, `Statistike — ${cyrillicToLatin(name)}`, `Detaljni proracuni`, `Generisano: ${formatDate(new Date().toISOString())}`);
    let y = 34;
    const gradedCols = visibleCols.filter(c => c.maxPoints);
    const totalMax = gradedCols.reduce((s, c) => s + (c.maxPoints || 0), 0);
    const studentSummaries = rows.map(row => {
      let total = 0, maxTotal = 0;
      gradedCols.forEach(c => {
        const val = row.computedCells?.[c.id];
        const num = parseFloat(val);
        if (!isNaN(num) && c.maxPoints) { total += num; maxTotal += c.maxPoints; }
      });
      const pct = maxTotal > 0 ? (total / maxTotal) * 100 : null;
      return { total, maxTotal, pct, studentName: row.studentName, indexNumber: row.indexNumber };
    });
    const passedCount = studentSummaries.filter(s => s.pct !== null && s.pct >= 60).length;
    const avgPctOverall = studentSummaries.filter(s => s.pct !== null).length ? studentSummaries.reduce((a, s) => a + (s.pct || 0), 0) / studentSummaries.filter(s => s.pct !== null).length : 0;
    y = kpiCards(doc, pageW, y, [
      { label: "Ukupno studenata", value: String(rows.length), color: C.primary },
      { label: "Prosek uspeha", value: `${Math.round(avgPctOverall)}%`, color: avgPctOverall >= 60 ? C.emerald : C.amber },
      { label: "Ima uslov (≥60%)", value: `${passedCount}/${rows.length}`, color: passedCount === rows.length ? C.emerald : C.red },
      { label: "Maks. bodova", value: String(totalMax), color: C.gray700 }
    ]);
    y += 5;
    for (const col of visibleCols) {
      const s = statistics[col.id];
      const maxP = col.maxPoints ? ` (max ${col.maxPoints})` : "";
      doc.setFontSize(9.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...C.primary);
      doc.text(cyrillicToLatin(`${col.name}${maxP}`), 12, y);
      y += 4;
      const rowsStats = [
  [cyrillicToLatin("Broj studenata sa poenima:"), s.count],
  [cyrillicToLatin("Ukupno poena:"), s.sum !== null ? s.sum.toFixed(2) : "-"],
  [cyrillicToLatin("Prosek poena:"), s.average !== null ? s.average.toFixed(2) : "-"],
  [cyrillicToLatin("Medijana:"), s.median !== null ? s.median.toFixed(2) : "-"],
  [cyrillicToLatin("Standardna devijacija:"), s.stdDev !== null ? s.stdDev.toFixed(2) : "-"],
  [cyrillicToLatin("Min / Max:"), s.min !== null ? `${s.min.toFixed(2)} / ${s.max.toFixed(2)}` : "-"]
];
if (col.maxPoints && s.average !== null) {
  rowsStats.push([cyrillicToLatin("Prosecan procenat:"), `${((s.average / col.maxPoints) * 100).toFixed(2)}%`]);
}
      if (col.maxPoints && s.average !== null) {
        rowsStats.push([cyrillicToLatin("Prosecan procenat:"), `${((s.average / col.maxPoints) * 100).toFixed(2)}%`]);
      }
      if (col.maxPoints && s.average !== null) rowsStats.push(["Prosečan procenat:", `${((s.average / col.maxPoints) * 100).toFixed(2)}%`]);
      autoTable(doc, {
        startY: y,
        body: rowsStats,
        theme: "plain",
        styles: { fontSize: 7.5, cellPadding: 1.5 },
        columnStyles: { 0: { cellWidth: 48, fontStyle: "bold" }, 1: { cellWidth: 28, halign: "right" } },
        margin: { left: 12 },
        tableWidth: 80
      });
      y = doc.lastAutoTable.finalY + 5;
      if (y > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); drawPageHeaderCompact(doc, pageW, "Statistike (nastavak)", "", ""); y = 30; }
    }
    if (y > doc.internal.pageSize.getHeight() - 50) { doc.addPage(); drawPageHeaderCompact(doc, pageW, "Pregled po studentima", "", ""); y = 30; }
    doc.setFontSize(9.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...C.primary);
    doc.text("Pregled po studentima (samo bodovne aktivnosti)", 12, y);
    y += 4;
    const studentBody = studentSummaries.map((s, idx) => [
      String(idx + 1), cyrillicToLatin(s.studentName || ""), cyrillicToLatin(s.indexNumber || ""),
      s.maxTotal > 0 ? s.total.toFixed(2) : "-", s.maxTotal > 0 ? s.maxTotal.toFixed(2) : "-",
      s.pct !== null ? `${s.pct.toFixed(2)}%` : "-",
      s.pct !== null ? (s.pct >= 60 ? "Položio" : s.pct >= 40 ? "Uslovno" : "Pao") : "N/A"
    ]);
    autoTable(doc, {
      startY: y,
      head: [["#", "Student", "Indeks", "Osvojeno", "Maksimum", "Procenat", "Status"]],
      body: studentBody,
      theme: "grid",
      headStyles: tHead,
      bodyStyles: tBody,
      alternateRowStyles: tAlt,
      columnStyles: { 0: { cellWidth: 10, halign: "center" }, 1: { cellWidth: 42 }, 2: { cellWidth: 28 }, 3: { cellWidth: 20, halign: "center" }, 4: { cellWidth: 20, halign: "center" }, 5: { cellWidth: 20, halign: "center" }, 6: { cellWidth: 22, halign: "center" } },
      didParseCell: (data) => { if (data.section === "body" && data.column.index === 6) { const st = data.cell.text[0]; if (st === "Položio") data.cell.styles.textColor = C.emerald; else if (st === "Uslovno") data.cell.styles.textColor = C.amber; else if (st === "Pao") data.cell.styles.textColor = C.red; data.cell.styles.fontStyle = "bold"; } },
      margin: { left: 12, right: 12 }
    });
    drawFooters(doc, `Evidentiraj · ${cyrillicToLatin(name)}`);
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

// ─── Evidencija prisustva (attendances) ──────────────────────────────────
app.post("/api/pdf/attendances", async (req, res) => {
  try {
    const { attendances, subject } = req.body;
    if (!attendances || !subject) return res.status(400).json({ error: "Nedostaju obavezna polja" });
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const sessionCounts = {};
    attendances.forEach(a => { if (a.session?.sessionNumber) sessionCounts[a.session.sessionNumber] = (sessionCounts[a.session.sessionNumber] || 0) + 1; });
    const sessionNums = Object.keys(sessionCounts).map(Number).sort((a, b) => a - b);
    const uniqueStudents = new Set(attendances.map(a => a.student?.id)).size;
    const avgPerSession = sessionNums.length ? Math.round(attendances.length / sessionNums.length) : 0;
    drawPageHeaderCompact(doc, pageW, "Evidencija prisustva", `${cyrillicToLatin(subject.name)} (${subject.code})`, `Generisano: ${formatDate(new Date().toISOString())} · ${attendances.length} zapisa`);
    let y = 34;
    y = kpiCards(doc, pageW, y, [
      { label: "Ukupno zapisa", value: String(attendances.length), color: C.primary },
      { label: "Različitih stud.", value: String(uniqueStudents), color: [14, 165, 233] },
      { label: "Termina", value: String(sessionNums.length), color: C.gray700 },
      { label: "Prosek / termin", value: String(avgPerSession), color: C.emerald }
    ]);
    if (sessionNums.length) {
      doc.setFillColor(...C.primary); doc.rect(12, y - 3, 2.5, 5, "F"); doc.setFontSize(9.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...C.gray900);
      doc.text("Odaziv po terminu", 17, y); y += 4;
      roundRect(doc, 12, y, pageW - 24, 44, 3, C.white); doc.setDrawColor(...C.gray200); doc.setLineWidth(0.3); doc.roundedRect(12, y, pageW - 24, 44, 3, 3, "S");
      y += 6; y = sessionBars(doc, pageW, y, sessionNums.map(n => ({ sessionNumber: String(n), count: String(sessionCounts[n]) })), uniqueStudents); y += 4;
    }
    if (y > 200) { doc.addPage(); drawPageHeaderCompact(doc, pageW, "Evidencija prisustva (nastavak)", "", ""); y = 30; }
    doc.setFillColor(...C.primary); doc.rect(12, y - 3, 2.5, 5, "F"); doc.setFontSize(9.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...C.gray900);
    doc.text("Detaljna evidencija", 17, y); y += 4;
    const bodyRows = [...attendances].sort((a, b) => (a.student?.lastName || "").localeCompare(b.student?.lastName || "")).map(a => [cyrillicToLatin(`${a.student?.lastName || ""} ${a.student?.firstName || ""}`), `${a.student?.smer || ""} ${a.student?.indexNumber || ""}/${a.student?.enrollmentYear || ""}`, `T${a.session?.sessionNumber || "?"}`, formatDateTime(a.recordedAt)]);
    autoTable(doc, {
      startY: y, head: [["Student", "Indeks", "Termin", "Evidentirano"]], body: bodyRows,
      headStyles: tHead, bodyStyles: tBody, alternateRowStyles: tAlt,
      columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 35, font: "courier", fontSize: 7 }, 2: { cellWidth: 16, halign: "center" }, 3: {} },
      didParseCell: (data) => { if (data.column.index === 2 && data.section === "body") { data.cell.styles.textColor = C.primary; data.cell.styles.fillColor = C.primary50; data.cell.styles.fontStyle = "bold"; } },
      margin: { left: 12, right: 12 }
    });
    drawFooters(doc, `Evidentiraj · ${cyrillicToLatin(subject.name)}`);
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const filename = `prisustva_${subject.code}_${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${cyrillicToLatin(filename)}"`);
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error("PDF attendances error:", err);
    return res.status(500).json({ error: "Neuspešno generisanje PDF-a", details: String(err) });
  }
});

// ─── Izvoz odgovora forme ────────────────────────────────────────────────
app.post("/api/pdf/forms", async (req, res) => {
  try {
    const { formTitle, questions, responses } = req.body;
    if (!questions || !responses) return res.status(400).json({ error: "questions and responses are required" });
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    drawPageHeaderCompact(doc, pageW, cyrillicToLatin(formTitle || "Odgovori"), `Ukupno odgovora: ${responses.length} | Poslednji: ${responses.length ? formatDateTime(responses[responses.length - 1].submittedAt) : "Nema"}`, `Generisano: ${formatDate(new Date().toISOString())}`);
    const head = [["#", "Datum", ...questions.map(q => cyrillicToLatin(q.label))]];
    const body = responses.map((r, idx) => [String(idx + 1), formatDateTime(r.submittedAt), ...questions.map(q => { let v = r.answers[q.id]; if (Array.isArray(v)) v = v.filter(Boolean).join(", "); return cyrillicToLatin(v != null ? String(v) : ""); })]);
    const colWidths = [8, 28];
    const remaining = pageW - 28 - 24;
    const perQuestion = remaining / questions.length;
    for (let i = 0; i < questions.length; i++) colWidths.push(perQuestion);
    autoTable(doc, {
      startY: 34, head, body, theme: "grid",
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2, overflow: "linebreak" },
      headStyles: tHead, bodyStyles: tBody, alternateRowStyles: tAlt,
      columnStyles: colWidths.reduce((acc, w, i) => { acc[i] = { cellWidth: w }; return acc; }, {}),
      margin: { left: 12, right: 12 }
    });
    drawFooters(doc, `Evidentiraj · ${cyrillicToLatin(formTitle)}`);
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const filename = `${formTitle || "odgovori"}_${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${cyrillicToLatin(filename)}"`);
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error("PDF forms error:", err);
    return res.status(500).json({ error: "Neuspešno generisanje PDF-a", details: String(err) });
  }
});

module.exports = app;

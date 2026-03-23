// api/pdf/scoresheet.js
// Generates a styled landscape PDF for score sheets.

const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable").default;

// CORS middleware function
const setCorsHeaders = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours cache for preflight
};

module.exports = async (req, res) => {
  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    return res.status(200).end();
  }
  
  // Allow only POST requests
  if (req.method !== "POST") {
    setCorsHeaders(res);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, academicYear, columns, rows } = req.body;
    
    if (!name || !columns || !rows) {
      setCorsHeaders(res);
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
    
    // Set CORS and response headers
    setCorsHeaders(res);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error("PDF scoresheet generation error:", err);
    setCorsHeaders(res);
    return res.status(500).json({ error: "Failed to generate PDF", details: String(err) });
  }
};
import { jsPDF } from "jspdf";
import { C, type RGB } from "../core/colors.ts";
import { cyrillicToLatin } from "./text.ts";

// ──────────────────────────────────────────────────────────────────
//  Primitive helpers
// ──────────────────────────────────────────────────────────────────

export function roundRect(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  r: number, fill: RGB,
): void {
  doc.setFillColor(...fill);
  doc.roundedRect(x, y, w, h, r, r, "F");
}

// ──────────────────────────────────────────────────────────────────
//  Page Header
// ──────────────────────────────────────────────────────────────────

export function drawPageHeader(
  doc: jsPDF,
  pageW: number,
  title: string,
  subtitle: string,
  dateLabel: string,
): void {
  const headerH = 24;

  doc.setFillColor(...C.white);
  doc.rect(0, 0, pageW, headerH, "F");

  // Thin border
  doc.setDrawColor(...C.primary200);
  doc.setLineWidth(0.3);
  doc.line(0, headerH, pageW, headerH);

  // Thick teal accent
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

  // Right-aligned date
  doc.setFontSize(7);
  doc.setTextColor(...C.gray400);
  doc.text(cyrillicToLatin(dateLabel), pageW - 12, 10, { align: "right" });
}

// ──────────────────────────────────────────────────────────────────
//  Page Footer (applied to all pages after content is complete)
// ──────────────────────────────────────────────────────────────────

export function drawFooter(doc: jsPDF, footerText: string): void {
  const totalPages = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C.gray200);
    doc.setLineWidth(0.3);
    doc.line(12, pageH - 10, pageW - 12, pageH - 10);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.gray400);
    doc.text(cyrillicToLatin(footerText), 12, pageH - 5);
    doc.text(`Strana ${i} od ${totalPages}`, pageW - 12, pageH - 5, { align: "right" });
  }
}

// ──────────────────────────────────────────────────────────────────
//  KPI Cards row
// ──────────────────────────────────────────────────────────────────

export interface KpiCard {
  label: string;
  value: string;
  color: RGB;
  sub?: string;
}

export function kpiCards(
  doc: jsPDF,
  pageW: number,
  y: number,
  cards: KpiCard[],
): number {
  const margin = 12, gap = 4;
  const n = cards.length;
  const cardW = (pageW - margin * 2 - gap * (n - 1)) / n;
  const cardH = 24;

  cards.forEach((c, i) => {
    const cx = margin + i * (cardW + gap);

    doc.setFillColor(...C.white);
    doc.roundedRect(cx, y, cardW, cardH, 3, 3, "F");
    doc.setDrawColor(...C.gray200);
    doc.setLineWidth(0.4);
    doc.roundedRect(cx, y, cardW, cardH, 3, 3, "S");

    // Color top accent bar
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

    if (c.sub) {
      doc.setFontSize(5);
      doc.setTextColor(...C.gray400);
      doc.text(cyrillicToLatin(c.sub), cx + cardW / 2, y + 22, { align: "center" });
    }
  });

  return y + cardH + 8;
}

// ──────────────────────────────────────────────────────────────────
//  Progress bar with threshold marker
// ──────────────────────────────────────────────────────────────────

export function progressBar(
  doc: jsPDF,
  x: number, y: number, w: number,
  pct: number, required: number,
): void {
  const barH = 6;
  roundRect(doc, x, y, w, barH, 3, C.gray100);

  const fillW = Math.max(2, (w * Math.min(pct, 100)) / 100);
  const fillColor: RGB =
    pct >= required ? C.emerald : pct >= 50 ? C.amber : C.red;
  roundRect(doc, x, y, fillW, barH, 3, fillColor);

  // Threshold marker
  const markerX = x + (w * required) / 100;
  doc.setDrawColor(...C.amber);
  doc.setLineWidth(0.5);
  doc.line(markerX, y - 1.5, markerX, y + barH + 1.5);

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.gray400);
  doc.text("0%", x, y + barH + 3.5);
  doc.setTextColor(...C.amber);
  doc.text(`${required}% (prag)`, markerX, y + barH + 3.5, { align: "center" });
  doc.setTextColor(...C.gray400);
  doc.text("100%", x + w, y + barH + 3.5, { align: "right" });

  if (fillW > 20 && pct > 15) {
    doc.setFontSize(5);
    doc.setTextColor(...C.white);
    doc.text(`${Math.round(pct)}%`, x + fillW - 3, y + barH - 1.5, { align: "right" });
  }
}

// ──────────────────────────────────────────────────────────────────
//  Session attendance bar chart
// ──────────────────────────────────────────────────────────────────

export interface SessionBar {
  sessionNumber: string;
  count: string;
}

export function sessionBars(
  doc: jsPDF,
  pageW: number,
  y: number,
  sessions: SessionBar[],
  total: number,
): number {
  const margin = 19;
  const chartW = pageW - margin * 2;
  const maxH = 28;
  const n = sessions.length;
  if (n === 0) return y;

  const barW = Math.min(12, (chartW - (n - 1) * 2) / n);
  const totalBarsW = n * barW + (n - 1) * 2;
  const startX = margin + (chartW - totalBarsW) / 2;

  doc.setDrawColor(...C.gray200);
  doc.setLineWidth(0.3);
  doc.line(margin, y + maxH, margin + chartW, y + maxH);

  sessions.forEach((s, i) => {
    const p = total > 0 ? parseInt(s.count) / total : 0;
    const barH = Math.max(2, p * maxH);
    const bx = startX + i * (barW + 2);
    const by = y + maxH - barH;
    const color: RGB = p >= 0.7 ? C.emerald : p >= 0.5 ? C.amber : C.primary;
    roundRect(doc, bx, by, barW, barH, 2, color);

    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.gray600);
    doc.text(`T${s.sessionNumber}`, bx + barW / 2, y + maxH + 4, { align: "center" });

    if (barH > 10) {
      doc.setFontSize(4.5);
      doc.setTextColor(...C.white);
      doc.text(`${Math.round(p * 100)}%`, bx + barW / 2, by + barH - 2, { align: "center" });
    }
  });

  return y + maxH + 10;
}

// ──────────────────────────────────────────────────────────────────
//  Section title with teal left-accent bar
// ──────────────────────────────────────────────────────────────────

export function sectionTitle(doc: jsPDF, y: number, text: string): void {
  doc.setFillColor(...C.primary);
  doc.rect(12, y - 2, 3, 6, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.gray800);
  doc.text(cyrillicToLatin(text), 18, y + 2);
}

// ──────────────────────────────────────────────────────────────────
//  Shared autoTable style objects
// ──────────────────────────────────────────────────────────────────

export const tableHeadStyles = {
  fillColor: C.gray50,
  textColor: C.gray700,
  fontStyle: "bold" as const,
  fontSize: 7.5,
  lineColor: C.gray200,
  lineWidth: 0.2,
  halign: "center" as const,
  valign: "middle" as const,
};

export const tableBodyStyles = {
  fontSize: 8,
  textColor: C.gray700,
  lineColor: C.gray100,
  lineWidth: 0.1,
  valign: "middle" as const,
};

export const tableAltRowStyles = {
  fillColor: C.gray50,
};

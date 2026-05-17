import { jsPDF } from "jspdf";
import { C, type RGB } from "../core/colors";
import { cyrillicToLatin } from "./text";

// ──────────────────────────────────────────────────────────────────
//  Primitive helpers
// ──────────────────────────────────────────────────────────────────

export function fillRect(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  fill: RGB,
): void {
  doc.setFillColor(...fill);
  doc.rect(x, y, w, h, "F");
}

export function strokeRect(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  stroke: RGB,
  lineWidth = 0.3,
): void {
  doc.setDrawColor(...stroke);
  doc.setLineWidth(lineWidth);
  doc.rect(x, y, w, h, "S");
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
  const headerH = 22;

  // White background
  fillRect(doc, 0, 0, pageW, headerH, C.white);

  // Left cyan accent bar (3 px wide)
  fillRect(doc, 0, 0, 3, headerH, C.primary);

  // Bottom border line
  doc.setDrawColor(...C.gray200);
  doc.setLineWidth(0.3);
  doc.line(0, headerH, pageW, headerH);

  // Title
  doc.setTextColor(...C.gray900);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(cyrillicToLatin(title), 9, 10);

  // Subtitle
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.gray500);
  doc.text(cyrillicToLatin(subtitle), 9, 17);

  // Right-aligned date
  doc.setFontSize(7);
  doc.setTextColor(...C.gray400);
  doc.text(cyrillicToLatin(dateLabel), pageW - 9, 10, { align: "right" });
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
    doc.line(9, pageH - 9, pageW - 9, pageH - 9);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.gray400);
    doc.text(cyrillicToLatin(footerText), 9, pageH - 4);
    doc.text(`${i} / ${totalPages}`, pageW - 9, pageH - 4, { align: "right" });
  }
}

// ──────────────────────────────────────────────────────────────────
//  KPI Cards row — white cards, cyan top-border accent
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
  const margin = 9, gap = 3;
  const n = cards.length;
  const cardW = (pageW - margin * 2 - gap * (n - 1)) / n;
  const cardH = 22;

  cards.forEach((card, i) => {
    const cx = margin + i * (cardW + gap);

    fillRect(doc, cx, y, cardW, cardH, C.white);
    strokeRect(doc, cx, y, cardW, cardH, C.gray200);

    // Top accent line (2 px)
    fillRect(doc, cx, y, cardW, 2, card.color);

    // Value
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...card.color);
    doc.text(cyrillicToLatin(card.value), cx + cardW / 2, y + 12, { align: "center" });

    // Label
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.gray500);
    doc.text(cyrillicToLatin(card.label), cx + cardW / 2, y + 18, { align: "center" });

    if (card.sub) {
      doc.setFontSize(5);
      doc.setTextColor(...C.gray400);
      doc.text(cyrillicToLatin(card.sub), cx + cardW / 2, y + 21, { align: "center" });
    }
  });

  return y + cardH + 6;
}

// ──────────────────────────────────────────────────────────────────
//  Progress bar with threshold marker
// ──────────────────────────────────────────────────────────────────

export function progressBar(
  doc: jsPDF,
  x: number, y: number, w: number,
  pct: number, required: number,
): void {
  const barH = 5;
  fillRect(doc, x, y, w, barH, C.gray100);

  const fillW = Math.max(2, (w * Math.min(pct, 100)) / 100);
  const fillColor: RGB =
    pct >= required ? C.emerald : pct >= 50 ? C.amber : C.red;
  fillRect(doc, x, y, fillW, barH, fillColor);

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
  const margin = 16;
  const chartW = pageW - margin * 2;
  const maxH = 26;
  const n = sessions.length;
  if (n === 0) return y;

  const barW = Math.min(11, (chartW - (n - 1) * 2) / n);
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
    fillRect(doc, bx, by, barW, barH, color);

    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.gray500);
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
//  Section title — left cyan accent bar (Grid Brutalism style)
// ──────────────────────────────────────────────────────────────────

export function sectionTitle(doc: jsPDF, y: number, text: string): void {
  fillRect(doc, 9, y - 2, 3, 6, C.primary);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.gray800);
  doc.text(cyrillicToLatin(text), 15, y + 2);
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

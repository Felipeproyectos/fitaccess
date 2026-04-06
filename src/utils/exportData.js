import { jsPDF } from "jspdf";

// Brand colors (matching app palette)
const C = {
  primary:   [255, 59,  59],   // --primary (red)
  accent:    [255, 122,  0],   // --accent (orange)
  dark:      [18,  18,  18],   // background
  card:      [26,  26,  26],   // card
  header:    [30,  30,  30],   // table header bg
  rowAlt:    [246, 246, 246],  // alternating row
  white:     [255, 255, 255],
  mutedText: [140, 140, 140],
  bodyText:  [30,  30,  30],
};

// ---- CSV ----
export function exportCSV(filename, headers, rows) {
  const lines = [headers.join(",")];
  rows.forEach(row => {
    lines.push(row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
  });
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ---- PDF ----
export async function exportPDF(filename, title, headers, rows, gymData = {}) {
  const isLandscape = headers.length > 5;
  const doc = new jsPDF({ orientation: isLandscape ? "landscape" : "portrait", unit: "mm" });

  const PW = doc.internal.pageSize.width;
  const PH = doc.internal.pageSize.height;
  const ML = 14; // margin left
  const MR = 14; // margin right
  const contentW = PW - ML - MR;

  // ─── HEADER BAND ───────────────────────────────────────────
  // Dark background band
  doc.setFillColor(...C.dark);
  doc.rect(0, 0, PW, 28, "F");

  // Red accent left stripe
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, 4, 28, "F");

  // Logo (if available)
  let logoEndX = ML + 6;
  if (gymData.logo_url) {
    try {
      const logoImg = await loadImageAsDataURL(gymData.logo_url);
      doc.addImage(logoImg, "JPEG", ML + 6, 5, 18, 18);
      logoEndX = ML + 6 + 18 + 4;
    } catch (_) {
      logoEndX = ML + 6;
    }
  }

  // Gym name in header
  const gymName = gymData.name || "FitAccess";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C.mutedText);
  doc.text(gymName.toUpperCase(), logoEndX + 2, 11);

  // Report title
  doc.setFontSize(15);
  doc.setTextColor(...C.white);
  doc.text(title, logoEndX + 2, 21);

  // Date top-right
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.mutedText);
  const dateStr = new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });
  doc.text(dateStr, PW - MR, 11, { align: "right" });

  // Record count
  doc.setFontSize(8);
  doc.text(`${rows.length} registro${rows.length !== 1 ? "s" : ""}`, PW - MR, 18, { align: "right" });

  // ─── TABLE ─────────────────────────────────────────────────
  const tableTop = 36;
  const rowH = 8;
  const colW = contentW / headers.length;

  // Table header row
  doc.setFillColor(...C.header);
  doc.rect(ML, tableTop, contentW, rowH + 1, "F");

  // Red left accent on table header
  doc.setFillColor(...C.primary);
  doc.rect(ML, tableTop, 1.5, rowH + 1, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.white);
  headers.forEach((h, i) => {
    doc.text(String(h).toUpperCase(), ML + 1.5 + i * colW + 3, tableTop + 5.5);
  });

  // Separator line below header
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(0.4);
  doc.line(ML, tableTop + rowH + 1, ML + contentW, tableTop + rowH + 1);

  // Data rows
  let y = tableTop + rowH + 2;
  rows.forEach((row, ri) => {
    if (y + rowH > PH - 20) {
      drawFooter(doc, PW, PH, ML, MR, gymData);
      doc.addPage();
      drawPageHeader(doc, PW, ML, MR, contentW, gymData, title, headers, rowH, colW);
      y = tableTop + rowH + 2;
    }

    if (ri % 2 === 0) {
      doc.setFillColor(...C.rowAlt);
      doc.rect(ML, y, contentW, rowH, "F");
    }

    // Subtle left border on even rows
    if (ri % 2 === 0) {
      doc.setFillColor(220, 220, 220);
      doc.rect(ML, y, 0.5, rowH, "F");
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.bodyText);
    row.forEach((cell, i) => {
      const text = doc.splitTextToSize(String(cell ?? ""), colW - 5);
      doc.text(text[0], ML + i * colW + 3, y + 5.3);
    });

    // Bottom row divider
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.1);
    doc.line(ML, y + rowH, ML + contentW, y + rowH);

    y += rowH;
  });

  // Outer table border
  doc.setDrawColor(...C.mutedText);
  doc.setLineWidth(0.3);
  doc.rect(ML, tableTop, contentW, y - tableTop, "S");

  // ─── FOOTER ────────────────────────────────────────────────
  drawFooter(doc, PW, PH, ML, MR, gymData);

  doc.save(filename + ".pdf");
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function drawFooter(doc, PW, PH, ML, MR, gymData) {
  // Footer band
  doc.setFillColor(...C.dark);
  doc.rect(0, PH - 14, PW, 14, "F");
  doc.setFillColor(...C.primary);
  doc.rect(0, PH - 14, 4, 14, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...C.mutedText);

  const parts = [];
  if (gymData.name)    parts.push(gymData.name);
  if (gymData.address) parts.push(gymData.address);
  if (gymData.phone)   parts.push(`Tel: ${gymData.phone}`);
  if (gymData.email)   parts.push(gymData.email);

  doc.text(parts.join("  ·  ") || "FitAccess", ML + 6, PH - 7.5);

  // Page number right
  doc.setTextColor(180, 180, 180);
  doc.text(`Pág. ${doc.internal.getCurrentPageInfo().pageNumber}`, PW - MR, PH - 7.5, { align: "right" });

  // Powered by
  doc.setFontSize(6);
  doc.setTextColor(...C.mutedText);
  doc.text("Sistema creado por Soluciones FML", PW / 2, PH - 3, { align: "center" });
}

function drawPageHeader(doc, PW, ML, MR, contentW, gymData, title, headers, rowH, colW) {
  // Repeat compact header on continuation pages
  const tableTop = 16;
  doc.setFillColor(...C.dark);
  doc.rect(0, 0, PW, 12, "F");
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, 4, 12, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C.white);
  doc.text(title, ML + 6, 7.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...C.mutedText);
  doc.text("(continuación)", PW - MR, 7.5, { align: "right" });

  doc.setFillColor(...C.header);
  doc.rect(ML, tableTop, contentW, rowH + 1, "F");
  doc.setFillColor(...C.primary);
  doc.rect(ML, tableTop, 1.5, rowH + 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.white);
  headers.forEach((h, i) => {
    doc.text(String(h).toUpperCase(), ML + 1.5 + i * colW + 3, tableTop + 5.5);
  });
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(0.4);
  doc.line(ML, tableTop + rowH + 1, ML + contentW, tableTop + rowH + 1);
}

function loadImageAsDataURL(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg"));
    };
    img.onerror = reject;
    img.src = url;
  });
}
import { jsPDF } from "jspdf";

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
export function exportPDF(filename, title, headers, rows) {
  const doc = new jsPDF({ orientation: rows[0]?.length > 5 ? "landscape" : "portrait" });
  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generado: ${new Date().toLocaleString("es-CL")}`, 14, 25);
  doc.setTextColor(0);

  const colW = (doc.internal.pageSize.width - 28) / headers.length;
  let y = 34;

  // Header row
  doc.setFillColor(40, 40, 40);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  headers.forEach((h, i) => {
    doc.rect(14 + i * colW, y, colW, 8, "F");
    doc.text(String(h), 14 + i * colW + 2, y + 5.5);
  });
  y += 10;

  // Data rows
  doc.setTextColor(0);
  rows.forEach((row, ri) => {
    if (y > doc.internal.pageSize.height - 20) {
      doc.addPage();
      y = 20;
    }
    if (ri % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      headers.forEach((_, i) => doc.rect(14 + i * colW, y - 1, colW, 8, "F"));
    }
    doc.setFontSize(8);
    row.forEach((cell, i) => {
      const text = doc.splitTextToSize(String(cell ?? ""), colW - 3);
      doc.text(text[0], 14 + i * colW + 2, y + 4.5);
    });
    y += 8;
  });

  doc.save(filename + ".pdf");
}
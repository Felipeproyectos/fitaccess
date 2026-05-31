import { useState } from "react";
import { X, Download, Printer, FileText, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportPDF, exportXLSX } from "@/utils/exportData";

export default function ReportPreviewModal({ data, gym, onClose }) {
  const { title, filename, headers, rows } = data;
  const [exporting, setExporting] = useState(null);

  async function handleExport(fmt) {
    setExporting(fmt);
    try {
      if (fmt === "pdf") {
        await exportPDF(filename, title, headers, rows, gym || {});
      } else {
        exportXLSX(filename, headers, rows);
      }
    } finally {
      setExporting(null);
    }
  }

  function handlePrint() {
    const printWindow = window.open("", "_blank");
    const html = `
      <!DOCTYPE html>
      <html><head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #222; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          .meta { font-size: 12px; color: #888; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #222; color: #fff; padding: 6px 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
          td { padding: 5px 8px; border-bottom: 1px solid #eee; }
          tr:nth-child(even) { background: #f7f7f7; }
          tr:last-child td { font-weight: bold; border-top: 2px solid #222; }
          @media print { body { margin: 10px; } }
        </style>
      </head><body>
        <h1>${title}</h1>
        <div class="meta">${rows.length} registros · ${new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" })}</div>
        <table>
          <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
          <tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell ?? ""}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>
      </body></html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 300);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{rows.length} registros</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </Button>
            <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90" disabled={!!exporting}
              onClick={() => handleExport("pdf")}>
              <FileText className="w-3.5 h-3.5" /> PDF
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" disabled={!!exporting}
              onClick={() => handleExport("xlsx")}>
              <Table className="w-3.5 h-3.5" /> Excel
            </Button>
            <Button size="icon" variant="ghost" className="w-8 h-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1 p-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0">
              <tr className="bg-background">
                {headers.map((h, i) => (
                  <th key={i} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap border-b border-border">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr><td colSpan={headers.length} className="text-center py-10 text-muted-foreground">Sin datos para mostrar</td></tr>
              ) : rows.map((row, ri) => (
                <tr key={ri} className="hover:bg-white/5 transition-colors">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-white whitespace-nowrap text-xs">
                      {cell ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
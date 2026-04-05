import { useState, useRef, useEffect } from "react";
import { Download, FileText, Table } from "lucide-react";
import { exportCSV, exportPDF } from "@/utils/exportData";

/**
 * options: [{ label, headers, rows, filename }]
 */
export default function ExportMenu({ options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-sm text-muted-foreground hover:text-white hover:border-white/20 transition-colors"
      >
        <Download className="w-4 h-4" />
        Exportar
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-card border border-border rounded-xl shadow-xl z-50 py-2 overflow-hidden">
          {options.map((opt, i) => (
            <div key={i}>
              {i > 0 && options[i - 1].label !== opt.label && (
                <div className="h-px bg-border my-1 mx-3" />
              )}
              <p className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{opt.label}</p>
              <button
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white hover:bg-white/5 transition-colors"
                onClick={() => { exportPDF(opt.filename, opt.label, opt.headers, opt.rows); setOpen(false); }}
              >
                <FileText className="w-4 h-4 text-red-400" /> Descargar PDF
              </button>
              <button
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white hover:bg-white/5 transition-colors"
                onClick={() => { exportCSV(opt.filename, opt.headers, opt.rows); setOpen(false); }}
              >
                <Table className="w-4 h-4 text-green-400" /> Descargar Excel (CSV)
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
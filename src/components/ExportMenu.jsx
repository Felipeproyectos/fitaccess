import { useState, useRef, useEffect } from "react";
import { Download, FileText, FileSpreadsheet, LayoutTemplate } from "lucide-react";
import { exportXLSX, exportXLSXTemplate, exportPDF } from "@/utils/exportData";
import { base44 } from "@/api/base44Client";

/**
 * options: [{ label, headers, rows, filename, templateHeaders? }]
 * If templateHeaders is provided, a "Descargar Plantilla" button is shown.
 */
export default function ExportMenu({ options }) {
  const [open, setOpen] = useState(false);
  const [gymData, setGymData] = useState({});
  const ref = useRef(null);

  useEffect(() => {
    base44.entities.Gym.list("-created_date", 1).then(gyms => {
      if (gyms.length > 0) setGymData(gyms[0]);
    }).catch(() => {});
  }, []);

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
        <div className="absolute right-0 top-full mt-1 w-68 bg-card border border-border rounded-xl shadow-xl z-50 py-2 overflow-hidden" style={{minWidth: "260px"}}>
          {options.map((opt, i) => (
            <div key={i}>
              {i > 0 && <div className="h-px bg-border my-1 mx-3" />}
              <p className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{opt.label}</p>
              <button
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white hover:bg-white/5 transition-colors"
                onClick={() => { exportPDF(opt.filename, opt.label, opt.headers, opt.rows, gymData); setOpen(false); }}
              >
                <FileText className="w-4 h-4 text-red-400 shrink-0" /> Descargar PDF
              </button>
              <button
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white hover:bg-white/5 transition-colors"
                onClick={() => { exportXLSX(opt.filename, opt.headers, opt.rows); setOpen(false); }}
              >
                <FileSpreadsheet className="w-4 h-4 text-green-400 shrink-0" /> Descargar Excel (.xlsx)
              </button>
              {opt.templateHeaders && (
                <button
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white hover:bg-white/5 transition-colors"
                  onClick={() => { exportXLSXTemplate(opt.filename + "_plantilla", opt.templateHeaders); setOpen(false); }}
                >
                  <LayoutTemplate className="w-4 h-4 text-blue-400 shrink-0" /> Descargar Plantilla
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
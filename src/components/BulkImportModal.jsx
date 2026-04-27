import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { X, Download, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

function downloadTemplate() {
  const headers = ["Nombre Completo", "RUT", "Correo", "Numero Telefono", "Notas"];
  const example = ["Juan Perez", "12.345.678-9", "juan@email.com", "+56912345678", "Cliente nuevo"];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  ws["!cols"] = headers.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Clientes");
  XLSX.writeFile(wb, "plantilla_clientes.xlsx");
}

export default function BulkImportModal({ onClose, onImported, gymId }) {
  const [step, setStep] = useState("upload");
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();
  const [dragging, setDragging] = useState(false);

  async function processFile(file) {
    setLoading(true);

    // Parse file directly with XLSX
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

    if (rawData.length === 0) {
      setRows([]); setErrors({}); setLoading(false); setStep("preview");
      return;
    }

    // Detect if first row is a header or data
    const firstRow = rawData[0].map(c => String(c).toLowerCase().trim());
    const hasHeader = firstRow.some(c =>
      ["nombre", "name", "rut", "email", "correo", "telefono", "phone"].includes(c)
    );

    const dataRows = hasHeader ? rawData.slice(1) : rawData;
    const headers = hasHeader ? firstRow : null;

    const get = (row, ...names) => {
      if (headers) {
        for (const n of names) {
          const idx = headers.findIndex(h => h.includes(n));
          if (idx !== -1) return String(row[idx] || "").trim();
        }
      }
      return "";
    };

    const normalized = dataRows.map(row => {
      // If no headers or only one column, treat first column as nombre
      if (!headers || headers.length === 1) {
        return {
          nombre: String(row[0] || "").trim(),
          rut: "", email: "", telefono: "", notas: ""
        };
      }
      return {
        nombre: get(row, "nombre", "name") || String(row[0] || "").trim(),
        rut: get(row, "rut"),
        email: get(row, "email", "correo"),
        telefono: get(row, "tel", "phone", "fono", "numero"),
        notas: get(row, "nota", "note", "observ")
      };
    }).filter(r => r.nombre);

    const existingClients = await base44.entities.Client.list("-created_date", 500);
    const existingEmails = new Set(existingClients.map(c => c.email?.toLowerCase()).filter(Boolean));
    const errs = {};
    const emailsSeen = new Set();
    normalized.forEach((row, i) => {
      const rowErrors = [];
      if (!row.nombre?.trim()) rowErrors.push("Nombre obligatorio");
      if (row.email) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) rowErrors.push("Email invalido");
        else if (existingEmails.has(row.email.toLowerCase())) rowErrors.push("Email ya registrado");
        else if (emailsSeen.has(row.email.toLowerCase())) rowErrors.push("Email duplicado en archivo");
        emailsSeen.add(row.email.toLowerCase());
      }
      if (rowErrors.length) errs[i] = rowErrors;
    });

    setRows(normalized);
    setErrors(errs);
    setLoading(false);
    setStep("preview");
  }

  async function confirmImport() {
    setLoading(true);
    let created = 0;
    const validRows = rows.filter((_, i) => !errors[i]);
    for (const row of validRows) {
      await base44.entities.Client.create({
        name: row.nombre.trim(),
        rut: row.rut?.trim() || undefined,
        email: row.email?.trim() || undefined,
        phone: row.telefono?.trim() || undefined,
        notes: row.notas?.trim() || undefined,
        gym_id: gymId || "default",
        active: true
      });
      created++;
    }
    const failed = Object.keys(errors).length;
    setResult({ created, failed });
    setStep("done");
    setLoading(false);
    if (created > 0) onImported();
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-white">Carga Masiva de Clientes</h2>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-5">
          {step === "upload" && (
            <>
              <div className="bg-background border border-border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white text-sm">Paso 1 - Descarga la plantilla</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Columnas: Nombre Completo, RUT, Correo, Numero Telefono, Notas</p>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2 shrink-0">
                  <Download className="w-4 h-4" /> Descargar Plantilla
                </Button>
              </div>

              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${dragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-white font-medium">Arrastra tu archivo aqui o haz clic</p>
                <p className="text-xs text-muted-foreground mt-1">Soporta .xlsx y .csv</p>
                {loading && <p className="text-primary text-sm mt-3 animate-pulse">Procesando archivo...</p>}
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                  onChange={e => e.target.files[0] && processFile(e.target.files[0])} />
              </div>
            </>
          )}

          {step === "preview" && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-white font-medium">
                  {rows.length} filas encontradas
                  {" · "}<span className="text-red-400">{Object.keys(errors).length} con errores</span>
                  {" · "}<span className="text-green-400">{rows.length - Object.keys(errors).length} validas</span>
                </p>
                <Button variant="ghost" size="sm" onClick={() => setStep("upload")} className="text-muted-foreground">
                  Volver
                </Button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-background">
                    <tr>
                      {["Nombre", "RUT", "Correo", "Telefono", "Notas", "Estado"].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className={`border-t border-border ${errors[i] ? "bg-red-500/5" : ""}`}>
                        <td className="px-3 py-2 text-white">{r.nombre}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.rut}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.email}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.telefono}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.notas}</td>
                        <td className="px-3 py-2">
                          {errors[i]
                            ? <span className="text-red-400 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors[i].join(", ")}</span>
                            : <span className="text-green-400 text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" />OK</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                onClick={confirmImport}
                disabled={loading || rows.length - Object.keys(errors).length === 0}
                className="w-full bg-primary hover:bg-primary/90 text-white"
              >
                {loading ? "Importando..." : `Confirmar Importacion (${rows.length - Object.keys(errors).length} clientes)`}
              </Button>
            </>
          )}

          {step === "done" && (
            <div className="text-center py-8 space-y-4">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
              <h3 className="text-xl font-bold text-white">Importacion completada!</h3>
              <p className="text-green-400 font-medium">{result.created} clientes creados exitosamente</p>
              {result.failed > 0 && <p className="text-red-400">{result.failed} filas omitidas por errores</p>}
              <Button onClick={onClose} className="mt-4">Cerrar</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export default function Attendance() {
  const [attendances, setAttendances] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => { loadAttendances(); }, [dateFilter]);

  async function loadAttendances() {
    setLoading(true);
    const data = dateFilter
      ? await base44.entities.Attendance.filter({ date: dateFilter }, "-created_date", 200)
      : await base44.entities.Attendance.list("-created_date", 200);
    setAttendances(data);
    setLoading(false);
  }

  const filtered = attendances.filter(a =>
    a.client_name?.toLowerCase().includes(search.toLowerCase())
  );

  const resultConfig = {
    success: { label: "✅ Exitosa", cls: "bg-green-400/20 text-green-400" },
    expiring: { label: "⚠️ Por vencer", cls: "bg-orange-400/20 text-orange-400" },
    expired: { label: "❌ Vencida", cls: "bg-red-400/20 text-red-400" },
    invalid: { label: "🚫 Inválido", cls: "bg-red-400/20 text-red-400" },
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Historial de Asistencias</h1>
        <p className="text-muted-foreground mt-1">{filtered.length} registros</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-card border-border text-white placeholder:text-muted-foreground" />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            className="pl-10 bg-card border-border text-white w-48" />
        </div>
        <button onClick={() => setDateFilter("")} className="px-4 py-2 rounded-lg text-sm text-muted-foreground bg-card hover:text-white transition-colors">
          Ver Todo
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 rounded-xl bg-card animate-pulse" />)}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Cliente</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Fecha</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Accesos Rest.</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr key={a.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                  <td className="px-5 py-3 text-sm font-medium text-white">{a.client_name}</td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">
                   {a.created_date ? new Date(a.created_date).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }) : a.date}
                  </td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">
                    {a.remaining_accesses !== null && a.remaining_accesses !== undefined ? a.remaining_accesses : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${resultConfig[a.scan_result]?.cls || "bg-muted text-muted-foreground"}`}>
                      {resultConfig[a.scan_result]?.label || a.scan_result}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="text-center py-12 text-muted-foreground">No hay asistencias registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
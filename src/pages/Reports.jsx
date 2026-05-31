import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Calendar, Users, Download, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toTitleCase } from "@/utils";
import { exportPDF, exportXLSX } from "@/utils/exportData";

export default function Reports() {
  const [gym, setGym] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(null); // stores which report is loading e.g. "daily-pdf"
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientSearch, setClientSearch] = useState("");

  useEffect(() => {
    Promise.all([
      base44.entities.Gym.list("-created_date", 1),
      base44.entities.Client.list("name", 500),
    ]).then(([g, c]) => {
      if (g.length > 0) setGym(g[0]);
      setClients(c.filter(cl => cl.active !== false));
    });
  }, []);

  async function fetchReportData() {
    const [attendance, memberships] = await Promise.all([
      base44.entities.Attendance.list("-date", 5000),
      base44.entities.Membership.list("-created_date", 500),
    ]);
    return { attendance, clients, memberships };
  }

  function filterByDateRange(records, dateField = "date") {
    return records.filter(r => {
      const d = r[dateField];
      if (!d) return false;
      return d >= dateFrom && d <= dateTo;
    });
  }

  async function generateReport(type, formatType) {
    const key = `${type}-${formatType}`;
    setLoading(key);
    try {
      const { attendance, clients: clientsList, memberships } = await fetchReportData();
      const filtered = filterByDateRange(attendance);
      const clientMap = {};
      clientsList.forEach(c => { clientMap[c.id] = c; });
      const memMap = {};
      memberships.forEach(m => { memMap[m.id] = m; });

      if (type === "daily") {
        generateDailyReport(filtered, clientMap, memMap, formatType);
      } else if (type === "by_client") {
        const clientFiltered = selectedClientId
          ? filtered.filter(r => r.client_id === selectedClientId)
          : filtered;
        generateByClientReport(clientFiltered, clientMap, memMap, formatType);
      }
    } finally {
      setLoading(null);
    }
  }

  function generateDailyReport(records, clientMap, memMap, formatType) {
    const byDay = {};
    records.forEach(r => {
      const day = r.date?.split("T")[0] || r.date;
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(r);
    });

    const sortedDays = Object.keys(byDay).sort((a, b) => b.localeCompare(a));
    const headers = ["Fecha", "Cliente", "Plan", "Resultado", "Accesos Restantes", "Hora"];
    const rows = [];

    sortedDays.forEach(day => {
      const dayRecords = byDay[day].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      dayRecords.forEach(r => {
        const client = clientMap[r.client_id];
        const mem = memMap[r.membership_id];
        const resultLabel = { success: "✓ Válido", expiring: "⚠ Por vencer", expired: "✕ Expirado", invalid: "✕ Inválido" }[r.scan_result] || r.scan_result;
        const time = r.date?.includes("T") ? r.date.split("T")[1]?.slice(0, 5) : "—";
        rows.push([
          day,
          toTitleCase(client?.name || r.client_name || "—"),
          mem?.plan_name || "—",
          resultLabel,
          r.remaining_accesses ?? "—",
          time
        ]);
      });
    });

    const title = `Asistencia Diaria — ${dateFrom} al ${dateTo}`;
    const filename = `asistencia_diaria_${dateFrom}_${dateTo}`;

    if (formatType === "pdf") {
      exportPDF(filename, title, headers, rows, gym || {});
    } else {
      exportXLSX(filename, headers, rows);
    }
  }

  function generateByClientReport(records, clientMap, memMap, formatType) {
    const selectedClient = selectedClientId ? clientMap[selectedClientId] : null;

    if (selectedClientId) {
      // Detailed report for a single client
      const sorted = records.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      const headers = ["Fecha", "Hora", "Plan", "Resultado", "Accesos Restantes"];
      const rows = sorted.map(r => {
        const mem = memMap[r.membership_id];
        const resultLabel = { success: "✓ Válido", expiring: "⚠ Por vencer", expired: "✕ Expirado", invalid: "✕ Inválido" }[r.scan_result] || r.scan_result;
        const day = r.date?.split("T")[0] || r.date;
        const time = r.date?.includes("T") ? r.date.split("T")[1]?.slice(0, 5) : "—";
        return [day, time, mem?.plan_name || "—", resultLabel, r.remaining_accesses ?? "—"];
      });

      const clientName = toTitleCase(selectedClient?.name || "Cliente");
      const title = `Asistencia de ${clientName} — ${dateFrom} al ${dateTo}`;
      const filename = `asistencia_${clientName.replace(/\s+/g, "_")}_${dateFrom}_${dateTo}`;

      if (formatType === "pdf") {
        exportPDF(filename, title, headers, rows, gym || {});
      } else {
        exportXLSX(filename, headers, rows);
      }
    } else {
      // Summary report for all clients
      const byClient = {};
      records.forEach(r => {
        const cid = r.client_id;
        if (!byClient[cid]) byClient[cid] = [];
        byClient[cid].push(r);
      });

      const headers = ["Cliente", "Total Asistencias", "Última Asistencia", "Plan Actual", "Estado", "Detalle Fechas"];
      const rows = [];

      Object.entries(byClient)
        .sort((a, b) => b[1].length - a[1].length)
        .forEach(([cid, recs]) => {
          const client = clientMap[cid];
          const sorted = recs.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
          const lastDate = sorted[0]?.date?.split("T")[0] || "—";
          const mem = Object.values(memMap).find(m => m.client_id === cid && (m.status === "active" || m.status === "expiring"));
          const statusLabel = mem ? (mem.status === "active" ? "Activa" : "Por Vencer") : "Sin membresía";
          const dates = sorted.map(r => r.date?.split("T")[0]).filter(Boolean);
          const uniqueDates = [...new Set(dates)].slice(0, 10).join(", ");

          rows.push([
            toTitleCase(client?.name || "—"),
            recs.length,
            lastDate,
            mem?.plan_name || "—",
            statusLabel,
            uniqueDates + (dates.length > 10 ? "..." : "")
          ]);
        });

      const title = `Asistencia por Cliente — ${dateFrom} al ${dateTo}`;
      const filename = `asistencia_por_cliente_${dateFrom}_${dateTo}`;

      if (formatType === "pdf") {
        exportPDF(filename, title, headers, rows, gym || {});
      } else {
        exportXLSX(filename, headers, rows);
      }
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Informes</h1>
        <p className="text-muted-foreground mt-1">Genera reportes detallados en PDF o Excel</p>
      </div>

      {/* Date Range */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-sm font-medium text-white mb-3">Rango de Fechas</p>
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Desde</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="bg-background border-border text-white w-44" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Hasta</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="bg-background border-border text-white w-44" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              setDateFrom(format(startOfMonth(new Date()), "yyyy-MM-dd"));
              setDateTo(format(endOfMonth(new Date()), "yyyy-MM-dd"));
            }}>Este Mes</Button>
            <Button variant="outline" size="sm" onClick={() => {
              const prev = new Date(); prev.setMonth(prev.getMonth() - 1);
              setDateFrom(format(startOfMonth(prev), "yyyy-MM-dd"));
              setDateTo(format(endOfMonth(prev), "yyyy-MM-dd"));
            }}>Mes Anterior</Button>
          </div>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Asistencia Diaria */}
        <ReportCard
          report={{ id: "daily", title: "Asistencia Diaria", description: "Detalle de asistencias día a día con hora, cliente, plan y resultado del escaneo", icon: Calendar }}
          loading={loading}
          onGenerate={(fmt) => generateReport("daily", fmt)}
        />

        {/* Asistencia por Cliente */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 hover:border-primary/40 transition-colors">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Asistencia por Cliente</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedClientId
                  ? "Informe detallado del cliente seleccionado"
                  : "Resumen de todos los clientes — o selecciona uno para ver su detalle"}
              </p>
            </div>
          </div>

          {/* Client selector */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Cliente (opcional — vacío = todos)</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={clientSearch}
                onChange={e => { setClientSearch(e.target.value); setSelectedClientId(""); }}
                className="pl-9 bg-background border-border text-white text-sm"
              />
            </div>
            {clientSearch && !selectedClientId && (
              <div className="bg-background border border-border rounded-lg max-h-40 overflow-y-auto">
                {clients
                  .filter(c => c.name?.toLowerCase().includes(clientSearch.toLowerCase()))
                  .slice(0, 20)
                  .map(c => (
                    <button key={c.id} onClick={() => { setSelectedClientId(c.id); setClientSearch(toTitleCase(c.name)); }}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors">
                      {toTitleCase(c.name)}
                    </button>
                  ))}
                {clients.filter(c => c.name?.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</p>
                )}
              </div>
            )}
            {selectedClientId && (
              <button onClick={() => { setSelectedClientId(""); setClientSearch(""); }}
                className="text-xs text-primary hover:underline">
                ✕ Limpiar selección (ver todos)
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90 gap-1.5"
              disabled={!!loading} onClick={() => generateReport("by_client", "pdf")}>
              {loading === "by_client-pdf" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              PDF
            </Button>
            <Button size="sm" variant="outline" className="flex-1 gap-1.5"
              disabled={!!loading} onClick={() => generateReport("by_client", "xlsx")}>
              {loading === "by_client-xlsx" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Excel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportCard({ report, loading, onGenerate }) {
  const Icon = report.icon;
  const id = report.id;
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4 hover:border-primary/40 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-white">{report.title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90 gap-1.5"
          disabled={!!loading} onClick={() => onGenerate("pdf")}>
          {loading === `${id}-pdf` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          PDF
        </Button>
        <Button size="sm" variant="outline" className="flex-1 gap-1.5"
          disabled={!!loading} onClick={() => onGenerate("xlsx")}>
          {loading === `${id}-xlsx` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Excel
        </Button>
      </div>
    </div>
  );
}
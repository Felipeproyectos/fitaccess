import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Calendar, Users, Download, Loader2, Search, CreditCard, ClipboardList, DollarSign, AlertTriangle, Clock, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toTitleCase } from "@/utils";
import {
  generateDailyReport,
  generateByClientReport,
  generateMembershipsReport,
  generatePaymentsReport,
  generateClientsReport,
  generateIncomeByMethodReport,
  generateExpiringReport,
  generatePendingPaymentsReport,
} from "@/utils/reportGenerators";

export default function Reports() {
  const [gym, setGym] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(null);
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
      setClients(c);
    });
  }, []);

  function filterByDateRange(records, dateField = "date") {
    return records.filter(r => {
      const d = r[dateField];
      if (!d) return false;
      return d >= dateFrom && d <= dateTo;
    });
  }

  async function handleGenerate(type, fmt) {
    const key = `${type}-${fmt}`;
    setLoading(key);
    try {
      const [attendance, memberships, payments] = await Promise.all([
        base44.entities.Attendance.list("-date", 5000),
        base44.entities.Membership.list("-created_date", 500),
        base44.entities.Payment.list("-created_date", 2000),
      ]);

      const clientMap = {};
      clients.forEach(c => { clientMap[c.id] = c; });
      const memMap = {};
      memberships.forEach(m => { memMap[m.id] = m; });

      const filteredAtt = filterByDateRange(attendance);
      const filteredPay = filterByDateRange(payments);
      const filteredMem = filterByDateRange(memberships, "start_date");

      switch (type) {
        case "daily":
          generateDailyReport(filteredAtt, clientMap, memMap, gym, dateFrom, dateTo, fmt);
          break;
        case "by_client": {
          const data = selectedClientId ? filteredAtt.filter(r => r.client_id === selectedClientId) : filteredAtt;
          generateByClientReport(data, clientMap, memMap, gym, dateFrom, dateTo, fmt, selectedClientId);
          break;
        }
        case "memberships":
          generateMembershipsReport(filteredMem, clientMap, gym, dateFrom, dateTo, fmt);
          break;
        case "payments":
          generatePaymentsReport(filteredPay, clientMap, gym, dateFrom, dateTo, fmt);
          break;
        case "clients":
          generateClientsReport(clients, memberships, payments, gym, fmt);
          break;
        case "income_method":
          generateIncomeByMethodReport(filteredPay, gym, dateFrom, dateTo, fmt);
          break;
        case "expiring":
          generateExpiringReport(memberships, clientMap, gym, fmt);
          break;
        case "pending_payments":
          generatePendingPaymentsReport(payments, clientMap, gym, fmt);
          break;
      }
    } finally {
      setLoading(null);
    }
  }

  const simpleReports = [
    { id: "daily", title: "Asistencia Diaria", description: "Detalle día a día con hora, cliente, plan y resultado", icon: Calendar, color: "text-green-400", bg: "bg-green-400/10" },
    { id: "memberships", title: "Membresías", description: "Todas las membresías creadas en el rango de fechas con estado y detalles", icon: ClipboardList, color: "text-blue-400", bg: "bg-blue-400/10" },
    { id: "payments", title: "Pagos", description: "Listado de pagos realizados con montos, método y confirmación", icon: CreditCard, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { id: "income_method", title: "Ingresos por Método", description: "Resumen de ingresos confirmados agrupados por método de pago", icon: DollarSign, color: "text-yellow-400", bg: "bg-yellow-400/10" },
    { id: "expiring", title: "Membresías Vencidas", description: "Membresías expiradas y por vencer — no usa rango de fechas", icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-400/10" },
    { id: "pending_payments", title: "Pagos Pendientes", description: "Pagos sin confirmar — no usa rango de fechas", icon: Clock, color: "text-red-400", bg: "bg-red-400/10" },
    { id: "clients", title: "Clientes Completo", description: "Listado de todos los clientes con membresía, último pago y contacto", icon: UserCheck, color: "text-purple-400", bg: "bg-purple-400/10" },
  ];

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

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Asistencia por Cliente (custom card with selector) */}
        <ClientReportCard
          loading={loading}
          clients={clients}
          clientSearch={clientSearch}
          setClientSearch={setClientSearch}
          selectedClientId={selectedClientId}
          setSelectedClientId={setSelectedClientId}
          onGenerate={(fmt) => handleGenerate("by_client", fmt)}
        />

        {/* Simple report cards */}
        {simpleReports.map(r => (
          <ReportCard key={r.id} report={r} loading={loading}
            onGenerate={(fmt) => handleGenerate(r.id, fmt)} />
        ))}
      </div>
    </div>
  );
}

function ReportCard({ report, loading, onGenerate }) {
  const Icon = report.icon;
  const id = report.id;
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-primary/40 transition-colors">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${report.bg || "bg-primary/20"} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${report.color || "text-primary"}`} />
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

function ClientReportCard({ loading, clients, clientSearch, setClientSearch, selectedClientId, setSelectedClientId, onGenerate }) {
  const activeClients = clients.filter(c => c.active !== false);
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-primary/40 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Asistencia por Cliente</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {selectedClientId ? "Informe detallado del cliente seleccionado" : "Resumen de todos — o selecciona uno"}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Cliente (opcional)</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." value={clientSearch}
            onChange={e => { setClientSearch(e.target.value); setSelectedClientId(""); }}
            className="pl-9 bg-background border-border text-white text-sm" />
        </div>
        {clientSearch && !selectedClientId && (
          <div className="bg-background border border-border rounded-lg max-h-40 overflow-y-auto">
            {activeClients.filter(c => c.name?.toLowerCase().includes(clientSearch.toLowerCase())).slice(0, 20).map(c => (
              <button key={c.id} onClick={() => { setSelectedClientId(c.id); setClientSearch(toTitleCase(c.name)); }}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors">
                {toTitleCase(c.name)}
              </button>
            ))}
            {activeClients.filter(c => c.name?.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</p>
            )}
          </div>
        )}
        {selectedClientId && (
          <button onClick={() => { setSelectedClientId(""); setClientSearch(""); }}
            className="text-xs text-primary hover:underline">✕ Limpiar selección</button>
        )}
      </div>

      <div className="flex gap-2">
        <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90 gap-1.5"
          disabled={!!loading} onClick={() => onGenerate("pdf")}>
          {loading === "by_client-pdf" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          PDF
        </Button>
        <Button size="sm" variant="outline" className="flex-1 gap-1.5"
          disabled={!!loading} onClick={() => onGenerate("xlsx")}>
          {loading === "by_client-xlsx" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Excel
        </Button>
      </div>
    </div>
  );
}
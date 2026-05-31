import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Calendar, Users, Search, CreditCard, ClipboardList, DollarSign, AlertTriangle, Clock, UserCheck, Eye, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toTitleCase } from "@/utils";
import DateRangePicker from "@/components/reports/DateRangePicker";
import ReportPreviewModal from "@/components/reports/ReportPreviewModal";
import {
  buildDailyReport,
  buildByClientReport,
  buildMembershipsReport,
  buildPaymentsReport,
  buildClientsReport,
  buildIncomeByMethodReport,
  buildExpiringReport,
  buildPendingPaymentsReport,
} from "@/utils/reportGenerators";

export default function Reports() {
  const [gym, setGym] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(null);
  const [preview, setPreview] = useState(null); // { title, filename, headers, rows }

  useEffect(() => {
    Promise.all([
      base44.entities.Gym.list("-created_date", 1),
      base44.entities.Client.list("name", 500),
    ]).then(([g, c]) => {
      if (g.length > 0) setGym(g[0]);
      setClients(c);
    });
  }, []);

  async function fetchAllData() {
    const [attendance, memberships, payments] = await Promise.all([
      base44.entities.Attendance.list("-date", 5000),
      base44.entities.Membership.list("-created_date", 500),
      base44.entities.Payment.list("-created_date", 2000),
    ]);
    const clientMap = {};
    clients.forEach(c => { clientMap[c.id] = c; });
    const memMap = {};
    memberships.forEach(m => { memMap[m.id] = m; });
    return { attendance, memberships, payments, clientMap, memMap };
  }

  function filterByRange(records, from, to, field = "date") {
    return records.filter(r => {
      const d = r[field];
      return d && d >= from && d <= to;
    });
  }

  async function handlePreview(type, dateFrom, dateTo, extra = {}) {
    setLoading(type);
    try {
      const { attendance, memberships, payments, clientMap, memMap } = await fetchAllData();
      let result;
      switch (type) {
        case "daily":
          result = buildDailyReport(filterByRange(attendance, dateFrom, dateTo), clientMap, memMap, dateFrom, dateTo);
          break;
        case "by_client": {
          const filtered = filterByRange(attendance, dateFrom, dateTo);
          const data = extra.clientId ? filtered.filter(r => r.client_id === extra.clientId) : filtered;
          result = buildByClientReport(data, clientMap, memMap, dateFrom, dateTo, extra.clientId);
          break;
        }
        case "memberships":
          result = buildMembershipsReport(filterByRange(memberships, dateFrom, dateTo, "start_date"), clientMap, dateFrom, dateTo);
          break;
        case "payments":
          result = buildPaymentsReport(filterByRange(payments, dateFrom, dateTo), clientMap, dateFrom, dateTo);
          break;
        case "income_method":
          result = buildIncomeByMethodReport(filterByRange(payments, dateFrom, dateTo), dateFrom, dateTo);
          break;
        case "clients":
          result = buildClientsReport(clients, memberships, payments);
          break;
        case "expiring":
          result = buildExpiringReport(memberships, clientMap);
          break;
        case "pending_payments":
          result = buildPendingPaymentsReport(payments, clientMap);
          break;
      }
      if (result) setPreview(result);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Informes</h1>
        <p className="text-muted-foreground mt-1">Previsualiza y descarga reportes en PDF o Excel</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <DatedReportCard id="daily" title="Asistencia Diaria" description="Detalle día a día con hora, cliente, plan y resultado"
          icon={Calendar} color="text-green-400" bg="bg-green-400/10"
          loading={loading} onPreview={(from, to) => handlePreview("daily", from, to)} />

        <ClientReportCard loading={loading} clients={clients}
          onPreview={(from, to, clientId) => handlePreview("by_client", from, to, { clientId })} />

        <DatedReportCard id="memberships" title="Membresías" description="Membresías creadas en el rango con estado y detalles"
          icon={ClipboardList} color="text-blue-400" bg="bg-blue-400/10"
          loading={loading} onPreview={(from, to) => handlePreview("memberships", from, to)} />

        <DatedReportCard id="payments" title="Pagos" description="Listado de pagos con montos, método y confirmación"
          icon={CreditCard} color="text-emerald-400" bg="bg-emerald-400/10"
          loading={loading} onPreview={(from, to) => handlePreview("payments", from, to)} />

        <DatedReportCard id="income_method" title="Ingresos por Método" description="Ingresos confirmados agrupados por método de pago"
          icon={DollarSign} color="text-yellow-400" bg="bg-yellow-400/10"
          loading={loading} onPreview={(from, to) => handlePreview("income_method", from, to)} />

        <SimpleReportCard id="expiring" title="Membresías Vencidas" description="Membresías expiradas y por vencer"
          icon={AlertTriangle} color="text-orange-400" bg="bg-orange-400/10"
          loading={loading} onPreview={() => handlePreview("expiring")} />

        <SimpleReportCard id="pending_payments" title="Pagos Pendientes" description="Pagos sin confirmar"
          icon={Clock} color="text-red-400" bg="bg-red-400/10"
          loading={loading} onPreview={() => handlePreview("pending_payments")} />

        <SimpleReportCard id="clients" title="Clientes Completo" description="Todos los clientes con membresía, último pago y contacto"
          icon={UserCheck} color="text-purple-400" bg="bg-purple-400/10"
          loading={loading} onPreview={() => handlePreview("clients")} />
      </div>

      {preview && (
        <ReportPreviewModal data={preview} gym={gym} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}

function PreviewButton({ id, loading, onClick }) {
  return (
    <Button size="sm" className="w-full bg-primary hover:bg-primary/90 gap-1.5" disabled={!!loading} onClick={onClick}>
      {loading === id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
      Previsualizar
    </Button>
  );
}

function DatedReportCard({ id, title, description, icon: Icon, color, bg, loading, onPreview }) {
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4 hover:border-primary/40 transition-colors">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
      <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} />
      <PreviewButton id={id} loading={loading} onClick={() => onPreview(dateFrom, dateTo)} />
    </div>
  );
}

function SimpleReportCard({ id, title, description, icon: Icon, color, bg, loading, onPreview }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-primary/40 transition-colors">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
      <PreviewButton id={id} loading={loading} onClick={onPreview} />
    </div>
  );
}

function ClientReportCard({ loading, clients, onPreview }) {
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const activeClients = clients.filter(c => c.active !== false);

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4 hover:border-primary/40 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Asistencia por Cliente</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {selectedClientId ? "Detalle del cliente seleccionado" : "Resumen de todos — o selecciona uno"}
          </p>
        </div>
      </div>

      <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} />

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Cliente (opcional)</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." value={clientSearch}
            onChange={e => { setClientSearch(e.target.value); setSelectedClientId(""); }}
            className="pl-9 bg-background border-border text-white text-sm" />
        </div>
        {clientSearch && !selectedClientId && (
          <div className="bg-background border border-border rounded-lg max-h-32 overflow-y-auto">
            {activeClients.filter(c => c.name?.toLowerCase().includes(clientSearch.toLowerCase())).slice(0, 15).map(c => (
              <button key={c.id} onClick={() => { setSelectedClientId(c.id); setClientSearch(toTitleCase(c.name)); }}
                className="w-full text-left px-3 py-1.5 text-sm text-white hover:bg-white/10 transition-colors">
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

      <PreviewButton id="by_client" loading={loading}
        onClick={() => onPreview(dateFrom, dateTo, selectedClientId)} />
    </div>
  );
}
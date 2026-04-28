import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Activity, AlertTriangle, TrendingUp, Clock, Plus, CreditCard, DollarSign } from "lucide-react";
import { toTitleCase } from "@/utils";
import { format, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ todayAttendance: 0, activeClients: 0, expiringClients: 0, pendingPayments: 0 });
  const [financial, setFinancial] = useState({ monthIncome: 0, totalCollected: 0, pendingAmount: 0 });
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [expiringClients, setExpiringClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const [attendances, memberships, allPayments, allClients] = await Promise.all([
      base44.entities.Attendance.filter({ date: today }, "-created_date", 5),
      base44.entities.Membership.list("-created_date", 200),
      base44.entities.Payment.list("-created_date", 500),
      base44.entities.Client.list("-created_date", 500)
    ]);

    const clientMap = Object.fromEntries(allClients.map(c => [c.id, c]));

    // Count unique clients with active memberships
    const activeMemberships = memberships.filter(m => m.status === "active" || m.status === "expiring");
    const uniqueActiveClientIds = new Set(activeMemberships.map(m => m.client_id));
    const activeClientsCount = uniqueActiveClientIds.size;

    // Get expiring memberships (one per client, prefer earliest expiring)
    const expiringByClient = {};
    memberships.filter(m => m.status === "expiring").forEach(m => {
      if (!expiringByClient[m.client_id] || (m.end_date && expiringByClient[m.client_id].end_date && m.end_date < expiringByClient[m.client_id].end_date)) {
        expiringByClient[m.client_id] = m;
      }
    });
    const expiring = Object.values(expiringByClient);

    const pendingPayments = allPayments.filter(p => !p.confirmed);
    const confirmedPayments = allPayments.filter(p => p.confirmed);
    const monthPayments = confirmedPayments.filter(p => p.date >= monthStart);

    // Enrich expiring memberships with client name
    const expiringEnriched = expiring.map(m => ({
      ...m,
      client_name: clientMap[m.client_id]?.name || "Cliente desconocido"
    }));

    setStats({
      todayAttendance: attendances.length,
      activeClients: activeClientsCount,
      expiringClients: expiring.length,
      pendingPayments: pendingPayments.length
    });
    setFinancial({
      monthIncome: monthPayments.reduce((s, p) => s + (p.amount || 0), 0),
      totalCollected: confirmedPayments.reduce((s, p) => s + (p.amount || 0), 0),
      pendingAmount: pendingPayments.reduce((s, p) => s + (p.amount || 0), 0)
    });
    setRecentAttendance(attendances.slice(0, 5));
    setExpiringClients(expiringEnriched.slice(0, 8));
    setLoading(false);
  }

  const statCards = [
    { label: "Asistencias Hoy", value: stats.todayAttendance, icon: Activity, color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/20" },
    { label: "Clientes Activos", value: stats.activeClients, icon: Users, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
    { label: "Por Vencer", value: stats.expiringClients, icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
    { label: "Pagos Pendientes", value: stats.pendingPayments, icon: TrendingUp, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" },
  ];

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-muted-foreground mt-1">{(() => { const s = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }); return s.charAt(0).toUpperCase() + s.slice(1); })()}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/payments')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 border border-primary/30 text-primary text-sm hover:bg-primary/30 transition-colors">
            <CreditCard className="w-4 h-4" /> Registrar Pago
          </button>
          <button onClick={() => navigate('/clients')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-white text-sm hover:border-primary/40 transition-colors">
            <Plus className="w-4 h-4" /> Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Financial summary */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Ingresos del Mes</p>
            <p className="text-2xl font-bold text-green-400">${financial.monthIncome.toLocaleString('es-CL')}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Recaudado</p>
            <p className="text-2xl font-bold text-white">${financial.totalCollected.toLocaleString('es-CL')}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Pendiente de Cobro</p>
            <p className="text-2xl font-bold text-orange-400">${financial.pendingAmount.toLocaleString('es-CL')}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-xl bg-card animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} p-5 flex flex-col gap-3`}>
              <div className={`w-10 h-10 rounded-lg ${s.bg} border ${s.border} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Asistencias Recientes
          </h2>
          {recentAttendance.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay asistencias hoy.</p>
          ) : (
            <div className="space-y-2">
              {recentAttendance.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-white">{toTitleCase(a.client_name)}</p>
                    <p className="text-xs text-muted-foreground">{a.date}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    a.scan_result === "success" ? "bg-green-400/20 text-green-400" :
                    a.scan_result === "expiring" ? "bg-orange-400/20 text-orange-400" :
                    "bg-red-400/20 text-red-400"
                  }`}>
                    {a.scan_result === "success" ? "✅ OK" : a.scan_result === "expiring" ? "⚠️ Por vencer" : "❌ Vencida"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" /> Clientes Por Vencer
          </h2>
          {expiringClients.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay clientes por vencer.</p>
          ) : (
            <div className="space-y-2">
              {expiringClients.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-white">{toTitleCase(m.client_name)}</p>
                    <p className="text-xs text-muted-foreground">{m.plan_name} · Vence: {m.end_date}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs px-2 py-1 rounded-full bg-orange-400/20 text-orange-400 font-medium">
                      ⚠️ Por vencer
                    </span>
                    {m.remaining_accesses !== undefined && m.remaining_accesses !== null && (
                      <span className="text-xs text-muted-foreground">{m.remaining_accesses} accesos</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
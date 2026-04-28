import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Clock, Plus, Search, TrendingUp, Banknote, ArrowRightLeft, CalendarClock, Trash2 } from "lucide-react";
import ExportMenu from "@/components/ExportMenu";
import { toTitleCase } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PaymentModal from "@/components/PaymentModal";
import ConfirmPaymentModal from "@/components/ConfirmPaymentModal";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";

const MONTH_START = format(startOfMonth(new Date()), "yyyy-MM-dd");
const MONTH_END = format(endOfMonth(new Date()), "yyyy-MM-dd");

function getMembershipStatus(membership) {
  if (!membership) return null;
  return membership.status;
}

function isAdvancePayment(payment) {
  // Un pago es anticipo si la fecha de inicio de membresía es de un mes futuro
  if (!payment.start_date) return false;
  return payment.start_date > MONTH_END;
}

function isFutureMonthStart(startDate) {
  if (!startDate) return false;
  return startDate > MONTH_END;
}

const statusConfig = {
  active:    { label: "Activa",       color: "text-green-400 bg-green-400/10" },
  expiring:  { label: "Por vencer",   color: "text-yellow-400 bg-yellow-400/10" },
  expired:   { label: "Expirada",     color: "text-red-400 bg-red-400/10" },
  pending:   { label: "Pendiente",    color: "text-orange-400 bg-orange-400/10" },
};

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmPayment, setConfirmPayment] = useState(null);
  const [filter, setFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    loadData();
    const unsub1 = base44.entities.Payment.subscribe(() => loadData());
    const unsub2 = base44.entities.Membership.subscribe(() => loadData());
    return () => { unsub1(); unsub2(); };
  }, []);

  async function loadData() {
    setLoading(true);
    const [pays, mems] = await Promise.all([
      base44.entities.Payment.list("-created_date", 200),
      base44.entities.Membership.list("-created_date", 500),
    ]);
    setPayments(pays);
    setMemberships(mems);
    setLoading(false);
  }

  // Enriquecer cada pago con su membresía activa más reciente del cliente
  const enrichedPayments = payments.map(p => {
    const clientMemberships = memberships.filter(m => m.client_id === p.client_id);
    // Buscar membresía que corresponde a este pago (por plan y fecha cercana)
    const linked = clientMemberships.find(m =>
      m.plan_id === p.plan_id || m.plan_name === p.plan_name
    ) || clientMemberships[0] || null;
    return { ...p, _membership: linked };
  });

  const confirmedAll = enrichedPayments.filter(p => p.confirmed);

  // Recaudado del mes: pagos confirmados cuya start_date cae en este mes (no adelantos)
  const monthPayments = confirmedAll.filter(p => {
    const startDate = p.start_date || p.date;
    return startDate && startDate >= MONTH_START && startDate <= MONTH_END;
  });
  const monthIncome = monthPayments.reduce((s, p) => s + (p.amount || 0), 0);

  // Adelantos: pagos confirmados cuya start_date es mes futuro
  const advancePayments = confirmedAll.filter(p => isAdvancePayment(p));
  const advanceIncome = advancePayments.reduce((s, p) => s + (p.amount || 0), 0);

  // Totales por método
  const effectivo = confirmedAll.filter(p => p.payment_method === "Efectivo");
  const transferencia = confirmedAll.filter(p => p.payment_method === "Transferencia");

  const filtered = enrichedPayments.filter(p => {
    const matchSearch = p.client_name?.toLowerCase().includes(search.toLowerCase()) || p.plan_name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || (filter === "pending" && !p.confirmed) || (filter === "confirmed" && p.confirmed);
    const matchMethod = methodFilter === "all" || p.payment_method === methodFilter;
    const matchFrom = !dateFrom || (p.date && p.date >= dateFrom);
    const matchTo = !dateTo || (p.date && p.date <= dateTo);
    return matchSearch && matchFilter && matchMethod && matchFrom && matchTo;
  });

  const payHeaders = ["Cliente", "Plan", "Monto", "Método", "Fecha Pago", "Inicio Membresía", "Estado Membresía", "Estado Pago"];
  const toPayRows = (list) => list.map(p => [
    toTitleCase(p.client_name),
    p.plan_name,
    `$${p.amount?.toLocaleString('es-CL')}`,
    p.payment_method || "",
    p.date ? format(parseISO(p.date), 'dd/MM/yyyy') : "",
    p.start_date ? format(parseISO(p.start_date), 'dd/MM/yyyy') : "",
    p._membership ? (statusConfig[p._membership.status]?.label || p._membership.status) : "—",
    p.confirmed ? "Confirmado" : "Pendiente",
  ]);

  const exportOptions = [
    { label: "Recaudo del mes", filename: `recaudo_mes_${MONTH_START.slice(0,7)}`, headers: payHeaders, rows: toPayRows(monthPayments) },
    { label: "Adelantos (meses futuros)", filename: `adelantos`, headers: payHeaders, rows: toPayRows(advancePayments) },
    { label: "Pagos en Efectivo", filename: `pagos_efectivo`, headers: payHeaders, rows: toPayRows(effectivo) },
    { label: "Pagos por Transferencia", filename: `pagos_transferencia`, headers: payHeaders, rows: toPayRows(transferencia) },
    { label: "Vista actual (filtrada)", filename: `pagos_filtrado`, headers: payHeaders, rows: toPayRows(filtered) },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Pagos</h1>
          <p className="text-muted-foreground mt-1">Gestión de pagos y membresías</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu options={exportOptions} />
          <Button onClick={() => setShowCreate(true)} className="bg-primary hover:bg-primary/90 glow-red text-white gap-2">
            <Plus className="w-4 h-4" /> Nuevo Pago
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Recaudo este mes</p>
          </div>
          <p className="text-2xl font-bold text-green-400">${monthIncome.toLocaleString('es-CL')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{monthPayments.length} pagos confirmados</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CalendarClock className="w-4 h-4 text-blue-400" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Anticipos (próx. meses)</p>
          </div>
          <p className="text-2xl font-bold text-blue-400">${advanceIncome.toLocaleString('es-CL')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{advancePayments.length} pagos adelantados</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Banknote className="w-4 h-4 text-yellow-400" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Efectivo</p>
          </div>
          <p className="text-2xl font-bold text-white">${effectivo.reduce((s,p)=>s+(p.amount||0),0).toLocaleString('es-CL')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{effectivo.length} pagos</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowRightLeft className="w-4 h-4 text-purple-400" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Transferencia</p>
          </div>
          <p className="text-2xl font-bold text-white">${transferencia.reduce((s,p)=>s+(p.amount||0),0).toLocaleString('es-CL')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{transferencia.length} pagos</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-card border-border text-white placeholder:text-muted-foreground" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-card border-border text-white w-40 text-sm" />
          <span className="text-muted-foreground text-sm">—</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-card border-border text-white w-40 text-sm" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-muted-foreground hover:text-white">Limpiar</button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "confirmed"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-primary text-white" : "bg-card text-muted-foreground hover:text-white"}`}>
              {f === "all" ? "Todos" : f === "pending" ? "Pendientes" : "Confirmados"}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "Efectivo", "Transferencia"].map(m => (
            <button key={m} onClick={() => setMethodFilter(m)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${methodFilter === m ? "bg-secondary text-white border border-white/20" : "bg-card text-muted-foreground hover:text-white"}`}>
              {m === "all" ? "Todo método" : m}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-card animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(payment => {
            const isAdvance = payment.confirmed && isAdvancePayment(payment);
            const memStatus = payment._membership ? statusConfig[payment._membership.status] : null;
            return (
              <div key={payment.id}
                className={`bg-card border rounded-xl p-4 flex items-center justify-between hover:border-primary/30 transition-colors ${isAdvance ? "border-blue-500/30" : "border-border"}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${payment.confirmed ? (isAdvance ? "bg-blue-400/20" : "bg-green-400/20") : "bg-orange-400/20"}`}>
                    {payment.confirmed
                      ? isAdvance
                        ? <CalendarClock className="w-5 h-5 text-blue-400" />
                        : <CheckCircle className="w-5 h-5 text-green-400" />
                      : <Clock className="w-5 h-5 text-orange-400" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white">{toTitleCase(payment.client_name)}</p>
                      {isAdvance && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-400/20 text-blue-400 font-medium">
                          Anticipo → {payment.start_date ? format(parseISO(payment.start_date), 'MM/yyyy') : ""}
                        </span>
                      )}
                      {memStatus && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${memStatus.color}`}>
                          {memStatus.label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {payment.plan_name}
                      {payment.payment_method && <span className="ml-1 text-xs opacity-70">· {payment.payment_method}</span>}
                      {payment.date && <span className="ml-1">· {format(parseISO(payment.date), "dd/MM/yyyy")}</span>}
                      {payment.start_date && payment.start_date !== payment.date && (
                        <span className="ml-1 text-xs opacity-60">· Inicio: {format(parseISO(payment.start_date), "dd/MM/yyyy")}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-xl font-bold text-white">${payment.amount?.toLocaleString('es-CL')}</p>
                  {!payment.confirmed && (
                    <Button onClick={() => setConfirmPayment(payment)}
                      className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 glow-green text-sm">
                      Confirmar
                    </Button>
                  )}
                  {payment.confirmed && !isAdvance && (
                    <span className="text-xs px-3 py-1.5 rounded-full bg-green-400/20 text-green-400 font-medium">Confirmado</span>
                  )}
                  <Button size="icon" variant="ghost" className="w-8 h-8 hover:bg-red-400/10"
                    onClick={async () => {
                      if (!confirm(`¿Eliminar pago de ${toTitleCase(payment.client_name)} por $${payment.amount?.toLocaleString('es-CL')}?`)) return;
                      await base44.entities.Payment.delete(payment.id);
                    }}>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">No hay pagos que mostrar</div>
          )}
        </div>
      )}

      {showCreate && (
        <PaymentModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); loadData(); }} />
      )}
      {confirmPayment && (
        <ConfirmPaymentModal payment={confirmPayment} onClose={() => setConfirmPayment(null)} onConfirmed={() => { setConfirmPayment(null); loadData(); }} />
      )}
    </div>
  );
}
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Clock, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PaymentModal from "@/components/PaymentModal";
import ConfirmPaymentModal from "@/components/ConfirmPaymentModal";
import { format, startOfMonth } from "date-fns";

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmPayment, setConfirmPayment] = useState(null);
  const [filter, setFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => { loadPayments(); }, []);

  async function loadPayments() {
    setLoading(true);
    const data = await base44.entities.Payment.list("-created_date", 100);
    setPayments(data);
    setLoading(false);
  }

  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const confirmedAll = payments.filter(p => p.confirmed);
  const monthPayments = confirmedAll.filter(p => p.date >= monthStart);
  const monthIncome = monthPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const monthCount = monthPayments.length;

  const filtered = payments.filter(p => {
    const matchSearch = p.client_name?.toLowerCase().includes(search.toLowerCase()) || p.plan_name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || (filter === "pending" && !p.confirmed) || (filter === "confirmed" && p.confirmed);
    const matchFrom = !dateFrom || (p.date && p.date >= dateFrom);
    const matchTo = !dateTo || (p.date && p.date <= dateTo);
    return matchSearch && matchFilter && matchFrom && matchTo;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Pagos</h1>
          <p className="text-muted-foreground mt-1">Gestión de pagos y membresías</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-primary hover:bg-primary/90 glow-red text-white gap-2">
          <Plus className="w-4 h-4" /> Nuevo Pago
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-2">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Recaudado este mes</p>
          <p className="text-2xl font-bold text-green-400">${monthIncome.toLocaleString('es-CL')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{monthCount} pagos confirmados</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total histórico</p>
          <p className="text-2xl font-bold text-white">${confirmedAll.reduce((s,p)=>s+(p.amount||0),0).toLocaleString('es-CL')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{confirmedAll.length} pagos en total</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-card border-border text-white placeholder:text-muted-foreground" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-card border-border text-white w-40 text-sm" placeholder="Desde" />
          <span className="text-muted-foreground text-sm">—</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-card border-border text-white w-40 text-sm" placeholder="Hasta" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-muted-foreground hover:text-white">Limpiar</button>
          )}
        </div>
        <div className="flex gap-2">
          {["all", "pending", "confirmed"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-primary text-white" : "bg-card text-muted-foreground hover:text-white"}`}>
              {f === "all" ? "Todos" : f === "pending" ? "Pendientes" : "Confirmados"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-card animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(payment => (
            <div key={payment.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${payment.confirmed ? "bg-green-400/20" : "bg-orange-400/20"}`}>
                  {payment.confirmed
                    ? <CheckCircle className="w-5 h-5 text-green-400" />
                    : <Clock className="w-5 h-5 text-orange-400" />}
                </div>
                <div>
                  <p className="font-semibold text-white">{payment.client_name}</p>
                  <p className="text-sm text-muted-foreground">{payment.plan_name} · {payment.date ? format(new Date(payment.date), "dd/MM/yyyy") : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-xl font-bold text-white">${payment.amount?.toLocaleString()}</p>
                {!payment.confirmed && (
                  <Button onClick={() => setConfirmPayment(payment)}
                    className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 glow-green text-sm">
                    Confirmar Pago
                  </Button>
                )}
                {payment.confirmed && (
                  <span className="text-xs px-3 py-1.5 rounded-full bg-green-400/20 text-green-400 font-medium">Confirmado</span>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">No hay pagos que mostrar</div>
          )}
        </div>
      )}

      {showCreate && (
        <PaymentModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); loadPayments(); }} />
      )}
      {confirmPayment && (
        <ConfirmPaymentModal payment={confirmPayment} onClose={() => setConfirmPayment(null)} onConfirmed={() => { setConfirmPayment(null); loadPayments(); }} />
      )}
    </div>
  );
}
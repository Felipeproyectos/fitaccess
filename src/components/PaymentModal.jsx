import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

export default function PaymentModal({ onClose, onSaved }) {
  const [clients, setClients] = useState([]);
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({
    client_id: "", plan_id: "", amount: "",
    date: format(new Date(), "yyyy-MM-dd"),
    start_date: format(new Date(), "yyyy-MM-dd"),
    use_date: format(new Date(), "yyyy-MM-dd"),
    payment_method: "Efectivo",
    notes: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [c, p] = await Promise.all([
        base44.entities.Client.list("-name", 100),
        base44.entities.MembershipPlan.filter({ active: true })
      ]);
      setClients(c);
      setPlans(p);
    }
    load();
  }, []);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  const selectedPlan = plans.find(p => p.id === form.plan_id);
  const isSinglePass = selectedPlan?.type === "single_pass";
  const isFreePass = selectedPlan?.type === "free_pass";

  function handlePlanChange(planId) {
    const plan = plans.find(p => p.id === planId);
    set("plan_id", planId);
    if (plan) set("amount", plan.price);
  }

  async function save() {
    if (!form.client_id || !form.plan_id || !form.amount) return;
    setSaving(true);
    const client = clients.find(c => c.id === form.client_id);
    const plan = plans.find(p => p.id === form.plan_id);
    await base44.entities.Payment.create({
      ...form,
      amount: Number(form.amount),
      client_name: client?.name,
      plan_name: plan?.name,
      gym_id: client?.gym_id || "default",
      confirmed: false
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Registrar Pago</h2>
          <Button size="icon" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground mb-1.5 block">Cliente *</Label>
            <select value={form.client_id} onChange={e => set("client_id", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white text-sm">
              <option value="">Seleccionar cliente...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-muted-foreground mb-1.5 block">Plan *</Label>
            <select value={form.plan_id} onChange={e => handlePlanChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white text-sm">
              <option value="">Seleccionar plan...</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name} — ${p.price}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground mb-1.5 block">Monto *</Label>
              <Input value={form.amount} onChange={e => set("amount", e.target.value)} type="number"
                className="bg-background border-border text-white" />
            </div>
            <div>
              <Label className="text-muted-foreground mb-1.5 block">Fecha Pago</Label>
              <Input value={form.date} onChange={e => set("date", e.target.value)} type="date"
                className="bg-background border-border text-white" />
            </div>
          </div>
          {!isSinglePass && !isFreePass && (
            <div>
              <Label className="text-muted-foreground mb-1.5 block">Fecha Inicio Membresía</Label>
              <Input value={form.start_date} onChange={e => set("start_date", e.target.value)} type="date"
                className="bg-background border-border text-white" />
              <p className="text-xs text-muted-foreground mt-1">La duración del plan se contabiliza desde esta fecha</p>
            </div>
          )}
          {isFreePass && (
            <div>
              <Label className="text-muted-foreground mb-1.5 block">🎟 Fecha de Uso del Pase</Label>
              <Input value={form.use_date} onChange={e => set("use_date", e.target.value)} type="date"
                className="bg-background border-border text-white" />
              <p className="text-xs text-blue-400 mt-1">El pase sólo será válido en esta fecha</p>
            </div>
          )}
          {isSinglePass && (
            <div className="bg-orange-400/10 border border-orange-400/30 rounded-xl p-3">
              <p className="text-xs text-orange-400 font-medium">⚡ El QR se desactivará automáticamente tras el primer escaneo.</p>
            </div>
          )}
          <div>
            <Label className="text-muted-foreground mb-1.5 block">Método de Pago</Label>
            <select value={form.payment_method} onChange={e => set("payment_method", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white text-sm">
              {["Efectivo","Transferencia","Tarjeta de Débito","Tarjeta de Crédito"].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-muted-foreground mb-1.5 block">Notas</Label>
            <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Observaciones..."
              className="bg-background border-border text-white" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.client_id || !form.plan_id || !form.amount}
            className="flex-1 bg-primary hover:bg-primary/90 glow-red text-white">
            {saving ? "Guardando..." : "Registrar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
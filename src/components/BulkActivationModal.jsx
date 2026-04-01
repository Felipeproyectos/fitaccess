import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, CheckCircle, AlertCircle, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, addDays } from "date-fns";
import { toTitleCase } from "@/utils";

export default function BulkActivationModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [plans, setPlans] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState("");
  const [price, setPrice] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.MembershipPlan.filter({ active: true }),
      base44.entities.Client.filter({ active: true }, "-created_date", 200)
    ]).then(([ps, cs]) => { setPlans(ps); setClients(cs); });
  }, []);

  function selectPlan(plan) {
    setSelectedPlan(plan);
    setPrice(String(plan.price || ""));
    const end = plan.duration_days ? format(addDays(new Date(startDate), plan.duration_days), "yyyy-MM-dd") : "";
    setEndDate(end);
  }

  function handleStartDateChange(val) {
    setStartDate(val);
    if (selectedPlan?.duration_days && val) {
      setEndDate(format(addDays(new Date(val), selectedPlan.duration_days), "yyyy-MM-dd"));
    }
  }

  function toggleClient(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const visible = filteredClients.map(c => c.id);
    const allSelected = visible.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) visible.forEach(id => next.delete(id));
      else visible.forEach(id => next.add(id));
      return next;
    });
  }

  const filteredClients = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  async function confirmActivation() {
    setProcessing(true);
    const selected = clients.filter(c => selectedIds.has(c.id));
    setProgress({ done: 0, total: selected.length });
    let created = 0, failed = 0;

    for (const client of selected) {
      const payment = await base44.entities.Payment.create({
        client_id: client.id,
        client_name: client.name,
        gym_id: client.gym_id || "default",
        plan_id: selectedPlan.id,
        plan_name: selectedPlan.name,
        amount: parseFloat(price) || 0,
        date: format(new Date(), "yyyy-MM-dd"),
        start_date: startDate,
        confirmed: false
      });
      const res = await base44.functions.invoke("confirmPayment", { payment_id: payment.id });
      if (res.data?.success) created++; else failed++;
      setProgress(p => ({ ...p, done: p.done + 1 }));
    }

    setResult({ created, failed });
    setStep(5);
    setProcessing(false);
  }

  const typeLabels = { unlimited: "Ilimitado", limited: "Por Clases", weekly: "Semanal", monthly: "Mensual", custom: "Personalizado", single_pass: "Pase Único", free_pass: "Pase Libre" };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-white">🚀 Activación Masiva de Membresías</h2>
            {step < 5 && <p className="text-xs text-muted-foreground mt-0.5">Paso {step} de 4</p>}
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <div className="p-6 space-y-5">
          {/* Step 1 - Select Plan */}
          {step === 1 && (
            <>
              <p className="text-sm font-semibold text-white">Seleccionar Plan</p>
              <div className="space-y-2">
                {plans.map(plan => (
                  <div key={plan.id} onClick={() => selectPlan(plan)}
                    className={`border rounded-xl p-4 cursor-pointer transition-colors ${selectedPlan?.id === plan.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">{plan.name}</p>
                        <p className="text-xs text-muted-foreground">{typeLabels[plan.type]} · {plan.duration_days ? `${plan.duration_days} días` : "Sin duración"}</p>
                      </div>
                      <p className="text-xl font-bold text-white">${plan.price?.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {plans.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No hay planes activos</p>}
              </div>
              <Button onClick={() => setStep(2)} disabled={!selectedPlan} className="w-full bg-primary hover:bg-primary/90">Siguiente →</Button>
            </>
          )}

          {/* Step 2 - Configure dates */}
          {step === 2 && (
            <>
              <p className="text-sm font-semibold text-white">Configurar Membresía — {selectedPlan?.name}</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Fecha de Inicio</label>
                  <Input type="date" value={startDate} onChange={e => handleStartDateChange(e.target.value)} className="bg-background border-border text-white" />
                </div>
                {endDate && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Fecha de Fin</label>
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-background border-border text-white" />
                  </div>
                )}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Precio</label>
                  <Input type="number" value={price} onChange={e => setPrice(e.target.value)} className="bg-background border-border text-white" placeholder="0" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">← Atrás</Button>
                <Button onClick={() => setStep(3)} className="flex-1 bg-primary hover:bg-primary/90">Siguiente →</Button>
              </div>
            </>
          )}

          {/* Step 3 - Select clients */}
          {step === 3 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Seleccionar Clientes</p>
                <span className="text-xs text-primary font-medium">{selectedIds.size} seleccionados</span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..."
                  className="pl-10 bg-background border-border text-white" />
              </div>
              <div className="border border-border rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <div className="flex items-center gap-3 px-4 py-2.5 bg-background border-b border-border cursor-pointer hover:bg-white/5"
                  onClick={toggleAll}>
                  <input type="checkbox" readOnly
                    checked={filteredClients.length > 0 && filteredClients.every(c => selectedIds.has(c.id))}
                    className="accent-red-500" />
                  <span className="text-xs text-muted-foreground font-medium">Seleccionar todos ({filteredClients.length})</span>
                </div>
                {filteredClients.map(c => (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 cursor-pointer hover:bg-white/5"
                    onClick={() => toggleClient(c.id)}>
                    <input type="checkbox" readOnly checked={selectedIds.has(c.id)} className="accent-red-500" />
                    <div>
                      <p className="text-sm text-white">{toTitleCase(c.name)}</p>
                      {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep(2)} className="flex-1">← Atrás</Button>
                <Button onClick={() => setStep(4)} disabled={selectedIds.size === 0} className="flex-1 bg-primary hover:bg-primary/90">Siguiente →</Button>
              </div>
            </>
          )}

          {/* Step 4 - Confirm */}
          {step === 4 && (
            <>
              <p className="text-sm font-semibold text-white">Confirmar Activación</p>
              <div className="bg-background border border-border rounded-xl p-5 space-y-2">
                <p className="text-white"><span className="text-muted-foreground">Plan:</span> {selectedPlan?.name}</p>
                <p className="text-white"><span className="text-muted-foreground">Clientes:</span> {selectedIds.size}</p>
                <p className="text-white"><span className="text-muted-foreground">Inicio:</span> {startDate}</p>
                {endDate && <p className="text-white"><span className="text-muted-foreground">Fin:</span> {endDate}</p>}
                <p className="text-white"><span className="text-muted-foreground">Precio por cliente:</span> ${parseFloat(price || 0).toLocaleString()}</p>
              </div>
              <p className="text-xs text-muted-foreground">Se generará un QR y se enviará un email de activación a cada cliente con email registrado.</p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep(3)} className="flex-1" disabled={processing}>← Atrás</Button>
                <Button onClick={confirmActivation} disabled={processing} className="flex-1 bg-primary hover:bg-primary/90 gap-2">
                  {processing ? <><Loader2 className="w-4 h-4 animate-spin" />{progress.done}/{progress.total}</> : "Confirmar Activación Masiva"}
                </Button>
              </div>
            </>
          )}

          {/* Step 5 - Done */}
          {step === 5 && (
            <div className="text-center py-8 space-y-4">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
              <h3 className="text-xl font-bold text-white">¡Activación completada!</h3>
              <p className="text-green-400 font-medium">{result.created} membresías activadas exitosamente</p>
              {result.failed > 0 && <p className="text-red-400">{result.failed} errores</p>}
              <Button onClick={onClose}>Cerrar</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
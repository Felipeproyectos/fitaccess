import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, CheckCircle, Search, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toTitleCase } from "@/utils";

export default function BulkPaymentMethodModal({ onClose, onSaved }) {
  const [step, setStep] = useState(1);
  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [search, setSearch] = useState("");
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Client.filter({ active: true }, "-created_date", 200),
      base44.entities.Payment.list("-created_date", 500),
      base44.entities.Membership.list("-created_date", 500)
    ]).then(([cl, pays, mems]) => {
      setClients(cl);
      setPayments(pays);
      setMemberships(mems);
    });
  }, []);

  // Obtener el método de pago actual de un cliente (del último pago confirmado)
  function getClientPaymentMethod(clientId) {
    const clientPayments = payments
      .filter(p => p.client_id === clientId && p.confirmed)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return clientPayments[0]?.payment_method || null;
  }

  // Determina si un cliente tiene membresía activa o por vencer
  function hasActiveMembership(clientId) {
    return memberships.some(m => 
      m.client_id === clientId && 
      (m.status === "active" || m.status === "expiring")
    );
  }

  const filteredClients = clients.filter(c => {
    // Mostrar clientes activos con membresía activa que NO tienen método de pago especificado
    const matchesSearch = c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase());
    const hasActiveMem = hasActiveMembership(c.id);
    const noPaymentMethod = !getClientPaymentMethod(c.id);
    return matchesSearch && hasActiveMem && noPaymentMethod;
  });

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

  async function confirmUpdate() {
    setProcessing(true);
    const selected = clients.filter(c => selectedIds.has(c.id));
    const selectedClientIds = selected.map(c => c.id);
    
    // Obtener todos los pagos confirmados de los clientes seleccionados
    const clientPayments = payments.filter(p => 
      selectedClientIds.includes(p.client_id) && p.confirmed
    );
    
    setProgress({ done: 0, total: clientPayments.length });
    let updated = 0, failed = 0;

    const methodFormatted = selectedMethod === "efectivo" ? "Efectivo" : "Transferencia";

    for (const payment of clientPayments) {
      try {
        await base44.entities.Payment.update(payment.id, { payment_method: methodFormatted });
        updated++;
      } catch (error) {
        console.error("Error updating payment:", error);
        failed++;
      }
      setProgress(p => ({ ...p, done: p.done + 1 }));
    }

    setResult({ updated, failed });
    setStep(4);
    setProcessing(false);
    onSaved?.();
  }

  const methods = [
    { value: "efectivo", label: "💵 Efectivo", desc: "Pago en efectivo presencial" },
    { value: "transferencia", label: "🏦 Transferencia", desc: "Transferencia bancaria o digital" },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-white">💳 Pago Masivo</h2>
            {step < 4 && <p className="text-xs text-muted-foreground mt-0.5">Paso {step} de 3</p>}
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <div className="p-6 space-y-5">
          {/* Step 1 - Select clients */}
          {step === 1 && (
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
              <div className="border border-border rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <div className="flex items-center gap-3 px-4 py-2.5 bg-background border-b border-border cursor-pointer hover:bg-white/5"
                  onClick={toggleAll}>
                  <input type="checkbox" readOnly
                    checked={filteredClients.length > 0 && filteredClients.every(c => selectedIds.has(c.id))}
                    className="accent-red-500" />
                  <span className="text-xs text-muted-foreground font-medium">Seleccionar todos ({filteredClients.length})</span>
                </div>
                {filteredClients.map(c => {
                   const method = getClientPaymentMethod(c.id);
                   return (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 cursor-pointer hover:bg-white/5"
                      onClick={() => toggleClient(c.id)}>
                      <input type="checkbox" readOnly checked={selectedIds.has(c.id)} className="accent-red-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">{toTitleCase(c.name)}</p>
                        <p className="text-xs text-muted-foreground">
                          {method
                            ? (method === "Efectivo" ? "💵 Efectivo" : "🏦 Transferencia")
                            : <span className="text-orange-400">Sin método</span>}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button onClick={() => setStep(2)} disabled={selectedIds.size === 0} className="w-full bg-primary hover:bg-primary/90">
                Siguiente →
              </Button>
            </>
          )}

          {/* Step 2 - Select method */}
          {step === 2 && (
            <>
              <p className="text-sm font-semibold text-white">Método de Pago Preferido</p>
              <div className="space-y-3">
                {methods.map(m => (
                  <div key={m.value} onClick={() => setSelectedMethod(m.value)}
                    className={`border rounded-xl p-4 cursor-pointer transition-colors ${selectedMethod === m.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}>
                    <p className="font-semibold text-white text-lg">{m.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">← Atrás</Button>
                <Button onClick={() => setStep(3)} disabled={!selectedMethod} className="flex-1 bg-primary hover:bg-primary/90">Siguiente →</Button>
              </div>
            </>
          )}

          {/* Step 3 - Confirm */}
          {step === 3 && (
            <>
              <p className="text-sm font-semibold text-white">Confirmar Cambio</p>
              <div className="bg-background border border-border rounded-xl p-5 space-y-2">
                <p className="text-white"><span className="text-muted-foreground">Método:</span> {selectedMethod === "efectivo" ? "💵 Efectivo" : "🏦 Transferencia"}</p>
                <p className="text-white"><span className="text-muted-foreground">Clientes a actualizar:</span> {selectedIds.size}</p>
              </div>
              <p className="text-xs text-muted-foreground">Se asignará el método de pago preferido a los {selectedIds.size} cliente{selectedIds.size !== 1 ? "s" : ""} seleccionados con membresía activa.</p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep(2)} className="flex-1" disabled={processing}>← Atrás</Button>
                <Button onClick={confirmUpdate} disabled={processing} className="flex-1 bg-primary hover:bg-primary/90 gap-2">
                  {processing
                    ? <><Loader2 className="w-4 h-4 animate-spin" />{progress.done}/{progress.total}</>
                    : "Confirmar"}
                </Button>
              </div>
            </>
          )}

          {/* Step 4 - Done */}
          {step === 4 && (
            <div className="text-center py-8 space-y-4">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
              <h3 className="text-xl font-bold text-white">¡Actualización completada!</h3>
              <p className="text-green-400 font-medium">{result.updated} cliente{result.updated !== 1 ? "s" : ""} actualizados</p>
              {result.failed > 0 && <p className="text-red-400">{result.failed} errores</p>}
              <Button onClick={onSaved} className="bg-primary hover:bg-primary/90">Cerrar</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
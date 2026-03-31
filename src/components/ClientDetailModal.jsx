import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Edit2, Mail, Phone, Calendar, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

export default function ClientDetailModal({ client, onClose, onEdit }) {
  const [memberships, setMemberships] = useState([]);
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [showNewMembership, setShowNewMembership] = useState(false);
  const [membershipForm, setMembershipForm] = useState({
    plan_id: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    use_date: format(new Date(), "yyyy-MM-dd")
  });
  const [creatingMembership, setCreatingMembership] = useState(false);
  const [membershipResult, setMembershipResult] = useState(null);

  useEffect(() => {
    async function load() {
      const [mems, qrs, ps] = await Promise.all([
        base44.entities.Membership.filter({ client_id: client.id }, "-created_date", 5),
        base44.entities.QRCode.filter({ client_id: client.id, active: true }, "-created_date", 1),
        base44.entities.MembershipPlan.filter({ active: true })
      ]);
      setMemberships(mems);
      setQrCodes(qrs);
      setPlans(ps);
      setLoading(false);
    }
    load();
  }, [client.id]);

  const selectedPlan = plans.find(p => p.id === membershipForm.plan_id);
  const isFreePass = selectedPlan?.type === "free_pass";
  const isSinglePass = selectedPlan?.type === "single_pass";
  const showStartDate = selectedPlan && !isFreePass && !isSinglePass;

  async function createMembershipWithQR() {
    if (!membershipForm.plan_id) return;
    setCreatingMembership(true);
    setMembershipResult(null);
    const payment = await base44.entities.Payment.create({
      client_id: client.id,
      client_name: client.name,
      gym_id: client.gym_id || "default",
      plan_id: selectedPlan.id,
      plan_name: selectedPlan.name,
      amount: selectedPlan.price,
      date: format(new Date(), "yyyy-MM-dd"),
      start_date: membershipForm.start_date,
      use_date: membershipForm.use_date,
      confirmed: false
    });
    const res = await base44.functions.invoke("confirmPayment", { payment_id: payment.id });
    setMembershipResult(res.data);
    setCreatingMembership(false);
    const [mems, qrs] = await Promise.all([
      base44.entities.Membership.filter({ client_id: client.id }, "-created_date", 5),
      base44.entities.QRCode.filter({ client_id: client.id, active: true }, "-created_date", 1)
    ]);
    setMemberships(mems);
    setQrCodes(qrs);
  }

  const statusColors = {
    active: "bg-green-400/20 text-green-400",
    expiring: "bg-orange-400/20 text-orange-400",
    expired: "bg-red-400/20 text-red-400",
    pending: "bg-muted text-muted-foreground"
  };

  const activeMembership = memberships.find(m => m.status === "active" || m.status === "expiring");

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Detalle del Cliente</h2>
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" onClick={onEdit}><Edit2 className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl">
            {client.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{client.name}</h3>
            {client.email && (
              <div className="flex items-center gap-1.5 mt-1">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{client.email}</p>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{client.phone}</p>
              </div>
            )}
          </div>
        </div>

        {activeMembership && (
          <div className="bg-background rounded-xl p-4 border border-border space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Membresía Activa</p>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-white">{activeMembership.plan_name}</p>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[activeMembership.status]}`}>
                {activeMembership.status === "active" ? "Activa" : "Por Vencer"}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Vence: {activeMembership.end_date}</span>
              {activeMembership.remaining_accesses !== undefined && (
                <span>{activeMembership.remaining_accesses} accesos</span>
              )}
            </div>
          </div>
        )}

        {qrCodes.length > 0 && qrCodes[0].qr_image_url && (
          <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-xl">
            <img src={qrCodes[0].qr_image_url} alt="QR Code" className="w-40 h-40 object-contain" />
            <p className="text-xs text-gray-500 font-mono">{qrCodes[0].token?.slice(0, 16)}...</p>
          </div>
        )}

        {/* New Membership */}
        {!showNewMembership && !membershipResult && (
          <Button onClick={() => setShowNewMembership(true)}
            className="w-full bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 gap-2">
            <Plus className="w-4 h-4" /> Nueva Membresía + QR
          </Button>
        )}

        {showNewMembership && !membershipResult && (
          <div className="bg-background rounded-xl p-4 border border-border space-y-3">
            <p className="text-sm font-semibold text-white">Nueva Membresía</p>
            <div>
              <Label className="text-muted-foreground mb-1.5 block text-xs">Plan *</Label>
              <select value={membershipForm.plan_id}
                onChange={e => setMembershipForm(f => ({ ...f, plan_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-card border border-border text-white text-sm">
                <option value="">Seleccionar plan...</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name} — ${p.price}</option>)}
              </select>
            </div>
            {showStartDate && (
              <div>
                <Label className="text-muted-foreground mb-1.5 block text-xs">Fecha de Inicio</Label>
                <Input type="date" value={membershipForm.start_date}
                  onChange={e => setMembershipForm(f => ({ ...f, start_date: e.target.value }))}
                  className="bg-card border-border text-white" />
              </div>
            )}
            {isFreePass && (
              <div>
                <Label className="text-muted-foreground mb-1.5 block text-xs">🎟 Fecha de Uso del Pase</Label>
                <Input type="date" value={membershipForm.use_date}
                  onChange={e => setMembershipForm(f => ({ ...f, use_date: e.target.value }))}
                  className="bg-card border-border text-white" />
              </div>
            )}
            {isSinglePass && (
              <p className="text-xs text-orange-400">⚡ El QR se desactivará tras el primer escaneo</p>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowNewMembership(false)} className="flex-1">Cancelar</Button>
              <Button size="sm" onClick={createMembershipWithQR}
                disabled={creatingMembership || !membershipForm.plan_id}
                className="flex-1 bg-primary hover:bg-primary/90 text-white gap-1">
                {creatingMembership ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Procesando...</>
                ) : "Crear + Enviar QR"}
              </Button>
            </div>
          </div>
        )}

        {membershipResult?.success && (
          <div className="bg-green-400/10 border border-green-400/30 rounded-xl p-4 space-y-1">
            <p className="text-green-400 font-semibold text-sm">✅ Membresía creada y QR enviado</p>
            {membershipResult.start_date && (
              <p className="text-xs text-muted-foreground">Inicio: {membershipResult.start_date} → {membershipResult.end_date}</p>
            )}
            {membershipResult.email_sent && <p className="text-xs text-muted-foreground">Email enviado al cliente</p>}
            <button onClick={() => { setShowNewMembership(false); setMembershipResult(null); }}
              className="text-xs text-green-400 underline">Cerrar</button>
          </div>
        )}

        {loading && <div className="h-12 bg-muted animate-pulse rounded-xl" />}

        {!loading && memberships.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-3">Historial de Membresías</p>
            <div className="space-y-2">
              {memberships.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-white">{m.plan_name}</p>
                    <p className="text-xs text-muted-foreground">{m.start_date} → {m.end_date}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[m.status] || "bg-muted text-muted-foreground"}`}>
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
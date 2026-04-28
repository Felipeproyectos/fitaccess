import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Edit2, Mail, Phone, Calendar, Plus, Loader2, AlertTriangle, CreditCard, Save } from "lucide-react";
import { toTitleCase } from "@/utils";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import MembershipCard from "@/components/MembershipCard";

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
  const [showCard, setShowCard] = useState(false);
  const [gym, setGym] = useState(null);
  const [editingMembership, setEditingMembership] = useState(false);
  const [membershipEdit, setMembershipEdit] = useState({});
  const [savingMembership, setSavingMembership] = useState(false);

  useEffect(() => {
    async function load() {
      const [mems, qrs, ps, gyms] = await Promise.all([
        base44.entities.Membership.filter({ client_id: client.id }, "-created_date", 5),
        base44.entities.QRCode.filter({ client_id: client.id, active: true }, "-created_date", 1),
        base44.entities.MembershipPlan.filter({ active: true }),
        base44.entities.Gym.list("-created_date", 1)
      ]);
      setMemberships(mems);
      setQrCodes(qrs);
      setPlans(ps);
      if (gyms.length > 0) setGym(gyms[0]);
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

  async function saveMembershipEdit() {
    setSavingMembership(true);
    await base44.entities.Membership.update(activeMembership.id, membershipEdit);
    const mems = await base44.entities.Membership.filter({ client_id: client.id }, "-created_date", 5);
    setMemberships(mems);
    setEditingMembership(false);
    setSavingMembership(false);
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
            <h3 className="text-xl font-bold text-white">{toTitleCase(client.name)}</h3>
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
            {client.rut && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-muted-foreground font-medium">RUT:</span>
                <p className="text-sm text-muted-foreground font-mono">{client.rut}</p>
              </div>
            )}
          </div>
        </div>

        {activeMembership && !editingMembership && (
          <div className="bg-background rounded-xl p-4 border border-border space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Membresía Activa</p>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-white gap-1"
                onClick={() => { setMembershipEdit({ plan_name: activeMembership.plan_name, plan_id: activeMembership.plan_id, start_date: activeMembership.start_date, end_date: activeMembership.end_date, status: activeMembership.status, remaining_accesses: activeMembership.remaining_accesses }); setEditingMembership(true); }}>
                <Edit2 className="w-3 h-3" /> Editar
              </Button>
            </div>
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

        {activeMembership && editingMembership && (
          <div className="bg-background rounded-xl p-4 border border-primary/40 space-y-3">
            <p className="text-xs text-primary uppercase tracking-wider font-medium">Editar Membresía</p>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Plan</label>
              <select value={membershipEdit.plan_id || ""}
                onChange={e => {
                  const p = plans.find(x => x.id === e.target.value);
                  setMembershipEdit(f => ({ ...f, plan_id: e.target.value, plan_name: p?.name || f.plan_name }));
                }}
                className="w-full px-3 py-2 rounded-lg bg-card border border-border text-white text-sm">
                <option value="">— Sin cambiar plan —</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Fecha Inicio</label>
                <Input type="date" value={membershipEdit.start_date || ""}
                  onChange={e => setMembershipEdit(f => ({ ...f, start_date: e.target.value }))}
                  className="bg-card border-border text-white" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Fecha Fin</label>
                <Input type="date" value={membershipEdit.end_date || ""}
                  onChange={e => setMembershipEdit(f => ({ ...f, end_date: e.target.value }))}
                  className="bg-card border-border text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Estado</label>
                <select value={membershipEdit.status || ""}
                  onChange={e => setMembershipEdit(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-card border border-border text-white text-sm">
                  <option value="active">Activa</option>
                  <option value="expiring">Por Vencer</option>
                  <option value="expired">Expirada</option>
                  <option value="pending">Pendiente</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Accesos Restantes</label>
                <Input type="number" value={membershipEdit.remaining_accesses ?? ""}
                  onChange={e => setMembershipEdit(f => ({ ...f, remaining_accesses: e.target.value === "" ? undefined : parseInt(e.target.value) }))}
                  placeholder="—" className="bg-card border-border text-white" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setEditingMembership(false)}>Cancelar</Button>
              <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90 gap-1" onClick={saveMembershipEdit} disabled={savingMembership}>
                {savingMembership ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Guardar
              </Button>
            </div>
          </div>
        )}

        {!loading && qrCodes.length > 0 && qrCodes[0].token && (
          <div className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl">
            <QRCodeSVG
              value={qrCodes[0].token}
              size={180}
              level="H"
              includeMargin={false}
              fgColor="#000000"
              bgColor="#ffffff"
            />
            <p className="text-xs text-gray-400 font-mono">{qrCodes[0].token?.slice(0, 20)}...</p>
            {activeMembership && (
              <button onClick={() => setShowCard(true)}
                className="flex items-center gap-1.5 text-xs text-primary underline">
                <CreditCard className="w-3 h-3" /> Descargar tarjeta de acceso
              </button>
            )}
          </div>
        )}
        {!loading && qrCodes.length === 0 && (
          <div className="flex items-center gap-3 p-4 bg-yellow-400/10 border border-yellow-400/30 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-yellow-400">Sin QR activo</p>
              <p className="text-xs text-muted-foreground">Este cliente no tiene un código QR vigente. Crea una nueva membresía para generarlo.</p>
            </div>
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
                ) : "Activar Membresía"}
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

      {showCard && qrCodes[0]?.token && (
        <MembershipCard
          client={client}
          membership={activeMembership}
          qrToken={qrCodes[0].token}
          gymLogo={gym?.logo_url}
          gymName={gym?.name}
          onClose={() => setShowCard(false)}
        />
      )}

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
                    {{ active: "Activa", expiring: "Por Vencer", expired: "Expirada", pending: "Pendiente" }[m.status] || m.status}
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
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ClientModal({ client, onClose, onSaved, hasActiveMembership }) {
  const [form, setForm] = useState({
    name: client?.name || "",
    rut: client?.rut || "",
    email: client?.email || "",
    phone: client?.phone || "",
    notes: client?.notes || "",
    preferred_payment_method: client?.preferred_payment_method || "no_especificado",
    active: client?.active !== false,
    gym_id: client?.gym_id || "default"
  });
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function toTitleCase(str) {
    return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    // Validate duplicate email
    if (form.email?.trim()) {
      const existing = await base44.entities.Client.filter({ email: form.email.trim() });
      if (existing.some(c => c.id !== client?.id)) {
        alert('Ya existe un cliente con ese email.');
        setSaving(false);
        return;
      }
    }
    const data = { ...form, name: toTitleCase(form.name.trim()) };
    if (client?.id) await base44.entities.Client.update(client.id, data);
    else await base44.entities.Client.create(data);
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{client ? "Editar Cliente" : "Nuevo Cliente"}</h2>
          <Button size="icon" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground mb-1.5 block">Nombre *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Juan Pérez"
              className="bg-background border-border text-white" />
          </div>
          <div>
            <Label className="text-muted-foreground mb-1.5 block">RUT</Label>
            <Input value={form.rut} onChange={e => set("rut", e.target.value)} placeholder="12.345.678-9"
              className="bg-background border-border text-white" />
          </div>
          <div>
            <Label className="text-muted-foreground mb-1.5 block">Email</Label>
            <Input value={form.email} onChange={e => set("email", e.target.value)} placeholder="juan@email.com" type="email"
              className="bg-background border-border text-white" />
          </div>
          <div>
            <Label className="text-muted-foreground mb-1.5 block">Teléfono</Label>
            <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+1 234 567 890"
              className="bg-background border-border text-white" />
          </div>
          <div>
            <Label className="text-muted-foreground mb-1.5 block">Notas</Label>
            <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Observaciones..."
              className="bg-background border-border text-white" />
          </div>
          <div>
            <Label className="text-muted-foreground mb-1.5 block">Método de Pago Preferido</Label>
            {client && !hasActiveMembership ? (
              <div className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-muted-foreground opacity-60 cursor-not-allowed">
                Sin membresía activa
              </div>
            ) : (
              <select value={form.preferred_payment_method} onChange={e => set("preferred_payment_method", e.target.value)}
                className={`w-full px-3 py-2 rounded-lg bg-background border text-sm ${form.preferred_payment_method === "no_especificado" ? "border-orange-400/60 text-orange-400" : "border-border text-white"}`}>
                <option value="no_especificado">⚠️ No especificado</option>
                <option value="efectivo">💵 Efectivo</option>
                <option value="transferencia">🏦 Transferencia</option>
              </select>
            )}
            {client && !hasActiveMembership && (
              <p className="text-xs text-muted-foreground mt-1">Asigna una membresía activa primero para registrar el método de pago.</p>
            )}
            {hasActiveMembership && form.preferred_payment_method === "no_especificado" && (
              <p className="text-xs text-orange-400 mt-1">Selecciona un método de pago para evitar alertas.</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="active" checked={form.active} onChange={e => set("active", e.target.checked)}
              className="w-4 h-4 accent-primary" />
            <Label htmlFor="active" className="text-muted-foreground">Cliente activo</Label>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.name.trim()} className="flex-1 bg-primary hover:bg-primary/90 glow-red text-white">
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
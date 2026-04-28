import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TYPES = [
  { value: "unlimited", label: "Ilimitado" },
  { value: "limited", label: "Por Clases" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual" },
  { value: "custom", label: "Personalizado" },
  { value: "free_pass", label: "🎟 Pase Libre" },
  { value: "single_pass", label: "⚡ Pase Único" }
];

export default function PlanModal({ plan, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: plan?.name || "",
    type: plan?.type || "monthly",
    duration_days: plan?.duration_days || 30,
    max_accesses: plan?.max_accesses || "",
    price: plan?.price || "",
    description: plan?.description || "",
    gym_id: plan?.gym_id || "default"
  });
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function save() {
    if (!form.name.trim() || !form.price) return;
    setSaving(true);
    const data = { ...form, price: Number(form.price), duration_days: Number(form.duration_days) };
    if (form.type === 'single_pass' || form.type === 'free_pass') {
      data.max_accesses = 1;
    } else if (form.max_accesses) {
      data.max_accesses = Number(form.max_accesses);
    } else {
      delete data.max_accesses;
    }
    if (plan?.id) await base44.entities.MembershipPlan.update(plan.id, data);
    else await base44.entities.MembershipPlan.create(data);
    setSaving(false);
    onSaved();
  }

  const showAccesses = form.type === "limited";
  const isSinglePass = form.type === "single_pass";
  const isFreePass = form.type === "free_pass";
  const showDuration = !isSinglePass && !isFreePass;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{plan ? "Editar Plan" : "Nuevo Plan"}</h2>
          <Button size="icon" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground mb-1.5 block">Nombre del Plan *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Plan Mensual Premium"
              className="bg-background border-border text-white" />
          </div>
          <div>
            <Label className="text-muted-foreground mb-1.5 block">Tipo</Label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(t => (
                <button key={t.value} onClick={() => set("type", t.value)}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors ${form.type === t.value ? "bg-primary text-white" : "bg-background text-muted-foreground hover:text-white"}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {showDuration && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground mb-1.5 block">Duración (días) *</Label>
                <Input value={form.duration_days} onChange={e => set("duration_days", e.target.value)} type="number" min="1"
                  className="bg-background border-border text-white" />
              </div>
              <div>
                <Label className="text-muted-foreground mb-1.5 block">Precio *</Label>
                <Input value={form.price} onChange={e => set("price", e.target.value)} type="number" min="0" placeholder="0"
                  className="bg-background border-border text-white" />
              </div>
            </div>
          )}
          {(isSinglePass || isFreePass) && (
            <div>
              <Label className="text-muted-foreground mb-1.5 block">Precio *</Label>
              <Input value={form.price} onChange={e => set("price", e.target.value)} type="number" min="0" placeholder="0"
                className="bg-background border-border text-white" />
            </div>
          )}
          {isSinglePass && (
            <div className="bg-orange-400/10 border border-orange-400/30 rounded-xl p-3">
              <p className="text-xs text-orange-400 font-medium">⚡ Pase Único: el QR se desactiva automáticamente después del primer escaneo.</p>
            </div>
          )}
          {isFreePass && (
            <div className="bg-blue-400/10 border border-blue-400/30 rounded-xl p-3">
              <p className="text-xs text-blue-400 font-medium">🎟 Pase Libre: permite acceso libre en la fecha configurada al momento del pago.</p>
            </div>
          )}
          {showAccesses && (
            <div>
              <Label className="text-muted-foreground mb-1.5 block">Número de Accesos</Label>
              <Input value={form.max_accesses} onChange={e => set("max_accesses", e.target.value)} type="number" min="1" placeholder="12"
                className="bg-background border-border text-white" />
            </div>
          )}
          <div>
            <Label className="text-muted-foreground mb-1.5 block">Descripción</Label>
            <Input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Descripción opcional..."
              className="bg-background border-border text-white" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.name.trim() || !form.price} className="flex-1 bg-primary hover:bg-primary/90 glow-red text-white">
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
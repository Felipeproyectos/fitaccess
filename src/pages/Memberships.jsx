import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Edit2, Trash2, Dumbbell, AlertTriangle } from "lucide-react";
import ExportMenu from "@/components/ExportMenu";
import { Button } from "@/components/ui/button";
import PlanModal from "@/components/PlanModal";

export default function Memberships() {
  const [plans, setPlans] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [editingPaymentClientId, setEditingPaymentClientId] = useState(null);
  const [savingPayment, setSavingPayment] = useState(false);

  useEffect(() => { loadData(); }, []);
  async function loadData() {
    setLoading(true);
    const [data, mems, cls] = await Promise.all([
      base44.entities.MembershipPlan.list("-created_date", 50),
      base44.entities.Membership.filter({ status: "active" }, "-created_date", 200),
      base44.entities.Client.list("-created_date", 200)
    ]);
    setPlans(data);
    setMemberships(mems);
    setClients(cls);
    setLoading(false);
  }

  async function loadPlans() { loadData(); }

  async function savePaymentMethod(clientId, method) {
    setSavingPayment(true);
    await base44.entities.Client.update(clientId, { preferred_payment_method: method });
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, preferred_payment_method: method } : c));
    setEditingPaymentClientId(null);
    setSavingPayment(false);
  }

  async function deletePlan(id) {
    if (!confirm("¿Eliminar este plan?")) return;
    await base44.entities.MembershipPlan.delete(id);
    loadPlans();
  }

  const typeLabels = { unlimited: "Ilimitado", limited: "Por Clases", weekly: "Semanal", monthly: "Mensual", custom: "Personalizado", single_pass: "Pase Único", free_pass: "Pase Libre" };
  const typeColors2 = { single_pass: "text-cyan-400 bg-cyan-400/10", free_pass: "text-teal-400 bg-teal-400/10" };
  const typeColors = { unlimited: "text-blue-400 bg-blue-400/10", limited: "text-purple-400 bg-purple-400/10", weekly: "text-yellow-400 bg-yellow-400/10", monthly: "text-green-400 bg-green-400/10", custom: "text-pink-400 bg-pink-400/10" };

  const planHeaders = ["Nombre", "Tipo", "Duración (días)", "Accesos", "Precio"];
  const planRows = plans.map(p => [
    p.name, typeLabels[p.type] || p.type, p.duration_days ?? "",
    p.max_accesses ?? "Ilimitado", `$${p.price?.toLocaleString('es-CL')}`
  ]);

  const exportOptions = [
    { label: "Planes de Membresía", filename: "planes_membresia", headers: planHeaders, rows: planRows },
  ];

  const membersWithoutPayment = memberships.filter(m => {
    const client = clients.find(c => c.id === m.client_id);
    return !client?.preferred_payment_method || client?.preferred_payment_method === "no_especificado";
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Planes de Membresía</h1>
          <p className="text-muted-foreground mt-1">Configura los planes disponibles</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu options={exportOptions} />
          <Button onClick={() => { setEditPlan(null); setShowModal(true); }} className="bg-primary hover:bg-primary/90 glow-red text-white gap-2">
            <Plus className="w-4 h-4" /> Nuevo Plan
          </Button>
        </div>
      </div>





      {/* Planes */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-white">Planes Disponibles ({plans.length})</h2>
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-card animate-pulse" />)}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Nombre</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Tipo</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Duración</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Accesos</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Precio</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {plans.map(plan => (
                  <tr key={plan.id} className="border-b border-border last:border-0 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                          <Dumbbell className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="font-medium text-white">{plan.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[plan.type] || typeColors2[plan.type] || "text-muted-foreground bg-muted"}`}>
                        {typeLabels[plan.type] || plan.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {plan.type === "single_pass" || plan.type === "free_pass" ? "Pase único" : plan.duration_days ? `${plan.duration_days} días` : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {plan.type === "single_pass" || plan.type === "free_pass" ? "1 (único)" : plan.max_accesses ?? "Ilimitado"}
                    </td>
                    <td className="px-4 py-3 text-white font-bold">${plan.price?.toLocaleString('es-CL')}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => { setEditPlan(plan); setShowModal(true); }}>
                          <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => deletePlan(plan.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {plans.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No hay planes creados. ¡Crea el primero!</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <PlanModal plan={editPlan} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); loadPlans(); }} />
      )}
    </div>
  );
}
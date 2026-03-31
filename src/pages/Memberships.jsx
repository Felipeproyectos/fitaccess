import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Edit2, Trash2, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import PlanModal from "@/components/PlanModal";

export default function Memberships() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPlan, setEditPlan] = useState(null);

  useEffect(() => { loadPlans(); }, []);
  async function loadPlans() {
    setLoading(true);
    const data = await base44.entities.MembershipPlan.list("-created_date", 50);
    setPlans(data);
    setLoading(false);
  }

  async function deletePlan(id) {
    if (!confirm("¿Eliminar este plan?")) return;
    await base44.entities.MembershipPlan.delete(id);
    loadPlans();
  }

  const typeLabels = { unlimited: "Ilimitado", limited: "Por Clases", weekly: "Semanal", monthly: "Mensual", custom: "Personalizado" };
  const typeColors = { unlimited: "text-blue-400 bg-blue-400/10", limited: "text-purple-400 bg-purple-400/10", weekly: "text-yellow-400 bg-yellow-400/10", monthly: "text-green-400 bg-green-400/10", custom: "text-pink-400 bg-pink-400/10" };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Planes de Membresía</h1>
          <p className="text-muted-foreground mt-1">Configura los planes disponibles</p>
        </div>
        <Button onClick={() => { setEditPlan(null); setShowModal(true); }} className="bg-primary hover:bg-primary/90 glow-red text-white gap-2">
          <Plus className="w-4 h-4" /> Nuevo Plan
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-40 rounded-xl bg-card animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => (
            <div key={plan.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Dumbbell className="w-5 h-5 text-primary" />
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => { setEditPlan(plan); setShowModal(true); }}>
                    <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => deletePlan(plan.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </Button>
                </div>
              </div>
              <h3 className="font-semibold text-white text-lg">{plan.name}</h3>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[plan.type] || "text-muted-foreground bg-muted"}`}>
                  {typeLabels[plan.type] || plan.type}
                </span>
              </div>
              <div className="mt-3 space-y-1">
                <p className="text-sm text-muted-foreground">{plan.duration_days} días</p>
                {plan.max_accesses && <p className="text-sm text-muted-foreground">{plan.max_accesses} accesos</p>}
                {plan.description && <p className="text-xs text-muted-foreground mt-2">{plan.description}</p>}
              </div>
              <p className="text-2xl font-bold text-white mt-4">${plan.price?.toLocaleString()}</p>
            </div>
          ))}
          {plans.length === 0 && (
            <div className="col-span-3 text-center py-16 text-muted-foreground">
              No hay planes creados. ¡Crea el primero!
            </div>
          )}
        </div>
      )}

      {showModal && (
        <PlanModal plan={editPlan} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); loadPlans(); }} />
      )}
    </div>
  );
}
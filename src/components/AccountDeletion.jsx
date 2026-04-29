import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AccountDeletion() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (confirmText !== "ELIMINAR") return;
    setDeleting(true);
    // Delete all gym data
    const [clients, memberships, payments, attendances, qrs, gyms] = await Promise.all([
      base44.entities.Client.list("-created_date", 1000),
      base44.entities.Membership.list("-created_date", 1000),
      base44.entities.Payment.list("-created_date", 1000),
      base44.entities.Attendance.list("-created_date", 1000),
      base44.entities.QRCode.list("-created_date", 1000),
      base44.entities.Gym.list("-created_date", 10),
    ]);
    await Promise.all([
      ...clients.map(c => base44.entities.Client.delete(c.id)),
      ...memberships.map(m => base44.entities.Membership.delete(m.id)),
      ...payments.map(p => base44.entities.Payment.delete(p.id)),
      ...attendances.map(a => base44.entities.Attendance.delete(a.id)),
      ...qrs.map(q => base44.entities.QRCode.delete(q.id)),
      ...gyms.map(g => base44.entities.Gym.delete(g.id)),
    ]);
    setDeleting(false);
    base44.auth.logout("/");
  }

  return (
    <div className="bg-card border border-destructive/30 rounded-xl p-6 space-y-4">
      <h2 className="text-lg font-semibold text-destructive flex items-center gap-2">
        <AlertTriangle className="w-5 h-5" /> Zona de Peligro
      </h2>
      <p className="text-sm text-muted-foreground">
        Eliminar tu cuenta borrará permanentemente todos los datos del gimnasio: clientes, membresías, pagos, asistencias y configuración.
      </p>

      {!showConfirm ? (
        <Button variant="destructive" onClick={() => setShowConfirm(true)} className="gap-2">
          <Trash2 className="w-4 h-4" /> Eliminar Cuenta y Datos
        </Button>
      ) : (
        <div className="space-y-3 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
          <p className="text-sm text-destructive font-medium">
            Escribe <span className="font-bold">ELIMINAR</span> para confirmar:
          </p>
          <Input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="ELIMINAR"
            className="bg-background border-destructive/30 text-white"
          />
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => { setShowConfirm(false); setConfirmText(""); }}>
              Cancelar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}
              disabled={confirmText !== "ELIMINAR" || deleting} className="gap-1">
              {deleting ? <><Loader2 className="w-3 h-3 animate-spin" /> Eliminando...</> : "Confirmar Eliminación"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
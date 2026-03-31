import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Edit2, Mail, Phone, QrCode, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ClientDetailModal({ client, onClose, onEdit }) {
  const [memberships, setMemberships] = useState([]);
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [mems, qrs] = await Promise.all([
        base44.entities.Membership.filter({ client_id: client.id }, "-created_date", 5),
        base44.entities.QRCode.filter({ client_id: client.id, active: true }, "-created_date", 1)
      ]);
      setMemberships(mems);
      setQrCodes(qrs);
      setLoading(false);
    }
    load();
  }, [client.id]);

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
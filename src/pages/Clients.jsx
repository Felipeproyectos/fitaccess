import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Edit2, Eye, Phone, Mail, Trash2, AlertTriangle, UserX } from "lucide-react";
import ExportMenu from "@/components/ExportMenu";
import BulkImportModal from "@/components/BulkImportModal";
import BulkActivationModal from "@/components/BulkActivationModal";
import BulkPaymentMethodModal from "@/components/BulkPaymentMethodModal";
import { toTitleCase } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ClientModal from "@/components/ClientModal";
import ClientDetailModal from "@/components/ClientDetailModal";



export default function Clients() {
  const [clients, setClients] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [plans, setPlans] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [viewClient, setViewClient] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showBulkActivation, setShowBulkActivation] = useState(false);
  const [showBulkPayment, setShowBulkPayment] = useState(false);
  const [tab, setTab] = useState("active");
  const [deletingId, setDeletingId] = useState(null);
  const [membershipFilter, setMembershipFilter] = useState("");

  useEffect(() => { loadClients(); }, []);

  async function loadClients() {
    setLoading(true);
    const [data, mems, ps] = await Promise.all([
      base44.entities.Client.list("-created_date", 100),
      base44.entities.Membership.list("-created_date", 500),
      base44.entities.MembershipPlan.filter({ active: true })
    ]);
    setClients(data);
    setMemberships(mems);
    setPlans(ps);
    setLoading(false);
  }

  function getClientMembership(clientId) {
    const active = memberships.find(m => m.client_id === clientId && (m.status === 'active' || m.status === 'expiring'));
    if (active) return active;
    return memberships.find(m => m.client_id === clientId);
  }

  const activeClients = clients.filter(c => c.active !== false);
  const inactiveClients = clients.filter(c => c.active === false);
  const tabClients = tab === "active" ? activeClients : inactiveClients;

  const filtered = tabClients.filter(c => {
    const textMatch = c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search);
    if (!textMatch) return false;
    if (!membershipFilter) return true;
    const mem = getClientMembership(c.id);
    if (membershipFilter === "none") return !mem;
    return mem?.plan_name?.toLowerCase() === membershipFilter.toLowerCase();
  });

  function openEdit(client) { setEditClient(client); setShowModal(true); }
  function openCreate() { setEditClient(null); setShowModal(true); }

  async function handleDelete(client) {
    if (!confirm(`¿Eliminar permanentemente a ${toTitleCase(client.name)}? Esta acción no se puede deshacer.`)) return;
    setDeletingId(client.id);
    await base44.entities.Client.delete(client.id);
    setDeletingId(null);
    setClients(prev => prev.filter(c => c.id !== client.id));
  }

  const clientHeaders = ["Nombre Completo", "RUT", "Correo", "Número Teléfono", "Notas"];
  const clientRows = filtered.map(c => [
    toTitleCase(c.name),
    c.rut ?? "",
    c.email ?? "",
    c.phone ?? "",
    c.notes ?? ""
  ]);

  const exportOptions = [

    { label: "Clientes activos", filename: "clientes_activos", headers: clientHeaders, rows: clientRows.filter((_, i) => filtered[i]?.active !== false), templateHeaders: clientHeaders },
    { label: "Todos los clientes", filename: "clientes_todos", headers: clientHeaders, rows: clientRows },
    { label: "Vista actual (filtrada)", filename: "clientes_filtrado", headers: clientHeaders, rows: clientRows },
  ];

  const clientsWithoutMembership = clients.filter(c => c.active !== false && !memberships.some(m => m.client_id === c.id && (m.status === "active" || m.status === "expiring")));
  // Only flag clients who HAVE an active membership but no payment method
  const clientsWithoutPayment = clients.filter(c =>
    c.active !== false &&
    memberships.some(m => m.client_id === c.id && (m.status === "active" || m.status === "expiring")) &&
    (!c.preferred_payment_method || c.preferred_payment_method === "no_especificado")
  );

  return (
    <div className="p-6 space-y-6">

      {/* Alerta clientes sin membresía activa */}
      {!loading && clientsWithoutMembership.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-red-500/60 bg-gradient-to-r from-red-500/20 via-red-600/10 to-red-500/20 p-5 shadow-lg shadow-red-500/10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,59,59,0.15),transparent_60%)]" />
          <div className="relative flex items-start gap-4">
            <div className="shrink-0 w-11 h-11 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center">
              <UserX className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-red-400 leading-tight">
                {clientsWithoutMembership.length} cliente{clientsWithoutMembership.length !== 1 ? "s" : ""} sin membresía activa
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Estos clientes no tienen ninguna membresía vigente o su membresía está vencida.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {clientsWithoutMembership.slice(0, 6).map(c => (
                  <span key={c.id} className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300">
                    {toTitleCase(c.name)}
                  </span>
                ))}
                {clientsWithoutMembership.length > 6 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300">
                    +{clientsWithoutMembership.length - 6} más
                  </span>
                )}
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setShowBulkActivation(true)}
              className="shrink-0 bg-red-500 hover:bg-red-600 text-white text-xs"
            >
              🚀 Activar
            </Button>
          </div>
        </div>
      )}

      {/* Alerta clientes sin método de pago */}
      {clientsWithoutPayment.length > 0 && (
        <div className="flex items-start gap-3 bg-orange-400/10 border border-orange-400/30 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-orange-400">
              {clientsWithoutPayment.length} cliente{clientsWithoutPayment.length !== 1 ? "s" : ""} sin método de pago especificado
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Edita cada cliente para asignar "Efectivo" o "Transferencia" como método de pago preferido.
            </p>
          </div>
          <button
            onClick={() => setShowBulkPayment(true)}
            className="text-xs text-orange-400 underline shrink-0 hover:text-orange-300"
          >
            Asignar masivo
          </button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Clientes</h1>
          <p className="text-muted-foreground mt-1">{clients.length} clientes registrados</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportMenu options={exportOptions} />
          <Button variant="outline" onClick={() => setShowBulkActivation(true)} className="gap-2">
            🚀 Activación Masiva
          </Button>
          <Button variant="outline" onClick={() => setShowBulkPayment(true)} className="gap-2">
            💳 Pago Masivo
          </Button>
          <Button variant="outline" onClick={() => setShowBulkImport(true)} className="gap-2">
            📥 Carga Masiva
          </Button>
          <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 glow-red text-white gap-2">
            <Plus className="w-4 h-4" /> Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-card border border-border rounded-xl p-1 w-fit">
        <button onClick={() => setTab("active")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "active" ? "bg-primary text-white" : "text-muted-foreground hover:text-white"
          }`}>
          Activos ({activeClients.length})
        </button>
        <button onClick={() => setTab("inactive")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "inactive" ? "bg-primary text-white" : "text-muted-foreground hover:text-white"
          }`}>
          Inactivos ({inactiveClients.length})
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o teléfono..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-card border-border text-white placeholder:text-muted-foreground"
          />
        </div>
        <select
          value={membershipFilter}
          onChange={e => setMembershipFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-white"
        >
          <option value="">Todas las membresías</option>
          {plans.map(p => (
            <option key={p.id} value={p.name}>{p.name}</option>
          ))}
          <option value="none">Sin membresía</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-32 rounded-xl bg-card animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(client => (
            <div key={client.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                  {client.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="w-8 h-8 hover:bg-white/10" onClick={() => setViewClient(client)}>
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  <Button size="icon" variant="ghost" className="w-8 h-8 hover:bg-white/10" onClick={() => openEdit(client)}>
                    <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  <Button size="icon" variant="ghost" className="w-8 h-8 hover:bg-red-400/10" onClick={() => handleDelete(client)} disabled={deletingId === client.id}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </Button>
                </div>
              </div>
              <h3 className="font-semibold text-white">{toTitleCase(client.name)}</h3>
              {client.active !== false && (!client.preferred_payment_method || client.preferred_payment_method === "no_especificado") && (
                <div className="flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3 text-orange-400" />
                  <span className="text-xs text-orange-400">Sin método de pago</span>
                </div>
              )}
              {client.active !== false && client.preferred_payment_method && client.preferred_payment_method !== "no_especificado" && (
                <span className="text-xs text-muted-foreground mt-0.5 block">
                  {client.preferred_payment_method === "efectivo" ? "💵 Efectivo" : "🏦 Transferencia"}
                </span>
              )}
              {client.email && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Mail className="w-3 h-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Phone className="w-3 h-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{client.phone}</p>
                </div>
              )}
              <div className="mt-3 space-y-1.5">
                {(() => {
                  const isInactive = client.active === false;
                  if (isInactive) {
                    return (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-400/20 text-red-400">Inactivo</span>
                    );
                  }
                  const mem = getClientMembership(client.id);
                  const isExpired = mem?.status === 'expired';
                  const hasActiveMem = mem && (mem.status === 'active' || mem.status === 'expiring');
                  return (
                    <>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isExpired ? 'bg-red-400/20 text-red-400' : hasActiveMem ? 'bg-green-400/20 text-green-400' : 'bg-green-400/20 text-green-400'}`}>
                        {isExpired ? 'Vencido' : 'Activo'}
                      </span>
                      {mem ? (
                        <p className="text-xs text-muted-foreground">
                          {mem.plan_name}{mem.end_date ? ` · vence ${mem.end_date}` : ''}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Sin membresía</p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-16 text-muted-foreground">
              No se encontraron clientes
            </div>
          )}
        </div>
      )}

      {showModal && (
        <ClientModal
          client={editClient}
          hasActiveMembership={editClient ? memberships.some(m => m.client_id === editClient.id && (m.status === "active" || m.status === "expiring")) : true}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadClients(); }}
        />
      )}
      {viewClient && (
        <ClientDetailModal
          client={viewClient}
          onClose={() => setViewClient(null)}
          onEdit={() => { openEdit(viewClient); setViewClient(null); }}
        />
      )}
      {showBulkImport && (
        <BulkImportModal
          gymId="default"
          onClose={() => setShowBulkImport(false)}
          onImported={() => { setShowBulkImport(false); loadClients(); }}
        />
      )}
      {showBulkActivation && (
        <BulkActivationModal onClose={() => setShowBulkActivation(false)} />
      )}
      {showBulkPayment && (
        <BulkPaymentMethodModal
          onClose={() => setShowBulkPayment(false)}
          onSaved={() => { setShowBulkPayment(false); loadClients(); }}
        />
      )}
    </div>
  );
}
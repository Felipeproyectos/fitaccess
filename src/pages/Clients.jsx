import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Edit2, Eye, Phone, Mail, Trash2, AlertTriangle, LayoutGrid, List } from "lucide-react";
import ExportMenu from "@/components/ExportMenu";
import BulkImportModal from "@/components/BulkImportModal";
import { toTitleCase } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ClientModal from "@/components/ClientModal";
import ClientDetailModal from "@/components/ClientDetailModal";



export default function Clients() {
  const [clients, setClients] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [plans, setPlans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [viewClient, setViewClient] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [tab, setTab] = useState("active");
  const [deletingId, setDeletingId] = useState(null);
  const [membershipFilter, setMembershipFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [viewMode, setViewMode] = useState("grid");

  useEffect(() => {
    loadClients();
    // Suscripciones en tiempo real para sincronizar datos
    const unsub1 = base44.entities.Payment.subscribe(() => loadClients());
    const unsub2 = base44.entities.Membership.subscribe(() => loadClients());
    const unsub3 = base44.entities.Client.subscribe(() => loadClients());
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  async function loadClients() {
    setLoading(true);
    try {
      const [data, mems, ps, pays] = await Promise.all([
        base44.entities.Client.list("-created_date", 100),
        base44.entities.Membership.list("-created_date", 500),
        base44.entities.MembershipPlan.filter({ active: true }),
        base44.entities.Payment.filter({ confirmed: true })
      ]);
      setClients(data);
      setMemberships(mems);
      setPlans(ps);
      setPayments(pays);
    } catch (error) {
      console.error("Error loading clients data:", error);
      setClients([]);
      setMemberships([]);
      setPlans([]);
      setPayments([]);
    } finally {
      setLoading(false);
    }
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
    
    // Filtro de membresía
    if (membershipFilter) {
      const mem = getClientMembership(c.id);
      if (membershipFilter === "none") {
        if (mem) return false;
      } else {
        if (!mem || mem?.plan_name?.toLowerCase() !== membershipFilter.toLowerCase()) return false;
      }
    }
    
    // Filtro de pago
    if (paymentFilter) {
      const mem = getClientMembership(c.id);
      const hasActiveMem = mem && (mem.status === 'active' || mem.status === 'expiring');
      const hasPayment = payments.some(p => p.client_id === c.id);
      
      if (paymentFilter === "pending") {
        if (!hasActiveMem || hasPayment) return false;
      } else if (paymentFilter === "paid") {
        if (!hasActiveMem || !hasPayment) return false;
      }
    }
    
    return true;
  }).sort((a, b) => a.name?.localeCompare(b.name, "es"));

  function openEdit(client) { setEditClient(client); setShowModal(true); }
  function openCreate() { setEditClient(null); setShowModal(true); }

  async function handleDelete(client) {
    if (!confirm(`¿Eliminar permanentemente a ${toTitleCase(client.name)}? Esta acción no se puede deshacer.`)) return;
    setDeletingId(client.id);
    await base44.entities.Client.delete(client.id);
    setDeletingId(null);
    setClients(prev => prev.filter(c => c.id !== client.id));
  }

  async function handleToggleActive(client) {
    await base44.entities.Client.update(client.id, { active: !client.active });
    setClients(prev => prev.map(c => c.id === client.id ? { ...c, active: !c.active } : c));
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

  // Método de pago real: basado en el último pago confirmado del cliente
  function getClientPaymentMethod(clientId) {
    const clientPayments = payments.filter(p => p.client_id === clientId).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return clientPayments[0]?.payment_method || null;
  }

  // Alerta solo para clientes activos con membresía activa SIN ningún pago confirmado registrado
  const clientsWithoutPayment = clients.filter(c =>
    c.active !== false &&
    memberships.some(m => m.client_id === c.id && (m.status === "active" || m.status === "expiring")) &&
    !payments.some(p => p.client_id === c.id)
  );

  return (
    <div className="p-6 space-y-6">


      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Clientes</h1>
          <p className="text-muted-foreground mt-1">{clients.length} clientes registrados</p>
        </div>
        <div className="flex gap-2 flex-wrap">
           <ExportMenu options={exportOptions} />
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
        <select
          value={paymentFilter}
          onChange={e => setPaymentFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-white"
        >
          <option value="">Estado de pago</option>
          <option value="paid">✓ Pagados</option>
          <option value="pending">⚠ Pendiente de pago</option>
        </select>
        <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-primary text-white" : "text-muted-foreground hover:text-white"}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-primary text-white" : "text-muted-foreground hover:text-white"}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-32 rounded-xl bg-card animate-pulse" />)}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(client => {
            const mem = getClientMembership(client.id);
            const isInactive = client.active === false;
            const isExpired = mem?.status === 'expired';
            const hasActiveMem = mem && (mem.status === 'active' || mem.status === 'expiring');
            return (
              <div key={client.id} className={`bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors ${isInactive ? 'opacity-50' : ''}`}>
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
                     <Button size="icon" variant="ghost" className={`w-8 h-8 ${isInactive ? 'hover:bg-green-400/10' : 'hover:bg-red-400/10'}`} onClick={() => handleToggleActive(client)}>
                       <span className={`text-xs font-bold ${isInactive ? 'text-green-400' : 'text-red-400'}`}>
                         {isInactive ? '✓' : '✕'}
                       </span>
                     </Button>
                     <Button size="icon" variant="ghost" className="w-8 h-8 hover:bg-red-400/10" onClick={() => handleDelete(client)} disabled={deletingId === client.id}>
                       <Trash2 className="w-3.5 h-3.5 text-red-400" />
                     </Button>
                   </div>
                 </div>
                <h3 className="font-semibold text-white">{toTitleCase(client.name)}</h3>
                {!isInactive && hasActiveMem && (() => {
                  const hasPayment = payments.some(p => p.client_id === client.id && p.confirmed);
                  return (
                    <span className={`text-xs mt-0.5 block ${hasPayment ? 'text-green-400' : 'text-orange-400'}`}>
                      {hasPayment ? '✓ Pagado' : '⚠ Pendiente'}
                    </span>
                  );
                })()}
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
                   {isInactive ? (
                     <span className="text-xs px-2 py-0.5 rounded-full bg-red-400/20 text-red-400">Inactivo</span>
                   ) : !mem ? (
                     <span className="text-xs px-2 py-0.5 rounded-full bg-red-400/20 text-red-400">Usuario sin membresía</span>
                   ) : (
                     <>
                       <span className={`text-xs px-2 py-0.5 rounded-full ${isExpired ? 'bg-red-400/20 text-red-400' : 'bg-green-400/20 text-green-400'}`}>
                         {isExpired ? 'Vencido' : 'Activo'}
                       </span>
                       <p className="text-xs text-muted-foreground">
                         {mem.plan_name}{mem.end_date ? ` · vence ${mem.end_date}` : ''}
                       </p>
                     </>
                   )}
                 </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-16 text-muted-foreground">
              No se encontraron clientes
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Teléfono</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Membresía</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Estado de Pago</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(client => {
                const mem = getClientMembership(client.id);
                const isInactive = client.active === false;
                const isExpired = mem?.status === 'expired';
                return (
                  <tr key={client.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {client.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                           <p className="font-medium text-white">{toTitleCase(client.name)}</p>
                           {isInactive ? (
                             <span className="text-xs text-red-400">Inactivo</span>
                           ) : !mem ? (
                             <span className="text-xs text-red-400">Sin membresía</span>
                           ) : isExpired ? (
                             <span className="text-xs text-red-400">Vencido</span>
                           ) : (
                             <span className="text-xs text-green-400">Activo</span>
                           )}
                         </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-muted-foreground">{client.email || "—"}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-xs text-muted-foreground">{client.phone || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      {mem ? (
                        <div>
                          <p className="text-xs text-white">{mem.plan_name}</p>
                          {mem.end_date && <p className="text-xs text-muted-foreground">vence {mem.end_date}</p>}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin membresía</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {(() => {
                        const hasPayment = payments.some(p => p.client_id === client.id && p.confirmed);
                        if (isInactive || !mem) return <span className="text-xs text-muted-foreground">—</span>;
                        return (
                          <span className={`text-xs ${hasPayment ? 'text-green-400' : 'text-orange-400'}`}>
                            {hasPayment ? '✓ Pagado' : '⚠ Pendiente'}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" className="w-8 h-8 hover:bg-white/10" onClick={() => setViewClient(client)}>
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button size="icon" variant="ghost" className="w-8 h-8 hover:bg-white/10" onClick={() => openEdit(client)}>
                          <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button size="icon" variant="ghost" className={`w-8 h-8 ${isInactive ? 'hover:bg-green-400/10' : 'hover:bg-red-400/10'}`} onClick={() => handleToggleActive(client)}>
                          <span className={`text-xs font-bold ${isInactive ? 'text-green-400' : 'text-red-400'}`}>
                            {isInactive ? '✓' : '✕'}
                          </span>
                        </Button>
                        <Button size="icon" variant="ghost" className="w-8 h-8 hover:bg-red-400/10" onClick={() => handleDelete(client)} disabled={deletingId === client.id}>
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-muted-foreground">No se encontraron clientes</td>
                </tr>
              )}
            </tbody>
          </table>
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
          onClose={() => { setViewClient(null); loadClients(); }}
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
    </div>
  );
}
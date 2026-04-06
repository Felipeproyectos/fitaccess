import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Edit2, Eye, Phone, Mail } from "lucide-react";
import ExportMenu from "@/components/ExportMenu";
import BulkImportModal from "@/components/BulkImportModal";
import BulkActivationModal from "@/components/BulkActivationModal";
import { toTitleCase } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ClientModal from "@/components/ClientModal";
import ClientDetailModal from "@/components/ClientDetailModal";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [viewClient, setViewClient] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showBulkActivation, setShowBulkActivation] = useState(false);

  useEffect(() => { loadClients(); }, []);

  async function loadClients() {
    setLoading(true);
    const [data, mems] = await Promise.all([
      base44.entities.Client.list("-created_date", 100),
      base44.entities.Membership.list("-created_date", 500)
    ]);
    setClients(data);
    setMemberships(mems);
    setLoading(false);
  }

  function getClientMembership(clientId) {
    const active = memberships.find(m => m.client_id === clientId && (m.status === 'active' || m.status === 'expiring'));
    if (active) return active;
    return memberships.find(m => m.client_id === clientId);
  }

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  function openEdit(client) { setEditClient(client); setShowModal(true); }
  function openCreate() { setEditClient(null); setShowModal(true); }

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

  return (
    <div className="p-6 space-y-6">
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
          <Button variant="outline" onClick={() => setShowBulkImport(true)} className="gap-2">
            📥 Carga Masiva
          </Button>
          <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 glow-red text-white gap-2">
            <Plus className="w-4 h-4" /> Nuevo Cliente
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, email o teléfono..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 bg-card border-border text-white placeholder:text-muted-foreground"
        />
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
                </div>
              </div>
              <h3 className="font-semibold text-white">{toTitleCase(client.name)}</h3>
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
                  const mem = getClientMembership(client.id);
                  const isExpired = mem && (mem.status === 'expired' || (mem.remaining_accesses !== undefined && mem.remaining_accesses <= 0));
                  return (
                    <>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isExpired ? 'bg-red-400/20 text-red-400' : client.active !== false ? 'bg-green-400/20 text-green-400' : 'bg-red-400/20 text-red-400'}`}>
                        {isExpired ? 'Vencido' : client.active !== false ? 'Activo' : 'Inactivo'}
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
    </div>
  );
}
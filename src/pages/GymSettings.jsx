import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Save, Upload, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function GymSettings() {
  const [gym, setGym] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => { loadGym(); }, []);

  async function loadGym() {
    const gyms = await base44.entities.Gym.list("-created_date", 1);
    if (gyms.length > 0) setGym(gyms[0]);
    else setGym({ name: "", logo_url: "", address: "", phone: "", email: "", slideshow_images: [] });
  }

  async function save() {
    setSaving(true);
    if (gym.id) await base44.entities.Gym.update(gym.id, gym);
    else { const created = await base44.entities.Gym.create(gym); setGym(created); }
    setSaving(false);
  }

  async function handleSlideUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setGym(g => ({ ...g, slideshow_images: [...(g.slideshow_images || []), file_url] }));
    setUploading(false);
    e.target.value = '';
  }

  function removeImage(i) {
    setGym(g => ({ ...g, slideshow_images: g.slideshow_images.filter((_, idx) => idx !== i) }));
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setGym(g => ({ ...g, logo_url: file_url }));
    setUploading(false);
  }

  if (!gym) return <div className="p-6"><div className="h-8 w-48 bg-card animate-pulse rounded" /></div>;

  return (
    <div className="p-6 space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-white">Configuración del Gimnasio</h1>
        <p className="text-muted-foreground mt-1">Personaliza la información y branding</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-white">Información General</h2>
        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground mb-1.5 block">Nombre del Gimnasio *</Label>
            <Input value={gym.name || ""} onChange={e => setGym(g => ({ ...g, name: e.target.value }))}
              className="bg-background border-border text-white" placeholder="Mi Gimnasio" />
          </div>
          <div>
            <Label className="text-muted-foreground mb-1.5 block">Email</Label>
            <Input value={gym.email || ""} onChange={e => setGym(g => ({ ...g, email: e.target.value }))}
              className="bg-background border-border text-white" placeholder="gym@ejemplo.com" />
          </div>
          <div>
            <Label className="text-muted-foreground mb-1.5 block">Teléfono</Label>
            <Input value={gym.phone || ""} onChange={e => setGym(g => ({ ...g, phone: e.target.value }))}
              className="bg-background border-border text-white" placeholder="+1 234 567 890" />
          </div>
          <div>
            <Label className="text-muted-foreground mb-1.5 block">Dirección</Label>
            <Input value={gym.address || ""} onChange={e => setGym(g => ({ ...g, address: e.target.value }))}
              className="bg-background border-border text-white" placeholder="Calle 123, Ciudad" />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-white">Logo</h2>
        {gym.logo_url && <img src={gym.logo_url} alt="Logo" className="w-24 h-24 object-contain rounded-xl bg-background" />}
        <label className="flex items-center gap-2 cursor-pointer w-fit px-4 py-2 rounded-lg bg-secondary text-sm text-white hover:bg-secondary/70 transition-colors">
          <Upload className="w-4 h-4" />
          {uploading ? "Subiendo..." : "Subir Logo"}
          <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        </label>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-white">Imágenes de Pantalla Pública</h2>
        <p className="text-sm text-muted-foreground">Se muestran en la pantalla pública cuando no hay actividad por más de 5 minutos.</p>
        <label className="flex items-center gap-2 cursor-pointer w-fit px-4 py-2 rounded-lg bg-secondary text-sm text-white hover:bg-secondary/70 transition-colors">
          <Upload className="w-4 h-4" />
          {uploading ? "Subiendo..." : "Subir Imagen"}
          <input type="file" accept="image/*" className="hidden" onChange={handleSlideUpload} disabled={uploading} />
        </label>
        <div className="space-y-2">
          {(gym.slideshow_images || []).map((img, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-background">
              <img src={img} alt="" className="w-12 h-8 object-cover rounded" onError={e => e.target.style.display='none'} />
              <p className="flex-1 text-sm text-muted-foreground truncate">{img}</p>
              <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => removeImage(i)}>
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </Button>
            </div>
          ))}
          {(!gym.slideshow_images || gym.slideshow_images.length === 0) && (
            <p className="text-sm text-muted-foreground">No hay imágenes añadidas.</p>
          )}
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="bg-primary hover:bg-primary/90 glow-red text-white gap-2">
        <Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar Cambios"}
      </Button>
    </div>
  );
}
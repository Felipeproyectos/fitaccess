import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toTitleCase } from "@/utils";
import html2canvas from "html2canvas";

const TYPE_LABELS = {
  unlimited: "Ilimitado",
  limited: "Limitado",
  weekly: "Semanal",
  monthly: "Mensual",
  custom: "Personalizado",
  free_pass: "Pase Libre",
  single_pass: "Pase Único"
};

export default function MembershipCard({ client, membership, qrToken, gymLogo, gymName, onClose }) {
  const cardRef = useRef(null);

  async function downloadCard() {
    const canvas = await html2canvas(cardRef.current, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#111111"
    });
    const link = document.createElement("a");
    link.download = `tarjeta_${client.name.replace(/\s+/g, "_")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  const typeLabel = TYPE_LABELS[membership?.type] || membership?.type || "";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5 max-w-sm w-full">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Tarjeta de Acceso</h3>
          <Button size="icon" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {/* Card preview */}
        <div
          ref={cardRef}
          style={{
            background: "linear-gradient(135deg, #1a1a1a 0%, #111111 100%)",
            borderRadius: "16px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            border: "1px solid #2a2a2a",
            width: "100%",
            boxSizing: "border-box"
          }}
        >
          {/* Gym logo + name */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            {gymLogo ? (
              <img
                src={gymLogo}
                alt="Logo"
                crossOrigin="anonymous"
                style={{ width: "56px", height: "56px", objectFit: "contain", borderRadius: "12px" }}
              />
            ) : (
              <div style={{
                width: "56px", height: "56px", borderRadius: "12px",
                background: "#FF3B3B33", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "24px", fontWeight: "bold", color: "#FF3B3B"
              }}>
                {gymName?.charAt(0) || "G"}
              </div>
            )}
            <p style={{ color: "#ffffff", fontWeight: "700", fontSize: "16px", margin: 0, textAlign: "center" }}>
              {gymName || "Gimnasio"}
            </p>
          </div>

          {/* Divider */}
          <div style={{ width: "100%", height: "1px", background: "#2a2a2a" }} />

          {/* QR */}
          <div style={{ background: "#ffffff", padding: "12px", borderRadius: "12px" }}>
            <QRCodeCanvas value={qrToken} size={140} level="H" fgColor="#000000" bgColor="#ffffff" />
          </div>

          {/* Client info */}
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#ffffff", fontWeight: "700", fontSize: "18px", margin: "0 0 4px 0" }}>
              {toTitleCase(client.name)}
            </p>
            <p style={{ color: "#FF3B3B", fontWeight: "600", fontSize: "13px", margin: "0 0 4px 0" }}>
              {membership?.plan_name || ""}
            </p>
            <p style={{ color: "#888888", fontSize: "12px", margin: 0 }}>
              {typeLabel}
            </p>
          </div>

          {/* Footer firma */}
          <div style={{ width: "100%", height: "1px", background: "#2a2a2a" }} />
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#444444", fontSize: "9px", margin: 0 }}>Sistema creado por BYTE SUR Soluciones Tecnológicas</p>
            <p style={{ color: "#444444", fontSize: "9px", margin: "2px 0 0 0" }}>+56982645747  ·  www.bytesur.cl</p>
          </div>

          {/* Dates */}
          <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
            {membership?.start_date && (
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "#555555", fontSize: "10px", margin: "0 0 2px 0", textTransform: "uppercase" }}>Inicio</p>
                <p style={{ color: "#aaaaaa", fontSize: "12px", margin: 0, fontWeight: "600" }}>{membership.start_date}</p>
              </div>
            )}
            {membership?.end_date && (
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "#555555", fontSize: "10px", margin: "0 0 2px 0", textTransform: "uppercase" }}>Vence</p>
                <p style={{ color: "#FF3B3B", fontSize: "12px", margin: 0, fontWeight: "600" }}>{membership.end_date}</p>
              </div>
            )}
            {!membership?.end_date && (membership?.type === "single_pass" || membership?.type === "free_pass") && (
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "#aaaaaa", fontSize: "12px", margin: 0 }}>Uso único</p>
              </div>
            )}
          </div>
        </div>

        <Button onClick={downloadCard} className="w-full bg-primary hover:bg-primary/90 text-white gap-2">
          <Download className="w-4 h-4" /> Descargar Tarjeta
        </Button>
      </div>
    </div>
  );
}
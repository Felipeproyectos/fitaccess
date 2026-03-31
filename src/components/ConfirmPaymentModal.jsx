import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, addDays } from "date-fns";

export default function ConfirmPaymentModal({ payment, onClose, onConfirmed }) {
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState("confirm"); // confirm | processing | done | error
  const [result, setResult] = useState(null);

  async function confirm() {
    setProcessing(true);
    setStep("processing");
    try {
      const res = await base44.functions.invoke("confirmPayment", { payment_id: payment.id });
      setResult(res.data);
      setStep("done");
    } catch (err) {
      setResult({ error: err.message });
      setStep("error");
    }
    setProcessing(false);
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Confirmar Pago</h2>
          <Button size="icon" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {step === "confirm" && (
          <>
            <div className="bg-background rounded-xl p-4 border border-border space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Cliente</span>
                <span className="text-white font-medium">{payment.client_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Plan</span>
                <span className="text-white font-medium">{payment.plan_name}</span>
              </div>
              {payment.start_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Inicio Membresía</span>
                <span className="text-white font-medium">{payment.start_date}</span>
              </div>
              )}
              {payment.use_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">🎟 Fecha de Uso</span>
                <span className="text-blue-400 font-medium">{payment.use_date}</span>
              </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Monto</span>
                <span className="text-2xl font-bold text-white">${payment.amount?.toLocaleString()}</span>
              </div>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 space-y-1.5">
              <p className="text-sm font-medium text-white">Al confirmar se ejecutará automáticamente:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✅ Crear membresía activa</li>
                <li>✅ Generar código QR único</li>
                <li>✅ Invalidar QR anterior</li>
                <li>✅ Enviar QR por email al cliente</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
              <Button onClick={confirm} className="flex-1 bg-green-500 hover:bg-green-600 text-white glow-green gap-2">
                <CheckCircle className="w-4 h-4" /> Confirmar Pago
              </Button>
            </div>
          </>
        )}

        {step === "processing" && (
          <div className="py-8 flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-white font-medium">Procesando pago...</p>
            <p className="text-sm text-muted-foreground">Generando membresía y código QR</p>
          </div>
        )}

        {step === "done" && (
          <div className="py-4 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-400/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-white font-bold text-lg">¡Pago Confirmado!</p>
            <p className="text-sm text-muted-foreground text-center">
              Membresía activada{result?.email_sent ? " y QR enviado por email a " : " para "}{payment.client_name}.
            </p>
            {result?.start_date && (
              <div className="text-sm bg-background border border-border rounded-lg p-3 w-full space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Inicio</span>
                  <span className="text-white">{result.start_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vence</span>
                  <span className="text-white">{result.end_date}</span>
                </div>
              </div>
            )}
            {result?.qr_token && (
              <p className="text-xs text-muted-foreground font-mono bg-muted px-3 py-1 rounded">
                Token: {result.qr_token.slice(0, 20)}...
              </p>
            )}
            <Button onClick={onConfirmed} className="w-full bg-primary hover:bg-primary/90 text-white">
              Listo
            </Button>
          </div>
        )}

        {step === "error" && (
          <div className="py-4 flex flex-col items-center gap-4">
            <div className="text-4xl">❌</div>
            <p className="text-red-400 font-bold">Error al procesar</p>
            <p className="text-sm text-muted-foreground text-center">{result?.error || "Intenta de nuevo"}</p>
            <div className="flex gap-3 w-full">
              <Button variant="secondary" onClick={onClose} className="flex-1">Cerrar</Button>
              <Button onClick={confirm} className="flex-1 bg-primary text-white">Reintentar</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
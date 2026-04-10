import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function QRScanner() {
  const [input, setInput] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [manualRut, setManualRut] = useState("");
  const [lastResult, setLastResult] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [recentScans, setRecentScans] = useState([]);
  const hiddenInputRef = useRef(null);
  const scanBuffer = useRef("");
  const scanTimer = useRef(null);
  const processingRef = useRef(false);

  // Keep processingRef in sync
  useEffect(() => { processingRef.current = processing; }, [processing]);

  useEffect(() => {
    loadRecentScans();

    // Focus the hidden input so scanner always sends keys there
    hiddenInputRef.current?.focus();

    function refocusHidden(e) {
      // Only refocus if clicking outside a real interactive element
      const tag = e.target?.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT' && tag !== 'BUTTON' && tag !== 'A') {
        setTimeout(() => hiddenInputRef.current?.focus(), 50);
      }
    }
    document.addEventListener('click', refocusHidden);
    return () => document.removeEventListener('click', refocusHidden);
  }, []);

  async function loadRecentScans() {
    const data = await base44.entities.Attendance.list("-created_date", 10);
    setRecentScans(data);
  }

  // Handler for the hidden input used by the barcode scanner
  function handleHiddenInput(e) {
    const val = e.target.value;
    setInput(val);
    scanBuffer.current = val;

    clearTimeout(scanTimer.current);
    // Most barcode scanners end with Enter — we also auto-fire after 150ms of silence
    scanTimer.current = setTimeout(() => {
      const token = scanBuffer.current.trim();
      if (token.length > 4) {
        processToken(token);
      }
      scanBuffer.current = '';
      setInput('');
      if (hiddenInputRef.current) hiddenInputRef.current.value = '';
    }, 150);
  }

  function handleHiddenKeyDown(e) {
    if (e.key === 'Enter') {
      clearTimeout(scanTimer.current);
      const token = scanBuffer.current.trim();
      if (token.length > 4) processToken(token);
      scanBuffer.current = '';
      setInput('');
      if (hiddenInputRef.current) hiddenInputRef.current.value = '';
      e.preventDefault();
    }
  }

  async function processRut(rut) {
    if (processingRef.current) return;
    setProcessing(true);
    try {
      const result = await base44.functions.invoke("processManualAttendance", { rut });
      setLastResult(result.data);
      loadRecentScans();
    } catch (err) {
      setLastResult({ status: "error", message: "Error al procesar RUT" });
    }
    setProcessing(false);
    setTimeout(() => setLastResult(null), 8000);
  }

  async function processToken(token) {
    if (processingRef.current) return;
    setProcessing(true);
    try {
      const result = await base44.functions.invoke("validateQR", { token });
      setLastResult(result.data);
      loadRecentScans();
    } catch (err) {
      setLastResult({ status: "error", message: "Error al procesar QR" });
    }
    setProcessing(false);
    setTimeout(() => setLastResult(null), 8000);
  }

  const statusConfig = {
    success: { bg: "bg-green-500/20", border: "border-green-500/40", text: "text-green-400", icon: "✅", label: "Acceso Permitido" },
    expiring: { bg: "bg-orange-500/20", border: "border-orange-500/40", text: "text-orange-400", icon: "⚠️", label: "Membresía por Vencer" },
    expired: { bg: "bg-red-500/20", border: "border-red-500/40", text: "text-red-400", icon: "❌", label: "Membresía Vencida" },
    invalid: { bg: "bg-red-500/20", border: "border-red-500/40", text: "text-red-400", icon: "🚫", label: "Código Inválido" },
    error: { bg: "bg-red-500/20", border: "border-red-500/40", text: "text-red-400", icon: "⚠️", label: "Error" },
    already_registered: { bg: "bg-yellow-500/20", border: "border-yellow-500/40", text: "text-yellow-400", icon: "🕐", label: "Ya Registrado Hoy" },
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Validación QR</h1>
          <p className="text-muted-foreground mt-1">Conecta tu lector QR físico o escribe el token</p>
        </div>
        <Link to="/public-screen" target="_blank"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-sm text-muted-foreground hover:text-white transition-colors">
          <Monitor className="w-4 h-4" /> Pantalla Pública
        </Link>
      </div>

      <div className="bg-card border border-border rounded-xl p-8 text-center space-y-4">
        <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-4xl ${processing ? "animate-pulse bg-primary/20" : "bg-white/5"}`}>
          {processing ? "⏳" : "📡"}
        </div>
        <h2 className="text-xl font-semibold text-white">
          {processing ? "Procesando..." : "Esperando escaneo"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Apunta el lector QR hacia el código del cliente. El acceso se valida automáticamente.
        </p>
        {input && <p className="text-xs text-muted-foreground font-mono bg-muted/50 px-3 py-1 rounded inline-block">{input}</p>}
      </div>

      {/* Manual RUT input */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-sm font-semibold text-white mb-3">Asistencia manual por RUT</p>
        <div className="flex gap-2">
          <Input
            value={manualRut}
            onChange={e => setManualRut(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && manualRut.trim()) { processRut(manualRut.trim()); setManualRut(""); } }}
            placeholder="Ej: 12.345.678-9"
            className="bg-background border-border text-white text-sm"
          />
          <Button
            onClick={() => { if (manualRut.trim()) { processRut(manualRut.trim()); setManualRut(""); } }}
            disabled={processing || !manualRut.trim()}
            className="shrink-0"
          >
            Registrar
          </Button>
        </div>
      </div>

      {/* Manual token input */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-sm font-semibold text-white mb-3">Ingresar token manualmente</p>
        <div className="flex gap-2">
          <Input
            value={manualToken}
            onChange={e => setManualToken(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && manualToken.trim()) { processToken(manualToken.trim()); setManualToken(""); } }}
            placeholder="Pegar o escribir token QR..."
            className="bg-background border-border text-white font-mono text-sm"
          />
          <Button
            onClick={() => { if (manualToken.trim()) { processToken(manualToken.trim()); setManualToken(""); } }}
            disabled={processing || !manualToken.trim()}
            className="shrink-0"
          >
            Validar
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {lastResult && (
          <motion.div key="result" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={`border rounded-xl p-6 text-center ${statusConfig[lastResult.status]?.bg} ${statusConfig[lastResult.status]?.border}`}>
            <div className="text-5xl mb-3">{statusConfig[lastResult.status]?.icon}</div>
            <p className={`text-2xl font-bold ${statusConfig[lastResult.status]?.text}`}>
              {statusConfig[lastResult.status]?.label}
            </p>
            {lastResult.client_name && <p className="text-xl text-white mt-2">{lastResult.client_name}</p>}
            {lastResult.remaining_accesses !== undefined && (
              <p className="text-muted-foreground mt-1">{lastResult.remaining_accesses} accesos restantes</p>
            )}
            {lastResult.message && <p className="text-sm text-muted-foreground mt-2">{lastResult.message}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Últimos Escaneos</h2>
        <div className="space-y-2">
          {recentScans.map(s => (
            <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium text-white">{s.client_name}</p>
                <p className="text-xs text-muted-foreground">{s.date}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusConfig[s.scan_result]?.bg} ${statusConfig[s.scan_result]?.text}`}>
                {statusConfig[s.scan_result]?.icon} {statusConfig[s.scan_result]?.label}
              </span>
            </div>
          ))}
          {recentScans.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin escaneos recientes</p>}
        </div>
      </div>
    </div>
  );
}
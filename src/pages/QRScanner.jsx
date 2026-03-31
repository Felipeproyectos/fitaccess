import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor } from "lucide-react";
import { Link } from "react-router-dom";

export default function QRScanner() {
  const [input, setInput] = useState("");
  const [lastResult, setLastResult] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [recentScans, setRecentScans] = useState([]);
  const inputRef = useRef(null);
  const scanBuffer = useRef("");
  const scanTimer = useRef(null);

  useEffect(() => {
    loadRecentScans();
    // Focus on input for physical QR reader
    const focusInput = () => inputRef.current?.focus();
    focusInput();
    document.addEventListener("click", focusInput);
    return () => document.removeEventListener("click", focusInput);
  }, []);

  async function loadRecentScans() {
    const data = await base44.entities.Attendance.list("-created_date", 10);
    setRecentScans(data);
  }

  // Handle QR scanner input (physical reader simulates keyboard)
  function handleKeyDown(e) {
    if (e.key === "Enter" && scanBuffer.current.trim()) {
      processToken(scanBuffer.current.trim());
      scanBuffer.current = "";
      setInput("");
      clearTimeout(scanTimer.current);
    }
  }

  function handleChange(e) {
    const val = e.target.value;
    setInput(val);
    scanBuffer.current = val;
    clearTimeout(scanTimer.current);
    scanTimer.current = setTimeout(() => {
      if (scanBuffer.current.trim().length > 8) {
        processToken(scanBuffer.current.trim());
        scanBuffer.current = "";
        setInput("");
      }
    }, 300);
  }

  async function processToken(token) {
    if (processing) return;
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

      {/* Hidden input to capture QR reader */}
      <input ref={inputRef} value={input} onChange={handleChange} onKeyDown={handleKeyDown}
        className="opacity-0 absolute w-0 h-0" autoFocus />

      <div className="bg-card border border-border rounded-xl p-8 text-center space-y-4 cursor-text"
        onClick={() => inputRef.current?.focus()}>
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
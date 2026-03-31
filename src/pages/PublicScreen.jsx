import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const SCAN_DISPLAY_TIMEOUT = 7000; // 7 segundos

function playSound(type) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const sounds = {
    success: [{ freq: 523, dur: 0.12 }, { freq: 659, dur: 0.12 }, { freq: 784, dur: 0.2 }],
    expiring: [{ freq: 440, dur: 0.15 }, { freq: 370, dur: 0.25 }],
    expired:  [{ freq: 300, dur: 0.2 }, { freq: 220, dur: 0.3 }],
    denied:   [{ freq: 300, dur: 0.2 }, { freq: 220, dur: 0.3 }],
    invalid:  [{ freq: 280, dur: 0.25 }, { freq: 200, dur: 0.35 }],
  };
  const notes = sounds[type] || sounds.invalid;
  let time = ctx.currentTime;
  notes.forEach(({ freq, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = type === 'success' ? 'sine' : 'square';
    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.start(time); osc.stop(time + dur);
    time += dur + 0.04;
  });
} // 7 segundos

export default function PublicScreen() {
  const [lastScan, setLastScan] = useState(null);
  const [showIdle, setShowIdle] = useState(false);
  const [gym, setGym] = useState(null);
  const [slideshowImages, setSlideshowImages] = useState([]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const idleTimer = useRef(null);

  useEffect(() => {
    loadGym();
    startIdleTimer();
    const clock = setInterval(() => setCurrentTime(new Date()), 1000);

    // Subscribe to new attendance
    const unsub = base44.entities.Attendance.subscribe((event) => {
      if (event.type === "create") {
        showScanResult(event.data);
      }
    });

    return () => { clearInterval(clock); unsub(); clearTimeout(idleTimer.current); };
  }, []);

  // Slideshow rotation
  useEffect(() => {
    if (!showIdle || slideshowImages.length === 0) return;
    const t = setInterval(() => setSlideIndex(i => (i + 1) % slideshowImages.length), 6000);
    return () => clearInterval(t);
  }, [showIdle, slideshowImages]);

  async function loadGym() {
    const gyms = await base44.entities.Gym.list("-created_date", 1);
    if (gyms.length > 0) {
      setGym(gyms[0]);
      setSlideshowImages(gyms[0].slideshow_images?.filter(Boolean) || []);
    }
  }

  function showScanResult(attendanceData) {
    const soundType = attendanceData.scan_result === 'success' && attendanceData.remaining_accesses === 0
      ? 'denied' : attendanceData.scan_result;
    playSound(soundType);
    setLastScan(attendanceData);
    setShowIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      setLastScan(null);
      setShowIdle(true);
    }, SCAN_DISPLAY_TIMEOUT);
  }

  function startIdleTimer() {
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setShowIdle(true), IDLE_TIMEOUT);
  }

  const resultConfig = {
    success: {
      bg: "from-[#0B0B0B] via-[#0d1f0d] to-[#0B0B0B]",
      accent: "#22FF88",
      glow: "0 0 80px rgba(34,255,136,0.3)",
      icon: "✅",
      label: "ACCESO PERMITIDO",
      border: "border-[#22FF88]/30"
    },
    expiring: {
      bg: "from-[#0B0B0B] via-[#1f1500] to-[#0B0B0B]",
      accent: "#FF7A00",
      glow: "0 0 80px rgba(255,122,0,0.3)",
      icon: "⚠️",
      label: "MEMBRESÍA POR VENCER",
      border: "border-[#FF7A00]/30"
    },
    expired: {
      bg: "from-[#0B0B0B] via-[#1f0000] to-[#0B0B0B]",
      accent: "#FF3B3B",
      glow: "0 0 80px rgba(255,59,59,0.3)",
      icon: "❌",
      label: "MEMBRESÍA VENCIDA",
      border: "border-[#FF3B3B]/30"
    },
    invalid: {
      bg: "from-[#0B0B0B] via-[#1f0000] to-[#0B0B0B]",
      accent: "#FF3B3B",
      glow: "0 0 80px rgba(255,59,59,0.3)",
      icon: "🚫",
      label: "CÓDIGO INVÁLIDO",
      border: "border-[#FF3B3B]/30"
    },
    denied: {
      bg: "from-[#0B0B0B] via-[#1f0000] to-[#0B0B0B]",
      accent: "#FF3B3B",
      glow: "0 0 80px rgba(255,59,59,0.3)",
      icon: "⛔",
      label: "ACCESO DENEGADO",
      border: "border-[#FF3B3B]/30"
    }
  };

  const effectiveResult = lastScan?.scan_result === "success" && lastScan?.remaining_accesses === 0
    ? "denied"
    : lastScan?.scan_result;
  const cfg = lastScan ? (resultConfig[effectiveResult] || resultConfig.success) : null;

  return (
    <div className="fixed inset-0 bg-[#0B0B0B] overflow-hidden select-none">
      <AnimatePresence mode="wait">
        {showIdle || !lastScan ? (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center">
            {slideshowImages.length > 0 ? (
              <AnimatePresence mode="wait">
                <motion.img key={slideIndex} src={slideshowImages[slideIndex]}
                  initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 1 }} className="absolute inset-0 w-full h-full object-cover" />
              </AnimatePresence>
            ) : (
              <div className="text-center space-y-6">
                <div className="relative">
                  <h1 className="font-display text-[12vw] text-gradient leading-none">
                    {gym?.name || "FITACCESS"}
                  </h1>
                  <div className="absolute inset-0 blur-3xl opacity-20 bg-gradient-to-r from-[#FF3B3B] to-[#FF7A00]" />
                </div>
                <p className="text-2xl text-white/40 font-light">Control inteligente de acceso</p>
                <div className="mt-8 text-6xl font-bold text-white/80 tabular-nums">
                  {currentTime.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </div>
                <p className="text-white/40">{currentTime.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</p>
                <div className="mt-12 text-white/30 text-lg animate-pulse">Esperando escaneo QR...</div>
              <div className="mt-6 flex flex-wrap gap-3 justify-center">
                <button onClick={() => showScanResult({ client_name: "Cliente Prueba", scan_result: "success", remaining_accesses: 5 })} className="px-4 py-2 bg-green-600/30 border border-green-500/50 rounded-xl text-green-400 text-sm hover:bg-green-600/50 transition-colors">✅ Acceso Permitido</button>
                <button onClick={() => showScanResult({ client_name: "Cliente Prueba", scan_result: "expiring", remaining_accesses: 2 })} className="px-4 py-2 bg-orange-600/30 border border-orange-500/50 rounded-xl text-orange-400 text-sm hover:bg-orange-600/50 transition-colors">⚠️ Por Vencer</button>
                <button onClick={() => showScanResult({ client_name: "Cliente Prueba", scan_result: "expired", remaining_accesses: 0 })} className="px-4 py-2 bg-red-600/30 border border-red-500/50 rounded-xl text-red-400 text-sm hover:bg-red-600/50 transition-colors">❌ Membresía Vencida</button>
                <button onClick={() => showScanResult({ client_name: "Cliente Prueba", scan_result: "success", remaining_accesses: 0 })} className="px-4 py-2 bg-red-600/30 border border-red-500/50 rounded-xl text-red-400 text-sm hover:bg-red-600/50 transition-colors">⛔ Acceso Denegado</button>
                <button onClick={() => showScanResult({ client_name: "Cliente Prueba", scan_result: "invalid" })} className="px-4 py-2 bg-red-600/30 border border-red-500/50 rounded-xl text-red-400 text-sm hover:bg-red-600/50 transition-colors">🚫 Código Inválido</button>
              </div>
            </div>
            )}
            {slideshowImages.length > 0 && (
              <div className="absolute bottom-8 text-white/50 text-xl animate-pulse">Esperando escaneo QR...</div>
            )}
          </motion.div>
        ) : (
          <motion.div key={lastScan?.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.4 }}
            className={`absolute inset-0 bg-gradient-to-b ${cfg.bg} flex flex-col items-center justify-center gap-10`}>
            <div className="text-center space-y-6" style={{ filter: `drop-shadow(${cfg.glow})` }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }}
                className="text-[15vw] leading-none">
                {cfg.icon}
              </motion.div>
              <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                <p className="font-display text-[8vw] leading-none" style={{ color: cfg.accent }}>
                  {cfg.label}
                </p>
              </motion.div>
              <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
                className={`border ${cfg.border} rounded-3xl px-16 py-8 backdrop-blur-sm bg-white/5`}>
                <p className="text-[6vw] font-bold text-white leading-none">{lastScan.client_name}</p>
                {lastScan.remaining_accesses !== null && lastScan.remaining_accesses !== undefined && (
                  <p className="text-2xl mt-4" style={{ color: cfg.accent }}>
                    {lastScan.remaining_accesses} accesos restantes
                  </p>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import {
  MinimalGlowIdle, MinimalGlowResult,
  NeonPanelsIdle, NeonPanelsResult,
  DarkEleganceIdle, DarkEleganceResult,
  DynamicGeometryIdle, DynamicGeometryResult
} from "@/components/PublicScreenDesigns";

const IDLE_TIMEOUT = 5 * 60 * 1000;
const SCAN_DISPLAY_TIMEOUT = 3500;

const DESIGNS = {
  minimal_glow:       { Idle: MinimalGlowIdle,       Result: MinimalGlowResult },
  neon_panels:        { Idle: NeonPanelsIdle,         Result: NeonPanelsResult },
  dark_elegance:      { Idle: DarkEleganceIdle,       Result: DarkEleganceResult },
  dynamic_geometry:   { Idle: DynamicGeometryIdle,    Result: DynamicGeometryResult },
};

function playSound(type) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const sounds = {
    success:           [{ freq: 523, dur: 0.12 }, { freq: 659, dur: 0.12 }, { freq: 784, dur: 0.2 }],
    expiring:          [{ freq: 440, dur: 0.15 }, { freq: 370, dur: 0.25 }],
    expired:           [{ freq: 300, dur: 0.2 },  { freq: 220, dur: 0.3 }],
    denied:            [{ freq: 300, dur: 0.2 },  { freq: 220, dur: 0.3 }],
    invalid:           [{ freq: 280, dur: 0.25 }, { freq: 200, dur: 0.35 }],
    already_registered:[{ freq: 520, dur: 0.1 },  { freq: 520, dur: 0.1 }, { freq: 520, dur: 0.15 }],
  };
  const notes = sounds[type] || sounds.invalid;
  let time = ctx.currentTime;
  notes.forEach(({ freq, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = type === "success" ? "sine" : "square";
    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.start(time); osc.stop(time + dur);
    time += dur + 0.04;
  });
}

export default function PublicScreen() {
  const [lastScan, setLastScan] = useState(null);
  const [showIdle, setShowIdle] = useState(false);
  const [gym, setGym] = useState(null);
  const [slideshowImages, setSlideshowImages] = useState([]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [rutInput, setRutInput] = useState("");
  const [rutProcessing, setRutProcessing] = useState(false);
  const idleTimer = useRef(null);
  const scanBuffer = useRef("");
  const scanTimer = useRef(null);
  const processingRef = useRef(false);
  const rutInputRef = useRef(null);

  useEffect(() => {
    loadGym();
    startIdleTimer();
    const clock = setInterval(() => setCurrentTime(new Date()), 1000);

    const unsub = base44.entities.Attendance.subscribe((event) => {
      if (event.type === "create") showScanResult(event.data);
    });

    function handleKeyDown(e) {
      // Don't capture if RUT input is focused
      if (document.activeElement === rutInputRef.current) return;
      if (e.key === "Enter") {
        clearTimeout(scanTimer.current);
        const token = scanBuffer.current.trim();
        if (token.length > 4) {
          processLocalScan(token);
          scanBuffer.current = "";
        }
      } else if (e.key.length === 1 || ["-", "_"].includes(e.key)) {
        scanBuffer.current += e.key;
        clearTimeout(scanTimer.current);
        scanTimer.current = setTimeout(() => {
          const token = scanBuffer.current.trim();
          if (token.length > 4) {
            processLocalScan(token);
          }
          scanBuffer.current = "";
        }, 300);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearInterval(clock); unsub();
      clearTimeout(idleTimer.current); clearTimeout(scanTimer.current);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!showIdle || slideshowImages.length === 0) return;
    const t = setInterval(() => setSlideIndex(i => (i + 1) % slideshowImages.length), 6000);
    return () => clearInterval(t);
  }, [showIdle, slideshowImages]);

  async function processLocalScan(token) {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      const res = await base44.functions.invoke("validateQR", { token });
      if (res.data) showScanResult({ ...res.data, scan_result: res.data.status, client_name: res.data.client_name });
    } catch {
      showScanResult({ scan_result: "invalid", client_name: "Error de lectura", remaining_accesses: null });
    }
    processingRef.current = false;
  }

  async function processRut() {
    const rut = rutInput.trim();
    if (!rut || rutProcessing) return;
    setRutProcessing(true);
    setRutInput("");
    try {
      const res = await base44.functions.invoke("processManualAttendance", { rut });
      if (res.data) showScanResult({ ...res.data, scan_result: res.data.status });
    } catch {
      showScanResult({ scan_result: "invalid", client_name: "Error de lectura", remaining_accesses: null });
    }
    setRutProcessing(false);
  }

  async function loadGym() {
    const gyms = await base44.entities.Gym.list("-created_date", 1);
    if (gyms.length > 0) {
      setGym(gyms[0]);
      setSlideshowImages(gyms[0].slideshow_images?.filter(Boolean) || []);
    }
  }

  function showScanResult(data) {
    const soundType = data.scan_result === "success" && data.remaining_accesses === 0 ? "denied" : data.scan_result;
    playSound(soundType);
    setLastScan(data);
    setShowIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => { setLastScan(null); setShowIdle(true); }, SCAN_DISPLAY_TIMEOUT);
  }

  function startIdleTimer() {
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setShowIdle(true), IDLE_TIMEOUT);
  }

  const designKey = gym?.public_screen_design || "minimal_glow";
  const Design = DESIGNS[designKey] || DESIGNS.minimal_glow;

  return (
    <div className="fixed inset-0 overflow-hidden select-none">
      <AnimatePresence mode="wait">
        {showIdle || !lastScan ? (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0">
            {/* Slideshow override */}
            {(showIdle && slideshowImages.length > 0) ? (
              <>
                <AnimatePresence mode="wait">
                  <motion.img key={slideIndex} src={slideshowImages[slideIndex]}
                    initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 1 }} className="absolute inset-0 w-full h-full object-cover" />
                </AnimatePresence>
                <div className="absolute bottom-16 w-full text-center text-white/50 text-xl animate-pulse">Esperando escaneo QR...</div>
                <div className="absolute bottom-4 w-full flex justify-center px-8">
                  <div className="flex gap-2 bg-black/60 backdrop-blur rounded-xl px-4 py-3">
                    <input
                      ref={rutInputRef}
                      value={rutInput}
                      onChange={e => setRutInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') processRut(); }}
                      placeholder="Ingresa RUT para acceso manual..."
                      className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/40 text-sm w-64 outline-none focus:border-white/50"
                    />
                    <button onClick={processRut} disabled={rutProcessing || !rutInput.trim()}
                      className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm disabled:opacity-40 transition-colors">
                      {rutProcessing ? "..." : "Registrar"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Design.Idle gym={gym} currentTime={currentTime} />
                <div className="absolute bottom-8 w-full flex justify-center px-8">
                  <div className="flex gap-2 bg-black/60 backdrop-blur rounded-xl px-4 py-3">
                    <input
                      ref={rutInputRef}
                      value={rutInput}
                      onChange={e => setRutInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') processRut(); }}
                      placeholder="Ingresa RUT para acceso manual..."
                      className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/40 text-sm w-64 outline-none focus:border-white/50"
                    />
                    <button onClick={processRut} disabled={rutProcessing || !rutInput.trim()}
                      className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm disabled:opacity-40 transition-colors">
                      {rutProcessing ? "..." : "Registrar"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div key={lastScan?.id || "scan"} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0">
            <Design.Result scan={lastScan} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
import { motion } from "framer-motion";
import { toTitleCase } from "@/utils";

const resultConfig = {
  success:          { accent: "#22FF88", label: "ACCESO PERMITIDO",      icon: "✅", glow: "rgba(34,255,136,0.4)" },
  expiring:         { accent: "#FF7A00", label: "MEMBRESÍA POR VENCER",  icon: "⚠️", glow: "rgba(255,122,0,0.4)" },
  expired:          { accent: "#FF3B3B", label: "MEMBRESÍA VENCIDA",     icon: "❌", glow: "rgba(255,59,59,0.4)" },
  invalid:          { accent: "#FF3B3B", label: "CÓDIGO INVÁLIDO",       icon: "🚫", glow: "rgba(255,59,59,0.4)" },
  denied:           { accent: "#FF3B3B", label: "ACCESO DENEGADO",       icon: "⛔", glow: "rgba(255,59,59,0.4)" },
  already_registered: { accent: "#FFD700", label: "YA REGISTRADO HOY",  icon: "🕐", glow: "rgba(255,215,0,0.4)", subtitle: "Ya registraste tu asistencia hoy. ¡Nos vemos mañana!" }
};

function getEffectiveCfg(scan) {
  const key = scan?.scan_result === "success" && scan?.remaining_accesses === 0 ? "denied" : scan?.scan_result;
  return resultConfig[key] || resultConfig.success;
}

// ─────────────────────────────────────────────
// DISEÑO 1: Resplandor Minimalista
// ─────────────────────────────────────────────
export function MinimalGlowIdle({ gym, currentTime }) {
  return (
    <div className="absolute inset-0 bg-[#0B0B0B] flex flex-col items-center justify-center gap-8">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,59,59,0.06) 0%, transparent 70%)" }} />
      </div>
      <div className="relative z-10 text-center space-y-4">
        <h1 className="font-display text-[10vw] text-gradient">{gym?.name || "FITACCESS"}</h1>
        <p className="text-[2vw] text-white/40 font-light tracking-widest uppercase">Control inteligente de acceso</p>
        <div className="mt-6 text-[7vw] font-bold text-white tabular-nums">
          {currentTime.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <p className="text-[1.5vw] text-white/40">{currentTime.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</p>
        <p className="mt-8 text-[1.5vw] text-white/25 animate-pulse tracking-widest">ESPERANDO ESCANEO QR...</p>
      </div>
      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-10 py-5 border-t border-white/10">
        <p className="text-[1.1vw] text-white/25 tracking-wide">Sistema creado por <span className="text-white/40 font-semibold">Soluciones FML</span></p>
        {gym?.logo_url && <img src={gym.logo_url} alt={gym.name} className="max-h-[4vw] max-w-[14vw] object-contain opacity-70" />}
      </div>
    </div>
  );
}

export function MinimalGlowResult({ scan }) {
  const cfg = getEffectiveCfg(scan);
  return (
    <div className="absolute inset-0 bg-[#0B0B0B] flex flex-col items-center justify-center gap-10">
      <div className="absolute inset-0"
        style={{ background: `radial-gradient(circle at center, ${cfg.glow.replace("0.4","0.12")} 0%, transparent 65%)` }} />
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }}
        className="relative z-10 text-[12vw] leading-none">{cfg.icon}</motion.div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
        className="relative z-10 text-center space-y-4">
        <p className="font-display text-[7vw] leading-none" style={{ color: cfg.accent }}>{cfg.label}</p>
        <div className="border rounded-3xl px-16 py-8 bg-white/5 backdrop-blur-sm"
          style={{ borderColor: cfg.accent + "44" }}>
          <p className="text-[5vw] font-bold text-white">{toTitleCase(scan.client_name)}</p>
          {cfg.subtitle && <p className="text-[1.8vw] mt-2" style={{ color: cfg.accent }}>{cfg.subtitle}</p>}
          {!cfg.subtitle && scan.remaining_accesses != null &&
            <p className="text-[2vw] mt-3" style={{ color: cfg.accent }}>{scan.remaining_accesses} accesos restantes</p>}
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DISEÑO 2: Paneles y Neón
// ─────────────────────────────────────────────
export function NeonPanelsIdle({ gym, currentTime }) {
  return (
    <div className="absolute inset-0 bg-[#080810] flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-12 py-6 border-b border-white/10">
        <h1 className="font-display text-[5vw] text-gradient">{gym?.name || "FITACCESS"}</h1>
        <div className="text-right">
          <p className="text-[4vw] font-bold text-white tabular-nums">
            {currentTime.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-[1.2vw] text-white/40">{currentTime.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
      </div>
      {/* Center panel */}
      <div className="flex-1 flex items-center justify-center">
        <div className="border border-white/10 rounded-2xl px-20 py-16 bg-white/3 backdrop-blur-md text-center"
          style={{ boxShadow: "0 0 60px rgba(255,59,59,0.08), inset 0 0 40px rgba(255,255,255,0.02)" }}>
          <p className="text-[2vw] text-white/30 tracking-[0.5em] uppercase mb-4">Sistema de Acceso</p>
          <p className="text-[1.5vw] text-white/20 animate-pulse tracking-widest mt-8">⬛ Esperando escaneo QR...</p>
        </div>
      </div>
      {/* Bottom bar */}
      <div className="flex items-center justify-between px-12 py-4 border-t border-white/10">
        <p className="text-[1.1vw] text-white/25 tracking-wide">Sistema creado por <span className="text-white/40 font-semibold">Soluciones FML</span></p>
        {gym?.logo_url && <img src={gym.logo_url} alt={gym.name} className="max-h-[4vw] max-w-[14vw] object-contain opacity-70" />}
      </div>
    </div>
  );
}

export function NeonPanelsResult({ scan }) {
  const cfg = getEffectiveCfg(scan);
  return (
    <div className="absolute inset-0 bg-[#080810] flex flex-col items-center justify-center">
      <div className="absolute inset-0"
        style={{ background: `linear-gradient(135deg, #080810 0%, ${cfg.glow.replace("0.4","0.06")} 50%, #080810 100%)` }} />
      <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[70vw] mx-auto">
        <div className="rounded-2xl p-12 text-center"
          style={{ border: `2px solid ${cfg.accent}44`, boxShadow: `0 0 80px ${cfg.glow}, inset 0 0 40px ${cfg.glow.replace("0.4","0.04")}` }}>
          <div className="text-[10vw] mb-4">{cfg.icon}</div>
          <p className="font-display text-[6vw] leading-none mb-6" style={{ color: cfg.accent, textShadow: `0 0 40px ${cfg.glow}` }}>{cfg.label}</p>
          <div className="border-t pt-6" style={{ borderColor: cfg.accent + "33" }}>
            <p className="text-[4.5vw] font-bold text-white">{toTitleCase(scan.client_name)}</p>
            {cfg.subtitle && <p className="text-[1.8vw] mt-2" style={{ color: cfg.accent }}>{cfg.subtitle}</p>}
            {!cfg.subtitle && scan.remaining_accesses != null &&
              <p className="text-[2vw] mt-2" style={{ color: cfg.accent }}>{scan.remaining_accesses} accesos restantes</p>}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DISEÑO 3: Elegancia Oscura
// ─────────────────────────────────────────────
export function DarkEleganceIdle({ gym, currentTime }) {
  return (
    <div className="absolute inset-0 bg-[#080808] flex flex-col items-center justify-center">
      <div className="text-center space-y-6">
        <div className="w-24 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto" />
        <h1 className="font-display text-[11vw] text-white leading-none">{gym?.name || "FITACCESS"}</h1>
        <div className="w-24 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto" />
        <p className="text-[1.4vw] text-white/30 tracking-[0.4em] uppercase">Control inteligente de acceso</p>
        <div className="mt-10 text-[8vw] font-thin text-white/80 tabular-nums tracking-widest">
          {currentTime.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <p className="text-[1.3vw] text-white/25">{currentTime.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</p>
        <p className="mt-12 text-[1.2vw] text-white/15 tracking-[0.6em] animate-pulse uppercase">Esperando escaneo QR</p>
      </div>
      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-10 py-5 border-t border-white/5">
        <p className="text-[1.1vw] text-white/20 tracking-wide">Sistema creado por <span className="text-white/35 font-semibold">Soluciones FML</span></p>
        {gym?.logo_url && <img src={gym.logo_url} alt={gym.name} className="max-h-[4vw] max-w-[14vw] object-contain opacity-60" />}
      </div>
    </div>
  );
}

export function DarkEleganceResult({ scan }) {
  const cfg = getEffectiveCfg(scan);
  return (
    <div className="absolute inset-0 bg-[#080808] flex flex-col items-center justify-center gap-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-8">
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 14 }}
          className="text-[11vw] leading-none" style={{ filter: `drop-shadow(0 0 30px ${cfg.glow})` }}>
          {cfg.icon}
        </motion.div>
        <div className="w-32 h-px mx-auto" style={{ background: cfg.accent + "88" }} />
        <p className="font-display text-[6.5vw] leading-none tracking-wider" style={{ color: cfg.accent }}>{cfg.label}</p>
        <div className="w-32 h-px mx-auto" style={{ background: cfg.accent + "44" }} />
        <p className="text-[5vw] font-light text-white tracking-wide">{toTitleCase(scan.client_name)}</p>
        {cfg.subtitle && <p className="text-[1.8vw] font-light" style={{ color: cfg.accent }}>{cfg.subtitle}</p>}
        {!cfg.subtitle && scan.remaining_accesses != null &&
          <p className="text-[2vw] font-light" style={{ color: cfg.accent + "cc" }}>{scan.remaining_accesses} accesos restantes</p>}
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DISEÑO 4: Geometría Dinámica
// ─────────────────────────────────────────────
export function DynamicGeometryIdle({ gym, currentTime }) {
  return (
    <div className="absolute inset-0 bg-[#0A0A0F] flex flex-col items-center justify-center overflow-hidden">
      {/* Diagonal lines BG */}
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: "repeating-linear-gradient(45deg, #FF3B3B 0px, #FF3B3B 1px, transparent 1px, transparent 40px)" }} />
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-24 h-24 border-t-2 border-l-2 border-primary/40" />
      <div className="absolute top-0 right-0 w-24 h-24 border-t-2 border-r-2 border-primary/40" />
      <div className="absolute bottom-0 left-0 w-24 h-24 border-b-2 border-l-2 border-primary/40" />
      <div className="absolute bottom-0 right-0 w-24 h-24 border-b-2 border-r-2 border-primary/40" />
      <div className="relative z-10 text-center space-y-4">
        <h1 className="font-display text-[10vw] text-gradient skew-x-[-3deg] inline-block">{gym?.name || "FITACCESS"}</h1>
        <p className="text-[1.5vw] text-white/40 tracking-widest uppercase">Control inteligente de acceso</p>
        <div className="mt-8 flex items-center gap-6 justify-center">
          <div className="w-8 h-0.5 bg-primary/50" />
          <p className="text-[6vw] font-bold text-white tabular-nums">{currentTime.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</p>
          <div className="w-8 h-0.5 bg-primary/50" />
        </div>
        <p className="text-[1.3vw] text-white/35">{currentTime.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</p>
        <p className="mt-10 text-[1.3vw] text-white/20 tracking-[0.5em] animate-pulse uppercase">⬥ Esperando escaneo QR ⬥</p>
      </div>
      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-10 py-5 border-t border-white/10 z-10">
        <p className="text-[1.1vw] text-white/25 tracking-wide">Sistema creado por <span className="text-white/40 font-semibold">Soluciones FML</span></p>
        {gym?.logo_url && <img src={gym.logo_url} alt={gym.name} className="max-h-[4vw] max-w-[14vw] object-contain opacity-70" />}
      </div>
    </div>
  );
}

export function DynamicGeometryResult({ scan }) {
  const cfg = getEffectiveCfg(scan);
  return (
    <div className="absolute inset-0 bg-[#0A0A0F] flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "repeating-linear-gradient(45deg, #FF3B3B 0px, #FF3B3B 1px, transparent 1px, transparent 40px)" }} />
      <div className="absolute top-0 left-0 w-24 h-24 border-t-2 border-l-2" style={{ borderColor: cfg.accent + "60" }} />
      <div className="absolute top-0 right-0 w-24 h-24 border-t-2 border-r-2" style={{ borderColor: cfg.accent + "60" }} />
      <div className="absolute bottom-0 left-0 w-24 h-24 border-b-2 border-l-2" style={{ borderColor: cfg.accent + "60" }} />
      <div className="absolute bottom-0 right-0 w-24 h-24 border-b-2 border-r-2" style={{ borderColor: cfg.accent + "60" }} />
      <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
        className="relative z-10 text-center space-y-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 10 }}
          className="text-[10vw] leading-none">{cfg.icon}</motion.div>
        <div className="px-16 py-6" style={{ borderLeft: `4px solid ${cfg.accent}`, borderRight: `4px solid ${cfg.accent}` }}>
          <p className="font-display text-[6vw] leading-none" style={{ color: cfg.accent }}>{cfg.label}</p>
        </div>
        <p className="text-[4.5vw] font-bold text-white">{toTitleCase(scan.client_name)}</p>
        {cfg.subtitle && <p className="text-[1.8vw]" style={{ color: cfg.accent }}>{cfg.subtitle}</p>}
        {!cfg.subtitle && scan.remaining_accesses != null &&
          <p className="text-[2vw]" style={{ color: cfg.accent }}>{scan.remaining_accesses} accesos restantes</p>}
      </motion.div>
    </div>
  );
}
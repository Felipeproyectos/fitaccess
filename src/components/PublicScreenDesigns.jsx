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
    <div className="absolute inset-0 bg-[#0B0B0B] flex flex-col items-center justify-center gap-8 px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vmin] h-[80vmin] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,59,59,0.06) 0%, transparent 70%)" }} />
      </div>
      <div className="relative z-10 text-center space-y-6 max-w-4xl">
        {gym?.logo_url
          ? <img src={gym.logo_url} alt={gym.name} className="h-32 object-contain mx-auto" />
          : <h1 className="font-display text-7xl md:text-8xl text-gradient">{gym?.name || "FITACCESS"}</h1>}
        <p className="text-lg md:text-2xl text-white/40 font-light tracking-widest uppercase">Control inteligente de acceso</p>
        <div className="mt-8 text-6xl md:text-7xl font-bold text-white tabular-nums">
          {currentTime.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <p className="text-base md:text-xl text-white/40">{currentTime.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</p>
        <p className="mt-8 text-lg md:text-2xl text-white/25 animate-pulse tracking-widest">ESPERANDO ESCANEO QR...</p>
      </div>
    </div>
  );
}

export function MinimalGlowResult({ scan }) {
  const cfg = getEffectiveCfg(scan);
  return (
    <div className="absolute inset-0 bg-[#0B0B0B] flex flex-col items-center justify-center gap-10 px-4">
      <div className="absolute inset-0"
        style={{ background: `radial-gradient(circle at center, ${cfg.glow.replace("0.4","0.12")} 0%, transparent 65%)` }} />
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }}
        className="relative z-10 text-7xl md:text-8xl leading-none">{cfg.icon}</motion.div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
        className="relative z-10 text-center space-y-4 max-w-4xl">
        <p className="font-display text-5xl md:text-6xl leading-none" style={{ color: cfg.accent }}>{cfg.label}</p>
        <div className="border rounded-3xl px-8 md:px-16 py-6 md:py-8 bg-white/5 backdrop-blur-sm"
          style={{ borderColor: cfg.accent + "44" }}>
          <p className="text-3xl md:text-5xl font-bold text-white">{toTitleCase(scan.client_name)}</p>
          {cfg.subtitle && <p className="text-base md:text-xl mt-2" style={{ color: cfg.accent }}>{cfg.subtitle}</p>}
          {!cfg.subtitle && scan.remaining_accesses != null &&
            <p className="text-lg md:text-2xl mt-3" style={{ color: cfg.accent }}>{scan.remaining_accesses} accesos restantes</p>}
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
    <div className="absolute inset-0 bg-[#080810] flex flex-col px-4">
      {/* Header bar */}
      <div className="flex items-center justify-between py-6 border-b border-white/10 gap-4">
        {gym?.logo_url
          ? <img src={gym.logo_url} alt={gym.name} className="h-20 object-contain" />
          : <h1 className="font-display text-4xl md:text-5xl text-gradient">{gym?.name || "FITACCESS"}</h1>}
        <div className="text-right">
          <p className="text-3xl md:text-4xl font-bold text-white tabular-nums">
            {currentTime.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-xs md:text-sm text-white/40">{currentTime.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
      </div>
      {/* Center panel */}
      <div className="flex-1 flex items-center justify-center">
        <div className="border border-white/10 rounded-2xl px-12 md:px-20 py-12 md:py-16 bg-white/3 backdrop-blur-md text-center max-w-2xl"
          style={{ boxShadow: "0 0 60px rgba(255,59,59,0.08), inset 0 0 40px rgba(255,255,255,0.02)" }}>
          <p className="text-sm md:text-lg text-white/30 tracking-[0.5em] uppercase mb-4">Sistema de Acceso</p>
          <p className="text-base md:text-lg text-white/20 animate-pulse tracking-widest mt-8">⬛ Esperando escaneo QR...</p>
        </div>
      </div>
    </div>
  );
}

export function NeonPanelsResult({ scan }) {
  const cfg = getEffectiveCfg(scan);
  return (
    <div className="absolute inset-0 bg-[#080810] flex flex-col items-center justify-center px-4">
      <div className="absolute inset-0"
        style={{ background: `linear-gradient(135deg, #080810 0%, ${cfg.glow.replace("0.4","0.06")} 50%, #080810 100%)` }} />
      <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-4xl mx-auto">
        <div className="rounded-2xl p-8 md:p-12 text-center"
          style={{ border: `2px solid ${cfg.accent}44`, boxShadow: `0 0 80px ${cfg.glow}, inset 0 0 40px ${cfg.glow.replace("0.4","0.04")}` }}>
          <div className="text-6xl md:text-8xl mb-4">{cfg.icon}</div>
          <p className="font-display text-4xl md:text-6xl leading-none mb-6" style={{ color: cfg.accent, textShadow: `0 0 40px ${cfg.glow}` }}>{cfg.label}</p>
          <div className="border-t pt-6" style={{ borderColor: cfg.accent + "33" }}>
            <p className="text-3xl md:text-5xl font-bold text-white">{toTitleCase(scan.client_name)}</p>
            {cfg.subtitle && <p className="text-base md:text-xl mt-2" style={{ color: cfg.accent }}>{cfg.subtitle}</p>}
            {!cfg.subtitle && scan.remaining_accesses != null &&
              <p className="text-lg md:text-2xl mt-2" style={{ color: cfg.accent }}>{scan.remaining_accesses} accesos restantes</p>}
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
    <div className="absolute inset-0 bg-[#080808] flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-4xl">
        <div className="w-24 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto" />
        {gym?.logo_url
          ? <img src={gym.logo_url} alt={gym.name} className="h-32 object-contain mx-auto" />
          : <h1 className="font-display text-6xl md:text-8xl text-white leading-none">{gym?.name || "FITACCESS"}</h1>}
        <div className="w-24 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto" />
        <p className="text-base md:text-xl text-white/30 tracking-[0.4em] uppercase">Control inteligente de acceso</p>
        <div className="mt-10 text-5xl md:text-7xl font-thin text-white/80 tabular-nums tracking-widest">
          {currentTime.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <p className="text-sm md:text-lg text-white/25">{currentTime.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</p>
        <p className="mt-12 text-sm md:text-base text-white/15 tracking-[0.6em] animate-pulse uppercase">Esperando escaneo QR</p>
      </div>
    </div>
  );
}

export function DarkEleganceResult({ scan }) {
  const cfg = getEffectiveCfg(scan);
  return (
    <div className="absolute inset-0 bg-[#080808] flex flex-col items-center justify-center gap-8 px-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-8 max-w-4xl">
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 14 }}
          className="text-6xl md:text-8xl leading-none" style={{ filter: `drop-shadow(0 0 30px ${cfg.glow})` }}>
          {cfg.icon}
        </motion.div>
        <div className="w-32 h-px mx-auto" style={{ background: cfg.accent + "88" }} />
        <p className="font-display text-4xl md:text-6xl leading-none tracking-wider" style={{ color: cfg.accent }}>{cfg.label}</p>
        <div className="w-32 h-px mx-auto" style={{ background: cfg.accent + "44" }} />
        <p className="text-3xl md:text-5xl font-light text-white tracking-wide">{toTitleCase(scan.client_name)}</p>
        {cfg.subtitle && <p className="text-base md:text-xl font-light" style={{ color: cfg.accent }}>{cfg.subtitle}</p>}
        {!cfg.subtitle && scan.remaining_accesses != null &&
          <p className="text-lg md:text-2xl font-light" style={{ color: cfg.accent + "cc" }}>{scan.remaining_accesses} accesos restantes</p>}
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DISEÑO 4: Geometría Dinámica
// ─────────────────────────────────────────────
export function DynamicGeometryIdle({ gym, currentTime }) {
  return (
    <div className="absolute inset-0 bg-[#0A0A0F] flex flex-col items-center justify-center overflow-hidden px-4">
      {/* Diagonal lines BG */}
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: "repeating-linear-gradient(45deg, #FF3B3B 0px, #FF3B3B 1px, transparent 1px, transparent 40px)" }} />
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-16 md:w-24 h-16 md:h-24 border-t-2 border-l-2 border-primary/40" />
      <div className="absolute top-0 right-0 w-16 md:w-24 h-16 md:h-24 border-t-2 border-r-2 border-primary/40" />
      <div className="absolute bottom-0 left-0 w-16 md:w-24 h-16 md:h-24 border-b-2 border-l-2 border-primary/40" />
      <div className="absolute bottom-0 right-0 w-16 md:w-24 h-16 md:h-24 border-b-2 border-r-2 border-primary/40" />
      <div className="relative z-10 text-center space-y-4 max-w-4xl">
        {gym?.logo_url
          ? <img src={gym.logo_url} alt={gym.name} className="h-32 object-contain mx-auto" />
          : <h1 className="font-display text-6xl md:text-8xl text-gradient skew-x-[-3deg] inline-block">{gym?.name || "FITACCESS"}</h1>}
        <p className="text-base md:text-xl text-white/40 tracking-widest uppercase">Control inteligente de acceso</p>
        <div className="mt-8 flex items-center gap-4 md:gap-6 justify-center flex-wrap">
          <div className="w-6 md:w-8 h-0.5 bg-primary/50" />
          <p className="text-4xl md:text-6xl font-bold text-white tabular-nums">{currentTime.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</p>
          <div className="w-6 md:w-8 h-0.5 bg-primary/50" />
        </div>
        <p className="text-sm md:text-lg text-white/35">{currentTime.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</p>
        <p className="mt-10 text-sm md:text-base text-white/20 tracking-[0.5em] animate-pulse uppercase">⬥ Esperando escaneo QR ⬥</p>
      </div>
    </div>
  );
}

export function DynamicGeometryResult({ scan }) {
  const cfg = getEffectiveCfg(scan);
  return (
    <div className="absolute inset-0 bg-[#0A0A0F] flex flex-col items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "repeating-linear-gradient(45deg, #FF3B3B 0px, #FF3B3B 1px, transparent 1px, transparent 40px)" }} />
      <div className="absolute top-0 left-0 w-16 md:w-24 h-16 md:h-24 border-t-2 border-l-2" style={{ borderColor: cfg.accent + "60" }} />
      <div className="absolute top-0 right-0 w-16 md:w-24 h-16 md:h-24 border-t-2 border-r-2" style={{ borderColor: cfg.accent + "60" }} />
      <div className="absolute bottom-0 left-0 w-16 md:w-24 h-16 md:h-24 border-b-2 border-l-2" style={{ borderColor: cfg.accent + "60" }} />
      <div className="absolute bottom-0 right-0 w-16 md:w-24 h-16 md:h-24 border-b-2 border-r-2" style={{ borderColor: cfg.accent + "60" }} />
      <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
        className="relative z-10 text-center space-y-6 max-w-4xl">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 10 }}
          className="text-6xl md:text-8xl leading-none">{cfg.icon}</motion.div>
        <div className="px-8 md:px-16 py-4 md:py-6" style={{ borderLeft: `4px solid ${cfg.accent}`, borderRight: `4px solid ${cfg.accent}` }}>
          <p className="font-display text-4xl md:text-6xl leading-none" style={{ color: cfg.accent }}>{cfg.label}</p>
        </div>
        <p className="text-3xl md:text-5xl font-bold text-white">{toTitleCase(scan.client_name)}</p>
        {cfg.subtitle && <p className="text-base md:text-xl" style={{ color: cfg.accent }}>{cfg.subtitle}</p>}
        {!cfg.subtitle && scan.remaining_accesses != null &&
          <p className="text-lg md:text-2xl" style={{ color: cfg.accent }}>{scan.remaining_accesses} accesos restantes</p>}
      </motion.div>
    </div>
  );
}
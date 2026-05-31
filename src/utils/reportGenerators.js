import { toTitleCase } from "@/utils";

// ======== HELPERS ========

const RESULT_LABELS = {
  success: "✓ Válido",
  expiring: "⚠ Por vencer",
  expired: "✕ Expirado",
  invalid: "✕ Inválido",
};

function dayOf(dateStr) {
  return dateStr?.split("T")[0] || dateStr || "—";
}

function timeOf(dateStr) {
  return dateStr?.includes("T") ? dateStr.split("T")[1]?.slice(0, 5) : "—";
}

// Each generator now returns { title, filename, headers, rows }

// ======== 1. ASISTENCIA DIARIA ========

export function buildDailyReport(records, clientMap, memMap, dateFrom, dateTo) {
  const byDay = {};
  records.forEach(r => {
    const day = dayOf(r.date);
    (byDay[day] ||= []).push(r);
  });

  const headers = ["Fecha", "Cliente", "Plan", "Resultado", "Accesos Restantes", "Hora"];
  const rows = [];
  Object.keys(byDay).sort((a, b) => b.localeCompare(a)).forEach(day => {
    byDay[day].sort((a, b) => (a.date || "").localeCompare(b.date || "")).forEach(r => {
      rows.push([
        day,
        toTitleCase(clientMap[r.client_id]?.name || r.client_name || "—"),
        memMap[r.membership_id]?.plan_name || "—",
        RESULT_LABELS[r.scan_result] || r.scan_result,
        r.remaining_accesses ?? "—",
        timeOf(r.date),
      ]);
    });
  });

  return { title: `Asistencia Diaria — ${dateFrom} al ${dateTo}`, filename: `asistencia_diaria_${dateFrom}_${dateTo}`, headers, rows };
}

// ======== 2. ASISTENCIA POR CLIENTE ========

export function buildByClientReport(records, clientMap, memMap, dateFrom, dateTo, selectedClientId) {
  if (selectedClientId) {
    const sorted = [...records].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const headers = ["Fecha", "Hora", "Plan", "Resultado", "Accesos Restantes"];
    const rows = sorted.map(r => [
      dayOf(r.date), timeOf(r.date),
      memMap[r.membership_id]?.plan_name || "—",
      RESULT_LABELS[r.scan_result] || r.scan_result,
      r.remaining_accesses ?? "—",
    ]);
    const clientName = toTitleCase(clientMap[selectedClientId]?.name || "Cliente");
    return { title: `Asistencia de ${clientName} — ${dateFrom} al ${dateTo}`, filename: `asistencia_${clientName.replace(/\s+/g, "_")}_${dateFrom}_${dateTo}`, headers, rows };
  }

  const byClient = {};
  records.forEach(r => { (byClient[r.client_id] ||= []).push(r); });

  const headers = ["Cliente", "Total Asistencias", "Última Asistencia", "Plan Actual", "Estado", "Detalle Fechas"];
  const rows = Object.entries(byClient)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([cid, recs]) => {
      const sorted = recs.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      const mem = Object.values(memMap).find(m => m.client_id === cid && (m.status === "active" || m.status === "expiring"));
      const dates = [...new Set(sorted.map(r => dayOf(r.date)))];
      return [
        toTitleCase(clientMap[cid]?.name || "—"),
        recs.length,
        dayOf(sorted[0]?.date),
        mem?.plan_name || "—",
        mem ? (mem.status === "active" ? "Activa" : "Por Vencer") : "Sin membresía",
        dates.slice(0, 10).join(", ") + (dates.length > 10 ? "..." : ""),
      ];
    });

  return { title: `Asistencia por Cliente — ${dateFrom} al ${dateTo}`, filename: `asistencia_por_cliente_${dateFrom}_${dateTo}`, headers, rows };
}

// ======== 3. MEMBRESÍAS ========

export function buildMembershipsReport(memberships, clientMap, dateFrom, dateTo) {
  const STATUS_LABELS = { active: "Activa", expiring: "Por Vencer", expired: "Expirada", pending: "Pendiente" };
  const TYPE_LABELS = { unlimited: "Ilimitado", limited: "Limitado", weekly: "Semanal", monthly: "Mensual", custom: "Personalizado" };

  const headers = ["Cliente", "Plan", "Tipo", "Estado", "Inicio", "Fin", "Accesos Restantes", "Precio"];
  const rows = memberships
    .sort((a, b) => (b.start_date || "").localeCompare(a.start_date || ""))
    .map(m => [
      toTitleCase(clientMap[m.client_id]?.name || "—"),
      m.plan_name || "—",
      TYPE_LABELS[m.type] || m.type || "—",
      STATUS_LABELS[m.status] || m.status || "—",
      m.start_date || "—",
      m.end_date || "—",
      m.remaining_accesses ?? "N/A",
      m.price != null ? `$${Number(m.price).toLocaleString("es-CL")}` : "—",
    ]);

  return { title: `Membresías — ${dateFrom} al ${dateTo}`, filename: `membresias_${dateFrom}_${dateTo}`, headers, rows };
}

// ======== 4. PAGOS ========

export function buildPaymentsReport(payments, clientMap, dateFrom, dateTo) {
  const headers = ["Fecha", "Cliente", "Plan", "Monto", "Método", "Confirmado", "Notas"];
  const totalAmount = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const rows = payments
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .map(p => [
      dayOf(p.date),
      toTitleCase(p.client_name || clientMap[p.client_id]?.name || "—"),
      p.plan_name || "—",
      p.amount != null ? `$${Number(p.amount).toLocaleString("es-CL")}` : "—",
      p.payment_method || "—",
      p.confirmed ? "Sí" : "No",
      p.notes || "",
    ]);
  rows.push(["", "", "TOTAL", `$${totalAmount.toLocaleString("es-CL")}`, "", "", ""]);

  return { title: `Pagos — ${dateFrom} al ${dateTo}`, filename: `pagos_${dateFrom}_${dateTo}`, headers, rows };
}

// ======== 5. CLIENTES ========

export function buildClientsReport(clientsList, memberships, payments) {
  const headers = ["Nombre", "RUT", "Email", "Teléfono", "Estado", "Plan Actual", "Vencimiento", "Último Pago", "Notas"];
  const rows = clientsList
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"))
    .map(c => {
      const mem = memberships.find(m => m.client_id === c.id && (m.status === "active" || m.status === "expiring"));
      const lastPayment = payments.filter(p => p.client_id === c.id && p.confirmed).sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
      return [
        toTitleCase(c.name),
        c.rut || "—",
        c.email || "—",
        c.phone || "—",
        c.active === false ? "Inactivo" : mem ? (mem.status === "active" ? "Activo" : "Por Vencer") : "Sin membresía",
        mem?.plan_name || "—",
        mem?.end_date || "—",
        lastPayment ? `${dayOf(lastPayment.date)} - $${Number(lastPayment.amount || 0).toLocaleString("es-CL")}` : "Sin pagos",
        c.notes || "",
      ];
    });

  return { title: "Listado Completo de Clientes", filename: "clientes_completo", headers, rows };
}

// ======== 6. INGRESOS POR MÉTODO DE PAGO ========

export function buildIncomeByMethodReport(payments, dateFrom, dateTo) {
  const byMethod = {};
  let grandTotal = 0;
  payments.forEach(p => {
    if (!p.confirmed) return;
    const method = p.payment_method || "Sin especificar";
    if (!byMethod[method]) byMethod[method] = { count: 0, total: 0 };
    byMethod[method].count++;
    byMethod[method].total += p.amount || 0;
    grandTotal += p.amount || 0;
  });

  const headers = ["Método de Pago", "Cantidad de Pagos", "Monto Total", "% del Total"];
  const rows = Object.entries(byMethod)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([method, data]) => [
      method, data.count,
      `$${data.total.toLocaleString("es-CL")}`,
      grandTotal > 0 ? `${((data.total / grandTotal) * 100).toFixed(1)}%` : "0%",
    ]);
  rows.push(["TOTAL", payments.filter(p => p.confirmed).length, `$${grandTotal.toLocaleString("es-CL")}`, "100%"]);

  return { title: `Ingresos por Método de Pago — ${dateFrom} al ${dateTo}`, filename: `ingresos_por_metodo_${dateFrom}_${dateTo}`, headers, rows };
}

// ======== 7. MEMBRESÍAS VENCIDAS / POR VENCER ========

export function buildExpiringReport(memberships, clientMap) {
  const STATUS_LABELS = { expiring: "Por Vencer", expired: "Expirada" };
  const relevant = memberships.filter(m => m.status === "expiring" || m.status === "expired");

  const headers = ["Cliente", "Plan", "Estado", "Fin", "Accesos Restantes", "Precio"];
  const rows = relevant
    .sort((a, b) => (a.end_date || "").localeCompare(b.end_date || ""))
    .map(m => [
      toTitleCase(clientMap[m.client_id]?.name || "—"),
      m.plan_name || "—",
      STATUS_LABELS[m.status] || m.status,
      m.end_date || "—",
      m.remaining_accesses ?? "N/A",
      m.price != null ? `$${Number(m.price).toLocaleString("es-CL")}` : "—",
    ]);

  return { title: "Membresías Vencidas y Por Vencer", filename: "membresias_vencidas", headers, rows };
}

// ======== 8. PAGOS PENDIENTES ========

export function buildPendingPaymentsReport(payments, clientMap) {
  const pending = payments.filter(p => !p.confirmed);
  const headers = ["Fecha", "Cliente", "Plan", "Monto", "Método", "Notas"];
  const totalPending = pending.reduce((s, p) => s + (p.amount || 0), 0);
  const rows = pending
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .map(p => [
      dayOf(p.date),
      toTitleCase(p.client_name || clientMap[p.client_id]?.name || "—"),
      p.plan_name || "—",
      p.amount != null ? `$${Number(p.amount).toLocaleString("es-CL")}` : "—",
      p.payment_method || "—",
      p.notes || "",
    ]);
  rows.push(["", "", "TOTAL PENDIENTE", `$${totalPending.toLocaleString("es-CL")}`, "", ""]);

  return { title: "Pagos Pendientes de Confirmación", filename: "pagos_pendientes", headers, rows };
}
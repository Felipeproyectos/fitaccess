import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const recentScans = new Map();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();
    if (!token) return Response.json({ status: 'invalid', message: 'Token requerido' });

    // Anti double-scan (10 seconds)
    const now = Date.now();
    if (recentScans.has(token)) {
      if (now - recentScans.get(token) < 10000) {
        return Response.json({ status: 'invalid', message: 'Escaneo duplicado, espera unos segundos' });
      }
    }

    // Find active QR
    const qrCodes = await base44.asServiceRole.entities.QRCode.filter({ token, active: true });
    if (!qrCodes.length) {
      return Response.json({ status: 'invalid', message: 'Código QR inválido o ya utilizado' });
    }
    const qrCode = qrCodes[0];

    const memberships = await base44.asServiceRole.entities.Membership.filter({ id: qrCode.membership_id });
    const membership = memberships[0];
    if (!membership) return Response.json({ status: 'invalid', message: 'Membresía no encontrada' });

    const clients = await base44.asServiceRole.entities.Client.filter({ id: qrCode.client_id });
    const client = clients[0];
    if (!client) return Response.json({ status: 'invalid', message: 'Cliente no encontrado' });

    const today = new Date().toISOString().split('T')[0];
    const isSinglePass = membership.type === 'single_pass';
    const isFreePass = membership.type === 'free_pass';

    // Free pass: only valid on its specific date
    if (isFreePass) {
      if (today !== membership.start_date) {
        return Response.json({ status: 'expired', client_name: client.name, message: `Pase libre solo válido el ${membership.start_date}` });
      }
      // Deactivate QR after use
      await base44.asServiceRole.entities.QRCode.update(qrCode.id, { active: false });
      await base44.asServiceRole.entities.Membership.update(membership.id, { status: 'expired', remaining_accesses: 0 });
      await recordAttendance(base44, client, membership, 'success', 0);
      return Response.json({ status: 'success', client_name: client.name, message: '🎟 Pase libre usado — acceso permitido', end_date: membership.end_date });
    }

    // Single pass: deactivate after first scan
    if (isSinglePass) {
      await base44.asServiceRole.entities.QRCode.update(qrCode.id, { active: false });
      await base44.asServiceRole.entities.Membership.update(membership.id, { status: 'expired', remaining_accesses: 0 });
      await recordAttendance(base44, client, membership, 'success', 0);
      recentScans.set(token, now);
      setTimeout(() => recentScans.delete(token), 10000);
      return Response.json({ status: 'success', client_name: client.name, message: '⚡ Pase único usado — acceso permitido' });
    }

    // Regular membership: check expiration date
    if (membership.end_date && today > membership.end_date) {
      await base44.asServiceRole.entities.Membership.update(membership.id, { status: 'expired' });
      await recordAttendance(base44, client, membership, 'expired', null);
      return Response.json({ status: 'expired', client_name: client.name, message: 'Membresía vencida' });
    }

    // Check if start_date hasn't arrived yet
    if (membership.start_date && today < membership.start_date) {
      return Response.json({ status: 'invalid', client_name: client.name, message: `Membresía inicia el ${membership.start_date}` });
    }

    // Limited accesses
    let remainingAccesses = membership.remaining_accesses;
    let scanResult = 'success';

    if (membership.type === 'limited' && membership.max_accesses) {
      if (remainingAccesses <= 0) {
        await base44.asServiceRole.entities.Membership.update(membership.id, { status: 'expired' });
        await recordAttendance(base44, client, membership, 'expired', 0);
        return Response.json({ status: 'expired', client_name: client.name, message: 'Sin accesos disponibles' });
      }
      remainingAccesses = (membership.remaining_accesses ?? membership.max_accesses) - 1;
      scanResult = remainingAccesses <= 3 ? 'expiring' : 'success';
      await base44.asServiceRole.entities.Membership.update(membership.id, {
        remaining_accesses: remainingAccesses,
        status: remainingAccesses <= 3 ? 'expiring' : 'active'
      });
    } else {
      const daysLeft = Math.ceil((new Date(membership.end_date) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 3) {
        scanResult = 'expiring';
        await base44.asServiceRole.entities.Membership.update(membership.id, { status: 'expiring' });
      }
    }

    recentScans.set(token, now);
    setTimeout(() => recentScans.delete(token), 10000);
    await recordAttendance(base44, client, membership, scanResult, remainingAccesses);

    return Response.json({
      status: scanResult,
      client_name: client.name,
      remaining_accesses: membership.type === 'limited' ? remainingAccesses : undefined,
      end_date: membership.end_date,
      message: scanResult === 'expiring' ? 'Membresía por vencer' : 'Acceso permitido'
    });

  } catch (error) {
    return Response.json({ status: 'error', message: error.message }, { status: 500 });
  }
});

async function recordAttendance(base44, client, membership, scanResult, remainingAccesses) {
  await base44.asServiceRole.entities.Attendance.create({
    client_id: client.id,
    client_name: client.name,
    membership_id: membership.id,
    gym_id: client.gym_id || 'default',
    date: new Date().toISOString().split('T')[0],
    scan_result: scanResult,
    remaining_accesses: remainingAccesses
  });
}
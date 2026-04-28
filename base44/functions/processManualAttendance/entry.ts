import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { rut } = await req.json();
    if (!rut) return Response.json({ error: 'RUT requerido' }, { status: 400 });

    const normalizedRut = rut.trim().toLowerCase();

    // Find client by RUT
    const allClients = await base44.asServiceRole.entities.Client.list('-created_date', 500);
    const client = allClients.find(c => c.rut?.trim().toLowerCase() === normalizedRut);

    if (!client) {
      return Response.json({ status: 'invalid', message: 'Cliente no encontrado con ese RUT' });
    }

    // Find active membership
    const memberships = await base44.asServiceRole.entities.Membership.filter({ client_id: client.id });
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const activeMembership = memberships
      .filter(m => m.status === 'active' || m.status === 'expiring')
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

    // Block Sundays
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0) {
      return Response.json({ status: 'invalid', client_name: client.name, message: 'El gimnasio no abre los domingos' });
    }

    if (!activeMembership) {
      await base44.asServiceRole.entities.Attendance.create({
        client_id: client.id,
        client_name: client.name,
        gym_id: client.gym_id || 'default',
        date: today,
        scan_result: 'expired',
        remaining_accesses: null
      });
      return Response.json({ status: 'expired', client_name: client.name, message: 'Sin membresía activa' });
    }

    // Check expiry
    if (activeMembership.end_date && activeMembership.end_date < today) {
      await base44.asServiceRole.entities.Membership.update(activeMembership.id, { status: 'expired' });
      await base44.asServiceRole.entities.Attendance.create({
        client_id: client.id,
        client_name: client.name,
        membership_id: activeMembership.id,
        gym_id: client.gym_id || 'default',
        date: today,
        scan_result: 'expired',
        remaining_accesses: 0
      });
      return Response.json({ status: 'expired', client_name: client.name, message: 'Membresía vencida' });
    }

    // Check remaining accesses for limited plans
    if (activeMembership.remaining_accesses !== null && activeMembership.remaining_accesses !== undefined) {
      if (activeMembership.remaining_accesses <= 0) {
        await base44.asServiceRole.entities.Membership.update(activeMembership.id, { status: 'expired' });
        await base44.asServiceRole.entities.Attendance.create({
          client_id: client.id,
          client_name: client.name,
          membership_id: activeMembership.id,
          gym_id: client.gym_id || 'default',
          date: today,
          scan_result: 'expired',
          remaining_accesses: 0
        });
        return Response.json({ status: 'expired', client_name: client.name, message: 'Sin accesos restantes' });
      }
    }

    // Determine scan_result
    const daysLeft = activeMembership.end_date
      ? Math.ceil((new Date(activeMembership.end_date) - now) / (1000 * 60 * 60 * 24))
      : 999;
    const remaining = activeMembership.remaining_accesses;
    const isExpiring = (remaining !== null && remaining !== undefined && remaining <= 3) || daysLeft <= 3;
    const scanResult = isExpiring ? 'expiring' : 'success';

    // Decrement accesses if limited
    let newRemaining = remaining;
    if (remaining !== null && remaining !== undefined) {
      newRemaining = remaining - 1;
      const newStatus = newRemaining <= 0 ? 'expired' : (newRemaining <= 3 ? 'expiring' : 'active');
      await base44.asServiceRole.entities.Membership.update(activeMembership.id, {
        remaining_accesses: newRemaining,
        status: newStatus
      });
    }

    await base44.asServiceRole.entities.Attendance.create({
      client_id: client.id,
      client_name: client.name,
      membership_id: activeMembership.id,
      gym_id: client.gym_id || 'default',
      date: today,
      scan_result: scanResult,
      remaining_accesses: newRemaining
    });

    return Response.json({
      status: scanResult,
      client_name: client.name,
      remaining_accesses: newRemaining,
      plan_name: activeMembership.plan_name
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
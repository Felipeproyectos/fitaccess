import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
  return token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { payment_id } = await req.json();
    if (!payment_id) return Response.json({ error: 'payment_id required' }, { status: 400 });

    const payments = await base44.asServiceRole.entities.Payment.filter({ id: payment_id });
    const payment = payments[0];
    if (!payment) return Response.json({ error: 'Payment not found' }, { status: 404 });
    if (payment.confirmed) return Response.json({ error: 'Payment already confirmed' }, { status: 400 });

    // Fetch client, plan and old QRs in parallel
    const [clientsArr, plansArr, oldQRs] = await Promise.all([
      base44.asServiceRole.entities.Client.filter({ id: payment.client_id }),
      base44.asServiceRole.entities.MembershipPlan.filter({ id: payment.plan_id }),
      base44.asServiceRole.entities.QRCode.filter({ client_id: payment.client_id, active: true })
    ]);

    const client = clientsArr[0];
    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });
    const plan = plansArr[0];
    if (!plan) return Response.json({ error: 'Plan not found' }, { status: 404 });

    // Invalidate old QRs in parallel
    await Promise.all(oldQRs.map(qr => base44.asServiceRole.entities.QRCode.update(qr.id, { active: false })));

    const isSinglePass = plan.type === 'single_pass';
    const isFreePass = plan.type === 'free_pass';

    let startStr, endStr, remainingAccesses, membershipStatus;

    if (isSinglePass) {
      startStr = new Date().toISOString().split('T')[0];
      endStr = startStr;
      remainingAccesses = 1;
      membershipStatus = 'active';
    } else if (isFreePass) {
      startStr = payment.use_date || new Date().toISOString().split('T')[0];
      endStr = startStr;
      remainingAccesses = 1;
      membershipStatus = 'active';
    } else {
      const startDate = payment.start_date ? new Date(payment.start_date) : new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (plan.duration_days || 30));
      startStr = startDate.toISOString().split('T')[0];
      endStr = endDate.toISOString().split('T')[0];
      remainingAccesses = (plan.type === 'limited' && plan.max_accesses) ? plan.max_accesses : null;
      const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
      membershipStatus = (remainingAccesses !== null && remainingAccesses <= 3) || daysLeft <= 3 ? 'expiring' : 'active';
    }

    // Create membership
    const membership = await base44.asServiceRole.entities.Membership.create({
      client_id: client.id,
      gym_id: client.gym_id || 'default',
      plan_id: plan.id,
      plan_name: plan.name,
      type: plan.type,
      start_date: startStr,
      end_date: endStr,
      max_accesses: remainingAccesses,
      remaining_accesses: remainingAccesses,
      status: membershipStatus,
      price: plan.price
    });

    // Generate QR token and confirm payment in parallel
    const token = generateToken();
    const [qrCode] = await Promise.all([
      base44.asServiceRole.entities.QRCode.create({
        client_id: client.id,
        membership_id: membership.id,
        gym_id: client.gym_id || 'default',
        token,
        active: true
      }),
      base44.asServiceRole.entities.Payment.update(payment_id, {
        confirmed: true,
        confirmed_date: new Date().toISOString().split('T')[0]
      })
    ]);

    // Send email fire-and-forget (non-blocking)
    if (client.email) {
      let planDetails = '';
      if (isSinglePass) {
        planDetails = `<p style="margin:8px 0 0 0;color:#FF7A00;font-size:13px;">Pase Unico - se desactiva tras el primer escaneo</p>`;
      } else if (isFreePass) {
        planDetails = `<p style="margin:8px 0 0 0;color:#60a5fa;font-size:13px;">Pase Libre - valido el dia: <strong>${startStr}</strong></p>`;
      } else {
        planDetails = `
          <p style="margin:0 0 8px 0;color:#aaa;font-size:14px;">Vigencia</p>
          <p style="margin:0 0 8px 0;color:#fff;">${startStr} al ${endStr}</p>
          ${remainingAccesses ? `<p style="margin:4px 0 0 0;color:#FF7A00;">${remainingAccesses} accesos disponibles</p>` : ''}
        `;
      }

      const emailBody = `
        <div style="background:#0B0B0B;color:#fff;padding:40px;font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border-radius:12px;">
          <h1 style="color:#FF3B3B;font-size:32px;margin-bottom:8px;">Membresia Activada!</h1>
          <p style="color:#aaa;margin-bottom:24px;">Hola <strong style="color:#fff">${client.name}</strong>, tu membresia ha sido confirmada.</p>
          <div style="background:#1a1a1a;border-radius:8px;padding:20px;margin-bottom:24px;border:1px solid #333;">
            <p style="margin:0 0 8px 0;color:#aaa;font-size:14px;">Plan</p>
            <p style="margin:0 0 16px 0;color:#fff;font-size:18px;font-weight:bold;">${plan.name}</p>
            ${planDetails}
          </div>
          <div style="background:#fff;border-radius:8px;padding:20px;margin-bottom:24px;text-align:center;">
            <p style="margin:0 0 12px 0;color:#333;font-size:14px;">Tu codigo QR de acceso:</p>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(token)}&format=png&margin=10" alt="QR Code" style="width:200px;height:200px;display:block;margin:0 auto 12px auto;" />
            <p style="background:#f4f4f4;padding:10px;border-radius:6px;font-family:monospace;font-size:12px;color:#333;word-break:break-all;margin:0;">${token}</p>
            <p style="margin:8px 0 0 0;color:#999;font-size:12px;">Presenta este codigo en la entrada del gimnasio</p>
          </div>
          <p style="color:#666;font-size:12px;text-align:center;">FitAccess - Control inteligente de acceso</p>
        </div>
      `;

      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('resend')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'FitAccess <onboarding@resend.dev>',
          to: [client.email],
          subject: `Membresia activada - ${plan.name}`,
          html: emailBody
        })
      }).catch(() => {});
    }

    return Response.json({
      success: true,
      membership_id: membership.id,
      qr_token: token,
      qr_id: qrCode.id,
      start_date: startStr,
      end_date: endStr,
      plan_type: plan.type,
      email_sent: !!client.email
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
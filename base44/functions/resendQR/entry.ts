import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { client_id } = await req.json();
    if (!client_id) return Response.json({ error: 'client_id requerido' }, { status: 400 });

    // Fetch client and active QR in parallel
    const [clientsArr, qrCodes] = await Promise.all([
      base44.asServiceRole.entities.Client.filter({ id: client_id }),
      base44.asServiceRole.entities.QRCode.filter({ client_id, active: true })
    ]);

    const client = clientsArr[0];
    if (!client) return Response.json({ error: 'Cliente no encontrado' }, { status: 404 });
    if (!client.email) return Response.json({ error: 'El cliente no tiene email registrado' }, { status: 400 });
    if (!qrCodes.length) return Response.json({ error: 'No hay QR activo para este cliente' }, { status: 404 });

    const qr = qrCodes[0];
    const memberships = await base44.asServiceRole.entities.Membership.filter({ id: qr.membership_id });
    const membership = memberships[0];

    const planName = membership?.plan_name || 'Tu membresia';
    const endDate = membership?.end_date || '';

    let emailSent = false;
    let emailError = null;
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: client.email,
        subject: `Tu codigo QR de acceso - ${planName}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #111; color: #fff; padding: 32px; border-radius: 16px;">
            <h1 style="color: #FF3B3B; margin-bottom: 8px;">FitAccess</h1>
            <h2 style="color: #fff;">Hola ${client.name}</h2>
            <p style="color: #aaa;">Aqui esta tu codigo QR de acceso al gimnasio.</p>
            <div style="background: #fff; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qr.token)}&format=png&margin=10" alt="QR Code" style="width:200px;height:200px;display:block;margin:0 auto 12px auto;" />
              <p style="color: #333; font-size: 12px; font-family: monospace; word-break: break-all; margin:0;">${qr.token}</p>
            </div>
            <p style="color: #aaa; font-size: 13px;"><strong>Plan:</strong> ${planName}</p>
            ${endDate ? `<p style="color: #aaa; font-size: 13px;"><strong>Valido hasta:</strong> ${endDate}</p>` : ''}
            <p style="color: #555; font-size: 12px; margin-top: 24px;">Muestra este codigo en la entrada del gimnasio.</p>
          </div>
        `
      });
      emailSent = true;
    } catch (err) {
      emailError = err.message;
    }

    return Response.json({ success: true, email: client.email, email_sent: emailSent, email_error: emailError });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
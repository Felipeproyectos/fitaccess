import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { entity_id, type } = payload.event || {};
    const membershipData = payload.data;

    const clientId = membershipData?.client_id;
    if (!clientId) return Response.json({ ok: true, skipped: "no client_id" });

    // Get all memberships for this client
    const allMemberships = await base44.asServiceRole.entities.Membership.filter({ client_id: clientId });

    const hasActiveMembership = allMemberships.some(
      m => m.id !== entity_id && (m.status === 'active' || m.status === 'expiring')
    );

    // If no active membership remains, clear the payment method
    if (!hasActiveMembership) {
      await base44.asServiceRole.entities.Client.update(clientId, {
        preferred_payment_method: "no_especificado"
      });
    }

    return Response.json({ ok: true, clearedPayment: !hasActiveMembership });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
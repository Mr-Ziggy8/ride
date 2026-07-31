import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import Stripe from 'stripe';
import { adminDb } from './_lib/firebaseAdmin.js';

// Necessaire pour verifier la signature Stripe, qui porte sur le corps BRUT de
// la requete - un body deja parse en JSON par Vercel ne matcherait plus.
export const config = { api: { bodyParser: false } };

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

/** N'ecrase jamais un role deja egal ou superieur a 'paid' (moderator/admin,
 * ou 'paid' deja accorde) - evite qu'un rejeu du webhook ou un moderateur qui
 * testerait son propre paiement ne se retrouve retrograde. */
async function grantPaidRoleUnlessAlreadyHigher(uid: string): Promise<void> {
  const ref = adminDb.collection('roles').doc(uid);
  const snapshot = await ref.get();
  const currentType = snapshot.exists ? (snapshot.data()?.type as string | undefined) : undefined;
  if (currentType === 'moderator' || currentType === 'admin' || currentType === 'paid') return;

  await ref.set({
    type: 'paid',
    grantedAt: FieldValue.serverTimestamp(),
    grantedVia: 'stripe',
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const signature = req.headers['stripe-signature'];
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !stripeSecretKey || !webhookSecret) {
    console.error('Signature Stripe ou secrets serveur manquants.');
    res.status(500).json({ error: 'server_misconfigured' });
    return;
  }

  const stripe = new Stripe(stripeSecretKey);
  const rawBody = await readRawBody(req);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Signature webhook invalide', err);
    res.status(400).json({ error: 'invalid_signature' });
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const uid = session.client_reference_id ?? (session.metadata?.uid as string | undefined);
    if (uid && session.payment_status === 'paid') {
      await grantPaidRoleUnlessAlreadyHigher(uid);
    }
  }

  res.status(200).json({ received: true });
}

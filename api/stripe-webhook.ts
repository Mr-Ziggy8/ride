import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { grantPaidRoleUnlessAlreadyHigher } from './_lib/roles.js';

// Necessaire pour verifier la signature Stripe, qui porte sur le corps BRUT de
// la requete - un body deja parse en JSON par Vercel ne matcherait plus.
export const config = { api: { bodyParser: false } };

// Cree une seule fois par instance chaude plutot qu'a chaque requete.
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !stripe || !webhookSecret) {
    console.error('Signature Stripe absente ou secrets serveur manquants.');
    res.status(500).json({ error: 'server_misconfigured' });
    return;
  }

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
      // Pas de try/catch ici : une erreur Firestore transitoire doit faire
      // echouer la reponse (non-2xx) pour que Stripe rejoue le webhook plus
      // tard - l'avaler silencieusement perdrait un paiement reel.
      await grantPaidRoleUnlessAlreadyHigher(uid, 'stripe');
    }
  }

  res.status(200).json({ received: true });
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { adminAuth } from './_lib/firebaseAdmin.js';

const FALLBACK_SITE_URL = 'https://ride-lyart.vercel.app';

/** uid verifie via le token Firebase envoye par le client (Authorization: Bearer <idToken>) -
 * jamais un uid brut fourni par le client, qui pourrait sinon usurper n'importe quel compte. */
async function resolveUid(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization;
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  if (!idToken) throw new Error('missing_token');

  const decoded = await adminAuth.verifyIdToken(idToken);
  return decoded.uid;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!stripeSecretKey || !priceId) {
    console.error('STRIPE_SECRET_KEY ou STRIPE_PRICE_ID manquant.');
    res.status(500).json({ error: 'server_misconfigured' });
    return;
  }

  let uid: string;
  try {
    uid = await resolveUid(req);
  } catch {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const siteUrl = (req.headers.origin as string | undefined) ?? FALLBACK_SITE_URL;
  const stripe = new Stripe(stripeSecretKey);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: uid,
      metadata: { uid },
      success_url: `${siteUrl}/?checkout=success`,
      cancel_url: `${siteUrl}/?checkout=cancel`,
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'stripe_error' });
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { getAdminAuth } from './_lib/firebaseAdmin.js';

const FALLBACK_SITE_URL = 'https://ride-lyart.vercel.app';

// Cree une seule fois par instance chaude de la fonction plutot qu'a chaque
// requete - la cle ne change pas entre deux invocations, et ca reutilise le
// pool de connexions HTTP du SDK Stripe.
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

/** uid verifie via le token Firebase envoye par le client (Authorization: Bearer <idToken>) -
 * jamais un uid brut fourni par le client, qui pourrait sinon usurper n'importe quel compte. */
async function resolveUid(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization;
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  if (!idToken) throw new Error('missing_token');

  const decoded = await getAdminAuth().verifyIdToken(idToken);
  return decoded.uid;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!stripe || !priceId) {
    console.error('STRIPE_SECRET_KEY ou STRIPE_PRICE_ID manquant.');
    res.status(500).json({ error: 'server_misconfigured' });
    return;
  }

  let uid: string;
  try {
    uid = await resolveUid(req);
  } catch (err) {
    console.error('Token invalide sur create-checkout-session', err);
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const siteUrl = (req.headers.origin as string | undefined) ?? FALLBACK_SITE_URL;

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
    console.error('Erreur creation session Stripe', { uid, err });
    res.status(500).json({ error: 'stripe_error' });
  }
}

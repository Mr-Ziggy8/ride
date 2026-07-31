import { useState } from 'react';
import type { User } from 'firebase/auth';

interface PremiumUnlockViewProps {
  user: User;
  onClose: () => void;
  onRoleGranted: () => void;
}

interface RedeemErrorBody {
  error?: string;
}

const PROMO_ERROR_MESSAGES: Record<string, string> = {
  code_not_found: 'Code invalide.',
  already_redeemed: 'Tu as déjà utilisé ce code.',
  cap_reached: "Ce code a atteint sa limite d'utilisations.",
  invalid_code_format: 'Format de code invalide.',
};

/** Ecran affiche a un Free-User qui accede a une feature payante (Statistiques,
 * Carnet de pleins). Deux chemins vers 'paid', tous les deux valides
 * uniquement cote serveur (api/) : paiement unique Stripe, ou code promo. */
export function PremiumUnlockView({ user, onClose, onRoleGranted }: PremiumUnlockViewProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [promoCode, setPromoCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState(false);

  const handleUpgrade = async () => {
    setIsRedirecting(true);
    setCheckoutError(null);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!response.ok) throw new Error('checkout_failed');
      const { url } = (await response.json()) as { url: string };
      window.location.href = url;
    } catch (err) {
      console.error(err);
      setCheckoutError('Impossible de démarrer le paiement. Réessaie.');
      setIsRedirecting(false);
    }
  };

  const handleRedeemPromoCode = async () => {
    const trimmed = promoCode.trim();
    if (!trimmed) return;

    setIsRedeeming(true);
    setPromoError(null);
    setPromoSuccess(false);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/redeem-promo-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ code: trimmed }),
      });
      const body = (await response.json()) as RedeemErrorBody;
      if (!response.ok) {
        setPromoError(PROMO_ERROR_MESSAGES[body.error ?? ''] ?? 'Échec de la validation. Réessaie.');
        return;
      }
      setPromoSuccess(true);
      setPromoCode('');
      onRoleGranted();
    } catch (err) {
      console.error(err);
      setPromoError('Échec de la validation. Réessaie.');
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <main className="my-rides-screen">
      <div className="my-rides-header">
        <h2>Débloquer les fonctionnalités premium</h2>
        <button type="button" className="button button-ghost" onClick={onClose}>
          Retour
        </button>
      </div>

      <div className="premium-unlock-body">
        <p>Débloque les statistiques avancées et le carnet de pleins, à vie, en un seul paiement.</p>

        {checkoutError && <p className="dialog-error">{checkoutError}</p>}

        <button type="button" className="button button-primary" onClick={handleUpgrade} disabled={isRedirecting}>
          {isRedirecting ? 'Redirection...' : 'Passer Premium'}
        </button>

        <label className="dialog-field">
          Code promo
          <input
            type="text"
            value={promoCode}
            onChange={(event) => {
              setPromoCode(event.target.value);
              setPromoError(null);
              setPromoSuccess(false);
            }}
            placeholder="Ex: LAUNCH100"
            maxLength={40}
            disabled={isRedeeming}
          />
        </label>

        {promoError && <p className="dialog-error">{promoError}</p>}
        {promoSuccess && <div className="banner banner-success">Code validé, tu es maintenant Premium !</div>}

        <button
          type="button"
          className="button button-ghost"
          onClick={handleRedeemPromoCode}
          disabled={isRedeeming || !promoCode.trim()}
        >
          {isRedeeming ? 'Validation...' : 'Valider le code'}
        </button>
      </div>
    </main>
  );
}

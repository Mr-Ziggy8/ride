import { useState } from 'react';
import type { User } from 'firebase/auth';

interface PremiumUnlockViewProps {
  user: User;
  onClose: () => void;
}

/** Ecran affiche a un Free-User qui accede a une feature payante (Statistiques,
 * Carnet de pleins). Paiement unique via Stripe Checkout (voir api/create-checkout-session,
 * api/stripe-webhook) - deblocage a vie, pas d'abonnement. La redemption de code
 * promo n'est elle pas encore branchee. */
export function PremiumUnlockView({ user, onClose }: PremiumUnlockViewProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setIsRedirecting(true);
    setError(null);
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
      setError('Impossible de démarrer le paiement. Réessaie.');
      setIsRedirecting(false);
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

        {error && <p className="dialog-error">{error}</p>}

        <button type="button" className="button button-primary" onClick={handleUpgrade} disabled={isRedirecting}>
          {isRedirecting ? 'Redirection...' : 'Passer Premium'}
        </button>

        <label className="dialog-field">
          Code promo
          <input type="text" placeholder="Bientôt disponible" disabled maxLength={40} />
        </label>
        <p className="my-rides-hint">La validation des codes promo n'est pas encore activée.</p>
      </div>
    </main>
  );
}

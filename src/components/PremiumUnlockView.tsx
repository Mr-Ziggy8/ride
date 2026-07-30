interface PremiumUnlockViewProps {
  onClose: () => void;
}

/** Ecran affiche a un Free-User qui accede a une feature payante (Statistiques,
 * Carnet de pleins). La redemption de code promo et le paiement Stripe ne sont
 * pas encore branches (necessitent une fonction serveur, voir premium_platform_specs.json). */
export function PremiumUnlockView({ onClose }: PremiumUnlockViewProps) {
  return (
    <main className="my-rides-screen">
      <div className="my-rides-header">
        <h2>Débloquer les fonctionnalités premium</h2>
        <button type="button" className="button button-ghost" onClick={onClose}>
          Retour
        </button>
      </div>

      <div className="premium-unlock-body">
        <p>Les statistiques avancées et le carnet de pleins arrivent bientôt en formule payante.</p>

        <label className="dialog-field">
          Code promo
          <input type="text" placeholder="Bientôt disponible" disabled maxLength={40} />
        </label>
        <p className="my-rides-hint">La validation des codes promo n'est pas encore activée.</p>
      </div>
    </main>
  );
}

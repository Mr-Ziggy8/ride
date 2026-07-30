interface StatisticsViewProps {
  onClose: () => void;
}

/** Placeholder pour les Paid-User/Moderator/Admin - le contenu reel (VMax,
 * inclinaison, comparaisons entre parcours) reste a specifier. */
export function StatisticsView({ onClose }: StatisticsViewProps) {
  return (
    <main className="my-rides-screen">
      <div className="my-rides-header">
        <h2>Statistiques</h2>
        <button type="button" className="button button-ghost" onClick={onClose}>
          Retour
        </button>
      </div>
      <p className="my-rides-hint">
        Bientôt : vitesse max, inclinaison, comparaisons entre parcours.
      </p>
    </main>
  );
}

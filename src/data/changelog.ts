export interface ChangelogEntry {
  dateIso: string;
  summary: string;
}

/** Mis a jour manuellement a chaque deploiement - CHANGELOG[0] est toujours la
 * derniere release. Un changelog qui n'est plus tenu a jour serait pire que
 * pas de changelog du tout (ca dirait "developpement a l'arret"). */
export const CHANGELOG: ChangelogEntry[] = [
  {
    dateIso: '2026-07-31',
    summary:
      "Nouvelle identité graphique, menu animé (tap extérieur pour fermer), chargement GPX déplacé dans le menu, retour toujours vers l'accueil, limite de 5 commentaires actifs, échantillonnage GPS plus fin pour des tracés fluides, écran d'accueil en cartes avec aperçu de tes stats.",
  },
  {
    dateIso: '2026-07-30',
    summary: 'Enregistrement de parcours en direct, menu unifié, carnet de pleins, export GPX.',
  },
];

export const LATEST_RELEASE: ChangelogEntry | null = CHANGELOG[0] ?? null;

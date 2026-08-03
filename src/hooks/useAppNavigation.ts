import { useCallback, useEffect, useRef, useState } from 'react';
import type { SidebarDestination } from '../components/AppSidebar';

export type ViewMode =
  | 'main'
  | 'upload'
  | 'my-rides'
  | 'discovery'
  | 'favorites'
  | 'fuel-log'
  | 'statistics'
  | 'vehicles'
  | 'badges'
  | 'feedback'
  | 'feedback-admin'
  | 'admin-roles';

export interface UseAppNavigationResult {
  view: ViewMode;
  /** Reset direct, sans depiler l'historique - reserve au filet de securite qui
   * ramene a main quand l'acces a la vue courante est perdu (deconnexion, role). */
  setView: (view: ViewMode) => void;
  isMenuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  closeView: () => void;
  navigateFromMenu: (destination: SidebarDestination) => void;
}

/**
 * Modele plat : un seul niveau d'historique au-dessus de main. On pousse une
 * entree la premiere fois qu'on quitte main (ouverture du menu) ; naviguer
 * menu -> vue -> menu -> vue ne pousse rien de plus. Revenir (bouton retour
 * Android/Chrome, tap en dehors du menu, ou le bouton "Retour" d'une vue)
 * ramene donc toujours directement a main, quel que soit le nombre de sauts.
 */
export function useAppNavigation(): UseAppNavigationResult {
  const [view, setView] = useState<ViewMode>('main');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const awayFromMainRef = useRef(false);

  const resetToMain = useCallback(() => {
    setView('main');
    setIsMenuOpen(false);
    awayFromMainRef.current = false;
  }, []);

  /** A utiliser pour toute navigation retour initiee par l'utilisateur (bouton
   * "Retour"/"Fermer", tap hors du menu) : depile la vraie entree d'historique
   * si on en a pousse une, pour rester en phase avec le bouton retour natif. */
  const closeView = useCallback(() => {
    const wasAway = awayFromMainRef.current;
    resetToMain();
    if (wasAway) window.history.back();
  }, [resetToMain]);

  const openMenu = useCallback(() => {
    if (!awayFromMainRef.current) {
      window.history.pushState({}, '');
      awayFromMainRef.current = true;
    }
    setIsMenuOpen(true);
  }, []);

  const navigateFromMenu = useCallback((destination: SidebarDestination) => {
    setView(destination);
    setIsMenuOpen(false);
  }, []);

  /** Fermer le menu (bouton "Fermer" ou tap en dehors) ne touche qu'a l'overlay -
   * contrairement a closeView (bouton "Retour" d'une vue, ou bouton retour natif),
   * ca ne ramene JAMAIS a main : ca revele simplement l'ecran deja ouvert avant
   * l'ouverture du menu (main si on y etait, ou une autre vue si le menu a ete
   * rouvert par-dessus). */
  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  useEffect(() => {
    // Le pop a deja eu lieu (geste utilisateur ou bouton retour natif) : on ne
    // fait que resynchroniser l'etat React, jamais un second history.back().
    window.addEventListener('popstate', resetToMain);
    return () => window.removeEventListener('popstate', resetToMain);
  }, [resetToMain]);

  return { view, setView, isMenuOpen, openMenu, closeMenu, closeView, navigateFromMenu };
}

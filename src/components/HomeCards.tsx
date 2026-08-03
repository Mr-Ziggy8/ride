import { useMemo } from 'react';
import type { User } from 'firebase/auth';
import { useMyRides } from '../hooks/useMyRides';
import { formatDistance } from '../utils/units';
import type { SidebarDestination } from './AppSidebar';
import type { UnitSystem } from '../types';

interface HomeCardsProps {
  user: User | null;
  unitSystem: UnitSystem;
  canAccessPremium: boolean;
  onNavigate: (destination: SidebarDestination) => void;
}

interface HomeCardDef {
  destination: SidebarDestination;
  icon: string;
  label: string;
}

const PUBLIC_CARDS: HomeCardDef[] = [
  { destination: 'upload', icon: '📤', label: 'Charger un GPX' },
  { destination: 'discovery', icon: '🧭', label: 'Découverte' },
];

const ACCOUNT_CARDS: HomeCardDef[] = [
  { destination: 'my-rides', icon: '🗂️', label: 'Mes parcours' },
  { destination: 'favorites', icon: '⭐', label: 'Mes favoris' },
  { destination: 'fuel-log', icon: '⛽', label: 'Carnet de pleins' },
  { destination: 'statistics', icon: '📊', label: 'Statistiques' },
  { destination: 'vehicles', icon: '🏍️', label: 'Mes véhicules' },
];

/** Distance/nombre de parcours "reels" uniquement (source recorded) - meme
 * logique que FuelLogView : un GPX uploade n'a pas forcement ete roule. */
function useRideOverview(user: User | null) {
  const { rides } = useMyRides(user);

  return useMemo(() => {
    if (!rides) return null;
    const recorded = rides.filter((ride) => ride.source === 'recorded');
    if (recorded.length === 0) return null;
    return {
      rideCount: recorded.length,
      totalMeters: recorded.reduce((sum, ride) => sum + ride.totalTrackDistanceMeters, 0),
    };
  }, [rides]);
}

export function HomeCards({ user, unitSystem, canAccessPremium, onNavigate }: HomeCardsProps) {
  const overview = useRideOverview(user);

  return (
    <div className="home-cards">
      <div className="home-cards-grid">
        {PUBLIC_CARDS.map((card) => (
          <button
            key={card.destination}
            type="button"
            className="home-card"
            onClick={() => onNavigate(card.destination)}
          >
            <span className="home-card-icon">{card.icon}</span>
            {card.label}
          </button>
        ))}
        {user &&
          ACCOUNT_CARDS.map((card) => (
            <button
              key={card.destination}
              type="button"
              className="home-card"
              onClick={() => onNavigate(card.destination)}
            >
              <span className="home-card-icon">{card.icon}</span>
              {card.label}
            </button>
          ))}
      </div>

      {/* Apercu gratuit (distance/nb de parcours) : cree l'envie sans exposer les
       * stats avancees, qui restent derriere le meme mur premium que StatisticsView. */}
      {user && overview && (
        <div className="home-stats-teaser">
          <dl className="progress-stats">
            <div className="progress-stat">
              <dt>Parcours enregistrés</dt>
              <dd>{overview.rideCount}</dd>
            </div>
            <div className="progress-stat">
              <dt>Distance totale</dt>
              <dd>{formatDistance(overview.totalMeters, unitSystem)}</dd>
            </div>
          </dl>
          <button type="button" className="button button-ghost" onClick={() => onNavigate('statistics')}>
            {canAccessPremium ? 'Voir les statistiques complètes' : 'Débloquer les statistiques avancées'}
          </button>
        </div>
      )}
    </div>
  );
}

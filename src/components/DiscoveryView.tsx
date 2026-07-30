import type { User } from 'firebase/auth';
import { useFavoriteToggle } from '../hooks/useFavoriteToggle';
import { usePublicRides } from '../hooks/usePublicRides';
import { formatDistance } from '../utils/units';
import { FavoriteStarButton } from './FavoriteStarButton';
import { RideListScreen } from './RideListScreen';
import type { Ride, UnitSystem } from '../types';

interface DiscoveryViewProps {
  user: User | null;
  unitSystem: UnitSystem;
  onLoadRide: (ride: Ride) => void;
  onClose: () => void;
}

export function DiscoveryView({ user, unitSystem, onLoadRide, onClose }: DiscoveryViewProps) {
  const { rides, isLoading, error } = usePublicRides();
  const { favoriteIds, isPending, toggleFavorite } = useFavoriteToggle(user);

  return (
    <RideListScreen
      title="Découverte"
      rides={rides}
      isLoading={isLoading}
      error={error}
      emptyMessage="Aucun parcours public pour l'instant."
      onClose={onClose}
      renderMeta={(ride) =>
        [
          formatDistance(ride.totalTrackDistanceMeters, unitSystem),
          ride.regionLabel,
          ride.ownerDisplayName,
          new Date(ride.createdAtMs).toLocaleDateString('fr-FR'),
        ]
          .filter(Boolean)
          .join(' · ')
      }
      renderActions={(ride) => (
        <>
          {user && (
            <FavoriteStarButton
              isFavorite={favoriteIds.has(ride.id)}
              isPending={isPending(ride.id)}
              onToggle={() => toggleFavorite(ride.id)}
            />
          )}
          <button type="button" className="button button-ghost" onClick={() => onLoadRide(ride)}>
            Suivre
          </button>
        </>
      )}
    />
  );
}

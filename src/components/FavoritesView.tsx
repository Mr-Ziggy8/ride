import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useFavoriteRides } from '../hooks/useFavoriteRides';
import { removeFavorite } from '../utils/favoriteStorage';
import { DEFAULT_RIDE_FILTERS, filterRides, type RideFiltersValue } from '../utils/rideFilters';
import { formatDistance } from '../utils/units';
import { DownloadGpxButton } from './DownloadGpxButton';
import { FavoriteStarButton } from './FavoriteStarButton';
import { RideFilters } from './RideFilters';
import { RideListScreen } from './RideListScreen';
import type { Ride, UnitSystem } from '../types';

interface FavoritesViewProps {
  user: User;
  unitSystem: UnitSystem;
  onLoadRide: (ride: Ride) => void;
  onClose: () => void;
}

export function FavoritesView({ user, unitSystem, onLoadRide, onClose }: FavoritesViewProps) {
  const { rides, isLoading, error, refresh } = useFavoriteRides(user);
  const [pendingRideId, setPendingRideId] = useState<string | null>(null);
  const [filters, setFilters] = useState<RideFiltersValue>(DEFAULT_RIDE_FILTERS);

  const handleRemove = async (rideId: string) => {
    setPendingRideId(rideId);
    try {
      await removeFavorite(user.uid, rideId);
      refresh();
    } catch (err) {
      console.error(err);
      setPendingRideId(null);
    }
  };

  const filteredRides = rides ? filterRides(rides, filters, unitSystem) : null;
  const emptyMessage =
    rides && rides.length > 0 ? 'Aucun parcours ne correspond aux filtres.' : 'Aucun parcours en favori pour l\'instant.';

  return (
    <RideListScreen
      title="Mes favoris"
      rides={filteredRides}
      isLoading={isLoading}
      error={error}
      emptyMessage={emptyMessage}
      onClose={onClose}
      filtersSlot={
        rides &&
        rides.length > 0 && <RideFilters rides={rides} unitSystem={unitSystem} value={filters} onChange={setFilters} />
      }
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
          <FavoriteStarButton
            isFavorite
            isPending={pendingRideId === ride.id}
            onToggle={() => handleRemove(ride.id)}
          />
          <button type="button" className="button button-ghost" onClick={() => onLoadRide(ride)}>
            Suivre
          </button>
          <DownloadGpxButton ride={ride} user={user} />
        </>
      )}
    />
  );
}

import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useFavoriteToggle } from '../hooks/useFavoriteToggle';
import { useMyRides } from '../hooks/useMyRides';
import { deleteRide } from '../utils/rideStorage';
import { DEFAULT_RIDE_FILTERS, filterRides, type RideFiltersValue } from '../utils/rideFilters';
import { formatDistance } from '../utils/units';
import { DeleteRideDialog } from './DeleteRideDialog';
import { DownloadGpxButton } from './DownloadGpxButton';
import { FavoriteStarButton } from './FavoriteStarButton';
import { RideFilters } from './RideFilters';
import { RideListScreen } from './RideListScreen';
import type { Ride, UnitSystem } from '../types';

interface MyRidesViewProps {
  user: User;
  unitSystem: UnitSystem;
  onLoadRide: (ride: Ride) => void;
  onClose: () => void;
}

export function MyRidesView({ user, unitSystem, onLoadRide, onClose }: MyRidesViewProps) {
  const { rides, isLoading, error, refresh } = useMyRides(user);
  const { favoriteIds, isPending, toggleFavorite } = useFavoriteToggle(user);
  const [pendingDelete, setPendingDelete] = useState<Ride | null>(null);
  const [filters, setFilters] = useState<RideFiltersValue>(DEFAULT_RIDE_FILTERS);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    await deleteRide(pendingDelete.id);
    setPendingDelete(null);
    refresh();
  };

  const filteredRides = rides ? filterRides(rides, filters, unitSystem) : null;
  const emptyMessage =
    rides && rides.length > 0 ? 'Aucun parcours ne correspond aux filtres.' : 'Aucun parcours sauvegardé pour l\'instant.';

  return (
    <>
      <RideListScreen
        title="Mes parcours"
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
            ride.visibility === 'public' ? 'Public' : 'Privé',
            new Date(ride.createdAtMs).toLocaleDateString('fr-FR'),
          ]
            .filter(Boolean)
            .join(' · ')
        }
        renderActions={(ride) => (
          <>
            <FavoriteStarButton
              isFavorite={favoriteIds.has(ride.id)}
              isPending={isPending(ride.id)}
              onToggle={() => toggleFavorite(ride.id)}
            />
            <button type="button" className="button button-ghost" onClick={() => onLoadRide(ride)}>
              Suivre
            </button>
            <DownloadGpxButton ride={ride} user={user} />
            <button type="button" className="button button-secondary" onClick={() => setPendingDelete(ride)}>
              Supprimer
            </button>
          </>
        )}
      />

      {pendingDelete && (
        <DeleteRideDialog
          ride={pendingDelete}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </>
  );
}

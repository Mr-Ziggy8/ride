import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useFavoriteToggle } from '../hooks/useFavoriteToggle';
import { usePublicRides } from '../hooks/usePublicRides';
import { renameRide, unpublishRide } from '../utils/rideStorage';
import { DEFAULT_RIDE_FILTERS, filterRides, type RideFiltersValue } from '../utils/rideFilters';
import { formatDistance } from '../utils/units';
import { DownloadGpxButton } from './DownloadGpxButton';
import { FavoriteStarButton } from './FavoriteStarButton';
import { RenameRideDialog } from './RenameRideDialog';
import { RideFilters } from './RideFilters';
import { RideListScreen } from './RideListScreen';
import { UnpublishRideDialog } from './UnpublishRideDialog';
import type { Ride, UnitSystem } from '../types';

interface DiscoveryViewProps {
  user: User | null;
  unitSystem: UnitSystem;
  /** Modo/admin avec "Options modo" active dans la sidebar - affiche Renommer/Supprimer
   * sur les parcours d'autrui. Masque par defaut pour ne pas polluer l'usage classique. */
  showModTools: boolean;
  onLoadRide: (ride: Ride) => void;
  onClose: () => void;
}

export function DiscoveryView({ user, unitSystem, showModTools, onLoadRide, onClose }: DiscoveryViewProps) {
  const { rides, isLoading, error, refresh } = usePublicRides();
  const { favoriteIds, isPending, toggleFavorite } = useFavoriteToggle(user);
  const [renamingRide, setRenamingRide] = useState<Ride | null>(null);
  const [unpublishingRide, setUnpublishingRide] = useState<Ride | null>(null);
  const [filters, setFilters] = useState<RideFiltersValue>(DEFAULT_RIDE_FILTERS);

  const handleConfirmRename = async (newTitle: string) => {
    if (!renamingRide) return;
    await renameRide(renamingRide.id, newTitle);
    setRenamingRide(null);
    refresh();
  };

  const handleConfirmUnpublish = async () => {
    if (!unpublishingRide) return;
    await unpublishRide(unpublishingRide.id);
    setUnpublishingRide(null);
    refresh();
  };

  const filteredRides = rides ? filterRides(rides, filters, unitSystem) : null;
  const emptyMessage =
    rides && rides.length > 0 ? 'Aucun parcours ne correspond aux filtres.' : "Aucun parcours public pour l'instant.";

  return (
    <>
      <RideListScreen
        title="Découverte"
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
            <DownloadGpxButton ride={ride} user={user} />
            {showModTools && (
              <>
                <button type="button" className="button button-ghost" onClick={() => setRenamingRide(ride)}>
                  Renommer
                </button>
                <button type="button" className="button button-secondary" onClick={() => setUnpublishingRide(ride)}>
                  Retirer
                </button>
              </>
            )}
          </>
        )}
      />

      {renamingRide && (
        <RenameRideDialog
          ride={renamingRide}
          onConfirm={handleConfirmRename}
          onCancel={() => setRenamingRide(null)}
        />
      )}

      {unpublishingRide && (
        <UnpublishRideDialog
          ride={unpublishingRide}
          onConfirm={handleConfirmUnpublish}
          onCancel={() => setUnpublishingRide(null)}
        />
      )}
    </>
  );
}

import type { ReactNode } from 'react';
import { TrackThumbnail } from './TrackThumbnail';
import type { Ride } from '../types';

interface RideListScreenProps {
  title: string;
  rides: Ride[] | null;
  isLoading: boolean;
  error: string | null;
  emptyMessage: string;
  renderMeta: (ride: Ride) => ReactNode;
  renderActions: (ride: Ride) => ReactNode;
  onClose: () => void;
}

export function RideListScreen({
  title,
  rides,
  isLoading,
  error,
  emptyMessage,
  renderMeta,
  renderActions,
  onClose,
}: RideListScreenProps) {
  return (
    <main className="my-rides-screen">
      <div className="my-rides-header">
        <h2>{title}</h2>
        <button type="button" className="button button-ghost" onClick={onClose}>
          Retour
        </button>
      </div>

      {isLoading && <p className="my-rides-hint">Chargement...</p>}
      {error && <div className="banner banner-error">{error}</div>}
      {!isLoading && rides && rides.length === 0 && <p className="my-rides-hint">{emptyMessage}</p>}

      {rides && rides.length > 0 && (
        <ul className="my-rides-list">
          {rides.map((ride) => (
            <li key={ride.id} className="my-rides-item">
              <TrackThumbnail points={ride.trackPoints} />
              <div className="my-rides-item-info">
                <span className="my-rides-item-title">{ride.title}</span>
                <span className="my-rides-item-meta">{renderMeta(ride)}</span>
              </div>
              <div className="my-rides-item-actions">{renderActions(ride)}</div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

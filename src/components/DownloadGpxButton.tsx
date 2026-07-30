import type { User } from 'firebase/auth';
import { downloadRideGpx } from '../utils/gpxExport';
import { recordRideDownload } from '../utils/rideStorage';
import type { Ride } from '../types';

interface DownloadGpxButtonProps {
  ride: Ride;
  user: User | null;
}

export function DownloadGpxButton({ ride, user }: DownloadGpxButtonProps) {
  const handleClick = () => {
    downloadRideGpx(ride);
    if (user) {
      void recordRideDownload(ride.id, user.uid).catch((err) => console.error(err));
    }
  };

  return (
    <button type="button" className="button button-ghost" onClick={handleClick}>
      Télécharger
    </button>
  );
}

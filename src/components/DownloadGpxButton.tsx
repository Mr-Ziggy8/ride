import { downloadRideGpx } from '../utils/gpxExport';
import type { Ride } from '../types';

export function DownloadGpxButton({ ride }: { ride: Ride }) {
  return (
    <button type="button" className="button button-ghost" onClick={() => downloadRideGpx(ride)}>
      Télécharger
    </button>
  );
}

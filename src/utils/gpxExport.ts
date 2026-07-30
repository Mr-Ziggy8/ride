import type { Ride } from '../types';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeFilename(title: string): string {
  const cleaned = title.trim().replace(/[^a-z0-9-_]+/gi, '_').slice(0, 60);
  return cleaned || 'parcours';
}

/**
 * Toujours exporte en <trk> (track), jamais en <rte> (route) : correspond au
 * modele interne de l'app (un parcours suivi/enregistre est un trace, pas une
 * simple liste de points d'etape) - pas de choix propose a l'utilisateur.
 */
export function buildGpxString(ride: Ride): string {
  const trackPoints = ride.trackPoints
    .map((p) =>
      p.ele !== null
        ? `      <trkpt lat="${p.lat}" lon="${p.lng}"><ele>${p.ele}</ele></trkpt>`
        : `      <trkpt lat="${p.lat}" lon="${p.lng}"></trkpt>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GPX Live Tracker" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${escapeXml(ride.title)}</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>
`;
}

export function downloadRideGpx(ride: Ride): void {
  const blob = new Blob([buildGpxString(ride)], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(ride.title)}.gpx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

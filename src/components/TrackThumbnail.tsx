import { buildThumbnailPath } from '../utils/trackMath';
import type { StoredTrackPoint } from '../types';

interface TrackThumbnailProps {
  points: StoredTrackPoint[];
}

const WIDTH = 72;
const HEIGHT = 48;
const PADDING = 4;

export function TrackThumbnail({ points }: TrackThumbnailProps) {
  if (points.length < 2) return null;

  return (
    <svg
      className="track-thumbnail"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <path d={buildThumbnailPath(points, WIDTH, HEIGHT, PADDING)} />
    </svg>
  );
}

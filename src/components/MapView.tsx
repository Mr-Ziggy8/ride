import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import { divIcon, type LatLngBoundsLiteral, type LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { simplifyForDisplay } from '../utils/trackMath';
import type { LivePosition, ProjectedPosition, TrackData } from '../types';

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const LIVE_ICON = divIcon({ className: 'live-marker', iconSize: [18, 18], iconAnchor: [9, 9] });
const LIVE_ICON_OFF_TRACK = divIcon({
  className: 'live-marker live-marker--off-track',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});
const PROJECTED_ICON = divIcon({ className: 'projected-marker', iconSize: [10, 10], iconAnchor: [5, 5] });

function toLatLngTuples(coordinates: GeoJSON.Position[]): LatLngTuple[] {
  return coordinates.map(([lng, lat]) => [lat, lng]);
}

function toLatLngBounds([minLng, minLat, maxLng, maxLat]: TrackData['bounds']): LatLngBoundsLiteral {
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

/** Leaflet never notices its container resizing on its own (StrictMode remounts,
 * mobile address-bar show/hide, orientation changes) — this keeps it in sync. */
function InvalidateSizeOnResize() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

export interface MapViewProps {
  track: TrackData;
  livePosition: LivePosition | null;
  projected: ProjectedPosition | null;
  isOffTrack: boolean;
}

export function MapView({ track, livePosition, projected, isOffTrack }: MapViewProps) {
  const positions = useMemo(
    () => toLatLngTuples(simplifyForDisplay(track.geojson).geometry.coordinates),
    [track],
  );
  const bounds = useMemo(() => toLatLngBounds(track.bounds), [track]);

  return (
    <MapContainer className="map-view" bounds={bounds} boundsOptions={{ padding: [40, 40] }}>
      <InvalidateSizeOnResize />
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} detectRetina />
      <Polyline positions={positions} pathOptions={{ color: '#2563eb', weight: 4 }} />
      {livePosition && (
        <Marker position={[livePosition.lat, livePosition.lng]} icon={isOffTrack ? LIVE_ICON_OFF_TRACK : LIVE_ICON} />
      )}
      {projected && <Marker position={[projected.projectedLat, projected.projectedLng]} icon={PROJECTED_ICON} />}
    </MapContainer>
  );
}

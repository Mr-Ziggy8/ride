import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import { divIcon, type DivIcon, type LatLngBoundsLiteral, type LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Compass } from './Compass';
import { simplifyForDisplay } from '../utils/trackMath';
import type { LivePosition, ProjectedPosition, TrackData } from '../types';

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const PROJECTED_ICON = divIcon({ className: 'projected-marker', iconSize: [10, 10], iconAnchor: [5, 5] });

/** Points in the direction of travel when heading is known; otherwise a plain dot. */
function createLiveIcon(heading: number | null, offTrack: boolean): DivIcon {
  const modifier = offTrack ? ' live-marker--off-track' : '';
  if (heading === null) {
    return divIcon({ className: `live-marker${modifier}`, iconSize: [18, 18], iconAnchor: [9, 9] });
  }
  const html = `<svg viewBox="0 0 32 32" width="32" height="32" style="transform: rotate(${heading}deg)">
    <path d="M16 3 L25 27 L16 21 L7 27 Z" />
  </svg>`;
  return divIcon({
    className: `live-marker-arrow${modifier}`,
    html,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

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

/** Keeps the map panned to the live position, without touching zoom. */
function FollowPosition({ position }: { position: LivePosition | null }) {
  const map = useMap();
  useEffect(() => {
    if (!position) return;
    map.panTo([position.lat, position.lng], { animate: true });
  }, [map, position]);
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
    <div className="map-view-wrapper">
      <MapContainer className="map-view" bounds={bounds} boundsOptions={{ padding: [40, 40] }}>
        <InvalidateSizeOnResize />
        <FollowPosition position={livePosition} />
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} detectRetina />
        <Polyline positions={positions} pathOptions={{ color: '#2563eb', weight: 4 }} />
        {livePosition && (
          <Marker
            position={[livePosition.lat, livePosition.lng]}
            icon={createLiveIcon(livePosition.heading, isOffTrack)}
          />
        )}
        {projected && <Marker position={[projected.projectedLat, projected.projectedLng]} icon={PROJECTED_ICON} />}
      </MapContainer>
      {livePosition && <Compass heading={livePosition.heading} />}
    </div>
  );
}

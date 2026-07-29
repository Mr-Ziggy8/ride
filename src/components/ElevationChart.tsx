import { useMemo } from 'react';
import type { ElevationPoint } from '../types';

export interface ElevationChartProps {
  elevationProfile: ElevationPoint[];
  currentDistanceMeters: number | null;
}

const WIDTH = 600;
const HEIGHT = 140;
const PADDING = 8;

export function ElevationChart({ elevationProfile, currentDistanceMeters }: ElevationChartProps) {
  const { path, minEle, maxEle, gainMeters, cursor } = useMemo(() => {
    const elevations = elevationProfile.map((p) => p.elevationMeters);
    const minEle = Math.min(...elevations);
    const maxEle = Math.max(...elevations);
    const range = maxEle - minEle || 1;
    const totalDistance = elevationProfile[elevationProfile.length - 1].distanceMeters || 1;

    const toXY = (p: ElevationPoint): [number, number] => [
      PADDING + (p.distanceMeters / totalDistance) * (WIDTH - 2 * PADDING),
      PADDING + (1 - (p.elevationMeters - minEle) / range) * (HEIGHT - 2 * PADDING),
    ];

    const path = elevationProfile
      .map((p, i) => {
        const [x, y] = toXY(p);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');

    let gainMeters = 0;
    for (let i = 1; i < elevationProfile.length; i++) {
      const delta = elevationProfile[i].elevationMeters - elevationProfile[i - 1].elevationMeters;
      if (delta > 0) gainMeters += delta;
    }

    let cursor: [number, number] | null = null;
    if (currentDistanceMeters !== null) {
      const clamped = Math.min(Math.max(currentDistanceMeters, 0), totalDistance);
      let closest = elevationProfile[0];
      for (const point of elevationProfile) {
        if (Math.abs(point.distanceMeters - clamped) < Math.abs(closest.distanceMeters - clamped)) {
          closest = point;
        }
      }
      cursor = toXY(closest);
    }

    return { path, minEle, maxEle, gainMeters, cursor };
  }, [elevationProfile, currentDistanceMeters]);

  return (
    <div className="elevation-chart">
      <div className="elevation-chart-header">
        <span>
          {Math.round(minEle)} – {Math.round(maxEle)} m
        </span>
        <span>D+ {Math.round(gainMeters)} m</span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="elevation-chart-svg" preserveAspectRatio="none">
        <path d={path} fill="none" stroke="#2563eb" strokeWidth={2} />
        {cursor && (
          <>
            <line x1={cursor[0]} y1={0} x2={cursor[0]} y2={HEIGHT} className="elevation-cursor-line" />
            <circle cx={cursor[0]} cy={cursor[1]} r={4} className="elevation-cursor-dot" />
          </>
        )}
      </svg>
    </div>
  );
}

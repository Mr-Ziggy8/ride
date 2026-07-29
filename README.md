# GPX Live Tracker

Upload a GPX track, see it on a map, and follow your live GPS position projected onto it as you ride/hike. Solo use, no backend — everything runs client-side in the browser.

Live at: https://ride-lyart.vercel.app

## Stack

- Vite + React 18 + TypeScript
- Leaflet / react-leaflet for the map (CARTO raster tiles)
- `@tmcw/togeojson` for GPX → GeoJSON parsing
- Turf.js for distance, projection, and simplification

## Features

- Upload a `.gpx` file (track or route) and see it on the map with auto-fit bounds
- Live position tracking via `navigator.geolocation.watchPosition`, projected onto the track
- Distance covered, percent complete, and perpendicular offset from the track
- Off-track warning with a configurable threshold
- Elevation profile with a cursor synced to the live position, when the GPX includes elevation
- Screen Wake Lock while tracking is active, to avoid GPS drops from screen sleep

## Development

```bash
npm install
npm run dev
```

```bash
npm run build   # type-check + production build
npm run lint
```

Targets Android Chrome specifically — no particular effort has gone into desktop or iOS Safari.

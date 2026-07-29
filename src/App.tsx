import { useMemo, useState } from 'react';
import { GpxUploader } from './components/GpxUploader';
import { MapView } from './components/MapView';
import { ProgressPanel } from './components/ProgressPanel';
import { ElevationChart } from './components/ElevationChart';
import { useGeolocation } from './hooks/useGeolocation';
import { useWakeLock } from './hooks/useWakeLock';
import { projectPosition } from './utils/trackMath';
import type { GpxParseResult } from './utils/gpxParser';
import type { TrackData } from './types';

const DEFAULT_OFF_TRACK_THRESHOLD_METERS = 50;

function App() {
  const [track, setTrack] = useState<TrackData | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [offTrackThresholdMeters, setOffTrackThresholdMeters] = useState(
    DEFAULT_OFF_TRACK_THRESHOLD_METERS,
  );

  const geo = useGeolocation();
  const wakeLock = useWakeLock();

  const projected = useMemo(() => {
    if (!track || !geo.position) return null;
    return projectPosition(track.geojson, geo.position, track.totalDistanceMeters);
  }, [track, geo.position]);

  const isOffTrack = projected !== null && projected.perpendicularOffsetMeters > offTrackThresholdMeters;

  const handleParsed = (result: GpxParseResult) => {
    setTrack(result.track);
    setWarning(result.warning);
    setUploadError(null);
  };

  const handleStartTracking = () => {
    geo.start();
    void wakeLock.request();
  };

  const handleStopTracking = () => {
    geo.stop();
    void wakeLock.release();
  };

  const handleReset = () => {
    geo.reset();
    void wakeLock.release();
    setTrack(null);
    setWarning(null);
    setUploadError(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>GPX Live Tracker</h1>
        {track && (
          <button type="button" className="button button-ghost" onClick={handleReset}>
            Réinitialiser
          </button>
        )}
      </header>

      {uploadError && (
        <div className="banner banner-error" role="alert">
          {uploadError}
        </div>
      )}

      {!track && (
        <main className="upload-screen">
          <p>Chargez un fichier GPX pour afficher son tracé et suivre votre position en direct.</p>
          <GpxUploader onParsed={handleParsed} onError={setUploadError} />
        </main>
      )}

      {track && (
        <main className="tracker-screen">
          {warning && <div className="banner banner-warning">{warning}</div>}
          {geo.error && <div className="banner banner-error">{geo.error.message}</div>}

          <MapView track={track} livePosition={geo.position} projected={projected} isOffTrack={isOffTrack} />

          <div className="tracking-controls">
            {!geo.isTracking ? (
              <button type="button" className="button button-primary" onClick={handleStartTracking}>
                Démarrer le suivi
              </button>
            ) : (
              <button type="button" className="button button-secondary" onClick={handleStopTracking}>
                Arrêter le suivi
              </button>
            )}
          </div>

          <ProgressPanel
            track={track}
            projected={projected}
            isOffTrack={isOffTrack}
            offTrackThresholdMeters={offTrackThresholdMeters}
            onOffTrackThresholdChange={setOffTrackThresholdMeters}
          />

          {track.hasElevation && track.elevationProfile && (
            <ElevationChart
              elevationProfile={track.elevationProfile}
              currentDistanceMeters={projected?.distanceAlongTrackMeters ?? null}
            />
          )}
        </main>
      )}
    </div>
  );
}

export default App;

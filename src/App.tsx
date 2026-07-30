import { useEffect, useMemo, useState } from 'react';
import { AuthButton } from './components/AuthButton';
import { DiscoveryView } from './components/DiscoveryView';
import { FavoritesView } from './components/FavoritesView';
import { GpxUploader } from './components/GpxUploader';
import { MapView } from './components/MapView';
import { MyRidesView } from './components/MyRidesView';
import { ProgressPanel } from './components/ProgressPanel';
import { ElevationChart } from './components/ElevationChart';
import { SaveRideDialog } from './components/SaveRideDialog';
import { SettingsSidebar } from './components/SettingsSidebar';
import { useAuth } from './hooks/useAuth';
import { useGeolocation } from './hooks/useGeolocation';
import { useSettings } from './hooks/useSettings';
import { useWakeLock } from './hooks/useWakeLock';
import { computePaceEstimate, projectPosition } from './utils/trackMath';
import { clearStoredTrack, loadStoredTrack, storeTrack } from './utils/trackStorage';
import { saveRide, toTrackData } from './utils/rideStorage';
import type { GpxParseResult } from './utils/gpxParser';
import type { Ride, RideVisibility, TrackData } from './types';

const DEFAULT_OFF_TRACK_THRESHOLD_METERS = 50;

type ViewMode = 'main' | 'my-rides' | 'discovery' | 'favorites' | 'settings';

const storedOnLoad = loadStoredTrack();

function App() {
  const [track, setTrack] = useState<TrackData | null>(storedOnLoad?.track ?? null);
  const [warning, setWarning] = useState<string | null>(storedOnLoad?.warning ?? null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [offTrackThresholdMeters, setOffTrackThresholdMeters] = useState(
    DEFAULT_OFF_TRACK_THRESHOLD_METERS,
  );
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('main');

  const auth = useAuth();
  const { settings, updateSettings } = useSettings(auth.user);
  const geo = useGeolocation();
  const wakeLock = useWakeLock();

  /**
   * Pousse une entrée d'historique en entrant dans une vue secondaire, pour que le
   * bouton retour Android/Chrome (pas seulement le bouton "Retour" interne) en sorte.
   */
  const openView = (mode: ViewMode) => {
    window.history.pushState({ view: mode }, '');
    setView(mode);
  };

  const closeView = () => {
    window.history.back();
  };

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      setView((event.state?.view as ViewMode | undefined) ?? 'main');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Filet de sécurité : si on se déconnecte (ou revient via l'historique) alors
  // qu'on est sur une vue qui nécessite un compte, on ne doit jamais rester bloqué
  // sur un écran vide.
  useEffect(() => {
    if (!auth.user && (view === 'my-rides' || view === 'favorites')) {
      setView('main');
    }
  }, [auth.user, view]);

  const projected = useMemo(() => {
    if (!track || !geo.position) return null;
    return projectPosition(track.geojson, geo.position, track.totalDistanceMeters);
  }, [track, geo.position]);

  const isOffTrack = projected !== null && projected.perpendicularOffsetMeters > offTrackThresholdMeters;

  const paceEstimate = useMemo(() => {
    if (!track || !projected || geo.sessionStartMs === null || !geo.position) return null;
    const elapsedSeconds = (geo.position.timestampMs - geo.sessionStartMs) / 1000;
    return computePaceEstimate(projected.distanceAlongTrackMeters, track.totalDistanceMeters, elapsedSeconds);
  }, [track, projected, geo.sessionStartMs, geo.position]);

  const handleParsed = (result: GpxParseResult) => {
    setTrack(result.track);
    setWarning(result.warning);
    setUploadError(null);
    storeTrack({ track: result.track, warning: result.warning });
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
    setSaveSuccessMessage(null);
    clearStoredTrack();
  };

  const handleOpenSaveDialog = () => {
    setSaveSuccessMessage(null);
    setIsSaveDialogOpen(true);
  };

  const handleSaveRide = async (title: string, visibility: RideVisibility) => {
    if (!auth.user || !track) return;
    await saveRide(auth.user, track, title, visibility);
    setIsSaveDialogOpen(false);
    setSaveSuccessMessage('Parcours sauvegardé.');
  };

  const handleSignOut = () => {
    auth.signOutUser();
    setView('main');
  };

  const handleLoadRide = (ride: Ride) => {
    const loadedTrack = toTrackData(ride);
    setTrack(loadedTrack);
    setWarning(null);
    setUploadError(null);
    setSaveSuccessMessage(null);
    storeTrack({ track: loadedTrack, warning: null });
    closeView();
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>GPX Live Tracker</h1>
        <div className="app-header-actions">
          <AuthButton
            user={auth.user}
            isLoading={auth.isLoading}
            onSignIn={auth.signInWithGoogle}
            onSignOut={handleSignOut}
          />
          {view === 'main' && (
            <button type="button" className="button button-ghost" onClick={() => openView('discovery')}>
              Découverte
            </button>
          )}
          {view === 'main' && auth.user && (
            <button type="button" className="button button-ghost" onClick={() => openView('my-rides')}>
              Mes parcours
            </button>
          )}
          {view === 'main' && auth.user && (
            <button type="button" className="button button-ghost" onClick={() => openView('favorites')}>
              Mes favoris
            </button>
          )}
          {view === 'main' && (
            <button type="button" className="button button-ghost" onClick={() => openView('settings')}>
              Paramètres
            </button>
          )}
          {view === 'main' && track && (
            <button type="button" className="button button-ghost" onClick={handleReset}>
              Réinitialiser
            </button>
          )}
        </div>
      </header>

      {auth.error && (
        <div className="banner banner-error" role="alert">
          {auth.error}
        </div>
      )}

      {uploadError && (
        <div className="banner banner-error" role="alert">
          {uploadError}
        </div>
      )}

      {saveSuccessMessage && <div className="banner banner-success">{saveSuccessMessage}</div>}

      {view === 'settings' && (
        <SettingsSidebar settings={settings} onUpdate={updateSettings} onClose={closeView} />
      )}

      {view === 'discovery' && (
        <DiscoveryView
          user={auth.user}
          unitSystem={settings.unitSystem}
          onLoadRide={handleLoadRide}
          onClose={closeView}
        />
      )}

      {view === 'my-rides' && auth.user && (
        <MyRidesView
          user={auth.user}
          unitSystem={settings.unitSystem}
          onLoadRide={handleLoadRide}
          onClose={closeView}
        />
      )}

      {view === 'favorites' && auth.user && (
        <FavoritesView
          user={auth.user}
          unitSystem={settings.unitSystem}
          onLoadRide={handleLoadRide}
          onClose={closeView}
        />
      )}

      {(view === 'main' || view === 'settings') && !track && (
        <main className="upload-screen">
          <p>Chargez un fichier GPX pour afficher son tracé et suivre votre position en direct.</p>
          <GpxUploader onParsed={handleParsed} onError={setUploadError} />
        </main>
      )}

      {(view === 'main' || view === 'settings') && track && (
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

          {auth.user && (
            <div className="save-ride-controls">
              <button type="button" className="button button-ghost" onClick={handleOpenSaveDialog}>
                Sauvegarder ce parcours
              </button>
            </div>
          )}

          <ProgressPanel
            track={track}
            projected={projected}
            isOffTrack={isOffTrack}
            offTrackThresholdMeters={offTrackThresholdMeters}
            onOffTrackThresholdChange={setOffTrackThresholdMeters}
            speedMetersPerSecond={geo.position?.speedMetersPerSecond ?? null}
            paceEstimate={paceEstimate}
            unitSystem={settings.unitSystem}
          />

          {track.hasElevation && track.elevationProfile && (
            <ElevationChart
              elevationProfile={track.elevationProfile}
              currentDistanceMeters={projected?.distanceAlongTrackMeters ?? null}
            />
          )}
        </main>
      )}

      {isSaveDialogOpen && track && auth.user && (
        <SaveRideDialog
          defaultTitle={`Parcours du ${new Date().toLocaleDateString('fr-FR')}`}
          onSave={handleSaveRide}
          onCancel={() => setIsSaveDialogOpen(false)}
        />
      )}
    </div>
  );
}

export default App;

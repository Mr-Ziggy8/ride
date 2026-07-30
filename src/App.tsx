import { useEffect, useMemo, useState } from 'react';
import { AppSidebar, type SidebarDestination } from './components/AppSidebar';
import { DiscoveryView } from './components/DiscoveryView';
import { FavoritesView } from './components/FavoritesView';
import { FeedbackAdminView } from './components/FeedbackAdminView';
import { FeedbackView } from './components/FeedbackView';
import { FuelLogView } from './components/FuelLogView';
import { GpxUploader } from './components/GpxUploader';
import { MapView } from './components/MapView';
import { MyRidesView } from './components/MyRidesView';
import { PremiumUnlockView } from './components/PremiumUnlockView';
import { ProgressPanel } from './components/ProgressPanel';
import { ElevationChart } from './components/ElevationChart';
import { RecordingScreen } from './components/RecordingScreen';
import { SaveRideDialog } from './components/SaveRideDialog';
import { StatisticsView } from './components/StatisticsView';
import { useAuth } from './hooks/useAuth';
import { useGeolocation } from './hooks/useGeolocation';
import { useProfile } from './hooks/useProfile';
import { useRouteRecording } from './hooks/useRouteRecording';
import { useSettings } from './hooks/useSettings';
import { useUserRole } from './hooks/useUserRole';
import { useWakeLock } from './hooks/useWakeLock';
import { canAccessPremium, canModerate } from './utils/roleStorage';
import { computePaceEstimate, projectPosition } from './utils/trackMath';
import { clearStoredTrack, loadStoredTrack, storeTrack } from './utils/trackStorage';
import { recordRideFollow, saveRecordedRide, saveRide, toTrackData } from './utils/rideStorage';
import type { GpxParseResult } from './utils/gpxParser';
import type { Ride, RideVisibility, TrackData } from './types';

const DEFAULT_OFF_TRACK_THRESHOLD_METERS = 50;

type ViewMode =
  | 'main'
  | 'my-rides'
  | 'discovery'
  | 'favorites'
  | 'fuel-log'
  | 'statistics'
  | 'feedback'
  | 'feedback-admin';

const VALID_VIEWS: ViewMode[] = [
  'main',
  'my-rides',
  'discovery',
  'favorites',
  'fuel-log',
  'statistics',
  'feedback',
  'feedback-admin',
];

function isValidView(value: unknown): value is ViewMode {
  return typeof value === 'string' && (VALID_VIEWS as string[]).includes(value);
}

interface HistoryState {
  view: ViewMode;
  menuOpen: boolean;
}

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const auth = useAuth();
  const { settings, updateSettings } = useSettings(auth.user);
  const profile = useProfile(auth.user);
  const { role } = useUserRole(auth.user);
  const geo = useGeolocation();
  const wakeLock = useWakeLock();
  const recording = useRouteRecording();
  const isRecordingActive = recording.status !== 'idle';

  // Maintient watchPosition + wake lock actifs tant que le statut est 'recording' :
  // couvre a la fois le demarrage explicite (Nouveau parcours) et la reprise apres
  // un reload d'onglet (le buffer de points survit en localStorage, mais
  // watchPosition/wakeLock doivent eux redemarrer explicitement). geo.start/
  // wakeLock.request sont stables (useCallback a deps figes) : le lint react-hooks
  // reclame les objets geo/wakeLock entiers, mais les ajouter re-declencherait
  // l'effet (et re-couperait/rouvrirait le watch GPS) a chaque nouvelle position.
  useEffect(() => {
    if (recording.status === 'recording') {
      geo.start();
      void wakeLock.request();
    }
  }, [geo.start, wakeLock.request, recording.status]);

  /** history.back() : le bouton retour Android/Chrome (pas seulement le bouton
   * "Retour" interne) fonctionne aussi, puisque chaque vue/menu est une vraie
   * entree d'historique (voir openMenu/navigateFromMenu). */
  const closeView = () => {
    window.history.back();
  };

  /** Le menu est un calque independant de la vue (accessible depuis n'importe
   * quelle page), pas une vue a part entiere - sinon le contenu affiche derriere
   * le calque change (retombe sur l'ecran principal) au lieu de rester celui d'ou
   * on vient. */
  const openMenu = () => {
    window.history.pushState({ view, menuOpen: true } satisfies HistoryState, '');
    setIsMenuOpen(true);
  };

  const closeMenu = () => {
    window.history.back();
  };

  /** Depuis le menu, remplace l'entree d'historique plutot que d'empiler : le
   * retour depuis la destination va directement a la page d'ou le menu a ete
   * ouvert, pas au menu lui-meme. */
  const navigateFromMenu = (destination: SidebarDestination) => {
    window.history.replaceState({ view: destination, menuOpen: false } satisfies HistoryState, '');
    setView(destination);
    setIsMenuOpen(false);
  };

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // event.state peut venir d'une entree d'historique posee par une version
      // precedente de l'app (schema different, valeur de view disparue) - jamais
      // fait confiance aveuglement, sous peine d'ecran vide si la valeur ne
      // correspond plus a aucune vue connue.
      const state = event.state as Partial<HistoryState> | undefined;
      setView(isValidView(state?.view) ? state.view : 'main');
      setIsMenuOpen(state?.menuOpen ?? false);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Filet de sécurité : si on se déconnecte (ou revient via l'historique) alors
  // qu'on est sur une vue qui nécessite un compte, on ne doit jamais rester bloqué
  // sur un écran vide. Pareil si le rôle ne permet plus la modération (accès
  // perdu entre-temps) alors qu'on est sur la vue Feedbacks.
  useEffect(() => {
    const requiresAccount =
      view === 'my-rides' ||
      view === 'favorites' ||
      view === 'fuel-log' ||
      view === 'statistics' ||
      view === 'feedback' ||
      view === 'feedback-admin';
    if (!auth.user && requiresAccount) {
      setView('main');
      return;
    }
    if (view === 'feedback-admin' && !canModerate(role.type)) {
      setView('main');
    }
  }, [auth.user, view, role.type]);

  const projected = useMemo(() => {
    if (!track || !geo.position) return null;
    return projectPosition(track.geojson, geo.position, track.totalDistanceMeters);
  }, [track, geo.position]);

  const isOffTrack = projected !== null && projected.perpendicularOffsetMeters > offTrackThresholdMeters;

  // recording.addPosition est stable (useCallback a deps figes) : meme limitation
  // du lint react-hooks que ci-dessus, le reste des deps est correct et suffisant.
  useEffect(() => {
    if (recording.status === 'recording' && geo.position) {
      recording.addPosition(geo.position);
    }
  }, [geo.position, recording.status, recording.addPosition]);

  const paceEstimate = useMemo(() => {
    if (!track || !projected || geo.sessionStartMs === null || !geo.position) return null;
    const elapsedSeconds = (geo.position.timestampMs - geo.sessionStartMs) / 1000;
    return computePaceEstimate(projected.distanceAlongTrackMeters, track.totalDistanceMeters, elapsedSeconds);
  }, [track, projected, geo.sessionStartMs, geo.position]);

  // Points de depart/arrivee pour la suggestion de titre "Ville A vers Ville B"
  // dans SaveRideDialog - deux sources distinctes selon le flux (upload/follow vs enregistrement live).
  const trackEndpoints = useMemo(() => {
    if (!track) return { start: null, end: null };
    const coords = track.geojson.geometry.coordinates;
    if (coords.length === 0) return { start: null, end: null };
    const [startLng, startLat] = coords[0];
    const [endLng, endLat] = coords[coords.length - 1];
    return { start: { lat: startLat, lng: startLng }, end: { lat: endLat, lng: endLng } };
  }, [track]);

  const recordingEndpoints = useMemo(() => {
    if (recording.points.length === 0) return { start: null, end: null };
    const first = recording.points[0];
    const last = recording.points[recording.points.length - 1];
    return { start: { lat: first.lat, lng: first.lng }, end: { lat: last.lat, lng: last.lng } };
  }, [recording.points]);

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

  const handleSaveRide = async (
    title: string,
    visibility: RideVisibility,
    country: string | null,
    region: string | null,
  ) => {
    if (!auth.user || !track) return;
    await saveRide(auth.user, track, title, visibility, profile.pseudo, country, region);
    setIsSaveDialogOpen(false);
    setSaveSuccessMessage('Parcours sauvegardé.');
  };

  const handleStartRecording = () => {
    geo.reset();
    setTrack(null);
    setWarning(null);
    setUploadError(null);
    setSaveSuccessMessage(null);
    clearStoredTrack();
    recording.start();
  };

  const handleFinishRecording = () => {
    geo.stop();
    void wakeLock.release();
    recording.finish();
  };

  const handleSaveRecordedRide = async (
    title: string,
    visibility: RideVisibility,
    country: string | null,
    region: string | null,
  ) => {
    if (!auth.user) return;
    const storedPoints = recording.points.map(({ lng, lat, ele }) => ({ lng, lat, ele }));
    await saveRecordedRide(auth.user, storedPoints, recording.stats, title, visibility, profile.pseudo, country, region);
    recording.discard();
    setSaveSuccessMessage('Parcours enregistré et sauvegardé.');
  };

  const handleDiscardRecording = () => {
    recording.discard();
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
    if (auth.user) {
      void recordRideFollow(ride.id, auth.user.uid).catch((err) => console.error(err));
    }
    closeView();
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>GPX Live Tracker</h1>
        <div className="app-header-actions">
          {!auth.user && !auth.isLoading && (
            <button type="button" className="button button-ghost" onClick={auth.signInWithGoogle}>
              Se connecter avec Google
            </button>
          )}
          {view === 'main' && !isRecordingActive && auth.user && (
            <button type="button" className="button button-primary" onClick={handleStartRecording}>
              Nouveau parcours
            </button>
          )}
          {view === 'main' && !isRecordingActive && track && (
            <button type="button" className="button button-ghost" onClick={handleReset}>
              Réinitialiser
            </button>
          )}
          {!isMenuOpen && !isRecordingActive && (
            <button type="button" className="button button-ghost" onClick={openMenu} aria-label="Menu">
              ☰
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

      {isMenuOpen && (
        <AppSidebar
          user={auth.user}
          isLoading={auth.isLoading}
          pseudo={profile.pseudo}
          settings={settings}
          canModerate={canModerate(role.type)}
          onSignIn={auth.signInWithGoogle}
          onSignOut={handleSignOut}
          onUpdatePseudo={profile.updatePseudo}
          onUpdateSettings={updateSettings}
          onNavigate={navigateFromMenu}
          onClose={closeMenu}
        />
      )}

      {view === 'discovery' && (
        <DiscoveryView
          user={auth.user}
          unitSystem={settings.unitSystem}
          canModerate={canModerate(role.type)}
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

      {view === 'fuel-log' && auth.user && !canAccessPremium(role.type) && <PremiumUnlockView onClose={closeView} />}
      {view === 'fuel-log' && auth.user && canAccessPremium(role.type) && (
        <FuelLogView
          user={auth.user}
          unitSystem={settings.unitSystem}
          fuelUnit={settings.fuelUnit}
          onClose={closeView}
        />
      )}

      {view === 'statistics' && auth.user && !canAccessPremium(role.type) && <PremiumUnlockView onClose={closeView} />}
      {view === 'statistics' && auth.user && canAccessPremium(role.type) && <StatisticsView onClose={closeView} />}

      {view === 'feedback' && auth.user && <FeedbackView user={auth.user} onClose={closeView} />}

      {view === 'feedback-admin' && auth.user && canModerate(role.type) && (
        <FeedbackAdminView user={auth.user} onClose={closeView} />
      )}

      {view === 'main' && isRecordingActive && (
        <RecordingScreen
          points={recording.points}
          livePosition={geo.position}
          stats={recording.stats}
          currentSpeedMetersPerSecond={recording.currentSpeedMetersPerSecond}
          unitSystem={settings.unitSystem}
          onFinish={handleFinishRecording}
        />
      )}

      {view === 'main' && !track && !isRecordingActive && (
        <main className="upload-screen">
          <p>Chargez un fichier GPX pour afficher son tracé et suivre votre position en direct.</p>
          <GpxUploader onParsed={handleParsed} onError={setUploadError} />
        </main>
      )}

      {view === 'main' && track && (
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
          startPoint={trackEndpoints.start}
          endPoint={trackEndpoints.end}
          onSave={handleSaveRide}
          onCancel={() => setIsSaveDialogOpen(false)}
        />
      )}

      {recording.status === 'finished_pending_save' && auth.user && (
        <SaveRideDialog
          defaultTitle={`Parcours du ${new Date().toLocaleDateString('fr-FR')}`}
          startPoint={recordingEndpoints.start}
          endPoint={recordingEndpoints.end}
          onSave={handleSaveRecordedRide}
          onCancel={handleDiscardRecording}
        />
      )}
    </div>
  );
}

export default App;

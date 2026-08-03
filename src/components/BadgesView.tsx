import { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { useUserStats } from '../hooks/useUserStats';
import { computeGamification } from '../utils/gamification';
import { createReferralCode, redeemReferralCode, syncUserStats } from '../utils/gamificationApi';

interface BadgesViewProps {
  user: User;
  onClose: () => void;
  /** Un ami qui redime un code de parrainage recoit lui-meme l'acces premium -
   * il faut donc rafraichir son role, exactement comme apres un code promo. */
  onRoleGranted: () => void;
}

const REDEEM_ERROR_MESSAGES: Record<string, string> = {
  code_not_found: 'Code invalide.',
  self_referral: "Tu ne peux pas utiliser ton propre code.",
  already_redeemed: 'Ce code a déjà été utilisé.',
  already_referred: 'Tu as déjà été parrainé.',
  account_too_old: 'Le parrainage est réservé aux comptes tout juste créés.',
  invalid_code_format: 'Format de code invalide.',
};

const REFERRAL_ELIGIBILITY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function BadgesView({ user, onClose, onRoleGranted }: BadgesViewProps) {
  const { stats, isLoading, refresh } = useUserStats(user);
  const { xp, earnedBadges, lockedBadges } = useMemo(() => computeGamification(stats), [stats]);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const [redeemInput, setRedeemInput] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState(false);

  const accountAgeMs = Date.now() - new Date(user.metadata.creationTime ?? 0).getTime();
  const canRedeemReferral = !stats.referredByUid && accountAgeMs <= REFERRAL_ELIGIBILITY_WINDOW_MS;

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      await syncUserStats(user);
      refresh();
    } catch (err) {
      console.error(err);
      setSyncError('Échec de la synchronisation. Réessaie.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGenerateCode = async () => {
    setIsGeneratingCode(true);
    setCodeError(null);
    try {
      const code = await createReferralCode(user);
      setReferralCode(code);
    } catch (err) {
      console.error(err);
      setCodeError('Échec de la génération du code. Réessaie.');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleCopyCode = async () => {
    if (!referralCode) return;
    await navigator.clipboard.writeText(referralCode);
    setCodeCopied(true);
  };

  const handleRedeem = async () => {
    const trimmed = redeemInput.trim();
    if (!trimmed) return;

    setIsRedeeming(true);
    setRedeemError(null);
    setRedeemSuccess(false);
    try {
      await redeemReferralCode(user, trimmed);
      setRedeemSuccess(true);
      setRedeemInput('');
      onRoleGranted();
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setRedeemError(REDEEM_ERROR_MESSAGES[message] ?? 'Échec de la validation. Réessaie.');
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <main className="my-rides-screen">
      <div className="my-rides-header">
        <h2>Mes badges</h2>
        <button type="button" className="button button-ghost" onClick={onClose}>
          Retour
        </button>
      </div>

      {isLoading && <p className="my-rides-hint">Chargement...</p>}

      <section className="stats-section">
        <dl className="progress-stats">
          <div className="progress-stat">
            <dt>XP total</dt>
            <dd>{xp}</dd>
          </div>
          <div className="progress-stat">
            <dt>Badges obtenus</dt>
            <dd>
              {earnedBadges.length}/{earnedBadges.length + lockedBadges.length}
            </dd>
          </div>
        </dl>
        {syncError && <p className="dialog-error">{syncError}</p>}
        <button type="button" className="button button-ghost" onClick={handleSync} disabled={isSyncing}>
          {isSyncing ? 'Actualisation...' : 'Actualiser mes stats'}
        </button>
      </section>

      <section className="stats-section">
        <h3>Badges obtenus</h3>
        {earnedBadges.length === 0 ? (
          <p className="my-rides-hint">Aucun badge obtenu pour l'instant.</p>
        ) : (
          <ul className="my-rides-list">
            {earnedBadges.map((badge) => (
              <li key={badge.id} className="my-rides-item">
                <span>🏅 {badge.name}</span>
                <span className="my-rides-item-meta">+{badge.xpBonus} XP</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="stats-section">
        <h3>À débloquer</h3>
        <ul className="my-rides-list">
          {lockedBadges.map((badge) => (
            <li key={badge.id} className="my-rides-item">
              <span>{badge.name}</span>
              <span className="my-rides-item-meta">
                {Math.round(badge.progress * 100)}% · +{badge.xpBonus} XP
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="stats-section">
        <h3>Inviter des amis</h3>
        <p className="my-rides-hint">
          Ton ami reçoit un accès premium en utilisant ton code ; toi, tu gagnes un badge et de l'XP.
        </p>
        {codeError && <p className="dialog-error">{codeError}</p>}
        {referralCode ? (
          <div className="threshold-input">
            <strong>{referralCode}</strong>
            <button type="button" className="button button-ghost" onClick={handleCopyCode}>
              {codeCopied ? 'Copié !' : 'Copier'}
            </button>
          </div>
        ) : (
          <button type="button" className="button button-primary" onClick={handleGenerateCode} disabled={isGeneratingCode}>
            {isGeneratingCode ? 'Génération...' : 'Générer mon code'}
          </button>
        )}
      </section>

      {canRedeemReferral && (
        <section className="stats-section">
          <h3>Un ami t'a invité ?</h3>
          <label className="dialog-field">
            Code de parrainage
            <input
              type="text"
              value={redeemInput}
              onChange={(event) => {
                setRedeemInput(event.target.value);
                setRedeemError(null);
                setRedeemSuccess(false);
              }}
              placeholder="Ex: AB2K9XZ"
              maxLength={40}
              disabled={isRedeeming}
            />
          </label>
          {redeemError && <p className="dialog-error">{redeemError}</p>}
          {redeemSuccess && <div className="banner banner-success">Code validé, tu es maintenant Premium !</div>}
          <button
            type="button"
            className="button button-ghost"
            onClick={handleRedeem}
            disabled={isRedeeming || !redeemInput.trim()}
          >
            {isRedeeming ? 'Validation...' : 'Valider le code'}
          </button>
        </section>
      )}
    </main>
  );
}

import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useFeedbackEntries } from '../hooks/useFeedbackEntries';
import { deleteFeedback, voteFeedback } from '../utils/feedbackStorage';

interface FeedbackAdminViewProps {
  user: User;
  onClose: () => void;
}

/** Reservee aux Moderator/Admin (voir firestore.rules match /feedback). Un vote
 * par moderateur par commentaire - une fois vote, on desactive localement les
 * boutons pour cette entree (le rule empeche de toute facon un second vote de
 * compter, mais un moderateur qui recharge la page pourrait re-cliquer sans le
 * savoir : acceptable pour un outil interne). */
export function FeedbackAdminView({ user, onClose }: FeedbackAdminViewProps) {
  const { entries, isLoading, error, refresh } = useFeedbackEntries();
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleVote = async (entryId: string, direction: 'up' | 'down') => {
    setPendingId(entryId);
    try {
      const counted = await voteFeedback(entryId, user.uid, direction);
      if (counted) {
        setVotedIds((prev) => new Set(prev).add(entryId));
      }
      refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setPendingId(null);
    }
  };

  const handleDelete = async (entryId: string) => {
    setPendingId(entryId);
    try {
      await deleteFeedback(entryId);
      refresh();
    } catch (err) {
      console.error(err);
      setPendingId(null);
    }
  };

  return (
    <main className="my-rides-screen">
      <div className="my-rides-header">
        <h2>Feedbacks</h2>
        <button type="button" className="button button-ghost" onClick={onClose}>
          Retour
        </button>
      </div>

      {isLoading && <p className="my-rides-hint">Chargement...</p>}
      {error && <div className="banner banner-error">{error}</div>}
      {!isLoading && entries && entries.length === 0 && (
        <p className="my-rides-hint">Aucun commentaire pour l'instant.</p>
      )}

      {entries && entries.length > 0 && (
        <ul className="my-rides-list">
          {entries.map((entry) => {
            const hasVoted = votedIds.has(entry.id);
            const isPending = pendingId === entry.id;
            return (
              <li key={entry.id} className="feedback-admin-item">
                <span className="feedback-admin-score">{entry.score}</span>
                <div className="feedback-admin-body">
                  <p className="feedback-admin-message">{entry.message}</p>
                  <span className="my-rides-item-meta">{new Date(entry.createdAtMs).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="feedback-admin-actions">
                  <button
                    type="button"
                    className="button button-ghost"
                    disabled={isPending || hasVoted}
                    onClick={() => handleVote(entry.id, 'up')}
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    className="button button-ghost"
                    disabled={isPending || hasVoted}
                    onClick={() => handleVote(entry.id, 'down')}
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={isPending}
                    onClick={() => handleDelete(entry.id)}
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

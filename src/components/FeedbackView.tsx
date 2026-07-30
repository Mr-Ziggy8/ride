import { useState } from 'react';
import type { User } from 'firebase/auth';
import { submitFeedback } from '../utils/feedbackStorage';

interface FeedbackViewProps {
  user: User;
  onClose: () => void;
}

export function FeedbackView({ user, onClose }: FeedbackViewProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    setIsSending(true);
    setError(null);
    try {
      await submitFeedback(user.uid, trimmed);
      setMessage('');
      setSent(true);
    } catch (err) {
      console.error(err);
      setError("Échec de l'envoi. Réessaie.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="my-rides-screen">
      <div className="my-rides-header">
        <h2>Envoyer un commentaire</h2>
        <button type="button" className="button button-ghost" onClick={onClose}>
          Retour
        </button>
      </div>

      <div className="fuel-log-form">
        <label className="dialog-field">
          Ton retour ou ta suggestion
          <textarea
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              setSent(false);
            }}
            maxLength={2000}
            rows={6}
            disabled={isSending}
          />
        </label>

        {error && <p className="dialog-error">{error}</p>}
        {sent && <div className="banner banner-success">Merci, ton retour a bien été envoyé.</div>}

        <button
          type="button"
          className="button button-primary"
          onClick={handleSubmit}
          disabled={isSending || !message.trim()}
        >
          {isSending ? 'Envoi...' : 'Envoyer'}
        </button>
      </div>
    </main>
  );
}

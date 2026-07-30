import type { User } from 'firebase/auth';

interface AuthButtonProps {
  user: User | null;
  isLoading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function AuthButton({ user, isLoading, onSignIn, onSignOut }: AuthButtonProps) {
  if (isLoading) return null;

  if (user) {
    return (
      <div className="auth-status">
        <span className="auth-status-name">{user.displayName ?? 'Compte'}</span>
        <button type="button" className="button button-ghost" onClick={onSignOut}>
          Se déconnecter
        </button>
      </div>
    );
  }

  return (
    <button type="button" className="button button-ghost" onClick={onSignIn}>
      Se connecter avec Google
    </button>
  );
}

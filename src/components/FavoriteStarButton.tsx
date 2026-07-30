interface FavoriteStarButtonProps {
  isFavorite: boolean;
  isPending: boolean;
  onToggle: () => void;
}

export function FavoriteStarButton({ isFavorite, isPending, onToggle }: FavoriteStarButtonProps) {
  return (
    <button
      type="button"
      className={`favorite-star${isFavorite ? ' favorite-star--active' : ''}`}
      onClick={onToggle}
      disabled={isPending}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      {isFavorite ? '★' : '☆'}
    </button>
  );
}

export interface CompassProps {
  heading: number | null;
}

/**
 * The map itself never rotates (north stays up), so this shows where you're
 * currently heading as a needle against a fixed N/E/S/W dial.
 */
export function Compass({ heading }: CompassProps) {
  return (
    <div className={`compass${heading === null ? ' compass--unknown' : ''}`}>
      <svg viewBox="0 0 44 44" width="44" height="44">
        <circle cx="22" cy="22" r="20" className="compass-dial" />
        <text x="22" y="9" className="compass-label" textAnchor="middle">
          N
        </text>
        <text x="37" y="26" className="compass-label" textAnchor="middle">
          E
        </text>
        <text x="22" y="41" className="compass-label" textAnchor="middle">
          S
        </text>
        <text x="7" y="26" className="compass-label" textAnchor="middle">
          O
        </text>
        {heading !== null && (
          <path
            d="M22 10 L27 25 L22 21 L17 25 Z"
            className="compass-needle"
            transform={`rotate(${heading} 22 22)`}
          />
        )}
      </svg>
    </div>
  );
}

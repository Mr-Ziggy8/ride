interface ToggleSwitchProps {
  /** false = leftLabel actif, true = rightLabel actif. */
  checked: boolean;
  onChange: (checked: boolean) => void;
  leftLabel: string;
  rightLabel: string;
  disabled?: boolean;
}

export function ToggleSwitch({ checked, onChange, leftLabel, rightLabel, disabled }: ToggleSwitchProps) {
  return (
    <div className="toggle-switch-row">
      <span className={`toggle-switch-label${!checked ? ' toggle-switch-label--active' : ''}`}>{leftLabel}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`toggle-switch${checked ? ' toggle-switch--on' : ''}`}
        onClick={() => onChange(!checked)}
        disabled={disabled}
      >
        <span className="toggle-switch-thumb" />
      </button>
      <span className={`toggle-switch-label${checked ? ' toggle-switch-label--active' : ''}`}>{rightLabel}</span>
    </div>
  );
}

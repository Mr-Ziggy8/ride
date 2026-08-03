import { useEffect, useMemo, useRef, useState } from 'react';

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchPlaceholder?: string;
}

/** Dropdown ferme par defaut, panneau avec champ de recherche + checkboxes -
 * evite les listes de chips qui prennent toute la place a l'ecran (ex. filtre Pays). */
export function MultiSelectDropdown({ label, options, selected, onChange, searchPlaceholder }: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) setQuery('');
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.toLowerCase().includes(q));
  }, [options, query]);

  const toggleOption = (option: string) => {
    const next = selected.includes(option) ? selected.filter((o) => o !== option) : [...selected, option];
    onChange(next);
  };

  const summary = selected.length === 0 ? label : `${label} (${selected.length})`;

  return (
    <div className="multiselect-dropdown" ref={containerRef}>
      <button
        type="button"
        className={`multiselect-dropdown-trigger${selected.length > 0 ? ' multiselect-dropdown-trigger--active' : ''}`}
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
      >
        <span>{summary}</span>
        <span className="multiselect-dropdown-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen && (
        <div className="multiselect-dropdown-panel" role="listbox" aria-multiselectable="true">
          <input
            type="text"
            className="multiselect-dropdown-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder ?? 'Rechercher...'}
            autoFocus
          />
          <div className="multiselect-dropdown-options">
            {filteredOptions.length === 0 && <p className="multiselect-dropdown-empty">Aucun résultat</p>}
            {filteredOptions.map((option) => (
              <label key={option} className="multiselect-dropdown-option">
                <input type="checkbox" checked={selected.includes(option)} onChange={() => toggleOption(option)} />
                {option}
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <button type="button" className="multiselect-dropdown-clear" onClick={() => onChange([])}>
              Tout désélectionner
            </button>
          )}
        </div>
      )}
    </div>
  );
}

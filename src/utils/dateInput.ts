/** Valeur pour un <input type="date"> (YYYY-MM-DD, pas d'heure). */
export function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export function dateInputValueFromMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

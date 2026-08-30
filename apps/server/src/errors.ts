/**
 * Fehlermeldung aus einem unbekannten Fehlerwert.
 *
 * In TypeScript ist der Wert in einem `catch` `unknown` — er muss nicht von `Error`
 * abstammen. Diese Funktion hält das Verhalten der bisherigen Schreibweise
 * `String(err.message || err)` bei, ohne blind auf `.message` zuzugreifen.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  return String(err)
}

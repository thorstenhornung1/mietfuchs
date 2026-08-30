import { formatEuro, parseEuro, formatCivilDate, isCivilDate } from '@mietfuchs/domain'

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers =
    init?.body && !(init.body instanceof FormData)
      ? { 'Content-Type': 'application/json', ...init?.headers }
      : init?.headers
  const res = await fetch(path, { ...init, headers })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error || `${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

// Geld- und Datumsformatierung kommen aus dem gemeinsamen Domain-Package: Server, Client
// und Tests müssen zeichengleich dasselbe anzeigen.

/** Anzeige eines Betrags. Bewusst streng — ein Nicht-Integer wäre ein Bruch von Invariante 17. */
export const fmtEuro = formatEuro

export { parseEuro }

/**
 * Anzeige eines Kalendertags. Bewusst tolerant: In Formularen ist ein Datumsfeld während
 * der Eingabe leer oder halb getippt, und die Darstellung darf daran nicht scheitern.
 * Die strenge Prüfung gehört an die Domänengrenze, nicht in die Anzeige.
 */
export const fmtDate = (iso: string | null | undefined) =>
  isCivilDate(iso) ? formatCivilDate(iso) : ''

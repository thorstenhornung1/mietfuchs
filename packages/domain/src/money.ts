// Geld in Mietfuchs.
//
// Invariante 17: Alle Geldbeträge sind ganzzahlige Cent. Es gibt keinen Euro-Float im
// Datenmodell, in der API oder in der Persistenz. Fließkomma darf ausschließlich als
// Zwischenschritt einer Verteilung auftreten und wird dort sofort wieder auf ganze Cent
// gebracht.
//
// Die Formatierung ist bewusst ohne `Intl` implementiert. Sie muss auf Server, Client und
// in Tests zeichengleich dasselbe liefern; `toLocaleString` hängt dagegen von der
// ICU-Version der jeweiligen Node-/Browser-Installation ab. Das Ergebnis entspricht der
// de-DE-Währungsformatierung inklusive des geschützten Leerzeichens vor dem Eurozeichen.

/** Ein Geldbetrag in ganzen Cent. Positiv = Forderung/Guthaben, negativ = Gegenrichtung. */
export type Cents = number

const NBSP = ' '

export function isCents(value: unknown): value is Cents {
  return typeof value === 'number' && Number.isInteger(value)
}

export function assertCents(value: unknown, context = 'Betrag'): Cents {
  if (!isCents(value)) {
    throw new TypeError(
      `${context}: ${String(value)} ist kein ganzzahliger Cent-Betrag (Invariante 17)`,
    )
  }
  return value
}

export function sumCents(values: readonly Cents[]): Cents {
  let sum = 0
  for (const v of values) sum += assertCents(v)
  return sum
}

/**
 * Liest einen eingegebenen Betrag als Cent.
 *
 * Akzeptiert die deutsche Schreibweise („1.234,56") und die technische („1234.56"),
 * jeweils mit optionalem Eurozeichen und Leerraum. Nicht lesbare Eingaben ergeben `null`
 * und nicht etwa 0 — eine stille Null wäre ein Fallback im Sinne von Invariante 20.
 *
 * Ein Punkt ohne Komma wird technisch gelesen: „1.234" ergibt 123 ct, nicht 123.400 ct.
 * Siehe docs/settlement-baseline-befunde.md (B7).
 */
export function parseEuro(input: string): Cents | null {
  const trimmed = input.replace(/[€\s]/g, '')
  if (!trimmed) return null
  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed
  const value = Number(normalized)
  return Number.isFinite(value) ? Math.round(value * 100) : null
}

/** Betrag in deutscher Schreibweise ohne Währungszeichen, z. B. `1.234,56`. */
export function formatCentsPlain(cents: Cents): string {
  assertCents(cents)
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const euro = Math.trunc(abs / 100)
  const rest = abs % 100
  const grouped = String(euro).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${sign}${grouped},${String(rest).padStart(2, '0')}`
}

/** Betrag in deutscher Schreibweise mit Eurozeichen, z. B. `1.234,56 €`. */
export function formatEuro(cents: Cents): string {
  return `${formatCentsPlain(cents)}${NBSP}€`
}

// Kalendertage in Mietfuchs.
//
// Invariante 102: Civil/legal date ≠ timestamp. Ein Mietbeginn, ein Abrechnungszeitraum,
// ein Ablesedatum sind Kalendertage — keine Zeitpunkte. Sie tragen keine Uhrzeit und keine
// Zeitzone, und sie dürfen nie über ein lokales `new Date(...)` laufen, weil dabei je nach
// Zeitzone ein Tag verrutscht.
//
// Alle Zeiträume haben inklusive Grenzen (Spec §57): `2025-01-01` bis `2025-12-31` sind
// 365 Tage, und ein Mietverhältnis, das am 30.06. endet, überschneidet sich nicht mit
// einem, das am 01.07. beginnt.

/** Ein Kalendertag als `YYYY-MM-DD`. */
export type CivilDate = string

/** Ein Kalendermonat als `YYYY-MM` — die Form der Staffeln (Miete, Vorauszahlung). */
export type CivilMonth = string

const MS_DAY = 86_400_000
const SHAPE = /^(\d{4})-(\d{2})-(\d{2})$/

export function daysInYear(year: number): number {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return daysInYear(year) === 366 ? 29 : 28
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31
}

export function isCivilDate(value: unknown): value is CivilDate {
  if (typeof value !== 'string') return false
  const parts = value.match(SHAPE)
  if (!parts) return false
  const year = Number(parts[1])
  const month = Number(parts[2])
  const day = Number(parts[3])
  if (month < 1 || month > 12 || day < 1) return false
  return day <= daysInMonth(year, month)
}

export function assertCivilDate(value: unknown, context = 'Datum'): CivilDate {
  if (!isCivilDate(value)) {
    throw new TypeError(
      `${context}: ${String(value)} ist kein Kalendertag im Format YYYY-MM-DD (Invariante 102)`,
    )
  }
  return value
}

/**
 * Tag als UTC-Millisekunden. Ausschließlich intern und ausschließlich in UTC — damit
 * bleibt die Rechnung unabhängig von der Zeitzone des Rechners, auf dem sie läuft.
 */
function toUTC(date: CivilDate): number {
  const [y, m, d] = assertCivilDate(date).split('-').map(Number)
  return Date.UTC(y!, m! - 1, d!)
}

function fromUTC(ms: number): CivilDate {
  return new Date(ms).toISOString().slice(0, 10)
}

/** Anzahl Tage von `from` bis `to`, beide Grenzen eingeschlossen. 0, wenn `to` vor `from` liegt. */
export function daysInclusive(from: CivilDate, to: CivilDate): number {
  const days = Math.round((toUTC(to) - toUTC(from)) / MS_DAY) + 1
  return days > 0 ? days : 0
}

/**
 * Überschneidung zweier Zeiträume in Tagen, alle Grenzen inklusiv.
 * `null` als Ende bedeutet „offen" — etwa ein unbefristetes Mietverhältnis.
 * Sind beide Zeiträume offen, ist die Überschneidung unendlich; das ist ein
 * Programmierfehler an der Aufrufstelle und soll deshalb auffallen, statt still 0 zu sein.
 */
export function overlapDaysInclusive(
  aStart: CivilDate,
  aEnd: CivilDate | null,
  bStart: CivilDate,
  bEnd: CivilDate | null,
): number {
  const start = Math.max(toUTC(aStart), toUTC(bStart))
  const end = Math.min(aEnd ? toUTC(aEnd) : Infinity, bEnd ? toUTC(bEnd) : Infinity)
  if (end === Infinity) return Infinity
  if (end < start) return 0
  return Math.round((end - start) / MS_DAY) + 1
}

export function addDays(date: CivilDate, days: number): CivilDate {
  return fromUTC(toUTC(date) + days * MS_DAY)
}

export function monthOf(date: CivilDate): CivilMonth {
  return assertCivilDate(date).slice(0, 7)
}

/** Erster und letzter Tag eines Abrechnungsjahres. */
export function yearBounds(year: number): { from: CivilDate; to: CivilDate } {
  return { from: `${year}-01-01`, to: `${year}-12-31` }
}

/** Kalendertag in deutscher Schreibweise, z. B. `30.06.2025`. */
export function formatCivilDate(date: CivilDate): string {
  const [y, m, d] = assertCivilDate(date).split('-')
  return `${d}.${m}.${y}`
}

// Prüfung einer IBAN nach ISO 13616, für den Wächter gegen echte IBANs im Repo
// (server/test/no-real-ibans.test.ts) und sonst nichts.
//
// Gültig heißt hier: bekannte Länderkennung, die für das Land vorgeschriebene Länge, Prüfziffern
// im Bereich 02 bis 98 und Rest 1 bei der Division durch 97. Prüfziffern 00, 01 und 99 kann
// das Verfahren nie ergeben; erfundene IBANs in Fixtures tragen deshalb absichtlich die 00
// (Kanon, „Echte Daten sind tabu“). Ob es das Konto gibt, weiß niemand außer der Bank; eine
// gültige Prüfziffer reicht aber, um eine Zeichenfolge als mögliche echte IBAN zu behandeln.

// Länge der IBAN je Land laut IBAN-Register von SWIFT (ISO 13616), Auswahl: alle SEPA-Länder und
// die übrigen gängigen Registerländer. Ein Land mit veränderlicher Länge (Russland) fehlt bewusst.
export const IBAN_LENGTHS: Readonly<Record<string, number>> = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BR: 29, BY: 28,
  CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22, DK: 18, DO: 28, EE: 20, EG: 29, ES: 24, FI: 18,
  FO: 18, FR: 27, GB: 22, GE: 22, GI: 23, GL: 18, GR: 27, GT: 28, HR: 21, HU: 28, IE: 22,
  IL: 23, IQ: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28, LC: 32, LI: 21, LT: 20,
  LU: 20, LV: 21, LY: 25, MC: 27, MD: 24, ME: 22, MK: 19, MR: 27, MT: 31, MU: 30, NL: 18,
  NO: 15, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29, RO: 24, RS: 22, SA: 24, SC: 31, SE: 24,
  SI: 19, SK: 24, SM: 27, ST: 25, SV: 28, TL: 23, TN: 24, TR: 26, UA: 29, VA: 22, VG: 24,
  XK: 20,
}

/** Großbuchstaben, ohne Leerzeichen: die Form, in der gerechnet wird. */
export function compactIban(text: string): string {
  return text.replace(/\s+/g, '').toUpperCase()
}

/** Rest der Division durch 97 nach ISO 7064 (MOD 97-10), Buchstaben als A = 10 … Z = 35. */
export function ibanRemainder(compact: string): number {
  const rearranged = compact.slice(4) + compact.slice(0, 4)
  let remainder = 0
  for (const char of rearranged) {
    const value = char >= 'A' && char <= 'Z' ? String(char.charCodeAt(0) - 55) : char
    for (const digit of value) remainder = (remainder * 10 + Number(digit)) % 97
  }
  return remainder
}

/** Ist die Zeichenfolge eine IBAN mit gültiger Prüfziffer? Leerzeichen und Kleinschreibung zählen nicht. */
export function isValidIban(text: string): boolean {
  const compact = compactIban(text)
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(compact)) return false
  const length = IBAN_LENGTHS[compact.slice(0, 2)]
  if (length === undefined || compact.length !== length) return false
  const check = Number(compact.slice(2, 4))
  if (check < 2 || check > 98) return false
  return ibanRemainder(compact) === 1
}

/** Prüfziffern, die eine IBAN mit diesem Land und dieser BBAN gültig machen (für Testdaten). */
export function ibanCheckDigits(country: string, bban: string): string {
  const remainder = ibanRemainder(`${country.toUpperCase()}00${compactIban(bban)}`)
  return String(98 - remainder).padStart(2, '0')
}

/** Nur die ersten und letzten vier Zeichen, damit eine Meldung keine Kontonummer verbreitet. */
export function maskIban(text: string): string {
  const compact = compactIban(text)
  return `${compact.slice(0, 4)}…${compact.slice(-4)}`
}

export interface IbanFinding {
  line: number
  /** Die Fundstelle, wie sie im Text steht (mit Leerzeichen, falls gruppiert). */
  raw: string
}

// Beginn eines Kandidaten: zwei Buchstaben und zwei Ziffern, nicht mitten in einem Wort.
const START = /(?<![A-Za-z0-9])[A-Za-z]{2}\d{2}/g

/**
 * Alle Stellen eines Textes, die eine gültige IBAN sind, kompakt oder in Vierergruppen mit je
 * einem Leerzeichen. Gezählt wird ab dem Länderkürzel genau so viele Zeichen, wie das Land
 * verlangt; folgt danach ohne Trennung noch ein Buchstabe oder eine Ziffer, ist es keine IBAN,
 * sondern ein Stück einer längeren Zeichenfolge.
 */
export function findValidIbans(text: string): IbanFinding[] {
  const findings: IbanFinding[] = []
  for (const match of text.matchAll(START)) {
    const start = match.index
    const length = IBAN_LENGTHS[match[0].slice(0, 2).toUpperCase()]
    if (length === undefined) continue
    let count = 0
    let end = start
    while (end < text.length && count < length) {
      const char = text[end]
      if (/[A-Za-z0-9]/.test(char)) {
        count++
        end++
      } else if (char === ' ' && count >= 4 && /[A-Za-z0-9]/.test(text[end + 1] ?? '')) {
        end++
      } else {
        break
      }
    }
    if (count !== length) continue
    if (/[A-Za-z0-9]/.test(text[end] ?? '')) continue
    const raw = text.slice(start, end)
    if (!isValidIban(raw)) continue
    findings.push({ line: text.slice(0, start).split('\n').length, raw })
  }
  return findings
}

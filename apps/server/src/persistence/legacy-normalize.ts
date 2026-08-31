// Alt-Formate der db.json auf das heutige Modell bringen.
//
// Diese Regeln standen bisher inline im Ladepfad des Stores. Die Migration braucht genau
// dieselben — ein Bestand, der beim Laden anders normalisiert würde als beim Migrieren,
// wäre der sicherste Weg zu einer Abrechnung, die sich beim Umstieg ändert. Deshalb stehen
// sie hier einmal, und beide Wege rufen sie auf.
//
// Die Normalisierung meldet, was sie geändert hat. Für den laufenden Betrieb ist das
// belanglos, für den Migrationsbericht nicht: Eine stille Korrektur bleibt eine Korrektur
// (§271.19 Schritt 9).

import type { Cents, Db, PersonEntry, PrepaymentEntry, RentEntry, Tenancy } from '@mietfuchs/domain'

export type LegacyChange = { path: string; change: string }

/** So kann ein Mietverhältnis auf der Platte aussehen, bevor die Regeln gelaufen sind. */
type StoredTenancy = Omit<Tenancy, 'personHistory' | 'prepayments' | 'baseRents' | 'persons'> & {
  personHistory?: PersonEntry[]
  prepayments?: PrepaymentEntry[]
  baseRents?: RentEntry[]
  /** Altformat vor der Vorauszahlungs-Staffel: ein fester Monatsbetrag. */
  prepaymentMonthlyCents?: Cents
  /** Abgeleitet aus der Staffel — kann von ihr abweichen, siehe B9. */
  persons?: number
}

export function normalizeLegacyDb(
  stored: Partial<Db>,
  defaults: Db,
): { db: Db; changes: LegacyChange[] } {
  const changes: LegacyChange[] = []
  const db: Db = { ...structuredClone(defaults), ...stored }
  db.settings = { ...defaults.settings, ...db.settings }

  db.tenancies.forEach((raw, i) => {
    const t = raw as unknown as StoredTenancy
    const at = `tenancies[${i}]`

    // Fester Monatsbetrag → Vorauszahlungs-Staffel
    if (!Array.isArray(t.prepayments)) {
      t.prepayments =
        t.prepaymentMonthlyCents != null
          ? [{ from: t.start.slice(0, 7), monthlyCents: t.prepaymentMonthlyCents }]
          : []
      if (t.prepaymentMonthlyCents != null) {
        changes.push({
          path: `${at}.prepayments`,
          change: `Fester Monatsbetrag ${t.prepaymentMonthlyCents} ct wurde zur Staffel ab ${t.start.slice(0, 7)}.`,
        })
      }
      delete t.prepaymentMonthlyCents
    }
    if (!t.prepaymentOverrides) t.prepaymentOverrides = {}

    // Feste Personenzahl → Personen-Staffel
    if (!Array.isArray(t.personHistory)) {
      t.personHistory = [{ from: t.start, persons: t.persons ?? 1 }]
      changes.push({
        path: `${at}.personHistory`,
        change: `Feste Personenzahl ${t.persons ?? 1} wurde zur Staffel ab ${t.start}.`,
      })
    }

    // Kaltmiete-Staffel kam später dazu — Altbestand hat sie noch nicht.
    if (!Array.isArray(t.baseRents)) t.baseRents = []

    // Die abgeleitete Personenzahl an die Staffel angleichen (B9). Gerechnet wird ohnehin
    // mit der Staffel; ein abweichender Altwert wäre nur eine Falle für spätere Leser.
    const abgeleitet = t.personHistory.at(-1)?.persons ?? 1
    if (t.persons !== abgeleitet) {
      if (t.persons !== undefined) {
        changes.push({
          path: `${at}.persons`,
          change: `Angezeigte Personenzahl ${t.persons} wich von der Staffel ab und wurde auf ${abgeleitet} gesetzt.`,
        })
      }
      t.persons = abgeleitet
    }
  })

  return { db, changes }
}

// Schnappschüsse für Tests — über den echten Adapter, nicht daneben.
//
// Die Tests bauen den SettlementInput bewusst nicht von Hand zusammen, sondern lassen ihn
// vom LegacyJsonRepository liefern. Damit prüft jeder Engine-Test nebenbei mit, dass der
// Adapter vollständig ist: Lässt er ein Feld weg, schlagen die Tests fehl, statt eine
// Lücke bis in die Abrechnung durchzureichen.

import { LegacyJsonRepository } from '../src/persistence/legacy-json-repository.ts'

/** Vollständiger db.json-Bestand aus einem Teil-Datensatz — fehlende Sammlungen sind leer. */
export function complete(db) {
  return {
    settings: {},
    units: [],
    tenancies: [],
    costItems: [],
    meters: [],
    readings: [],
    payments: [],
    closedSettlements: [],
    ...db,
  }
}

export function repositoryFor(db) {
  const full = complete(db)
  return new LegacyJsonRepository(() => full)
}

export function settlementInput(db, year) {
  return repositoryFor(db).loadSettlementInput(year)
}

export function ledgerInput(db, year) {
  return repositoryFor(db).loadLedgerInput(year)
}

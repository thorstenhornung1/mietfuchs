// Repository-Adapter über die heutige db.json.
//
// Ein Übergangsadapter, ausdrücklich vorgesehen: §271.18 erlaubt ein `LegacyJsonRepository`,
// bis die Bedingungen für seine Entfernung erfüllt sind — also bis SQLite und PostgreSQL
// produktiv sind und die Migration (#4) läuft. Bis dahin hält er die Grenze aufrecht, damit
// die Engine schon jetzt nichts mehr vom Speicher weiß.
//
// Warum das den Aufwand wert ist, obwohl sich fachlich nichts ändert: Wenn der SQLite- und
// der PostgreSQL-Adapter entstehen, müssen sie nur dieselbe Schnittstelle bedienen — und der
// Golden Master prüft dann Backend gegen Backend, nicht Umbau gegen Umbau (§271.26: keine
// backend-spezifischen Golden Results).
//
// Invariante 104: JSON ist Austausch- und Legacyformat, kein dauerhaftes produktives Backend.

import type {
  Db,
  LedgerInput,
  SettlementInput,
  SettlementInputRepository,
} from '@mietfuchs/domain'

/**
 * Liest die Schnappschüsse aus einem geladenen db.json-Bestand.
 *
 * Der Bestand wird als Funktion übergeben und nicht als Wert: `getDb()` lädt beim ersten
 * Zugriff und wird nach einem Restore neu eingelesen. Ein einmal festgehaltener Verweis
 * würde nach `reloadDb()` auf den alten Stand zeigen.
 */
export class LegacyJsonRepository implements SettlementInputRepository {
  readonly #db: () => Db

  constructor(db: () => Db) {
    this.#db = db
  }

  async loadSettlementInput(year: number): Promise<SettlementInput> {
    const db = this.#db()
    return {
      year,
      units: db.units,
      tenancies: db.tenancies,
      // Nur die Positionen des Jahres — die Zuordnung ist über das Feld `year` eindeutig.
      costItems: db.costItems.filter((c) => c.year === year),
      meters: db.meters,
      // Ablesungen bewusst vollständig: Der Verbrauch wird zwischen zwei Ablesungen
      // interpoliert, und der Anfangsstand eines Jahres ist die Ablesung vom 31.12. des
      // Vorjahres. Ein Filter nach Jahr würde den ersten Verbrauchszeitraum verschlucken.
      readings: db.readings,
    }
  }

  async loadLedgerInput(year: number): Promise<LedgerInput> {
    const db = this.#db()
    return {
      year,
      units: db.units,
      tenancies: db.tenancies,
      costItems: db.costItems.filter((c) => c.year === year),
      // Zahlungen vollständig: Die Abgrenzung auf den Jahreszeitraum trifft das Mietkonto
      // selbst, damit dieselbe Regel nicht an zwei Stellen steht.
      payments: db.payments,
    }
  }
}

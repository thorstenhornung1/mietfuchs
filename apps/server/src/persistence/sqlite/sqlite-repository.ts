// Repository-Adapter über SQLite.
//
// Erfüllt dieselbe Schnittstelle wie das LegacyJsonRepository (§271.6). Ob die Abrechnung
// aus der db.json oder aus SQLite gespeist wird, darf am Ergebnis nichts ändern — die
// Tests prüfen genau das, cent-genau, über alle Fixtures (§271.26, Invariante 103).
//
// **Jede Sortierung ist ausdrücklich.** SQLite liefert Zeilen ohne ORDER BY in einer
// Reihenfolge, die von Indizes, Einfügereihenfolge und Abfrageplan abhängt; PostgreSQL
// erst recht. Sich darauf zu verlassen hieße, das Ergebnis vom Backend abhängig zu machen —
// verboten nach §271.26. Die Engine ist zwar seit dem Tie-Break-Fix reihenfolgeunabhängig
// (siehe docs/settlement-baseline-befunde.md, B2), aber die API gibt die Reihenfolge nach
// außen, und die soll stabil sein.

import type {
  CostItem,
  CostKey,
  LedgerInput,
  Meter,
  MeterType,
  Payment,
  PersonEntry,
  PrepaymentEntry,
  Reading,
  RentEntry,
  SettlementInput,
  SettlementInputRepository,
  Tenancy,
  Unit,
} from '@mietfuchs/domain'
import {
  nullable,
  optional,
  toBool,
  toInt,
  toNumber,
  toText,
  type SqlRow,
  type SqliteDatabase,
} from './driver.ts'

export class SqliteRepository implements SettlementInputRepository {
  readonly #db: SqliteDatabase

  constructor(db: SqliteDatabase) {
    this.#db = db
  }

  async loadSettlementInput(year: number): Promise<SettlementInput> {
    return {
      year,
      units: this.#units(),
      tenancies: this.#tenancies(),
      costItems: this.#costItems(year),
      meters: this.#meters(),
      // Ablesungen bewusst vollständig: Der Anfangsstand eines Jahres ist die Ablesung vom
      // 31.12. des Vorjahres. Ein Filter nach Jahr verschluckt den ersten Verbrauchszeitraum.
      readings: this.#readings(),
    }
  }

  async loadLedgerInput(year: number): Promise<LedgerInput> {
    return {
      year,
      units: this.#units(),
      tenancies: this.#tenancies(),
      costItems: this.#costItems(year),
      payments: this.#payments(),
    }
  }

  #units(): Unit[] {
    return this.#db
      .prepare('SELECT * FROM unit ORDER BY id')
      .all()
      .map((r) => ({
        id: toText(r['id']!),
        name: toText(r['name']!),
        areaM2: toNumber(r['area_m2']!),
        participates: toBool(r['participates']!),
        ...defined('rooms', optional(r['rooms']!, toInt)),
        ...defined('floor', optional(r['floor']!, toText)),
        ...defined('notes', optional(r['notes']!, toText)),
      }))
  }

  #tenancies(): Tenancy[] {
    const persons = this.#groupBy<PersonEntry>(
      'SELECT tenancy_id, from_date, persons FROM tenancy_person ORDER BY tenancy_id, from_date',
      (r) => ({ from: toText(r['from_date']!), persons: toInt(r['persons']!) }),
    )
    const prepayments = this.#groupBy<PrepaymentEntry>(
      'SELECT tenancy_id, from_month, monthly_cents FROM tenancy_prepayment ORDER BY tenancy_id, from_month',
      (r) => ({ from: toText(r['from_month']!), monthlyCents: toInt(r['monthly_cents']!) }),
    )
    const baseRents = this.#groupBy<RentEntry>(
      'SELECT tenancy_id, from_month, monthly_cents FROM tenancy_base_rent ORDER BY tenancy_id, from_month',
      (r) => ({ from: toText(r['from_month']!), monthlyCents: toInt(r['monthly_cents']!) }),
    )
    const overrides = this.#groupBy<[string, number]>(
      'SELECT tenancy_id, year, cents FROM tenancy_prepayment_override ORDER BY tenancy_id, year',
      (r) => [String(toInt(r['year']!)), toInt(r['cents']!)],
    )

    return this.#db
      .prepare('SELECT * FROM tenancy ORDER BY id')
      .all()
      .map((r) => {
        const id = toText(r['id']!)
        const history = persons.get(id) ?? []
        return {
          id,
          unitId: toText(r['unit_id']!),
          tenantName: toText(r['tenant_name']!),
          // Abgeleitet aus der Staffel, nicht gespeichert: Der Stand am Ende ist die letzte
          // Stufe. Die Wahrheit ist die Historie (siehe model.ts).
          persons: history.at(-1)?.persons ?? 1,
          personHistory: history,
          start: toText(r['start_date']!),
          end: nullable(r['end_date']!, toText),
          prepayments: prepayments.get(id) ?? [],
          prepaymentOverrides: Object.fromEntries(overrides.get(id) ?? []),
          baseRents: baseRents.get(id) ?? [],
          ...defined('email', optional(r['email']!, toText)),
          ...defined('phone', optional(r['phone']!, toText)),
          ...defined('correspondenceAddress', optional(r['correspondence_address']!, toText)),
          ...defined('iban', optional(r['iban']!, toText)),
          ...defined('contractDate', optional(r['contract_date']!, toText)),
          ...defined('depositCents', optional(r['deposit_cents']!, toInt)),
          ...defined('depositStatus', optional(r['deposit_status']!, toText) as Tenancy['depositStatus']),
          ...defined('notes', optional(r['notes']!, toText)),
        }
      })
  }

  #costItems(year: number): CostItem[] {
    return this.#db
      .prepare('SELECT * FROM cost_item WHERE year = ? ORDER BY id')
      .all(year)
      .map((r) => ({
        id: toText(r['id']!),
        year: toInt(r['year']!),
        category: toText(r['category']!),
        description: toText(r['description']!),
        amountCents: toInt(r['amount_cents']!),
        key: toText(r['key']!) as CostKey,
        ...defined('vendor', optional(r['vendor']!, toText)),
        ...defined('directUnitId', optional(r['direct_unit_id']!, toText)),
        ...defined('meterType', optional(r['meter_type']!, toText) as MeterType | undefined),
        ...defined('labor35aCents', optional(r['labor_35a_cents']!, toInt)),
        ...defined('invoiceFile', optional(r['invoice_file']!, toText)),
      }))
  }

  #meters(): Meter[] {
    return this.#db
      .prepare('SELECT * FROM meter ORDER BY id')
      .all()
      .map((r) => ({
        id: toText(r['id']!),
        name: toText(r['name']!),
        unitId: nullable(r['unit_id']!, toText),
        type: toText(r['type']!) as MeterType,
        unit: toText(r['unit_label']!),
        ...defined('meterNumber', optional(r['meter_number']!, toText)),
      }))
  }

  #readings(): Reading[] {
    return this.#db
      .prepare('SELECT * FROM reading ORDER BY meter_id, read_date, id')
      .all()
      .map((r) => ({
        id: toText(r['id']!),
        meterId: toText(r['meter_id']!),
        date: toText(r['read_date']!),
        value: toNumber(r['value']!),
        ...defined('replacement', toBool(r['replacement']!) || undefined),
        ...defined('oldEndValue', optional(r['old_end_value']!, toNumber)),
        ...defined('note', optional(r['note']!, toText)),
      }))
  }

  #payments(): Payment[] {
    return this.#db
      .prepare('SELECT * FROM payment ORDER BY tenancy_id, pay_date, id')
      .all()
      .map((r) => ({
        id: toText(r['id']!),
        tenancyId: toText(r['tenancy_id']!),
        date: toText(r['pay_date']!),
        amountCents: toInt(r['amount_cents']!),
        ...defined('note', optional(r['note']!, toText)),
      }))
  }

  #groupBy<T>(sql: string, map: (row: SqlRow) => T): Map<string, T[]> {
    const grouped = new Map<string, T[]>()
    for (const row of this.#db.prepare(sql).all()) {
      const key = toText(row['tenancy_id']!)
      const list = grouped.get(key)
      if (list) list.push(map(row))
      else grouped.set(key, [map(row)])
    }
    return grouped
  }
}

/**
 * Ein optionales Feld nur setzen, wenn es einen Wert hat.
 *
 * `{ notes: undefined }` und `{}` sind für `deepStrictEqual` nicht dasselbe — und die Tests
 * vergleichen die Snapshots beider Backends genau so. Ein Feld, das es nicht gibt, soll
 * auch nicht als Schlüssel auftauchen.
 */
function defined<K extends string, V>(key: K, value: V | undefined): Partial<Record<K, V>> {
  return value === undefined ? {} : ({ [key]: value } as Record<K, V>)
}

// Vollständige Prüfung eines db.json-Bestands vor der Migration (§271.19 Schritt 3).
//
// Zwei Entwurfsentscheidungen prägen dieses Modul:
//
// **Es sammelt, statt beim ersten Fehler abzubrechen.** Wer seine Daten migriert, will
// wissen, was alles zu klären ist — nicht dreimal hintereinander je einen Fehler. Die
// Meldungen nennen deshalb den Pfad (`tenancies[2].start`) und was erwartet wurde.
//
// **Es prüft genau das, was die Datenbank später erzwingt.** Jede Regel hier hat ihre
// Entsprechung als CHECK oder FOREIGN KEY im Schema (migrations.ts). Der Unterschied ist
// die Fehlermeldung: Die Datenbank sagt „CHECK constraint failed", dieser Validator sagt,
// welcher Datensatz gemeint ist und warum. Ein Bestand, der hier durchgeht, scheitert
// später nicht am Import — und was hier scheitert, hätte die Migration ohnehin abgebrochen.

import { isCivilDate } from '@mietfuchs/domain'

export type ValidationIssue = {
  /** Wo im Bestand — z. B. `tenancies[2].start`. */
  path: string
  message: string
}

const METER_TYPES = ['kaltwasser', 'strom', 'waerme', 'sonstig']
const COST_KEYS = ['area', 'persons', 'units', 'direct', 'meter']
const DEPOSIT_STATUS = ['offen', 'erhalten', 'teilweise', 'zurückgezahlt']
const MONTH = /^\d{4}-\d{2}$/

/** Prüft einen geparsten db.json-Bestand und liefert alle gefundenen Probleme. */
export function validateLegacyDb(raw: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const add = (path: string, message: string) => issues.push({ path, message })

  if (!isRecord(raw)) {
    add('', 'Die Datei enthält kein Objekt — erwartet wird der Inhalt einer db.json.')
    return issues
  }

  const units = list(raw['units'], 'units', add)
  const tenancies = list(raw['tenancies'], 'tenancies', add)
  const costItems = list(raw['costItems'], 'costItems', add)
  const meters = list(raw['meters'], 'meters', add)
  const readings = list(raw['readings'], 'readings', add)
  const payments = list(raw['payments'], 'payments', add)
  const closed = list(raw['closedSettlements'], 'closedSettlements', add)

  const unitIds = ids(units, 'units', add)
  const tenancyIds = ids(tenancies, 'tenancies', add)
  const meterIds = ids(meters, 'meters', add)
  ids(costItems, 'costItems', add)
  ids(readings, 'readings', add)
  ids(payments, 'payments', add)

  units.forEach((u, i) => validateUnit(u, `units[${i}]`, add))
  tenancies.forEach((t, i) => validateTenancy(t, `tenancies[${i}]`, unitIds, add))
  meters.forEach((m, i) => validateMeter(m, `meters[${i}]`, unitIds, add))
  readings.forEach((r, i) => validateReading(r, `readings[${i}]`, meterIds, add))
  costItems.forEach((c, i) => validateCostItem(c, `costItems[${i}]`, unitIds, add))
  payments.forEach((p, i) => validatePayment(p, `payments[${i}]`, tenancyIds, add))
  closed.forEach((c, i) => validateClosedSettlement(c, `closedSettlements[${i}]`, add))

  return issues
}

// ---------- Einzelprüfungen ----------

function validateUnit(u: unknown, at: string, add: Add): void {
  if (!isRecord(u)) return add(at, 'Kein Objekt.')
  text(u['name'], `${at}.name`, add)
  const area = u['areaM2']
  if (typeof area !== 'number' || !Number.isFinite(area) || area <= 0) {
    add(`${at}.areaM2`, `Wohnfläche muss eine Zahl größer 0 sein, gelesen: ${String(area)}.`)
  }
  if (typeof u['participates'] !== 'boolean') {
    add(`${at}.participates`, `Erwartet wird true oder false, gelesen: ${String(u['participates'])}.`)
  }
}

function validateTenancy(t: unknown, at: string, unitIds: Set<string>, add: Add): void {
  if (!isRecord(t)) return add(at, 'Kein Objekt.')
  reference(t['unitId'], unitIds, `${at}.unitId`, 'Wohnung', add)
  text(t['tenantName'], `${at}.tenantName`, add)

  const start = t['start']
  const end = t['end']
  civilDate(start, `${at}.start`, add)
  if (end !== null && end !== undefined) {
    civilDate(end, `${at}.end`, add)
    if (isCivilDate(start) && isCivilDate(end) && end < start) {
      add(`${at}.end`, `Mietende ${end} liegt vor dem Mietbeginn ${start}.`)
    }
  }

  // Die Staffeln sind der eigentliche Prüfgegenstand: Sie tragen die Rechengrundlage.
  schedule(t['personHistory'], `${at}.personHistory`, 'from', add, (e, path) => {
    civilDate(e['from'], `${path}.from`, add)
    const p = e['persons']
    if (!Number.isInteger(p) || (p as number) <= 0) {
      add(`${path}.persons`, `Personenzahl muss eine ganze Zahl größer 0 sein, gelesen: ${String(p)}.`)
    }
  })
  for (const [field, label] of [['prepayments', 'Vorauszahlung'], ['baseRents', 'Kaltmiete']] as const) {
    schedule(t[field], `${at}.${field}`, 'from', add, (e, path) => {
      if (typeof e['from'] !== 'string' || !MONTH.test(e['from'])) {
        add(`${path}.from`, `${label}-Staffel erwartet einen Monat als YYYY-MM, gelesen: ${String(e['from'])}.`)
      }
      cents(e['monthlyCents'], `${path}.monthlyCents`, add)
    })
  }

  const overrides = t['prepaymentOverrides']
  if (overrides !== undefined && overrides !== null) {
    if (!isRecord(overrides)) {
      add(`${at}.prepaymentOverrides`, 'Erwartet wird eine Zuordnung Jahr → Betrag.')
    } else {
      for (const [year, value] of Object.entries(overrides)) {
        if (!/^\d{4}$/.test(year)) add(`${at}.prepaymentOverrides.${year}`, 'Erwartet wird ein Jahr als YYYY.')
        cents(value, `${at}.prepaymentOverrides.${year}`, add)
      }
    }
  }

  optionalOneOf(t['depositStatus'], DEPOSIT_STATUS, `${at}.depositStatus`, add)
  if (t['contractDate'] !== undefined && t['contractDate'] !== null) {
    civilDate(t['contractDate'], `${at}.contractDate`, add)
  }
  if (t['depositCents'] !== undefined && t['depositCents'] !== null) {
    cents(t['depositCents'], `${at}.depositCents`, add)
  }
}

function validateMeter(m: unknown, at: string, unitIds: Set<string>, add: Add): void {
  if (!isRecord(m)) return add(at, 'Kein Objekt.')
  text(m['name'], `${at}.name`, add)
  text(m['unit'], `${at}.unit`, add)
  oneOf(m['type'], METER_TYPES, `${at}.type`, add)
  // null ist gültig und bedeutet Hauptzähler des Hauses.
  if (m['unitId'] !== null && m['unitId'] !== undefined) {
    reference(m['unitId'], unitIds, `${at}.unitId`, 'Wohnung', add)
  }
}

function validateReading(r: unknown, at: string, meterIds: Set<string>, add: Add): void {
  if (!isRecord(r)) return add(at, 'Kein Objekt.')
  reference(r['meterId'], meterIds, `${at}.meterId`, 'Zähler', add)
  civilDate(r['date'], `${at}.date`, add)
  if (typeof r['value'] !== 'number' || !Number.isFinite(r['value'])) {
    add(`${at}.value`, `Zählerstand muss eine Zahl sein, gelesen: ${String(r['value'])}.`)
  }
  // Ohne Endstand des alten Geräts rechnet die Engine einen negativen Verbrauch.
  if (r['replacement'] === true && typeof r['oldEndValue'] !== 'number') {
    add(`${at}.oldEndValue`, 'Ein Zählerwechsel braucht den Endstand des alten Geräts.')
  }
}

function validateCostItem(c: unknown, at: string, unitIds: Set<string>, add: Add): void {
  if (!isRecord(c)) return add(at, 'Kein Objekt.')
  if (!Number.isInteger(c['year'])) {
    add(`${at}.year`, `Abrechnungsjahr muss eine ganze Zahl sein, gelesen: ${String(c['year'])}.`)
  }
  text(c['category'], `${at}.category`, add)
  text(c['description'], `${at}.description`, add)
  cents(c['amountCents'], `${at}.amountCents`, add)
  oneOf(c['key'], COST_KEYS, `${at}.key`, add)

  if (c['key'] === 'meter') {
    oneOf(c['meterType'], METER_TYPES, `${at}.meterType`, add, 'Ein Verbrauchsschlüssel braucht einen Zählertyp.')
  }
  if (c['key'] === 'direct') {
    reference(c['directUnitId'], unitIds, `${at}.directUnitId`, 'Wohnung', add)
  }
  if (c['labor35aCents'] !== undefined && c['labor35aCents'] !== null) {
    cents(c['labor35aCents'], `${at}.labor35aCents`, add)
  }
}

function validatePayment(p: unknown, at: string, tenancyIds: Set<string>, add: Add): void {
  if (!isRecord(p)) return add(at, 'Kein Objekt.')
  reference(p['tenancyId'], tenancyIds, `${at}.tenancyId`, 'Mietverhältnis', add)
  civilDate(p['date'], `${at}.date`, add)
  cents(p['amountCents'], `${at}.amountCents`, add)
}

function validateClosedSettlement(c: unknown, at: string, add: Add): void {
  if (!isRecord(c)) return add(at, 'Kein Objekt.')
  if (!Number.isInteger(c['year'])) add(`${at}.year`, 'Abrechnungsjahr muss eine ganze Zahl sein.')
  text(c['closedAt'], `${at}.closedAt`, add)
  if (!isRecord(c['settlement'])) {
    add(`${at}.settlement`, 'Der eingefrorene Abrechnungsstand fehlt oder ist kein Objekt.')
  }
}

// ---------- Bausteine ----------

type Add = (path: string, message: string) => void

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function list(v: unknown, path: string, add: Add): unknown[] {
  if (v === undefined || v === null) return []
  if (!Array.isArray(v)) {
    add(path, 'Erwartet wird eine Liste.')
    return []
  }
  return v
}

/** Sammelt die IDs und meldet Dubletten — sie würden am Primärschlüssel scheitern. */
function ids(items: unknown[], path: string, add: Add): Set<string> {
  const seen = new Set<string>()
  items.forEach((item, i) => {
    if (!isRecord(item)) return
    const id = item['id']
    if (typeof id !== 'string' || !id) {
      add(`${path}[${i}].id`, `Jeder Datensatz braucht eine ID, gelesen: ${String(id)}.`)
      return
    }
    if (seen.has(id)) add(`${path}[${i}].id`, `Die ID „${id}" kommt mehrfach vor.`)
    seen.add(id)
  })
  return seen
}

function text(v: unknown, path: string, add: Add): void {
  if (typeof v !== 'string') add(path, `Erwartet wird Text, gelesen: ${String(v)}.`)
}

function civilDate(v: unknown, path: string, add: Add): void {
  if (!isCivilDate(v)) {
    add(path, `Erwartet wird ein Kalendertag als YYYY-MM-DD, gelesen: ${String(v)}.`)
  }
}

function cents(v: unknown, path: string, add: Add): void {
  if (!Number.isInteger(v)) {
    add(path, `Beträge sind ganzzahlige Cent (Invariante 17), gelesen: ${String(v)}.`)
  }
}

function oneOf(v: unknown, allowed: string[], path: string, add: Add, hint?: string): void {
  if (typeof v !== 'string' || !allowed.includes(v)) {
    add(path, `${hint ? `${hint} ` : ''}Erlaubt sind ${allowed.join(', ')} — gelesen: ${String(v)}.`)
  }
}

function optionalOneOf(v: unknown, allowed: string[], path: string, add: Add): void {
  if (v === undefined || v === null) return
  oneOf(v, allowed, path, add)
}

function reference(v: unknown, known: Set<string>, path: string, label: string, add: Add): void {
  if (typeof v !== 'string' || !v) {
    add(path, `Erwartet wird die ID einer ${label}, gelesen: ${String(v)}.`)
    return
  }
  if (!known.has(v)) add(path, `Die ${label} „${v}" gibt es nicht.`)
}

function schedule(
  v: unknown,
  path: string,
  keyField: string,
  add: Add,
  check: (entry: Record<string, unknown>, path: string) => void,
): void {
  if (v === undefined || v === null) return
  if (!Array.isArray(v)) return add(path, 'Erwartet wird eine Liste von Staffelstufen.')
  const seen = new Set<unknown>()
  v.forEach((entry, i) => {
    const at = `${path}[${i}]`
    if (!isRecord(entry)) return add(at, 'Kein Objekt.')
    if (seen.has(entry[keyField])) {
      add(at, `Zum Stichtag ${String(entry[keyField])} gibt es zwei Stufen — welche gilt?`)
    }
    seen.add(entry[keyField])
    check(entry, at)
  })
}

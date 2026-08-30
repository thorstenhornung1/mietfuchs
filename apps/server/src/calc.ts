// Berechnungs-Engine für die Nebenkostenabrechnung.
// Alle Beträge werden in Cent (Integer) gerechnet, um Gleitkomma-Fehler zu vermeiden.
//
// Diese Datei ist mit #16 nach TypeScript überführt worden — typisiert, fachlich
// unverändert (Spec §35: „Die bestehende Berechnungsengine wird nicht umgeschrieben").
// Der Golden Master unter test/fixtures/settlement/ belegt das cent-genau.

import { METER_TYPE_LABELS } from '@mietfuchs/domain'
import type {
  Cents,
  CivilDate,
  ConsumptionOverviewRow,
  CostItem,
  CostKey,
  LedgerInput,
  Meter,
  PersonEntry,
  Reading,
  RentLedger,
  RentMonth,
  SettlementInput,
  SettlementResult,
  Statement,
  Tenancy,
  TaxExpenseCategory,
  TaxReport,
  Unit,
} from '@mietfuchs/domain'

export const KEY_LABELS: Record<CostKey, string> = {
  area: 'Wohnfläche',
  persons: 'Personenzahl',
  units: 'Wohneinheiten',
  direct: 'Direktzuordnung',
  meter: 'Verbrauch (Zähler)',
}

const MS_DAY = 86400000

function toUTC(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
  return Date.UTC(y, m - 1, d)
}

export function daysInYear(year: number): number {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365
}

// Überlappung zweier Zeiträume in Tagen (alle Grenzen inklusiv, ISO-Strings, end=null = offen)
function rangeOverlapDays(
  aStart: string,
  aEnd: string | null,
  bStart: string,
  bEnd: string | null,
): number {
  const s = Math.max(toUTC(aStart), toUTC(bStart))
  const e = Math.min(aEnd ? toUTC(aEnd) : Infinity, bEnd ? toUTC(bEnd) : Infinity)
  if (e < s) return 0
  return Math.round((e - s) / MS_DAY) + 1
}

// Belegte Tage eines Mietverhältnisses innerhalb des Abrechnungsjahres
export function overlapDays(start: string, end: string | null, year: number): number {
  return rangeOverlapDays(start, end, `${year}-01-01`, `${year}-12-31`)
}

// ---------- Personen-Staffel ----------

function personHistoryOf(tenancy: Tenancy): PersonEntry[] {
  const h = Array.isArray(tenancy.personHistory) && tenancy.personHistory.length
    ? tenancy.personHistory
    : [{ from: tenancy.start, persons: tenancy.persons ?? 1 }]
  return h.slice().sort((a, b) => a.from.localeCompare(b.from))
}

// Personentage eines Mietverhältnisses im Zeitraum [from, to] (inklusiv)
export function personDaysInPeriod(tenancy: Tenancy, from: string, to: string): number {
  const h = personHistoryOf(tenancy)
  let sum = 0
  for (let i = 0; i < h.length; i++) {
    const segStart = i === 0 ? tenancy.start : h[i].from // erste Stufe gilt ab Einzug
    const segEnd = i + 1 < h.length
      ? new Date(toUTC(h[i + 1].from) - MS_DAY).toISOString().slice(0, 10)
      : tenancy.end
    const effEnd = tenancy.end && (!segEnd || segEnd > tenancy.end) ? tenancy.end : segEnd
    sum += h[i].persons * rangeOverlapDays(segStart, effEnd, from, to)
  }
  return sum
}

// Aktuelle Personenzahl zu einem Stichtag
export function personsAt(tenancy: Tenancy, dateIso: string): number {
  const h = personHistoryOf(tenancy)
  let p = h[0]?.persons ?? 0
  for (const e of h) if (e.from <= dateIso) p = e.persons
  return p
}

// ---------- Zähler & Verbrauch ----------

/** Verbrauch zwischen zwei aufeinanderfolgenden Ablesungen. */
type MeterSegment = { from: CivilDate; to: CivilDate; delta: number; days: number }

// Ablesungen eines Zählers → Verbrauchssegmente zwischen aufeinanderfolgenden Ablesungen.
// Konvention: eine Ablesung gilt zum Tagesende ihres Datums. Bei Zählerwechsel trägt die
// Ablesung replacement=true: oldEndValue = Endstand des alten Geräts, value = Startstand des neuen.
export function meterSegments(readings: Reading[]): { segments: MeterSegment[]; warnings: string[] } {
  const sorted = readings.slice().sort((a, b) => a.date.localeCompare(b.date))
  const segments: MeterSegment[] = []
  const warnings: string[] = []
  for (let i = 1; i < sorted.length; i++) {
    const r0 = sorted[i - 1]
    const r1 = sorted[i]
    const delta = r1.replacement ? (r1.oldEndValue ?? 0) - r0.value : r1.value - r0.value
    const days = Math.round((toUTC(r1.date) - toUTC(r0.date)) / MS_DAY)
    if (delta < 0) {
      warnings.push(`Negativer Verbrauch zwischen ${r0.date} und ${r1.date} (${delta}) — Ablesung prüfen oder Zählerwechsel markieren.`)
    }
    if (days > 0) segments.push({ from: r0.date, to: r1.date, delta, days })
  }
  return { segments, warnings }
}

// Verbrauch im Zeitraum [from, to] (inklusive Tage). Segmente werden tagesanteilig
// interpoliert — liegt eine Ablesung genau auf der Zeitraumgrenze (z. B. Zwischenablesung
// beim Mieterwechsel), ist die Aufteilung exakt.
export function consumptionInPeriod(readings: Reading[], from: string, to: string): number {
  const { segments } = meterSegments(readings)
  let sum = 0
  const pStart = toUTC(from) - MS_DAY // Zeitraum beginnt nach Tagesende des Vortags
  const pEnd = toUTC(to)
  for (const s of segments) {
    const s0 = toUTC(s.from)
    const s1 = toUTC(s.to)
    const overlap = Math.min(pEnd, s1) - Math.max(pStart, s0)
    if (overlap <= 0) continue
    sum += s.delta * (overlap / MS_DAY / s.days)
  }
  return sum
}

// Jahresübersicht für die Zähler-Seite: Verbrauch pro Zähler + Warnungen
export function consumptionOverview(input: SettlementInput): ConsumptionOverviewRow[] {
  const from = `${input.year}-01-01`
  const to = `${input.year}-12-31`
  return input.meters.map((m) => {
    const readings = input.readings.filter((r) => r.meterId === m.id)
    const { warnings } = meterSegments(readings)
    return {
      meterId: m.id,
      consumption: Math.round(consumptionInPeriod(readings, from, to) * 100) / 100,
      readingCount: readings.length,
      warnings,
    }
  })
}

// ---------- Vorauszahlungen ----------

/**
 * Ein Mietverhältnis, wie es vor der Staffel-Migration aussehen konnte: ein fester
 * Monatsbetrag statt einer Staffel. `store.ts` migriert das beim Laden weg — der Rückfall
 * hier greift nur für Daten, die nicht durch den Store gegangen sind (Tests, Fixtures).
 */
type TenancyWithLegacyPrepayment = Tenancy & { prepaymentMonthlyCents?: Cents }

// Vorauszahlungen eines Jahres: pro Kalendermonat zählt der Staffelbetrag, der am
// Monatsersten gilt — sofern das Mietverhältnis am Monatsersten besteht. Eine manuelle
// Korrektur pro Jahr (tatsächlich gezahlter Betrag) hat immer Vorrang, denn rechtlich
// sind die tatsächlich geleisteten Vorauszahlungen anzusetzen.
export function computePrepaymentCents(
  tenancy: TenancyWithLegacyPrepayment,
  year: number,
): { cents: Cents; overridden: boolean } {
  const override = tenancy.prepaymentOverrides?.[String(year)]
  if (override != null) return { cents: override, overridden: true }
  const schedule = (
    tenancy.prepayments?.length
      ? tenancy.prepayments
      : tenancy.prepaymentMonthlyCents != null // Altformat: ein fester Monatsbetrag
        ? [{ from: tenancy.start.slice(0, 7), monthlyCents: tenancy.prepaymentMonthlyCents }]
        : []
  )
    .slice()
    .sort((a, b) => a.from.localeCompare(b.from))
  let cents = 0
  for (let m = 1; m <= 12; m++) {
    const firstDay = `${year}-${String(m).padStart(2, '0')}-01`
    if (tenancy.start > firstDay) continue
    if (tenancy.end && tenancy.end < firstDay) continue
    let rate = 0
    for (const e of schedule) if (e.from <= firstDay.slice(0, 7)) rate = e.monthlyCents
    cents += rate
  }
  return { cents, overridden: false }
}

// ---------- Mietkonto / Zahlungs-Tracking ----------

// Staffelbetrag, der am Monatsersten gilt (für Kaltmiete oder Vorauszahlung).
// `schedule`: Array aus { from: 'YYYY-MM', monthlyCents }. firstMonth: 'YYYY-MM'.
function rateAtMonth(schedule: readonly { from: string; monthlyCents: Cents }[], firstMonth: string): Cents {
  let rate = 0
  for (const e of schedule.slice().sort((a, b) => a.from.localeCompare(b.from))) {
    if (e.from <= firstMonth) rate = e.monthlyCents
  }
  return rate
}

// Monats-Mietkonto eines Jahres: pro Mietverhältnis Soll (Bruttomiete = Kaltmiete +
// Vorauszahlung) je Monat, sowie die tatsächlich eingegangenen Zahlungen des Jahres.
// Zahlungen werden den Monaten in Reihenfolge (Jan → Dez) zugeteilt: so spiegelt der
// Status („bezahlt / teilweise / offen") wider, bis zu welchem Monat das Konto gedeckt ist.
export function rentLedger(input: LedgerInput): RentLedger {
  const { year } = input
  const yFrom = `${year}-01-01`
  const yTo = `${year}-12-31`
  const unitById = new Map(input.units.map((u) => [u.id, u]))
  const payments = input.payments

  const rows = input.tenancies
    .filter((t) => overlapDays(t.start, t.end, year) > 0)
    .map((t) => {
      const baseSchedule = Array.isArray(t.baseRents) ? t.baseRents : []
      const ppSchedule = Array.isArray(t.prepayments) ? t.prepayments : []

      const months: RentMonth[] = []
      for (let m = 1; m <= 12; m++) {
        const mm = `${year}-${String(m).padStart(2, '0')}`
        const firstDay = `${mm}-01`
        const active = t.start <= firstDay && !(t.end && t.end < firstDay)
        const baseRentCents = active ? rateAtMonth(baseSchedule, mm) : 0
        const prepaymentCents = active ? rateAtMonth(ppSchedule, mm) : 0
        months.push({
          month: m,
          baseRentCents,
          prepaymentCents,
          sollCents: baseRentCents + prepaymentCents,
          paidCents: 0,
          status: 'open',
        })
      }

      // Zahlungseingänge des Jahres der Reihe nach auf die Monate verteilen
      const paidYearCents = payments
        .filter((p) => p.tenancyId === t.id && p.date >= yFrom && p.date <= yTo)
        .reduce((a, p) => a + p.amountCents, 0)
      let remaining = paidYearCents
      for (const mo of months) {
        if (mo.sollCents <= 0) {
          // kein Soll → als gedeckt behandeln, kein Geld verbrauchen
          mo.status = 'paid'
          continue
        }
        const applied = Math.max(0, Math.min(remaining, mo.sollCents))
        mo.paidCents = applied
        remaining -= applied
        mo.status = applied >= mo.sollCents ? 'paid' : applied > 0 ? 'partial' : 'open'
      }

      const sollYearCents = months.reduce((a, mo) => a + mo.sollCents, 0)
      const baseRentYearCents = months.reduce((a, mo) => a + mo.baseRentCents, 0)
      const prepaymentYearCents = months.reduce((a, mo) => a + mo.prepaymentCents, 0)
      return {
        tenancyId: t.id,
        tenantName: t.tenantName,
        unitName: unitById.get(t.unitId)?.name ?? '—',
        months,
        sollYearCents,
        baseRentYearCents,
        prepaymentYearCents,
        paidYearCents,
        balanceCents: paidYearCents - sollYearCents,
        openMonths: months.filter((mo) => mo.status !== 'paid').length,
      }
    })
    .sort((a, b) => a.unitName.localeCompare(b.unitName) || a.tenantName.localeCompare(b.tenantName))

  return {
    year,
    rows,
    totals: {
      sollYearCents: rows.reduce((a, r) => a + r.sollYearCents, 0),
      paidYearCents: rows.reduce((a, r) => a + r.paidYearCents, 0),
      openCents: rows.reduce((a, r) => a + (r.balanceCents < 0 ? -r.balanceCents : 0), 0),
    },
  }
}

// ---------- Steuer-Export (Anlage V) ----------

// Betriebskostenarten den Anlage-V-nahen Positionsgruppen zuordnen. Bewusst beschreibende
// Gruppen statt fester Zeilennummern (die sich jährlich ändern können). Unbekannte Kategorien
// fallen auf „Sonstige Werbungskosten".
const ANLAGE_V_GROUP: Record<string, string> = {
  Grundsteuer: 'Grundsteuer & öffentliche Abgaben',
  'Wasser/Abwasser': 'Laufende Betriebskosten',
  Niederschlagswasser: 'Laufende Betriebskosten',
  Müllabfuhr: 'Laufende Betriebskosten',
  Straßenreinigung: 'Laufende Betriebskosten',
  Gebäudereinigung: 'Laufende Betriebskosten',
  Gartenpflege: 'Laufende Betriebskosten',
  'Beleuchtung/Allgemeinstrom': 'Laufende Betriebskosten',
  Schornsteinfeger: 'Laufende Betriebskosten',
  Hauswart: 'Laufende Betriebskosten',
  Aufzug: 'Laufende Betriebskosten',
  'Kabel/Antenne': 'Laufende Betriebskosten',
  'Sach- und Haftpflichtversicherung': 'Versicherungen',
  'Sonstige Betriebskosten': 'Sonstige Werbungskosten',
  'Nicht umlagefähig': 'Verwaltung & Instandhaltung',
}
// Anzeigereihenfolge der Gruppen in der Auswertung
const ANLAGE_V_GROUP_ORDER: string[] = [
  'Grundsteuer & öffentliche Abgaben',
  'Laufende Betriebskosten',
  'Versicherungen',
  'Verwaltung & Instandhaltung',
  'Sonstige Werbungskosten',
]

// Jahres-Steuerübersicht (Hilfe für die Anlage V): Einnahmen aus dem Mietkonto,
// Werbungskosten aus den Kostenpositionen nach Anlage-V-Gruppen, §35a-Lohnanteile sowie
// der Flächenanteil der vermieteten Einheiten (für gemischt genutzte Gebäude). Die
// Werbungskosten folgen dem Abflussprinzip (im Jahr gebuchte Kosten), die Einnahmen
// werden sowohl als Soll (vereinbart) als auch als Ist (tatsächlich gezahlt) geliefert.
export function taxReport(input: LedgerInput): TaxReport {
  const { year } = input
  const ledger = rentLedger(input)
  const baseRentSollCents = ledger.rows.reduce((a, r) => a + r.baseRentYearCents, 0)
  const prepaymentSollCents = ledger.rows.reduce((a, r) => a + r.prepaymentYearCents, 0)
  const sollCents = ledger.totals.sollYearCents
  const paidCents = ledger.totals.paidYearCents

  // Kostenpositionen des Jahres nach Anlage-V-Gruppe und Kostenart aggregieren
  const items = input.costItems.filter((c) => c.year === year)
  const byGroup = new Map<string, Map<string, TaxExpenseCategory>>()
  for (const item of items) {
    const group = ANLAGE_V_GROUP[item.category] ?? 'Sonstige Werbungskosten'
    if (!byGroup.has(group)) byGroup.set(group, new Map())
    const cats = byGroup.get(group)!
    const prev = cats.get(item.category) ?? { category: item.category, amountCents: 0, labor35aCents: 0 }
    prev.amountCents += item.amountCents
    prev.labor35aCents += item.labor35aCents ?? 0
    cats.set(item.category, prev)
  }
  const groups = [...byGroup.entries()]
    .map(([group, cats]) => {
      const categories = [...cats.values()].sort((a, b) => b.amountCents - a.amountCents)
      return {
        group,
        amountCents: categories.reduce((a, c) => a + c.amountCents, 0),
        labor35aCents: categories.reduce((a, c) => a + c.labor35aCents, 0),
        categories,
      }
    })
    .sort((a, b) => {
      const ia = ANLAGE_V_GROUP_ORDER.indexOf(a.group)
      const ib = ANLAGE_V_GROUP_ORDER.indexOf(b.group)
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
    })
  const totalCents = groups.reduce((a, g) => a + g.amountCents, 0)
  const labor35aCents = groups.reduce((a, g) => a + g.labor35aCents, 0)

  // Flächenanteil der vermieteten (beteiligten) Einheiten — Hinweis bei gemischter Nutzung
  const allUnits = input.units
  const totalArea = allUnits.reduce((a, u) => a + (u.areaM2 || 0), 0)
  const rentedArea = allUnits.filter((u) => u.participates).reduce((a, u) => a + (u.areaM2 || 0), 0)
  const rentedAreaShare = totalArea > 0 ? rentedArea / totalArea : 1
  const selfOccupiedExists = allUnits.some((u) => !u.participates)

  return {
    year,
    income: { baseRentSollCents, prepaymentSollCents, sollCents, paidCents },
    expenses: { groups, totalCents, labor35aCents },
    rentedAreaShare,
    selfOccupiedExists,
    surplusSollCents: sollCents - totalCents,
    surplusPaidCents: paidCents - totalCents,
  }
}

// ---------- Hilfen ----------

// Verteilt totalCents exakt auf die gegebenen (float) Rohanteile (Hare/largest remainder)
// Hare/largest remainder: verteilt `totalCents` centgenau auf die Rohanteile `raws`.
// `keys` liefert je Rohanteil einen fachlich stabilen Schlüssel (i. d. R. die
// Mietverhältnis-ID). Er entscheidet den Gleichstand: Haben mehrere Anteile denselben
// Nachkommaanteil — der Regelfall bei gleich großen Einheiten, siehe Spec §56 —, dann darf
// nicht die zufällige Array- oder Datenbankreihenfolge bestimmen, wer das Restcent bekommt
// (Spec §271.26). Welcher Schlüssel gewinnt, ist fachlich beliebig; entscheidend ist, dass
// dieselben Daten immer dasselbe Ergebnis liefern.
function largestRemainder(totalCents: number, raws: number[], keys: string[] = []): number[] {
  if (raws.length === 0) return []
  const floors = raws.map((r) => Math.floor(r))
  let rest = totalCents - floors.reduce((a, b) => a + b, 0)
  const keyOf = (i: number) => String(keys[i] ?? i)
  const order: [number, number][] = raws
    .map((r, i): [number, number] => [r - Math.floor(r), i])
    .sort((a, b) => b[0] - a[0] || keyOf(a[1]).localeCompare(keyOf(b[1])))
  for (let k = 0; rest > 0; k++, rest--) floors[order[k % order.length][1]]++
  for (let k = 0; rest < 0; k++, rest++) floors[order[order.length - 1 - (k % order.length)][1]]--
  return floors
}

/** Zählertyp für Meldungen an den Vermieter — Benennung statt internem Schlüssel. */
function meterTypeLabel(type: CostItem['meterType']): string {
  return type ? (METER_TYPE_LABELS[type] ?? type) : '—'
}

function fmtNum(n: number): string {
  return n.toLocaleString('de-DE', { maximumFractionDigits: 2 })
}

// ---------- Abrechnung ----------

/** Ein Mietverhältnis, das im Abrechnungsjahr besteht, samt Wohnung und belegten Tagen. */
type ActiveTenancy = Tenancy & { days: number; unit: Unit }

/** Verbrauchsbasis eines Zählertyps über alle Wohnungszähler hinweg. */
type ConsumptionByType = { meters: Meter[]; basis: number; perUnit: Map<string, number> }

export function computeSettlement(input: SettlementInput): SettlementResult {
  const { year } = input
  const diy = daysInYear(year)
  const yFrom = `${year}-01-01`
  const yTo = `${year}-12-31`
  const unitById = new Map(input.units.map((u) => [u.id, u]))
  const partUnits = input.units.filter((u) => u.participates)
  const basisArea = partUnits.reduce((a, u) => a + (u.areaM2 || 0), 0)

  // Mietverhältnisse mit Überlappung im Jahr
  const tenancies = input.tenancies
    .map((t) => ({ ...t, days: overlapDays(t.start, t.end, year), unit: unitById.get(t.unitId) }))
    .filter((t): t is ActiveTenancy => t.days > 0 && t.unit !== undefined)
  const partTenancies = tenancies.filter((t) => t.unit.participates)
  const basisPersonDays = partTenancies.reduce((a, t) => a + personDaysInPeriod(t, yFrom, yTo), 0)

  // Verbrauch je Zählertyp vorbereiten (nur Wohnungszähler bilden die Verteilbasis)
  const allMeters = input.meters
  const allReadings = input.readings
  const meterTypes = [...new Set(allMeters.filter((m) => m.unitId).map((m) => m.type))]
  const consumptionByType: Record<string, ConsumptionByType> = {}
  for (const type of meterTypes) {
    const meters = allMeters.filter((m) => m.unitId && m.type === type)
    const perUnit = new Map<string, number>()
    let basis = 0
    for (const m of meters) {
      const readings = allReadings.filter((r) => r.meterId === m.id)
      const c = consumptionInPeriod(readings, yFrom, yTo)
      basis += c
      perUnit.set(m.unitId!, (perUnit.get(m.unitId!) || 0) + c)
    }
    consumptionByType[type] = { meters, basis, perUnit }
  }

  const statements = new Map<string, Statement>()
  for (const t of partTenancies) {
    const from = new Date(Math.max(toUTC(t.start), toUTC(yFrom)))
    const to = t.end ? new Date(Math.min(toUTC(t.end), toUTC(yTo))) : new Date(toUTC(yTo))
    const pp = computePrepaymentCents(t, year)
    statements.set(t.id, {
      tenancyId: t.id,
      tenantName: t.tenantName,
      unitId: t.unitId,
      unitName: t.unit.name,
      persons: personsAt(t, to.toISOString().slice(0, 10)),
      personDays: personDaysInPeriod(t, yFrom, yTo),
      days: t.days,
      periodStart: from.toISOString().slice(0, 10),
      periodEnd: to.toISOString().slice(0, 10),
      rows: [],
      totalShareCents: 0,
      total35aCents: 0,
      prepaymentCents: pp.cents,
      prepaymentOverridden: pp.overridden,
      suggestedMonthlyCents: 0,
      balanceCents: 0,
    })
  }

  const landlordRows = []
  const warnings = []
  // Das Repository liefert bereits nur die Positionen des Jahres; die Prüfung bleibt als
  // Absicherung stehen, damit die Engine auch für von Hand gebaute Snapshots richtig rechnet.
  const items = input.costItems.filter((c) => c.year === year)
  let totalCostsCents = 0

  for (const item of items) {
    totalCostsCents += item.amountCents
    // Rohanteile (float, in Cent) pro Mietverhältnis bestimmen.
    // Nicht umlagefähige Kosten gehen immer vollständig an den Vermieter.
    const targets = [] // { t, raw, basisText }
    if (item.category === 'Nicht umlagefähig') {
      // keine Verteilung
    } else if (item.key === 'area' && basisArea > 0) {
      for (const t of partTenancies) {
        const raw = item.amountCents * ((t.unit.areaM2 || 0) / basisArea) * (t.days / diy)
        targets.push({ t, raw, basisText: `${fmtNum(t.unit.areaM2)} von ${fmtNum(basisArea)} m²${t.days < diy ? ` · ${t.days}/${diy} Tage` : ''}` })
      }
    } else if (item.key === 'units' && partUnits.length > 0) {
      for (const t of partTenancies) {
        const raw = (item.amountCents / partUnits.length) * (t.days / diy)
        targets.push({ t, raw, basisText: `1 von ${partUnits.length} Einheiten${t.days < diy ? ` · ${t.days}/${diy} Tage` : ''}` })
      }
    } else if (item.key === 'persons' && basisPersonDays > 0) {
      for (const t of partTenancies) {
        const pd = personDaysInPeriod(t, yFrom, yTo)
        const raw = item.amountCents * (pd / basisPersonDays)
        targets.push({ t, raw, basisText: `${fmtNum(pd)} von ${fmtNum(basisPersonDays)} Personentagen` })
      }
    } else if (item.key === 'meter') {
      const data = item.meterType ? consumptionByType[item.meterType] : undefined
      if (data && data.basis > 0) {
        for (const t of partTenancies) {
          const meters = data.meters.filter((m) => m.unitId === t.unitId)
          let c = 0
          for (const m of meters) {
            const readings = allReadings.filter((r) => r.meterId === m.id)
            const pFrom = t.start > yFrom ? t.start : yFrom
            const pTo = t.end && t.end < yTo ? t.end : yTo
            c += consumptionInPeriod(readings, pFrom, pTo)
          }
          const raw = item.amountCents * (c / data.basis)
          targets.push({ t, raw, basisText: `${fmtNum(Math.round(c * 100) / 100)} von ${fmtNum(Math.round(data.basis * 100) / 100)} (gemessen)` })
        }
      }
    } else if (item.key === 'direct') {
      for (const t of tenancies.filter((t) => t.unitId === item.directUnitId)) {
        const raw = item.amountCents * (t.days / diy)
        targets.push({ t, raw, basisText: `Direktzuordnung ${t.unit.name}${t.days < diy ? ` · ${t.days}/${diy} Tage` : ''}` })
      }
    }

    // Eine fehlende Verteilbasis darf nie stillschweigend beim Vermieter landen — der
    // Vermieter würde den Datenmangel sonst nicht bemerken (Invariante 20). Nicht
    // umlagefähige Kosten sind ausgenommen: dort ist das der gewollte Normalfall.
    if (item.category !== 'Nicht umlagefähig' && targets.length === 0) {
      warnings.push(
        item.key === 'meter'
          ? `„${item.description}": kein Verbrauch für Zählertyp „${meterTypeLabel(item.meterType)}" erfasst — Betrag geht an den Vermieter.`
          : `„${item.description}": keine Verteilbasis für Schlüssel „${KEY_LABELS[item.key] || item.key}" — Betrag geht an den Vermieter.`,
      )
    }

    // Exakte Cent-Verteilung: wenn die Rohanteile die Gesamtsumme (nahezu) voll ausschöpfen,
    // wird centgenau auf die Mieter verteilt; ansonsten trägt der Vermieter die Differenz
    // (Leerstand, Eigenanteil, Rundungsrest).
    const rawSum = targets.reduce((a, x) => a + x.raw, 0)
    let shares
    if (targets.length > 0 && Math.abs(item.amountCents - rawSum) < 0.5) {
      shares = largestRemainder(item.amountCents, targets.map((x) => x.raw), targets.map((x) => x.t.id))
    } else {
      shares = targets.map((x) => Math.round(x.raw))
    }
    let distributed = 0
    targets.forEach((x, i) => {
      const st = statements.get(x.t.id)
      // Mietverhältnis in einer nicht beteiligten Wohnung (nur bei Direktzuordnung möglich):
      // Es gibt keine Abrechnung, die den Anteil aufnehmen könnte — er bleibt beim Vermieter.
      // `distributed` darf ihn deshalb nicht mitzählen, sonst verschwindet der Betrag.
      if (!st) return
      distributed += shares[i]
      const labor35a = item.labor35aCents && item.amountCents > 0
        ? Math.round(item.labor35aCents * (shares[i] / item.amountCents))
        : 0
      st.rows.push({
        costItemId: item.id,
        category: item.category,
        description: item.description,
        totalCents: item.amountCents,
        key: item.key,
        keyLabel: KEY_LABELS[item.key] || item.key,
        basisText: x.basisText,
        shareCents: shares[i],
        labor35aCents: labor35a,
      })
      st.totalShareCents += shares[i]
      st.total35aCents += labor35a
    })
    const landlordCents = item.amountCents - distributed
    if (landlordCents !== 0) {
      landlordRows.push({
        costItemId: item.id,
        category: item.category,
        description: item.description,
        totalCents: item.amountCents,
        keyLabel: KEY_LABELS[item.key] || item.key,
        shareCents: landlordCents,
      })
    }
  }

  const result = {
    year,
    daysInYear: diy,
    statements: [...statements.values()],
    landlord: {
      rows: landlordRows,
      totalCents: landlordRows.reduce((a, r) => a + r.shareCents, 0),
    },
    totalCostsCents,
    warnings,
  }
  for (const st of result.statements) {
    st.balanceCents = st.prepaymentCents - st.totalShareCents // >0 Guthaben, <0 Nachzahlung
    // Vorschlag nach §560 Abs. 4 BGB: ein Zwölftel der Jahreskosten, auf volle Euro gerundet
    st.suggestedMonthlyCents = Math.round(st.totalShareCents / 12 / 100) * 100
  }
  return result
}

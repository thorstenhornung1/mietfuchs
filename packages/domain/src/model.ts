// Das Datenmodell von Mietfuchs.
//
// Bis Mietfuchs Next lag es allein in client/src/types.ts — der Server kannte keine
// Domänentypen als Code und musste per Konvention konsistent bleiben. Hier steht es
// jetzt einmal, für Server und Client (Spec §37/§38).
//
// Alle Geldbeträge sind `Cents` (Invariante 17), alle Datumsangaben `CivilDate` bzw.
// `CivilMonth` (Invariante 102) — die Feldnamen mit `Cents`-Suffix bleiben erhalten,
// weil sie im gespeicherten Datenbestand so heißen.

import type { Cents } from './money.ts'
import type { CivilDate, CivilMonth } from './dates.ts'

// ---------- Stammdaten ----------

export type Unit = {
  id: string
  name: string
  areaM2: number
  participates: boolean
  // Erweiterte Stammdaten (optional, ohne Einfluss auf die Berechnung)
  rooms?: number
  floor?: string
  notes?: string
}

/** „Ab diesem Monat gilt dieser Betrag" — die Staffelmechanik für Miete und Vorauszahlung. */
export type PrepaymentEntry = {
  from: CivilMonth
  monthlyCents: Cents
}

/** Kaltmiete-Staffel. Bruttomiete = Kaltmiete + NK-Vorauszahlung des jeweiligen Monats. */
export type RentEntry = {
  from: CivilMonth
  monthlyCents: Cents
}

/** „Ab diesem Tag gilt diese Personenzahl" — Grundlage der personentagesgenauen Umlage. */
export type PersonEntry = {
  from: CivilDate
  persons: number
}

export type DepositStatus = 'offen' | 'erhalten' | 'teilweise' | 'zurückgezahlt'

export type Tenancy = {
  id: string
  unitId: string
  tenantName: string
  /** Aktuelle Personenzahl — abgeleitet aus personHistory, nicht die Wahrheit. */
  persons: number
  personHistory: PersonEntry[]
  start: CivilDate
  /** `null` = unbefristet. */
  end: CivilDate | null
  prepayments: PrepaymentEntry[]
  /** Jahr → tatsächlich gezahlter Betrag. Hat Vorrang vor der Staffel. */
  prepaymentOverrides: Record<string, Cents>
  /** Kaltmiete-Staffel (leer = nicht erfasst). */
  baseRents: RentEntry[]
  // Erweiterte Stammdaten (optional, ohne Einfluss auf die Berechnung)
  email?: string
  phone?: string
  correspondenceAddress?: string
  iban?: string
  contractDate?: CivilDate
  depositCents?: Cents
  depositStatus?: DepositStatus
  notes?: string
}

/** Eine gebuchte Mietzahlung (Geldeingang). */
export type Payment = {
  id: string
  tenancyId: string
  date: CivilDate
  amountCents: Cents
  note?: string
}

export type MeterType = 'kaltwasser' | 'strom' | 'waerme' | 'sonstig'

export type Meter = {
  id: string
  name: string
  /** `null` = Hauptzähler für das ganze Haus; nur Wohnungszähler bilden die Verteilbasis. */
  unitId: string | null
  type: MeterType
  meterNumber?: string
  /** Maßeinheit, z. B. m³. */
  unit: string
}

export type Reading = {
  id: string
  meterId: string
  date: CivilDate
  value: number
  /** Zählerwechsel: `value` ist der Startstand des neuen Geräts. */
  replacement?: boolean
  /** Endstand des alten Geräts beim Wechsel. */
  oldEndValue?: number
  note?: string
}

export type CostKey = 'area' | 'persons' | 'units' | 'direct' | 'meter'

export type CostItem = {
  id: string
  year: number
  category: string
  description: string
  vendor?: string
  amountCents: Cents
  key: CostKey
  directUnitId?: string
  meterType?: MeterType
  /** Lohnanteil nach § 35a EStG. */
  labor35aCents?: Cents
  invoiceFile?: string
}

export type Settings = {
  houseName: string
  address: string
  landlordName: string
  iban: string
  paymentDeadlineDays: number
  ollamaUrl: string
  ollamaModel: string
  /** § 560-Vorschlag zur Vorauszahlungsanpassung andrucken (Standard: ja). */
  printAdjustSuggestion?: boolean
  /** Belegkopien als Anlage mit andrucken (Standard: nein). */
  printAttachments?: boolean
}

// ---------- Abrechnung ----------

export type SettlementRow = {
  costItemId: string
  category: string
  description: string
  totalCents: Cents
  key?: CostKey
  keyLabel: string
  basisText?: string
  shareCents: Cents
  labor35aCents?: Cents
}

export type Statement = {
  tenancyId: string
  tenantName: string
  unitId: string
  unitName: string
  persons: number
  personDays: number
  days: number
  periodStart: CivilDate
  periodEnd: CivilDate
  rows: SettlementRow[]
  totalShareCents: Cents
  total35aCents: Cents
  prepaymentCents: Cents
  prepaymentOverridden: boolean
  suggestedMonthlyCents: Cents
  balanceCents: Cents
}

/** Ergebnis der Berechnungsengine. */
export type SettlementResult = {
  year: number
  daysInYear: number
  statements: Statement[]
  landlord: { rows: SettlementRow[]; totalCents: Cents }
  totalCostsCents: Cents
  warnings: string[]
}

export type ClosedInfo = { closedAt: string; sentAt: string | null }

/**
 * Eine abgeschlossene Abrechnung: der eingefrorene Berechnungsstand eines Jahres.
 * Invariante 13 — ein geschlossener Snapshot ist keine veränderliche Berechnung mehr.
 */
export type ClosedSettlement = {
  id: string
  year: number
  closedAt: string
  sentAt: string | null
  settlement: SettlementResult
}

/** Antwort von `/api/settlement/:year` — Ergebnis plus Abschlusszustand. */
export type Settlement = SettlementResult & { closed: ClosedInfo | null }

export type ConsumptionOverviewRow = {
  meterId: string
  consumption: number
  readingCount: number
  warnings: string[]
}

// ---------- Mietkonto ----------

export type RentMonthStatus = 'paid' | 'partial' | 'open'

export type RentMonth = {
  /** 1..12 */
  month: number
  baseRentCents: Cents
  prepaymentCents: Cents
  /** Bruttomiete = Kaltmiete + Vorauszahlung. */
  sollCents: Cents
  paidCents: Cents
  status: RentMonthStatus
}

export type RentLedgerRow = {
  tenancyId: string
  tenantName: string
  unitName: string
  months: RentMonth[]
  sollYearCents: Cents
  baseRentYearCents: Cents
  prepaymentYearCents: Cents
  paidYearCents: Cents
  /** paid − soll: > 0 Guthaben, < 0 offener Rückstand. */
  balanceCents: Cents
  openMonths: number
}

export type RentLedger = {
  year: number
  rows: RentLedgerRow[]
  totals: {
    sollYearCents: Cents
    paidYearCents: Cents
    /** Summe der offenen Rückstände (nur negative Salden). */
    openCents: Cents
  }
}

// ---------- Steuer (Anlage V) ----------

export type TaxExpenseCategory = { category: string; amountCents: Cents; labor35aCents: Cents }

export type TaxExpenseGroup = {
  /** Anlage-V-nahe Gruppierung, z. B. „Laufende Betriebskosten". */
  group: string
  amountCents: Cents
  labor35aCents: Cents
  categories: TaxExpenseCategory[]
}

export type TaxReport = {
  year: number
  income: {
    baseRentSollCents: Cents
    prepaymentSollCents: Cents
    sollCents: Cents
    /** Tatsächlich eingegangen (Zuflussprinzip). */
    paidCents: Cents
  }
  expenses: {
    groups: TaxExpenseGroup[]
    totalCents: Cents
    labor35aCents: Cents
  }
  /** Vermietete Fläche / Gesamtfläche (0..1). */
  rentedAreaShare: number
  selfOccupiedExists: boolean
  surplusSollCents: Cents
  surplusPaidCents: Cents
}

// ---------- Belege & KI-Auswertung ----------

export type UploadInfo = {
  file: string
  size: number
  mtime: string
}

export type Extraction = {
  vendor?: string
  invoiceDate?: string
  periodStart?: string | null
  periodEnd?: string | null
  totalGrossEur?: number
  positions?: {
    description: string
    category: string
    amountEur: number
    labor35aEur?: number | null
  }[]
}

export type MeterReadingExtraction = {
  meterNumber?: string | null
  value?: number | null
  dateOnImage?: string | null
}

/** Antwort von `/api/intake`: erkennt automatisch Rechnung vs. Zählerfoto. */
export type IntakeResult = { file: string } & (
  | { kind: 'rechnung'; extraction: Extraction }
  | { kind: 'zaehler'; reading: MeterReadingExtraction }
)

// ---------- Persistenz ----------

/**
 * Der gesamte gespeicherte Bestand einer Installation.
 *
 * Invariante 101: Je Installation existiert genau eine persistente fachliche Source of
 * Truth. Heute ist das die db.json; mit #3 wird daraus SQLite bzw. PostgreSQL, ohne dass
 * sich dieses fachliche Bild ändert (Invariante 104: JSON ist Austauschformat).
 */
export type Db = {
  settings: Settings
  units: Unit[]
  tenancies: Tenancy[]
  costItems: CostItem[]
  meters: Meter[]
  readings: Reading[]
  payments: Payment[]
  closedSettlements: ClosedSettlement[]
}

/** Die Sammlungen mit generischen CRUD-Routen. */
export const CRUD_COLLECTIONS = [
  'units',
  'tenancies',
  'costItems',
  'meters',
  'readings',
  'payments',
] as const

export type CrudCollection = (typeof CRUD_COLLECTIONS)[number]

/** Ein Datensatz mit Identität — das gemeinsame Minimum aller CRUD-Sammlungen. */
export type Identifiable = { id: string }

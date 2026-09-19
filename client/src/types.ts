// Beteiligung einer Wohnung an der Kostenverteilung:
//   'vermietet'  → participates: true — Anteil trägt der Mieter
//   'eigen'      → selfUsed: true — zählt in die Verteilbasis, Anteil trägt der Vermieter
//   'ausgenommen'→ beides false — gehört nicht zur Abrechnungseinheit, bleibt außen vor
export type UnitUsage = 'vermietet' | 'eigen' | 'ausgenommen'

export const UNIT_USAGE_LABELS: Record<UnitUsage, string> = {
  vermietet: 'vermietet — Anteil trägt der Mieter',
  eigen: 'Eigennutzung — Anteil trägt der Vermieter',
  ausgenommen: 'nicht beteiligt — bleibt außen vor',
}

export function usageOf(u: Pick<Unit, 'participates' | 'selfUsed'>): UnitUsage {
  if (u.participates) return 'vermietet'
  return u.selfUsed ? 'eigen' : 'ausgenommen'
}

export type Unit = {
  id: string
  name: string
  areaM2: number
  participates: boolean
  // Selbstgenutzt: kein Mietverhältnis, aber Teil der Verteilbasis — der Anteil fällt dem
  // Vermieter zu (Eigenanteil). Kosten für das ganze Haus dürfen nur anteilig auf die
  // Mieter umgelegt werden; siehe UnitUsage.
  selfUsed?: boolean
  selfPersons?: number // Personen im eigenen Haushalt — nur für den Personenschlüssel
  // Erweiterte Stammdaten (optional, ohne Einfluss auf die Berechnung)
  rooms?: number // Zimmerzahl
  floor?: string // Etage, z. B. „EG", „1. OG"
  notes?: string // freie Notiz zur Wohnung
}

export type PrepaymentEntry = {
  from: string // 'YYYY-MM' — ab diesem Monat gilt der Betrag
  monthlyCents: number
}

// Kaltmiete-Staffel — gleiche „ab Monat gilt Betrag"-Mechanik wie die Vorauszahlung.
// Bruttomiete = Kaltmiete + NK-Vorauszahlung des jeweiligen Monats.
export type RentEntry = {
  from: string // 'YYYY-MM'
  monthlyCents: number
}

export type PersonEntry = {
  from: string // 'YYYY-MM-DD' — ab diesem Tag gilt die Personenzahl
  persons: number
}

export type Tenancy = {
  id: string
  unitId: string
  tenantName: string
  persons: number // aktuelle Personenzahl (abgeleitet aus personHistory)
  personHistory: PersonEntry[]
  start: string
  end: string | null
  prepayments: PrepaymentEntry[]
  prepaymentOverrides: Record<string, number> // Jahr → tatsächlich gezahlter Betrag
  baseRents: RentEntry[] // Kaltmiete-Staffel (leer = nicht erfasst)
  // Erweiterte Stammdaten (optional, ohne Einfluss auf die Berechnung) — Kontakt, Kaution, Vertrag
  email?: string
  phone?: string
  correspondenceAddress?: string // abweichende Anschrift für Schriftverkehr (z. B. nach Auszug)
  iban?: string // Mieter-IBAN (für Lastschrift/Guthaben-Rückzahlung)
  contractDate?: string // 'YYYY-MM-DD' — Datum des Mietvertrags
  depositCents?: number // vereinbarte Kaution
  depositStatus?: DepositStatus // Stand der Kaution
  notes?: string // freie Notiz zum Mietverhältnis
}

export type DepositStatus = 'offen' | 'erhalten' | 'teilweise' | 'zurückgezahlt'

export const DEPOSIT_STATUS_LABELS: Record<DepositStatus, string> = {
  offen: 'offen',
  erhalten: 'erhalten',
  teilweise: 'teilweise erhalten',
  'zurückgezahlt': 'zurückgezahlt',
}

// Eine gebuchte Mietzahlung (Geldeingang). Pro Mietverhältnis, datiert.
export type Payment = {
  id: string
  tenancyId: string
  date: string // 'YYYY-MM-DD'
  amountCents: number
  note?: string
}

// ---------- Mietkonto / Zahlungs-Tracking ----------

// 'upcoming' = nicht (voll) bezahlt, aber die Zahlungsfrist läuft noch — kein Rückstand
export type RentMonthStatus = 'paid' | 'partial' | 'open' | 'upcoming'

export type RentMonth = {
  month: number // 1..12
  baseRentCents: number
  prepaymentCents: number
  sollCents: number // Bruttomiete = Kaltmiete + Vorauszahlung
  paidCents: number // dem Monat zugeordneter Zahlungseingang
  status: RentMonthStatus
  payableBy: string // 'YYYY-MM-DD' — Zahlungsfrist: dritter Werktag (§ 556b Abs. 1 BGB)
}

export type RentLedgerRow = {
  tenancyId: string
  tenantName: string
  unitName: string
  months: RentMonth[]
  sollYearCents: number // Brutto-Soll des Jahres
  baseRentYearCents: number // davon Kaltmiete (Netto)
  prepaymentYearCents: number // davon NK-Vorauszahlung
  dueSollCents: number // Soll der Monate, deren Zahlungsfrist am Stichtag abgelaufen ist
  paidYearCents: number
  balanceCents: number // paid − fälliges Soll: >0 Guthaben/Überzahlung, <0 offener Rückstand
  openMonths: number // Monate mit abgelaufener Frist, die nicht voll bezahlt sind
}

export type RentLedger = {
  year: number
  asOf: string | null // Stichtag für Rückstände (heute); null = Jahr gilt als abgelaufen
  place: Place // Ort, nach dem die Zahlungsfristen gerechnet sind (ungültige Angaben als null)
  rows: RentLedgerRow[]
  totals: {
    sollYearCents: number
    paidYearCents: number
    openCents: number // Summe der offenen Rückstände (nur negative Salden)
  }
}

export type MeterType = 'kaltwasser' | 'strom' | 'waerme' | 'sonstig'

export type Meter = {
  id: string
  name: string
  unitId: string | null // null = Hauptzähler (ganzes Haus)
  type: MeterType
  meterNumber?: string
  unit: string // Maßeinheit, z. B. m³
}

export type Reading = {
  id: string
  meterId: string
  date: string
  value: number
  replacement?: boolean // Zählerwechsel: value = Startstand des neuen Geräts
  oldEndValue?: number // Endstand des alten Geräts
  note?: string
}

export const METER_TYPE_LABELS: Record<MeterType, string> = {
  kaltwasser: 'Kaltwasser',
  strom: 'Strom (Allgemein)',
  waerme: 'Wärme',
  sonstig: 'Sonstig',
}

export type CostKey = 'area' | 'persons' | 'units' | 'direct' | 'meter' | 'custom'

export type CostItem = {
  id: string
  year: number
  category: string
  description: string
  vendor?: string
  amountCents: number
  key: CostKey
  // null = beim Schlüsselwechsel bewusst zurückgesetzt (siehe saveItem in Kosten.tsx)
  directUnitId?: string | null
  meterType?: MeterType | null
  // Vereinbarter Schlüssel: Wohnungs-ID → Prozentanteil. Die Anteile gelten absolut;
  // summieren sie unter 100 %, bleibt der Rest beim Vermieter.
  customShares?: Record<string, number> | null
  labor35aCents?: number // Lohnanteil nach §35a EStG
  invoiceFile?: string
}

// ---------- Ort des Hauses ----------
// Gesetzliche Feiertage regelt jedes Bundesland selbst. In Bayern, Sachsen und Thüringen
// gelten einzelne Feiertage nur in einem Teil der Gemeinden; dafür gibt es die Fragen in den
// Stammdaten beim Haus (siehe placeForm.ts).

export type FederalState =
  | 'BW' | 'BY' | 'BE' | 'BB' | 'HB' | 'HH' | 'HE' | 'MV'
  | 'NI' | 'NW' | 'RP' | 'SL' | 'SN' | 'ST' | 'SH' | 'TH'

export const FEDERAL_STATES: Record<FederalState, string> = {
  BW: 'Baden-Württemberg',
  BY: 'Bayern',
  BE: 'Berlin',
  BB: 'Brandenburg',
  HB: 'Bremen',
  HH: 'Hamburg',
  HE: 'Hessen',
  MV: 'Mecklenburg-Vorpommern',
  NI: 'Niedersachsen',
  NW: 'Nordrhein-Westfalen',
  RP: 'Rheinland-Pfalz',
  SL: 'Saarland',
  SN: 'Sachsen',
  ST: 'Sachsen-Anhalt',
  SH: 'Schleswig-Holstein',
  TH: 'Thüringen',
}

// Ort eines Hauses. null = nicht angegeben bzw. „weiß nicht": Mietfuchs rechnet dann vorsichtig.
// Heute gibt es genau ein Haus, sein Ort steht deshalb in den Settings. Code, der den Ort
// braucht, arbeitet nur mit diesem Typ — bei mehreren Objekten hängt er dann am Objekt.
export type Place = {
  federalState: FederalState | null // Bundesland
  assumptionDayHoliday: boolean | null // Bayern: Mariä Himmelfahrt (15.8.) ist in der Gemeinde Feiertag
  inAugsburg: boolean | null // Bayern: Haus liegt in Augsburg (Friedensfest am 8.8.)
  corpusChristiHoliday: boolean | null // Sachsen, Thüringen: Fronleichnam ist in der Gemeinde Feiertag
}

export type Settings = Place & {
  houseName: string
  address: string
  landlordName: string
  iban: string
  paymentDeadlineDays: number
  ollamaUrl: string
  ollamaModel: string
  printAdjustSuggestion?: boolean // §560-Vorschlag zur Vorauszahlungsanpassung andrucken (Standard: ja)
  printAttachments?: boolean // Belegkopien als Anlage mit andrucken (Standard: nein)
}

export type SettlementRow = {
  costItemId: string
  category: string
  description: string
  totalCents: number
  keyLabel: string
  basisText?: string
  shareCents: number
  labor35aCents?: number
}

export type Statement = {
  tenancyId: string
  tenantName: string
  unitName: string
  persons: number
  days: number
  periodStart: string
  periodEnd: string
  rows: SettlementRow[]
  totalShareCents: number
  total35aCents: number
  prepaymentCents: number
  prepaymentOverridden: boolean
  suggestedMonthlyCents: number
  balanceCents: number
}

export type Settlement = {
  year: number
  daysInYear: number
  statements: Statement[]
  landlord: { rows: SettlementRow[]; totalCents: number }
  // im Vermieteranteil enthaltener Eigenanteil selbstgenutzter Wohnungen
  selfUsedShareCents: number
  totalCostsCents: number
  warnings: string[]
  // gesetzt, wenn die Abrechnung abgeschlossen (eingefroren) ist
  closed: { closedAt: string; sentAt: string | null } | null
}

// ---------- Steuer-Export (Anlage V) ----------

export type TaxExpenseCategory = { category: string; amountCents: number; labor35aCents: number }
export type TaxExpenseGroup = {
  group: string // Anlage-V-nahe Gruppierung (z. B. „Laufende Betriebskosten")
  amountCents: number
  labor35aCents: number
  categories: TaxExpenseCategory[]
}

export type TaxReport = {
  year: number
  income: {
    baseRentSollCents: number // Kaltmiete (netto), vereinbart
    prepaymentSollCents: number // NK-Vorauszahlungen, vereinbart
    sollCents: number // Summe Soll (brutto)
    paidCents: number // tatsächlich eingegangen (Zuflussprinzip)
  }
  expenses: {
    groups: TaxExpenseGroup[]
    totalCents: number
    labor35aCents: number // Summe der §35a-Arbeitskosten (Lohnanteile)
  }
  rentedAreaShare: number // vermietete Fläche / Gesamtfläche (0..1)
  selfOccupiedExists: boolean // gibt es nicht vermietete (selbstgenutzte) Einheiten?
  selfUsedShareCents: number // auf selbstgenutzte Wohnungen entfallender Kostenanteil (privat)
  surplusSollCents: number // Einkünfte auf Soll-Basis = Einnahmen(Soll) − Werbungskosten
  surplusPaidCents: number // Einkünfte auf Ist-Basis (Zuflussprinzip)
}

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
  positions?: { description: string; category: string; amountEur: number; labor35aEur?: number | null }[]
}

// KI-Auswertung eines Zählerfotos (universeller Eingang)
export type MeterReadingExtraction = {
  meterNumber?: string | null
  value?: number | null
  dateOnImage?: string | null
}

// Antwort von /api/intake: erkennt automatisch Rechnung vs. Zählerfoto
export type IntakeResult = { file: string } & (
  | { kind: 'rechnung'; extraction: Extraction }
  | { kind: 'zaehler'; reading: MeterReadingExtraction }
)

export const CATEGORIES = [
  'Grundsteuer',
  'Wasser/Abwasser',
  'Niederschlagswasser',
  'Müllabfuhr',
  'Straßenreinigung',
  'Gebäudereinigung',
  'Gartenpflege',
  'Beleuchtung/Allgemeinstrom',
  'Schornsteinfeger',
  'Sach- und Haftpflichtversicherung',
  'Hauswart',
  'Aufzug',
  'Kabel/Antenne',
  'Sonstige Betriebskosten',
  'Nicht umlagefähig',
]

export const KEY_LABELS: Record<CostKey, string> = {
  area: 'nach Wohnfläche',
  persons: 'nach Personenzahl',
  units: 'nach Wohneinheiten',
  direct: 'Direktzuordnung',
  meter: 'nach Verbrauch (Zähler)',
  custom: 'nach vereinbarten Anteilen (%)',
}

// Ordnet eine frei formulierte Kategorie (z. B. aus der KI-Auswertung) der
// nächstliegenden Betriebskostenart zu, statt hart auf „Sonstige" zu fallen.
export function matchCategory(raw: string): string {
  if (CATEGORIES.includes(raw)) return raw
  const s = raw.toLowerCase()
  if (/müll|abfall|restabfall|biotonne|wertstoff/.test(s)) return 'Müllabfuhr'
  if (/niederschlag|regenwasser|oberflächenwasser/.test(s)) return 'Niederschlagswasser'
  if (/wasser|abwasser|kanal/.test(s)) return 'Wasser/Abwasser'
  if (/grundsteuer|grundbesitz/.test(s)) return 'Grundsteuer'
  if (/versicherung|haftpflicht/.test(s)) return 'Sach- und Haftpflichtversicherung'
  if (/straßenreinigung|strassenreinigung|winterdienst/.test(s)) return 'Straßenreinigung'
  if (/schornstein|kamin|feuerstätte/.test(s)) return 'Schornsteinfeger'
  if (/garten|außenanlage|grünpflege/.test(s)) return 'Gartenpflege'
  if (/strom|beleuchtung/.test(s)) return 'Beleuchtung/Allgemeinstrom'
  if (/gebäudereinigung|hausreinigung|treppenhausreinigung/.test(s)) return 'Gebäudereinigung'
  if (/hauswart|hausmeister/.test(s)) return 'Hauswart'
  if (/aufzug|lift/.test(s)) return 'Aufzug'
  if (/kabel|antenne|breitband/.test(s)) return 'Kabel/Antenne'
  if (/instandhalt|reparatur|verwaltung|nicht umlage/.test(s)) return 'Nicht umlagefähig'
  return 'Sonstige Betriebskosten'
}

// Sinnvolle Vorbelegung des Umlageschlüssels je Kostenart
export function defaultKeyFor(category: string): CostKey {
  if (category === 'Wasser/Abwasser' || category === 'Müllabfuhr') return 'persons'
  return 'area'
}

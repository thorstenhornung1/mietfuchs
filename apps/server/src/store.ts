import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import type { Cents, CivilDate, Db, PersonEntry, PrepaymentEntry, RentEntry, Tenancy } from '@mietfuchs/domain'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// In der gepackten Binary (Bun --compile) liegt der Code in einem virtuellen,
// schreibgeschützten Dateisystem — die Daten müssen daneben, in den echten Ordner
// neben die ausführbare Datei. Im Dev-/npm-Betrieb bleibt es bei server/data.
const PACKAGED = !!globalThis.Bun
export const DATA_DIR = PACKAGED
  ? path.join(path.dirname(process.execPath), 'data')
  : path.join(__dirname, '..', 'data')
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads')
const DB_FILE = path.join(DATA_DIR, 'db.json')

const DEFAULT_DB: Db = {
  settings: {
    houseName: '',
    address: '',
    landlordName: '',
    iban: '',
    paymentDeadlineDays: 30,
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'qwen3.6-35b',
  },
  units: [],
  tenancies: [],
  costItems: [],
  meters: [],
  readings: [],
  // Gebuchte Mietzahlungen (Geldeingänge) fürs Mietkonto
  payments: [],
  // Abgeschlossene Abrechnungen: eingefrorener Berechnungsstand je Jahr
  closedSettlements: [],
}

/**
 * So kann ein Mietverhältnis auf der Platte aussehen, bevor die Migrationen in `load()`
 * gelaufen sind: Ältere Bestände kennen die Staffeln noch nicht, sondern nur je einen
 * festen Wert. Der Typ macht sichtbar, dass die Datei ein anderes Bild hat als die Domäne.
 */
type StoredTenancy = Omit<Tenancy, 'personHistory' | 'prepayments' | 'baseRents'> & {
  personHistory?: PersonEntry[]
  prepayments?: PrepaymentEntry[]
  baseRents?: RentEntry[]
  /** Altformat vor der Vorauszahlungs-Staffel: ein fester Monatsbetrag. */
  prepaymentMonthlyCents?: Cents
  /** Altformat vor der Personen-Staffel: eine feste Personenzahl. */
  persons?: number
  start: CivilDate
}

let db: Db | null = null

function load(): Db {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  if (fs.existsSync(DB_FILE)) {
    const stored = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) as Partial<Db>
    db = { ...structuredClone(DEFAULT_DB), ...stored }
    db.settings = { ...DEFAULT_DB.settings, ...db.settings }
  } else {
    db = structuredClone(DEFAULT_DB)
  }
  // Migrationen älterer Datenformate
  for (const t of db.tenancies as unknown as StoredTenancy[]) {
    // fester Monatsbetrag → Vorauszahlungs-Staffel
    if (!Array.isArray(t.prepayments)) {
      t.prepayments =
        t.prepaymentMonthlyCents != null
          ? [{ from: t.start.slice(0, 7), monthlyCents: t.prepaymentMonthlyCents }]
          : []
      delete t.prepaymentMonthlyCents
    }
    if (!t.prepaymentOverrides) t.prepaymentOverrides = {}
    // feste Personenzahl → Personen-Staffel
    if (!Array.isArray(t.personHistory)) {
      t.personHistory = [{ from: t.start, persons: t.persons ?? 1 }]
    }
    // Kaltmiete-Staffel kam später dazu — Altbestand hat sie noch nicht
    if (!Array.isArray(t.baseRents)) t.baseRents = []
  }
  return db
}

export function getDb(): Db {
  return db ?? load()
}

export function save(): void {
  // Atomar schreiben: erst Temp-Datei, dann ersetzen — schützt vor halben Dateien bei Absturz
  const tmp = DB_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(getDb(), null, 2), 'utf8')
  fs.renameSync(tmp, DB_FILE)
}

export function newId(): string {
  return crypto.randomBytes(8).toString('hex')
}

// Nach dem Wiederherstellen eines Backups die db.json neu von der Platte lesen
export function reloadDb(): Db {
  db = null
  return load()
}

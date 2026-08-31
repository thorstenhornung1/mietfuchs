import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import type { Db } from '@mietfuchs/domain'
import { normalizeLegacyDb } from './persistence/legacy-normalize.ts'

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

let db: Db | null = null

function load(): Db {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  const stored: Partial<Db> = fs.existsSync(DB_FILE)
    ? (JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) as Partial<Db>)
    : {}
  // Die Alt-Format-Regeln stehen in legacy-normalize.ts, weil die Migration nach SQLite
  // genau dieselben braucht — ein Bestand, der beim Laden anders normalisiert würde als
  // beim Migrieren, änderte beim Umstieg die Abrechnung.
  db = normalizeLegacyDb(stored, DEFAULT_DB).db
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

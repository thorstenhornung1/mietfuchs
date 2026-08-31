// Zero-Configuration-Upgrade: db.json → SQLite (§271.19, Issue #4).
//
//   1. db.json erkennen                      6. Daten importieren
//   2. keine relationale DB mit Inhalten     7. Settlement-Regression + Integrität
//   3. JSON vollständig validieren           8. DB atomar aktivieren
//   4. Backup der Originaldatei              9. Importprotokoll speichern
//   5. neue SQLite-DB in temporärer Datei   10. db.json nicht automatisch löschen
//
// **Der Kern ist Schritt 7.** §41 fordert: „Für dieselben historischen Eingangsdaten muss
// das Ergebnis der Abrechnung vor und nach Migration cent-genau identisch sein." Das prüft
// diese Migration nicht stichprobenartig, sondern für **jedes Jahr, in dem der Bestand
// etwas enthält** — Abrechnung, Zählerübersicht, Mietkonto und Steuerreport, Feld für Feld.
// Weicht auch nur ein Cent ab, wird nicht aktiviert.
//
// Bei jedem Fehler bleibt die bisherige Datenbasis unverändert: Die neue Datenbank entsteht
// unter einem temporären Namen und wird erst am Ende umbenannt. Die db.json wird nie
// gelöscht — auch nicht nach erfolgreicher Migration (Schritt 10).

import fs from 'node:fs'
import path from 'node:path'
import type { Db } from '@mietfuchs/domain'
import { computeSettlement, consumptionOverview, rentLedger, taxReport } from '../../calc.ts'
import { LegacyJsonRepository } from '../legacy-json-repository.ts'
import { normalizeLegacyDb, type LegacyChange } from '../legacy-normalize.ts'
import { SqliteRepository } from '../sqlite/sqlite-repository.ts'
import { openLocalDatabase } from '../sqlite/startup.ts'
import { writeDb } from '../sqlite/seed.ts'
import { SCHEMA_VERSION } from '../sqlite/migrations.ts'
import { openDatabase } from '../sqlite/driver.ts'
import { validateLegacyDb, type ValidationIssue } from './validate.ts'

export type MigrationReport = {
  format: 'mietfuchs-migration-report'
  version: 1
  startedAt: string
  finishedAt: string
  source: { file: string; sizeBytes: number }
  backup: { file: string }
  target: { file: string; schemaVersion: number }
  counts: Record<string, number>
  /** Was die Alt-Format-Regeln verändert haben — nie stillschweigend (§271.19 Schritt 9). */
  normalizations: LegacyChange[]
  regression: { years: number[]; result: 'cent-genau identisch' }
}

export type MigrationOutcome =
  | { status: 'nichts-zu-tun'; reason: string }
  | { status: 'abgebrochen'; reason: string; issues: ValidationIssue[] }
  | { status: 'migriert'; report: MigrationReport }

const DOMAIN_TABLES = [
  'unit',
  'tenancy',
  'cost_item',
  'meter',
  'reading',
  'payment',
  'closed_settlement',
]

export function migrationPaths(dataDir: string) {
  return {
    source: path.join(dataDir, 'db.json'),
    target: path.join(dataDir, 'mietfuchs.db'),
    temp: path.join(dataDir, 'mietfuchs.db.migrating'),
    backupDir: path.join(dataDir, 'legacy'),
    report: path.join(dataDir, 'migration-report.json'),
  }
}

export async function migrateJsonToSqlite(dataDir: string): Promise<MigrationOutcome> {
  const startedAt = new Date().toISOString()
  const paths = migrationPaths(dataDir)

  // 1. db.json erkennen
  if (!fs.existsSync(paths.source)) {
    return { status: 'nichts-zu-tun', reason: 'Es gibt keine db.json zu migrieren.' }
  }

  // 2. Keine relationale Datenbank mit Fachinhalten vorhanden
  if (fs.existsSync(paths.target)) {
    const existing = await countDomainRows(paths.target)
    if (existing > 0) {
      return {
        status: 'nichts-zu-tun',
        reason: `${paths.target} enthält bereits ${existing} Datensätze — es wird nichts überschrieben.`,
      }
    }
  }

  // 3. Vollständig validieren — vorher die Alt-Format-Regeln anwenden, sonst scheitert ein
  //    älterer Bestand an Feldern, die er noch gar nicht haben kann.
  let parsed: unknown
  try {
    parsed = JSON.parse(fs.readFileSync(paths.source, 'utf8'))
  } catch (err) {
    return {
      status: 'abgebrochen',
      reason: `Die db.json ist kein gültiges JSON: ${err instanceof Error ? err.message : String(err)}`,
      issues: [],
    }
  }
  const { db: source, changes } = normalizeLegacyDb(parsed as Partial<Db>, emptyDb())
  const issues = validateLegacyDb(source)
  if (issues.length > 0) {
    return {
      status: 'abgebrochen',
      reason: `Der Bestand hat ${issues.length} Problem(e). Es wurde nichts verändert.`,
      issues,
    }
  }

  // 4. Backup der Originaldatei — vor jedem Schreibzugriff.
  fs.mkdirSync(paths.backupDir, { recursive: true })
  const backupFile = path.join(paths.backupDir, `db-${startedAt.slice(0, 10)}.json`)
  fs.copyFileSync(paths.source, backupFile)

  // 5. + 6. Neue Datenbank unter temporärem Namen aufbauen und befüllen.
  //    Bewusst ohne WAL: Die fertige Datei wird umbenannt, und ein `rename` bewegt nur die
  //    Hauptdatei. WAL-Beidateien blieben verwaist liegen, und was noch im WAL stünde, wäre
  //    nach dem Umbenennen verloren.
  removeTemp(paths.temp)
  const { db: target } = await openLocalDatabase(paths.temp, { wal: false })
  try {
    writeDb(target, source)

    // 7. Regression und Integrität — der eigentliche Prüfstein (§41)
    const years = relevantYears(source)
    await assertIdenticalResults(source, target, years)
    assertIntegrity(target)
  } catch (err) {
    target.close()
    removeTemp(paths.temp)
    return {
      status: 'abgebrochen',
      reason: `Prüfung nach dem Import fehlgeschlagen, die neue Datenbank wurde verworfen: ${
        err instanceof Error ? err.message : String(err)
      }`,
      issues: [],
    }
  }
  const counts = countAll(target)
  target.close()

  // 8. Atomar aktivieren
  fs.renameSync(paths.temp, paths.target)

  // 9. Protokoll schreiben
  const report: MigrationReport = {
    format: 'mietfuchs-migration-report',
    version: 1,
    startedAt,
    finishedAt: new Date().toISOString(),
    source: { file: paths.source, sizeBytes: fs.statSync(paths.source).size },
    backup: { file: backupFile },
    target: { file: paths.target, schemaVersion: SCHEMA_VERSION },
    counts,
    normalizations: changes,
    regression: { years: relevantYears(source), result: 'cent-genau identisch' },
  }
  fs.writeFileSync(paths.report, JSON.stringify(report, null, 2) + '\n', 'utf8')

  // 10. Die db.json bleibt liegen. Sie ist ab jetzt nicht mehr die Wahrheit (Invariante 101),
  //     aber sie zu löschen wäre eine Entscheidung, die dem Nutzer gehört.
  return { status: 'migriert', report }
}

// ---------- Prüfungen ----------

/**
 * Jahre, für die es etwas zu vergleichen gibt.
 *
 * Bewusst großzügig: jedes Jahr, in dem eine Kostenposition, eine Zahlung, eine Ablesung
 * oder eine abgeschlossene Abrechnung liegt, dazu **jedes Jahr, das ein Mietverhältnis
 * berührt** — auch ohne Kosten, denn das Mietkonto hat schon dann ein Soll, wenn eine
 * Kaltmiete-Staffel hinterlegt ist.
 *
 * Ein unbefristetes Mietverhältnis reicht dabei bis ins laufende Jahr. Das ist keine
 * Kleinigkeit: Der erste Entwurf zählte nur das Startjahr, und ein Bestand mit einem seit
 * 2000 laufenden Mietverhältnis hätte die Jahre 2001 bis heute ungeprüft gelassen — ein
 * Abbildungsfehler in der Mietstaffel wäre genau dort durchgerutscht.
 */
export function relevantYears(db: Db, today = new Date()): number[] {
  const currentYear = today.getUTCFullYear()
  const years = new Set<number>()
  for (const c of db.costItems) years.add(c.year)
  for (const p of db.payments) years.add(Number(p.date.slice(0, 4)))
  for (const r of db.readings) years.add(Number(r.date.slice(0, 4)))
  for (const c of db.closedSettlements) years.add(c.year)
  for (const t of db.tenancies) {
    const from = Number(t.start.slice(0, 4))
    const to = t.end ? Number(t.end.slice(0, 4)) : Math.max(from, currentYear)
    for (let y = from; y <= to; y++) years.add(y)
  }
  return [...years].filter((y) => Number.isInteger(y)).sort((a, b) => a - b)
}

/**
 * Die harte Anforderung aus §41: Vor und nach der Migration muss dasselbe herauskommen.
 *
 * Verglichen wird nicht nur die Abrechnung, sondern alles, was der Nutzer zu sehen bekommt —
 * ein Mietkonto oder ein Steuerreport, der sich beim Umstieg ändert, wäre genauso schlimm.
 */
async function assertIdenticalResults(
  source: Db,
  target: Awaited<ReturnType<typeof openLocalDatabase>>['db'],
  years: number[],
): Promise<void> {
  const json = new LegacyJsonRepository(() => source)
  const sqlite = new SqliteRepository(target)

  for (const year of years) {
    const [aSettlement, bSettlement] = [await json.loadSettlementInput(year), await sqlite.loadSettlementInput(year)]
    const [aLedger, bLedger] = [await json.loadLedgerInput(year), await sqlite.loadLedgerInput(year)]

    compare(`Abrechnung ${year}`, computeSettlement(aSettlement), computeSettlement(bSettlement))
    compare(`Zählerübersicht ${year}`, consumptionOverview(aSettlement), consumptionOverview(bSettlement))
    compare(`Mietkonto ${year}`, rentLedger(aLedger), rentLedger(bLedger))
    compare(`Steuerübersicht ${year}`, taxReport(aLedger), taxReport(bLedger))
  }
}

function compare(what: string, before: unknown, after: unknown): void {
  const a = JSON.stringify(before)
  const b = JSON.stringify(after)
  if (a !== b) {
    throw new Error(
      `${what} weicht nach der Migration ab. Das verletzt die Migrationsanforderung aus §41 ` +
        '(cent-genau identisch vor und nach der Migration).',
    )
  }
}

function assertIntegrity(db: Awaited<ReturnType<typeof openLocalDatabase>>['db']): void {
  const integrity = db.prepare('PRAGMA integrity_check').get()
  if (integrity?.['integrity_check'] !== 'ok') {
    throw new Error(`Integritätsprüfung fehlgeschlagen: ${String(integrity?.['integrity_check'])}`)
  }
  const violations = db.prepare('PRAGMA foreign_key_check').all()
  if (violations.length > 0) {
    throw new Error(`${violations.length} verletzte Fremdschlüsselbeziehung(en) nach dem Import.`)
  }
}

// ---------- Hilfen ----------

function countAll(db: Awaited<ReturnType<typeof openLocalDatabase>>['db']): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const table of [
    ...DOMAIN_TABLES,
    'tenancy_person',
    'tenancy_prepayment',
    'tenancy_base_rent',
    'tenancy_prepayment_override',
  ]) {
    const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()
    counts[table] = Number(row?.['n'] ?? 0)
  }
  return counts
}

async function countDomainRows(file: string): Promise<number> {
  const db = await openDatabase(file)
  try {
    const tables = new Set(
      db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all()
        .map((r) => String(r['name'])),
    )
    let total = 0
    for (const table of DOMAIN_TABLES) {
      if (!tables.has(table)) continue
      const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()
      total += Number(row?.['n'] ?? 0)
    }
    return total
  } finally {
    db.close()
  }
}

/** Temporäre Datenbank samt möglicher SQLite-Beidateien entfernen. */
function removeTemp(temp: string): void {
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    fs.rmSync(`${temp}${suffix}`, { force: true })
  }
}

function emptyDb(): Db {
  return {
    settings: {
      houseName: '',
      address: '',
      landlordName: '',
      iban: '',
      paymentDeadlineDays: 30,
      ollamaUrl: '',
      ollamaModel: '',
    },
    units: [],
    tenancies: [],
    costItems: [],
    meters: [],
    readings: [],
    payments: [],
    closedSettlements: [],
  }
}

// Migration db.json → SQLite (Spec §41, §271.19, Issue #4).
//
// Der Umstieg ist der heikelste Moment des ganzen Umbaus: Danach ist eine andere Datei die
// Wahrheit. Diese Tests prüfen deshalb vor allem, was passiert, wenn etwas nicht stimmt —
// dass nämlich nichts passiert.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { validateLegacyDb } from '../src/persistence/migration/validate.ts'
import { migrateJsonToSqlite, migrationPaths, relevantYears } from '../src/persistence/migration/migrate.ts'
import { openLocalDatabase } from '../src/persistence/sqlite/startup.ts'
import { SqliteRepository } from '../src/persistence/sqlite/sqlite-repository.ts'
import { computeSettlement } from '../src/calc.ts'
import { loadFixtures } from '../testing/fixtures.js'
import { complete } from '../testing/snapshot.js'

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mietfuchs-migration-'))
}

function withDbJson(content) {
  const dir = tempDir()
  fs.writeFileSync(path.join(dir, 'db.json'), JSON.stringify(content, null, 2), 'utf8')
  return dir
}

const F10 = () => loadFixtures().find((f) => f.name.startsWith('F10')).db()

// ---------- Validator ----------

test('ein gültiger Bestand erzeugt keine Meldungen', () => {
  assert.deepEqual(validateLegacyDb(complete(F10())), [])
})

test('der Validator sammelt alle Probleme statt beim ersten abzubrechen', () => {
  const issues = validateLegacyDb({
    units: [
      { id: 'u1', name: 'W', areaM2: 0, participates: true },
      { id: 'u1', name: 'W', areaM2: 50, participates: 'ja' },
    ],
    tenancies: [{ id: 't1', unitId: 'gibt-es-nicht', tenantName: 'M', start: '01.01.2025', personHistory: [] }],
  })
  const paths = issues.map((i) => i.path)
  assert.ok(paths.includes('units[0].areaM2'), 'Fläche 0')
  assert.ok(paths.includes('units[1].id'), 'doppelte ID')
  assert.ok(paths.includes('units[1].participates'), 'kein Wahrheitswert')
  assert.ok(paths.includes('tenancies[0].unitId'), 'unbekannte Wohnung')
  assert.ok(paths.includes('tenancies[0].start'), 'deutsches Datum')
  assert.ok(issues.length >= 5, `es sollten alle Probleme gemeldet werden, gefunden: ${issues.length}`)
})

test('der Validator kennt dieselben Regeln wie die Datenbank', () => {
  const base = complete({ units: [{ id: 'u1', name: 'W', areaM2: 50, participates: true }] })

  const mietendeVorBeginn = validateLegacyDb({
    ...base,
    tenancies: [{ id: 't1', unitId: 'u1', tenantName: 'M', start: '2025-07-01', end: '2025-06-30', personHistory: [] }],
  })
  assert.ok(mietendeVorBeginn.some((i) => i.path === 'tenancies[0].end'))

  const verbrauchOhneTyp = validateLegacyDb({
    ...base,
    costItems: [{ id: 'c1', year: 2025, category: 'W', description: 'W', amountCents: 100, key: 'meter' }],
  })
  assert.ok(verbrauchOhneTyp.some((i) => i.path === 'costItems[0].meterType'))

  const wechselOhneEndstand = validateLegacyDb({
    ...base,
    meters: [{ id: 'm1', name: 'Z', unitId: 'u1', type: 'kaltwasser', unit: 'm³' }],
    readings: [{ id: 'r1', meterId: 'm1', date: '2025-06-30', value: 0, replacement: true }],
  })
  assert.ok(wechselOhneEndstand.some((i) => i.path === 'readings[0].oldEndValue'))

  const krummerBetrag = validateLegacyDb({
    ...base,
    costItems: [{ id: 'c1', year: 2025, category: 'W', description: 'W', amountCents: 100.5, key: 'area' }],
  })
  assert.ok(krummerBetrag.some((i) => i.path === 'costItems[0].amountCents'))

  const zweiStufenGleicherTag = validateLegacyDb({
    ...base,
    tenancies: [
      {
        id: 't1',
        unitId: 'u1',
        tenantName: 'M',
        start: '2025-01-01',
        end: null,
        personHistory: [
          { from: '2025-07-01', persons: 2 },
          { from: '2025-07-01', persons: 3 },
        ],
      },
    ],
  })
  assert.ok(zweiStufenGleicherTag.some((i) => i.path === 'tenancies[0].personHistory[1]'))
})

// ---------- Pipeline ----------

test('Migration eines gültigen Bestands legt Datenbank, Backup und Protokoll an', async () => {
  const dir = withDbJson(complete(F10()))
  const p = migrationPaths(dir)
  const vorher = fs.readFileSync(p.source, 'utf8')

  const outcome = await migrateJsonToSqlite(dir)
  assert.equal(outcome.status, 'migriert', JSON.stringify(outcome, null, 2))

  assert.ok(fs.existsSync(p.target), 'die Datenbank fehlt')
  assert.ok(fs.existsSync(p.report), 'das Protokoll fehlt')
  assert.ok(fs.existsSync(outcome.report.backup.file), 'das Backup fehlt')
  assert.ok(!fs.existsSync(p.temp), 'die temporäre Datei muss weg sein')

  // Schritt 10: Die db.json wird nie automatisch gelöscht oder verändert.
  assert.equal(fs.readFileSync(p.source, 'utf8'), vorher)

  // Keine Reste: Die temporäre Datenbank wird ohne WAL aufgebaut, weil ein `rename` nur die
  // Hauptdatei bewegt hätte — die Beidateien -wal und -shm wären verwaist liegengeblieben,
  // und was noch im WAL stünde, wäre verloren gewesen.
  const uebrig = fs.readdirSync(dir).filter((f) => f.includes('.migrating'))
  assert.deepEqual(uebrig, [], `zurückgeblieben: ${uebrig.join(', ')}`)
  assert.deepEqual(
    fs.readdirSync(dir).sort(),
    ['db.json', 'legacy', 'mietfuchs.db', 'migration-report.json'],
  )

  const report = JSON.parse(fs.readFileSync(p.report, 'utf8'))
  assert.equal(report.format, 'mietfuchs-migration-report')
  assert.equal(report.counts.unit, 3)
  assert.equal(report.counts.tenancy, 2)
  assert.equal(report.counts.cost_item, 4)
  assert.ok(report.regression.years.includes(2025))
  assert.equal(report.regression.result, 'cent-genau identisch')

  fs.rmSync(dir, { recursive: true, force: true })
})

test('die migrierte Datenbank rechnet die Fixture-Zahlen', async () => {
  const dir = withDbJson(complete(F10()))
  await migrateJsonToSqlite(dir)

  const { db } = await openLocalDatabase(migrationPaths(dir).target)
  try {
    const result = computeSettlement(await new SqliteRepository(db).loadSettlementInput(2025))
    const shares = result.statements.map((s) => s.totalShareCents).sort((a, b) => a - b)
    assert.deepEqual(shares, [108858, 141143])
    assert.equal(result.landlord.totalCents, 25000)
  } finally {
    db.close()
  }
  fs.rmSync(dir, { recursive: true, force: true })
})

test('ohne db.json gibt es nichts zu tun', async () => {
  const dir = tempDir()
  const outcome = await migrateJsonToSqlite(dir)
  assert.equal(outcome.status, 'nichts-zu-tun')
  fs.rmSync(dir, { recursive: true, force: true })
})

test('eine bereits gefüllte Datenbank wird nicht überschrieben (§271.19 Schritt 2)', async () => {
  const dir = withDbJson(complete(F10()))
  await migrateJsonToSqlite(dir)
  const ersteGroesse = fs.statSync(migrationPaths(dir).target).size

  const zweiter = await migrateJsonToSqlite(dir)
  assert.equal(zweiter.status, 'nichts-zu-tun')
  assert.match(zweiter.reason, /enthält bereits/)
  assert.equal(fs.statSync(migrationPaths(dir).target).size, ersteGroesse)

  fs.rmSync(dir, { recursive: true, force: true })
})

test('bei ungültigen Daten bleibt alles unverändert', async () => {
  const dir = withDbJson({
    units: [{ id: 'u1', name: 'W', areaM2: 50, participates: true }],
    tenancies: [{ id: 't1', unitId: 'gibt-es-nicht', tenantName: 'M', start: '2025-01-01', end: null }],
  })
  const p = migrationPaths(dir)

  const outcome = await migrateJsonToSqlite(dir)
  assert.equal(outcome.status, 'abgebrochen')
  assert.ok(outcome.issues.some((i) => i.path === 'tenancies[0].unitId'))

  assert.ok(!fs.existsSync(p.target), 'es darf keine Datenbank entstanden sein')
  assert.ok(!fs.existsSync(p.temp), 'keine Reste')
  assert.ok(!fs.existsSync(p.backupDir), 'ohne gültige Daten wird auch kein Backup angelegt')
  assert.ok(fs.existsSync(p.source), 'die db.json bleibt')

  fs.rmSync(dir, { recursive: true, force: true })
})

test('kaputtes JSON wird als solches gemeldet', async () => {
  const dir = tempDir()
  fs.writeFileSync(path.join(dir, 'db.json'), '{ das ist kein JSON', 'utf8')
  const outcome = await migrateJsonToSqlite(dir)
  assert.equal(outcome.status, 'abgebrochen')
  assert.match(outcome.reason, /kein gültiges JSON/)
  fs.rmSync(dir, { recursive: true, force: true })
})

// ---------- Altformate ----------

test('ein Bestand im Altformat wird migriert und die Anpassungen protokolliert', async () => {
  // So sah ein Bestand vor den Staffeln aus: ein fester Monatsbetrag, eine feste
  // Personenzahl, keine Kaltmiete.
  const dir = withDbJson({
    settings: {},
    units: [{ id: 'u1', name: 'Wohnung', areaM2: 100, participates: true }],
    tenancies: [
      {
        id: 't1',
        unitId: 'u1',
        tenantName: 'Altmieter',
        start: '2020-03-01',
        end: null,
        persons: 3,
        prepaymentMonthlyCents: 12000,
      },
    ],
    costItems: [
      { id: 'c1', year: 2025, category: 'Grundsteuer', description: 'GS', amountCents: 90000, key: 'area' },
    ],
    meters: [],
    readings: [],
    payments: [],
    closedSettlements: [],
  })

  const outcome = await migrateJsonToSqlite(dir)
  assert.equal(outcome.status, 'migriert', JSON.stringify(outcome, null, 2))

  const changes = outcome.report.normalizations.map((c) => c.path)
  assert.ok(changes.includes('tenancies[0].prepayments'), 'fester Betrag → Staffel')
  assert.ok(changes.includes('tenancies[0].personHistory'), 'feste Personenzahl → Staffel')

  const { db } = await openLocalDatabase(migrationPaths(dir).target)
  try {
    const input = await new SqliteRepository(db).loadSettlementInput(2025)
    assert.deepEqual(input.tenancies[0].prepayments, [{ from: '2020-03', monthlyCents: 12000 }])
    assert.deepEqual(input.tenancies[0].personHistory, [{ from: '2020-03-01', persons: 3 }])
    // Die ganze Grundsteuer trifft den einzigen Mieter.
    assert.equal(computeSettlement(input).statements[0].totalShareCents, 90000)
  } finally {
    db.close()
  }
  fs.rmSync(dir, { recursive: true, force: true })
})

test('eine von der Staffel abweichende Personenzahl wird angeglichen und gemeldet (B9)', async () => {
  const dir = withDbJson(
    complete({
      units: [{ id: 'u1', name: 'W', areaM2: 50, participates: true }],
      tenancies: [
        {
          id: 't1',
          unitId: 'u1',
          tenantName: 'M',
          start: '2020-01-01',
          end: null,
          persons: 9, // widerspricht der Staffel
          personHistory: [{ from: '2020-01-01', persons: 2 }],
          prepayments: [],
          prepaymentOverrides: {},
          baseRents: [],
        },
      ],
    }),
  )
  const outcome = await migrateJsonToSqlite(dir)
  assert.equal(outcome.status, 'migriert')
  const change = outcome.report.normalizations.find((c) => c.path === 'tenancies[0].persons')
  assert.ok(change, 'die Abweichung gehört ins Protokoll')
  assert.match(change.change, /9.*2/)
  fs.rmSync(dir, { recursive: true, force: true })
})

// ---------- Jahresauswahl ----------

test('die Regression prüft jedes Jahr, in dem der Bestand etwas enthält', () => {
  const years = relevantYears(
    complete({
      tenancies: [
        { id: 't1', unitId: 'u1', tenantName: 'M', start: '2023-05-01', end: '2024-04-30', personHistory: [], prepayments: [], prepaymentOverrides: {}, baseRents: [] },
      ],
      costItems: [{ id: 'c1', year: 2026, category: 'G', description: 'G', amountCents: 1, key: 'area' }],
      payments: [{ id: 'p1', tenancyId: 't1', date: '2022-12-31', amountCents: 1 }],
      readings: [{ id: 'r1', meterId: 'm1', date: '2021-12-31', value: 0 }],
    }),
    new Date('2026-08-31T00:00:00Z'),
  )
  assert.deepEqual(years, [2021, 2022, 2023, 2024, 2026])
})

test('ein unbefristetes Mietverhältnis reicht bis ins laufende Jahr', () => {
  // Der erste Entwurf zählte nur das Startjahr. Ein seit 2000 laufendes Mietverhältnis
  // mit Kaltmiete-Staffel hätte die Jahre 2001 bis heute ungeprüft gelassen — genau der
  // Fall, der in den echten Daten steckt.
  const years = relevantYears(
    complete({
      tenancies: [
        { id: 't1', unitId: 'u1', tenantName: 'M', start: '2000-01-01', end: null, personHistory: [], prepayments: [], prepaymentOverrides: {}, baseRents: [] },
      ],
    }),
    new Date('2026-08-31T00:00:00Z'),
  )
  assert.equal(years[0], 2000)
  assert.equal(years.at(-1), 2026)
  assert.equal(years.length, 27, 'jedes Jahr von 2000 bis 2026')
})

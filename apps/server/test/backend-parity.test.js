// Gleichstand der Backends (Spec §271.26, Invarianten 103 und 136).
//
//   „Derselbe fachliche Testdatensatz führt auf SQLite und PostgreSQL zum selben fachlichen
//    Ergebnis (tenantShare, landlordShare, outstanding, TaxEvents, Journal-Balance —
//    identisch)."
//
// Dieser Test ist die Einlösung dieses Satzes für die heute vorhandenen Backends: die
// bestehende db.json und den neuen SQLite-Adapter. Er fährt **alle** Golden-Master-Fixtures
// über beide Wege und vergleicht cent-genau — gegeneinander und gegen die eingefrorene
// Erwartung.
//
// Der Wert liegt darin, dass ein Abbildungsfehler im SQL-Adapter hier auffällt und nicht
// erst in einer verschickten Abrechnung: Ein vergessenes Feld, eine falsch übersetzte
// Personen-Staffel, ein verlorener Zählerwechsel — alles davon verändert das Ergebnis.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadFixtures, actualVia } from '../testing/fixtures.js'
import { repositoryFor } from '../testing/snapshot.js'
import { sqliteFrom } from '../testing/backends.js'
import { SqliteRepository } from '../src/persistence/sqlite/sqlite-repository.ts'

for (const fx of loadFixtures()) {
  test(`Backend-Gleichstand ${fx.name}`, async () => {
    const ausJson = await actualVia(repositoryFor(fx.db()), fx.year)

    const sqlite = await sqliteFrom(fx.db())
    try {
      const ausSqlite = await actualVia(new SqliteRepository(sqlite), fx.year)

      assert.deepStrictEqual(
        ausSqlite,
        ausJson,
        `${fx.name}: SQLite und db.json rechnen unterschiedlich — ` +
          'das Ergebnis darf nicht vom Backend abhängen (§271.26)',
      )
      assert.deepStrictEqual(
        ausSqlite,
        fx.expected,
        `${fx.name}: SQLite weicht von der eingefrorenen Erwartung ab`,
      )
    } finally {
      sqlite.close()
    }
  })
}

test('der Schnappschuss aus SQLite gleicht dem aus der db.json Feld für Feld', async () => {
  // Nicht nur das Ergebnis, auch der Weg dorthin: Ein Adapter, der zufällig dasselbe
  // Abrechnungsergebnis liefert, aber ein Feld verliert, das die Engine (noch) nicht liest,
  // wäre trotzdem falsch — spätestens für den nächsten Verbraucher des Snapshots.
  const fx = loadFixtures().find((f) => f.name.startsWith('F10'))
  assert.ok(fx, 'F10 (gemischte Schlüssel) trägt diesen Test')

  const sqlite = await sqliteFrom(fx.db())
  try {
    const ausJson = await repositoryFor(fx.db()).loadSettlementInput(fx.year)
    const ausSqlite = await new SqliteRepository(sqlite).loadSettlementInput(fx.year)
    assert.deepStrictEqual(ausSqlite, ausJson)

    const ledgerJson = await repositoryFor(fx.db()).loadLedgerInput(fx.year)
    const ledgerSqlite = await new SqliteRepository(sqlite).loadLedgerInput(fx.year)
    assert.deepStrictEqual(ledgerSqlite, ledgerJson)
  } finally {
    sqlite.close()
  }
})

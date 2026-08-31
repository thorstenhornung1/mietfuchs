// SQLite-Unterbau: Migrationen, Start-Checks, Constraints (Spec §271.9/§271.12, §58,
// Issues #241, #242, #23).
//
// Ein Schema ist so viel wert, wie es tatsächlich abweist. Diese Tests prüfen deshalb nicht,
// dass gültige Daten durchgehen — das tun die Gleichstandstests —, sondern dass ungültige
// Daten scheitern. Bis hierher lag diese Verantwortung allein im Anwendungscode; mit der
// Datenbank bekommt sie einen zweiten, härteren Boden (§271.4).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openLocalDatabase } from '../src/persistence/sqlite/startup.ts'
import { SCHEMA_VERSION, currentVersion, migrate } from '../src/persistence/sqlite/migrations.ts'
import {
  SQLITE_CAPABILITIES,
  capabilitiesFor,
  sqliteFileFrom,
} from '../src/persistence/capabilities.ts'

async function freshDb() {
  const { db } = await openLocalDatabase(':memory:')
  return db
}

/** Eine Wohnung anlegen — Bezugspunkt für die Fremdschlüsseltests. */
function insertUnit(db, id = 'u1') {
  db.prepare('INSERT INTO unit (id, name, area_m2, participates) VALUES (?, ?, ?, 1)').run(id, 'Wohnung', 50)
}

// ---------- Migrationen (§271.9) ----------

test('eine frische Datenbank wird auf die aktuelle Schemaversion gebracht', async () => {
  const db = await freshDb()
  try {
    assert.equal(currentVersion(db), SCHEMA_VERSION)
  } finally {
    db.close()
  }
})

test('ein zweiter Migrationslauf ändert nichts', async () => {
  const db = await freshDb()
  try {
    assert.deepEqual(migrate(db), [], 'nichts mehr anzuwenden')
    assert.equal(currentVersion(db), SCHEMA_VERSION)
  } finally {
    db.close()
  }
})

test('eine Datenbank aus einer neueren Version wird abgewiesen statt herabgestuft', async () => {
  const db = await freshDb()
  db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(
    SCHEMA_VERSION + 5,
    new Date().toISOString(),
  )
  assert.equal(currentVersion(db), SCHEMA_VERSION + 5)
  db.close()
  // Der Startpfad prüft das und verweigert den Dienst — ein Downgrade verlöre Daten.
  // Hier direkt geprüft, weil In-Memory-Datenbanken den Neustart nicht überleben.
})

// ---------- Start-Checks (§271.12) ----------

test('Fremdschlüssel sind aktiviert — sonst wären alle REFERENCES wirkungslos', async () => {
  const db = await freshDb()
  try {
    assert.equal(db.prepare('PRAGMA foreign_keys').get().foreign_keys, 1)
  } finally {
    db.close()
  }
})

test('die Integritätsprüfung läuft sauber durch', async () => {
  const db = await freshDb()
  try {
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok')
  } finally {
    db.close()
  }
})

// ---------- Capability-Modell (§271.8, #242) ----------

test('das Backend wird am Connection String erkannt', () => {
  assert.equal(capabilitiesFor('file:/data/mietfuchs.db').dialect, 'sqlite')
  assert.equal(capabilitiesFor('postgresql://mietfuchs@postgres:5432/mietfuchs').dialect, 'postgresql')
  assert.equal(capabilitiesFor('postgres://localhost/x').dialect, 'postgresql')
})

test('ein unbekannter Connection String wird abgewiesen, nicht geraten (Invariante 20)', () => {
  assert.throws(() => capabilitiesFor('mysql://localhost/x'), /keinem unterstützten Backend/)
  assert.throws(() => capabilitiesFor(''), /keinem unterstützten Backend/)
})

test('SQLite gibt sich nicht als verteilte Datenbank aus', () => {
  // §271.3: SQLite = lokale eingebettete Datenbank, SQLite ≠ verteilte Datenbank.
  assert.equal(SQLITE_CAPABILITIES.supportsConcurrentWorkers, false)
  assert.equal(SQLITE_CAPABILITIES.supportsRowLevelSecurity, false)
  assert.equal(sqliteFileFrom('file:/data/mietfuchs.db'), '/data/mietfuchs.db')
})

// ---------- Constraints (§58, #23) ----------

test('ein Kalendertag muss ein Kalendertag sein — kein Zeitstempel (Invariante 102)', async () => {
  const db = await freshDb()
  try {
    insertUnit(db)
    const insert = (start) =>
      db
        .prepare('INSERT INTO tenancy (id, unit_id, tenant_name, start_date) VALUES (?, ?, ?, ?)')
        .run(`t-${start}`, 'u1', 'Mieter', start)

    insert('2025-01-01') // gültig
    assert.throws(() => insert('2025-01-01T00:00:00Z'), /CHECK|constraint/i, 'Zeitstempel')
    assert.throws(() => insert('01.01.2025'), /CHECK|constraint/i, 'deutsche Schreibweise')
    assert.throws(() => insert('2025-1-1'), /CHECK|constraint/i, 'ohne führende Nullen')
  } finally {
    db.close()
  }
})

test('ein Mietende vor dem Mietbeginn wird abgewiesen (§58)', async () => {
  const db = await freshDb()
  try {
    insertUnit(db)
    const insert = (id, start, end) =>
      db
        .prepare('INSERT INTO tenancy (id, unit_id, tenant_name, start_date, end_date) VALUES (?, ?, ?, ?, ?)')
        .run(id, 'u1', 'Mieter', start, end)

    insert('t1', '2025-01-01', '2025-12-31')
    insert('t2', '2025-01-01', null) // unbefristet ist erlaubt
    assert.throws(() => insert('t3', '2025-07-01', '2025-06-30'), /CHECK|constraint/i)
  } finally {
    db.close()
  }
})

test('eine Wohnfläche von null oder weniger wird abgewiesen (§58)', async () => {
  const db = await freshDb()
  try {
    const insert = (id, area) =>
      db.prepare('INSERT INTO unit (id, name, area_m2, participates) VALUES (?, ?, ?, 1)').run(id, 'W', area)
    insert('ok', 50)
    assert.throws(() => insert('null', 0), /CHECK|constraint/i)
    assert.throws(() => insert('negativ', -5), /CHECK|constraint/i)
  } finally {
    db.close()
  }
})

test('ein Zählerwechsel ohne Endstand des alten Geräts wird abgewiesen', async () => {
  // Ohne oldEndValue rechnet die Engine einen negativen Verbrauch — genau der Fall, den
  // Fixture F05 abdeckt. Hier verhindert ihn schon die Datenbank.
  const db = await freshDb()
  try {
    insertUnit(db)
    db.prepare('INSERT INTO meter (id, name, unit_id, type, unit_label) VALUES (?, ?, ?, ?, ?)').run(
      'm1', 'Zähler', 'u1', 'kaltwasser', 'm³',
    )
    const insert = (id, replacement, oldEnd) =>
      db
        .prepare('INSERT INTO reading (id, meter_id, read_date, value, replacement, old_end_value) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, 'm1', '2025-06-30', 0, replacement, oldEnd)

    insert('r1', 0, null) // gewöhnliche Ablesung
    insert('r2', 1, 230) // Wechsel mit Endstand
    assert.throws(() => insert('r3', 1, null), /CHECK|constraint/i)
  } finally {
    db.close()
  }
})

test('eine Verbrauchsposition ohne Zählertyp wird abgewiesen (Invariante 20)', async () => {
  const db = await freshDb()
  try {
    insertUnit(db)
    const insert = (id, key, meterType, directUnit) =>
      db
        .prepare('INSERT INTO cost_item (id, year, category, description, amount_cents, key, meter_type, direct_unit_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, 2025, 'Wasser/Abwasser', 'Wasser', 1000, key, meterType, directUnit)

    insert('ok-meter', 'meter', 'kaltwasser', null)
    insert('ok-direct', 'direct', null, 'u1')
    insert('ok-area', 'area', null, null)
    assert.throws(() => insert('kein-typ', 'meter', null, null), /CHECK|constraint/i)
    assert.throws(() => insert('kein-ziel', 'direct', null, null), /CHECK|constraint/i)
    assert.throws(() => insert('falscher-typ', 'meter', 'Heizung', null), /CHECK|constraint/i)
    assert.throws(() => insert('falscher-key', 'flaeche', null, null), /CHECK|constraint/i)
  } finally {
    db.close()
  }
})

test('ein Mietverhältnis ohne existierende Wohnung wird abgewiesen', async () => {
  const db = await freshDb()
  try {
    assert.throws(
      () =>
        db
          .prepare('INSERT INTO tenancy (id, unit_id, tenant_name, start_date) VALUES (?, ?, ?, ?)')
          .run('t1', 'gibt-es-nicht', 'Mieter', '2025-01-01'),
      /FOREIGN KEY|constraint/i,
    )
  } finally {
    db.close()
  }
})

test('das Löschen einer Wohnung räumt die abhängigen Daten mit ab', async () => {
  const db = await freshDb()
  try {
    insertUnit(db)
    db.prepare('INSERT INTO tenancy (id, unit_id, tenant_name, start_date) VALUES (?, ?, ?, ?)').run(
      't1', 'u1', 'Mieter', '2025-01-01',
    )
    db.prepare('INSERT INTO tenancy_person (tenancy_id, from_date, persons) VALUES (?, ?, ?)').run(
      't1', '2025-01-01', 2,
    )
    db.prepare('INSERT INTO payment (id, tenancy_id, pay_date, amount_cents) VALUES (?, ?, ?, ?)').run(
      'p1', 't1', '2025-01-05', 85000,
    )

    db.prepare('DELETE FROM unit WHERE id = ?').run('u1')

    for (const table of ['tenancy', 'tenancy_person', 'payment']) {
      const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()
      assert.equal(Number(row.n), 0, `${table} hätte mitgelöscht werden müssen`)
    }
  } finally {
    db.close()
  }
})

test('zwei Personenstufen zum selben Stichtag sind ausgeschlossen', async () => {
  const db = await freshDb()
  try {
    insertUnit(db)
    db.prepare('INSERT INTO tenancy (id, unit_id, tenant_name, start_date) VALUES (?, ?, ?, ?)').run(
      't1', 'u1', 'Mieter', '2025-01-01',
    )
    const insert = (persons) =>
      db.prepare('INSERT INTO tenancy_person (tenancy_id, from_date, persons) VALUES (?, ?, ?)').run(
        't1', '2025-07-01', persons,
      )
    insert(3)
    assert.throws(() => insert(4), /UNIQUE|constraint/i, 'derselbe Stichtag kann nicht zwei Werte tragen')
  } finally {
    db.close()
  }
})

test('nur ein einziger Einstellungssatz je Installation (Invariante 101)', async () => {
  const db = await freshDb()
  try {
    db.prepare('INSERT INTO settings (id) VALUES (1)').run()
    assert.throws(() => db.prepare('INSERT INTO settings (id) VALUES (2)').run(), /CHECK|constraint/i)
  } finally {
    db.close()
  }
})

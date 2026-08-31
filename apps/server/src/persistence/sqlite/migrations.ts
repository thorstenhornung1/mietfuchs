// Schema und Migrationen für SQLite.
//
// **Warum das SQL hier als TypeScript-Konstante steht und nicht in .sql-Dateien:** Der
// Local Mode wird zu einer einzelnen Binary kompiliert. Eine .sql-Datei müsste dafür
// eigens eingebettet und zur Laufzeit gefunden werden; als Modulkonstante bündelt sie sich
// von selbst — unter Node, unter Bun und im Container gleichermaßen.
//
// §271.9: SQLite und PostgreSQL tragen dieselbe logische `schemaVersion`. Jede Änderung am
// Schema braucht eine Migration je Dialekt. Migrationen verwerfen niemals still Daten.
//
// §271.11 (Invariante 102): Rechtliche Kalendertage sind DATE — in SQLite als TEXT
// 'YYYY-MM-DD' mit Prüfung. Technische Zeitpunkte sind Zeitstempel und werden als ISO-Text
// abgelegt. Beträge sind INTEGER-Cent (Invariante 17), niemals REAL.

import type { SqliteDatabase } from './driver.ts'

/** Die logische Schemaversion — dieselbe Nummer gilt später für PostgreSQL (§271.9). */
export const SCHEMA_VERSION = 1

type Migration = { version: number; name: string; sql: string }

// Wiederkehrende Prüfung: Ein Kalendertag ist genau zehn Zeichen der Form YYYY-MM-DD.
// SQLite hat keinen Datumstyp; ohne diese Prüfung landet früher oder später ein Zeitstempel
// in einem Datumsfeld — genau das verbietet Invariante 102.
const IS_DATE = (col: string) => `${col} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`
const IS_MONTH = (col: string) => `${col} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'`

const INITIAL = `
CREATE TABLE schema_version (
  version    INTEGER NOT NULL,
  applied_at TEXT    NOT NULL
);

-- Genau eine Zeile: die Einstellungen der Installation (Invariante 101 — eine Source of Truth).
CREATE TABLE settings (
  id                       INTEGER NOT NULL PRIMARY KEY CHECK (id = 1),
  house_name               TEXT    NOT NULL DEFAULT '',
  address                  TEXT    NOT NULL DEFAULT '',
  landlord_name            TEXT    NOT NULL DEFAULT '',
  iban                     TEXT    NOT NULL DEFAULT '',
  payment_deadline_days    INTEGER NOT NULL DEFAULT 30 CHECK (payment_deadline_days > 0),
  ollama_url               TEXT    NOT NULL DEFAULT '',
  ollama_model             TEXT    NOT NULL DEFAULT '',
  print_adjust_suggestion  INTEGER CHECK (print_adjust_suggestion IN (0, 1)),
  print_attachments        INTEGER CHECK (print_attachments IN (0, 1))
);

CREATE TABLE unit (
  id           TEXT    NOT NULL PRIMARY KEY,
  name         TEXT    NOT NULL,
  area_m2      REAL    NOT NULL CHECK (area_m2 > 0),
  participates INTEGER NOT NULL CHECK (participates IN (0, 1)),
  rooms        INTEGER CHECK (rooms IS NULL OR rooms > 0),
  floor        TEXT,
  notes        TEXT
);

CREATE TABLE tenancy (
  id                     TEXT NOT NULL PRIMARY KEY,
  unit_id                TEXT NOT NULL REFERENCES unit (id) ON DELETE CASCADE,
  tenant_name            TEXT NOT NULL,
  start_date             TEXT NOT NULL CHECK (${IS_DATE('start_date')}),
  -- NULL bedeutet fachlich „unbefristet", nicht „unbekannt".
  end_date               TEXT CHECK (end_date IS NULL OR (${IS_DATE('end_date')} AND end_date >= start_date)),
  email                  TEXT,
  phone                  TEXT,
  correspondence_address TEXT,
  iban                   TEXT,
  contract_date          TEXT CHECK (contract_date IS NULL OR ${IS_DATE('contract_date')}),
  deposit_cents          INTEGER CHECK (deposit_cents IS NULL OR deposit_cents >= 0),
  deposit_status         TEXT CHECK (deposit_status IS NULL OR deposit_status IN ('offen', 'erhalten', 'teilweise', 'zurückgezahlt')),
  notes                  TEXT
);
CREATE INDEX tenancy_unit_idx ON tenancy (unit_id);

-- Die Staffeln als eigene Tabellen statt als JSON-Feld: „ab Datum gilt Wert" ist eine
-- fachliche Historie, keine Beilage. Der zusammengesetzte Schlüssel verhindert zwei
-- widersprüchliche Werte für denselben Stichtag.
CREATE TABLE tenancy_person (
  tenancy_id TEXT    NOT NULL REFERENCES tenancy (id) ON DELETE CASCADE,
  from_date  TEXT    NOT NULL CHECK (${IS_DATE('from_date')}),
  persons    INTEGER NOT NULL CHECK (persons > 0),
  PRIMARY KEY (tenancy_id, from_date)
);

CREATE TABLE tenancy_prepayment (
  tenancy_id    TEXT    NOT NULL REFERENCES tenancy (id) ON DELETE CASCADE,
  from_month    TEXT    NOT NULL CHECK (${IS_MONTH('from_month')}),
  monthly_cents INTEGER NOT NULL,
  PRIMARY KEY (tenancy_id, from_month)
);

CREATE TABLE tenancy_base_rent (
  tenancy_id    TEXT    NOT NULL REFERENCES tenancy (id) ON DELETE CASCADE,
  from_month    TEXT    NOT NULL CHECK (${IS_MONTH('from_month')}),
  monthly_cents INTEGER NOT NULL,
  PRIMARY KEY (tenancy_id, from_month)
);

-- Tatsächlich gezahlte Jahres-Vorauszahlung; hat Vorrang vor der Staffel, weil rechtlich
-- das Geleistete zählt.
CREATE TABLE tenancy_prepayment_override (
  tenancy_id TEXT    NOT NULL REFERENCES tenancy (id) ON DELETE CASCADE,
  year       INTEGER NOT NULL,
  cents      INTEGER NOT NULL,
  PRIMARY KEY (tenancy_id, year)
);

CREATE TABLE meter (
  id           TEXT NOT NULL PRIMARY KEY,
  name         TEXT NOT NULL,
  -- NULL = Hauptzähler des Hauses; nur Wohnungszähler bilden die Verteilbasis.
  unit_id      TEXT REFERENCES unit (id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('kaltwasser', 'strom', 'waerme', 'sonstig')),
  meter_number TEXT,
  unit_label   TEXT NOT NULL
);
CREATE INDEX meter_unit_idx ON meter (unit_id);

CREATE TABLE reading (
  id            TEXT    NOT NULL PRIMARY KEY,
  meter_id      TEXT    NOT NULL REFERENCES meter (id) ON DELETE CASCADE,
  read_date     TEXT    NOT NULL CHECK (${IS_DATE('read_date')}),
  value         REAL    NOT NULL,
  -- Zählerwechsel: value ist der Startstand des neuen Geräts, old_end_value der Endstand
  -- des alten. Ohne diese Markierung entstünde ein negativer Verbrauch.
  replacement   INTEGER NOT NULL DEFAULT 0 CHECK (replacement IN (0, 1)),
  old_end_value REAL,
  note          TEXT,
  CHECK (replacement = 0 OR old_end_value IS NOT NULL)
);
CREATE INDEX reading_meter_date_idx ON reading (meter_id, read_date);

CREATE TABLE cost_item (
  id               TEXT    NOT NULL PRIMARY KEY,
  year             INTEGER NOT NULL,
  category         TEXT    NOT NULL,
  description      TEXT    NOT NULL,
  vendor           TEXT,
  -- Bewusst ohne CHECK (amount_cents >= 0): Gutschriften und Korrekturen einer
  -- Kostenposition sind fachlich zulässig. §58 nennt die Regel für Forderungen, nicht für
  -- Aufwände — zu prüfen mit den DB-Constraint-Tests (#23).
  amount_cents     INTEGER NOT NULL,
  key              TEXT    NOT NULL CHECK (key IN ('area', 'persons', 'units', 'direct', 'meter')),
  direct_unit_id   TEXT REFERENCES unit (id) ON DELETE SET NULL,
  meter_type       TEXT CHECK (meter_type IS NULL OR meter_type IN ('kaltwasser', 'strom', 'waerme', 'sonstig')),
  labor_35a_cents  INTEGER CHECK (labor_35a_cents IS NULL OR labor_35a_cents >= 0),
  invoice_file     TEXT,
  -- Ein Verbrauchsschlüssel ohne Zählertyp wäre nicht auswertbar, eine Direktzuordnung
  -- ohne Ziel ebenso. Invariante 20: lieber abweisen als still umverteilen.
  CHECK (key <> 'meter' OR meter_type IS NOT NULL),
  CHECK (key <> 'direct' OR direct_unit_id IS NOT NULL)
);
CREATE INDEX cost_item_year_idx ON cost_item (year);

CREATE TABLE payment (
  id           TEXT    NOT NULL PRIMARY KEY,
  tenancy_id   TEXT    NOT NULL REFERENCES tenancy (id) ON DELETE CASCADE,
  pay_date     TEXT    NOT NULL CHECK (${IS_DATE('pay_date')}),
  amount_cents INTEGER NOT NULL,
  note         TEXT
);
CREATE INDEX payment_tenancy_date_idx ON payment (tenancy_id, pay_date);

-- Eine abgeschlossene Abrechnung ist ein eingefrorenes Ergebnis, keine veränderliche
-- Berechnung (Invariante 13). Sie wird deshalb als Ganzes abgelegt und nie fortgeschrieben.
CREATE TABLE closed_settlement (
  id              TEXT    NOT NULL PRIMARY KEY,
  year            INTEGER NOT NULL UNIQUE,
  closed_at       TEXT    NOT NULL,
  sent_at         TEXT,
  settlement_json TEXT    NOT NULL
);
`

const MIGRATIONS: Migration[] = [{ version: 1, name: 'initial', sql: INITIAL }]

/** Aktuelle Schemaversion der Datenbank; 0, wenn noch nichts angelegt ist. */
export function currentVersion(db: SqliteDatabase): number {
  const table = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_version'")
    .get()
  if (!table) return 0
  const row = db.prepare('SELECT MAX(version) AS version FROM schema_version').get()
  const value = row?.['version']
  return typeof value === 'number' ? value : 0
}

/**
 * Bringt die Datenbank auf den aktuellen Stand und liefert die angewandten Versionen.
 *
 * Jede Migration läuft in einer eigenen Transaktion: Bricht sie ab, bleibt die Datenbank auf
 * dem vorherigen Stand statt halb migriert liegenzubleiben.
 */
export function migrate(db: SqliteDatabase): number[] {
  const from = currentVersion(db)
  const applied: number[] = []
  for (const migration of MIGRATIONS.filter((m) => m.version > from).sort((a, b) => a.version - b.version)) {
    db.runScript('BEGIN')
    try {
      db.runScript(migration.sql)
      db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(
        migration.version,
        new Date().toISOString(),
      )
      db.runScript('COMMIT')
    } catch (err) {
      db.runScript('ROLLBACK')
      throw new Error(
        `Migration ${migration.version} (${migration.name}) fehlgeschlagen: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    }
    applied.push(migration.version)
  }
  return applied
}

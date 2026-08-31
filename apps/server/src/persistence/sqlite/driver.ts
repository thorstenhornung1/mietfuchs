// SQLite-Treiber für beide Laufzeiten.
//
// Mietfuchs läuft in zwei Laufzeiten: unter Node im npm-Betrieb und im Container, und unter
// Bun in der gepackten Binary. Beide bringen einen SQLite-Treiber **eingebaut** mit —
// `node:sqlite` bzw. `bun:sqlite`. Genau deshalb ist es dieser Weg geworden: Ein externer
// Treiber (better-sqlite3, libSQL) ist ein natives Addon und müsste neben der Binary
// ausgeliefert werden; better-sqlite3 läuft unter Bun überhaupt nicht (oven-sh/bun#4290).
// Die Einzeldatei-Auslieferung des Local Mode bleibt so erhalten — sie ist nach §271.3 ein
// erklärtes Ziel („einfache Upstream-Distribution").
//
// Die beiden APIs sind fast deckungsgleich; die Unterschiede fängt dieses Modul ab, damit
// darüber niemand mehr wissen muss, in welcher Laufzeit er gerade steckt. Alles Weitere
// spricht nur noch `SqliteDatabase`.
//
// Invariante 109 (ORM entity ≠ domain entity) und §271.6: Dieses Modul ist Adapter, nicht
// Domäne. Nichts hiervon wird jemals aus `packages/domain` importiert.

/** Ein einzelner Wert, wie SQLite ihn speichert. */
export type SqlValue = string | number | bigint | null | Uint8Array

/** Eine Ergebniszeile: Spaltenname → Wert. */
export type SqlRow = Record<string, SqlValue>

export type SqlStatement = {
  all(...params: SqlValue[]): SqlRow[]
  run(...params: SqlValue[]): void
  get(...params: SqlValue[]): SqlRow | undefined
}

export type SqliteDatabase = {
  runScript(sql: string): void
  prepare(sql: string): SqlStatement
  close(): void
  /** Welche Laufzeit den Treiber stellt — nur für Diagnose und Startmeldungen. */
  readonly runtime: 'node' | 'bun'
}

const isBun = !!globalThis.Bun

/**
 * Öffnet eine SQLite-Datenbank.
 *
 * `:memory:` ist erlaubt und wird für Tests genutzt — eine In-Memory-Datenbank verhält sich
 * fachlich wie eine Datei, nur ohne Aufräumarbeit.
 */
export async function openDatabase(file: string): Promise<SqliteDatabase> {
  return isBun ? openBun(file) : openNode(file)
}

async function openNode(file: string): Promise<SqliteDatabase> {
  const { DatabaseSync } = await import('node:sqlite')
  const db = new DatabaseSync(file)
  return {
    runtime: 'node',
    runScript: (sql) => db.exec(sql),
    prepare: (sql) => {
      const stmt = db.prepare(sql)
      return {
        all: (...params) => stmt.all(...(params as never[])) as SqlRow[],
        run: (...params) => void stmt.run(...(params as never[])),
        get: (...params) => stmt.get(...(params as never[])) as SqlRow | undefined,
      }
    },
    close: () => db.close(),
  }
}

async function openBun(file: string): Promise<SqliteDatabase> {
  const { Database } = await import('bun:sqlite')
  const db = new Database(file, { create: true })
  return {
    runtime: 'bun',
    runScript: (sql) => db.run(sql),
    prepare: (sql) => {
      const stmt = db.prepare(sql)
      return {
        all: (...params) => stmt.all(...(params as never[])) as SqlRow[],
        run: (...params) => void stmt.run(...(params as never[])),
        get: (...params) => (stmt.get(...(params as never[])) ?? undefined) as SqlRow | undefined,
      }
    },
    close: () => db.close(),
  }
}

// ---------- Umwandlung an der Treibergrenze ----------
//
// SQLite kennt keinen Wahrheitswert. Was aus der Datenbank kommt, ist Zahl, Text oder NULL —
// die Rückübersetzung ins Domänenmodell gehört an genau diese Stelle und nicht verstreut in
// die Abfragen.

export function toBool(value: SqlValue): boolean {
  return value === 1 || value === 1n
}

export function fromBool(value: boolean): number {
  return value ? 1 : 0
}

/** Ganzzahliger Cent-Betrag aus der Datenbank (Invariante 17). */
export function toInt(value: SqlValue): number {
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'number') return value
  throw new TypeError(`Erwartet wurde eine Ganzzahl, gelesen wurde: ${String(value)}`)
}

export function toNumber(value: SqlValue): number {
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'number') return value
  throw new TypeError(`Erwartet wurde eine Zahl, gelesen wurde: ${String(value)}`)
}

export function toText(value: SqlValue): string {
  if (typeof value === 'string') return value
  throw new TypeError(`Erwartet wurde Text, gelesen wurde: ${String(value)}`)
}

/** Optionaler Wert: SQL NULL wird zu `undefined`, nicht zu einem Ersatzwert (Invariante 20). */
export function optional<T>(value: SqlValue, convert: (v: SqlValue) => T): T | undefined {
  return value === null || value === undefined ? undefined : convert(value)
}

/** Optionaler Wert, bei dem `null` fachlich etwas bedeutet — etwa ein offenes Mietende. */
export function nullable<T>(value: SqlValue, convert: (v: SqlValue) => T): T | null {
  return value === null || value === undefined ? null : convert(value)
}

// Datenbankfähigkeiten (Spec §271.7, §271.8, Issue #242).
//
// Mietfuchs entwirft nicht gegen den kleinsten gemeinsamen Nenner beider Backends
// (Invariante 110). PostgreSQL darf mehr können als SQLite — Row Level Security, Advisory
// Locks, nebenläufige Worker —, und das darf genutzt werden.
//
// **Wofür dieses Modell da ist und wofür nicht:**
//
//   erlaubt:   „Läuft ein Hintergrundjob in einem eigenen Prozess oder im selben?"
//              „Wird die Mandantentrennung von der Datenbank erzwungen oder von der App?"
//   verboten:  `if (postgres) { calculateRentDifferently() }`
//
// Die Fähigkeiten steuern **Infrastruktur**, niemals Fachlogik. Dieselben Eingangsdaten
// müssen auf beiden Backends cent-genau dasselbe ergeben (Invarianten 103 und 106, §271.26).
// Ein Blick auf `capabilities` innerhalb der Berechnungs-, Steuer- oder Accounting-Schicht
// ist deshalb immer ein Fehler — dort gibt es nichts zu entscheiden.

export type SqlDialect = 'sqlite' | 'postgresql'

export type DatabaseCapabilities = {
  dialect: SqlDialect
  supportsRowLevelSecurity: boolean
  supportsExclusionConstraints: boolean
  supportsAdvisoryLocks: boolean
  /** Ob mehrere Prozesse gleichzeitig schreiben dürfen — bei SQLite bewusst nein (§271.3). */
  supportsConcurrentWorkers: boolean
  supportsNativeJsonIndexing: boolean
}

export const SQLITE_CAPABILITIES: DatabaseCapabilities = {
  dialect: 'sqlite',
  supportsRowLevelSecurity: false,
  supportsExclusionConstraints: false,
  supportsAdvisoryLocks: false,
  supportsConcurrentWorkers: false,
  supportsNativeJsonIndexing: false,
}

export const POSTGRESQL_CAPABILITIES: DatabaseCapabilities = {
  dialect: 'postgresql',
  supportsRowLevelSecurity: true,
  supportsExclusionConstraints: true,
  supportsAdvisoryLocks: true,
  supportsConcurrentWorkers: true,
  supportsNativeJsonIndexing: true,
}

/**
 * Erkennt das Backend am Connection String (§271.3).
 *
 * `file:` → SQLite, `postgres://` bzw. `postgresql://` → PostgreSQL. Alles andere wird
 * abgewiesen statt geraten: Eine falsch erkannte Datenbank wäre der denkbar schlechteste
 * stille Fallback (Invariante 20).
 */
export function capabilitiesFor(databaseUrl: string): DatabaseCapabilities {
  if (databaseUrl.startsWith('file:')) return SQLITE_CAPABILITIES
  if (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')) {
    return POSTGRESQL_CAPABILITIES
  }
  throw new Error(
    `DATABASE_URL „${databaseUrl}" ist keinem unterstützten Backend zuzuordnen. ` +
      'Erwartet wird „file:…" für SQLite oder „postgresql://…" für PostgreSQL (Spec §271.3).',
  )
}

/** Dateipfad aus einer SQLite-URL — `file:/data/mietfuchs.db` → `/data/mietfuchs.db`. */
export function sqliteFileFrom(databaseUrl: string): string {
  if (!databaseUrl.startsWith('file:')) {
    throw new Error(`„${databaseUrl}" ist keine SQLite-URL.`)
  }
  return databaseUrl.slice('file:'.length)
}

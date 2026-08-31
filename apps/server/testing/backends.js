// Beide Persistenz-Backends für denselben Fixture-Bestand.
//
// Grundlage des Gleichstandstests aus §271.26: Derselbe fachliche Testdatensatz muss auf
// SQLite und auf der db.json cent-genau dasselbe ergeben. Wächst PostgreSQL hinzu (#3),
// kommt hier ein dritter Eintrag dazu — die Tests darüber bleiben unverändert.

import { openLocalDatabase } from '../src/persistence/sqlite/startup.ts'
import { writeDb } from '../src/persistence/sqlite/seed.ts'
import { SqliteRepository } from '../src/persistence/sqlite/sqlite-repository.ts'
import { complete, repositoryFor } from './snapshot.js'

/** Eine frisch migrierte In-Memory-Datenbank, befüllt aus einem db.json-Bestand. */
export async function sqliteFrom(db) {
  const { db: sqlite } = await openLocalDatabase(':memory:')
  writeDb(sqlite, complete(db))
  return sqlite
}

/**
 * Ruft `run(repository)` einmal je Backend auf.
 * Der Name landet in der Fehlermeldung, damit erkennbar ist, welches Backend abweicht.
 */
export async function forEachBackend(db, run) {
  await run('db.json', repositoryFor(db))

  const sqlite = await sqliteFrom(db)
  try {
    await run('sqlite', new SqliteRepository(sqlite))
  } finally {
    sqlite.close()
  }
}

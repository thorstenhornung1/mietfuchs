// Aufrufpunkt für das Zero-Configuration-Upgrade (§271.19).
//
//   npm run migrate
//
// Bewusst ein ausdrücklicher Befehl und noch kein Automatismus beim Start: Der Server läuft
// weiterhin auf der db.json, weil die schreibenden Repositories noch fehlen. Wer migriert,
// bekommt eine geprüfte mietfuchs.db und ein Protokoll — umgestellt wird erst, wenn die
// Anwendung sie auch benutzen kann.

import { DATA_DIR } from './store.ts'
import { migrateJsonToSqlite } from './persistence/migration/migrate.ts'

const outcome = await migrateJsonToSqlite(DATA_DIR)

if (outcome.status === 'nichts-zu-tun') {
  console.log(`Nichts zu tun: ${outcome.reason}`)
  process.exit(0)
}

if (outcome.status === 'abgebrochen') {
  console.error(`Migration abgebrochen: ${outcome.reason}`)
  for (const issue of outcome.issues.slice(0, 50)) {
    console.error(`  ${issue.path || '(Datei)'}: ${issue.message}`)
  }
  if (outcome.issues.length > 50) {
    console.error(`  … und ${outcome.issues.length - 50} weitere.`)
  }
  console.error('Die bisherige Datenbasis ist unverändert.')
  process.exit(1)
}

const { report } = outcome
console.log('Migration erfolgreich.')
console.log(`  Quelle:    ${report.source.file}`)
console.log(`  Backup:    ${report.backup.file}`)
console.log(`  Ziel:      ${report.target.file} (Schemaversion ${report.target.schemaVersion})`)
console.log(`  Regression: ${report.regression.years.length} Jahr(e) geprüft, ${report.regression.result}`)
for (const [table, n] of Object.entries(report.counts).filter(([, n]) => n > 0)) {
  console.log(`  ${table.padEnd(28)} ${n}`)
}
if (report.normalizations.length > 0) {
  console.log('  Angepasste Altformate:')
  for (const c of report.normalizations) console.log(`    ${c.path}: ${c.change}`)
}
console.log('Die db.json bleibt unverändert liegen.')

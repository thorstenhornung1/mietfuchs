// Start-Checks für den Local Mode (Spec §271.12, Issue #241).
//
// Eine eingebettete Datenbank hat keinen Serverprozess, der beim Start Alarm schlägt. Was
// hier nicht geprüft wird, fällt später auf — im ungünstigsten Fall als stille Beschädigung
// einer Abrechnung. Deshalb prüft Mietfuchs beim Öffnen selbst:
//
//   1. Verzeichnis vorhanden und beschreibbar
//   2. Fremdschlüssel aktiviert (SQLite hat sie je Verbindung standardmäßig AUS)
//   3. Integrität der Datei
//   4. Schemaversion
//   5. Hinweis, wenn die Datei erkennbar auf einem Netzwerk-Dateisystem liegt
//
// Punkt 5 ist ausdrücklich ein Hinweis und keine Zusicherung: §271.12 verlangt eine Warnung
// „ohne Garantie automatischer Erkennung". SQLite auf NFS/SMB/CephFS ist nicht freigegeben —
// dort verhält sich die Sperrlogik anders, und zwei Prozesse auf derselben Datei können sie
// beschädigen. Wer das braucht, nimmt PostgreSQL (§271.3).

import fs from 'node:fs'
import path from 'node:path'
import { openDatabase, type SqliteDatabase } from './driver.ts'
import { SCHEMA_VERSION, currentVersion, migrate } from './migrations.ts'

export type OpenResult = {
  db: SqliteDatabase
  /** Angewandte Migrationen — leer, wenn das Schema bereits aktuell war. */
  applied: number[]
  warnings: string[]
}

/** Dateisysteme, auf denen SQLite ausdrücklich nicht freigegeben ist (§271.3). */
const NETWORK_FS = ['nfs', 'smbfs', 'cifs', 'ceph', 'fuse.ceph', 'afpfs', 'webdav', 'fuse.sshfs']

/**
 * Öffnet die lokale Datenbank, prüft sie und bringt das Schema auf Stand.
 *
 * Fehler beim Öffnen sind harte Fehler: Ein Local Mode, der ohne Datenbank weiterläuft,
 * würde stillschweigend nichts speichern.
 */
export async function openLocalDatabase(file: string): Promise<OpenResult> {
  const warnings: string[] = []

  if (file !== ':memory:') {
    const dir = path.dirname(path.resolve(file))
    fs.mkdirSync(dir, { recursive: true })
    try {
      fs.accessSync(dir, fs.constants.W_OK)
    } catch {
      throw new Error(`Das Datenverzeichnis „${dir}" ist nicht beschreibbar.`)
    }
    const networkFs = detectNetworkFilesystem(dir)
    if (networkFs) {
      warnings.push(
        `Die Datenbank liegt auf einem Netzwerk-Dateisystem (${networkFs}). SQLite ist dafür ` +
          'nicht freigegeben — die Sperrlogik arbeitet dort anders, eine beschädigte Datei ist ' +
          'möglich. Für Netzwerk- und Mehrprozessbetrieb PostgreSQL verwenden (Spec §271.3).',
      )
    }
  }

  const db = await openDatabase(file)

  // Fremdschlüssel sind in SQLite je Verbindung standardmäßig ausgeschaltet. Ohne diese
  // Zeile wären alle REFERENCES im Schema wirkungslos (§271.12).
  db.runScript('PRAGMA foreign_keys = ON')
  const fk = db.prepare('PRAGMA foreign_keys').get()
  if (fk?.['foreign_keys'] !== 1) {
    db.close()
    throw new Error('Fremdschlüssel ließen sich nicht aktivieren — die Datenbank wäre ohne Integritätsschutz.')
  }

  const integrity = db.prepare('PRAGMA integrity_check').get()
  const verdict = integrity?.['integrity_check']
  if (verdict !== 'ok') {
    db.close()
    throw new Error(`Die Datenbankdatei ist beschädigt (integrity_check: ${String(verdict)}).`)
  }

  const before = currentVersion(db)
  if (before > SCHEMA_VERSION) {
    db.close()
    throw new Error(
      `Die Datenbank hat Schemaversion ${before}, diese Mietfuchs-Version kennt nur ${SCHEMA_VERSION}. ` +
        'Vermutlich wurde sie mit einer neueren Version geöffnet — ein Downgrade würde Daten verlieren.',
    )
  }
  const applied = migrate(db)

  // WAL erhöht die Nebenläufigkeit bei lokalem Speicher (§271.12) — auf Netzwerk-Dateisystemen
  // wäre es zusätzlich riskant, deshalb nur dort, wo nichts dagegen spricht.
  if (file !== ':memory:' && warnings.length === 0) {
    db.runScript('PRAGMA journal_mode = WAL')
  }

  return { db, applied, warnings }
}

/**
 * Versucht, ein Netzwerk-Dateisystem zu erkennen. Bewusst nur ein Versuch: Die Erkennung
 * ist plattformabhängig und darf den Start nie verhindern.
 */
function detectNetworkFilesystem(dir: string): string | null {
  try {
    if (process.platform === 'linux') {
      const mounts = fs.readFileSync('/proc/mounts', 'utf8').split('\n')
      let best: { point: string; type: string } | null = null
      for (const line of mounts) {
        const [, point, type] = line.split(' ')
        if (!point || !type) continue
        if (dir === point || dir.startsWith(point.endsWith('/') ? point : `${point}/`)) {
          if (!best || point.length > best.point.length) best = { point, type }
        }
      }
      if (best && NETWORK_FS.some((t) => best.type.startsWith(t))) return best.type
    }
  } catch {
    // Erkennung ist Kür, nicht Pflicht — ein Lesefehler darf den Start nicht aufhalten.
  }
  return null
}

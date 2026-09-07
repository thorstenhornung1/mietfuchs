// Betriebszustand — die F0-Lite-Teilmenge von §94 („Systemadministration").
//
// §94 verlangt neun sichtbare Punkte: App-Version, DB erreichbar, Schema-Version,
// Storage erreichbar, freier Speicher, letztes Backup, Restore-Test, fehlgeschlagene
// Jobs, OIDC-Status. Sieben davon setzen Ebenen voraus, die es noch nicht gibt
// (SQLite ist nicht verdrahtet, Backup/Restore und OIDC sind Schritt 24 bzw. 6 der
// Implementierungsreihenfolge). Dieser Bericht erhebt die zwei vorhandenen und
// **benennt die übrigen als nicht erhoben**, statt sie wegzulassen.
//
// Das ist ausdrücklich kein Admin-Cockpit (§94 P1) und nimmt es auch nicht vorweg.
// Der Zweck ist enger: Ein Container-Orchestrator muss den Unterschied zwischen
// „Prozess läuft" und „Anwendung arbeitet auf ihrem Datenbestand" erkennen können.
// Ohne diesen Unterschied meldet Swarm einen Task als gesund, der in ein nicht
// gemountetes Volume schreibt.

import fs from 'node:fs'
import path from 'node:path'

export type PruefungsStatus = 'ok' | 'fehler'

export type Pruefung = {
  status: PruefungsStatus
  detail: string
}

export type HealthReport = {
  status: PruefungsStatus
  version: string
  pruefungen: {
    datenbestand: Pruefung
    dokumentenspeicher: Pruefung
  }
  /** Punkte aus §94, für die die Ebene noch fehlt — bewusst sichtbar, nicht verschwiegen. */
  nichtErhoben: readonly string[]
}

/**
 * Was §94 fordert und hier (noch) nicht erhoben werden kann. Wächst nicht mit neuen
 * Wünschen, sondern schrumpft: Jeder Punkt verschwindet, sobald seine Ebene existiert.
 */
export const NICHT_ERHOBEN = [
  'schema-version',
  'freier-speicher',
  'letztes-backup',
  'restore-test',
  'fehlgeschlagene-jobs',
  'oidc-status',
] as const

/**
 * Ist der Datenbestand lesbar? Eine fehlende db.json ist **kein** Fehler: Bei der
 * Erstinbetriebnahme legt store.ts sie erst beim ersten Schreiben an. Ein Fehler ist
 * eine vorhandene, aber unlesbare Datei — dann arbeitet die Anwendung nicht auf dem
 * Bestand, den sie vorzufinden glaubt.
 */
function pruefeDatenbestand(dataDir: string): Pruefung {
  const datei = path.join(dataDir, 'db.json')
  if (!fs.existsSync(datei)) {
    return { status: 'ok', detail: 'db.json noch nicht angelegt (Erstinbetriebnahme)' }
  }
  try {
    JSON.parse(fs.readFileSync(datei, 'utf8'))
    return { status: 'ok', detail: 'db.json lesbar' }
  } catch (err) {
    return { status: 'fehler', detail: `db.json nicht lesbar: ${(err as Error).message}` }
  }
}

/**
 * Ist der Dokumentenspeicher beschreibbar? Geprüft wird mit einem echten Schreibversuch,
 * nicht mit `fs.access`: Auf Netzwerk-Dateisystemen und bei fremdem Volume-Eigentümer
 * meldet die Rechteprüfung regelmäßig etwas anderes als der Schreibvorgang.
 */
function pruefeDokumentenspeicher(dataDir: string): Pruefung {
  const uploads = path.join(dataDir, 'uploads')
  const probe = path.join(uploads, `.health-${process.pid}`)
  try {
    fs.mkdirSync(uploads, { recursive: true })
    fs.writeFileSync(probe, '')
    fs.unlinkSync(probe)
    return { status: 'ok', detail: `${uploads} beschreibbar` }
  } catch (err) {
    return { status: 'fehler', detail: `${uploads} nicht beschreibbar: ${(err as Error).message}` }
  }
}

export function healthReport({ dataDir, version }: { dataDir: string; version: string }): HealthReport {
  const pruefungen = {
    datenbestand: pruefeDatenbestand(dataDir),
    dokumentenspeicher: pruefeDokumentenspeicher(dataDir),
  }
  const status: PruefungsStatus = Object.values(pruefungen).every((p) => p.status === 'ok') ? 'ok' : 'fehler'
  return { status, version, pruefungen, nichtErhoben: NICHT_ERHOBEN }
}

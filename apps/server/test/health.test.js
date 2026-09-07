// Betriebszustand (Priorisierung §94 „Systemadministration – F0 Lite").
//
// Geprüft wird die **F0-Lite-Teilmenge**, nicht das Admin-Cockpit: Ein Self-Hoster —
// und ein Container-Orchestrator — muss erkennen können, ob das System grundsätzlich
// gesund ist. §94 zählt neun Punkte auf; von denen existieren derzeit erst zwei
// (Datenbestand, Dokumentenspeicher). Die übrigen entfallen ausdrücklich, solange die
// Ebene fehlt (PR-Checkliste: „sie wird nicht stillschweigend übersprungen") — und
// genau das muss der Bericht selbst benennen, sonst liest sich ein knapper Bericht
// später wie ein vollständiger.
//
// Warum das eine eigene Funktion ist und kein Express-Handler: index.ts startet den
// Server beim Import. Prüfbar ist die Aussage, nicht die Route.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { healthReport, NICHT_ERHOBEN } from '../src/health.ts'

/** Ein Datenverzeichnis, wie der Server es vorfindet. */
function datenverzeichnis(inhalt = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mietfuchs-health-'))
  fs.mkdirSync(path.join(dir, 'uploads'), { recursive: true })
  if (inhalt.db !== undefined) fs.writeFileSync(path.join(dir, 'db.json'), inhalt.db, 'utf8')
  return dir
}

test('gesundes Datenverzeichnis: Status ok, beide Prüfungen ok', () => {
  const dir = datenverzeichnis({ db: JSON.stringify({ units: [], settings: {} }) })
  const bericht = healthReport({ dataDir: dir, version: '0.2.1' })

  assert.equal(bericht.status, 'ok')
  assert.equal(bericht.version, '0.2.1')
  assert.equal(bericht.pruefungen.datenbestand.status, 'ok')
  assert.equal(bericht.pruefungen.dokumentenspeicher.status, 'ok')
})

test('Erstinbetriebnahme ohne db.json ist gesund, nicht kaputt', () => {
  // Beim ersten Start existiert noch keine db.json — store.ts legt sie erst beim
  // ersten Schreiben an. Ein Healthcheck, der das als Fehler meldet, würde einen
  // frisch deployten Container in eine Restart-Schleife schicken.
  const dir = datenverzeichnis()
  const bericht = healthReport({ dataDir: dir, version: '0.2.1' })

  assert.equal(bericht.status, 'ok')
  assert.equal(bericht.pruefungen.datenbestand.status, 'ok')
  assert.match(bericht.pruefungen.datenbestand.detail, /noch nicht angelegt/i)
})

test('fehlendes Datenverzeichnis ist ein Fehler', () => {
  // Der Fall, für den der Healthcheck im Container überhaupt existiert: Das Volume
  // ist nicht gemountet. Der Prozess läuft, die Anwendung antwortet — und schreibt
  // in ein Verzeichnis, das beim nächsten Neustart weg ist.
  const bericht = healthReport({ dataDir: '/nicht/vorhanden/mietfuchs', version: '0.2.1' })

  assert.equal(bericht.status, 'fehler')
  assert.equal(bericht.pruefungen.dokumentenspeicher.status, 'fehler')
})

test('unlesbare db.json ist ein Fehler', () => {
  const dir = datenverzeichnis({ db: '{ das ist kein JSON' })
  const bericht = healthReport({ dataDir: dir, version: '0.2.1' })

  assert.equal(bericht.status, 'fehler')
  assert.equal(bericht.pruefungen.datenbestand.status, 'fehler')
})

test('nicht beschreibbarer Dokumentenspeicher ist ein Fehler', (t) => {
  // Als root greifen Dateirechte nicht — dann ist die Aussage nicht prüfbar.
  if (process.getuid?.() === 0) return t.skip('läuft als root, Dateirechte greifen nicht')

  const dir = datenverzeichnis({ db: '{}' })
  fs.chmodSync(path.join(dir, 'uploads'), 0o500)
  try {
    const bericht = healthReport({ dataDir: dir, version: '0.2.1' })
    assert.equal(bericht.status, 'fehler')
    assert.equal(bericht.pruefungen.dokumentenspeicher.status, 'fehler')
  } finally {
    fs.chmodSync(path.join(dir, 'uploads'), 0o700)
  }
})

test('der Bericht benennt die noch nicht erhobenen §94-Punkte', () => {
  const dir = datenverzeichnis({ db: '{}' })
  const bericht = healthReport({ dataDir: dir, version: '0.2.1' })

  // §94 verlangt neun Punkte. Was davon fehlt, steht im Bericht — nicht im Nichts.
  for (const punkt of ['schema-version', 'letztes-backup', 'oidc-status']) {
    assert.ok(bericht.nichtErhoben.includes(punkt), `${punkt} fehlt in nichtErhoben`)
  }
  assert.deepEqual(bericht.nichtErhoben, NICHT_ERHOBEN)
})

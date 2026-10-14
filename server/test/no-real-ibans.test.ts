// Der Wächter gegen echte IBANs im Repo (Kanon, „Echte Daten sind tabu“).
//
// Eine IBAN aus dem Bestand eines Vermieters gehört in keinen Commit, auch nicht als Testwert.
// Fixtures sind erfunden, und erfundene IBANs tragen die Prüfziffer 00, die nach ISO 13616 nie
// gültig ist. Dieser Test geht deshalb über jede Datei, die Git verfolgt (Code, Markdown, JSON,
// SQL, XML, CSV, MT940-Auszüge, Workflows …), und meldet jede Zeichenfolge, die eine gültige IBAN
// ist, kompakt oder in Vierergruppen. Gültig heißt: Länderkennung, Länge des Landes, Prüfziffern
// 02 bis 98 und Rest 1 modulo 97 (server/testing/iban.ts). Ob es das Konto gibt, lässt sich nicht
// prüfen; eine gültige Prüfziffer reicht für den Verdacht.
//
// Übersprungen werden nur Binärdateien (Bilder, PDF, Archive): Eine IBAN darin wäre zwar ebenso
// falsch, ließe sich aber nicht zuverlässig als Text lesen. package-lock.json wird mitgeprüft;
// ihre Prüfsummen ergeben keine Fehlalarme, weil ein Fund an einer Wortgrenze beginnen und enden
// und die Länge seines Landes genau treffen muss.
//
// Die Fehlermeldung nennt die IBAN nur maskiert, damit sie selbst nichts weiterträgt.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { compactIban, findValidIbans, maskIban } from '../testing/iban.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

// Öffentlich bekannte Beispiel-IBANs, die im Repo stehen dürfen. Nur aufnehmen, was wirklich
// vorkommt und nachweislich als Beispiel veröffentlicht ist, jeweils mit Quelle.
const PUBLIC_EXAMPLES: ReadonlySet<string> = new Set([
  // Beispiel-IBAN zur BLZ 12030000, verbreitet in Dokumentation und Testdaten von IBAN-Prüfern,
  // z. B. https://ibanvalidieren.de/beispiele.html und https://github.com/ixnode/php-iban.
  // Upstream nutzt sie in Tests der Einstellungen (propertySwitch.test.tsx, db-repository.test.ts,
  // db-stock.test.ts).
  'DE02120300000000202051',
])

const BINARY_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.zip', '.gz', '.woff', '.woff2', '.ttf', '.otf', '.wasm', '.sqlite'])

function trackedTextFiles(): string[] {
  const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean)
  return files.filter((file) => !BINARY_EXTENSIONS.has(path.extname(file).toLowerCase()))
}

function readText(file: string): string | null {
  const absolute = path.join(ROOT, file)
  // Von Git verfolgt, aber im Arbeitsbaum gelöscht oder ein Verweis: nichts zu lesen.
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) return null
  const buffer = fs.readFileSync(absolute)
  if (buffer.subarray(0, 8000).includes(0)) return null
  return buffer.toString('utf8')
}

test('Keine echten IBANs im Repo: jede gültige IBAN ist eine bekannte Beispiel-IBAN', () => {
  const files = trackedTextFiles()
  assert.ok(files.length > 100, `git ls-files lieferte nur ${files.length} Dateien – läuft der Test im Repo?`)
  const problems: string[] = []
  for (const file of files) {
    const text = readText(file)
    if (text === null) continue
    for (const finding of findValidIbans(text)) {
      if (PUBLIC_EXAMPLES.has(compactIban(finding.raw))) continue
      problems.push(`${file}:${finding.line}: ${maskIban(finding.raw)}`)
    }
  }
  assert.deepEqual(
    problems,
    [],
    'Mögliche echte IBAN gefunden (gültige Prüfziffer). Ersetzen Sie sie durch eine erfundene IBAN ' +
      'mit der Prüfziffer 00 (z. B. DE00 …), die nach ISO 13616 nie gültig ist. Ist es eine ' +
      'öffentlich bekannte Beispiel-IBAN, gehört sie mit Quelle in PUBLIC_EXAMPLES dieses Tests.\n' +
      problems.join('\n'),
  )
})

test('Die Ausnahmeliste enthält nur gültige IBANs, die im Repo auch vorkommen', () => {
  const seen = new Set<string>()
  for (const file of trackedTextFiles()) {
    if (file === 'server/test/no-real-ibans.test.ts' || file === 'server/test/iban.test.ts') continue
    const text = readText(file)
    if (text === null) continue
    for (const finding of findValidIbans(text)) seen.add(compactIban(finding.raw))
  }
  for (const example of PUBLIC_EXAMPLES) {
    assert.ok(seen.has(example), `${maskIban(example)} steht in PUBLIC_EXAMPLES, kommt aber im Repo nicht mehr vor – bitte streichen.`)
  }
})

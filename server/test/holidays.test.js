// Gesetzliche Feiertage je Bundesland (server/src/holidays.js). Mietfuchs nutzt zur Laufzeit
// die npm-Bibliothek date-holidays. Geprüft wird gegen eine unabhängige Quelle, die
// Python-Bibliothek holidays, für alle 16 Länder und ihre regionalen Varianten von 1995 bis
// 2100 (Referenzdaten und Herkunft: test/fixtures/holidays/). Dazu kommen Einzelfälle, von Hand
// aus den Feiertagsgesetzen der Länder abgelesen.
//
// Stand der Prüfung: Beide Bibliotheken stimmen für alle Varianten und Jahre überein. Wo sie
// einmal voneinander abweichen, wird nicht geraten: Die Entscheidung folgt dem Feiertagsgesetz
// des Landes und steht mit Fundstelle hier im Test.
//
// Eine gemeinsame Abweichung vom Gesetz ohne Folgen: In Hessen sind alle Sonntage gesetzliche
// Feiertage (§ 1 HFeiertagsG), also auch Oster- und Pfingstsonntag. Beide Bibliotheken führen
// diese beiden nur für Brandenburg, das sie ausdrücklich nennt (§ 2 FTG). Für Fristen nach
// Werktagen spielt das keine Rolle, ein Sonntag ist nie Werktag.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import Holidays from 'date-holidays'
import { FEDERAL_STATES, holidayCalendar, publicHolidays } from '../src/holidays.js'

const MS_DAY = 86400000
const referenz = JSON.parse(fs.readFileSync(new URL('./fixtures/holidays/python-holidays.json', import.meta.url), 'utf8'))
const [ERSTES, LETZTES] = referenz.jahre
const JAHRE = Array.from({ length: LETZTES - ERSTES + 1 }, (_, i) => ERSTES + i)

// Schreibweise der Referenz (siehe README.md dort): „MM-TT" ist ein fester Tag, „O±n" der
// Abstand in Tagen zum Ostersonntag, „@1995-2017,2019" begrenzt auf diese Jahre.
function entpacke(tokens) {
  const jeJahr = new Map(JAHRE.map((y) => [y, new Set()]))
  for (const token of tokens) {
    const [schluessel, jahre] = token.split('@')
    const gilt = new Set(jahre ? jahre.split(',').flatMap((teil) => {
      const [von, bis = von] = teil.split('-').map(Number)
      return Array.from({ length: bis - von + 1 }, (_, i) => von + i)
    }) : JAHRE)
    for (const y of gilt) {
      if (schluessel.startsWith('O')) {
        const ostern = Date.parse(referenz.ostern[y - ERSTES])
        jeJahr.get(y).add(new Date(ostern + Number(schluessel.slice(1)) * MS_DAY).toISOString().slice(0, 10))
      } else {
        jeJahr.get(y).add(`${y}-${schluessel}`)
      }
    }
  }
  return jeJahr
}
const PY = Object.fromEntries(Object.entries(referenz.varianten).map(([name, tokens]) => [name, entpacke(tokens)]))

const vereinigung = (...mengen) => new Set(mengen.flatMap((m) => [...m]))
const schnitt = (erste, ...rest) => new Set([...erste].filter((d) => rest.every((m) => m.has(d))))
const sortiert = (menge) => [...menge].sort()

// Ort des Hauses wie in den Stammdaten (Typ Place): null = nicht angegeben bzw. „weiß nicht"
const ort = (federalState, antworten = {}) => ({
  federalState, assumptionDayHoliday: null, inAugsburg: null, corpusChristiHoliday: null, ...antworten,
})
const NEIN = { assumptionDayHoliday: false, inAugsburg: false, corpusChristiHoliday: false }

// [Beschreibung, Ort, erwartet bei „mitzählen", erwartet bei „weglassen"] — jeweils als
// Funktion des Jahres, zusammengesetzt aus den Referenzvarianten
const FAELLE = [
  ...FEDERAL_STATES.map((land) => [`${land}, alle Fragen verneint`, ort(land, NEIN), (y) => PY[land].get(y), (y) => PY[land].get(y)]),
  ['BY, Mariä Himmelfahrt ja, nicht Augsburg', ort('BY', { assumptionDayHoliday: true, inAugsburg: false }),
    (y) => PY['BY:catholic'].get(y), (y) => PY['BY:catholic'].get(y)],
  ['BY, Augsburg', ort('BY', { assumptionDayHoliday: true, inAugsburg: true }), (y) => PY.Augsburg.get(y), (y) => PY.Augsburg.get(y)],
  ['SN, Fronleichnam ja', ort('SN', { corpusChristiHoliday: true }), (y) => PY['SN:catholic'].get(y), (y) => PY['SN:catholic'].get(y)],
  ['TH, Fronleichnam ja', ort('TH', { corpusChristiHoliday: true }), (y) => PY['TH:catholic'].get(y), (y) => PY['TH:catholic'].get(y)],
  // „Weiß nicht": mitzählen heißt, jeder Feiertag, der in Frage kommt, zählt; weglassen heißt,
  // nur die sicheren
  ['BY, beides weiß nicht', ort('BY'),
    (y) => vereinigung(PY.BY.get(y), PY['BY:catholic'].get(y), PY.Augsburg.get(y)), (y) => PY.BY.get(y)],
  ['BY, Mariä Himmelfahrt weiß nicht, nicht Augsburg', ort('BY', { inAugsburg: false }),
    (y) => PY['BY:catholic'].get(y), (y) => PY.BY.get(y)],
  ['BY, Mariä Himmelfahrt ja, Augsburg weiß nicht', ort('BY', { assumptionDayHoliday: true }),
    (y) => PY.Augsburg.get(y), (y) => PY['BY:catholic'].get(y)],
  // Ohne Mariä Himmelfahrt kann das Haus nicht in Augsburg liegen, dort ist der Tag Feiertag.
  ['BY, Mariä Himmelfahrt nein, Augsburg weiß nicht', ort('BY', { assumptionDayHoliday: false }),
    (y) => PY.BY.get(y), (y) => PY.BY.get(y)],
  ['SN, Fronleichnam weiß nicht', ort('SN'), (y) => PY['SN:catholic'].get(y), (y) => PY.SN.get(y)],
  ['TH, Fronleichnam weiß nicht', ort('TH'), (y) => PY['TH:catholic'].get(y), (y) => PY.TH.get(y)],
  ['Bundesland nicht angegeben', ort(null),
    (y) => vereinigung(...Object.values(PY).map((v) => v.get(y))), (y) => schnitt(...Object.values(PY).map((v) => v.get(y)))],
]

test('Feiertage je Land und Region stimmen 1995–2100 mit der Python-Bibliothek holidays überein', () => {
  for (const [name, o, mitzaehlen, weglassen] of FAELLE) {
    for (const y of JAHRE) {
      assert.deepEqual(publicHolidays(y, o, { uncertain: 'include' }), sortiert(mitzaehlen(y)), `${name}, ${y}, mitzählen`)
      assert.deepEqual(publicHolidays(y, o, { uncertain: 'exclude' }), sortiert(weglassen(y)), `${name}, ${y}, weglassen`)
    }
  }
})

test('Einzelfälle aus den Feiertagsgesetzen der Länder', () => {
  const hat = (o, datum, uncertain = 'exclude') => publicHolidays(Number(datum.slice(0, 4)), o, { uncertain }).includes(datum)
  // Bayern, Art. 1 Abs. 1 Nr. 2 und Abs. 2 FTG: Mariä Himmelfahrt in Gemeinden mit überwiegend
  // katholischer Bevölkerung, das Friedensfest (8.8.) nur im Stadtgebiet Augsburg
  assert.equal(hat(ort('BY', NEIN), '2026-08-15'), false)
  assert.equal(hat(ort('BY', { assumptionDayHoliday: true, inAugsburg: false }), '2026-08-15'), true)
  assert.equal(hat(ort('BY', { assumptionDayHoliday: true, inAugsburg: false }), '2026-08-08'), false)
  assert.equal(hat(ort('BY', { assumptionDayHoliday: true, inAugsburg: true }), '2026-08-08'), true)
  // Saarland, § 2 SFG: Mariä Himmelfahrt im ganzen Land, ohne Nachfrage
  assert.equal(hat(ort('SL'), '2026-08-15'), true)
  // Sachsen, § 1 SächsSFG und Fronleichnamsverordnung vom 4.5.1993: Fronleichnam nur in den
  // dort genannten Gemeinden und Ortsteilen im heutigen Landkreis Bautzen. Ostern 2021 am
  // 4. April, Fronleichnam 60 Tage später am Donnerstag, 3. Juni.
  assert.equal(hat(ort('SN', { corpusChristiHoliday: true }), '2021-06-03'), true)
  assert.equal(hat(ort('SN', { corpusChristiHoliday: false }), '2021-06-03'), false)
  assert.equal(hat(ort('SN'), '2021-06-03', 'include'), true)
  assert.equal(hat(ort('SN'), '2021-06-03', 'exclude'), false)
  // Sachsen, § 1 SächsSFG: Buß- und Bettag, der Mittwoch vor dem 23. November — 2026 der 18.11.
  assert.equal(hat(ort('SN'), '2026-11-18'), true)
  assert.equal(hat(ort('BY', NEIN), '2026-11-18'), false)
  // Berlin, § 1 FeiertG: Internationaler Frauentag seit 2019 (Gesetz vom 30.01.2019), einmalig
  // der 8. Mai 2025 und der 17. Juni 2028 (Gesetz vom 10.07.2024, GVBl. S. 460)
  assert.equal(hat(ort('BE'), '2018-03-08'), false)
  assert.equal(hat(ort('BE'), '2019-03-08'), true)
  assert.equal(hat(ort('BE'), '2025-05-08'), true)
  assert.equal(hat(ort('BE'), '2026-05-08'), false)
  assert.equal(hat(ort('BE'), '2028-06-17'), true)
  assert.equal(hat(ort('BE'), '2029-06-17'), false)
  // Thüringen, § 2 Abs. 1 ThürFGtG: Weltkindertag seit 2019
  assert.equal(hat(ort('TH'), '2018-09-20'), false)
  assert.equal(hat(ort('TH'), '2019-09-20'), true)
  // Reformationstag 2017 einmalig in allen Ländern (jeweils eigene Regelung, etwa Art. 1
  // Abs. 2a FTG in Bayern), in Niedersachsen seit 2018 jedes Jahr (§ 2 NFeiertagsG)
  assert.equal(hat(ort('NW'), '2017-10-31'), true)
  assert.equal(hat(ort('NW'), '2018-10-31'), false)
  assert.equal(hat(ort('NI'), '2018-10-31'), true)
})

test('Thüringen: Die drei Regionen mit Fronleichnam haben dieselben Feiertage', () => {
  // Der Adapter bildet „Fronleichnam ja" auf die Region EIC ab. Das ist nur richtig, solange
  // sich UH und WAK bei den gesetzlichen Feiertagen nicht davon unterscheiden.
  const feiertage = (region, y) => new Holidays('DE', 'TH', region).getHolidays(y).filter((h) => h.type === 'public').map((h) => h.date)
  for (const y of JAHRE) {
    assert.deepEqual(feiertage('UH', y), feiertage('EIC', y), `UH ${y}`)
    assert.deepEqual(feiertage('WAK', y), feiertage('EIC', y), `WAK ${y}`)
  }
})

test('Unbekannte oder widersprüchliche Angaben führen in die vorsichtige Richtung', () => {
  const alle = (o, uncertain) => publicHolidays(2026, o, { uncertain })
  // Ein unbekanntes Länderkürzel gilt als „nicht angegeben"
  assert.deepEqual(alle(ort('XX'), 'include'), alle(ort(null), 'include'))
  assert.deepEqual(alle(ort('XX'), 'exclude'), alle(ort(null), 'exclude'))
  assert.deepEqual(alle(undefined, 'include'), alle(ort(null), 'include'))
  // Augsburg ohne Mariä Himmelfahrt gibt es nicht; dann zählt alles, was in Bayern in Frage kommt
  const widerspruch = ort('BY', { assumptionDayHoliday: false, inAugsburg: true })
  assert.deepEqual(alle(widerspruch, 'include'), alle(ort('BY'), 'include'))
  assert.deepEqual(alle(widerspruch, 'exclude'), alle(ort('BY'), 'exclude'))
  // Antworten, die für das Land nicht gelten, spielen keine Rolle
  assert.deepEqual(alle(ort('NW', { corpusChristiHoliday: false, assumptionDayHoliday: true }), 'include'), alle(ort('NW'), 'include'))
  // Die Richtung muss der Aufrufer ausdrücklich wählen
  assert.throws(() => publicHolidays(2026, ort('NW'), {}), TypeError)
})

test('holidayCalendar fragt einzelne Tage ab, auch über den Jahreswechsel', () => {
  const istFeiertag = holidayCalendar(ort('BW'), { uncertain: 'exclude' })
  assert.equal(istFeiertag('2026-01-06'), true)
  assert.equal(istFeiertag('2026-01-07'), false)
  assert.equal(istFeiertag('2027-01-01'), true)
  assert.equal(holidayCalendar(ort('NW'), { uncertain: 'exclude' })('2026-01-06'), false)
})

test('Das Ergebnis hängt nicht von der Zeitzone des Rechners ab', () => {
  // date-holidays rechnet in der Zeitzone Deutschlands. Ein Rechner in Kalifornien oder auf
  // Kiritimati (UTC+14) muss dieselben Tage bekommen.
  const skript = `import { publicHolidays } from ${JSON.stringify(new URL('../src/holidays.js', import.meta.url).href)}
    console.log(JSON.stringify([2021, 2026].map((y) => publicHolidays(y, { federalState: null }, { uncertain: 'include' }))))`
  const lauf = (TZ) => execFileSync(process.execPath, ['--input-type=module', '-e', skript], { env: { ...process.env, TZ }, encoding: 'utf8' })
  const berlin = lauf('Europe/Berlin')
  assert.equal(lauf('America/Los_Angeles'), berlin)
  assert.equal(lauf('Pacific/Kiritimati'), berlin)
  assert.ok(JSON.parse(berlin)[1].includes('2026-01-01'))
})

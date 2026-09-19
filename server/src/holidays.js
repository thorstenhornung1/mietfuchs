// Gesetzliche Feiertage je Bundesland — dünner Adapter um die Bibliothek date-holidays.
//
// Gesetzliche Feiertage regelt jedes Land selbst. In Bayern, Sachsen und Thüringen gilt ein
// Teil davon nur in einem Teil der Gemeinden. date-holidays bildet das als Regionen ab; die
// Stammdaten fragen stattdessen, was der Vermieter vor Ort weiß (siehe client/src/placeForm.ts).
// Dieses Modul übersetzt einen solchen Ort in Land und Region. Woher der Ort kommt, weiß es
// nicht: Es bekommt nur das Ortsobjekt (Typ Place in client/src/types.ts).
//
// Ist der Ort nicht angegeben oder lautet eine Antwort „weiß nicht", kommen mehrere Regionen in
// Frage. Welche Richtung dann die vorsichtige ist, weiß nur der Aufrufer, denn es hängt davon ab,
// wer das Risiko trägt:
// - `uncertain: 'include'` — jeder Feiertag, der in Frage kommt, zählt. Fristen enden eher
//   später. Richtig für den Rückstand im Mietkonto: Er erscheint nie zu früh.
// - `uncertain: 'exclude'` — nur Feiertage, die sicher gelten. Fristen enden eher früher.
//   Richtig für eine eigene Erklärung, etwa eine Kündigung: Sie kommt nie zu spät.
//
// Geprüft gegen die Python-Bibliothek holidays für alle Länder und Regionen von 1995 bis 2100
// (server/test/holidays.test.js). Die Feiertagsdaten von date-holidays stehen unter
// CC BY-SA 3.0 (Nennung in der README, Abschnitt „Lizenz & Haftung“).
import Holidays from 'date-holidays'

export const FEDERAL_STATES = ['BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE', 'MV', 'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH']

// Regionen von date-holidays mit den Antworten zum Ort, die auf sie zutreffen.
// Länder ohne Eintrag haben keine regionalen Feiertage.
const REGIONS = {
  BY: [
    { region: 'EVANG', assumptionDayHoliday: false, inAugsburg: false },
    { region: 'KATH', assumptionDayHoliday: true, inAugsburg: false },
    // In der Stadt Augsburg ist auch Mariä Himmelfahrt Feiertag
    { region: 'A', assumptionDayHoliday: true, inAugsburg: true },
  ],
  SN: [
    { region: null, corpusChristiHoliday: false },
    { region: 'BZ', corpusChristiHoliday: true }, // Gemeinden im Landkreis Bautzen
  ],
  TH: [
    { region: null, corpusChristiHoliday: false },
    // Eichsfeld; die Regionen UH und WAK haben dieselben gesetzlichen Feiertage (siehe Test)
    { region: 'EIC', corpusChristiHoliday: true },
  ],
}
const ANSWERS = ['assumptionDayHoliday', 'inAugsburg', 'corpusChristiHoliday']

// Land-Region-Paare, die zum Ort passen. Unbekanntes Land: alle. Widersprechen sich die
// Antworten, passt keine Region — dann bleiben alle des Landes im Spiel.
function candidates(place) {
  const state = FEDERAL_STATES.includes(place?.federalState) ? place.federalState : null
  const regionsOf = (s) => REGIONS[s] ?? [{ region: null }]
  if (!state) return FEDERAL_STATES.flatMap((s) => regionsOf(s).map((r) => [s, r.region]))
  const fits = (r) => ANSWERS.every((k) => typeof place[k] !== 'boolean' || !(k in r) || r[k] === place[k])
  const fitting = regionsOf(state).filter(fits)
  return (fitting.length ? fitting : regionsOf(state)).map((r) => [state, r.region])
}

const calendars = new Map()
const byYear = new Map()

// Gesetzliche Feiertage (date-holidays: type 'public') einer Region als Menge von ISO-Daten.
// `date` ist das Datum in der Zeitzone Deutschlands, unabhängig von der des Rechners.
function holidaysOf(state, region, year) {
  const key = `${state}/${region ?? ''}/${year}`
  if (!byYear.has(key)) {
    const calKey = `${state}/${region ?? ''}`
    if (!calendars.has(calKey)) calendars.set(calKey, region ? new Holidays('DE', state, region) : new Holidays('DE', state))
    const days = calendars.get(calKey).getHolidays(year).filter((h) => h.type === 'public').map((h) => h.date.slice(0, 10))
    byYear.set(key, new Set(days))
  }
  return byYear.get(key)
}

function checkUncertain(uncertain) {
  if (uncertain !== 'include' && uncertain !== 'exclude') {
    throw new TypeError("uncertain muss 'include' oder 'exclude' sein")
  }
}

// Gesetzliche Feiertage eines Jahres am Ort des Hauses, aufsteigend als 'YYYY-MM-DD'.
// `place`: { federalState, assumptionDayHoliday, inAugsburg, corpusChristiHoliday }, null heißt
// nicht angegeben bzw. weiß nicht. Ungültige Werte gelten ebenso als unbekannt.
export function publicHolidays(year, place, { uncertain } = {}) {
  checkUncertain(uncertain)
  const sets = candidates(place).map(([state, region]) => holidaysOf(state, region, year))
  const days = uncertain === 'include'
    ? new Set(sets.flatMap((s) => [...s]))
    : new Set([...sets[0]].filter((d) => sets.every((s) => s.has(d))))
  return [...days].sort()
}

// Dasselbe als Abfrage einzelner Tage: istFeiertag('2026-01-06'). Rechnet jedes Jahr beim
// ersten Zugriff aus, sodass auch Fristen über den Jahreswechsel funktionieren.
export function holidayCalendar(place, { uncertain } = {}) {
  checkUncertain(uncertain)
  const years = new Map()
  return (iso) => {
    const year = Number(iso.slice(0, 4))
    if (!years.has(year)) years.set(year, new Set(publicHolidays(year, place, { uncertain })))
    return years.get(year).has(iso)
  }
}

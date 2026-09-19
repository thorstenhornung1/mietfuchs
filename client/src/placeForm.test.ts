import { describe, expect, test } from 'vitest'
import type { Place } from './types'
import { FEDERAL_STATES } from './types'
import {
  EMPTY_PLACE_FORM, buildPlaceBody, placeQuestions, placeToForm, setAnswer, type PlaceForm,
} from './placeForm'

const form = (patch: Partial<PlaceForm> = {}): PlaceForm => ({ ...EMPTY_PLACE_FORM, ...patch })
const fragen = (f: PlaceForm) => placeQuestions(f).map((q) => q.key)

type Ort = Place
const ohneAngabe: Ort = { federalState: null, assumptionDayHoliday: null, inAugsburg: null, corpusChristiHoliday: null }

describe('Welche Fragen je Bundesland gestellt werden', () => {
  // Nur in Bayern, Sachsen und Thüringen gilt ein gesetzlicher Feiertag bloß in einem Teil
  // der Gemeinden. In allen anderen Ländern genügt das Bundesland.
  test('Bayern: Mariä Himmelfahrt und Augsburg', () => {
    expect(fragen(form({ federalState: 'BY' }))).toEqual(['assumptionDayHoliday', 'inAugsburg'])
  })

  test('Sachsen und Thüringen: Fronleichnam', () => {
    expect(fragen(form({ federalState: 'SN' }))).toEqual(['corpusChristiHoliday'])
    expect(fragen(form({ federalState: 'TH' }))).toEqual(['corpusChristiHoliday'])
  })

  test('übrige Länder und ohne Bundesland: keine Frage', () => {
    expect(fragen(form())).toEqual([])
    for (const land of Object.keys(FEDERAL_STATES)) {
      if (['BY', 'SN', 'TH'].includes(land)) continue
      expect(fragen(form({ federalState: land as PlaceForm['federalState'] })), land).toEqual([])
    }
  })

  test('wo es eine amtliche Liste der Gemeinden gibt, verweist die Frage darauf', () => {
    // Bayern: Landesamt für Statistik; Sachsen: Anlage der Fronleichnamsverordnung. Für
    // Thüringen gibt es keine amtliche Liste (§ 10 Abs. 1 ThürFGtG gilt fort).
    const quelle = (land: PlaceForm['federalState']) => placeQuestions(form({ federalState: land })).map((q) => q.source?.href ?? null)
    expect(quelle('BY')).toEqual(['https://www.statistik.bayern.de/statistik/gebiet_bevoelkerung/zensus/himmelfahrt/', null])
    expect(quelle('SN')).toEqual(['https://www.revosax.sachsen.de/vorschrift/4142-FronleichnamsVO'])
    expect(quelle('TH')).toEqual([null])
  })

  test('die Fragen sind als ganze Sätze formuliert, ohne Kürzel', () => {
    const texte = [...placeQuestions(form({ federalState: 'BY' })), ...placeQuestions(form({ federalState: 'SN' }))]
      .map((q) => q.question)
    expect(texte).toEqual([
      'Ist Mariä Himmelfahrt (15.8.) in Ihrer Gemeinde Feiertag?',
      'Liegt das Haus in Augsburg?',
      'Ist Fronleichnam in Ihrer Gemeinde Feiertag?',
    ])
  })
})

describe('Augsburg und Mariä Himmelfahrt', () => {
  // In der Stadt Augsburg ist Mariä Himmelfahrt Feiertag. „Augsburg: ja" mit „Mariä
  // Himmelfahrt: nein" wäre ein Widerspruch, den das Formular gar nicht erst zulässt.
  test('wer Augsburg bejaht, hat Mariä Himmelfahrt als Feiertag', () => {
    const f = setAnswer(form({ federalState: 'BY', assumptionDayHoliday: 'nein' }), 'inAugsburg', 'ja')
    expect(f.assumptionDayHoliday).toBe('ja')
  })

  test('solange Augsburg bejaht ist, lässt sich Mariä Himmelfahrt nicht ändern', () => {
    const f = form({ federalState: 'BY', inAugsburg: 'ja', assumptionDayHoliday: 'ja' })
    expect(placeQuestions(f).find((q) => q.key === 'assumptionDayHoliday')?.disabled).toBe(true)
    expect(setAnswer(f, 'assumptionDayHoliday', 'nein').assumptionDayHoliday).toBe('ja')
    // Augsburg verneint: die Frage ist wieder frei, die Antwort bleibt zunächst stehen
    const g = setAnswer(f, 'inAugsburg', 'nein')
    expect(g.assumptionDayHoliday).toBe('ja')
    expect(placeQuestions(g).find((q) => q.key === 'assumptionDayHoliday')?.disabled).toBe(false)
  })

  test('widersprüchliche gespeicherte Daten werden beim Laden aufgelöst', () => {
    const f = placeToForm({ ...ohneAngabe, federalState: 'BY', inAugsburg: true, assumptionDayHoliday: false })
    expect(f.assumptionDayHoliday).toBe('ja')
  })
})

describe('Was gespeichert wird', () => {
  test('ja, nein und weiß nicht werden zu true, false und null', () => {
    expect(buildPlaceBody(form({ federalState: 'SN', corpusChristiHoliday: 'ja' })).corpusChristiHoliday).toBe(true)
    expect(buildPlaceBody(form({ federalState: 'SN', corpusChristiHoliday: 'nein' })).corpusChristiHoliday).toBe(false)
    expect(buildPlaceBody(form({ federalState: 'SN', corpusChristiHoliday: 'unbekannt' })).corpusChristiHoliday).toBeNull()
  })

  test('ohne Bundesland wird nichts gespeichert außer „nicht angegeben"', () => {
    expect(buildPlaceBody(form({ assumptionDayHoliday: 'ja', corpusChristiHoliday: 'nein' }))).toEqual(ohneAngabe)
  })

  test('Antworten, die für das gewählte Land nicht gelten, werden verworfen', () => {
    // Wer von Bayern auf Sachsen wechselt, soll keine bayerischen Antworten mitschleppen.
    const f = form({ federalState: 'SN', assumptionDayHoliday: 'ja', inAugsburg: 'nein', corpusChristiHoliday: 'ja' })
    expect(buildPlaceBody(f)).toEqual({ ...ohneAngabe, federalState: 'SN', corpusChristiHoliday: true })
    expect(buildPlaceBody(form({ federalState: 'NW', corpusChristiHoliday: 'ja' }))).toEqual({ ...ohneAngabe, federalState: 'NW' })
  })

  test('Augsburg ohne Mariä Himmelfahrt wird nie gespeichert', () => {
    const f = form({ federalState: 'BY', inAugsburg: 'ja', assumptionDayHoliday: 'nein' })
    expect(buildPlaceBody(f)).toMatchObject({ inAugsburg: true, assumptionDayHoliday: true })
  })
})

describe('Rundlauf mit dem Datenmodell', () => {
  test('gespeicherter Ort → Formular → Rumpf erhält die Angaben', () => {
    const faelle: Ort[] = [
      ohneAngabe,
      { ...ohneAngabe, federalState: 'BY', assumptionDayHoliday: true, inAugsburg: false },
      { ...ohneAngabe, federalState: 'BY', assumptionDayHoliday: false, inAugsburg: null },
      { ...ohneAngabe, federalState: 'BY', assumptionDayHoliday: true, inAugsburg: true },
      { ...ohneAngabe, federalState: 'TH', corpusChristiHoliday: false },
      { ...ohneAngabe, federalState: 'HE' },
    ]
    for (const ort of faelle) expect(buildPlaceBody(placeToForm(ort))).toEqual(ort)
  })

  test('Altbestand ohne diese Felder gilt als „nicht angegeben"', () => {
    expect(placeToForm({} as Ort)).toEqual(EMPTY_PLACE_FORM)
    expect(EMPTY_PLACE_FORM).toEqual({
      federalState: '', assumptionDayHoliday: 'unbekannt', inAugsburg: 'unbekannt', corpusChristiHoliday: 'unbekannt',
    })
  })

  test('ein unbekanntes Länderkürzel gilt als „nicht angegeben"', () => {
    // Sonst stünde im Auswahlfeld ein Land, das gar nicht gespeichert ist (siehe CLAUDE.md).
    expect(placeToForm({ ...ohneAngabe, federalState: 'XY' as Ort['federalState'] }).federalState).toBe('')
  })
})

// Entscheidungslogik für den Ort des Hauses in den Stammdaten: welche Fragen je Bundesland
// gestellt werden und was gespeichert wird. Die Seite rendert nur; geprüft ist die Logik in
// client/src/placeForm.test.ts.
//
// Gesetzliche Feiertage regelt jedes Land selbst. Nur in drei Ländern gilt ein Feiertag bloß in
// einem Teil der Gemeinden: in Bayern Mariä Himmelfahrt und in Augsburg das Friedensfest, in
// Sachsen und Thüringen Fronleichnam. Statt nach Regionen oder Kürzeln fragt das Formular
// danach, was der Vermieter vor Ort weiß. „Weiß nicht" ist eine gültige Antwort.
import type { FederalState, Place } from './types'
import { FEDERAL_STATES } from './types'

export type Answer = 'ja' | 'nein' | 'unbekannt'
export const ANSWER_LABELS: Record<Answer, string> = { ja: 'Ja', nein: 'Nein', unbekannt: 'Weiß nicht' }

export type PlaceKey = 'assumptionDayHoliday' | 'inAugsburg' | 'corpusChristiHoliday'
export type PlaceForm = { federalState: FederalState | '' } & Record<PlaceKey, Answer>

export const EMPTY_PLACE_FORM: PlaceForm = {
  federalState: '', assumptionDayHoliday: 'unbekannt', inAugsburg: 'unbekannt', corpusChristiHoliday: 'unbekannt',
}

export type PlaceQuestion = {
  key: PlaceKey
  question: string
  hint: string
  source?: { label: string; href: string } // amtliche Liste der Gemeinden, wo es eine gibt
  disabled: boolean // Antwort ergibt sich aus einer anderen (Augsburg → Mariä Himmelfahrt)
}

const CORPUS_CHRISTI = 'Ist Fronleichnam in Ihrer Gemeinde Feiertag?'

// Fragen je Land, in der Reihenfolge der Anzeige. Länder ohne Eintrag brauchen keine; auch im
// Saarland gilt Mariä Himmelfahrt landesweit (§ 2 SFG). Rechtsgrundlagen:
// - Bayern: Art. 1 Abs. 1 Nr. 2, Abs. 2 und 3 FTG. Welche Gemeinden überwiegend katholisch sind,
//   stellt das Landesamt für Statistik fest (seit 15.8.2025 nach dem Zensus 2022). Die Stadt
//   Augsburg gehört dazu; das Friedensfest gilt nur im Stadtgebiet, nicht im Landkreis.
// - Sachsen: § 1 SächsSFG mit der Fronleichnamsverordnung vom 4.5.1993, die einzelne Gemeinden
//   und Ortsteile im heutigen Landkreis Bautzen aufzählt.
// - Thüringen: § 2 Abs. 2 und § 10 Abs. 1 ThürFGtG. Mangels Verordnung gilt Fronleichnam dort,
//   wo er 1994 Feiertag war: im Landkreis Eichsfeld und in Teilen des Unstrut-Hainich-Kreises
//   und des Wartburgkreises. Eine amtliche Liste der Gemeinden gibt es nicht.
const QUESTIONS: Partial<Record<FederalState, Omit<PlaceQuestion, 'disabled'>[]>> = {
  BY: [
    {
      key: 'assumptionDayHoliday',
      question: 'Ist Mariä Himmelfahrt (15.8.) in Ihrer Gemeinde Feiertag?',
      hint: 'Feiertag ist er in Gemeinden mit überwiegend katholischer Bevölkerung, das sind die meisten in Bayern. Auskunft gibt auch die Gemeinde.',
      source: {
        label: 'Liste des Bayerischen Landesamts für Statistik',
        href: 'https://www.statistik.bayern.de/statistik/gebiet_bevoelkerung/zensus/himmelfahrt/',
      },
    },
    {
      key: 'inAugsburg',
      question: 'Liegt das Haus in Augsburg?',
      hint: 'Gemeint ist die Stadt, nicht der Landkreis Augsburg. Dort ist am 8. August zusätzlich das Friedensfest Feiertag.',
    },
  ],
  SN: [
    {
      key: 'corpusChristiHoliday',
      question: CORPUS_CHRISTI,
      hint: 'Feiertag ist Fronleichnam nur in einigen Gemeinden und Ortsteilen im Landkreis Bautzen.',
      source: {
        label: 'Liste in der Fronleichnamsverordnung',
        href: 'https://www.revosax.sachsen.de/vorschrift/4142-FronleichnamsVO',
      },
    },
  ],
  TH: [
    {
      key: 'corpusChristiHoliday',
      question: CORPUS_CHRISTI,
      hint: 'Feiertag ist Fronleichnam im Landkreis Eichsfeld und in einigen Gemeinden im Unstrut-Hainich-Kreis und im Wartburgkreis.',
    },
  ],
}

export function placeQuestions(form: PlaceForm): PlaceQuestion[] {
  if (!form.federalState) return []
  return (QUESTIONS[form.federalState] ?? []).map((q) => ({
    ...q,
    disabled: q.key === 'assumptionDayHoliday' && form.inAugsburg === 'ja',
  }))
}

const isFederalState = (v: unknown): v is FederalState =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(FEDERAL_STATES, v)
const toAnswer = (v: boolean | null | undefined): Answer => (v === true ? 'ja' : v === false ? 'nein' : 'unbekannt')
const fromAnswer = (a: Answer): boolean | null => (a === 'ja' ? true : a === 'nein' ? false : null)

// In der Stadt Augsburg ist Mariä Himmelfahrt Feiertag. „Augsburg: ja" zieht deshalb
// „Mariä Himmelfahrt: ja" nach, und die Frage bleibt gesperrt, solange Augsburg bejaht ist.
function consistent(form: PlaceForm): PlaceForm {
  return form.inAugsburg === 'ja' ? { ...form, assumptionDayHoliday: 'ja' } : form
}

export function placeToForm(s: Partial<Place>): PlaceForm {
  return consistent({
    federalState: isFederalState(s.federalState) ? s.federalState : '',
    assumptionDayHoliday: toAnswer(s.assumptionDayHoliday),
    inAugsburg: toAnswer(s.inAugsburg),
    corpusChristiHoliday: toAnswer(s.corpusChristiHoliday),
  })
}

export function setAnswer(form: PlaceForm, key: PlaceKey, answer: Answer): PlaceForm {
  if (key === 'assumptionDayHoliday' && form.inAugsburg === 'ja') return form
  return consistent({ ...form, [key]: answer })
}

// Rumpf für PUT /api/settings. Antworten auf Fragen, die für das gewählte Land nicht gestellt
// werden, gehen als null hinaus — sonst blieben nach einem Wechsel des Landes Angaben stehen,
// die niemand mehr sieht.
export function buildPlaceBody(form: PlaceForm): Place {
  const f = consistent(form)
  const asked = new Set(placeQuestions(f).map((q) => q.key))
  const answer = (key: PlaceKey) => (asked.has(key) ? fromAnswer(f[key]) : null)
  return {
    federalState: f.federalState || null,
    assumptionDayHoliday: answer('assumptionDayHoliday'),
    inAugsburg: answer('inAugsburg'),
    corpusChristiHoliday: answer('corpusChristiHoliday'),
  }
}

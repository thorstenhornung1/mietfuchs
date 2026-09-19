// Ort des Hauses für Fristen: Bundesland und die Antworten zu Feiertagen, die nur in einem Teil
// der Gemeinden gelten (Typ Place in client/src/types.ts). Heute gibt es genau ein Haus, sein
// Ort steht deshalb in den Settings. placeOf ist die einzige Stelle, die das weiß: Feiertage,
// Fristen und Mietkonto bekommen nur das Ortsobjekt. Mit mehreren Objekten wird daraus
// placeOf(objekt), ohne dass holidays.js oder fristen.js sich ändern.
import { FEDERAL_STATES } from './holidays.js'

const answer = (v) => (typeof v === 'boolean' ? v : null)

// Liest den Ort aus einem Objekt mit den Ortsfeldern. Fehlende oder ungültige Angaben — etwa
// ein unbekanntes Länderkürzel, das über die API gespeichert wurde — gelten als „nicht
// angegeben". Ein Ortsobjekt bleibt unverändert.
export function placeOf(source) {
  return {
    federalState: FEDERAL_STATES.includes(source?.federalState) ? source.federalState : null,
    assumptionDayHoliday: answer(source?.assumptionDayHoliday),
    inAugsburg: answer(source?.inAugsburg),
    corpusChristiHoliday: answer(source?.corpusChristiHoliday),
  }
}

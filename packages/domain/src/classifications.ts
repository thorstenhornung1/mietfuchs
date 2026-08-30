// Betriebskostenarten und ihre Zuordnung.
//
// Diese Liste stand bisher zweimal im Repo: als Aufzählung im Ollama-Schema des Servers
// (extract.js) und als `CATEGORIES` im Client — in unterschiedlicher Reihenfolge, mit der
// Pflicht, sie von Hand synchron zu halten. Hier steht sie einmal.
//
// Invariante 20: Bei unbekannter Klassifikation gibt es keinen stillen Fallback. Deshalb
// ordnet `matchCategory` einen freien Text der nächstliegenden Betriebskostenart zu, statt
// alles unbesehen nach „Sonstige" zu schieben — und das Ergebnis ist für den Nutzer im
// Beleg-Dialog sichtbar und korrigierbar.

import type { CostKey, MeterType } from './model.ts'

/**
 * Benennung der Zählertypen. Steht hier und nicht im Client, weil auch der Server sie
 * braucht: Eine Warnung, die dem Vermieter „waerme" statt „Wärme" zeigt, gibt einen
 * internen Schlüssel nach außen.
 */
export const METER_TYPE_LABELS: Record<MeterType, string> = {
  kaltwasser: 'Kaltwasser',
  strom: 'Strom (Allgemein)',
  waerme: 'Wärme',
  sonstig: 'Sonstig',
}

export const CATEGORIES = [
  'Grundsteuer',
  'Wasser/Abwasser',
  'Niederschlagswasser',
  'Müllabfuhr',
  'Straßenreinigung',
  'Gebäudereinigung',
  'Gartenpflege',
  'Beleuchtung/Allgemeinstrom',
  'Schornsteinfeger',
  'Sach- und Haftpflichtversicherung',
  'Hauswart',
  'Aufzug',
  'Kabel/Antenne',
  'Sonstige Betriebskosten',
  'Nicht umlagefähig',
] as const

export type Category = (typeof CATEGORIES)[number]

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value)
}

/**
 * Ordnet eine frei formulierte Kategorie (z. B. aus der KI-Auswertung) der
 * nächstliegenden Betriebskostenart zu.
 */
export function matchCategory(raw: string): Category {
  if (isCategory(raw)) return raw
  const s = raw.toLowerCase()
  if (/müll|abfall|restabfall|biotonne|wertstoff/.test(s)) return 'Müllabfuhr'
  if (/niederschlag|regenwasser|oberflächenwasser/.test(s)) return 'Niederschlagswasser'
  if (/wasser|abwasser|kanal/.test(s)) return 'Wasser/Abwasser'
  if (/grundsteuer|grundbesitz/.test(s)) return 'Grundsteuer'
  if (/versicherung|haftpflicht/.test(s)) return 'Sach- und Haftpflichtversicherung'
  if (/straßenreinigung|strassenreinigung|winterdienst/.test(s)) return 'Straßenreinigung'
  if (/schornstein|kamin|feuerstätte/.test(s)) return 'Schornsteinfeger'
  if (/garten|außenanlage|grünpflege/.test(s)) return 'Gartenpflege'
  if (/strom|beleuchtung/.test(s)) return 'Beleuchtung/Allgemeinstrom'
  if (/gebäudereinigung|hausreinigung|treppenhausreinigung/.test(s)) return 'Gebäudereinigung'
  if (/hauswart|hausmeister/.test(s)) return 'Hauswart'
  if (/aufzug|lift/.test(s)) return 'Aufzug'
  if (/kabel|antenne|breitband/.test(s)) return 'Kabel/Antenne'
  if (/instandhalt|reparatur|verwaltung|nicht umlage/.test(s)) return 'Nicht umlagefähig'
  return 'Sonstige Betriebskosten'
}

/** Sinnvolle Vorbelegung des Umlageschlüssels je Kostenart. */
export function defaultKeyFor(category: string): CostKey {
  if (category === 'Wasser/Abwasser' || category === 'Müllabfuhr') return 'persons'
  return 'area'
}

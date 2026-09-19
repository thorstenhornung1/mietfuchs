// Ort des Hauses (server/src/place.js). placeOf ist die einzige Stelle, die weiß, wo der Ort
// heute steht (in den Settings, es gibt genau ein Haus). Alles Weitere — Feiertage, Fristen,
// Mietkonto — bekommt nur das Ortsobjekt.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { placeOf } from '../src/place.js'

const UNBEKANNT = { federalState: null, assumptionDayHoliday: null, inAugsburg: null, corpusChristiHoliday: null }

test('placeOf liest genau die Felder des Orts', () => {
  const settings = {
    houseName: 'Musterstraße 1', landlordName: 'Erika Muster', ollamaUrl: 'http://localhost:11434',
    federalState: 'BY', assumptionDayHoliday: true, inAugsburg: false, corpusChristiHoliday: null,
  }
  assert.deepEqual(placeOf(settings), { federalState: 'BY', assumptionDayHoliday: true, inAugsburg: false, corpusChristiHoliday: null })
})

test('placeOf: fehlende oder ungültige Angaben gelten als „nicht angegeben"', () => {
  assert.deepEqual(placeOf(undefined), UNBEKANNT)
  assert.deepEqual(placeOf({}), UNBEKANNT) // db.json aus einer älteren Version
  // Über die API oder von Hand lässt sich alles Mögliche speichern
  assert.deepEqual(placeOf({ federalState: 'XX', assumptionDayHoliday: 'ja', inAugsburg: 1, corpusChristiHoliday: 'false' }), UNBEKANNT)
  assert.deepEqual(placeOf({ federalState: 'by' }), UNBEKANNT) // Kürzel nur in Großbuchstaben
  assert.equal(placeOf({ federalState: 'TH' }).federalState, 'TH')
})

test('placeOf ist idempotent: ein Ortsobjekt bleibt, wie es ist', () => {
  const ort = { federalState: 'SN', assumptionDayHoliday: null, inAugsburg: null, corpusChristiHoliday: false }
  assert.deepEqual(placeOf(placeOf(ort)), ort)
})

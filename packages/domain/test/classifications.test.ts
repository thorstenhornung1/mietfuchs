// Zuordnung freier Kategorietexte zu Betriebskostenarten.
//
// Grundlage: Invariante 20 — kein stiller Fallback auf „Sonstige". Was sich fachlich
// zuordnen lässt, wird zugeordnet; „Sonstige Betriebskosten" ist das ehrliche Ergebnis
// für alles Übrige, nicht die bequeme Ausweichkategorie.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CATEGORIES,
  isCategory,
  matchCategory,
  defaultKeyFor,
} from '../src/classifications.ts'

test('die Kategorienliste ist eindeutig und enthält die nicht umlagefähigen Kosten', () => {
  assert.equal(new Set(CATEGORIES).size, CATEGORIES.length, 'keine Dubletten')
  assert.ok(CATEGORIES.includes('Nicht umlagefähig'))
  assert.ok(CATEGORIES.includes('Sonstige Betriebskosten'))
})

test('isCategory erkennt nur die exakten Bezeichnungen', () => {
  assert.equal(isCategory('Grundsteuer'), true)
  assert.equal(isCategory('grundsteuer'), false)
  assert.equal(isCategory('Erfundenes'), false)
})

test('matchCategory reicht bekannte Bezeichnungen unverändert durch', () => {
  for (const c of CATEGORIES) assert.equal(matchCategory(c), c)
})

test('matchCategory ordnet die typischen Rechnungstexte zu', () => {
  assert.equal(matchCategory('Restabfallentsorgung'), 'Müllabfuhr')
  assert.equal(matchCategory('Biotonne 240 l'), 'Müllabfuhr')
  assert.equal(matchCategory('Grundbesitzabgaben'), 'Grundsteuer')
  assert.equal(matchCategory('Schmutzwassergebühr'), 'Wasser/Abwasser')
  assert.equal(matchCategory('Gebäudehaftpflichtversicherung'), 'Sach- und Haftpflichtversicherung')
  assert.equal(matchCategory('Winterdienst'), 'Straßenreinigung')
  assert.equal(matchCategory('Schornsteinfegerarbeiten'), 'Schornsteinfeger')
  assert.equal(matchCategory('Grünpflege Außenanlage'), 'Gartenpflege')
  assert.equal(matchCategory('Allgemeinstrom Treppenhaus'), 'Beleuchtung/Allgemeinstrom')
  assert.equal(matchCategory('Treppenhausreinigung'), 'Gebäudereinigung')
  assert.equal(matchCategory('Hausmeisterservice'), 'Hauswart')
  assert.equal(matchCategory('Aufzugwartung'), 'Aufzug')
  assert.equal(matchCategory('Breitbandanschluss'), 'Kabel/Antenne')
  assert.equal(matchCategory('Reparatur Heizungspumpe'), 'Nicht umlagefähig')
})

test('Niederschlagswasser wird vor Wasser/Abwasser geprüft', () => {
  // Beide Muster greifen auf „Niederschlagswassergebühr" — die Reihenfolge entscheidet,
  // und sie ist hier fachlich richtig: Es ist eine eigene Betriebskostenart.
  assert.equal(matchCategory('Niederschlagswassergebühr'), 'Niederschlagswasser')
  assert.equal(matchCategory('Oberflächenwasser'), 'Niederschlagswasser')
})

test('Unbekanntes wird „Sonstige Betriebskosten" — sichtbar, nicht still', () => {
  assert.equal(matchCategory('Völlig Unbekanntes'), 'Sonstige Betriebskosten')
  assert.equal(matchCategory(''), 'Sonstige Betriebskosten')
})

test('defaultKeyFor belegt verbrauchsnahe Kosten mit dem Personenschlüssel vor', () => {
  assert.equal(defaultKeyFor('Wasser/Abwasser'), 'persons')
  assert.equal(defaultKeyFor('Müllabfuhr'), 'persons')
  assert.equal(defaultKeyFor('Grundsteuer'), 'area')
  assert.equal(defaultKeyFor('Unbekannt'), 'area')
})

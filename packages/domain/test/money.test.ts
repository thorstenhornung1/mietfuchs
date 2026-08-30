// Geldregeln des Domain-Packages.
//
// Grundlage: Invariante 17 — „All money values use integer cents". Es gibt in Mietfuchs
// keinen Euro-Float. Fließkomma existiert nur als Zwischenschritt in der Verteilung und
// wird dort sofort wieder auf ganze Cent gebracht.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  isCents,
  assertCents,
  sumCents,
  parseEuro,
  formatEuro,
  formatCentsPlain,
} from '../src/money.ts'

test('isCents akzeptiert nur ganzzahlige, endliche Beträge (Invariante 17)', () => {
  assert.equal(isCents(0), true)
  assert.equal(isCents(-4711), true)
  assert.equal(isCents(123456), true)

  assert.equal(isCents(12.5), false, 'halbe Cent gibt es nicht')
  assert.equal(isCents(NaN), false)
  assert.equal(isCents(Infinity), false)
  assert.equal(isCents('123'), false, 'ein String ist kein Betrag')
  assert.equal(isCents(null), false)
  assert.equal(isCents(undefined), false)
})

test('assertCents nennt im Fehlerfall die Fundstelle', () => {
  assert.equal(assertCents(500, 'Grundsteuer'), 500)
  assert.throws(
    () => assertCents(5.5, 'Grundsteuer'),
    /Grundsteuer/,
    'die Fehlermeldung muss sagen, welcher Wert gemeint ist',
  )
})

test('sumCents summiert exakt — auch dort, wo Euro-Floats scheitern würden', () => {
  assert.equal(sumCents([]), 0)
  assert.equal(sumCents([54000, 36000]), 90000)
  // 0,10 € + 0,20 € ist in Euro-Floats 0.30000000000000004; in Cent ist es 30.
  assert.equal(sumCents([10, 20]), 30)
  assert.throws(() => sumCents([100, 1.5]), /1\.5/)
})

test('parseEuro liest die deutsche Schreibweise', () => {
  assert.equal(parseEuro('1.234,56'), 123456)
  assert.equal(parseEuro('1234,56'), 123456)
  assert.equal(parseEuro('0,01'), 1)
  assert.equal(parseEuro('-12,34'), -1234)
})

test('parseEuro liest auch die technische Schreibweise', () => {
  assert.equal(parseEuro('1234.56'), 123456)
  assert.equal(parseEuro('1234'), 123400)
  assert.equal(parseEuro('0.5'), 50)
})

test('parseEuro toleriert Währungszeichen und Leerraum', () => {
  assert.equal(parseEuro(' 1.234,56 € '), 123456)
  assert.equal(parseEuro('€1234,56'), 123456)
  // Das geschützte Leerzeichen aus formatEuro muss ebenfalls verschwinden.
  assert.equal(parseEuro('1.234,56 €'), 123456)
})

test('parseEuro liefert null statt einer stillen Null (Invariante 20)', () => {
  assert.equal(parseEuro(''), null)
  assert.equal(parseEuro('   '), null)
  assert.equal(parseEuro('abc'), null)
  assert.equal(parseEuro('€'), null)
})

test('parseEuro deutet einen Punkt ohne Komma technisch — dokumentierte Falle', () => {
  // „1.234" ist zweideutig: deutsch gemeint sind 1.234,00 €, technisch gelesen 1,234 €.
  // Die Engine liest technisch und rundet auf 1,23 €. Das ist heutiges Verhalten und
  // hier bewusst festgeschrieben, siehe docs/settlement-baseline-befunde.md (B7).
  assert.equal(parseEuro('1.234'), 123)
})

test('formatEuro formatiert deutsch mit geschütztem Leerzeichen', () => {
  assert.equal(formatEuro(123456), '1.234,56 €')
  assert.equal(formatEuro(0), '0,00 €')
  assert.equal(formatEuro(-123450), '-1.234,50 €')
  assert.equal(formatEuro(5), '0,05 €')
  assert.equal(formatEuro(-5), '-0,05 €')
  assert.equal(formatEuro(100000000), '1.000.000,00 €')
})

test('formatCentsPlain liefert den Betrag ohne Währungszeichen', () => {
  assert.equal(formatCentsPlain(123456), '1.234,56')
  assert.equal(formatCentsPlain(-5), '-0,05')
})

test('formatEuro und parseEuro sind zueinander invers', () => {
  for (const cents of [0, 1, -1, 99, 100, 123456, -123456, 100000000]) {
    assert.equal(parseEuro(formatEuro(cents)), cents, `Rundlauf für ${cents} ct`)
  }
})

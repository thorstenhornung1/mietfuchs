// Die Prüfung nach ISO 13616, auf der der Wächter gegen echte IBANs steht
// (no-real-ibans.test.ts). Gültige Werte sind nur die öffentliche Beispiel-IBAN aus dessen
// Ausnahmeliste und IBANs, die hier zur Laufzeit aus erfundenen Kontodaten (BLZ 00000000)
// berechnet werden; eine gültige Literal-IBAN in dieser Datei schlüge sonst selbst an.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compactIban, findValidIbans, ibanCheckDigits, isValidIban, maskIban } from '../testing/iban.ts'

const EXAMPLE = 'DE02120300000000202051'
// Erfunden: BLZ 00000000, Konto 0012345678, Prüfziffer berechnet.
const BBAN = '000000000012345678'
const CONSTRUCTED = `DE${ibanCheckDigits('DE', BBAN)}${BBAN}`
const grouped = (iban: string): string => iban.replace(/(.{4})/g, '$1 ').trim()

test('IBAN: die öffentliche Beispiel-IBAN und eine berechnete sind gültig', () => {
  assert.equal(isValidIban(EXAMPLE), true)
  assert.equal(isValidIban(CONSTRUCTED), true)
  assert.match(CONSTRUCTED, /^DE(0[2-9]|[1-8]\d|9[0-8])0{8}0012345678$/)
})

test('IBAN: Leerzeichen und Kleinbuchstaben ändern nichts', () => {
  assert.equal(isValidIban(grouped(EXAMPLE)), true)
  assert.equal(isValidIban(CONSTRUCTED.toLowerCase()), true)
  assert.equal(compactIban(' de02 1203 0000 0000 2020 51 '), EXAMPLE)
})

test('IBAN: eine falsche Prüfziffer, eine vertauschte Ziffer und 00, 01, 99 sind ungültig', () => {
  assert.equal(isValidIban(EXAMPLE.replace(/^DE02/, 'DE03')), false)
  assert.equal(isValidIban(EXAMPLE.slice(0, -2) + '15'), false)
  for (const check of ['00', '01', '99']) {
    assert.equal(isValidIban(`DE${check}${BBAN}`), false, `Prüfziffer ${check}`)
  }
  // Die erfundene Fixture-IBAN des Kanons.
  assert.equal(isValidIban('DE00 1234 5678 9012 3456 78'), false)
})

test('IBAN: falsche Länge oder unbekanntes Land sind ungültig', () => {
  assert.equal(isValidIban(EXAMPLE + '0'), false)
  assert.equal(isValidIban(EXAMPLE.slice(0, -1)), false)
  const bban = '0000000012345678901'
  assert.equal(isValidIban(`XX${ibanCheckDigits('XX', bban)}${bban}`), false)
})

test('IBAN: andere Länder mit ihrer Länge', () => {
  const at = '0000012345678901'
  assert.equal(isValidIban(`AT${ibanCheckDigits('AT', at)}${at}`), true)
  const nl = 'ABNA0123456789'
  assert.equal(isValidIban(`NL${ibanCheckDigits('NL', nl)}${nl}`), true)
  assert.equal(isValidIban(`NL${ibanCheckDigits('NL', nl + '0')}${nl}0`), false)
})

test('IBAN: maskiert bleiben nur die ersten und letzten vier Zeichen', () => {
  assert.equal(maskIban(grouped(EXAMPLE)), 'DE02…2051')
})

test('IBAN-Suche: findet kompakte und gruppierte IBANs mit Zeile, in jedem Umfeld', () => {
  const text = [
    `iban: '${CONSTRUCTED}',`,
    `IBAN: ${grouped(CONSTRUCTED)} bei der Bank`,
    `<IBAN>${CONSTRUCTED}</IBAN>`,
    `:25:${CONSTRUCTED}/EUR`,
    `"Konto";"${grouped(CONSTRUCTED).toLowerCase()}"`,
  ].join('\n')
  assert.deepEqual(findValidIbans(text).map((f) => f.line), [1, 2, 3, 4, 5])
})

test('IBAN-Suche: nichts mitten in längeren Zeichenfolgen und keine Prüfziffer 00', () => {
  assert.deepEqual(findValidIbans(`x${CONSTRUCTED}`), [])
  assert.deepEqual(findValidIbans(`${CONSTRUCTED}7`), [])
  assert.deepEqual(findValidIbans('DE00 0000 0000 0012 3456 78'), [])
  assert.deepEqual(findValidIbans(`DE00${BBAN}`), [])
})

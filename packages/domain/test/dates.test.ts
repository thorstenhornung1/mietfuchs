// Datumsregeln des Domain-Packages.
//
// Grundlage: Invariante 102 — „Civil/legal date ≠ timestamp". Ein Mietbeginn ist ein
// Kalendertag, keine Uhrzeit in einer Zeitzone. Alle Zeiträume haben inklusive Grenzen
// (Spec §57): Endet ein Mietverhältnis am 30.06. und beginnt das nächste am 01.07.,
// gibt es weder einen doppelten noch einen fehlenden Tag.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  isCivilDate,
  assertCivilDate,
  daysInYear,
  daysInclusive,
  overlapDaysInclusive,
  addDays,
  monthOf,
  yearBounds,
  formatCivilDate,
} from '../src/dates.ts'

test('isCivilDate akzeptiert nur echte Kalendertage in ISO-Form (Invariante 102)', () => {
  assert.equal(isCivilDate('2025-01-01'), true)
  assert.equal(isCivilDate('2024-02-29'), true, '2024 ist ein Schaltjahr')

  assert.equal(isCivilDate('2025-02-29'), false, '2025 ist keins')
  assert.equal(isCivilDate('2025-13-01'), false)
  assert.equal(isCivilDate('2025-00-10'), false)
  assert.equal(isCivilDate('2025-04-31'), false, 'der April hat 30 Tage')
  assert.equal(isCivilDate('2025-1-1'), false, 'führende Nullen sind Pflicht')
  assert.equal(isCivilDate('01.01.2025'), false)
  assert.equal(isCivilDate(20250101), false)
  assert.equal(isCivilDate(null), false)
})

test('isCivilDate weist Zeitstempel ausdrücklich zurück (Invariante 102)', () => {
  assert.equal(isCivilDate('2025-01-01T00:00:00Z'), false)
  assert.equal(isCivilDate('2025-01-01T12:00:00+02:00'), false)
  assert.equal(isCivilDate('2025-01-01 00:00'), false)
})

test('assertCivilDate nennt im Fehlerfall die Fundstelle', () => {
  assert.equal(assertCivilDate('2025-06-30', 'Mietende'), '2025-06-30')
  assert.throws(() => assertCivilDate('30.06.2025', 'Mietende'), /Mietende/)
})

test('daysInYear kennt die Schaltjahrregel vollständig', () => {
  assert.equal(daysInYear(2025), 365)
  assert.equal(daysInYear(2024), 366, 'durch 4 teilbar')
  assert.equal(daysInYear(1900), 365, 'durch 100, aber nicht durch 400')
  assert.equal(daysInYear(2000), 366, 'durch 400')
})

test('daysInclusive zählt beide Grenzen mit (§57)', () => {
  assert.equal(daysInclusive('2025-01-01', '2025-01-01'), 1, 'ein Tag ist ein Tag')
  assert.equal(daysInclusive('2025-01-01', '2025-12-31'), 365)
  assert.equal(daysInclusive('2024-01-01', '2024-12-31'), 366)
  assert.equal(daysInclusive('2025-01-01', '2025-06-30'), 181)
  assert.equal(daysInclusive('2025-07-01', '2025-12-31'), 184)
  assert.equal(daysInclusive('2025-01-02', '2025-01-01'), 0, 'leerer Zeitraum')
})

test('Mieterwechsel zum Stichtag: kein doppelter, kein fehlender Tag (§57)', () => {
  // Das Beispiel aus §57: Mieter A endet 30.06., Mieter B beginnt 01.07.
  const a = overlapDaysInclusive('2020-01-01', '2026-06-30', '2026-01-01', '2026-12-31')
  const b = overlapDaysInclusive('2026-07-01', null, '2026-01-01', '2026-12-31')
  assert.equal(a, 181)
  assert.equal(b, 184)
  assert.equal(a + b, daysInYear(2026))
})

test('overlapDaysInclusive behandelt ein offenes Ende als unbegrenzt', () => {
  assert.equal(overlapDaysInclusive('2020-01-01', null, '2025-01-01', '2025-12-31'), 365)
  assert.equal(overlapDaysInclusive('2025-07-01', null, '2025-01-01', '2025-12-31'), 184)
  assert.equal(overlapDaysInclusive('2020-01-01', null, '2025-01-01', null), Infinity)
})

test('overlapDaysInclusive liefert 0 ohne Überschneidung', () => {
  assert.equal(overlapDaysInclusive('2026-01-01', null, '2025-01-01', '2025-12-31'), 0)
  assert.equal(overlapDaysInclusive('2020-01-01', '2024-12-31', '2025-01-01', '2025-12-31'), 0)
})

test('addDays rechnet über Monats-, Jahres- und Schaltgrenzen', () => {
  assert.equal(addDays('2025-01-31', 1), '2025-02-01')
  assert.equal(addDays('2025-12-31', 1), '2026-01-01')
  assert.equal(addDays('2024-02-28', 1), '2024-02-29', 'Schaltjahr')
  assert.equal(addDays('2025-02-28', 1), '2025-03-01', 'kein Schaltjahr')
  assert.equal(addDays('2025-07-01', -1), '2025-06-30', 'der Tag vor dem Mietbeginn')
  assert.equal(addDays('2025-06-30', 0), '2025-06-30')
})

test('monthOf und yearBounds liefern die Staffel- und Jahresgrenzen', () => {
  assert.equal(monthOf('2025-07-15'), '2025-07')
  assert.deepEqual(yearBounds(2025), { from: '2025-01-01', to: '2025-12-31' })
  assert.deepEqual(yearBounds(2024), { from: '2024-01-01', to: '2024-12-31' })
})

test('formatCivilDate schreibt deutsch, ohne aus dem Tag einen Zeitpunkt zu machen', () => {
  assert.equal(formatCivilDate('2025-06-30'), '30.06.2025')
  assert.equal(formatCivilDate('2024-02-29'), '29.02.2024')
})

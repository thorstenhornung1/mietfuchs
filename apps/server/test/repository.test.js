// Repository-Tests (Spec §42 Ebene 2, Issue #21).
//
// Geprüft wird der Vertrag des Adapters, nicht die Rechnung: Was gehört in einen
// Schnappschuss und was nicht. Diese Ebene gab es bisher nicht — sie entsteht mit der
// Repository-Abstraktion und wird von SQLite und PostgreSQL später mit denselben
// Erwartungen bedient (§271.26: keine backend-spezifischen Ergebnisse).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LegacyJsonRepository } from '../src/persistence/legacy-json-repository.ts'
import { computeSettlement } from '../src/calc.ts'

function dbWith(overrides) {
  return {
    settings: {},
    units: [{ id: 'u1', name: 'Wohnung 1', areaM2: 50, participates: true }],
    tenancies: [
      {
        id: 't1',
        unitId: 'u1',
        tenantName: 'Mieter',
        start: '2020-01-01',
        end: null,
        personHistory: [{ from: '2020-01-01', persons: 1 }],
        prepayments: [],
        prepaymentOverrides: {},
        baseRents: [],
      },
    ],
    costItems: [],
    meters: [],
    readings: [],
    payments: [],
    closedSettlements: [],
    ...overrides,
  }
}

const repoFor = (db) => new LegacyJsonRepository(() => db)

test('der Schnappschuss enthält nur die Kostenpositionen des Abrechnungsjahres', async () => {
  const db = dbWith({
    costItems: [
      { id: 'c2024', year: 2024, category: 'Grundsteuer', description: 'Vorjahr', amountCents: 100, key: 'area' },
      { id: 'c2025', year: 2025, category: 'Grundsteuer', description: 'Jahr', amountCents: 200, key: 'area' },
      { id: 'c2026', year: 2026, category: 'Grundsteuer', description: 'Folgejahr', amountCents: 300, key: 'area' },
    ],
  })
  const input = await repoFor(db).loadSettlementInput(2025)
  assert.deepEqual(
    input.costItems.map((c) => c.id),
    ['c2025'],
    'die Zuordnung über das Feld year ist eindeutig — hier darf gefiltert werden',
  )
  assert.equal(input.year, 2025)
})

test('Mietverhältnisse werden NICHT vorgefiltert — die Überlappung entscheidet die Engine', async () => {
  const db = dbWith({
    tenancies: [
      ...dbWith({}).tenancies,
      {
        id: 't-alt',
        unitId: 'u1',
        tenantName: 'Vormieter',
        start: '2018-01-01',
        end: '2019-12-31',
        personHistory: [{ from: '2018-01-01', persons: 1 }],
        prepayments: [],
        prepaymentOverrides: {},
        baseRents: [],
      },
    ],
  })
  const input = await repoFor(db).loadSettlementInput(2025)
  assert.equal(input.tenancies.length, 2, 'die Zeitraumlogik aus §57 gehört an genau eine Stelle')
})

test('Ablesungen werden NICHT nach Jahr gefiltert — sonst fehlt der Anfangsstand', async () => {
  // Der Verbrauch wird zwischen zwei Ablesungen tagesanteilig interpoliert. Der Anfangsstand
  // des Jahres ist die Ablesung vom 31.12. des Vorjahres. Ein Repository, das Ablesungen nach
  // Jahr filtert, verschluckt den ersten Verbrauchszeitraum — dieser Test hält das fest.
  const db = dbWith({
    units: [
      { id: 'u1', name: 'Wohnung 1', areaM2: 50, participates: true },
      { id: 'u2', name: 'Wohnung 2', areaM2: 50, participates: true },
    ],
    tenancies: [
      ...dbWith({}).tenancies,
      {
        id: 't2',
        unitId: 'u2',
        tenantName: 'Mieter 2',
        start: '2020-01-01',
        end: null,
        personHistory: [{ from: '2020-01-01', persons: 1 }],
        prepayments: [],
        prepaymentOverrides: {},
        baseRents: [],
      },
    ],
    costItems: [
      {
        id: 'c1',
        year: 2025,
        category: 'Wasser/Abwasser',
        description: 'Wasser',
        amountCents: 100000,
        key: 'meter',
        meterType: 'kaltwasser',
      },
    ],
    meters: [
      { id: 'm1', unitId: 'u1', name: 'Zähler 1', type: 'kaltwasser', unit: 'm³' },
      { id: 'm2', unitId: 'u2', name: 'Zähler 2', type: 'kaltwasser', unit: 'm³' },
    ],
    readings: [
      { id: 'r1', meterId: 'm1', date: '2024-12-31', value: 0 },
      { id: 'r2', meterId: 'm1', date: '2025-12-31', value: 60 },
      { id: 'r3', meterId: 'm2', date: '2024-12-31', value: 0 },
      { id: 'r4', meterId: 'm2', date: '2025-12-31', value: 40 },
    ],
  })

  const input = await repoFor(db).loadSettlementInput(2025)
  assert.equal(input.readings.length, 4, 'auch die Ablesungen vom 31.12.2024 gehören dazu')

  const result = computeSettlement(input)
  const shares = result.statements.map((s) => s.totalShareCents).sort((a, b) => a - b)
  assert.deepEqual(shares, [40000, 60000], 'Verteilung 60:40 nach gemessenem Verbrauch')
  assert.equal(result.landlord.totalCents, 0)

  // Gegenprobe: Mit nach Jahr gefilterten Ablesungen bliebe je Zähler nur eine Ablesung übrig
  // — kein Segment, kein Verbrauch, der ganze Betrag beim Vermieter.
  const verstuemmelt = computeSettlement({
    ...input,
    readings: input.readings.filter((r) => r.date.startsWith('2025')),
  })
  assert.equal(verstuemmelt.landlord.totalCents, 100000)
  assert.equal(verstuemmelt.warnings.length, 1)
})

test('das Mietkonto bekommt alle Zahlungen — die Jahresabgrenzung trifft die Engine', async () => {
  const db = dbWith({
    payments: [
      { id: 'p1', tenancyId: 't1', date: '2024-12-31', amountCents: 100 },
      { id: 'p2', tenancyId: 't1', date: '2025-06-01', amountCents: 200 },
    ],
  })
  const input = await repoFor(db).loadLedgerInput(2025)
  assert.equal(input.payments.length, 2, 'dieselbe Abgrenzungsregel darf nicht an zwei Stellen stehen')
})

test('das Repository liest bei jedem Aufruf neu — ein Restore darf nicht ins Leere greifen', async () => {
  // getDb() lädt beim ersten Zugriff und wird nach reloadDb() neu eingelesen. Würde der
  // Adapter den Bestand einmalig festhalten, zeigte er nach einer Wiederherstellung noch
  // auf den alten Stand.
  let db = dbWith({ costItems: [{ id: 'alt', year: 2025, category: 'Grundsteuer', description: 'alt', amountCents: 100, key: 'area' }] })
  const repo = new LegacyJsonRepository(() => db)

  const vorher = await repo.loadSettlementInput(2025)
  assert.deepEqual(vorher.costItems.map((c) => c.id), ['alt'])

  db = dbWith({ costItems: [{ id: 'neu', year: 2025, category: 'Grundsteuer', description: 'neu', amountCents: 100, key: 'area' }] })

  const nachher = await repo.loadSettlementInput(2025)
  assert.deepEqual(nachher.costItems.map((c) => c.id), ['neu'])
})

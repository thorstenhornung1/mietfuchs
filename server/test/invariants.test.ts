// Invariantentests der Abrechnungsengine (Mietfuchs Next, Kanon: docs/mietfuchs-next-kanon.md).
//
// Anders als der Prüfkatalog (settlement-golden.test.ts) prüfen diese Tests keine konkreten
// Zahlen, sondern Eigenschaften, die für JEDE Eingabe gelten müssen. Sie laufen deshalb über
// alle Fixtures des Prüfkatalogs und zusätzlich über eigens konstruierte Fälle.
//
// Bezug: Invariante 17 (Integer-Cent), Invariante 20 (kein stiller Fallback),
// Spec §56 (deterministischer Tie-Break), §57 (Zeitsemantik), §271.26 (keine impliziten
// Reihenfolgen), Invariante 136 (Ergebnis unabhängig vom Backend).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeSettlement, daysInYear, overlapDays } from '../src/calc.ts'
import { snapshotFromDb, snapshotOf, type SnapshotCostItem, type SnapshotSource, type SnapshotUnit } from '../src/snapshot.ts'
import type { Db } from '../src/store.ts'
import { loadFixtures, actualOf } from '../testing/fixtures.ts'
import { normalizeSettlement } from '../testing/normalize.ts'

const fixtures = loadFixtures()

// Deterministische Permutation: reproduzierbar, aber verschieden von der Eingabereihenfolge.
// Bewusst kein Zufall — ein fehlschlagender Test muss beim nächsten Lauf wieder fehlschlagen.
const permute = <T>(list: T[]): T[] => list.slice().reverse()

function shuffled(db: Db): Db {
  return {
    ...db,
    units: permute(db.units),
    tenancies: permute(db.tenancies),
    costItems: permute(db.costItems),
    meters: permute(db.meters ?? []),
    readings: permute(db.readings ?? []),
  }
}

const settleDb = (db: Db, year: number) => computeSettlement(snapshotFromDb(db, year))

// ---------- I1 · Integer-Cent (Invariante 17) ----------

function collectCentFields(value: unknown, path = '', out: [string, unknown][] = []): [string, unknown][] {
  if (Array.isArray(value)) {
    value.forEach((v, i) => collectCentFields(v, `${path}[${i}]`, out))
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (k.endsWith('Cents')) out.push([`${path}.${k}`, v])
      else collectCentFields(v, `${path}.${k}`, out)
    }
  }
  return out
}

test('I1 · alle Cent-Felder sind ganzzahlig (Invariante 17)', () => {
  for (const fx of fixtures) {
    for (const [path, value] of collectCentFields(settleDb(fx.db(), fx.year), fx.name)) {
      // Ein fehlendes optionales Feld ist kein Betrag; geprüft wird jeder vorhandene.
      if (value === undefined || value === null) continue
      assert.equal(
        Number.isInteger(value),
        true,
        `${path} ist kein Integer: ${String(value)} — Geld wird ausschließlich in ganzen Cent geführt`,
      )
    }
  }
})

// ---------- I2 · Verteilungsvollständigkeit ----------

test('I2 · je Kostenposition gilt: Summe Mieteranteile + Vermieteranteil = Betrag', () => {
  for (const fx of fixtures) {
    const db = fx.db()
    const result = settleDb(db, fx.year)
    for (const item of db.costItems.filter((c) => c.year === fx.year)) {
      const tenantSum = result.statements
        .flatMap((st) => st.rows)
        .filter((r) => r.costItemId === item.id)
        .reduce((a, r) => a + r.shareCents, 0)
      const landlordSum = result.landlord.rows
        .filter((r) => r.costItemId === item.id)
        .reduce((a, r) => a + r.shareCents, 0)
      assert.equal(
        tenantSum + landlordSum,
        item.amountCents,
        `${fx.name} · Position ${item.id}: ${tenantSum} + ${landlordSum} ≠ ${item.amountCents} — ` +
          'ein Betrag darf weder verschwinden noch entstehen',
      )
    }
  }
})

// Konstruierte Fälle: unmittelbar als Schnappschuss-Quelle, wie in den calc-*-Tests.
const tenancy = (id: string, unitId: string) => ({
  id, unitId, tenantName: id, persons: 1, start: '2020-01-01', end: null,
  personHistory: [{ from: '2020-01-01', persons: 1 }], prepayments: [], prepaymentOverrides: {}, baseRents: [],
})
const unit = (id: string, over: Partial<SnapshotUnit> = {}): SnapshotUnit => ({ id, name: id, areaM2: 50, participates: true, ...over })
const item = (over: Partial<SnapshotCostItem> & Pick<SnapshotCostItem, 'key'>): SnapshotCostItem => ({
  id: 'c1', year: 2025, category: 'Sonstige Betriebskosten', description: 'Probe', amountCents: 40000, ...over,
})
const source = (over: Partial<SnapshotSource>): SnapshotSource => ({
  units: [], tenancies: [], costItems: [], meters: [], readings: [], payments: [], closedSettlements: [], ...over,
})
const settle = (s: SnapshotSource) => computeSettlement(snapshotOf(s, 2025))
const tenantTotal = (r: ReturnType<typeof settle>) =>
  r.statements.flatMap((st) => st.rows).reduce((a, row) => a + row.shareCents, 0)

test('I2b · kein Cent verschwindet, wenn direkt einer nicht beteiligten Wohnung zugeordnet wird', () => {
  // Eine Direktzuordnung darf auf eine Wohnung zeigen, die nicht an der Umlage teilnimmt
  // (z. B. eine Reparatur in der selbstbewohnten Wohnung). Dann gibt es kein Mieter-
  // Statement, das den Betrag aufnehmen könnte — er muss beim Vermieter landen.
  const result = settle(source({
    units: [unit('u1', { participates: false }), unit('u2')],
    tenancies: [tenancy('t1', 'u1'), tenancy('t2', 'u2')],
    costItems: [item({ key: 'direct', directUnitId: 'u1', amountCents: 50000 })],
  }))
  assert.equal(
    tenantTotal(result) + result.landlord.totalCents,
    50000,
    'Der Betrag muss vollständig entweder bei Mietern oder beim Vermieter ankommen',
  )
})

// ---------- I3 · Determinismus ----------

test('I3 · zweimaliges Rechnen liefert dasselbe Ergebnis', () => {
  for (const fx of fixtures) {
    assert.deepStrictEqual(actualOf(fx.db(), fx.year), actualOf(fx.db(), fx.year), `${fx.name} ist nicht deterministisch`)
  }
})

// ---------- I4 · Reihenfolgeunabhängigkeit (Spec §271.26) ----------

test('I4 · die Eingabereihenfolge verändert das Ergebnis nicht (§271.26)', () => {
  for (const fx of fixtures) {
    assert.deepStrictEqual(
      actualOf(shuffled(fx.db()), fx.year),
      actualOf(fx.db(), fx.year),
      `${fx.name}: umgekehrte Eingabereihenfolge ergibt ein anderes Ergebnis — ` +
        'jede fachlich relevante Sortierung muss explizit sein',
    )
  }
})

// ---------- I5 · Zeitraum-Vollständigkeit (Spec §57) ----------

test('I5 · eine lückenlose Mieterkette deckt das Jahr genau einmal ab (§57)', () => {
  const fx = fixtures.find((f) => f.name.startsWith('F03'))
  assert.ok(fx, 'F03 (Mieterwechsel) muss existieren — es trägt diese Invariante')
  const total = fx.db().tenancies.reduce((a, t) => a + overlapDays(t.start, t.end, fx.year), 0)
  assert.equal(
    total,
    daysInYear(fx.year),
    'Vormieter und Nachmieter zusammen müssen exakt das Jahr ergeben — kein doppelter, kein fehlender Tag',
  )
})

test('I5b · Mietverhältnisse derselben Wohnung überlappen sich in keinem Fixture', () => {
  for (const fx of fixtures) {
    const byUnit = new Map<string, number>()
    for (const t of fx.db().tenancies) {
      const days = overlapDays(t.start, t.end, fx.year)
      if (days > 0) byUnit.set(t.unitId, (byUnit.get(t.unitId) ?? 0) + days)
    }
    for (const [unitId, days] of byUnit) {
      assert.ok(
        days <= daysInYear(fx.year),
        `${fx.name} · Wohnung ${unitId}: ${days} belegte Tage bei ${daysInYear(fx.year)} Jahrestagen — ` +
          'ein Tag wird doppelt gezählt',
      )
    }
  }
})

// ---------- I6 · Kein stiller Fallback (Invariante 20) ----------

const twoTenants = (over: Partial<SnapshotUnit> = {}) => ({
  units: [unit('u1', over), unit('u2', over)],
  tenancies: [tenancy('t1', 'u1'), tenancy('t2', 'u2')],
})

test('I6 · fehlende Verbrauchsbasis: Betrag an den Vermieter UND eine Warnung', () => {
  const result = settle(source({ ...twoTenants(), costItems: [item({ key: 'meter', meterType: 'kaltwasser', category: 'Wasser/Abwasser' })] }))
  assert.equal(result.landlord.totalCents, 40000)
  assert.equal(result.warnings.length, 1, 'der Datenmangel muss sichtbar gemeldet werden')
})

test('I6b · fehlende Flächenbasis: Betrag an den Vermieter UND eine Warnung', () => {
  // Sind bei allen beteiligten Wohnungen die Flächen nicht gepflegt, ist der Flächen-
  // schlüssel nicht anwendbar. Der Betrag landet dann vollständig beim Vermieter — das
  // ist rechnerisch korrekt, aber ohne Warnung bemerkt der Vermieter den Datenmangel nicht.
  const result = settle(source({ ...twoTenants({ areaM2: 0 }), costItems: [item({ key: 'area', category: 'Grundsteuer' })] }))
  assert.equal(result.landlord.totalCents, 40000)
  assert.equal(result.warnings.length, 1, 'der Datenmangel muss sichtbar gemeldet werden')
})

// ---------- I7 · Deterministischer Tie-Break (Spec §56) ----------

test('I7 · bei gleichem Nachkommaanteil entscheidet ein fachlicher Schlüssel, nicht die Eingabereihenfolge (§56)', () => {
  const fx = fixtures.find((f) => f.name.startsWith('F04'))
  assert.ok(fx, 'F04 (Largest Remainder) muss existieren — es trägt diese Invariante')

  const expected = normalizeSettlement(settleDb(fx.db(), fx.year))
  const winners = expected.statements.filter((st) => st.totalShareCents === 3334)
  assert.equal(winners.length, 1, 'genau ein Mietverhältnis erhält den Rest-Cent')
  assert.equal(winners[0].tenancyId, 't1', 'der Rest-Cent geht an das fachlich erste Mietverhältnis')

  // Dieselben Daten in umgekehrter Reihenfolge müssen dieselbe Zuteilung ergeben.
  assert.deepStrictEqual(
    normalizeSettlement(settleDb(shuffled(fx.db()), fx.year)),
    expected,
    'der Tie-Break hängt an der Eingabereihenfolge statt an einem fachlichen Schlüssel',
  )
})

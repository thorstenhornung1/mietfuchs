// Invariantentests der Abrechnungsengine (Issue #26).
//
// Anders als die Golden-Master-Tests prüfen diese Tests keine konkreten Zahlen, sondern
// Eigenschaften, die für JEDE Eingabe gelten müssen. Sie laufen deshalb über alle Fixtures
// und zusätzlich über eigens konstruierte Fälle.
//
// Bezug: Invariante 17 (Integer-Cent), Invariante 20 (kein stiller Fallback),
// Spec §56 (deterministischer Tie-Break), §57 (Zeitsemantik), §271.26 (keine impliziten
// Reihenfolgen), Technik-Spec Invariante 136 (Ergebnis unabhängig vom Backend).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeSettlement, daysInYear, overlapDays } from '../src/calc.ts'
import { normalizeSettlement } from '../testing/normalize.js'
import { loadFixtures, actualOf } from '../testing/fixtures.js'
import { settlementInput } from '../testing/snapshot.js'

const fixtures = loadFixtures()

// Deterministische Permutation: reproduzierbar, aber verschieden von der Eingabereihenfolge.
// Bewusst kein Zufall — ein fehlschlagender Test muss beim nächsten Lauf wieder fehlschlagen.
function permute(list) {
  return list.slice().reverse()
}

function shuffled(db) {
  return {
    ...db,
    units: permute(db.units),
    tenancies: permute(db.tenancies),
    costItems: permute(db.costItems),
    meters: permute(db.meters ?? []),
    readings: permute(db.readings ?? []),
  }
}

// ---------- I1 · Integer-Cent (Invariante 17) ----------

function collectCentFields(value, path = '', out = []) {
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

test('I1 · alle Cent-Felder sind ganzzahlig (Invariante 17)', async () => {
  for (const fx of fixtures) {
    const result = computeSettlement(await settlementInput(fx.db(), fx.year))
    for (const [path, value] of collectCentFields(result, fx.name)) {
      assert.equal(
        Number.isInteger(value),
        true,
        `${path} ist kein Integer: ${value} — Geld wird ausschließlich in ganzen Cent geführt`,
      )
    }
  }
})

// ---------- I2 · Verteilungsvollständigkeit ----------

test('I2 · je Kostenposition gilt: Summe Mieteranteile + Vermieteranteil = Betrag', async () => {
  for (const fx of fixtures) {
    const db = fx.db()
    const result = computeSettlement(await settlementInput(db, fx.year))
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

test('I2b · kein Cent verschwindet, wenn direkt einer nicht beteiligten Wohnung zugeordnet wird', async () => {
  // Eine Direktzuordnung darf auf eine Wohnung zeigen, die nicht an der Umlage teilnimmt
  // (z. B. eine Reparatur in der selbstbewohnten Wohnung). Dann gibt es kein Mieter-
  // Statement, das den Betrag aufnehmen könnte — er muss beim Vermieter landen.
  const db = {
    settings: {},
    units: [
      { id: 'u1', name: 'Eigennutzung', areaM2: 80, participates: false },
      { id: 'u2', name: 'Vermietet', areaM2: 80, participates: true },
    ],
    tenancies: [
      {
        id: 't1',
        unitId: 'u1',
        tenantName: 'Eigentümer',
        start: '2020-01-01',
        end: null,
        personHistory: [{ from: '2020-01-01', persons: 1 }],
        prepayments: [],
        prepaymentOverrides: {},
        baseRents: [],
      },
      {
        id: 't2',
        unitId: 'u2',
        tenantName: 'Mieter',
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
        category: 'Sonstige',
        description: 'Reparatur in der selbstbewohnten Wohnung',
        amountCents: 50000,
        key: 'direct',
        directUnitId: 'u1',
      },
    ],
    meters: [],
    readings: [],
    payments: [],
    closedSettlements: [],
  }
  const result = computeSettlement(await settlementInput(db, 2025))
  const tenantSum = result.statements
    .flatMap((st) => st.rows)
    .reduce((a, r) => a + r.shareCents, 0)
  assert.equal(
    tenantSum + result.landlord.totalCents,
    50000,
    'Der Betrag muss vollständig entweder bei Mietern oder beim Vermieter ankommen',
  )
})

// ---------- I3 · Determinismus ----------

test('I3 · zweimaliges Rechnen liefert dasselbe Ergebnis', async () => {
  for (const fx of fixtures) {
    const first = await actualOf(fx.db(), fx.year)
    const second = await actualOf(fx.db(), fx.year)
    assert.deepStrictEqual(second, first, `${fx.name} ist nicht deterministisch`)
  }
})

// ---------- I4 · Reihenfolgeunabhängigkeit (Spec §271.26) ----------

test('I4 · die Eingabereihenfolge verändert das Ergebnis nicht (§271.26)', async () => {
  for (const fx of fixtures) {
    const inOrder = await actualOf(fx.db(), fx.year)
    const reversed = await actualOf(shuffled(fx.db()), fx.year)
    assert.deepStrictEqual(
      reversed,
      inOrder,
      `${fx.name}: umgekehrte Eingabereihenfolge ergibt ein anderes Ergebnis — ` +
        'jede fachlich relevante Sortierung muss explizit sein',
    )
  }
})

// ---------- I5 · Zeitraum-Vollständigkeit (Spec §57) ----------

test('I5 · eine lückenlose Mieterkette deckt das Jahr genau einmal ab (§57)', () => {
  const fx = fixtures.find((f) => f.name.startsWith('F03'))
  assert.ok(fx, 'F03 (Mieterwechsel) muss existieren — es trägt diese Invariante')
  const db = fx.db()
  const total = db.tenancies.reduce((a, t) => a + overlapDays(t.start, t.end, fx.year), 0)
  assert.equal(
    total,
    daysInYear(fx.year),
    'Vormieter und Nachmieter zusammen müssen exakt das Jahr ergeben — ' +
      'kein doppelter, kein fehlender Tag',
  )
})

test('I5b · Mietverhältnisse derselben Wohnung überlappen sich in keinem Fixture', () => {
  for (const fx of fixtures) {
    const db = fx.db()
    const byUnit = new Map()
    for (const t of db.tenancies) {
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

function dbWithSingleItem(item, unitOverrides = {}) {
  return {
    settings: {},
    units: [
      { id: 'u1', name: 'Wohnung 1', areaM2: 50, participates: true, ...unitOverrides },
      { id: 'u2', name: 'Wohnung 2', areaM2: 50, participates: true, ...unitOverrides },
    ],
    tenancies: ['t1', 't2'].map((id, i) => ({
      id,
      unitId: `u${i + 1}`,
      tenantName: `Mieter ${i + 1}`,
      start: '2020-01-01',
      end: null,
      personHistory: [{ from: '2020-01-01', persons: 1 }],
      prepayments: [],
      prepaymentOverrides: {},
      baseRents: [],
    })),
    costItems: [item],
    meters: [],
    readings: [],
    payments: [],
    closedSettlements: [],
  }
}

test('I6 · fehlende Verbrauchsbasis: Betrag an den Vermieter UND eine Warnung', async () => {
  const db = dbWithSingleItem({
    id: 'c1',
    year: 2025,
    category: 'Heizung',
    description: 'Heizung',
    amountCents: 40000,
    key: 'meter',
    meterType: 'Heizung',
  })
  const result = computeSettlement(await settlementInput(db, 2025))
  assert.equal(result.landlord.totalCents, 40000)
  assert.equal(result.warnings.length, 1, 'der Datenmangel muss sichtbar gemeldet werden')
})

test('I6b · fehlende Flächenbasis: Betrag an den Vermieter UND eine Warnung', async () => {
  // Sind bei allen beteiligten Wohnungen die Flächen nicht gepflegt, ist der Flächen-
  // schlüssel nicht anwendbar. Der Betrag landet dann vollständig beim Vermieter — das
  // ist rechnerisch korrekt, aber ohne Warnung bemerkt der Vermieter den Datenmangel nicht.
  const db = dbWithSingleItem(
    {
      id: 'c1',
      year: 2025,
      category: 'Grundsteuer',
      description: 'Grundsteuer',
      amountCents: 40000,
      key: 'area',
    },
    { areaM2: 0 },
  )
  const result = computeSettlement(await settlementInput(db, 2025))
  assert.equal(result.landlord.totalCents, 40000)
  assert.equal(result.warnings.length, 1, 'der Datenmangel muss sichtbar gemeldet werden')
})

// ---------- I7 · Deterministischer Tie-Break (Spec §56) ----------

test('I7 · bei gleichem Nachkommaanteil entscheidet ein fachlicher Schlüssel, nicht die Eingabereihenfolge (§56)', async () => {
  const fx = fixtures.find((f) => f.name.startsWith('F04'))
  assert.ok(fx, 'F04 (Largest Remainder) muss existieren — es trägt diese Invariante')

  const expected = normalizeSettlement(computeSettlement(await settlementInput(fx.db(), fx.year)))
  const winners = expected.statements.filter((st) => st.totalShareCents === 3334)
  assert.equal(winners.length, 1, 'genau ein Mietverhältnis erhält das Restcent')
  assert.equal(winners[0].tenancyId, 't1', 'das Restcent geht an das fachlich erste Mietverhältnis')

  // Dieselben Daten in umgekehrter Reihenfolge müssen dieselbe Zuteilung ergeben.
  const reversed = normalizeSettlement(computeSettlement(await settlementInput(shuffled(fx.db()), fx.year)))
  assert.deepStrictEqual(
    reversed,
    expected,
    'der Tie-Break hängt an der Eingabereihenfolge statt an einem fachlichen Schlüssel',
  )
})

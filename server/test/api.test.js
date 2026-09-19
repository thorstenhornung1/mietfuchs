// Integrationstests gegen den echten Server: startet ihn als eigenen Prozess mit
// NKA_DATA_DIR auf einem Wegwerf-Ordner, damit weder eine vorhandene db.json noch die
// Belege im Arbeitsverzeichnis berührt werden. Geprüft wird, was die Engine-Tests nicht
// sehen: dass die generischen CRUD-Routen die neuen Felder durchlassen, dass die
// Löschkaskade aufräumt und dass die Abrechnungs-Routen liefern, was das Frontend erwartet.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Startet eine Server-Instanz auf einem eigenen Datenordner und wartet auf Bereitschaft.
async function startServer() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mietfuchs-test-'))
  return startServerIn(dataDir)
}

async function startServerIn(dataDir) {
  const port = 34000 + Math.floor(Math.random() * 8000)
  const base = `http://127.0.0.1:${port}`
  const child = spawn(process.execPath, ['src/index.js'], {
    cwd: serverRoot,
    env: { ...process.env, NKA_PORT: String(port), NKA_DATA_DIR: dataDir },
    stdio: 'ignore',
  })
  const api = async (pfad, init) => {
    const res = await fetch(`${base}${pfad}`, {
      ...init,
      headers: init?.body ? { 'content-type': 'application/json' } : undefined,
    })
    if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${pfad} → ${res.status}`)
    return res.json()
  }
  const deadline = Date.now() + 20000
  for (;;) {
    try {
      await api('/api/settings')
      break
    } catch {
      if (Date.now() > deadline) throw new Error('Server ist nicht gestartet')
      await new Promise((r) => setTimeout(r, 100))
    }
  }
  // Sicherung: der Server muss wirklich im Wegwerf-Ordner arbeiten, sonst nichts weiter tun.
  assert.ok(fs.existsSync(path.join(dataDir, 'uploads')), 'NKA_DATA_DIR wird nicht beachtet')
  const stop = () => {
    child.kill()
    fs.rmSync(dataDir, { recursive: true, force: true })
  }
  return { api, dataDir, stop }
}

let srv

before(async () => {
  srv = await startServer()
})

after(() => srv?.stop())

test('Healthcheck: /healthz antwortet als JSON mit Status ok', async () => {
  // Antwortete hier die index.html, stünde die Route hinter dem Frontend-Catch-All — dann
  // meldete ein kaputter Container HTTP 200.
  const bericht = await srv.api('/healthz')
  assert.equal(bericht.status, 'ok')
  assert.equal(bericht.checks.data.ok, true)
  assert.equal(bericht.checks.uploads.ok, true)
})

test('Ort des Hauses: anfangs nicht angegeben, über /api/settings speicherbar', async () => {
  // „Nicht angegeben" ist ein gültiger Zustand und heißt: vorsichtig rechnen. Die Felder müssen
  // deshalb von Anfang an da sein — auch bei einer db.json aus einer älteren Version.
  const neu = await srv.api('/api/settings')
  assert.equal(neu.federalState, null)
  assert.equal(neu.assumptionDayHoliday, null)
  assert.equal(neu.inAugsburg, null)
  assert.equal(neu.corpusChristiHoliday, null)

  const gespeichert = await srv.api('/api/settings', {
    method: 'PUT',
    body: JSON.stringify({ federalState: 'BY', assumptionDayHoliday: true, inAugsburg: false, corpusChristiHoliday: null }),
  })
  assert.equal(gespeichert.federalState, 'BY')
  assert.equal(gespeichert.assumptionDayHoliday, true)
  assert.equal(gespeichert.inAugsburg, false)
  assert.equal((await srv.api('/api/settings')).federalState, 'BY')
  await srv.api('/api/settings', {
    method: 'PUT',
    body: JSON.stringify({ federalState: null, assumptionDayHoliday: null, inAugsburg: null, corpusChristiHoliday: null }),
  })

  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mietfuchs-alt-'))
  fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({ settings: { houseName: 'Altbau' }, units: [], tenancies: [] }))
  const alt = await startServerIn(dataDir)
  try {
    const s = await alt.api('/api/settings')
    assert.equal(s.houseName, 'Altbau')
    assert.equal(s.federalState, null)
    assert.equal(s.corpusChristiHoliday, null)
  } finally {
    alt.stop()
  }
})

test('Wohnungen: Eigennutzungs-Felder überleben Anlegen und Ändern', async () => {
  const unit = await srv.api('/api/units', {
    method: 'POST',
    body: JSON.stringify({ name: 'EG', areaM2: 80, participates: false, selfUsed: true, selfPersons: 2 }),
  })
  assert.equal(unit.selfUsed, true)
  assert.equal(unit.selfPersons, 2)
  const geaendert = await srv.api(`/api/units/${unit.id}`, {
    method: 'PUT',
    body: JSON.stringify({ name: 'EG', areaM2: 80, participates: true, selfUsed: false, selfPersons: null }),
  })
  assert.equal(geaendert.selfUsed, false)
  assert.equal(geaendert.selfPersons, null)
  await srv.api(`/api/units/${unit.id}`, { method: 'DELETE' })
})

test('Abrechnung: Eigenanteil kommt über die Route beim Frontend an', async () => {
  const eigen = await srv.api('/api/units', {
    method: 'POST',
    body: JSON.stringify({ name: 'EG', areaM2: 80, participates: false, selfUsed: true, selfPersons: 2 }),
  })
  const vermietet = await srv.api('/api/units', {
    method: 'POST',
    body: JSON.stringify({ name: 'OG', areaM2: 150, participates: true }),
  })
  const miete = await srv.api('/api/tenancies', {
    method: 'POST',
    body: JSON.stringify({
      unitId: vermietet.id, tenantName: 'Familie A', start: '2020-01-01', end: null,
      personHistory: [{ from: '2020-01-01', persons: 2 }], prepayments: [], baseRents: [], prepaymentOverrides: {},
    }),
  })
  const kosten = await srv.api('/api/costItems', {
    method: 'POST',
    body: JSON.stringify({ year: 2031, category: 'Grundsteuer', description: 'Grundsteuer', amountCents: 230000, key: 'area' }),
  })

  const s = await srv.api('/api/settlement/2031')
  assert.equal(s.statements[0].totalShareCents, 150000) // 150 von 230 m²
  assert.equal(s.landlord.totalCents, 80000)
  assert.equal(s.selfUsedShareCents, 80000)

  const steuer = await srv.api('/api/taxreport/2031')
  assert.equal(steuer.selfUsedShareCents, 80000)
  assert.equal(steuer.selfOccupiedExists, true)

  await srv.api(`/api/costItems/${kosten.id}`, { method: 'DELETE' })
  await srv.api(`/api/tenancies/${miete.id}`, { method: 'DELETE' })
  await srv.api(`/api/units/${eigen.id}`, { method: 'DELETE' })
  await srv.api(`/api/units/${vermietet.id}`, { method: 'DELETE' })
})

test('Löschen einer Wohnung entfernt ihren vereinbarten Prozentanteil', async () => {
  const a = await srv.api('/api/units', { method: 'POST', body: JSON.stringify({ name: 'A', areaM2: 50, participates: true }) })
  const b = await srv.api('/api/units', { method: 'POST', body: JSON.stringify({ name: 'B', areaM2: 50, participates: true }) })
  const item = await srv.api('/api/costItems', {
    method: 'POST',
    body: JSON.stringify({
      year: 2032, category: 'Sonstige Betriebskosten', description: 'Vereinbart',
      amountCents: 100000, key: 'custom', customShares: { [a.id]: 40, [b.id]: 60 },
    }),
  })
  await srv.api(`/api/units/${b.id}`, { method: 'DELETE' })
  const items = await srv.api('/api/costItems')
  const nachher = items.find((x) => x.id === item.id)
  assert.deepEqual(Object.keys(nachher.customShares), [a.id], 'Anteil der gelöschten Wohnung bleibt zurück')

  await srv.api(`/api/costItems/${item.id}`, { method: 'DELETE' })
  await srv.api(`/api/units/${a.id}`, { method: 'DELETE' })
})

test('Vor dieser Version eingefrorene Abrechnung liefert einen Eigenanteil von 0', async () => {
  // Altbestand nachbauen: ein Snapshot, der das Feld noch nicht kennt. Die Route muss die
  // in types.ts zugesagte Form trotzdem einhalten, sonst rechnet das Frontend mit undefined.
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mietfuchs-alt-'))
  fs.writeFileSync(
    path.join(dataDir, 'db.json'),
    JSON.stringify({
      settings: {}, units: [], tenancies: [], costItems: [], meters: [], readings: [], payments: [],
      closedSettlements: [
        {
          id: 'alt', year: 2030, closedAt: '2031-01-05', sentAt: null,
          settlement: { year: 2030, daysInYear: 365, statements: [], landlord: { rows: [], totalCents: 0 }, totalCostsCents: 0, warnings: [] },
        },
      ],
    }),
  )
  const alt = await startServerIn(dataDir)
  try {
    const s = await alt.api('/api/settlement/2030')
    assert.equal(s.selfUsedShareCents, 0)
    assert.equal(s.closed.closedAt, '2031-01-05')
  } finally {
    alt.stop()
  }
})

test('Mietkonto: die Route rechnet Rückstände zum heutigen Tag', async () => {
  // Stichtag ist das heutige Datum. Ein Jahr weit in der Zukunft hat deshalb noch keinen
  // fälligen Monat, ein vergangenes Jahr nur fällige.
  const unit = await srv.api('/api/units', { method: 'POST', body: JSON.stringify({ name: 'OG', areaM2: 70, participates: true }) })
  const miete = await srv.api('/api/tenancies', {
    method: 'POST',
    body: JSON.stringify({
      unitId: unit.id, tenantName: 'Familie B', start: '2021-01-01', end: null,
      personHistory: [{ from: '2021-01-01', persons: 1 }],
      baseRents: [{ from: '2021-01', monthlyCents: 50000 }], prepayments: [], prepaymentOverrides: {},
    }),
  })

  const zukunft = await srv.api('/api/rentledger/2099')
  assert.match(zukunft.asOf, /^\d{4}-\d{2}-\d{2}$/)
  assert.equal(zukunft.rows[0].sollYearCents, 600000) // 12 × 500 €
  assert.equal(zukunft.rows[0].dueSollCents, 0)
  assert.equal(zukunft.rows[0].balanceCents, 0)
  assert.ok(zukunft.rows[0].months.every((m) => m.status === 'upcoming'))
  assert.equal(zukunft.totals.openCents, 0)

  const vergangen = await srv.api('/api/rentledger/2021')
  assert.equal(vergangen.rows[0].dueSollCents, 600000)
  assert.equal(vergangen.rows[0].openMonths, 12)
  assert.equal(vergangen.totals.openCents, 600000)

  await srv.api(`/api/tenancies/${miete.id}`, { method: 'DELETE' })
  await srv.api(`/api/units/${unit.id}`, { method: 'DELETE' })
})

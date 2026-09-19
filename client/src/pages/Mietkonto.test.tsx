// @vitest-environment jsdom
// Komponententest des Mietkontos für den Hinweis unter den grauen Monaten. Ob das Bundesland
// fehlt, entscheidet der Server (placeOf) und meldet es im Ergebnis als `place`. Die Seite
// liest es nur dort ab — so gilt ein ungültiges Kürzel auch hier als „nicht angegeben".
import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import type { Place, RentLedger } from '../types'
import { YearProvider } from '../year'
import { UIProvider } from '../components/feedback'
import Mietkonto from './Mietkonto'

const OHNE_ORT: Place = { federalState: null, assumptionDayHoliday: null, inAugsburg: null, corpusChristiHoliday: null }

// Ein Mietverhältnis, Januar bis August bezahlt, September offen, Oktober bis Dezember noch nicht fällig
function mietkonto(place: Place): RentLedger {
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1, baseRentCents: 80000, prepaymentCents: 0, sollCents: 80000,
    paidCents: i < 8 ? 80000 : 0,
    status: i < 8 ? 'paid' as const : i === 8 ? 'open' as const : 'upcoming' as const,
    payableBy: `2026-${String(i + 1).padStart(2, '0')}-05`,
  }))
  return {
    year: 2026, asOf: '2026-09-19', place,
    rows: [{
      tenancyId: 't1', tenantName: 'Familie Beispiel', unitName: 'OG links', months,
      sollYearCents: 960000, baseRentYearCents: 960000, prepaymentYearCents: 0, dueSollCents: 720000,
      paidYearCents: 640000, balanceCents: -80000, openMonths: 1,
    }],
    totals: { sollYearCents: 960000, paidYearCents: 640000, openCents: 80000 },
  }
}

const zeige = (ledger: RentLedger) => {
  vi.stubGlobal('fetch', async (url: string) => {
    const daten = url.startsWith('/api/rentledger/') ? ledger : []
    return new Response(JSON.stringify(daten), { status: 200, headers: { 'content-type': 'application/json' } })
  })
  render(
    <UIProvider>
      <YearProvider>
        <Mietkonto />
      </YearProvider>
    </UIProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('ohne Bundesland erklärt der Hinweis, warum alle Feiertage zählen', async () => {
  zeige(mietkonto(OHNE_ORT))
  await waitFor(() => expect(screen.getByText(/Graue Monate sind noch kein Rückstand/)).toBeTruthy())
  expect(screen.getByText(/Bundesland in den Stammdaten fehlt/)).toBeTruthy()
})

test('mit Bundesland entfällt der Hinweis', async () => {
  zeige(mietkonto({ ...OHNE_ORT, federalState: 'SN', corpusChristiHoliday: false }))
  await waitFor(() => expect(screen.getByText(/Graue Monate sind noch kein Rückstand/)).toBeTruthy())
  expect(screen.queryByText(/Bundesland in den Stammdaten fehlt/)).toBeNull()
})

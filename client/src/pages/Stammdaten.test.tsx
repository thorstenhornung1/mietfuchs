// @vitest-environment jsdom
// Komponententest der Stammdaten, Karte „Haus" mit dem Ort des Hauses. Die Logik steckt in
// placeForm.ts; hier geht es um das, was nur die Seite zeigen kann: Die Auswahlfelder zeigen
// den gespeicherten Stand, und gespeichert wird genau das, was zu sehen ist.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { Settings } from '../types'
import { UIProvider } from '../components/feedback'
import Stammdaten from './Stammdaten'

const SETTINGS: Settings = {
  houseName: 'Musterstraße 1', address: 'Musterstraße 1, 12345 Musterstadt', landlordName: '', iban: '',
  paymentDeadlineDays: 30, ollamaUrl: 'http://localhost:11434', ollamaModel: 'qwen3.6-35b',
  federalState: 'BY', assumptionDayHoliday: true, inAugsburg: null, corpusChristiHoliday: null,
}

let gesendet: { url: string; body: Record<string, unknown> }[]

beforeEach(() => {
  gesendet = []
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (init?.method === 'PUT') gesendet.push({ url, body: JSON.parse(String(init.body)) })
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const zeige = (settings: Settings) =>
  render(
    <UIProvider>
      <Stammdaten units={[]} tenancies={[]} settings={settings} reload={async () => {}} />
    </UIProvider>,
  )
const auswahl = (label: RegExp) => screen.getByLabelText(label) as HTMLSelectElement
const sichtbar = (s: HTMLSelectElement) => s.selectedOptions[0]?.textContent
const hausKarte = () => screen.getByRole('heading', { name: 'Haus' }).closest('.card') as HTMLElement

test('die Karte „Haus" zeigt Bundesland und Antworten so, wie sie gespeichert sind', async () => {
  zeige(SETTINGS)
  await waitFor(() => expect(sichtbar(auswahl(/Bundesland/i))).toBe('Bayern'))
  expect(hausKarte().contains(auswahl(/Bundesland/i))).toBe(true)
  expect(sichtbar(auswahl(/Mariä Himmelfahrt/i))).toBe('Ja')
  expect(sichtbar(auswahl(/Augsburg/i))).toBe('Weiß nicht')
  expect(screen.queryByLabelText(/Fronleichnam/i)).toBeNull()
})

test('ohne Angabe steht „nicht angegeben" da, und es gibt keine Zusatzfragen', async () => {
  zeige({ ...SETTINGS, federalState: null, assumptionDayHoliday: null })
  await waitFor(() => expect(auswahl(/Bundesland/i).value).toBe(''))
  expect(sichtbar(auswahl(/Bundesland/i))).toBe('nicht angegeben')
  expect(screen.queryByLabelText(/Mariä Himmelfahrt/i)).toBeNull()
})

test('Wechsel des Landes: andere Frage, gespeichert wird mit den Hausdaten nur, was gilt', async () => {
  zeige(SETTINGS)
  await waitFor(() => expect(sichtbar(auswahl(/Bundesland/i))).toBe('Bayern'))
  fireEvent.change(auswahl(/Bundesland/i), { target: { value: 'SN' } })
  expect(screen.queryByLabelText(/Mariä Himmelfahrt/i)).toBeNull()
  const fronleichnam = auswahl(/Fronleichnam/i)
  expect(sichtbar(fronleichnam)).toBe('Weiß nicht')
  fireEvent.change(fronleichnam, { target: { value: 'nein' } })

  fireEvent.click(within(hausKarte()).getByRole('button', { name: /^Speichern$/ }))
  await waitFor(() => expect(gesendet).toHaveLength(1))
  expect(gesendet[0]).toEqual({
    url: '/api/settings',
    body: {
      houseName: 'Musterstraße 1', address: 'Musterstraße 1, 12345 Musterstadt',
      federalState: 'SN', corpusChristiHoliday: false, assumptionDayHoliday: null, inAugsburg: null,
    },
  })
})

test('Augsburg bejaht: Mariä Himmelfahrt zeigt „Ja" und ist gesperrt', async () => {
  zeige({ ...SETTINGS, assumptionDayHoliday: false })
  await waitFor(() => expect(sichtbar(auswahl(/Bundesland/i))).toBe('Bayern'))
  fireEvent.change(auswahl(/Augsburg/i), { target: { value: 'ja' } })
  const mariae = auswahl(/Mariä Himmelfahrt/i)
  expect(sichtbar(mariae)).toBe('Ja')
  expect(mariae.disabled).toBe(true)
})

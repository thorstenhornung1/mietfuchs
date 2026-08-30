// Das Datenmodell liegt seit Mietfuchs Next im gemeinsamen Domain-Package
// (packages/domain, Spec §38) — Server und Client teilen dieselbe Wahrheit. Diese Datei
// reicht es weiter, damit die bestehenden Imports der Seiten unverändert bleiben, und
// ergänzt das, was reine Darstellung ist und deshalb im Client bleibt.

export * from '@mietfuchs/domain'

import type { CostKey, DepositStatus } from '@mietfuchs/domain'

// ---------- Beschriftungen (nur Darstellung) ----------

export const DEPOSIT_STATUS_LABELS: Record<DepositStatus, string> = {
  offen: 'offen',
  erhalten: 'erhalten',
  teilweise: 'teilweise erhalten',
  'zurückgezahlt': 'zurückgezahlt',
}

// Bewusst andere Formulierung als KEY_LABELS in der Berechnungsengine: Dort beschriften
// sie eine fertige Abrechnungszeile („Wohnfläche"), hier die Auswahl bei der Eingabe.
export const KEY_LABELS: Record<CostKey, string> = {
  area: 'nach Wohnfläche',
  persons: 'nach Personenzahl',
  units: 'nach Wohneinheiten',
  direct: 'Direktzuordnung',
  meter: 'nach Verbrauch (Zähler)',
}

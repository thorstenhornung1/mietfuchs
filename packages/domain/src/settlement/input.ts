// Die Eingangsschnappschüsse der Berechnungen (Spec §35).
//
//   Persistenz → Repository Layer → Snapshot → bestehender Calc Core → Ergebnis
//
// Der Sinn dieser Typen ist die Grenze, nicht die Filterung: Die Engine bekommt genau die
// Daten, die sie liest, und weiß nicht mehr, woher sie kommen. Ob dahinter die db.json,
// SQLite oder PostgreSQL liegt, ist für die Rechnung ohne Bedeutung — und muss es sein
// (Invariante 103: kein Fachlogik-Unterschied zwischen Backends; Invariante 136: die
// fachliche Berechnung hängt nicht vom Backend ab).
//
// Deshalb ist ein Snapshot bewusst eine **einfache Datenstruktur**: keine Methoden, keine
// Lazy-Loader, keine Datenbankobjekte (Invariante 109: ORM entity ≠ domain entity). Er ist
// das, was ein Abrechnungslauf gesehen hat — und damit auch das, was sich später einfrieren
// und archivieren lässt.

import type { CostItem, Meter, Payment, Reading, Tenancy, Unit } from '../model.ts'

/**
 * Was die Betriebskostenabrechnung eines Jahres liest (§35).
 *
 * **Warum hier nicht alles nach Jahr gefiltert ist:**
 *
 * - `costItems` sind gefiltert — eine Kostenposition trägt ihr Jahr selbst, die Zuordnung
 *   ist eindeutig.
 * - `tenancies` sind **nicht** gefiltert: Ob ein Mietverhältnis das Jahr berührt, entscheidet
 *   die Überlappungsrechnung der Engine (§57), nicht das Repository.
 * - `readings` sind **nicht** gefiltert, und das ist wesentlich: Der Verbrauch wird zwischen
 *   zwei Ablesungen tagesanteilig interpoliert. Die Ablesung vom 31.12. des Vorjahres liegt
 *   außerhalb des Jahres, ist aber der Anfangsstand. Wer Ablesungen nach Jahr filtert,
 *   verliert den ersten Verbrauchszeitraum.
 */
export type SettlementInput = {
  year: number
  units: Unit[]
  tenancies: Tenancy[]
  costItems: CostItem[]
  meters: Meter[]
  readings: Reading[]
}

/**
 * Was Mietkonto und Steuerübersicht eines Jahres lesen.
 *
 * `payments` ist nicht nach Jahr gefiltert: Das Mietkonto grenzt selbst auf den
 * Jahreszeitraum ab, und der Steuerreport braucht dieselbe Abgrenzung — die Regel gehört
 * an eine Stelle, nämlich in die Engine.
 */
export type LedgerInput = {
  year: number
  units: Unit[]
  tenancies: Tenancy[]
  costItems: CostItem[]
  payments: Payment[]
}

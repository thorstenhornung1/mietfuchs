# Mietfuchs Next — Roadmap: Implementierungsentscheidungen (Phasen 0–8)

Stand: 14.10.2026 · Entscheidung des Projektinhabers · Ergänzung zum
[Kanon](mietfuchs-next-kanon.md)

Die Abschnitte 1–4 geben die Implementierungsentscheidungen inhaltlich unverändert wieder.
Abschnitt 5 ordnet die Phasen den Issues des Forks und den Schritten der bisherigen
Implementierungsreihenfolge (Priorisierung §104) zu; er ist eine Arbeitshilfe und keine
zusätzliche Entscheidung.

- **Status:** Ergänzung zum bestehenden Mietfuchs-Next-Kanon
- **Zielgruppe:** Private Vermieter mit 1–12 Einheiten
- **Ausgangslage:** Kontoauszugsimport ist der Ausgangspunkt der weiteren Entwicklung.

## 1. Produktziel

Mietfuchs soll vier Fragen beantworten:

- Sind meine Mieten eingegangen?
- Sind meine Kosten und Belege vollständig?
- Was muss ich als Nächstes tun, damit keine Frist oder wirtschaftliche Möglichkeit verloren
  geht?
- Sind meine Daten für die Anlage V vollständig und nachvollziehbar vorbereitet?

Die Software bleibt local-first und einfach bedienbar. Es wird keine vollständige
Steuerberatungs- oder Buchhaltungssoftware entwickelt.

## 2. Reihenfolge

### Phase 0 – Bankabgleich abschließen

CAMT-Import, Duplikaterkennung, Mietzahlungszuordnung, Teilzahlungen und offene Posten müssen
zuverlässig funktionieren. Banktransaktionen und Zahlungen bleiben getrennte Vorgänge.

### Phase 1 – Rechnungen und Ausgaben

VendorInvoice, InvoiceLine und ExpenseAllocation einführen. Bestehende Belegverwaltung und
KI-Auswertung wiederverwenden. Rechnungspositionen können unterschiedlichen Objekten,
Einheiten, Kostenarten, steuerlichen Behandlungen und technischen Anlagen zugeordnet werden.

**Abnahme:** Eine Zahlung mit Wartungs- und Reparaturanteil wird einmal erfasst und korrekt in
beide Verwendungszwecke aufgeteilt.

### Phase 2 – Betriebskosten

Mietvertragliche Umlagevereinbarungen mit der bestehenden Abrechnungslogik verbinden. Die
Abrechnung erhält nachvollziehbare Zustände für Prüfung, Versand, Einwendung und Korrektur.
Versendete Abrechnungen bleiben unverändert.

### Phase 3 – Vorjahres-Anlage-V-Import

Im Cockpit erscheint bei unvollständiger steuerlicher Ersteinrichtung die optionale Funktion
„Steuerdaten aus dem Vorjahr übernehmen“. Der Nutzer lädt seine bisherige Anlage V als PDF
hoch. Mietfuchs erkennt mögliche Angaben und legt sie zur Bestätigung vor. Zu unterscheiden
sind:

- Dauerhaft übernehmbare Stammdaten (Adresse, Wohnfläche, Erwerbsdaten).
- Historische Vergleichswerte (Mieten, Werbungskosten, Schuldzinsen).
- Fortzuführende Werte (bestätigte AfA-Pläne, offene Verteilungen, Eigentümeranteile).

Vorjahresbeträge werden niemals automatisch zu aktuellen Buchungen oder steuerlichen
Ereignissen. Fehlende AfA-Grundlagen und weitere notwendige Informationen werden gezielt
nachgefragt.

### Phase 4 – Operativer Alltag

Kleiner gemeinsamer Kern für Aufgaben, Fristen und Vorgänge. Darauf aufbauend Mieterhöhungen
als Workflow für Index-, Staffel- und Vergleichsmiete. Für die Vergleichsmiete wird der
amtliche Mietspiegel durch den Nutzer geprüft und das Ergebnis dokumentiert. Mietänderungen
werden erst nach Erfüllung der jeweiligen Voraussetzungen wirksam.

Diese Phase wird gegenüber dem umfassenden technischen Bestands- und Accounting-Ausbau bewusst
vorgezogen.

### Phase 5 – Tax Layer

TaxEvent als eigene steuerliche Zuordnungsschicht implementieren. Maßgeblich sind tatsächliche
Zuflüsse und Abflüsse, steuerliches Jahr, Zuordnungsregel, Eigentümer, Objekt und Nachweis.
Sonderregeln werden nachvollziehbar berücksichtigt oder zur Prüfung gestellt.

### Phase 6 – Steuerliche Anfangsbestände und Sonderfälle

AfA einschließlich Bestandsübernahme, Anschaffungskosten und Kaufpreisaufteilung,
Zinsen/Tilgung, Erhaltungsaufwand, §82b-Verteilungspläne, WEG-Rücklagen, Eigentümeranteile,
Selbstnutzung und gegebenenfalls verbilligte Vermietung erfassen. Spezialfunktionen werden nur
bei relevantem Sachverhalt aktiviert. Bereits bestätigte steuerliche Werte dürfen als
dokumentierte Anfangsbestände übernommen werden.

### Phase 7 – Anlage-V-Datenpaket

Für jedes Steuerjahr wird ein eigenes, versioniertes Mapping auf die jeweils geltenden
Anlage-V-Formularfelder angeboten. Die hochgeladene Anlage V 2025 ist Referenz für das
Formularjahr 2025, nicht automatisch für spätere Jahre.

Zu jedem vorgeschlagenen Formularwert gehören Betrag, Berechnungsweg, Ursprungsbeleg und
Status. Nicht vorhandene Daten sind von echten Nullwerten und nicht relevanten Feldern zu
unterscheiden.

**Ausgaben:** Anlage-V-Vorschau, Einnahmen- und Werbungskostenübersicht, AfA-Verzeichnis,
Darlehensnachweis, gegebenenfalls WEG- und Eigentümerübersicht, Belegindex und Liste offener
Prüfentscheidungen.

### Phase 8 – Jahrescheck

Mietfuchs prüft die Vollständigkeit der Bankdaten, Rechnungen, Mietzahlungen, Betriebskosten,
Darlehen, AfA und steuerlichen Zuordnungen. Der Vermieter erhält konkrete Aufgaben statt
unverständlicher Fehlermeldungen.

## 3. Übergreifende Anforderungen

Alle Importe sind idempotent. Originaldokumente und bestätigte Entscheidungen bleiben
nachvollziehbar und historisiert. Geldbeträge werden intern centgenau verarbeitet. Backup,
Migration, Regressionstests und Zugriffsschutz sind in jeder Phase zu berücksichtigen.

KI darf nur Vorschläge erzeugen. Weder steuerliche Zuordnungen noch rechtliche Wirksamkeit
werden bei Unsicherheit ungeprüft angenommen.

## 4. Release-Kriterien

Jede Phase muss einen vollständigen Vermieterprozess ermöglichen. Maßgebliche
End-to-End-Fälle sind Bankabgleich ohne Doppelbuchung, aufgeteilte Handwerkerrechnung,
korrigierte Betriebskostenabrechnung, idempotenter Vorjahresimport, fortgeführte AfA, korrekt
getrennte Darlehenszinsen und Tilgung sowie ein belegbares Anlage-V-Datenpaket.

**Abschlusskriterium:** Für jeden relevanten Wert der Anlage V ist erkennbar, woher er stammt,
wie er berechnet wurde und ob eine menschliche Bestätigung oder steuerliche Prüfung
erforderlich ist.

## 5. Zuordnung: Phasen ↔ Issues ↔ bisherige Reihenfolge

Issue-Nummern beziehen sich auf den Fork
[thorstenhornung1/mietfuchs](https://github.com/thorstenhornung1/mietfuchs/issues); der
Arbeitsplan steht in [#67](https://github.com/thorstenhornung1/mietfuchs/issues/67).
„§104“ meint die Schritte der Implementierungsreihenfolge im [Kanon](mietfuchs-next-kanon.md)
bzw. in der Priorisierungsspezifikation.

| Phase | Inhalt | Fork-Issues (Haupt-Issue fett, Unterpunkte) | Bisherige Schritte §104 |
|---|---|---|---|
| 0 | Bankabgleich abschließen | **#8** (#41, #42, #43), **#7** (#38, #39, #40); Vorbereitung Mahnung #279; Upstream-Beitrag speedone/mietfuchs#188 | 9 Charges/Payments, 10 CAMT |
| 1 | Rechnungen und Ausgaben | **#10** (#48, #49, #50, #107, #108, #109); Achsen Kostenart/Steuer #45 | 11 VendorInvoice/Expense |
| 2 | Betriebskosten | **#206** (#220, #221, #222, #223), **#207** (#224, #225, #226, #227) | 12 Betriebskosten-Domäne, 13 Settlement Lifecycle |
| 3 | Vorjahres-Anlage-V-Import | **#280**; Berührung mit #205/#218 (Onboarding, Steuer-Grundfragen) und #135 (Anfangsbestände) | neu (am ehesten 8 Onboarding) |
| 4 | Operativer Alltag, Mieterhöhung | **#115** (Kern: #140, #141, #143, #144; #142, #145, #146 ohne Festlegung), **#120**; RentAdjustment #36; Marktmiete-Datenpunkte #95 (Unterpunkt von #73) | 14 Operational Core (bisher nach 13); Mieterhöhung bisher ohne eigenen Schritt |
| 5 | Tax Layer | **#68** (#77, #78, #79, #80) | 21 Tax Core |
| 6 | Steuerliche Anfangsbestände und Sonderfälle | **#12** (#57, #58, #59), #270 (#271), **#69** (#81–#84), **#71** (#88–#90), #70 (#85–#87), #72 (#91–#94), #73 (#95–#97), #74 (#98–#100), #135, #106 | 20 Loan/Refinanzierung, 21 Tax Core (AfA), 22 konditionale Tax-Funktionen |
| 7 | Anlage-V-Datenpaket | **#76** (#103, #104, #105), versioniertes Formular-Mapping **#281** | Teil von 21/22 |
| 8 | Jahrescheck | **#209** (#232, #233, #234) | 23 Annual Completeness Check |

### Was die Phasen gegenüber §104 verschieben

- **Phase 4 vor Tax Layer.** Operativer Kern und Mieterhöhung kommen vor Phase 5 und vor dem
  umfassenden technischen Bestands- und Accounting-Ausbau (bisher Schritte 15–18 und M9/#13).
- **Phase 3 ist neu.** Der Vorjahresimport hat in §104 keinen Schritt.
- **Steuer vor Darlehen.** Darlehen (Zinsen/Tilgung) erscheinen erst in
  Phase 6, als Teil der steuerlichen Anfangsbestände.
- **Auth/OIDC (§104 Schritte 5–6, #5) steht nicht vor den Phasen.** Der Inhaber sichert den
  Zugang vorerst über einen Reverse Proxy; „Zugriffsschutz“ bleibt nach Abschnitt 3 in jeder
  Phase zu berücksichtigen.

### Nach Phase 8

Diese Bereiche folgen, wenn die Phasen 0–8 abgearbeitet sind (Entscheidung des Inhabers vom
14.10.2026); ihre Reihenfolge untereinander wird dann festgelegt:
technischer Bestand und Lebenszyklus (#11, #246–#252, §104 Schritte 15/17), ServiceContracts
(#128, Schritt 18), Mieterwechsel und Kaution (#116, #211, Schritt 19), doppisches Journal und
DATEV (#13, #14), PostgreSQL-Betrieb (#3), Backup/Restore über das Bestehende hinaus (#137,
Schritt 24). Die Foundation-Schritte 1–4 sind über die Persistenz von Upstream (SQLite/Drizzle,
speedone/mietfuchs#55) weitgehend abgedeckt.

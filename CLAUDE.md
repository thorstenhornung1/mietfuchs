# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Was das ist

**Mietfuchs** — lokales Web-Tool für die Nebenkostenabrechnung privater Vermieter (Deutschland).
Alles läuft auf dem eigenen Rechner — keine Cloud, kein Konto. Sprache von UI, Kommentaren und
Domänenbegriffen ist durchgängig **Deutsch**; bitte beibehalten.

Dieser Branch (`next`) entwickelt daraus **Mietfuchs Next** — das digitale Betriebssystem für
private Vermieter (1–12 Einheiten, local-first). Alles unterhalb von
[Verbindlicher Kanon](#verbindlicher-kanon--mietfuchs-next) ist für diese Arbeit bindend:
140 Invarianten, das Prioritätssystem und die PR-Checkliste. **Vor jeder Änderung dort
nachschlagen, nicht danach.** Grundlage sind die vier Spezifikationen in [docs/](docs/).

## Commands

Vom Repo-Root (npm-Workspaces: `apps/*` und `packages/*` werden in einem Durchgang installiert):

```powershell
npm install        # installiert alle Workspaces
npm run dev        # concurrently: Server (Port 3001) + Vite (Port 5173)
npm test           # Tests von Domain-Package und Server (node:test)
npm run typecheck  # tsc --noEmit über Domain, Server und Client
npm run build      # baut das Frontend nach apps/client/dist (tsc --noEmit + vite build)
npm start          # Produktivbetrieb: Server liefert App + API auf Port 3001
npm run package    # baut eigenständige Binaries nach dist-bin/ (braucht Bun)
```

Ein einzelnes Paket ansprechen: `npm run <skript> -w @mietfuchs/{domain,server,client}`.

**Eigenständige Binaries** (für Endanwender ohne Node): [scripts/package-binaries.mjs](scripts/package-binaries.mjs)
kompiliert Server + eingebettetes Frontend per **Bun `--compile`** zu je einer Datei pro
Plattform (Windows/macOS-Intel/macOS-ARM/Linux) in `dist-bin/`. `node scripts/package-binaries.mjs win`
baut nur ein Ziel. Bun wird gewählt, weil der Server ESM ist und `pdfjs-dist` top-level await
nutzt — beides kann pkg/SEA nicht bündeln. Das Frontend wird beim Build über
[scripts/embed-client.mjs](scripts/embed-client.mjs) aus `apps/client/dist` in das generierte
(gitignorierte) Modul `apps/server/src/embedded-client.js` eingebettet (Bun-Importattribut
`with { type: 'file' }`) und im gepackten Betrieb daraus ausgeliefert. In der Binary erkennt der
Server den gepackten Modus an `globalThis.Bun`: Daten landen dann in `data/` **neben der
ausführbaren Datei** (nicht in `apps/server/data`), und der Standard-Browser wird automatisch geöffnet.
Release-Automatik: [.github/workflows/release.yml](.github/workflows/release.yml) baut bei einem
`v*`-Tag alle Ziele auf einem Linux-Runner und hängt sie ans GitHub-Release.

Einzelnen Test ausführen (node:test, kein Framework):

```powershell
npm run test -w @mietfuchs/server -- --test-name-pattern "Flächenschlüssel"
```

Es gibt **keinen Linter** und keine Client-Tests. Typecheck läuft über `npm run typecheck`
(`tsc --noEmit` für alle drei Pakete); `npm run build` typecheckt den Client zusätzlich.

**Testlandschaft** unter `packages/domain/test/` und `apps/server/test/`:

- [packages/domain/test/](packages/domain/test/) — `money.ts` und `dates.ts`: Integer-Cent
  (Invariante 17), Kalendertag ≠ Zeitstempel (Invariante 102), inklusive Zeitraumgrenzen (§57),
  Kategorie-Zuordnung (Invariante 20).
- [calc.test.js](apps/server/test/calc.test.js) — Unit-Tests einzelner Engine-Funktionen.
- [settlement-golden.test.js](apps/server/test/settlement-golden.test.js) — **Golden Master**:
  vergleicht das vollständige Abrechnungsergebnis cent-genau gegen eingefrorene Erwartungen
  aus `fixtures/settlement/F01…F10/`. Jedes Fixture besteht aus `db.json` (Eingabe),
  `expected.json` (Erwartung) und `README.md` (Handrechnung mit Spec-Referenz).
- [invariants.test.js](apps/server/test/invariants.test.js) — Eigenschaften, die für *jede*
  Eingabe gelten: Integer-Cent, Verteilungsvollständigkeit, Determinismus,
  Reihenfolgeunabhängigkeit, Zeitraumvollständigkeit, keine stillen Fallbacks,
  deterministischer Tie-Break.
- `apps/server/testing/` — Helfer (Fixture-Laden, Normalisierung). Bewusst **außerhalb** von
  `test/`, weil node:test dort jede `.js`-Datei als Testdatei einsammelt.

Schlägt ein Golden-Master-Test fehl, ist das **kein Testproblem**: Entweder ist die Rechnung
falsch geworden, oder die Erwartung war es. Zum Untersuchen
`GOLDEN=diff npm run test -w @mietfuchs/server` — das legt das Ist-Ergebnis als `expected.actual.json`
neben die Golden-Datei, überschreibt sie aber nie. Bekannte Abweichungen und offene fachliche
Punkte stehen in [docs/settlement-baseline-befunde.md](docs/settlement-baseline-befunde.md).

## Architektur

Monorepo aus drei npm-Workspaces (Spec §38):

```text
packages/domain/   gemeinsame fachliche Regeln (TypeScript): money.ts, dates.ts
apps/server/       Express, ESM, TypeScript
apps/client/       React 19 + Vite + TypeScript
```

Das Domain-Package wird **als TypeScript-Quelle** ausgeliefert, ohne Build-Schritt: Node führt
`.ts` über Type Stripping direkt aus (daher `engines.node >= 22.18`), Bun kompiliert sie in die
Binary, Vite bündelt sie. `tsc` ist reiner Typechecker (`--noEmit`), und
`erasableSyntaxOnly` verbietet Syntax, die Node nicht wegstreichen kann — also keine `enum`,
keine Namespaces, keine Parameter-Properties.

Im Dev proxyt Vite `/api` und `/uploads` an `localhost:3001`
([apps/client/vite.config.ts](apps/client/vite.config.ts)); im Produktivbuild liefert der Express-Server
das statische `apps/client/dist` selbst aus ([apps/server/src/index.ts](apps/server/src/index.ts)).

**Persistenz**: eine einzige JSON-Datei `apps/server/data/db.json`, atomar geschrieben (Temp +
rename) über [apps/server/src/store.ts](apps/server/src/store.ts). Belege liegen in `apps/server/data/uploads/`.
Backup = diesen Ordner kopieren. Keine Datenbank, keine Migrationen-Tooling — Schema-Migrationen
älterer `db.json` passieren imperativ in `load()` in store.ts (z. B. fester Monatsbetrag →
Vorauszahlungs-Staffel). Beim Erweitern des Datenmodells dort die Migration ergänzen.

**API** ([apps/server/src/index.ts](apps/server/src/index.ts)): generische CRUD-Routen werden in einer
Schleife für die Collections `units, tenancies, costItems, meters, readings, payments` erzeugt.
Löschen einer `unit` bzw. `meter` kaskadiert manuell auf abhängige Datensätze (auch `payments`
beim Löschen einer `unit`/`tenancy`). Daneben Spezialrouten:
`/api/settings`, `/api/settlement/:year`, `/api/consumption/:year`, `/api/rentledger/:year`
(Mietkonto: Soll/Ist je Monat), `/api/taxreport/:year` (Steuer-Übersicht Anlage V),
`/api/upload`, `/api/extract`, `/api/ollama/status`, `/api/uploads` (Belegarchiv: Liste +
Löschen unverknüpfter Dateien), `/api/backup`/`/api/restore` (ZIP via adm-zip) sowie
`/api/settlement/:year/close` (POST/PUT/DELETE): friert die Abrechnung als Snapshot in der
Collection `closedSettlements` ein (inkl. `sentAt` für die §556-Frist) — `GET
/api/settlement/:year` liefert dann den Snapshot statt der Live-Berechnung.

**Berechnungs-Engine** ([apps/server/src/calc.ts](apps/server/src/calc.ts)) — das Herzstück, hier liegt
die ganze fachliche Komplexität:
- **Alle Beträge in Cent (Integer)**, niemals Euro-Floats — Gleitkomma-Fehler vermeiden.
- Centgenaue Verteilung per **Hare/largest-remainder** (`largestRemainder`). Schöpfen die
  Rohanteile die Summe nahezu voll aus, wird centgenau auf Mieter verteilt; sonst trägt der
  **Vermieter** die Differenz (Leerstand, Eigenanteil, Rundungsrest, „Nicht umlagefähig").
- **Umlageschlüssel** (`item.key`): `area` (Wohnfläche), `persons` (personentagesgenau),
  `units` (Wohneinheiten), `meter` (Verbrauch nach Zählertyp), `direct` (Direktzuordnung).
- **Staffeln statt Neuanlage**: Personenzahl (`personHistory`) und Vorauszahlung
  (`prepayments`, `from: YYYY-MM`) werden als „ab Datum gilt Wert" geführt. Tatsächlich
  gezahlte Vorauszahlungen pro Jahr können via `prepaymentOverrides` überschrieben werden
  (haben Vorrang — rechtlich zählt das tatsächlich Gezahlte).
- **Zeiträume** sind ISO-Strings mit inklusiven Grenzen, in UTC gerechnet; Tagesanteile zählen
  für Teiljahre. `end: null` = offenes Mietverhältnis.
- **Zähler**: Ablesungen → Verbrauchssegmente (`meterSegments`), tagesanteilig interpoliert
  (`consumptionInPeriod`). Zählerwechsel über `replacement: true` + `oldEndValue`. Negativer
  Verbrauch erzeugt eine Warnung.
- Nur Wohnungen mit `participates: true` nehmen an der Verteilung teil (die selbstbewohnte
  Wohnung ist `false`).
- **Mietkonto** (`rentLedger`): Kaltmiete-Staffel (`baseRents`) + Vorauszahlung ergeben das
  monatliche Soll (Bruttomiete); Zahlungseingänge (`payments`) werden Jan→Dez FIFO auf die
  Monate verteilt (Status bezahlt/teilweise/offen).
- **Steuer/Anlage V** (`taxReport`): aggregiert Einnahmen (aus `rentLedger`, Soll + Ist) und
  Werbungskosten (Kostenpositionen nach `ANLAGE_V_GROUP`-Mapping), liefert §35a-Summe,
  vermieteten Flächenanteil und Überschuss. Bewusst beschreibende Gruppen statt fester
  Anlage-V-Zeilennummern; keine automatische Eigennutzungs-Aufteilung (nur Hinweis).

Das **Datenmodell** steht in [packages/domain/src/model.ts](packages/domain/src/model.ts)
(Unit, Tenancy, Meter, Reading, CostItem, Settings, Db, Settlement …) und wird von Server und
Client konsumiert; [apps/client/src/types.ts](apps/client/src/types.ts) reicht es nur weiter
und ergänzt reine Anzeige-Beschriftungen. Die `KEY_LABELS` existieren bewusst doppelt
(calc.ts liefert UI-Strings im Settlement, types.ts hat eigene Labels für die
Eingabe-Oberfläche).

**KI-Belegauswertung** ([apps/server/src/extract.ts](apps/server/src/extract.ts)): optional, gegen eine
lokale **Ollama**-Instanz (URL/Modell aus den Settings). PDF → Textebene via `pdf-parse`;
Scans ohne (brauchbare) Textebene werden per `pdf-to-img` seitenweise als PNG gerendert und
ans Vision-Modell gegeben. Bilder → Base64 (braucht Vision-Modell). Erzwingt
strukturiertes JSON über `format: SCHEMA`. Die KI macht nur Vorschläge — Übernahme erst nach
manueller Prüfung. Die Kategorienliste kommt aus
[packages/domain/src/classifications.ts](packages/domain/src/classifications.ts) und steht
damit nur noch an einer Stelle (früher doppelt in extract.js und types.ts).

**Client** ([apps/client/src/](apps/client/src/)): React ohne Router — `App.tsx` schaltet per State
zwischen den Seiten (`pages/`: Cockpit, Schnellerfassung, Zaehler, Kosten, Mietkonto,
Abrechnung, Uebersicht/Kostenvergleich, Steuer, Stammdaten, Belege, Einstellungen), gruppiert
nach Arbeitsphase in der Sidebar (das Abrechnungsjahr liegt zentral im `YearProvider`,
[apps/client/src/year.tsx](apps/client/src/year.tsx)). Dark Mode über `data-theme` auf `<html>` + CSS-Variablen (Umschalter in der
Sidebar, Druck ist immer hell); PWA-Manifest und Icons liegen in `apps/client/public/` (Icons
erzeugt `apps/server/scripts/make-icons.mjs`).
Zentraler Fetch-Wrapper `api()` und Geld-/Datums-Helfer (`parseEuro`, `fmtEuro`, `fmtDate`) in
[apps/client/src/api.ts](apps/client/src/api.ts). Druck/PDF läuft über die Browser-Druckfunktion;
hochgeladene Belege werden für den Druck per **pdf.js** auf Canvas gerendert
([apps/client/src/pdfPreview.ts](apps/client/src/pdfPreview.ts)) — die zugehörigen pdf.js-WASM/Font-
Assets werden im Build via `vite-plugin-static-copy` nach `dist/pdfjs/` kopiert.

## Konventionen & Fallstricke

- **Geld immer in Cent als Integer.** Eingabe-Parsing (deutsche + technische Schreibweise) über
  `parseEuro`; Ausgabe über `fmtEuro`.
- **Datums-Logik** rechnet in UTC mit inklusiven Grenzen — beim Anfassen von calc.js die
  bestehende Konvention beibehalten und gegen [apps/server/test/calc.test.js](apps/server/test/calc.test.js)
  prüfen.
- Der Server nutzt bewusst **`NKA_PORT`** statt `PORT` (generische `PORT`-Variablen von
  Preview-Tools kollidieren sonst mit Vite).
- Fachliche Rahmenbedingungen des Nutzers: 3 Wohnungen, eine selbstbewohnt (nicht beteiligt),
  nur kalte Betriebskosten, Mieter zahlen Energie direkt.

---

# Verbindlicher Kanon — Mietfuchs Next

Dieser Abschnitt ist der Rahmen für die Weiterentwicklung auf Branch `next`. Er wird nicht
„interpretiert“, sondern zitiert: Jede Architektur- oder Modellentscheidung nennt die
Invariante bzw. den Spec-Paragraphen, auf den sie sich stützt. Wer eine Invariante brechen
will, ändert zuerst die Spezifikation — nicht den Code.

## Die vier Spezifikationen

| Dokument | Umfang | Rolle |
|---|---|---|
| [mietfuchs-next-spezifikation.md](docs/mietfuchs-next-spezifikation.md) | §1–§271 | Technische Referenz: Datenmodell, Accounting, Steuer, Betrieb, Persistenz |
| [mietfuchs-next-produktspezifikation.md](docs/mietfuchs-next-produktspezifikation.md) | §0–§60 | Produkt & Prozess: Vision, Betriebsmodelle, Nutzerprozesse |
| [mietfuchs-next-technischer-bestand.md](docs/mietfuchs-next-technischer-bestand.md) | §0–§92 | Technischer Bestand, Gebäudezustand, Lebenszyklus |
| [mietfuchs-next-priorisierung.md](docs/mietfuchs-next-priorisierung.md) | §0–§127 | Priorisierung, Implementierungsreihenfolge, Scope-Abschluss |

Bei Widerspruch gilt die jüngere Festlegung: §271 revidiert §39/§71 (SQLite als Local-Mode-Default),
die Priorisierungsspec revidiert die Produktspec bei OIDC (Auth ist Foundation, auch lokal).

## Invarianten 1–140

Verbindlich. Die Nummerierung ist dokumentübergreifend eindeutig und wird nie neu vergeben.

### 1–21 · Fachliche Grundabgrenzungen (Spec §3, §82.2)

```text
 1. DATEV account ≠ Betriebskosten-Umlagefähigkeit
 2. DATEV account ≠ steuerliche Aktivierung
 3. TechnicalAsset ≠ DepreciableAsset
 4. Invoice ≠ Expense
 5. BankTransaction ≠ Payment
 6. Payment ≠ Revenue
 7. Loan principal payment ≠ Expense
 8. Deposit ≠ Revenue
 9. Property ≠ Owner / Legal Entity
10. Person ≠ Tenant
11. Lease ≠ Person
12. Posted JournalEntry ≠ editable record
13. Closed SettlementSnapshot ≠ editable calculation
14. FinancialCategory ≠ TechnicalCategory
15. FinancialCategory ≠ OperatingCostCategory
16. TaxTreatment is explicit and never inferred solely from SKR account
17. All money values use integer cents
18. A posted journal entry is always balanced
19. A bank transaction is imported idempotently
20. No silent fallback to "Sonstige" on unknown financial classification
21. JournalEntry ≠ TaxEvent — Anlage V / Steuerreport entstehen ausschließlich aus
    TaxEvents, niemals unmittelbar aus dem Journal (§82.2)
```

### 22–40 · reserviert

Reserviert für das ausführliche Steuer-Addendum. Nicht neu vergeben.

### 41–60 · Accounting (Spec §144)

```text
41. JournalLine carries accounting dimensions.
42. Account answers "what"; dimensions answer "where / whom / what asset".
43. Property must not be encoded by creating separate accounts per property.
44. Unit must not be encoded by creating separate accounts per unit.
45. TechnicalAsset must not be encoded by creating separate accounts per asset.
46. Party is an accounting dimension, not an account.
47. Loan is an accounting dimension, not the canonical accounting identity of the liability.
48. TaxEvent never creates an AccountingEvent by itself.
49. TaxDetermination never creates an AccountingEvent by itself.
50. TaxPartyAllocation never creates an AccountingEvent by itself.
51. TaxAssessmentAdjustment never creates an AccountingEvent by itself.
52. TaxBasisDecision never creates an AccountingEvent by itself.
53. A tax assessment must never mutate a posted JournalEntry.
54. A closed AccountingPeriod rejects normal backdated postings.
55. Corrections to closed periods use a controlled adjustment or reversal process.
56. Journal dimensions are immutable after posting.
57. Dimension totals must reconcile with the amount of the corresponding JournalEntry.
58. Every financial Source Document may create at most one canonical AccountingEvent
    per posting action.
59. Accounting posting must be idempotent.
60. A source document must not silently create duplicate journal effects.
```

### 61–85 · Operativer Betrieb (Spec §190)

```text
61. OperationalCase ≠ Fachobjekt
62. Task ≠ Deadline
63. Reminder ≠ rechtliche Frist
64. Document ≠ Correspondence
65. Correspondence ≠ Delivery
66. DeliveryStatus ≠ rechtssicherer Zugangsnachweis
67. MoveOut ≠ Löschen oder Überschreiben eines Lease
68. Inspection ≠ Ticket
69. DamageClaim ≠ Ticket
70. DamageClaim ≠ WorkOrder
71. ServiceContract ≠ VendorInvoice
72. VendorQuote ≠ WorkOrder
73. WorkOrder ≠ VendorInvoice
74. KeySet ≠ Freitext im Übergabeprotokoll
75. DunningAction verändert niemals rückwirkend eine Charge
76. Mahnkosten sind eigene Forderungen, keine Mutation der Ursprungsforderung
77. RentAdjustment: Berechnung, Mitteilung und Wirksamkeit sind getrennte Zustände
78. PortalSubmission verändert niemals ungeprüft einen gebuchten Fachdatensatz
79. GeneratedDocument ist nach Versand unveränderlich
80. BulkCommunication speichert den tatsächlichen Empfängerkreis als Snapshot
81. automatische Fristen tragen RuleVersion und Berechnungsgrundlage
82. rechtliche Fristen werden nie ohne nachvollziehbare Regelbasis still erzeugt
83. Portal-Sichtbarkeit eines Dokuments ist immer explizit
84. externer Import ist idempotent oder verlangt explizite Bestätigung eines Duplikats
85. Inbox-Einträge werden aus offenen Fachzuständen/Vorgängen abgeleitet;
    sie bilden keine separate fachliche Wahrheit
```

### 86–100 · Produkt (Produktspec §4)

```text
 86. Fachliche Komplexität darf nicht automatisch UI-Komplexität erzeugen.
 87. Der Standardnutzer arbeitet mit Geschäftsvorgängen, nicht mit Datenbankentitäten.
 88. Jede häufige Vermieteraufgabe muss von einem fachlichen Einstiegspunkt erreichbar sein.
 89. Eine Funktion, die für den Bestand nicht relevant ist, soll standardmäßig nicht
     prominent erscheinen.
 90. Ein normaler Vermietungsprozess darf nicht zwingend ein externes SaaS voraussetzen.
 91. Local Mode benötigt keinen externen Identity Provider.
 92. Externer Zugriff ist kein Release-Kriterium für den Vermieter-Core.
 93. Ein Mieterportal ist keine Voraussetzung für vollständige Vermieterverwaltung.
 94. Eine versandte Betriebskostenabrechnung wird niemals überschrieben.
 95. Ein Einwand gegen eine Abrechnung referenziert immer die konkrete versandte Version.
 96. Umlagefähigkeit einer Betriebskostenart und mietvertragliche Umlagevereinbarung
     sind getrennte Sachverhalte.
 97. Dokumenteingang erzeugt niemals ungeprüft einen gebuchten Fachvorgang.
 98. Jeder zentrale Jahresprozess besitzt einen Vollständigkeitsstatus.
 99. Ein Prozess gilt erst als abgeschlossen, wenn seine fachlichen Abschlussbedingungen
     erfüllt sind.
100. Mietfuchs darf keinen Workflow nur deshalb komplizierter machen, weil das
     zugrunde liegende Datenmodell komplex ist.
```

### 101–110 · Persistenz & Backends (Spec §271.27)

```text
101. Je Installation existiert genau eine persistente fachliche Source of Truth.
102. Civil/legal date ≠ timestamp.
103. SQLite und PostgreSQL dürfen keine unterschiedliche Fachlogik besitzen.
104. JSON ist Austausch-/Legacyformat, nicht dauerhaftes produktives Backend.
105. Ein unterstütztes Backend benötigt dieselben fachlichen Regressionstests.
106. PostgreSQL-spezifische Funktionen dürfen Sicherheit und Performance erhöhen,
     aber keine unsichtbar andere Geschäftslogik erzeugen.
107. Externe Systeme besitzen niemals die einzige Kopie eines Mietfuchs-Fachzustands.
108. Eine neue Datenbank wird nur unterstützt, wenn der langfristige Nutzen
     die dauerhaften Migrations- und Testkosten rechtfertigt.
109. ORM entity ≠ domain entity.
110. Repository abstraction ≠ lowest-common-denominator database design.
```

Dazu §271.26: **Keine backend-spezifischen Golden Results.** Derselbe Testdatensatz liefert auf
SQLite und PostgreSQL dasselbe fachliche Ergebnis. Reihenfolgen ohne fachliche Bedeutung dürfen
nicht als implizite DB-Reihenfolge vorausgesetzt werden — jede relevante Sortierung ist explizit.

### 111–140 · Technischer Bestand (Technik-Spec §3)

```text
111. Ein TechnicalAsset kann Bauteil, technisches System, Gerät oder Element der
     Außenanlage repräsentieren.
112. TechnicalAsset ≠ DepreciableAsset.
113. Alter eines TechnicalAsset bestimmt niemals automatisch dessen Zustand.
114. Systemseitige Lebensdauerannahmen sind Schätzwerte und niemals als bekannte
     Tatsachen darzustellen.
115. UNKNOWN ist für technische Daten ein zulässiger und vollwertiger Zustand.
116. Eine Meldung oder ein Ticket ist nicht automatisch ein bestätigter Defect.
117. Ein Defect bleibt historisch erhalten und wird nicht durch einen WorkOrder ersetzt.
118. Ein WorkOrder beschreibt eine Beauftragung; die technische Erledigung muss
     separat bestätigt werden.
119. Ein geschlossener WorkOrder schließt einen Defect nicht automatisch, wenn dessen
     technische Beseitigung nicht bestätigt ist.
120. Wartung, Inspektion, gesetzliche Prüfung, Reparatur und Erneuerung sind getrennte
     Sachverhalte.
121. Wiederkehrende Wartungs- oder Prüfpflichten erzeugen einzelne, historisch
     nachvollziehbare Fälligkeiten.
122. Eine erledigte Fälligkeit wird niemals auf den nächsten Termin überschrieben.
123. LifecyclePlanItem ≠ CapitalProject.
124. Ein LifecyclePlanItem kann zu einem CapitalProject führen, bleibt aber als Ursprung
     und Planungshistorie erhalten.
125. Ein CapitalProject erzeugt niemals allein Accounting- oder TaxEvents.
126. Technischer Erhaltungsbedarf ist eine Planungsaussage und keine buchhalterische
     Rückstellung.
127. Technischer Erhaltungsbedarf ist keine WEG-Erhaltungsrücklage.
128. Instandhaltungsrückstau wird aus vorhandenen Fachobjekten abgeleitet und nicht als
     zweite fachliche Wahrheit separat gepflegt.
129. Jede technische Zustandsbewertung ist zeitbezogen und historisiert.
130. Eine neue Zustandsbewertung überschreibt frühere Bewertungen niemals.
131. Fotos und Dokumente werden über das zentrale Document-Modell referenziert; es
     entsteht keine zweite Dokumentenablage.
132. Ein Dokumenteingang erzeugt niemals ungeprüft einen technischen Fachvorgang.
133. Reparaturkosten, Wartungskosten und Erneuerungskosten müssen getrennt auswertbar sein.
134. Schätzwerte, beauftragte Kosten und tatsächliche Kosten bleiben getrennt.
135. Technische Prognosen müssen ihre Datengrundlage und Unsicherheit transparent machen.
136. Die fachliche Berechnung darf nicht vom verwendeten Datenbank-Backend abhängen.
137. Ein TechnicalAsset muss nicht bis auf Geräte- oder Einzelteilniveau detailliert werden.
138. Fehlende Detailtiefe darf einen normalen Vermietungsprozess niemals blockieren.
139. Der Standardnutzer arbeitet mit „Bauteil“, „Anlage“, „Schaden“, „Wartung“ und
     „Maßnahme“, nicht mit internen Entity-Namen.
140. Die technische Domäne darf Mietfuchs nicht zu einem CMMS oder
     Facility-Management-System erweitern.
```

### Identitätsinvarianten (Priorisierung §10)

```text
Identität ≠ E-Mail-Adresse
Authentifizierung ≠ Autorisierung
Workspace ≠ Eigentümer
OIDC Provider ≠ fachliche Benutzerrolle
TENANT-Rolle ≠ automatisch Mieterzugriff
Login ≠ Zugriff auf alle Workspace-Daten
Local Mode ≠ Authentifizierung ausgeschaltet
```

OIDC-Identitäten werden stabil über `issuer + subject` gebunden. Eine E-Mail-Adresse ist
niemals dauerhafter Identity Primary Key.

## Prioritätssystem (Priorisierung §5)

| Stufe | Bedeutung |
|---|---|
| **F0** | Technische Foundation. Wenig sichtbarer Nutzwert, aber Voraussetzung für sicheren Betrieb: Repository-Abstraktion, Migrationen, **Settlement-Regression**, Integer-Cent-Invarianten, SQLite/PostgreSQL-Portabilität, Auth-Foundation, Workspace-Isolation, Backup/Restore, fachliche Constraints. **Release-Blocker.** |
| **P0** | Universeller Produktkern — ohne diese Funktionen kann ein typischer privater Vermieter seinen Bestand nicht sinnvoll vollständig führen. **Release-Blocker für 1.0.** |
| **C0** | Konditionaler Kern: muss fachlich zwingend korrekt sein, *wenn* der Sachverhalt vorkommt (WEG, mehrere Eigentümer, gesonderte Feststellung, §7b, 15-%-Monitor, verbilligte Vermietung, CO₂, zentrale Heizkosten). Konditional korrekt, aber nicht universell sichtbar. |
| **P1** | Hoher Zusatznutzen; Fehlen verhindert den Normalbetrieb nicht. |
| **P2** | Komfort, seltene Integration, Spezialfall, Automatisierung, erweiterte Analytik. |
| **Step 20+** | Bewusst später: Mieterportal, externe Mieteraccounts, PortalSubmission, Portal Messaging, umfangreiche externe Integrationen. |

**Prioritätsregel (§108).** Ein neues Feature wird nur P0, wenn mindestens eine Frage mit Ja
beantwortet wird: Ist ohne die Funktion ein normaler Vermietungsprozess nicht abschließbar?
Droht regelmäßig erheblicher Geldverlust? Drohen relevante Fristversäumnisse? Ist sie
Voraussetzung für fachliche Korrektheit eines Kernprozesses, für Datenintegrität, für
Sicherheit oder für Wiederherstellbarkeit? — P1 (§109) gilt, wenn erheblich Arbeit gespart
wird, ein selteneres Lebenszyklus-Ereignis abgedeckt oder ein P0-Prozess deutlich
komfortabler wird. P2 (§110), wenn hauptsächlich Komfort entsteht oder dieselbe Aufgabe
außerhalb von Mietfuchs mit vertretbarem Aufwand erledigt werden kann.

## PR-Checkliste (Spec §73)

Vor jedem Merge:

```text
server typecheck
client typecheck
unit tests
repository tests
migration tests
accounting invariants
settlement regressions
permission tests
build
```

Solange eine Ebene noch nicht existiert (z. B. repository tests vor dem Repository-Layer),
entfällt sie ausdrücklich — sie wird nicht stillschweigend übersprungen, sondern im PR benannt.

> **Kein PR verändert bestehende Settlement-Fixtures ohne dokumentierte fachliche Begründung.**
> Eine geänderte Erwartung ist eine fachliche Entscheidung, kein Testfix. Sie gehört mit
> Herleitung in die `README.md` des Fixtures und in `docs/settlement-baseline-befunde.md`.

## Lizenz- und Dependency-Prinzipien (Spec §271.22–§271.24)

- Bevorzugte Lizenzen: **MIT, Apache-2.0, BSD-2/3-Clause, ISC, PostgreSQL License.**
- Je Dependency geprüft: Lizenz, Copyright, Weitergabepflichten, Copyleft, Wartung, Sicherheitslage.
- **Kein Copy/Paste aus fremden Repos** nur wegen öffentlicher Sichtbarkeit. Ideen und
  dokumentierte Architekturprinzipien dürfen analysiert werden, Quellcode nur bei eindeutig
  kompatibler Lizenz.
- GPL-/AGPL-Systeme (z. B. Paperless-ngx) werden **nur als externe Adapter** über dokumentierte
  APIs angebunden — separate Installation, kein Vendoring.
- Kein externes System (Paperless, Node-RED, n8n, Ollama, Authentik, Valkey, RabbitMQ, Kafka,
  Taiga) ist jemals Voraussetzung für die fachliche Korrektheit des Kerns. Minimalinstallation:
  Local = Mietfuchs + SQLite, Server = Mietfuchs + PostgreSQL.

## Scope — Schlussentscheidung (Priorisierung §125–§127)

Die große fachliche Gap-Analyse ist **abgeschlossen**. Für 1.0 werden keine neuen großen
Domänen mehr aufgenommen. Eine neue Anforderung wird zuerst gegen die vorhandenen generischen
Fachobjekte geprüft:

```text
Document · Task · Deadline · OperationalCase · Party · ServiceContract
TechnicalAsset · ConditionAssessment · Defect · MaintenancePlan
LifecyclePlanItem · CapitalProject · Charge · Payment · ExpenseRecord · TaxEvent · Loan
```

Ein neues Fachobjekt entsteht nur, wenn der Sachverhalt damit nicht sauber abbildbar ist.

Die Leitfrage lautet nicht mehr *„Was fehlt Mietfuchs noch?“*, sondern:

> **Wie bringen wir die vorhandene Domäne in möglichst wenigen vollständigen Nutzerprozessen
> zuverlässig zum Laufen?**

Neue Features werden primär durch reale End-to-End-Szenarien legitimiert.

## Implementierungsreihenfolge (Priorisierung §104)

Die Reihenfolge folgt Abhängigkeiten, nicht Sichtbarkeit:

```text
 1. Architektur-Foundation          10. CAMT                      19. Mieterwechsel / Kaution
 2. Settlement-Regression           11. VendorInvoice / Expense   20. Loan / Refinanzierung
 3. SQLite/PostgreSQL Repository    12. Betriebskosten-Domäne     21. Tax Core
 4. db.json-Migration               13. Settlement Lifecycle      22. konditionale Tax-Funktionen
 5. Workspace / User / Membership   14. Operational Core          23. Annual Completeness Check
 6. OIDC / Sessions / Permissions   15. technischer P0-Core       24. Backup / Restore / Health
 7. Property / Party / Lease        16. einfaches Objekt-Cockpit  25. P1-Erweiterungen
 8. Onboarding                      17. Lifecycle Lite / 10 Jahre
 9. Charges / Payments              18. ServiceContracts / Fristen
```

Arbeitsplan mit Meilensteinen und Issues: [#67](https://github.com/thorstenhornung1/mietfuchs/issues/67).

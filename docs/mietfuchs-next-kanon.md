# Mietfuchs Next — Verbindlicher Kanon

Mietfuchs Next ist der Fork `thorstenhornung1/mietfuchs` (Branch `next`) von
[speedone/mietfuchs](https://github.com/speedone/mietfuchs): das digitale Betriebssystem für
private Vermieter (1–12 Einheiten, local-first). Der Fork baut auf dem Upstream-Code auf und
gleicht regelmäßig mit `upstream/main` ab. Was nur der Fork braucht, steht in eigenen Dateien —
dieses Dokument, die vier Spezifikationen und die Fork-Tests —, damit der Abgleich billig bleibt.

Grundlage sind die vier Spezifikationen in diesem Ordner. **Vor jeder Änderung hier
nachschlagen, nicht danach.**

Dieses Dokument ist der Rahmen für die Weiterentwicklung auf Branch `next`. Er wird nicht
„interpretiert“, sondern zitiert: Jede Architektur- oder Modellentscheidung nennt die
Invariante bzw. den Spec-Paragraphen, auf den sie sich stützt. Wer eine Invariante brechen
will, ändert zuerst die Spezifikation — nicht den Code.

## Die vier Spezifikationen

| Dokument | Umfang | Rolle |
|---|---|---|
| [mietfuchs-next-spezifikation.md](mietfuchs-next-spezifikation.md) | §1–§273 | Technische Referenz: Datenmodell, Accounting, Steuer, Betrieb, Persistenz |
| [mietfuchs-next-produktspezifikation.md](mietfuchs-next-produktspezifikation.md) | §0–§60 | Produkt & Prozess: Vision, Betriebsmodelle, Nutzerprozesse |
| [mietfuchs-next-technischer-bestand.md](mietfuchs-next-technischer-bestand.md) | §0–§92 | Technischer Bestand, Gebäudezustand, Lebenszyklus |
| [mietfuchs-next-priorisierung.md](mietfuchs-next-priorisierung.md) | §0–§127 | Priorisierung, Implementierungsreihenfolge, Scope-Abschluss |

Bei Widerspruch gilt die jüngere Festlegung: §271 revidiert §39/§71 (SQLite als Local-Mode-Default),
§273 revidiert §271 (Persistenz über die Upstream-Implementierung mit drizzle-orm),
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

Im Upstream-Layout entspricht das:

| Ebene | Befehl / Tests |
|---|---|
| server + client typecheck | `npm run typecheck` |
| unit tests | `npm test` (Server: node:test, Client: vitest) |
| repository tests | `server/test/db-repository.test.ts`, `db-stock.test.ts` |
| migration tests | `server/test/migrations.test.ts`, `db-changeover.test.ts` |
| accounting invariants | entfällt, bis das Journal existiert (Spec §142 ff.) |
| settlement regressions | `server/test/settlement-golden.test.ts`, `db-golden.test.ts`, `invariants.test.ts` |
| permission tests | entfällt, bis Auth existiert (Priorisierung §7–§15) |
| build | `npm run build` |

> **Kein PR verändert bestehende Settlement-Fixtures ohne dokumentierte fachliche Begründung.**
> Eine geänderte Erwartung ist eine fachliche Entscheidung, kein Testfix. Sie gehört mit
> Herleitung in die `README.md` des Fixtures und in [settlement-baseline-befunde.md](settlement-baseline-befunde.md).

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

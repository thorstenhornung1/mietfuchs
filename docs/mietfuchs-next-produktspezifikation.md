# Mietfuchs Next – Produkt- und Prozessspezifikation

**Stand:** 30.08.2026
**Produktvision:** Digitales Betriebssystem für private Vermieter
**Primäre Zielgruppe:** Private Vermieter in Deutschland mit typischerweise 1–12 vermieteten Einheiten bzw. wenigen Immobilien
**Betriebsmodell:** Local-first / Self-hosted / Homelab-fähig
**Architektur:** Modularer Monolith, PostgreSQL, Web-/PWA-Oberfläche
**Nicht primäres Ziel:** professionelle Hausverwaltung, WEG-Verwaltersoftware, ERP, Maklersoftware oder SaaS-Mieterplattform

> Dieses Dokument ergänzt die [technische Spezifikation](mietfuchs-next-spezifikation.md) (§§1–270) um die Produkt- und Prozessperspektive. Es hat eine eigene Kapitelnummerierung (0–60).

---

## 0. Leitentscheidung

Mietfuchs wird nicht zu einem allgemeinen Immobilien-ERP weiterentwickelt. Mietfuchs wird zum **digitalen Betriebssystem für den privaten Vermieter**.

Das System bildet den gesamten normalen Vermieteralltag ab:

```text
Objekt kaufen/übernehmen → Objekt und Wohnungen einrichten → vermieten
→ Mieteingänge überwachen → Kosten und Belege verwalten
→ Reparaturen/Wartungen organisieren → Betriebskosten abrechnen
→ steuerlich aufbereiten → Mietverhältnis ändern/beenden → neu vermieten
```

Der zentrale Nutzen ist nicht die maximale Zahl von Funktionen, sondern:

> Ein privater Vermieter soll für seine normale Verwaltung möglichst selten Excel, Papierordner, separate Erinnerungslisten oder mehrere unverbundene Anwendungen benötigen.

Mietfuchs speichert deshalb nicht nur Informationen, sondern beantwortet jederzeit: Was ist passiert? Was ist offen? Was muss ich als Nächstes tun? Welche Frist läuft? Welche Unterlage gehört dazu? Ist der Vorgang vollständig abgeschlossen?

---

## 1. Zielgruppe

**Kernzielgruppe:** private Vermieter, typischerweise 1–12 vermietete Einheiten; ein oder wenige Mehrfamilienhäuser; vermietete Eigentumswohnungen; Mischformen aus eigenem Haus und vermieteten Einheiten; Alleineigentum; gemeinsames Eigentum von Ehepartnern/Familien; gelegentliche Eigentümergemeinschaften mit gesonderter Feststellung; Selbstverwaltung ohne professionelle Hausverwaltung; Nutzer ohne Buchhaltungskenntnisse, die fachlich korrekt arbeiten wollen, ohne eine ERP-Oberfläche zu bedienen.

Die Datenarchitektur darf deutlich mehr Einheiten verkraften — die Produktentscheidungen richten sich trotzdem an kleine private Bestände.

## 2. Nicht-Zielgruppen

In V1 ausdrücklich nicht optimiert für: professionelle Hausverwalter mit hunderten/tausenden Einheiten, WEG-Verwaltung im Sinne eines WEG-Verwalters, Maklerunternehmen, Immobilienvertrieb, Facility-Management, Buchhaltungsbüros, Zahlungsdienstleister, große Gewerbeportfolios, komplexe umsatzsteuerliche Strukturen, Property-Management-SaaS mit zentral gehosteten Mieteraccounts.

---

## 3. Produktprinzipien

### 3.1 Komplexität innen, Einfachheit außen

Intern darf Mietfuchs fachlich komplex sein — der Benutzer sieht davon möglichst wenig:

```text
Intern:  BankTransaction → Payment → PaymentAllocation
         → AccountingEvent → JournalEntry → TaxEvent

UI:      1.050 € von Müller eingegangen
         ✓ Aprilmiete 850 €
         ✓ Nebenkostenvorauszahlung 200 €
         [Bestätigen]
```

### 3.2 Fachvorgänge statt Buchhaltungsdialoge

Der Standardnutzer erfasst Rechnung, Zahlung, Mieterhöhung, Schaden, Wartung, Kaution, Darlehensrate, Abrechnung — normalerweise nicht Soll/Haben, JournalLine, TaxEvent, Kontierungsstapel oder RecognitionRules. Diese entstehen aus den Fachvorgängen.

### 3.3 Progressive Disclosure

Mietfuchs zeigt nur Funktionen, die für den konkreten Bestand relevant sind: keine Eigentumswohnung → WEG unsichtbar; kein Darlehen → Darlehensmodul nicht prominent; ein Eigentümer → keine Eigentümeraufteilung im Alltag; kein §7b-Fall → keine §7b-Oberfläche; keine zentrale Heizung → keine HeizkostenV-Engine. Fachliche Möglichkeiten bleiben intern vorhanden und werden kontextabhängig aktiviert.

---

## 4. Neue Produktinvarianten

Die bestehenden fachlichen und technischen Invarianten (1–85) bleiben erhalten. Zusätzlich gelten:

```text
86.  Fachliche Komplexität darf nicht automatisch UI-Komplexität erzeugen.
87.  Der Standardnutzer arbeitet mit Geschäftsvorgängen, nicht mit Datenbankentitäten.
88.  Jede häufige Vermieteraufgabe muss von einem fachlichen Einstiegspunkt erreichbar sein.
89.  Eine Funktion, die für den Bestand nicht relevant ist, soll standardmäßig nicht
     prominent erscheinen.
90.  Ein normaler Vermietungsprozess darf nicht zwingend ein externes SaaS voraussetzen.
91.  Local Mode benötigt keinen externen Identity Provider.
92.  Externer Zugriff ist kein Release-Kriterium für den Vermieter-Core.
93.  Ein Mieterportal ist keine Voraussetzung für vollständige Vermieterverwaltung.
94.  Eine versandte Betriebskostenabrechnung wird niemals überschrieben.
95.  Ein Einwand gegen eine Abrechnung referenziert immer die konkrete versandte Version.
96.  Umlagefähigkeit einer Betriebskostenart und mietvertragliche Umlagevereinbarung
     sind getrennte Sachverhalte.
97.  Dokumenteingang erzeugt niemals ungeprüft einen gebuchten Fachvorgang.
98.  Jeder zentrale Jahresprozess besitzt einen Vollständigkeitsstatus.
99.  Ein Prozess gilt erst als abgeschlossen, wenn seine fachlichen Abschlussbedingungen
     erfüllt sind.
100. Mietfuchs darf keinen Workflow nur deshalb komplizierter machen, weil das
     zugrunde liegende Datenmodell komplex ist.
```

---

## 5. Betriebsmodelle

### 5.1 Local Mode

Standard für einfache Nutzer: `Browser → Mietfuchs → PostgreSQL`. Rechner oder lokaler Server, ein Eigentümer bzw. kleiner Nutzerkreis, keine externe Erreichbarkeit erforderlich, **kein OIDC-Zwang**, Default-Workspace bei Installation, lokal vereinfachte Authentifizierung zulässig, alle Kernfunktionen ohne Internet. Local Mode ist der einfachste Einstieg.

### 5.2 Homelab / Server Mode

Für Nutzer mit NAS/Docker/Proxmox: `LAN/VPN → Reverse Proxy → Mietfuchs → PostgreSQL`. Optional: OIDC, mehrere Vermieter-/Familiennutzer (OWNER/MANAGER/READONLY), zentraler SMTP-Server, Backup-Ziel, externe Dokumentablage. OIDC bleibt die empfohlene Mehrbenutzerlösung — darf aber nicht Voraussetzung für den Local Mode sein.

### 5.3 Tenant-facing Mode

**Explizit nicht Bestandteil von Mietfuchs Next 1.0.** Ein Mieterportal benötigt dauerhafte externe Erreichbarkeit, TLS, sichere Authentifizierung, Account-Recovery, Angriffsschutz, Mailversand, Datenschutzprozesse und Betriebsüberwachung — das passt nur eingeschränkt zum Homelab-/Local-first-Modell.

```text
TENANT-Rolle im Datenmodell        → behalten
Permission-Modell                  → behalten
Portal-Architektur vorbereiten     → behalten
vollständiges Mieterportal         → Step 20+
Portal-Messaging                   → Step 20+
Mieter-Zählerstand-Submission      → Step 20+
Mieter-Schadensportal              → Step 20+
```

---

## 6. Primäre Navigation

Die Oberfläche folgt nicht der Datenbankstruktur. Hauptnavigation: **Start · Objekte · Mietverhältnisse · Finanzen · Betriebskosten · Technik · Dokumente · Steuer**. Unter „Mehr" bzw. kontextabhängig: Darlehen, Kautionen, WEG, Planung, Administration. Accounting ist kein normales Hauptmenü — DATEV/Journal/Mapping liegen unter *Finanzen → Erweitert*.

## 7. Startseite: Vermieter-Cockpit

Die Startseite beantwortet „Was muss ich tun?" — nicht „Welche Tabelle möchtest Du öffnen?".

**Handlungsbedarf** (Beispiele): 2 Mietzahlungen überfällig · 1 Bankumsatz ungeklärt · Abrechnung Musterstraße bis 31.12. versenden · Heizungswartung in 18 Tagen · Versicherung kündbar bis 30.09. · 2 Rechnungen unklassifiziert · 1 steuerlicher Sachverhalt ungeklärt.

**Bestand:** Einheiten 8 · vermietet 7 · leer 1 · Auszug geplant 1.
**Finanzen:** Sollmiete/Istmiete Monat, Rückstände, laufende Kosten, Cashflow.
**Betriebskosten:** Kosten vollständig 96 % · Zähler ✓ · Abrechnung erstellt ✓ · versendet 6/7 · offene Einwendungen 1.
**Technik:** offene Schäden, laufende Aufträge, überfällige Wartungen, nächste Termine.

## 8. Objekt-Cockpit

Jedes Objekt erhält eine zentrale Ansicht (kein Springen durch sechs Module): Objektdaten, Eigentümer, Gebäude/Einheiten, aktuelle Mietverhältnisse, Soll-/Ist-Miete, Rückstände, Betriebskostenstatus, Zähler, laufende Verträge, Versicherungen, Technische Assets, offene Tickets, Wartungen, Darlehen, Dokumente, Kosten, Cashflow, Steuerstatus.

---

## 9. Onboarding

Ein neuer Nutzer richtet Mietfuchs ein, ohne das interne Datenmodell zu verstehen.

**Setup-Assistent:** Start („Was vermietest Du?" — Mehrfamilienhaus / Eigentumswohnung(en) / mehrere Immobilien / gemischt) → Eigentum (wem, Anteile, seit wann) → Objekt (Adresse, Gebäudetyp, Baujahr, Wohnfläche, Einheiten) → Einheiten (Bezeichnung, Fläche, Zimmer, Etage, aktuelle Nutzung) → Mietverhältnisse (Mieter, Beginn, Kaltmiete, BK-Vorauszahlung, Kaution, Mietvertrag hochladen) → Finanzen (Bankkonto, Darlehen?) → Betriebskosten (Abrechnungszeitraum, Umlageschlüssel, Zähler) → Steuer (nur notwendige Grundfragen — keine komplette Steuererklärung im Setup).

## 10. Bestandsmigration

Zwei Wege: **A. Vollständiger Import** (CSV/XLSX) und **B. Einstieg zum Stichtag** (z. B. 01.01.2027): nur aktuelle Mietverhältnisse, offene Forderungen, Kautionssaldo, Darlehensrestschuld, AfA-Restwert, WEG-Rücklagenbestand, offene §82b-Beträge, Bank-Anfangsbestand. Keine historische Komplettrekonstruktion erforderlich.

---

## 11. Mietvertragsmodell

Die bestehende Trennung bleibt: Party, Property, Building, Unit, Lease, LeaseParty, LeaseComponent, RentAdjustment. Eine Person hat keine globale Rolle „Mieter" — Rollen entstehen über Beziehungen.

## 12. Mietvertragliche Betriebskostenregel

### 12.1 Neuer Pflichtbaustein: LeaseOperatingCostAgreement

Dokumentiert, welche Betriebskosten aufgrund des konkreten Mietverhältnisses wie abgerechnet werden:

```text
LeaseOperatingCostAgreement
  leaseId
  operatingCostCategoryId
  validFrom
  validTo?
  recoverable
  allocationMethod
  contractualBasis
  sourceDocumentId?
  note?
```

### 12.2 Grundsatz

Getrennt bleiben: gesetzlich grundsätzlich umlagefähige Kosten ≠ konkrete mietvertragliche Vereinbarung ≠ tatsächlich angefallene Kosten ≠ angewendeter Verteilungsschlüssel (Invariante 96). Keine automatische Rechtsentscheidung — das System warnt bei Widersprüchen (z. B. Gartenpflege allgemein umlagefähig, aber keine Vertragszuordnung hinterlegt → Prüfen).

## 13. Laufende Mietforderungen

LeaseComponents erzeugen monatliche Charges — Kaltmiete 850, Betriebskosten 200, Garage 50 werden drei getrennte Charges, keine unstrukturierte Gesamtforderung.

## 14. Bankabgleich

Primär camt.053: Bankimport → automatische Vorschläge → Bestätigung → Payment / VendorInvoice-Payment / LoanTransaction. Arbeitsvorrat „Ungeklärte Bankumsätze". Automatisches Matching darf hohe Trefferquoten erreichen — Unsicherheit bleibt sichtbar.

## 15. Forderungsmanagement

`Charge − PaymentAllocations = Outstanding`. Bei Überfälligkeit: Vorschlag Zahlungserinnerung → Erinnerung → Mahnung → weitere Mahnstufe → Ratenzahlungsvereinbarung → bezahlt → geschlossen. Keine automatische aggressive Eskalation.

---

## 16. Neuvermietung Lite

Neuvermietung wird von P2 auf **P1/Core-Lifecycle** hochgestuft — ohne komplettes Makler-CRM.

```text
Kündigung/zukünftiger Leerstand → VacancyCase → Zielmiete festlegen
→ Inserat vorbereiten → Interessenten → Besichtigung → Auswahl
→ Mietvertragsdaten → Lease → MoveInCase
```

**Prospect** minimal: Name, Kontaktdaten, gewünschte Einheit, Status (`NEW, CONTACTED, VIEWING, INTERESTED, ACCEPTED, REJECTED, WITHDRAWN, ARCHIVED`), Besichtigungstermin, Notiz.

**Nicht Core** (später): SCHUFA-API, Bonitätsdienste, automatisierte Mieterauswahl, Portalscraping, OpenImmo, ImmoScout-Integration, externe E-Signatur.

## 17. Einzug

Nach Vertragsabschluss automatisch **MoveInCase** mit Checkliste: Vertragsdokument vollständig · Kaution vereinbart · erster Zahlungstermin · Übergabetermin · Wohnungsgeberbestätigung · Zählerstände · Schlüssel · Übergabeprotokoll · Dokumente archiviert.

## 18. Übergabe / Inspection

Mobile PWA: Räume, Zustände, Fotos, Schäden, Zähler, Schlüssel, Teilnehmer, Unterschriftserfassung, PDF-Snapshot. Kein Anspruch auf qualifizierte elektronische Signatur.

## 19. Auszug

```text
Kündigung → MoveOutCase → Fristen prüfen → Übergabetermin → Inspection
→ Zähler → Schlüssel → Schäden → offene Forderungen → Kautionsabrechnung
→ Einheit = VACANT_FOR_RENT → Neuvermietung
```

## 20. Kaution

Eigener Lifecycle: vereinbart → fällig → eingegangen → verwahrt → ggf. Zinsbewegungen → Auszug → offene Forderungen prüfen → Verrechnung/Rückzahlung → abgeschlossen. Kaution bleibt bilanziell Verbindlichkeit, nie Mietertrag. DepositApplication verrechnet gegen Mietforderung, BK-Nachzahlung, bestätigte Schadenforderung oder andere konkrete Forderung. **Das Kautionskonto-/Zinsmodell ist vor V1 fachlich zu finalisieren.**

---

## 21. Dokumenteneingang – neue zentrale Funktion

Der Vermieter legt jedes neue Dokument zunächst einfach in Mietfuchs ab. Quellen: Datei-Upload, Drag & Drop, PWA-Foto, Scanner, optional später E-Mail-Import.

**Universal Document Inbox:**

```text
Dokument kommt rein → Original archivieren → Typ erkennen/vorschlagen
→ Objekt vorschlagen → Partei/Lieferant vorschlagen → Fachvorgang vorschlagen
→ Benutzer prüft → Übernehmen
```

Typen: Rechnung, Versicherungsvertrag, Mietvertrag, Kündigung, WEG-Abrechnung, Darlehensunterlage, Bescheid, Zählerdokument, Handwerkerangebot, Korrespondenz, Sonstiges. **KI darf Vorschläge machen — KI entscheidet nicht verbindlich** (Invariante 97).

## 22. Lieferantenrechnungen

Trennung bleibt: VendorInvoice / InvoiceLine / ExpenseAllocation. Eine Rechnung kann mehrere wirtschaftliche Sachverhalte enthalten (Thermenwartung 200 € + neue Pumpe 800 € unterschiedlich klassifiziert). Netto, USt und Brutto werden gespeichert; Original-E-Rechnungen bleiben unverändert archiviert.

## 23. Technischer Objektbetrieb

TechnicalAsset → Ticket → VendorQuote → WorkOrder → MaintenanceEvent / MaintenancePlan. Lifetime Costs je Anlage auswertbar.

## 24. Laufende Objektverträge

ServiceContract (Heizungswartung, Versicherung, Hausmeister, Gartenpflege, Aufzug, Kabel/Internet, Abfall, Messdienst): Vertragspartner, Beginn, Laufzeit, Kündigungsfrist, Verlängerung, Kosten, Dokument, nächster relevanter Termin.

## 25. Pflichten- und Fristenradar

Auf Basis von Deadline, MaintenancePlan, WorkflowTemplate, Task — Standardvorlagen für typische Vermieterthemen. Jede automatisch erzeugte Frist enthält Grund, Ausgangsdatum, Regel, Regelversion, Rechts-/Vertragsgrundlage. Keine Magic Numbers, keine behauptete rechtliche Verbindlichkeit ohne nachvollziehbare Regel.

---

## 26. Betriebskostenabrechnung – Core

Die bestehende Settlement-Engine bleibt ein zentrales Alleinstellungsmerkmal: Abrechnungsjahr → Kosten → Belege → Zähler → Nutzungszeiträume → Verteilung → Prüfung → SettlementSnapshot → Abrechnung. Ein abgeschlossener Snapshot bleibt unveränderlich.

## 27. Neuer Settlement Lifecycle

Die Abrechnung endet nicht bei der PDF-Erstellung:

```text
DRAFT → READY_FOR_REVIEW → APPROVED → SENT → OPEN → SETTLED → CLOSED

alternativ:
SENT → OBJECTION_RECEIVED → UNDER_REVIEW → CONFIRMED oder CORRECTED → CLOSED
```

## 28. Einwendungen: SettlementObjection

```text
SettlementObjection
  id, settlementSnapshotId, leaseId, partyId, receivedAt, subject, description,
  status, responseDueAt?, resolvedAt?, resolution
```

Status: `RECEIVED, DOCUMENTS_REQUESTED, UNDER_REVIEW, AWAITING_TENANT, ACCEPTED, PARTIALLY_ACCEPTED, REJECTED, RESOLVED`. Ein Einwand referenziert immer die konkrete versandte Version (Invariante 95).

## 29. Belegeinsicht

Aus einer Abrechnung werden die zugrunde liegenden Belege gezielt zusammengestellt: Mieter fordert Belege an → Belegpaket auswählen → sensible Inhalte prüfen → Dokumentpaket erzeugen → Übergabe/Versand dokumentieren. Ein späteres Portal kann diesen Prozess nutzen — ist aber nicht Voraussetzung.

## 30. Korrekturabrechnung

Eine versandte Abrechnung wird niemals editiert (Invariante 94). Stattdessen SettlementSnapshot v2 mit previousSnapshotId, reason, createdAt, difference. Der Benutzer sieht: Nachzahlung bisher 318,40 € / korrigiert 281,10 € / Differenz −37,30 €. Die finanzielle Folge läuft über korrekte Charge-/Adjustment-Mechanismen.

## 31. CO₂-Kostenaufteilung

Bleibt Core für relevante Objekte, modular (OperatingCosts / CO2Allocation / CentralHeating optional). Unterstützt zentrale Brennstoffbeschaffung durch den Vermieter und dezentrale Versorgung des Mieters (Gasetagenheizung). Regeln versioniert.

## 32. WEG-Eigentümerabrechnung

Keine WEG-Verwaltung — aber für vermietete Eigentumswohnungen: Hausgeld, WEGAnnualStatement, Erhaltungsrücklage, umlagefähige/nicht umlagefähige Positionen, Steuerwirkung.

## 33. Accounting Layer

Bleibt interne Integritätsschicht (SourceDocument → AccountingEvent → JournalEntry → JournalLine, Dimensionen Property/Unit/Party/TechnicalAsset/Loan). Der normale Anwender sieht keine Soll-/Haben-Maske.

## 34. Tax Layer

Bleibt getrennt vom Accounting (SourceDocument → Tax Recognition → TaxEvent). Accounting beschreibt, was wirtschaftlich passiert ist; Tax, wie derselbe Vorgang für V+V steuerlich behandelt wird. Keine Schicht ersetzt die andere.

## 35. Tax Scope

Ausschließlich die Vermietungs-/Verpachtungsebene. **Nicht:** persönliche Einkommensteuer, Grenzsteuersatz, Soli, Kirchensteuer, persönliche Steuerprognose. **Unterstützt:** Anlage-V-Vorschau, Eigentümeranteile, gesonderte Feststellung als Ergebnisaufteilung, AfA, §82b, 15-%-Monitor, verbilligte Vermietung, WEG-Rücklage, Schuldzinsen, Sonderwerbungskosten, steuerliche Prüfpunkte.

---

## 36. Jahresabschluss-Assistent – neue zentrale Funktion

Der Vermieter muss beantworten können: **Sind meine Unterlagen für dieses Jahr vollständig?**

```text
Jahrescheck 2026
Mieten:          ✓ 12 Monate Sollstellungen · ✓ 12 Monate Bankdaten
                 ✗ 1 ungeklärter Zahlungseingang
Kosten:          ✓ 47 Rechnungen · ✗ 2 ohne Kategorie · ✓ Dokumente vollständig
Betriebskosten:  ✓ Kosten vollständig · ✓ Zähler vollständig
                 ✗ Abrechnung noch nicht erstellt
Finanzierung:    ✓ Darlehenszahlungen vollständig · ✓ Zinsen zugeordnet
Steuer:          ✓ AfA berechnet · ⚠ 15-%-Monitor bei 83 % · ✗ 1 Prüffall

Gesamtstatus: NICHT VOLLSTÄNDIG
[Offene Punkte bearbeiten] [Steuerpaket erstellen] [Jahr abschließen]
```

Jeder zentrale Jahresprozess besitzt einen Vollständigkeitsstatus (Invariante 98).

## 37. Steuerpaket

Je Steuerjahr: Anlage-V-Vorschau, Einnahmenübersicht, Werbungskostenübersicht, AfA-Verzeichnis, Darlehensübersicht, §82b-Verzeichnis, 15-%-Monitor, Eigentümeraufteilung, WEG-Steuerblatt, Belegindex, Liste ungeklärter steuerlicher Sachverhalte.

## 38. Dashboard-Kennzahlen

Nur verständliche Kennzahlen: Vermietungsquote, Sollmiete, Istmiete, Mieteingangsquote, Mietrückstände, Einnahmen, laufende Kosten, nicht umlagefähige Kosten, Instandhaltung, Zinsen, Tilgung, Cashflow. Renditekennzahlen nur, wenn die erforderlichen Werte vorhanden sind — keine erfundenen Werte.

## 39. Dokumente und Korrespondenz

Weiterhin getrennt: Document ≠ GeneratedDocument ≠ Correspondence ≠ Delivery (Mahnschreiben = GeneratedDocument, inhaltliche Nachricht = Correspondence, E-Mail-Versuch = Delivery).

## 40. Suche

V1 mindestens Metadatensuche über Objekt, Einheit, Person, Vertrag, Rechnung, Dokument, Ticket, Anlage, Vorgang. OCR-/Volltextsuche bleibt späterer Ausbau.

## 41. Backup und Wiederherstellung

**P0.** Backup umfasst konsistent PostgreSQL + Document Storage + notwendige Konfiguration. UI zeigt letztes Backup, Alter, Größe, Status. Restore wird automatisiert getestet — Backup ohne getesteten Restore gilt nicht als vollständig abgesichert.

## 42. Vollständiger Export

metadata.json, properties.csv, units.csv, parties.csv, leases.csv, charges.csv, payments.csv, …, documents/. Kein Vendor Lock-in.

## 43. Systemadministration

Self-hosted heißt: Für normale Diagnose nicht zwingend in die Shell. Admin-Cockpit: App-/DB-Version, Migrationsstatus, PostgreSQL, Storage, freier Speicher, Backup, SMTP, OIDC, CAMT-Import, Jobs, Outbox, Ollama optional.

## 44. Hintergrundjobs

Modularer Monolith reicht. Jobs: Charge Generation, Reminder, Deadlines, Wartungsprüfung, Vertragsfristen, Mahnvorschläge, Tax Checks, Outbox, Backup optional. Anforderungen: idempotent, retry-fähig, sichtbarer Status, Fehlerhistorie.

## 45. KI-Grundsatz

KI ist Assistent, niemals fachliche Wahrheit. Sinnvoll: Rechnungsdaten extrahieren, Dokumenttyp erkennen, Objekt/Lieferant/Kategorie vorschlagen, Korrespondenz zusammenfassen, Zuordnungen erklären. Nicht autonom: Buchung freigeben, Rechtsentscheidung, Steuerentscheidung, Mieterforderung erzeugen, Abrechnung final freigeben.

---

## 46. Was ausdrücklich nicht V1 ist (Step 20+)

**Mieterportal:** Mieteraccounts, Portal-Messaging, Portal-Dokumente, Self-Service, Zählerstandmeldung, Schadensmeldung, Portal-Submission. **Externe Portale:** OpenImmo, Immobilienportaladapter. **Signaturdienste:** externe E-Signatur, QES. **Weitere Integrationen:** CalDAV bidirektional, herstellerspezifische Smart-Meter-Adapter, postalische Versanddienste, Owner Portal.

## 47. Weitere bewusste Nicht-Ziele

Keine: HR, Payroll, Lagerverwaltung, Materialwirtschaft, Sales/Purchase Orders, vollständige WEG-Verwaltung, Verwalterabrechnung, Makler-CRM, Callcenter, eigener Mailserver, eigener OIDC-Provider, eigener Signaturdienst, Payment Processing, Microservices-Zwang, native iOS-/Android-App.

---

## 48. Neue Release-Priorisierung

Die Priorität richtet sich nicht danach, wie technisch interessant ein Modul ist, sondern:

> Wie häufig zwingt eine fehlende Funktion den privaten Vermieter zurück zu Excel, Mail, Kalender oder Papier?

## 49. P0 – Voraussetzung Mietfuchs Next 1.0

**Technische Basis:** TypeScript/shared domain, PostgreSQL, Migration, Backups, Datenexport.
**Vermieter-Core:** Onboarding, Property/Unit/Party/Lease, LeaseComponents, Eigentum, Mietforderungen, Zahlungen, CAMT, offene Posten.
**Kosten:** VendorInvoice, ExpenseRecord, Dokumente, ExpenseAllocation.
**Betriebskosten:** bestehende Settlement Engine, LeaseOperatingCostAgreement, SettlementLifecycle, SettlementObjection, Belegeinsicht, Korrekturabrechnung.
**Operations:** Inbox, Cases, Tasks, Deadlines, Move-in, Move-out, Inspection, Schlüssel.
**Technik:** Tickets, WorkOrders, MaintenancePlans, ServiceContracts.
**Vermögen:** Kaution, Darlehen, AfA-Bestand.
**Steuer:** TaxEvents, Kern-AfA, Eigentümeraufteilung, Steuerpaket, Jahresabschluss-Assistent.
**Betrieb:** Local Mode ohne externen OIDC-Zwang.

## 50. P1 – sehr wichtiger Ausbau

Neuvermietung Lite, Universal Document Inbox, Mieterhöhung Workflow, Mahnwesen, DamageClaims, CO₂Allocation, WEGAnnualStatement, 15-%-Monitor, §82b, verbilligte Vermietung, Portfolio-Cockpit, read-only ICS, Metadatensuche, E-Rechnung.

## 51. P2

Budget, CapitalProjects, VendorQuote-Vergleich, SEPA pain.008, umfangreiche Forecasts, OpenImmo, Volltext-/OCR-Suche, Custom Fields, CalDAV.

## 52. Step 20+

Mieterportal, PortalSubmission, Portal-Messaging, Mieter-Self-Service, externe Signatur, öffentliche SaaS-/Portal-Funktionen.

---

## 53. Vorgeschlagene Änderungen an bestehenden Issues

- **#5 OIDC-Login & Workspaces:** Workspace-Modell bleibt früh; OIDC nur Pflicht für Server-/Multiuser-Mode. Neuer Scope: Workspace, Membership, Local Mode, Server Mode, OIDC optional/erforderlich abhängig vom Betriebsmodus.
- **#67 Arbeitsplan:** grundlegend aktualisieren — Produktziel an den Anfang, Meilensteinreihenfolge nicht ausschließlich nach technischen Abhängigkeiten, Release-Slices definieren.
- **#115 Operational Core:** P0 unverändert beibehalten — zentrale Produktschicht.
- **#121/#122 Dokumente/Korrespondenz:** beibehalten; zusätzlich Universal Document Inbox als vorgelagerter Prozess.
- **#126/#127 Mieterportal:** aus Mietfuchs Next 1.0 herausnehmen → Step 20+; TENANT-Permission-Modell bleibt technisch vorbereitet.
- **#125 SEPA:** von Kern zu P2 — CAMT-/Mieteingangskontrolle ist für kleine Vermieter wichtiger als ein eigener Lastschriftlauf.
- **#132 Portfolio Dashboard:** beibehalten, aber erste einfache Cockpit-Version deutlich früher; vollständiges Portfolio-Reporting später.
- **#133 Budget/Forecast:** P1/P2, kein Release-Blocker.
- **#204 P2-Backlog:** aufteilen — Neuvermietung Lite → P1; OpenImmo/E-Signatur/OCR/Custom Fields/CalDAV/Herstelleradapter bleiben P2; Tenant Home Guide/Owner Portal/Portal-nahe Funktionen → Step 20+.

## 54. Neue Issues

- **NEW-1 – Onboarding & Setup Wizard (P0):** Bestand vollständig einrichten ohne Domänenmodell-Kenntnis. Subissues: Bestandsart, Eigentümer, Objekt, Einheiten, Mieter, Mietbestandteile, Bank, Darlehen, Zähler, Feature Detection, Abschlussprüfung.
- **NEW-2 – LeaseOperatingCostAgreement (P0):** mietvertragliche BK-Grundlage historisiert. Subissues: Datenmodell, Vertragszuordnung, historische Gültigkeit, Mapping zu OperatingCostCategory, Settlement-Integration, Warnungen.
- **NEW-3 – Settlement Lifecycle & Objections (P0):** BK-Prozess nach Erstellung vollständig. Subissues: SettlementStatus, Versandstatus, SettlementObjection, Belegeinsicht, Antwortworkflow, Korrekturabrechnung, Snapshot-Versionierung, finanzielle Differenzbehandlung.
- **NEW-4 – Universal Document Inbox (P1):** gemeinsamer Prüfworkflow für alle eingehenden Dokumente. Subissues: Upload Inbox, Dokumentklassifikation, KI-Vorschläge, Objekt-/Party-Vorschlag, Fachvorgangs-Vorschlag, Benutzerbestätigung, Duplikaterkennung.
- **NEW-5 – Annual Completeness Check (P0):** Jahresvollständigkeit für Vermietung und Steuer. Subissues: Miet-/Bank-/Belegvollständigkeit, Betriebskostenstatus, Darlehen, AfA, WEG, TaxReviewItems, Year Ready Status.
- **NEW-6 – Vacancy & Reletting Lite (P1):** aus #204 herauslösen. Subissues: VacancyCase, TargetRent, Prospect, Viewing, Decision, Prospect → Party, Create Lease, Trigger MoveInCase.
- **NEW-7 – Deposit Lifecycle Completion (P0/P1):** ergänzt Kautionsissues. Subissues: Fälligkeit, Verwahrungsort, Zahlungseingang, Zinsmodell, DepositApplication, Rückzahlung, Abschlussstatus.

## 55. Empfohlene Release-Slices

Technische Meilensteine und Produkt-Releases werden getrennt betrachtet:

```text
Slice A – Bestand funktioniert:        Objekt, Einheit, Mieter, Mietvertrag, Onboarding
Slice B – Geld funktioniert:           Charges, Payments, CAMT, Open Items, Rechnungen
Slice C – Jahresabrechnung funktioniert: Kosten, Zähler, BK-Regeln, Settlement, PDF,
                                       Versand, Einwand, Korrektur
Slice D – Alltag funktioniert:         Inbox, Tasks, Deadlines, Dokumente, Technik, Wartung
Slice E – Mieterwechsel funktioniert:  Kündigung, MoveOut, Inspection, Schlüssel, Kaution,
                                       Vacancy, Neuvermietung, MoveIn
Slice F – Steuerjahr funktioniert:     TaxEvent, AfA, Eigentümeranteil, WEG, Steuerpaket,
                                       Vollständigkeitscheck
Slice G – Betrieb funktioniert:        Backup, Restore, Export, Admin, Jobs
```

Erst wenn A–G funktionieren, ist Mietfuchs Next 1.0 fachlich vollständig.

## 56. End-to-End-Releasekriterien

```text
E2E 1 – Bestandsvermieter startet:  4 Wohnungen, Verträge, AfA, Darlehen, Kautionen
                                    → Setup Wizard/Opening Balances → arbeitsfähig ohne
                                    historische Komplettrekonstruktion
E2E 2 – normaler Mietmonat:         Sollstellungen, CAMT, 3 Auto-Matches, 1 Teilzahlung,
                                    1 Rückstand angezeigt
E2E 3 – Handwerkerrechnung:         PDF hochladen → erkennen → prüfen → aufteilen
                                    → zuordnen → Zahlung matchen → BK + Steuer korrekt
E2E 4 – Betriebskostenabrechnung:   Kosten + Zähler vollständig → Settlement → prüfen
                                    → versenden → Nachzahlung erzeugen
E2E 5 – Abrechnungseinwand:         Einwand erfassen → Belege bereitstellen → Fehler
                                    bestätigen → neuer Snapshot → Differenz → schließen
E2E 6 – Mieter zieht aus:           Kündigung → Deadline → MoveOutCase → Übergabe → Fotos
                                    → Zähler → Schlüssel → Schaden → offene Miete
                                    → Kautionsverrechnung → Leerstand
E2E 7 – Neuvermietung:              VacancyCase → Interessenten → Besichtigung → Auswahl
                                    → Lease → MoveInCase → Übergabe
E2E 8 – Steuerjahr:                 Jahrescheck → ungeklärte Punkte → AfA → Zinsen → WEG
                                    → TaxEvents → Eigentümeranteile → Steuerpaket
E2E 9 – Serverausfall:              Backup → neue Installation → Restore → Stammdaten,
                                    Dokumente, Mietkonten, Settlements, Journal, Tax-Daten
                                    identisch
```

## 57. Produktmetriken

Erfolg wird nicht primär in Features gemessen: **Verwaltungsabdeckung** (wie viele typische Vermieterprozesse vollständig in Mietfuchs abschließbar?), **Medienbrüche** (wie oft zurück zu Excel/Papier/separater Liste?), **offene Arbeit** („Was muss ich heute tun?" zuverlässig beantwortbar?), **Vollständigkeit** („Ist mein Jahr vollständig?"), **Nachvollziehbarkeit** („Warum steht dieser Betrag hier?").

## 58. Zentrale UX-Regel

Jede wichtige Ansicht bietet einen fachlichen nächsten Schritt an — nicht „Objekt bearbeiten", sondern: „1 Mietzahlung fehlt → Zahlung prüfen", „Betriebskosten 2026 zu 92 % vollständig → fehlende Belege anzeigen", „Heizungswartung in 12 Tagen → Wartung öffnen", „Mieter zieht am 31.10. aus → Auszugsvorgang öffnen".

## 59. Zielbild

```text
                          MIETFUCHS
                Digitales Betriebssystem
               für den privaten Vermieter
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ↓                ↓                ↓
       ARBEIT           OBJEKTE          DOKUMENTE
   Inbox / Cases      Property/Lease     Eingang/Akte
   Tasks/Deadlines    Technik/Verträge   Korrespondenz
          │                │                │
          └───────────────┬┴────────────────┘
                          │
             ┌────────────┼─────────────┐
             ↓            ↓             ↓
          FINANZEN    BETRIEBSKOSTEN   STEUER
          Charges       Settlement      TaxEvents
          Payments      Objections      AfA
          Bank          CO₂ / WEG       Steuerpaket
             │            │             │
             └────────────┼─────────────┘
                          │
                       DOMAIN
                          │
             ┌────────────┼─────────────┐
             ↓            ↓             ↓
         OPERATIONS    ACCOUNTING       TAX
                          │
                     PostgreSQL
                          │
                  Document Storage
```

## 60. Schlussentscheidung

Mietfuchs Next soll nicht jede Funktion professioneller Immobilienverwaltungssoftware abbilden. Es soll die häufigsten und lästigsten Aufgaben eines privaten Vermieters so verbinden, dass aus einzelnen Funktionen ein durchgängiger Arbeitsplatz entsteht. Die interne Architektur darf anspruchsvoll sein — das Produkt muss einfach bleiben.

> Mietfuchs ist nicht eine Sammlung von Modulen für Immobilien. Mietfuchs begleitet den Vermieter durch seine Vorgänge.

Mietfuchs Next 1.0 ist erreicht, wenn ein privater Vermieter seinen normalen Bestand von der monatlichen Miete über Reparaturen und Betriebskosten bis zum Mieterwechsel und Steuerjahresabschluss weitgehend in einem System verwalten kann. Das Mieterportal ist dafür nicht erforderlich — es ist ein späterer Ausbau (Step 20+).

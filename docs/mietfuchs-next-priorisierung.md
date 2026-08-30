# Mietfuchs Next – Abschließende Produkt-, Nutzen- und Priorisierungsspezifikation

**Stand:** 30.08.2026  
**Status:** Verbindliche Produkt-, Scope- und Release-Priorisierung  
**Geltungsbereich:** Mietfuchs Next  
**Zielgruppe:** Private Vermieter in Deutschland mit typischerweise 1–12 Einheiten und einem oder wenigen Objekten  
**Produktvision:** Digitales Betriebssystem für private Vermieter  

---

# 0. Zweck dieser Spezifikation

Die fachliche Domäne von Mietfuchs Next ist mit den bestehenden:

- Architektur-Spezifikationen,
- Persistenz- und Datenbankentscheidungen,
- Accounting-Spezifikationen,
- Tax-Layer-Spezifikationen,
- Operations-Spezifikationen,
- Produktspezifikationen,
- sowie der Spezifikation zu technischem Bestand, Gebäudezustand und Lebenszyklus

grundsätzlich ausreichend vollständig beschrieben.

Das wesentliche Produktrisiko liegt deshalb nicht mehr in einer fehlenden großen Fachdomäne.

Das Risiko besteht nun vielmehr in:

1. Überpriorisierung seltener Funktionen,
2. zu spätem Liefern des eigentlichen Nutzens,
3. Vermischung technischer Voraussetzungen mit Produktfeatures,
4. zu breitem P0-Scope,
5. Scope Creep in Richtung ERP, professionelle Hausverwaltung, CMMS oder SaaS-Plattform,
6. technisch sauberer, aber für private Vermieter zu komplexer Benutzeroberfläche.

Diese Spezifikation definiert deshalb den verbindlichen Produkt-Cut für Mietfuchs Next.

Sie beantwortet:

```text
Was muss zwingend in 1.0?

Was muss architektonisch bereits vorbereitet sein?

Was ist konditionaler Kern?

Was bringt hohen Nutzen, darf aber nach 1.0 kommen?

Was bleibt bewusst draußen?
```

---

# 1. Produktvision

Mietfuchs Next ist:

> **Das digitale Betriebssystem für private Vermieter.**

Die typische Zielgruppe verwaltet:

```text
1–12 Einheiten

ein oder wenige Grundstücke

ein oder wenige Gebäude

überwiegend langfristige Wohnraummietverhältnisse
```

Der Nutzer ist typischerweise kein:

```text
professioneller Immobilienverwalter

Facility Manager

Buchhalter

Steuerberater

Techniker

IT-Administrator
```

Mietfuchs muss deshalb intern fachlich belastbar sein, aber nach außen einfach bleiben.

Die zentrale Produktregel lautet:

> **Komplexität innen, Einfachheit außen.**

---

# 2. Zentrale Eigentümerfragen

Mietfuchs ist erfolgreich, wenn der Eigentümer jederzeit zuverlässig beantworten kann:

```text
Was ist passiert?

Was ist offen?

Was muss ich jetzt tun?

Ist mein aktuelles Jahr vollständig?

Welche größeren Themen kommen später auf mich zu?
```

Diese Fragen gelten über alle Fachbereiche:

```text
Mieter

Mietvertrag

Mietzahlungen

Bank

Betriebskosten

Rechnungen

Dokumente

Fristen

Technik

Kaution

Steuer

Finanzierung

langfristiger Gebäudeerhalt
```

---

# 3. Nicht-Ziele

Mietfuchs wird ausdrücklich kein:

```text
ERP

professionelles Hausverwaltungssystem

WEG-Verwaltersystem

CAFM

CMMS

BIM-System

Digital Twin

Gebäudeleittechnik

Energiemanagementsystem

Projektmanagementsystem für Großbaumaßnahmen

Makler-CRM

Payment Service Provider

Dokumentenmanagementsystem mit eigener OCR-Plattform

Mieter-SaaS-Plattform
```

Insbesondere werden nicht aufgebaut:

```text
Lagerverwaltung

Ersatzteilwirtschaft

Personal-/Technikerdisposition

Arbeitszeiterfassung

SLA-Management

komplexe Beschaffung

Sales Orders

Purchase Orders

HR

BIM

GIS

CAD

professionelle Flächenverwaltung

IoT-Plattform

Enterprise Workflow Designer
```

---

# 4. Grundsatz: Fachobjekte bleiben getrennt

Mietfuchs darf fachlich unterschiedliche Sachverhalte nicht zusammenziehen, nur weil sie in der UI ähnlich erscheinen.

Beispiele:

```text
Invoice ≠ Expense

Expense ≠ Payment

BankTransaction ≠ Payment

Deposit ≠ Revenue

JournalEntry ≠ TaxEvent

TechnicalAsset ≠ DepreciableAsset

Ticket ≠ Defect

Defect ≠ WorkOrder

WorkOrder ≠ VendorInvoice

Maintenance ≠ Repair

Maintenance ≠ Renewal

LifecyclePlanItem ≠ CapitalProject

technischer Kapitalbedarf ≠ buchhalterische Rückstellung

technischer Kapitalbedarf ≠ WEG-Erhaltungsrücklage

Alter ≠ Zustand

Lebensdauerannahme ≠ Tatsache

Document ≠ Correspondence

Correspondence ≠ Delivery
```

Diese Trennungen sind Teil der Architektur und nicht optional.

---

# 5. Neue Prioritätssystematik

Die bisherige Einteilung P0/P1/P2 wird verbindlich präzisiert.

---

## 5.1 F0 – Foundation

F0 umfasst technisch zwingende Voraussetzungen.

Diese Funktionen bringen teilweise wenig unmittelbar sichtbaren Nutzwert, sind aber Voraussetzung für einen fachlich sicheren Betrieb.

Beispiele:

```text
Repository-Abstraktion

Migrationen

Settlement-Regression

Integer-Cent-Invarianten

SQLite/PostgreSQL-Portabilität

Authentifizierungs-Foundation

Workspace-Isolation

Backup/Restore

fachliche Constraints
```

F0 ist Release-Blocker.

---

## 5.2 P0 – universeller Produktkern

P0 umfasst Funktionen, ohne die ein typischer privater Vermieter seinen normalen Bestand nicht sinnvoll vollständig führen kann.

P0 ist Release-Blocker für Mietfuchs Next 1.0.

---

## 5.3 C0 – konditionaler Produktkern

C0 umfasst Funktionen, die fachlich zwingend korrekt sein müssen, wenn der jeweilige Sachverhalt im Bestand vorkommt.

Sie müssen nicht jedem Nutzer gezeigt werden.

Beispiele:

```text
WEG

mehrere Eigentümer

gesonderte Feststellung

§7b

15-%-Monitor

verbilligte Vermietung

CO₂-Kostenaufteilung

zentrale Heizkostenversorgung
```

Es gilt:

> **Konditional korrekt, aber nicht universell sichtbar.**

---

## 5.4 P1 – hoher Zusatznutzen

P1 umfasst Funktionen, die einen erheblichen praktischen Nutzen haben, deren Fehlen einen normalen Betrieb jedoch nicht verhindert.

---

## 5.5 P2 – Komfort / Spezialfall

P2 umfasst:

```text
Komfortfunktionen

seltene Integrationen

Spezialfälle

Automatisierungen

erweiterte Analytik
```

---

## 5.6 Step 20+

Step 20+ umfasst bewusst später liegende Produkterweiterungen.

Insbesondere:

```text
Mieterportal

externe Mieteraccounts

PortalSubmission

Portal Messaging

umfangreiche externe Integrationen
```

---

# 6. F0 – technische Foundation

Folgende Punkte sind zwingend:

```text
TypeScript-/Shared-Domain-Foundation

modularer Monolith

Repository-Layer

SQLite als Zero-Config-Backend

PostgreSQL als Server-/Homelab-/Cluster-Backend

identischer Portable Core auf beiden Backends

versionierte Datenbankmigrationen

db.json-Migration

cent-genaue Settlement-Regression

Integer-Cent-Invarianten

Datums-/Zeitraum-Invarianten

DB-Constraints

idempotente Imports

Dokumentenintegrität

Workspace-Foundation

User-Foundation

UserIdentity

Membership

Session-Infrastruktur

Authentifizierung

Autorisierung

Workspace-Isolation

OIDC

konsistentes Backup

getesteter Restore

minimaler Audit Trail
```

JSON bleibt:

```text
Importformat
Exportformat
Fixture-Format
```

JSON ist nach Migration kein reguläres Persistenzbackend mehr.

Keine dritte Datenbank wird für V1 unterstützt.

Keine externe Queue ist Voraussetzung für Fachkorrektheit.

Keine Microservices.

---

# 7. Authentifizierung ist Foundation

Mietfuchs Next darf nicht erneut ein System ohne belastbare Authentifizierung sein.

Local-first bedeutet nicht:

> auth-frei.

Authentifizierung und Autorisierung gehören zur Foundation.

Ein produktiver Mietfuchs-Betrieb ohne kontrollierte Benutzeridentität ist kein zulässiges Zielbild.

---

# 8. Identity-, Workspace- und Berechtigungsmodell

P0:

```text
Workspace

User

UserIdentity

Membership

WorkspaceRole
```

Grundmodell:

```text
User
  │
  ├── UserIdentity
  │      ├── LOCAL?
  │      └── OIDC
  │
  └── Membership
         │
         └── Workspace
```

Ein Workspace bildet die technische Daten- und Berechtigungsgrenze.

Workspace ist nicht gleich:

```text
Eigentümer

Property

TaxSubject

Person
```

---

# 9. OIDC – P0

**OIDC ist Bestandteil von Mietfuchs Next 1.0.**

Mietfuchs entwickelt keinen eigenen Identity Provider.

Mietfuchs ist OIDC-Client.

Verwendet wird:

```text
OAuth 2.0 Authorization Code Flow

+

PKCE
```

Unterstützt werden mindestens:

```text
issuer discovery

authorization endpoint

token endpoint

JWKS

state

nonce

PKCE

sichere Session

Logout

issuer/sub-Bindung
```

---

# 10. Identitätsinvarianten

Es gelten mindestens:

```text
Identität ≠ E-Mail-Adresse

Authentifizierung ≠ Autorisierung

Workspace ≠ Eigentümer

OIDC Provider ≠ fachliche Benutzerrolle

TENANT-Rolle ≠ automatisch Mieterzugriff

Login ≠ Zugriff auf alle Workspace-Daten

Local Mode ≠ Authentifizierung ausgeschaltet
```

OIDC-Identitäten werden stabil gebunden über:

```text
issuer + subject
```

E-Mail-Adressen dürfen nicht als dauerhafter Identity Primary Key dienen.

---

# 11. Session-Sicherheit

P0:

```text
HTTP-only Cookies

Secure unter HTTPS

geeignete SameSite-Konfiguration

CSRF-Schutz, soweit erforderlich

Session Rotation

Session Expiration

Logout

keine Tokens in localStorage
```

Provider-Tokens werden nur gespeichert, wenn ein konkreter nachgelagerter Providerzugriff dies benötigt.

---

# 12. Unterstützte Rollen

P0:

```text
OWNER

MANAGER

READONLY
```

Architektonisch vorbereitet:

```text
TENANT
```

Die TENANT-Rolle wird fachlich jedoch erst in Step 20+ aktiviert.

---

# 13. OIDC Provider

Die Implementierung muss providerneutral sein.

Mindestens zwei standardkonforme Provider werden in Integrationstests geprüft.

Beispielsweise:

```text
Authentik

Keycloak
```

Andere Provider müssen funktionieren können, sofern sie standardkonformes OIDC implementieren.

Keine Mietfuchs-Fachlogik darf Authentik-spezifisch sein.

---

# 14. Local Mode

Local Mode bleibt ein vollwertiger Betriebsmodus.

Local Mode bedeutet insbesondere:

```text
einfache Installation

SQLite möglich

kein PostgreSQL-Server erforderlich

kein Cloud-Zwang

kein externer Mietfuchs-Dienst
```

OIDC-Unterstützung gehört trotzdem zum P0.

Für reine Einzelplatzinstallationen darf zusätzlich ein vereinfachter lokaler Authentifizierungsadapter existieren.

Dieser verwendet aber dieselbe interne Architektur:

```text
User

UserIdentity

Membership

Workspace
```

Es entsteht keine zweite Benutzerarchitektur.

---

# 15. Server-/Homelab-Mode

Für Server-, Homelab- und Mehrbenutzerbetrieb ist OIDC der reguläre Authentifizierungsweg.

Beispiel:

```text
Browser
  ↓
Reverse Proxy
  ↓
Mietfuchs
  ↓
OIDC Provider
```

Externer Internetzugriff ist kein Release-Kriterium.

Ein lokales LAN-/VPN-/Reverse-Proxy-Setup ist ausreichend.

---

# 16. Bestand und Immobilienmodell

P0:

```text
Workspace

Property

Building

Unit

Party

Ownership

Lease

LeaseParty

LeaseComponent

RentAdjustment

UnitUsePeriod
```

Grundstruktur:

```text
Property
  └── Building
        └── Unit
```

Ein `Property` bildet das wirtschaftlich verwaltete Immobilienobjekt.

Ein `Building` bildet ein physisches Gebäude.

Eine `Unit` bildet eine vermietbare oder anderweitig nutzbare Einheit.

---

# 17. Grundstücke / Flurstücke

Ein vollständiges Katastermodell ist kein P0.

Optional vorbereitet:

```text
LandParcel
  id
  propertyId
  cadastralDistrict?
  parcelNumber?
  areaM2?
  note?
```

Keine GIS-Funktion wird daraus abgeleitet.

---

# 18. Onboarding – P0

Der Nutzer darf beim Einstieg nicht das Domainmodell kennen müssen.

P0:

> **Onboarding & Setup-Assistent**

Beispiel:

```text
Welche Immobilien verwaltest Du?

Wie viele Gebäude?

Welche Einheiten?

Wer ist Eigentümer?

Welche Einheiten sind vermietet?

Wer sind die Mieter?

Wie hoch ist die aktuelle Miete?

Wie werden Betriebskosten vereinbart?

Gibt es Darlehen?

Ist eine Einheit Teil einer WEG?

Welche technischen Grundinformationen sind bekannt?
```

Progressive Disclosure ist verbindlich.

Nicht relevante Fachbereiche bleiben unsichtbar.

---

# 19. Geld – P0

P0:

```text
Charge

Payment

PaymentAllocation

Outstanding Projection

BankAccount

BankTransaction

CAMT Import

VendorInvoice

InvoiceLine

ExpenseRecord

ExpenseAllocation
```

Mietfuchs muss jeden Monat beantworten können:

```text
Was hätte eingehen müssen?

Was ist eingegangen?

Was fehlt?

Welche Zahlung ist ungeklärt?

Welche Rechnung ist noch nicht zugeordnet?
```

---

# 20. CAMT und Bankabgleich – P0

CAMT ist für kleine Vermieter wichtiger als ein eigener Zahlungsverkehr.

P0:

```text
camt.053

BankTransaction Import

Duplikatserkennung

Matching gegen Charges

Matching gegen Payments

Split-Zuordnung

ungeklärte Umsätze

manuelle Zuordnung

regelbasierte Vorschläge
```

Importe müssen idempotent sein.

---

# 21. Betriebskosten – P0

Die bestehende Kernkompetenz von Mietfuchs bleibt Release-Blocker.

P0:

```text
OperatingCostCategory

LeaseOperatingCostAgreement

Meter

MeterReading

Kosten

Belege

Umlageschlüssel

Zeiträume

Mieterwechsel

Leerstand

§35a

SettlementSnapshot

Settlement Lifecycle
```

---

# 22. Mietvertragliche Betriebskostenregel – P0

Umlagefähigkeit ist nicht gleich mietvertragliche Vereinbarung.

Es gilt:

```text
Kostenart
≠
gesetzliche abstrakte Umlagefähigkeit
≠
mietvertragliche Vereinbarung
≠
tatsächliche Kosten
≠
Verteilungsschlüssel
```

Mietfuchs dokumentiert deshalb die historische mietvertragliche Regel pro Lease.

---

# 23. Settlement Lifecycle – P0

Die Betriebskostenabrechnung endet nicht mit dem PDF.

Status:

```text
DRAFT

READY

FINALIZED

SENT

OBJECTED

CORRECTED

CLOSED
```

Eine versandte Abrechnung wird nicht überschrieben.

Ein Einwand referenziert immer die konkrete versandte Version.

---

# 24. Operational Core – P0

Der Operational Core ist ein zentrales Produktmerkmal.

P0:

```text
OperationalCase

Task

Deadline

Inbox

Domain Events
```

Die Startseite beantwortet:

> **Was muss ich tun?**

und nicht:

> Welche Tabelle möchte ich öffnen?

---

# 25. Keine zweiten Task-Systeme

Fachdomänen erzeugen keine eigenen Reminder- oder Aufgabenwelten.

Beispiele:

```text
Mietrückstand
→ Operational Core

Wartung fällig
→ Operational Core

Versicherungsvertrag kündbar
→ Operational Core

Zinsbindung läuft aus
→ Operational Core

Betriebskostenfrist
→ Operational Core
```

---

# 26. Einfaches Vermieter-Cockpit – P0

Issue Portfolio-Dashboard/Objekt-Cockpit wird fachlich geteilt.

P0 ist eine einfache Startseite.

Sie zeigt beispielsweise:

```text
Handlungsbedarf

Mietzahlungen

ungeklärte Bankumsätze

Betriebskosten

offene Aufgaben

laufende Fristen

Technik

Wartungen

Mieterwechsel

technischer Erhaltungsbedarf
```

Keine komplexe BI-Plattform.

---

# 27. Objekt-Cockpit – P0

Eine Objektseite beantwortet auf einer Seite:

```text
Wer wohnt hier?

Sind Mieten offen?

Was läuft bei den Betriebskosten?

Welche Verträge und Fristen gibt es?

Was ist technisch offen?

Welche Wartungen kommen?

Welche größeren Maßnahmen zeichnen sich ab?
```

---

# 28. Technischer Bestand – P0

M7 wird umbenannt in:

> **M7 – Technischer Bestand, Zustand, Mängel & Instandhaltung**

`TechnicalAsset` bleibt als interner Begriff bestehen.

UI:

> **Bauteile & Anlagen**

Ein TechnicalAsset kann sein:

```text
BUILDING_COMPONENT

TECHNICAL_SYSTEM

EQUIPMENT

EXTERNAL_ASSET

OTHER
```

---

# 29. Beispiele technischer Bestand

BUILDING_COMPONENT:

```text
Dach

Fassade

Fenster

Außentüren

Balkone

Kellerabdichtung

Treppen

Bodenbeläge
```

TECHNICAL_SYSTEM:

```text
Heizung

Warmwasser

Trinkwasser

Abwasser

Elektro

Lüftung

PV

Blitzschutz

Entwässerung
```

EQUIPMENT:

```text
Heizkessel

Wärmepumpe

Pumpe

Wechselrichter

Batteriespeicher

Hebeanlage

Aufzug
```

EXTERNAL_ASSET:

```text
Garage

Carport

Hof

Wege

Stützmauer

Zaun

Tor

Außenbeleuchtung
```

---

# 30. Technische Modellierungstiefe

Es gilt:

> **Nur so tief modellieren wie für Entscheidungen erforderlich.**

Zulässig:

```text
Fenster
24 Stück
Baujahr ungefähr 1998
```

Es ist nicht erforderlich:

```text
Fenster
Wohnung 1
Schlafzimmer
links
Flügel 1
Beschlag 2
```

Fehlende Detailtiefe darf normale Vermietungsprozesse niemals blockieren.

---

# 31. Unbekannte technische Daten

UNKNOWN ist ein vollwertiger fachlicher Zustand.

Zulässig:

```text
Baujahr unbekannt

Hersteller unbekannt

letzte Erneuerung unbekannt

Zustand unbekannt

Restlebensdauer unbekannt
```

Das System darf Hinweise erzeugen.

Es darf den Nutzer nicht zwingen, Wissen vorzutäuschen.

---

# 32. ConditionAssessment – P0

Der technische Zustand wird historisiert.

```text
ConditionAssessment
  technicalAssetId

  assessedAt
  assessedByPartyId?

  conditionGrade?
  urgency?

  summary?
  recommendation?

  remainingLifeMinYears?
  remainingLifeLikelyYears?
  remainingLifeMaxYears?

  source

  relatedDocumentIds[]
```

Neue Bewertungen überschreiben alte niemals.

---

# 33. Zustandsstufen

UI:

```text
Sehr gut

Gut

Beobachten

Handlungsbedarf

Kritisch

Unbekannt
```

Intern beispielsweise:

```text
1
2
3
4
5
UNKNOWN
```

Die Skala wird nicht als DIN-zertifiziert dargestellt.

---

# 34. Zustand und Dringlichkeit

Zustand und Dringlichkeit bleiben getrennt.

Ein altes Dach kann noch gut sein.

Eine neue Anlage kann akut defekt sein.

Urgency:

```text
NONE

OBSERVE

PLAN

SOON

IMMEDIATE
```

---

# 35. Ticket und Defect – P0

Ticket:

> Meldung oder Beobachtung.

Beispiel:

```text
An der Schlafzimmerwand ist Feuchtigkeit.
```

Defect:

> bestätigter technischer Mangel.

Beispiel:

```text
Undichtigkeit am Balkonanschluss oberhalb der Wohnung.
```

Ticket ≠ Defect.

---

# 36. Defect – P0

```text
Defect
  propertyId
  buildingId?
  unitId?
  technicalAssetId?

  sourceType
  sourceId?

  title
  description

  severity
  urgency

  detectedAt
  confirmedAt?

  status

  suspectedCause?
  confirmedCause?

  targetResolutionDate?

  acceptedRiskReason?

  resolvedAt?
  verifiedAt?
```

---

# 37. Defect Status

```text
OPEN

UNDER_REVIEW

CONFIRMED

PLANNED

IN_PROGRESS

RESOLVED

VERIFIED

ACCEPTED

CLOSED

REJECTED
```

`ACCEPTED` bedeutet:

> Der Mangel besteht weiter, wird aber bewusst akzeptiert.

Eine Begründung ist Pflicht.

---

# 38. WorkOrder – P0 technischer Grundworkflow

Ein WorkOrder bildet die tatsächliche Beauftragung.

```text
WorkOrder
  propertyId

  technicalAssetId?
  defectId?
  maintenanceDueId?
  capitalProjectId?

  vendorPartyId?

  title
  scope

  status

  orderedAt?
  plannedStartAt?
  plannedCompletionAt?

  completedAt?

  estimatedAmountCents?
  committedAmountCents?
```

Ein abgeschlossener WorkOrder schließt einen Defect nicht automatisch.

---

# 39. Wartung und Prüfungen – P0

Unterschieden werden:

```text
MAINTENANCE

INSPECTION

LEGAL_CHECK

FUNCTION_TEST

SERVICE
```

Beispiele:

```text
Heizungswartung

Rauchwarnmelderprüfung

Aufzugprüfung

Rückstausicherung

Trinkwasserprüfung

Dachkontrolle
```

Mietfuchs trifft keine automatische Rechtsentscheidung darüber, ob eine Prüfung gesetzlich vorgeschrieben ist.

---

# 40. MaintenancePlan – P0

Ein MaintenancePlan beschreibt eine wiederkehrende Regel.

Beispiele:

```text
jährliche Heizungswartung

Dachkontrolle alle zwei Jahre

wiederkehrende technische Prüfung
```

---

# 41. MaintenanceDue – P0

Aus einem MaintenancePlan entstehen konkrete Fälligkeiten.

```text
MaintenanceDue
  maintenancePlanId
  technicalAssetId

  dueDate
  warningDate?

  status

  taskId?
  deadlineId?
  workOrderId?
  maintenanceEventId?
```

Status:

```text
UPCOMING

DUE

OVERDUE

ORDERED

COMPLETED

WAIVED

CANCELLED
```

Eine alte Due-Instanz wird nicht auf den nächsten Termin überschrieben.

---

# 42. MaintenanceEvent – P0

Die tatsächliche Durchführung wird historisch dokumentiert.

```text
MaintenanceEvent
  technicalAssetId

  maintenancePlanId?
  maintenanceDueId?

  performedAt

  workOrderId?
  vendorInvoiceId?

  result

  notes?

  documentIds[]

  nextRecommendedAt?
```

Result:

```text
OK

OBSERVE

DEFECT_FOUND

FOLLOW_UP_REQUIRED

UNKNOWN
```

---

# 43. Lebensdauerannahmen

Mietfuchs darf typische technische Lebensdauerbereiche verwenden.

Sie bleiben Schätzungen.

```text
LifecycleAssumption

category

minYears?
likelyYears?
maxYears?

sourceType
sourceReference?
```

Quellen:

```text
SYSTEM_DEFAULT

USER_ESTIMATE

EXPERT_ASSESSMENT

DOCUMENT

MANUFACTURER

OTHER
```

Es darf niemals dargestellt werden:

> Ihre Heizung muss 2028 ersetzt werden.

wenn lediglich eine allgemeine statistische Annahme vorliegt.

---

# 44. LifecyclePlanItem – P0

Der einfache langfristige Erhaltungsblick gehört zu Mietfuchs Next 1.0.

`LifecyclePlanItem` ist deshalb nicht nur Schema-Vorbereitung, sondern Teil des P0-Produktkerns.

```text
LifecyclePlanItem
  propertyId
  buildingId?
  technicalAssetId?

  actionType

  title
  description?

  basis

  expectedFromYear?
  expectedLikelyYear?
  expectedToYear?

  estimatedCostLowCents?
  estimatedCostLikelyCents?
  estimatedCostHighCents?

  estimatePriceBaseYear?

  priority

  confidence

  status

  sourceConditionAssessmentId?
  sourceDefectId?
  lifecycleAssumptionId?

  capitalProjectId?

  deferredUntilYear?
  deferralReason?
```

---

# 45. Lifecycle Action Types

```text
OBSERVE

REPAIR

PARTIAL_RENEWAL

RENEW

REPLACE

MODERNIZE

INVESTIGATE

OTHER
```

---

# 46. Planungsgrundlage

```text
AGE

CONDITION

DEFECT

EXPERT_ASSESSMENT

LEGAL_REQUIREMENT

USER_PLAN

ECONOMIC_OPTIMIZATION

OTHER
```

---

# 47. Planungssicherheit

```text
LOW

MEDIUM

HIGH
```

Beispiel:

```text
Dach

Erneuerung:
2031–2035

Kosten:
50–70 T€

Sicherheit:
mittel

Basis:
Zustandsbewertung 2026
```

Scheinpräzision ist verboten.

---

# 48. Technischer 5-/10-Jahres-Forecast – P0

Mietfuchs Next 1.0 benötigt mindestens:

```text
5-Jahres-Horizont

10-Jahres-Horizont
```

20 Jahre dürfen als erweiterte Ansicht vorhanden sein.

Standardanzeige:

```text
Erwarteter technischer Kapitalbedarf

5 Jahre:
20–35 T€

10 Jahre:
70–110 T€
```

---

# 49. Keine komplexe Prognose in P0

Nicht P0:

```text
Monte-Carlo-Simulation

probabilistische Simulation

automatisches Ausfallmodell

komplexe Inflationsmodelle

automatische technische Diagnostik
```

Zeitfenster und Kostenbandbreiten reichen für V1.

---

# 50. Instandhaltungsrückstau

Es wird keine eigenständige manuell gepflegte `MaintenanceBacklog`-Entität angelegt.

Rückstau ist eine Projection.

Er kann sich ergeben aus:

```text
offenen bestätigten Defects

kritischen ConditionAssessments

überfälligen MaintenanceDue

überfälligen LifecyclePlanItems

bewusst verschobenen Maßnahmen

bekannten, nicht erledigten WorkOrders
```

---

# 51. Rückstau-Kennzahlen

Objektbezogen:

```text
offene technische Mängel

kritische Mängel

überfällige Wartungen

überfällige Prüfungen

verschobene Maßnahmen

geschätzter Rückstaubetrag
```

Der Rückstaubetrag ist immer als Schätzung zu kennzeichnen.

---

# 52. Keine „Instandhaltungsrücklage“

Bei vermieteten Objekten nennt Mietfuchs den technischen Forecast nicht:

```text
Instandhaltungsrücklage
```

sondern:

```text
Technischer Erhaltungsbedarf

Erwarteter Kapitalbedarf

Geplante Erhaltungsmaßnahmen
```

Eine echte WEG-Erhaltungsrücklage ist ein anderer Fachgegenstand.

---

# 53. Technische Historie

Die UI zeigt eine gemeinsame Timeline als Projection.

Beispiel:

```text
1984 Dach erstellt

2002 Teilsanierung

2026 Zustand: beobachten

2029 neue Prüfung

2031 Angebot

2032 Sanierung

2032 Zustand: sehr gut
```

Es entsteht keine zweite Timeline-Datenbank.

---

# 54. Lifetime Cost

Tatsächliche technische Kosten werden aggregiert.

Beispiel:

```text
Heizung

Wartung        3.420 €

Reparaturen    4.860 €

Erneuerungen  12.500 €

Gesamt         20.780 €
```

Geschätzte Kosten werden nicht mit tatsächlichen Kosten vermischt.

---

# 55. Technische Dokumente

Technische Fachobjekte referenzieren zentrale Documents.

Beispiele:

```text
Rechnung

Angebot

Bedienungsanleitung

Garantie

Prüfprotokoll

Wartungsbericht

Foto

Gutachten

Plan
```

Es entsteht keine zweite technische Dokumentenablage.

---

# 56. ServiceContract – P0

Laufende Objektverträge gehören zum Kern.

Beispiele:

```text
Wartungsvertrag

Gebäudeversicherung

Haus- und Grundbesitzerhaftpflicht

Messdienstvertrag

Hausmeistervertrag

Gartenpflege

Aufzugswartung

sonstiger objektbezogener Vertrag
```

Gespeichert werden mindestens:

```text
Vertragspartner

Beginn

Laufzeit

Kündigungsfrist

Verlängerung

nächster relevanter Termin

Dokumente
```

Vertragsfrist und technische Wartungsfrist bleiben getrennt.

---

# 57. Versicherung als Vertrag

Versicherungsverträge werden als Spezialisierung bzw. Typ von ServiceContract abgebildet.

Beispiele:

```text
Gebäudeversicherung

Haftpflicht

Elementarversicherung
```

---

# 58. Neue Lücke: InsuranceClaim – P1 hoch

Ein Versicherungsschaden ist nicht identisch mit einem Schadenersatzanspruch gegen einen Mieter.

Neues Fachobjekt:

```text
InsuranceClaim
  id

  workspaceId

  propertyId
  unitId?
  technicalAssetId?

  insurerPartyId?
  insuranceContractId?

  eventDate
  reportedAt?

  claimNumber?

  damageType
  description

  status

  estimatedDamageCents?
  acceptedAmountCents?
  paidAmountCents?

  deductibleCents?

  defectId?

  workOrderIds[]
  vendorInvoiceIds[]
  documentIds[]

  closedAt?
```

Beispiele:

```text
Leitungswasser

Sturm

Hagel

Gebäudeschaden

Haftpflichtschaden
```

Priorität:

> **P1 hoch**

Keine Versicherungs-ERP-Funktion wird daraus aufgebaut.

---

# 59. Mieterwechsel – P0 Lite

Der grundlegende Mietvertrags-Lifecycle gehört zum Core.

P0:

```text
Kündigung

MoveOutCase

Auszugstermin

einfache Inspection

Zählerstände

Feststellungen

DamageClaims

Kaution

Leerstand

MoveInCase
```

---

# 60. Inspection – P0 Lite / P1 Vollausbau

P0 benötigt eine einfache Übergabe-/Abnahmefunktion.

Sie kann erfassen:

```text
Räume

Feststellungen

Fotos

Zählerstände

Schlüsselanzahl

Teilnehmer
```

P1:

```text
vollständige mobile PWA

Offline-Entwurf

umfangreiche Signaturerfassung

komplexe Protokollvorlagen
```

---

# 61. Schlüsselverwaltung

Für P0 genügt:

```text
erwartete Schlüsselanzahl

übergeben

zurückgegeben

fehlend
```

Eine vollständige KeySet-/KeyItem-Historie ist:

> **P1**

---

# 62. DamageClaim

DamageClaim bezeichnet insbesondere einen Anspruch im Kontext eines Mietverhältnisses.

Beispiel:

```text
Beschädigung beim Auszug

→ DamageClaim

→ ggf. WorkOrder

→ VendorInvoice

→ Charge

→ DepositApplication
```

DamageClaim ≠ InsuranceClaim.

---

# 63. Kaution – P0

P0:

```text
vereinbarte Kaution

Fälligkeit

Eingang

aktueller Kautionssaldo

Auszug

Verrechnung

DepositApplication

Rückzahlung

Abschluss
```

Kaution ist niemals Mieterlös.

---

# 64. Kautionszins – P1

P1:

```text
detaillierte Zinsberechnung

komplexe Anlageformen

mehrere Kautionskonten

automatische Zinsbuchungen
```

Die Architektur muss eine spätere Erweiterung ermöglichen.

---

# 65. Forderungsmanagement

P0:

```text
offene Forderungen

überfällige Forderungen

Handlungsbedarf

manuell dokumentierte Zahlungserinnerung
```

P1:

```text
DunningCase

DunningAction

Mahnkosten

PaymentAgreement
```

P2:

```text
SEPA pain.008
```

---

# 66. Dokumente – P0

P0 benötigt ein zentrales Document-Modell.

Ein Document besitzt mindestens:

```text
Datei

Hash / Integrität

Typ

Datum

Objektbezug

Parteibezug

Fachobjektbezug

Metadaten
```

Ein Document darf existieren, ohne bereits einen Fachvorgang zu erzeugen.

---

# 67. Universal Document Inbox – P1 hoch

Der Dokumenteingang besitzt hohen praktischen Nutzwert.

Workflow:

```text
Dokument hochladen

→ Original speichern

→ Dokumenttyp vorschlagen

→ Objekt vorschlagen

→ Partei vorschlagen

→ Fachvorgang vorschlagen

→ Nutzer prüft

→ übernehmen
```

KI darf Vorschläge liefern.

KI darf Fachobjekte nicht ungeprüft buchen oder abschließen.

---

# 68. Externes DMS / Paperless

Mietfuchs baut keine vollständige OCR-/DMS-Plattform nach.

Optional kann später ein externes DMS eingebunden werden.

Mietfuchs bleibt Source of Truth für:

```text
fachlichen Dokumenttyp

Objektbezug

Mietvertragsbezug

Expense-Bezug

TechnicalAsset-Bezug

Tax-Bezug
```

Das externe DMS kann Source of Truth für:

```text
Dateispeicherung

OCR

Volltextindex

Dokumentenarchivierung
```

sein.

---

# 69. DocumentTemplate – P1

P1:

```text
DocumentTemplate

TemplateVersion

GeneratedDocument
```

Erzeugte Dokumente bleiben historisch unverändert.

Ein später geändertes Template verändert alte Dokumente nicht.

---

# 70. Correspondence / Delivery / Outbox – P1

P1:

```text
Correspondence

Delivery

Outbox

EMAIL

PRINT

MANUAL_HANDOVER

später PORTAL
```

Für P0 genügt die nachvollziehbare Dokumentation, dass ein relevanter Versand erfolgt ist.

---

# 71. Neuvermietung Lite – P1

P1:

```text
VacancyCase

Zielmiete

Prospect Lite

Besichtigung

Auswahl

neuer Lease

MoveInCase
```

Nicht Teil des Core:

```text
SCHUFA

automatische Bonität

ImmoScout Integration

Portal-Scraping

Makler-CRM
```

---

# 72. Steuerliche Grundentscheidung

Mietfuchs berechnet keine persönliche Einkommensteuer.

Mietfuchs bildet ausschließlich die vermietungsbezogene fachliche und steuerliche Ebene ab.

Zentrale Trennung:

```text
Accounting
≠
Tax
≠
persönliche Einkommensteuer
```

---

# 73. Tax Core – P0

P0:

```text
TaxEvent

Zufluss-/Abflussprinzip

Steuerjahr

AfA-Grundmodell

DepreciationPlan

bestehende AfA übernehmen

TaxSubject

Steuerpaket

Anlage-V-Vorschau

Belegindex

offene steuerliche Punkte
```

---

# 74. Eigentümeranteile / Feststellung – C0

Für Objekte mit mehreren Beteiligten:

```text
TaxSubject

OwnershipShare

Aufteilung steuerlicher Ergebnisse
```

Mietfuchs berechnet dabei nicht die persönliche Einkommensteuer des Beteiligten.

---

# 75. 15-%-Monitor – C0

Der Monitor wird nur aktiviert, wenn der Sachverhalt relevant ist.

Er überwacht anschaffungsnahe Herstellungskosten im einschlägigen Zeitraum.

Er darf keine persönliche Steuerberechnung erzeugen.

---

# 76. §82b – P1 / C0

Das Datenmodell muss steuerlich korrekt vorbereitet sein.

Ein komfortabler vollständiger Workflow zur Verteilung größeren Erhaltungsaufwands kann P1 sein.

---

# 77. Verbilligte Vermietung – C0

Die Funktion wird nur angezeigt, wenn sie aktiviert bzw. relevant ist.

Keine unnötige UI für normale marktübliche Mietverhältnisse.

---

# 78. WEG – C0

Mietfuchs wird kein WEG-Verwaltersystem.

Unterstützt wird jedoch die Perspektive des vermietenden Wohnungseigentümers.

C0:

```text
WEGAnnualStatement

Eigentümerabrechnung

Erhaltungsrücklage

Entnahmen

steuerlich relevante Zuordnung
```

WEG-Verwaltung selbst bleibt außerhalb des Scopes.

---

# 79. CO₂-Kostenaufteilung – C0

Wenn der Bestand einen relevanten Sachverhalt besitzt, muss Mietfuchs ihn fachlich korrekt unterstützen.

Beispiele:

```text
zentrale Wärmeversorgung

dezentrale Gasetagenheizung
```

Regeln werden versioniert.

Keine Magic Numbers im Fachcode.

---

# 80. Accounting

Die doppische Accounting-Schicht ist primär interne Integritätsarchitektur.

Sie ist kein sichtbares Hauptprodukt.

Der Standardnutzer sieht:

```text
Miete

Zahlung

Rechnung

Kaution

Darlehensrate

Erstattung

AfA
```

nicht:

```text
Soll

Haben

JournalLine

PostingRule

AccountingEvent
```

---

# 81. Accounting-Grundprinzip

Accounting darf fachlich belastbar sein.

Es soll aber nicht verhindern, dass Produkt-Slices früh nutzbar werden.

Accounting wird dort verpflichtend, wo es für:

```text
Datenintegrität

Periodenabschluss

Exports

Party Ledger

Tax-Abgrenzung
```

benötigt wird.

---

# 82. DATEV – P1

DATEV-Export ist nützlich, aber kein universeller P0-Workflow.

Priorität:

> **P1**

Das interne Datenmodell muss einen sauberen späteren Export ermöglichen.

---

# 83. Darlehen – P0-Datenmodell

Darlehen gehören zur Vermögens-/Finanzierungsdomäne.

Mindestens:

```text
Loan

Lender

Principal

Start

Rate

Interest

Repayment

Outstanding Principal

Property-/Use-Allocation
```

---

# 84. Neue Lücke: Zinsbindung und Refinanzierung

Das Loan-Modell wird ergänzt um:

```text
LoanRatePeriod
  loanId

  validFrom
  validTo?

  interestRate

  fixedRateUntil?

  noticeDeadline?

  expectedResidualDebtCents?

  refinancingReviewDate?

  note?
```

P0-Datenfelder:

```text
fixedRateUntil

refinancingReviewDate
```

P1-Workflow:

```text
Zinsbindung endet in 18 Monaten

voraussichtliche Restschuld:
148.000 €

→ Anschlussfinanzierung prüfen
```

Priorität:

> **P0 Datenmodell / P1 Workflow**

---

# 85. Technischer Forecast vs. Finanzforecast

Diese beiden Prognosen bleiben getrennt.

Technischer Forecast:

```text
5–20 Jahre

Zeitfenster

Kostenbandbreiten

geringere zeitliche Genauigkeit
```

Finanzforecast:

```text
12–36 Monate

Cash

Mieten

Darlehen

konkrete Maßnahmen

höhere zeitliche Genauigkeit
```

Sie werden erst verbunden, wenn eine technische Maßnahme ausreichend konkret ist.

---

# 86. CapitalProject – P1

Ein `LifecyclePlanItem` wird erst zu einem `CapitalProject`, wenn eine Maßnahme konkret geplant wird.

Beispiel:

```text
2026

Dach
voraussichtlich 2031–2035

↓

2030

Entscheidung:
Sanierung vorbereiten

↓

CapitalProject
Dachsanierung
```

---

# 87. CapitalProject Daten

P1:

```text
CapitalProject

LifecyclePlanItems

Defects

VendorQuotes

WorkOrders

VendorInvoices

Documents

TechnicalAssets
```

---

# 88. Estimate / Committed / Actual

Diese drei Ebenen bleiben immer getrennt.

```text
Estimate
= Erwartung

Committed
= beauftragt

Actual
= tatsächlich abgerechnet
```

Beispiel:

```text
Plan:
50–70 T€

Angebot:
63 T€

Auftrag:
61,5 T€

Actual:
64,28 T€
```

---

# 89. Komplexes Budget und Cashflow – P2

P2:

```text
mehrjährige detaillierte Budgets

komplexer Cashflow Forecast

Szenarien

Inflationssimulation

Finanzierungsoptimierung

mehrere Forecast-Versionen
```

Es gilt:

> **Werterhalt nach vorne, Finanzmodellierung nach hinten.**

---

# 90. Annual Completeness Check – P0

Der Jahresabschluss-Assistent beantwortet:

> **Sind meine Unterlagen für dieses Jahr vollständig?**

Bereiche:

```text
Mietforderungen

Bank

Rechnungen

Dokumente

Betriebskosten

Kaution

Darlehen

AfA

TaxEvents

WEG, soweit relevant

Technik
```

---

# 91. Technischer Jahrescheck

Der Annual Check enthält auch Technik.

Beispiel:

```text
✓ alle Rechnungen zugeordnet

✓ keine ungeklärten technischen Dokumente

⚠ Wartungsnachweis fehlt

⚠ Dachzustand seit fünf Jahren nicht bewertet
```

Technische Langfristplanung darf einen Steuerjahresabschluss jedoch niemals blockieren.

---

# 92. Objektcheck – P1 hoch

Ein jährlicher einfacher technischer Objektcheck ist sinnvoll.

Der Nutzer überprüft beispielsweise:

```text
Dach

Fassade

Fenster

Balkone

Keller

Heizung

Trinkwasser

Abwasser

Elektro

Außenanlagen
```

Pro Bereich zunächst nur:

```text
Zustand verändert?

neues Problem?

neue Maßnahme?
```

Nur Veränderungen müssen gespeichert werden.

---

# 93. Mobile Nutzung

P1:

```text
mobile Zustandsaufnahme

Foto

Notiz

Mangel

Zählerstand

Inspection
```

P1:

```text
Offline-Entwurf
```

Ein Vorgang gilt erst nach erfolgreicher Synchronisation als abgeschlossen.

---

# 94. Systemadministration – F0 Lite

Ein Self-Hoster muss erkennen können, ob das System grundsätzlich gesund ist.

F0 sichtbar:

```text
App-Version

DB erreichbar

Schema-Version

Storage erreichbar

freier Speicher

letztes Backup

letzter Restore-Test?

fehlgeschlagene Jobs

OIDC Status
```

P1:

> vollständiges Admin-Cockpit.

---

# 95. Backup und Restore – F0

Backup ist zwingend.

Ein Backup umfasst konsistent:

```text
Datenbank

Document Storage

Metadaten

Schema-/Versionsinformation
```

Ein Backup gilt erst dann als belastbar, wenn Restore getestet wurde.

---

# 96. Vollständiger Domain Export – P1

P1:

```text
versioniertes Domain Export Format

metadata.json

CSV

optional JSON

documents/
```

Das Format ist zugleich langfristige Exit-Strategie.

---

# 97. Backend-Wechsel

Ein Backend-Wechsel erfolgt über:

```text
Source DB

→ Domain Export

→ Validation

→ Target DB
```

Nicht über direkte SQL-Konvertierung.

---

# 98. Bestandsmigration – P0

Ein Nutzer muss zu einem Stichtag starten können.

P0 mindestens:

```text
Objekte

Einheiten

aktuelle Mieter

aktuelle Mietverträge

aktuelle Mieten

offene Forderungen

Kautionssaldo

Bank-Anfangsbestand

Darlehensrestschuld

AfA-Restwerte

offene steuerliche Verteilungsbeträge
```

Eine vollständige historische Rekonstruktion ist nicht notwendig.

---

# 99. Generischer CSV/XLSX Wizard – P1

Ein universeller Mapping-Wizard ist nützlich.

Er ist jedoch kein Release-Blocker.

P1:

```text
Upload

Mapping

Preview

Validierung

Dry Run

Fehlerliste

Import

Protokoll
```

---

# 100. P2-Backlog

Bewusst später:

```text
SEPA pain.008

OpenImmo

Portalintegrationen

externe E-Signatur

CalDAV

herstellerspezifische Meteradapter

vollständige OCR-/Volltextsuche im Core

Custom Fields

QR-Codes

NFC

IoT-Zustandsdaten

BIM

GIS

CAD

Bauteilkataloge

automatische technische Normenprüfung

professionelle Gebäudediagnostik

Materiallager

Ersatzteillager

Technikerplanung

SLA

komplexe Beschaffung
```

---

# 101. Step 20+ – Mieterportal

Das Mieterportal bleibt bewusst außerhalb von Next 1.0.

Gründe:

```text
externe Erreichbarkeit

Account Lifecycle

Passwort-/Identity-Recovery

Angriffsfläche

Rate Limiting

Security Monitoring

Betriebsverfügbarkeit

Datenschutz-/Permission-Komplexität
```

Die TENANT-Rolle und Permission-Architektur werden bereits vorbereitet.

---

# 102. Neu geordnete Meilensteine

## M1 – Foundation

```text
Architekturprinzipien

Invarianten

TypeScript Foundation

Shared Domain

Persistenz Foundation

SQLite + PostgreSQL

Repository Layer
```

---

## M2 – Sichere Migration

```text
db.json Import

Settlement Regression

Migrationstests
```

---

## M3 – Identity, Auth & Workspace Security

P0:

```text
Workspace

User

UserIdentity

Membership

Roles

Sessions

Permissions

OIDC

PKCE

Provider Tests

Workspace Isolation
```

---

## M4 – Kern-Domäne

```text
Party

Property

Building

Unit

Ownership

Lease

UnitUsePeriod

Onboarding
```

---

## M5 – Forderungen & Bank

```text
Charges

Payments

Open Items

CAMT

Bankabgleich
```

---

## M6 – Kosten & Klassifikation

```text
FinancialCategory

VendorInvoice

ExpenseRecord

ExpenseAllocation

LeaseOperatingCostAgreement
```

---

## M7 – Technischer Bestand, Zustand, Mängel & Instandhaltung

```text
TechnicalAsset

ConditionAssessment

Defect

MaintenancePlan

MaintenanceDue

MaintenanceEvent

WorkOrder Integration

Document Integration

Technik-Cockpit
```

LifecyclePlanItem Schema und einfache Nutzung werden bereits vorbereitet.

---

## M8 – Vermögen & Finanzierung

```text
Kaution

Loan

LoanUseAllocation

LoanRatePeriod

Erwerb

AcquisitionCostItem

PurchasePriceAllocation

DepreciableAsset

DepreciationPlan
```

---

## M9 – Accounting & Export

```text
AccountingEvent

Journal

Posting Rules

DATEV
```

DATEV selbst P1.

---

## M10 – Tax Layer

```text
TaxEvent

AfA

15-%-Monitor

§82b

TaxSubject

Eigentümeraufteilung

verbilligte Vermietung

WEGAnnualStatement

Zuschüsse

Steuerpaket
```

Konditionale Funktionen bleiben per Progressive Disclosure verborgen.

---

## M11 – Operational Core

```text
OperationalCase

Task

Deadline

Inbox

Calendar Projection
```

---

## M12 – Mietvertrags-Lifecycle & Dokumente

```text
MoveIn

MoveOut

Inspection Lite

DamageClaim

Key Count Lite

Document

Neuvermietung Lite P1

Document Inbox P1

Document Templates P1

Correspondence P1
```

---

## M13 – Forderungsmanagement

```text
Rückstandserkennung P0

DunningCase P1

PaymentAgreement P1

SEPA P2
```

---

## M14 – Objektbetrieb & Energie

```text
ServiceContract

Versicherungen

InsuranceClaim P1

VendorQuote P1

CO₂ C0

externe Heizkostenabrechnung P1
```

---

## M15 – Portfolio, langfristiger Erhaltungsbedarf & Planung

```text
einfaches Objekt-Cockpit P0

LifecyclePlanItem P0

5-/10-Jahres-Bedarf P0

Portfolio Dashboard P1

CapitalProject P1

Estimate / Committed / Actual P1

komplexes Budget P2

Cashflow Forecast P2
```

---

## M16 – Migration, Portabilität & Systembetrieb

```text
Stichtagsmigration P0

Backup P0/F0

Restore P0/F0

System Health P0/F0

Domain Export P1

generischer Import Wizard P1

Audit Trail
```

---

## M17 – Abrechnung & Jahresabschluss

```text
Settlement Lifecycle

Einwendungen

Annual Completeness Check
```

---

# 103. Release-Slices

Meilensteine bilden technische Struktur.

Released wird entlang vollständiger Nutzerprozesse.

---

## Slice A – Sicherer Bestand funktioniert

```text
Login

OIDC

Workspace

Property

Building

Unit

Party

Ownership

Lease

Onboarding
```

Erwartung:

> Ein Nutzer kann sich sicher anmelden und seinen Bestand vollständig einrichten.

---

## Slice B – Geld funktioniert

```text
Charges

Payments

CAMT

Open Items

VendorInvoice

ExpenseAllocation
```

Erwartung:

> Der Nutzer weiß, welche Mieten eingegangen sind und was fehlt.

---

## Slice C – Jahresabrechnung funktioniert

```text
Kosten

Zähler

LeaseOperatingCostAgreement

Settlement

Snapshot

Versandstatus

Einwand

Korrektur

Abschluss
```

---

## Slice D – Alltag funktioniert

```text
Inbox

Tasks

Deadlines

Documents

ServiceContracts

Technik

Defects

Wartung

Prüfungen
```

Erwartung:

> Der Nutzer weiß, was heute zu tun ist.

---

## Slice E – Mieterwechsel funktioniert

```text
Kündigung

MoveOut

Inspection Lite

Zähler

Schäden

Kaution

Leerstand

MoveIn
```

---

## Slice F – Steuerjahr funktioniert

```text
TaxEvents

AfA

TaxSubject

relevante C0-Funktionen

Steuerpaket

Annual Completeness Check
```

---

## Slice G – Betrieb funktioniert

```text
Migration

Backup

Restore

System Health

Auth Health

Portabilität
```

---

## Slice H – Das Gebäude bleibt beherrschbar

Slice H wird verbindlicher Teil des 1.0-Zielbilds.

```text
technische Grundstruktur

wesentliche Bauteile

Zustand

Defects

Wartungen

LifecyclePlanItems

5-/10-Jahres-Erhaltungsbedarf

spätere Maßnahme vorbereiten

Kostenhistorie
```

Erwartung:

> Der Nutzer erkennt größere technische Risiken, bevor sie überraschend zum akuten finanziellen Problem werden.

---

# 104. Empfohlene Implementierungsreihenfolge

Die technische Reihenfolge folgt Abhängigkeiten.

Empfohlen:

```text
1. Architektur-Foundation

2. Settlement-Regression

3. SQLite/PostgreSQL Repository Foundation

4. db.json Migration

5. Workspace / User / Membership

6. OIDC / Sessions / Permissions

7. Property / Party / Lease

8. Onboarding

9. Charges / Payments

10. CAMT

11. VendorInvoice / Expense

12. Betriebskosten-Domäne

13. Settlement Lifecycle

14. Operational Core

15. technischer P0-Core

16. einfaches Objekt-Cockpit

17. Lifecycle Lite / 10-Jahres-Bedarf

18. ServiceContracts / Vertragsfristen

19. Mieterwechsel / Kaution

20. Loan / Refinanzierungsdaten

21. Tax Core

22. konditionale Tax-Funktionen

23. Annual Completeness Check

24. Backup / Restore / System Health

25. P1-Erweiterungen
```

---

# 105. Explizite Hochstufungen

Gegenüber früheren Planungsständen werden höher priorisiert:

```text
Workspace/User/Membership
→ P0

OIDC
→ P0

Session-/Permission-System
→ P0

Workspace-Isolation
→ P0

einfaches Vermieter-Cockpit
→ P0

TechnicalAsset für Bauteile und Anlagen
→ P0

ConditionAssessment
→ P0

Defect
→ P0

MaintenanceDue
→ P0

LifecyclePlanItem
→ P0

einfacher 5-/10-Jahres-Erhaltungsbedarf
→ P0

Loan.fixedRateUntil
→ P0-Datenmodell

Loan.refinancingReviewDate
→ P0-Datenmodell

InsuranceClaim
→ P1 hoch
```

---

# 106. Explizite Herabstufungen

Nicht universelles P0:

```text
vollständige Schlüsselverwaltung
→ P1

vollständige mobile Offline-Inspection
→ P1

DocumentTemplate
→ P1

GeneratedDocument
→ P1

vollständige Correspondence-/Outbox-Schicht
→ P1

DunningCase
→ P1

PaymentAgreement
→ P1

generischer XLSX-Wizard
→ P1

vollständiger Domain Export
→ P1

vollständiges Admin-Cockpit
→ P1

DATEV
→ P1

komplexes CapitalProject
→ P1

komplexer Budget-Forecast
→ P2

SEPA pain.008
→ P2

Mieterportal
→ Step 20+
```

---

# 107. C0 – konditionale Fähigkeiten

Folgende Funktionen erscheinen nur, wenn sie relevant sind:

```text
WEG

mehrere Eigentümer

gesonderte Feststellung

§7b

15-%-Monitor

verbilligte Vermietung

CO₂

zentrale Heizkostenversorgung

Gasetagenheizung

PV

Aufzug

Darlehen
```

Progressive Disclosure ist verbindlich.

---

# 108. Prioritätsregel für neue Features

Ein neues Feature darf nur P0 werden, wenn mindestens eine der folgenden Fragen mit Ja beantwortet wird:

```text
Kann ohne die Funktion ein normaler Vermietungsprozess nicht abgeschlossen werden?

Kann das Fehlen regelmäßig zu erheblichem Geldverlust führen?

Kann das Fehlen regelmäßig zu relevanten Fristversäumnissen führen?

Ist die Funktion Voraussetzung für fachliche Korrektheit eines Kernprozesses?

Ist sie Voraussetzung für Datenintegrität?

Ist sie Voraussetzung für Sicherheit?

Ist sie Voraussetzung für Wiederherstellbarkeit?
```

---

# 109. P1-Regel

P1 ist angemessen, wenn:

```text
die Funktion erheblich Arbeit spart,

einen relevanten, aber selteneren Lebenszyklus abdeckt,

eine wichtige Eigentümerentscheidung unterstützt,

oder einen bestehenden P0-Prozess deutlich komfortabler macht.
```

---

# 110. P2-Regel

P2 ist angemessen, wenn:

```text
hauptsächlich Komfort entsteht,

ein seltener Integrationsfall bedient wird,

oder dieselbe Aufgabe außerhalb von Mietfuchs mit vertretbarem Aufwand erledigt werden kann.
```

---

# 111. UX-Grundsatz

Intern darf Mietfuchs komplex sein.

Extern nicht.

Beispiel Geld:

```text
intern:

Charge
Payment
PaymentAllocation
BankTransaction
AccountingEvent
TaxEvent
```

UI:

```text
1.050 € von Müller

✓ Aprilmiete

✓ Betriebskostenvorauszahlung
```

Beispiel Technik:

```text
intern:

TechnicalAsset
ConditionAssessment
LifecyclePlanItem
CapitalProject
```

UI:

```text
Dach

Beobachten

Sanierung ungefähr 2031–2035

50–70 T€
```

---

# 112. Navigation

Standardnavigation verwendet Begriffe, die private Vermieter verstehen.

Sichtbar beispielsweise:

```text
Übersicht

Objekte

Mieter

Finanzen

Betriebskosten

Dokumente

Aufgaben

Technik

Steuer
```

Nicht standardmäßig sichtbar:

```text
AccountingEvent

JournalEntry

Defect

MaintenanceDue

ConditionAssessment

LifecyclePlanItem

TaxEvent

ExpenseAllocation
```

---

# 113. Cockpit statt Modulportal

Die Startseite wird nicht als Sammlung von Modulen aufgebaut.

Sie zeigt primär:

```text
Was braucht Aufmerksamkeit?

Was ist überfällig?

Was ist ungeklärt?

Was steht bald an?

Welche größeren Risiken zeichnen sich ab?
```

---

# 114. Definition Mietfuchs Next 1.0

Mietfuchs Next 1.0 ist erreicht, wenn ein privater Vermieter mit einem typischen Bestand von bis ungefähr zwölf Einheiten ohne zusätzliche Verwaltungs-Excel-Liste zuverlässig beantworten kann:

```text
Kann ich mich sicher anmelden?

Sind meine Daten einem klaren Workspace zugeordnet?

Welche Objekte und Einheiten habe ich?

Wer mietet was?

Zu welchen Konditionen?

Welche Mieten sind fällig?

Welche Mieten sind eingegangen?

Welche Forderungen sind offen?

Welche Bankumsätze sind ungeklärt?

Welche Rechnungen und Kosten sind angefallen?

Sind meine Betriebskosten vollständig?

Welche Abrechnung wurde tatsächlich versandt?

Gibt es Einwendungen?

Was muss ich heute tun?

Welche Fristen laufen?

Welche Verträge muss ich beachten?

Was ist am Gebäude kaputt?

Welche technischen Mängel sind offen?

Welche Wartungen sind fällig?

Welche Bauteile muss ich beobachten?

Welche größeren technischen Maßnahmen kommen wahrscheinlich?

Wie hoch ist ungefähr der technische Erhaltungsbedarf der nächsten zehn Jahre?

Was passiert beim Auszug eines Mieters?

Welche Schäden bestehen?

Wie steht die Kaution?

Welche Darlehen bestehen?

Wann endet eine Zinsbindung?

Sind meine Unterlagen für das Steuerjahr vollständig?

Kann ich meine Daten sichern?

Kann ich sie wiederherstellen?
```

---

# 115. Technische Definition of Done 1.0

Zusätzlich gilt:

```text
OIDC funktioniert.

Mindestens zwei standardkonforme Provider sind getestet.

issuer/sub wird korrekt gebunden.

Workspace-Isolation ist getestet.

READONLY kann keine schreibenden Fachaktionen durchführen.

OWNER und MANAGER funktionieren gemäß Permission-Modell.

Sessions sind sicher.

Tokens liegen nicht in localStorage.

SQLite und PostgreSQL erzeugen identische Fachresultate.

Settlement Regression ist grün.

Backup ist möglich.

Restore ist getestet.

Domain-Invarianten sind automatisiert getestet.
```

---

# 116. Definition technischer Vollständigkeit

Die technische Gebäudedomäne gilt als ausreichend vollständig, wenn der Eigentümer ohne zusätzliche Excel-Liste beantworten kann:

```text
Was habe ich?

Was ist kaputt?

Was ist überfällig?

Was muss ich beobachten?

Was kommt wahrscheinlich in den nächsten Jahren?

Was habe ich geplant?

Was wurde beauftragt?

Was wurde gemacht?

Was hat es gekostet?

Welche Dokumente gehören dazu?
```

---

# 117. Zentrale Eigentümerfrage

Mietfuchs muss letztlich eine Frage beantworten:

> **Ist mit meinem Bestand im Wesentlichen alles in Ordnung – und welche fachlichen, technischen oder finanziellen Themen können mir später auf die Füße fallen?**

Diese Frage ist wichtiger als die Anzahl implementierter Module.

---

# 118. Keine zweite Wahrheit

Abgeleitete Größen werden nicht redundant manuell gepflegt.

Beispiele:

```text
aktueller Zustand
=
jüngstes gültiges ConditionAssessment

offene Forderungen
=
Charges minus Payments/Allocations

nächste Wartung
=
MaintenanceDue

Lifetime Cost
=
tatsächliche Expenses / Invoices

technischer Rückstau
=
Projection

10-Jahres-Bedarf
=
LifecyclePlanItems
```

---

# 119. Keine stille Löschung

Fachhistorie wird nicht gelöscht, wenn sie Grundlage späterer Entscheidungen war.

Stattdessen:

```text
archivedAt

CANCELLED

REJECTED

REPLACED

DECOMMISSIONED
```

mit Begründung, soweit fachlich erforderlich.

---

# 120. Audit Trail

Mindestens auditierbar:

```text
Login-relevante Security Events

Membership geändert

Rolle geändert

TechnicalAsset geändert

ConditionAssessment angelegt

Defect bestätigt

Defect ACCEPTED

Defect geschlossen

MaintenanceDue waived

LifecyclePlanItem verschoben

CapitalProject erzeugt

WorkOrder abgeschlossen

Settlement finalisiert

Settlement versandt

Accounting Period geschlossen

Tax-relevante Korrekturen
```

---

# 121. KI-Grundsatz

Lokale oder externe KI darf Vorschläge erzeugen.

Beispiele:

```text
Dokument klassifizieren

Rechnung erkennen

technischen Hinweis erkennen

Asset vorschlagen

Expense-Kategorie vorschlagen

Tax-Kategorie vorschlagen
```

KI darf niemals ungeprüft:

```text
Geld buchen

Settlement finalisieren

Defect schließen

TaxEvent verbindlich erzeugen

technischen Zustand verändern

rechtliche Pflicht feststellen
```

---

# 122. Integrationsgrundsatz

Mietfuchs integriert externe Systeme dort, wo deren Nachbau keinen Mehrwert bringt.

Beispiele:

```text
OIDC Provider
für Identity

Paperless-ngx
optional für DMS/OCR

Ollama
optional für lokale KI

externe Heizkostenabrechner
für spezialisierte Verbrauchsabrechnung
```

Mietfuchs bleibt Source of Truth für seine Fachdomäne.

---

# 123. Upstream-Grundsatz

Architekturentscheidungen sollen Rückführung nach Upstream nicht unnötig verhindern.

Änderungen werden möglichst klassifiziert als:

```text
A – allgemein upstreamfähig

B – upstreamfähig mit Abstraktion

C – Mietfuchs-Next-spezifisch
```

Generische Verbesserungen wie:

```text
Tests

TypeScript-Härtung

Abrechnungsfehler

Persistenzabstraktion

Import/Export-Verbesserungen
```

sollen möglichst unabhängig von der erweiterten Vermieter-Domäne upstreamfähig bleiben.

---

# 124. Performance-Grundsatz

Für 1–12 Einheiten wird nicht auf Enterprise-Massendaten optimiert.

Die Architektur darf trotzdem nicht künstlich auf zwölf Einheiten begrenzt sein.

Ziel:

```text
mehrere tausend TechnicalAssets

mehrere zehntausend BankTransactions

langjährige Dokumenthistorie

langjährige Kostenhistorie
```

müssen ohne grundlegenden Architekturwechsel möglich sein.

Keine Microservices sind dafür erforderlich.

---

# 125. Schlussentscheidung zum Scope

Mit dieser Spezifikation gilt die große fachliche Gap-Analyse für Mietfuchs Next als abgeschlossen.

Neue große Domänen werden für Mietfuchs Next 1.0 grundsätzlich nicht mehr aufgenommen.

Neue Anforderungen werden zunächst gegen bestehende generische Fachobjekte geprüft:

```text
Document

Task

Deadline

OperationalCase

Party

ServiceContract

TechnicalAsset

ConditionAssessment

Defect

MaintenancePlan

LifecyclePlanItem

CapitalProject

Charge

Payment

ExpenseRecord

TaxEvent

Loan
```

Ein neues Fachobjekt wird nur eingeführt, wenn der Sachverhalt mit dem vorhandenen Modell nicht fachlich sauber abgebildet werden kann.

---

# 126. Produktentwicklungsregel ab jetzt

Die Leitfrage der Entwicklung lautet nicht mehr:

> **Was fehlt Mietfuchs noch?**

sondern:

> **Wie bringen wir die vorhandene Domäne in möglichst wenigen vollständigen Nutzerprozessen zuverlässig zum Laufen?**

Neue Features werden deshalb primär durch reale End-to-End-Szenarien legitimiert.

---

# 127. Endgültiges Produktziel

Mietfuchs Next soll nicht das funktionsreichste Immobilienprogramm sein.

Es soll für einen privaten Vermieter das System sein, in dem er mit möglichst wenig Verwaltungsarbeit zuverlässig erkennt:

```text
Was ist?

Was fehlt?

Was ist offen?

Was muss ich tun?

Was kommt als Nächstes?

Was kommt in einigen Jahren?
```

Die Facharchitektur darf dafür tief sein.

Die Oberfläche darf es nicht sein.

> **Mietfuchs Next ist fachlich solide genug für viele Jahre Bestandshistorie – und einfach genug, dass ein privater Vermieter es tatsächlich benutzt.**
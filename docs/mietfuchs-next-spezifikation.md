# Mietfuchs Next – vollständige technische Spezifikation

**Stand:** 30.08.2026  
**Ziel:** Weiterentwicklung von `speedone/mietfuchs` zu einer lokal/self-hosted betreibbaren, fachlich sauberen Hausverwaltungsanwendung für private Vermieter in Deutschland.  
**Schwerpunkte:** Mietverwaltung, Betriebskostenabrechnung, technische Administration, Bank/CAMT, Steuer-/AfA-Auswertung, SKR03-V+V-basierte Vergleichbarkeit, optional doppisches Journal, PostgreSQL und OIDC.

---

## 0. Executive Summary

Mietfuchs besitzt bereits einen für private deutsche Vermieter ungewöhnlich wertvollen Kern: eine lokale Anwendung mit Nebenkostenabrechnung, Mietkonto, Anlage-V-orientierter Auswertung, Zähler-/Verbrauchslogik und cent-genauer Verteilung. Der bestehende Code ist jedoch als kleine Einzelplatzanwendung aufgebaut: JSON-Datei als Persistenz, keine echte Benutzer-/Rechteverwaltung, kein relationales Domänenmodell, keine technische Objektverwaltung und keine robuste Buchhaltungs-/Bankebene.

Die Weiterentwicklung soll **kein ERPNext-Klon** werden. Stattdessen werden aus ERPNext/PropMS, HaVeWa, LeaseBook, MicroRealEstate und dem historischen DATEV-SKR97 die Architekturprinzipien übernommen, die für einen kleinen privaten Vermieter wirklich wertvoll sind:

1. **Fachobjekt und Buchung trennen.**
2. **Konto beantwortet „was?“, Dimension beantwortet „wo?“**
3. **Person, Mietvertrag, Zahlung, Forderung und Eigentum getrennt modellieren.**
4. **Technische Anlage und steuerliches Wirtschaftsgut trennen, aber verknüpfen.**
5. **Banktransaktion ist nicht Zahlung; Rechnung ist nicht Aufwand; Kaution ist nicht Ertrag; Tilgung ist nicht Aufwand.**
6. **SKR03 V+V dient als standardisierte Finanz-Taxonomie und Export-/Vergleichsschicht, nicht als Domänenmodell.**
7. **Betriebskostenrechtliche, steuerliche, technische und finanzielle Klassifikation bleiben getrennt.**
8. **Abgeschlossene/gebuchte Vorgänge sind unveränderlich; Korrekturen erfolgen durch Gegenbuchung bzw. neuen Snapshot.**
9. **Die bestehende Abrechnungsengine bleibt zunächst unangetastet und wird über einen Repository-/Snapshot-Layer gespeist.**
10. **Alle Geldbeträge werden weiterhin als Integer-Cent behandelt.**

Die empfohlene Zielarchitektur ist ein modularer Monolith:

```text
React/Vite UI
     │
Express/TypeScript API
     │
Domain Services
     │
Repositories
     │
PostgreSQL
     │
┌─────────────────────────────────────────────────────────┐
│ Domain                                                 │
│ Property / Unit / Lease / Party                        │
│ TechnicalAsset / Maintenance / Ticket                  │
│ VendorInvoice / Charge / Payment / BankTransaction     │
│ Loan / Deposit / Acquisition / DepreciableAsset        │
└─────────────────────────────────────────────────────────┘
     │
┌─────────────────────────────────────────────────────────┐
│ Classification                                         │
│ FinancialCategory                                      │
│ OperatingCostCategory                                  │
│ TaxTreatment                                           │
│ TechnicalCategory                                      │
│ Property / Unit / TechnicalAsset dimensions            │
└─────────────────────────────────────────────────────────┘
     │
┌─────────────────────────────────────────────────────────┐
│ Accounting                                             │
│ AccountingEvent                                        │
│ JournalEntry / JournalLine                             │
│ ChartOfAccounts / Account / AccountMapping             │
└─────────────────────────────────────────────────────────┘
     │
     ├── Reports / Anlage-V-Auswertung
     ├── DATEV Export
     └── Betriebs-/Nebenkostenabrechnung
```

---

# 1. Ausgangslage Mietfuchs

Repository: `speedone/mietfuchs`

Wesentliche vorhandene Stärken:

- React 19 + Vite + TypeScript im Client.
- Express/ESM im Server.
- lokale Speicherung ohne Cloudzwang.
- Docker-Unterstützung.
- cent-genaue Betriebskostenverteilung.
- Verteilungsschlüssel Fläche, Personen, Einheiten, Zähler, direkt.
- Mietzeiträume und anteilige Abrechnung.
- Personenverläufe und Vorauszahlungspläne.
- Soll-/Ist-Mietkonto.
- FIFO-Zahlungszuordnung.
- Zählerstände, Interpolation und Zählerwechsel-Logik.
- §35a-Anteile.
- Anlage-V-orientierter Steuerreport.
- Settlement-Snapshots/Fixierung.
- optionale lokale Ollama-Belegauswertung.
- `calc.js` als weitgehend deterministischer fachlicher Rechenkern.
- Geldbeträge als Integer-Cent.
- UTC-/Zeitraumkonventionen bereits dokumentiert.
- `CLAUDE.md` als gute Grundlage für KI-gestützte Entwicklung.

Wesentliche technische Schulden:

- Persistenz in einer einzelnen JSON-Datei.
- keine relationale Integrität.
- keine echten DB-Migrationen.
- kein Benutzer-/Rollen-/Mandantenmodell.
- keine OIDC-Authentifizierung.
- globale Settings implizieren faktisch ein einzelnes Haus.
- `Tenancy` enthält Personendaten direkt.
- keine Party-/Eigentümerstruktur.
- kein eigener Rechnungs-/Kreditorenprozess.
- Banktransaktionen und Zahlung nicht sauber getrennt.
- keine technische Anlagenverwaltung.
- keine Wartungspläne/-historie.
- kein Darlehensmodell.
- Kaution nur rudimentär.
- kein Anlagen-/AfA-Modell.
- kein revisionssicheres Journal.
- keine standardisierte Finanz-Taxonomie/Kontenrahmenzuordnung.

---

# 2. Erkenntnisse aus anderen Systemen

## 2.1 ERPNext

ERPNext bestätigt drei zentrale Architekturprinzipien:

### Kontenrahmen und Dimensionen

ERPNext trennt Konten von `Accounting Dimensions`. Das Konto beschreibt den wirtschaftlichen Vorgang; Dimensionen ergänzen den Kontext, ohne den Kontenrahmen zu vervielfachen.

Für Mietfuchs:

```text
Konto / FinancialCategory:
  Instandhaltung

Dimensionen:
  Property = Haus A
  Unit = EG
  TechnicalAsset = Gastherme EG
```

Nicht:

```text
Instandhaltung Haus A
Instandhaltung Haus B
Instandhaltung Haus A EG
...
```

### Fachbeleg erzeugt Buchungswirkung

In ERPNext erzeugen Sales Invoice, Purchase Invoice, Payment Entry, Asset Depreciation usw. die GL-Wirkung. Der Anwender arbeitet primär mit dem Geschäftsvorgang, nicht mit einer freien Journalbuchung.

Das soll Mietfuchs übernehmen:

```text
VendorInvoice
  ↓
AccountingEvent
  ↓
JournalEntry
```

### Doppelte Buchführung als Integritätsmechanismus

ERPNext nutzt Double Entry durchgängig. Für Mietfuchs ist das nicht zwingend wegen gesetzlicher Buchführungspflicht erforderlich, aber sehr wertvoll für:

- offene Mieterforderungen,
- Lieferantenverbindlichkeiten,
- Kautionen,
- Darlehen,
- Bankabgleich,
- AfA,
- nachvollziehbare Stornos.

---

## 2.2 PropMS auf ERPNext/Frappe

PropMS zeigt, welche Immobilienobjekte in einem ERP typischerweise hinzukommen:

- Property
- Property Unit
- Lease
- Lease Item
- Lease Invoice Schedule
- Lease Increment Rule
- Meter / Meter Reading
- Exit
- Maintenance/Job-Card-Verknüpfungen
- Security Deposit
- Schlüssel-/Tool-Verwaltung

Zu übernehmen:

- klare Trennung Property / Unit / Lease,
- Mieterhöhung als eigenes historisiertes Ereignis,
- Zähler als eigene Entität,
- Wartung als operative Domäne,
- Integration von Immobilie in Finanz-/Kostenstellenlogik.

Nicht übernehmen:

- Rent als ERP-Item,
- Sales Orders,
- Lager-/Stock-Logik,
- Beschaffungs-/ERP-Ballast,
- HR- und Payroll-Kontext.

---

## 2.3 HaVeWa

HaVeWa ist fachlich eine sehr gute deutsche Referenz, aber wegen fehlender klarer Open-Source-Lizenz **keine sichere Codebasis**.

Besonders wertvolle Modellideen:

- `Property → Building → Unit`
- `Person` getrennt von `Lease`
- `Lease` mit mehreren `Renter`
- `RentComponent`
- `RentAdjustment`
- `Deposit`
- `Charge`
- `Payment`
- `Account`
- `Meter / MeterReading`
- `Ticket`
- `MaintenanceContract`
- Dokumente
- Betriebskosten / WEG / Rücklagen / Versicherungen

Nicht 1:1 übernehmen:

- `PersonType = MIETER/EIGENTUEMER/HANDWERKER/...`, weil eine Person mehrere Rollen gleichzeitig haben kann.
- `Tenant` als Bezeichnung für Softwaremandant, da Tenant in der Domäne zugleich „Mieter“ bedeutet.

---

## 2.4 LeaseBook

LeaseBook ist vor allem als Accounting-Referenz interessant.

Zu übernehmen:

- echtes Double-Entry-Journal,
- ein einziger kontrollierter Posting-Pfad,
- Storno über Gegenbuchung,
- Accounting Periods,
- append-only Audit-Gedanke,
- Deposits/Prepayments nicht als Ertrag behandeln,
- Owner-/Property-/Tenant-Ledger sauber trennen,
- kontinuierliche Invariantentests.

Wichtigste Lehre:

> Ein gebuchter Vorgang darf nicht rückwirkend durch Änderung seines Ursprungsdatensatzes seine finanzielle Wirkung verändern.

---

## 2.5 MicroRealEstate

Zu übernehmen:

- getrennte Owner-/Tenant-Sichten,
- Lease / Payment / Document als getrennte Domänen,
- Self-Hosting/Docker,
- rollenbezogene UI.

Nicht übernehmen:

- schwerere Microservice-Struktur für nur wenige Einheiten.

---

## 2.6 Historischer DATEV SKR97

Der SKR97 ist **keine aktuelle Basis** mehr, aber als Ideenquelle wertvoll, weil er private Vermögensverwaltung einschließlich Vermietung modelliert hat.

Nützliche Konzepte:

- Immobilienvermögen,
- Grund und Boden,
- Gebäude,
- Wohnungen,
- Garagen,
- Forderungen gegen Mieter,
- Bankkonten,
- Kapitalschulden,
- Mietkautionen,
- Lieferantenverbindlichkeiten,
- Mieterträge,
- Betriebskosten,
- Erhaltungsaufwand,
- Fremdkapitalzinsen,
- Abschreibungen.

Daraus folgt:

Mietfuchs darf nicht nur Einnahmen/Ausgaben speichern, sondern muss auch **Bestände** abbilden:

- Forderungen,
- Verbindlichkeiten,
- Kautionen,
- Darlehenssaldo,
- Anlagen-/AfA-Werte.

---

# 3. Architekturprinzipien und Invarianten

Diese Regeln sind verbindlich und sollen in `AGENTS.md`/`CLAUDE.md` aufgenommen werden.

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
21. JournalEntry ≠ TaxEvent (Anlage V/Steuerreport nur aus TaxEvents, nie direkt aus dem Journal — siehe §82)
```

---

# 4. Mandanten-, Nutzer- und Eigentumsmodell

## 4.1 Workspace

`Workspace` ist die technische Sicherheits-/Mandantengrenze.

```prisma
model Workspace {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
}
```

`Workspace` ist **nicht** zwingend Eigentümer oder steuerlicher Rechtsträger.

---

## 4.2 User und Membership

```prisma
model User {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  identities UserIdentity[]
  memberships Membership[]
}

model UserIdentity {
  id        String @id @default(cuid())
  userId    String
  issuer    String
  subject   String
  email     String?
  name      String?

  @@unique([issuer, subject])
}

model Membership {
  id          String @id @default(cuid())
  workspaceId String
  userId      String
  role        WorkspaceRole

  @@unique([workspaceId, userId])
}
```

Rollen:

```text
OWNER
MANAGER
READONLY
TENANT
```

`TENANT` ist für ein späteres Mieterportal vorgesehen.

---

# 5. OIDC / OAuth

Für menschlichen Login wird **OpenID Connect über OAuth 2.0 Authorization Code Flow mit PKCE** verwendet.

Mietfuchs ist OIDC Client, kein eigener OAuth Authorization Server.

Empfohlene Provider:

- Authentik
- Keycloak
- andere standardkonforme OIDC-Provider

Konfiguration:

```env
OIDC_ISSUER=
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=
OIDC_REDIRECT_URI=
SESSION_SECRET=
```

Regeln:

- Identität über `(issuer, sub)` binden.
- E-Mail niemals als unveränderlichen Primary Identity Key verwenden.
- Access-/Refresh-Token nicht in `localStorage`.
- HTTP-only Session Cookie.
- `Secure` unter HTTPS.
- `SameSite=Lax` oder strenger soweit kompatibel.
- `state`, `nonce`, PKCE verpflichtend.
- Reverse Proxy korrekt vertrauen.
- lokales Logout löscht Session.
- optional RP-Initiated Logout beim IdP.
- Provider-Token nach Login nur speichern, wenn für weitere Provider-APIs wirklich nötig.

---

# 6. Party-Modell

Globale Rolle nicht in Person speichern.

```prisma
model Party {
  id          String @id @default(cuid())
  workspaceId String
  type        PartyType
  displayName String
}

enum PartyType {
  NATURAL_PERSON
  LEGAL_ENTITY
}
```

Personendetails:

```prisma
model NaturalPerson {
  partyId   String @id
  firstName String
  lastName  String
}

model LegalEntity {
  partyId String @id
  name    String
}
```

Rollen entstehen durch Relationen:

- `LeaseParty`
- `Ownership`
- `VendorRelationship`
- `Loan.lenderPartyId`

Eine Person kann dadurch zugleich Eigentümer, Mieter und Dienstleister sein.

---

# 7. Immobilienmodell

```text
Workspace
  └── Property
        └── Building
              └── Unit
```

## Property

```prisma
model Property {
  id          String @id @default(cuid())
  workspaceId String
  name        String
  street      String?
  postalCode  String?
  city        String?
  countryCode String @default("DE")
  createdAt   DateTime @default(now())
}
```

## Building

Optional, aber von Anfang an vorhanden:

```prisma
model Building {
  id         String @id @default(cuid())
  propertyId String
  name       String
}
```

## Unit

```prisma
model Unit {
  id          String @id @default(cuid())
  buildingId  String
  label       String
  type        UnitType
  areaM2      Decimal @db.Decimal(10,2)
  rooms       Decimal? @db.Decimal(4,1)
  participates Boolean @default(true)
}
```

Typen:

```text
APARTMENT
COMMERCIAL
PARKING
GARAGE
STORAGE
OTHER
```

---

# 8. Ownership

Eigentum ist unabhängig von Workspace/User.

```prisma
model Ownership {
  id         String @id @default(cuid())
  propertyId String
  partyId    String
  validFrom  DateTime
  validTo    DateTime?
  shareNumerator Int
  shareDenominator Int
}
```

Damit sind z. B. 50/50-Eigentum oder Eigentümerwechsel historisierbar.

---

# 9. Mietvertrag

```prisma
model Lease {
  id        String @id @default(cuid())
  unitId    String
  startDate DateTime
  endDate   DateTime?
  status    LeaseStatus
  signedAt  DateTime?
  notes     String?
}
```

## LeaseParty

```prisma
model LeaseParty {
  id       String @id @default(cuid())
  leaseId  String
  partyId  String
  role     LeasePartyRole
  validFrom DateTime
  validTo   DateTime?
}
```

Rollen:

```text
TENANT
CO_TENANT
GUARANTOR
OTHER
```

Mehrere gemeinsame Mieter sind damit nativ abbildbar.

---

# 10. Mietbestandteile

```prisma
model LeaseComponent {
  id         String @id @default(cuid())
  leaseId    String
  type       LeaseComponentType
  amountCents BigInt
  validFrom  DateTime
  validTo    DateTime?
}
```

Typen:

```text
BASE_RENT
OPERATING_COST_ADVANCE
HEATING_COST_ADVANCE
PARKING
GARAGE
MODERNIZATION
OTHER
```

Jede Änderung ist historisiert.

---

# 11. Mietanpassungen

```prisma
model RentAdjustment {
  id            String @id @default(cuid())
  leaseId       String
  type          RentAdjustmentType
  effectiveDate DateTime
  previousCents BigInt
  newCents      BigInt
  indexBase     Decimal?
  indexNew      Decimal?
  status        AdjustmentStatus
  note          String?
}
```

Typen:

```text
INDEX
STEP
AGREEMENT
OTHER
```

---

# 12. Forderungen, Zahlungen und offene Posten

## Charge

Eine Sollstellung ist ein persistierter Geschäftsvorgang.

```prisma
model Charge {
  id           String @id @default(cuid())
  leaseId      String
  type         ChargeType
  period       DateTime
  dueDate      DateTime
  amountCents  BigInt
  description  String?
  status       PostingStatus
}
```

Typen:

```text
BASE_RENT
OPERATING_COST_ADVANCE
HEATING_COST_ADVANCE
SETTLEMENT
DEPOSIT_CLAIM
OTHER
```

Wichtig:

Eine erzeugte und gebuchte `Charge` wird **nicht automatisch geändert**, wenn später der Vertrag geändert wird.

---

## Payment

```prisma
model Payment {
  id          String @id @default(cuid())
  partyId     String?
  date        DateTime
  amountCents BigInt
  bankTransactionId String?
}
```

---

## PaymentAllocation

```prisma
model PaymentAllocation {
  id          String @id @default(cuid())
  paymentId   String
  chargeId    String
  amountCents BigInt

  @@unique([paymentId, chargeId])
}
```

Offener Saldo wird berechnet:

```text
Charge.amount
- SUM(PaymentAllocation.amount)
- adjustments
= outstanding
```

Kein redundantes frei editierbares `outstandingBalance`.

---

# 13. Bank und CAMT

## BankAccount

```prisma
model BankAccount {
  id          String @id @default(cuid())
  workspaceId String
  name        String
  iban        String?
  bic         String?
  currency    String @default("EUR")
  accountMappingId String?
}
```

## BankTransaction

```prisma
model BankTransaction {
  id           String @id @default(cuid())
  bankAccountId String
  externalId    String?
  bookingDate   DateTime
  valueDate     DateTime?
  amountCents   BigInt
  currency      String
  counterpartyName String?
  counterpartyIban String?
  purpose       String?
  rawReference  String?
  importHash    String

  @@unique([bankAccountId, importHash])
}
```

## CAMT

Unterstütztes Primärformat:

```text
camt.053
```

Zielprozess:

```text
CAMT Import
   ↓
BankTransaction
   ↓
Matching
   ├── Payment
   ├── VendorInvoice settlement
   ├── LoanTransaction
   └── unresolved
```

Banktransaktion und Zahlung bleiben getrennt.

---

# 14. Lieferanten und Rechnungen

## VendorInvoice

```prisma
model VendorInvoice {
  id            String @id @default(cuid())
  workspaceId   String
  vendorPartyId String
  invoiceNumber String?
  invoiceDate   DateTime
  dueDate       DateTime?
  totalCents    BigInt
  currency      String @default("EUR")
  status        InvoiceStatus
}
```

## InvoiceLine

```prisma
model InvoiceLine {
  id          String @id @default(cuid())
  invoiceId   String
  description String
  amountCents BigInt
}
```

## ExpenseAllocation

Schlüsseltabelle der Auswertungsarchitektur:

```prisma
model ExpenseAllocation {
  id                      String @id @default(cuid())
  invoiceLineId           String
  amountCents             BigInt

  financialCategoryId     String
  operatingCostCategoryId String?
  taxTreatmentId          String?

  propertyId              String
  unitId                  String?
  technicalAssetId        String?

  serviceFrom             DateTime?
  serviceTo               DateTime?

  labor35aCents           BigInt?
}
```

Damit kann eine Rechnungsposition gleichzeitig sagen:

- wirtschaftlich: Gebäudeversicherung,
- mietrechtlich: umlagefähige Versicherung,
- steuerlich: Werbungskosten,
- Objekt: Haus A,
- Einheit: optional,
- Technik: optional,
- §35a-Anteil: optional.

---

# 15. Zeitdimensionen einer Rechnung

Nicht vermischen:

```text
invoiceDate     = Rechnungsdatum
dueDate         = Fälligkeit
serviceFrom/To  = Leistungszeitraum
postingDate     = Buchungsdatum
paymentDate     = Zahlungsdatum
```

Diese Daten können auseinanderfallen und sind für Steuer, Abrechnung und Bank unterschiedlich relevant.

---

# 16. Technische Administration

## TechnicalAsset

```prisma
model TechnicalAsset {
  id              String @id @default(cuid())
  workspaceId     String
  propertyId      String
  unitId          String?
  parentAssetId   String?

  category        TechnicalAssetCategory
  name            String
  manufacturer    String?
  model           String?
  serialNumber    String?

  installedAt     DateTime?
  commissionedAt  DateTime?
  decommissionedAt DateTime?
  warrantyUntil   DateTime?

  notes           String?
}
```

Hierarchie:

```text
PV-Anlage
  ├── Wechselrichter
  ├── Speicher
  └── Module

Heizsystem EG
  ├── Gastherme
  └── Regler
```

---

## Ticket

Ein Problem / eine Meldung.

```prisma
model Ticket {
  id               String @id @default(cuid())
  propertyId       String
  unitId           String?
  technicalAssetId String?
  reportedByPartyId String?
  title            String
  description      String?
  priority         TicketPriority
  status           TicketStatus
  createdAt        DateTime @default(now())
  closedAt         DateTime?
}
```

---

## WorkOrder

Ein konkreter Auftrag.

```prisma
model WorkOrder {
  id               String @id @default(cuid())
  ticketId         String?
  technicalAssetId String?
  vendorPartyId    String?
  description      String
  orderedAt        DateTime?
  scheduledAt      DateTime?
  completedAt      DateTime?
  status           WorkOrderStatus
}
```

---

## MaintenancePlan

```prisma
model MaintenancePlan {
  id               String @id @default(cuid())
  technicalAssetId String
  name             String
  intervalMonths   Int?
  nextDueAt        DateTime?
  active           Boolean @default(true)
}
```

---

## MaintenanceEvent

```prisma
model MaintenanceEvent {
  id               String @id @default(cuid())
  technicalAssetId String
  maintenancePlanId String?
  workOrderId      String?
  performedAt      DateTime
  vendorPartyId    String?
  notes            String?
  invoiceId        String?
}
```

Damit können präventive Wartung und Reparaturhistorie getrennt ausgewertet werden.

---

# 17. TechnicalAsset vs. steuerliches Asset

`TechnicalAsset` beschreibt, **was technisch existiert**.

`DepreciableAsset` beschreibt, **was steuerlich/finanziell aktiviert und abgeschrieben wird**.

Nicht jedes TechnicalAsset ist ein eigenes steuerliches Wirtschaftsgut.

Verknüpfung:

```text
TechnicalAsset
     │ optional
     ↓
Capitalization
     ↓
DepreciableAsset
```

---

# 18. Erwerb und Kaufpreisaufteilung

## Acquisition

```prisma
model Acquisition {
  id                  String @id @default(cuid())
  propertyId          String
  acquisitionDate     DateTime
  purchasePriceCents  BigInt
  incidentalCostsCents BigInt
}
```

## AcquisitionAllocation

```prisma
model AcquisitionAllocation {
  id            String @id @default(cuid())
  acquisitionId String
  assetClass    AssetClass
  amountCents   BigInt
}
```

Typen:

```text
LAND
BUILDING
GARAGE
EQUIPMENT
OTHER
```

Grund und Boden wird getrennt vom Gebäude geführt und nicht abgeschrieben.

---

# 19. AfA

## DepreciableAsset

```prisma
model DepreciableAsset {
  id                    String @id @default(cuid())
  workspaceId           String
  propertyId            String
  technicalAssetId      String?
  assetClass            AssetClass
  acquisitionDate       DateTime
  depreciationStartDate DateTime
  basisCents            BigInt
  usefulLifeMonths      Int
  method                DepreciationMethod
  active                Boolean @default(true)
}
```

## DepreciationSchedule

```prisma
model DepreciationSchedule {
  id                  String @id @default(cuid())
  assetId             String
  periodStart         DateTime
  periodEnd           DateTime
  depreciationCents   BigInt
  postedJournalEntryId String?
}
```

---

# 20. Darlehen

## Loan

```prisma
model Loan {
  id                     String @id @default(cuid())
  workspaceId            String
  propertyId             String?
  lenderPartyId          String
  name                   String
  originalPrincipalCents BigInt
  startDate              DateTime
  maturityDate           DateTime?
  annualInterestRate     Decimal?
  datevAccountId         String?
}
```

## LoanTransaction

```prisma
model LoanTransaction {
  id                String @id @default(cuid())
  loanId            String
  bankTransactionId String?
  date              DateTime
  type              LoanTransactionType
  amountCents       BigInt
}
```

Typen:

```text
DISBURSEMENT
PRINCIPAL_PAYMENT
INTEREST
FEE
SPECIAL_REPAYMENT
ADJUSTMENT
```

Eine Kreditrate wird zwingend in Tilgung, Zins und ggf. Gebühren zerlegt.

---

# 21. Kaution

## Deposit

```prisma
model Deposit {
  id                  String @id @default(cuid())
  leaseId             String
  requiredAmountCents BigInt
  depositType         DepositType
  bankAccountId       String?
}
```

## DepositTransaction

```prisma
model DepositTransaction {
  id          String @id @default(cuid())
  depositId   String
  date        DateTime
  type        DepositTransactionType
  amountCents BigInt
}
```

Typen:

```text
RECEIPT
PARTIAL_RECEIPT
INTEREST
WITHHOLDING
REFUND
ADJUSTMENT
```

Kaution ist niemals Mietertrag.

---

# 22. Zähler und Zählerinstallation

## Meter

```prisma
model Meter {
  id           String @id @default(cuid())
  workspaceId  String
  type         MeterType
  serialNumber String?
  manufacturer String?
  model        String?
}
```

## MeterInstallation

```prisma
model MeterInstallation {
  id          String @id @default(cuid())
  meterId     String
  propertyId  String
  unitId      String?
  installedAt DateTime
  removedAt   DateTime?
}
```

## MeterReading

```prisma
model MeterReading {
  id          String @id @default(cuid())
  meterId     String
  date        DateTime
  value       Decimal @db.Decimal(14,3)
  source      MeterReadingSource
}
```

Der Zählerwechsel ist damit explizit historisiert.

---

# 23. Dokumente

Dateiinhalt bleibt im Filesystem/Object Storage, Metadaten in PostgreSQL.

```prisma
model Document {
  id           String @id @default(cuid())
  workspaceId  String
  filename     String
  mimeType     String
  sha256       String
  storageKey   String
  documentDate DateTime?
  category     DocumentCategory
  createdAt    DateTime @default(now())
}
```

Keine polymorphe `entityType/entityId`-Relation ohne Foreign Keys.

Stattdessen explizite Linktabellen:

```text
DocumentInvoiceLink
DocumentLeaseLink
DocumentAssetLink
DocumentTicketLink
DocumentPropertyLink
DocumentPartyLink
```

---

# 24. Finanzklassifikation

## FinancialCategory

Eigene stabile Mietfuchs-Taxonomie.

Beispiele:

```text
ASSETS
  LAND
  BUILDING
  BUILDING_EQUIPMENT
  TECHNICAL_EQUIPMENT

RECEIVABLES
  TENANT_RECEIVABLE

LIABILITIES
  VENDOR_PAYABLE
  TENANT_DEPOSIT
  LOAN_PAYABLE

INCOME
  RESIDENTIAL_RENT
  COMMERCIAL_RENT
  GARAGE_RENT
  OPERATING_COST_ADVANCE
  OPERATING_COST_SETTLEMENT
  OTHER_RENTAL_INCOME

OPERATING_COSTS
  PROPERTY_TAX
  HEATING
  HOT_WATER
  CHIMNEY
  GAS
  COMMON_ELECTRICITY
  WATER
  STAIR_CLEANING
  PROPERTY_INSURANCE
  STREET_CLEANING
  SEWER
  WASTE
  ELEVATOR
  OTHER_OPERATING_COST

MAINTENANCE
  BUILDING_MAINTENANCE
  TECHNICAL_MAINTENANCE
  OTHER_MAINTENANCE

FINANCING
  LOAN_INTEREST
  FINANCING_COST
  BANK_FEES

ADMINISTRATION
  LEGAL_ADVICE
  ACCOUNTING
  PROPERTY_MANAGEMENT
  OTHER_ADMINISTRATION

DEPRECIATION
  BUILDING_DEPRECIATION
  OTHER_ASSET_DEPRECIATION
```

---

# 25. Betriebskostenklassifikation

Separate Tabelle:

```prisma
model OperatingCostCategory {
  id                    String @id
  code                  String @unique
  name                  String
  defaultRecoverable    Boolean
  defaultAllocationKey  AllocationKey?
}
```

Beispiele:

```text
PROPERTY_TAX
WATER
SEWER
WASTE
COMMON_ELECTRICITY
CHIMNEY
INSURANCE
CLEANING
ELEVATOR
GARDEN
OTHER
```

Umlagefähigkeit ist konfigurierbar und darf nicht allein aus dem SKR-Konto abgeleitet werden.

---

# 26. Steuerklassifikation

```prisma
model TaxTreatment {
  id            String @id
  code          String @unique
  name          String
}
```

Startwerte:

```text
IMMEDIATE_EXPENSE
CAPITALIZE
DEPRECIATION
NON_DEDUCTIBLE
PARTIALLY_DEDUCTIBLE
DISTRIBUTED_MAINTENANCE
PRIVATE
```

Anlage-V-Mapping separat versionierbar.

---

# 27. Chart of Accounts

## Versionierung

```prisma
model ChartOfAccounts {
  id          String @id @default(cuid())
  code        String
  name        String
  version     String
  validFrom   DateTime
  validTo     DateTime?
  sourceUrl   String?
  accounts    Account[]

  @@unique([code, version])
}
```

Initial:

```text
code: DATEV_SKR03_VV
name: DATEV SKR 03 Vermietung und Verpachtung
version: 2026
validFrom: 2026-01-01
```

## Account

```prisma
model Account {
  id            String @id @default(cuid())
  chartId       String
  accountNumber String
  name          String
  accountType   AccountType
  active        Boolean @default(true)

  @@unique([chartId, accountNumber])
}
```

---

# 28. AccountMapping

Ein `FinancialCategory` darf nicht starr genau ein DATEV-Konto enthalten.

```prisma
model AccountMapping {
  id                  String @id @default(cuid())
  financialCategoryId String
  chartId             String
  accountId           String
  validFrom           DateTime
  validTo             DateTime?
  context             Json?
  sourceReference     String?
  verified            Boolean @default(false)
}
```

`context` kann später unterscheiden:

- steuerfrei,
- umsatzsteuerpflichtig,
- teilweise abzugsfähig,
- Objekt-/Gesellschaftskontext,
- Sonderfall des Steuerberaters.

---

# 29. DATEV SKR03 V+V 2026 – Seed-/Mappingtabelle

## 29.1 Grundsatz

Quelle ist der aktuelle DATEV **SKR 03 Vermietung und Verpachtung, Stand Januar 2026**. Der Rahmen ist sechsstellig und erweitert SKR03 um V+V-Sachverhalte.

**Wichtig:** Die folgenden Nummern sind Seed-/Default-Mappings. Bei einer produktiven DATEV-Exportfunktion muss der Seeder automatisiert bzw. per Review gegen die jeweils gültige DATEV-Version geprüft werden. Kein Fachcode darf auf Kontonummern verzweigen.

### Einnahmen

| FinancialCategory | DATEV-Konto 2026 | Verwendung |
|---|---:|---|
| RESIDENTIAL_RENT | 810500 | Mieteinnahmen Wohnungen / steuerfreie Wohnraumvermietung |
| COMMERCIAL_RENT | 810600 | andere Räume, steuerfreie Vermietung |
| GARAGE_RENT | 810690 | Garage/Stellplatz im steuerfreien V+V-Kontext, sofern passend |
| OPERATING_COST_ADVANCE | 810800 | laufende Neben-/Betriebskosten |
| OPERATING_COST_SETTLEMENT | 810850 | NK-Nachzahlung/-Erstattung |
| RELATED_PARTY_RESIDENTIAL_RENT | 802000 | Vermietung an Angehörige |
| RELATED_PARTY_OPERATING_COST | 802500 | laufende NK Angehörigenvermietung |

**Hinweis:** Umsatzsteuerpflichtige Vermietungen benötigen andere Kontenbereiche. Für typische private Wohnraumvermietung werden diese nicht Default.

### Betriebskosten / laufende Aufwendungen

| FinancialCategory | DATEV-Konto | Bedeutung |
|---|---:|---|
| PROPERTY_TAX | 237500 | Grundsteuer |
| HEATING | 423000 | Heizung |
| HOT_WATER | 423100 | Warmwasser |
| CHIMNEY | 423200 | Schornsteinreinigung |
| UTILITIES_COMBINED | 424000 | Gas, Strom, Wasser |
| GAS | 424100 | Gas |
| COMMON_ELECTRICITY | 424200 | Hausbeleuchtung / Strom |
| WATER | 424300 | Wasserversorgung |
| STAIR_CLEANING | 425000 | Treppenreinigung |
| INSURANCE_GENERAL | 436000 | Versicherungen |
| PROPERTY_INSURANCE | 436600 | Versicherungen für Gebäude |
| STREET_CLEANING | 439100 | Straßenreinigung |
| SEWER | 439200 | Entwässerung |
| ELEVATOR | 480500 | Fahrstuhl |
| WASTE | 496900 | Müllabfuhr |

### Instandhaltung

| FinancialCategory | DATEV-Konto | Bedeutung |
|---|---:|---|
| TECHNICAL_MAINTENANCE | 480000 | Reparaturen/Instandhaltung technische Anlagen/Maschinen |
| MAINTENANCE_DIRECT_DEDUCTIBLE | 480100 | Erhaltungsaufwand voll abziehbar/direkt zugeordnet |
| BUILDING_MAINTENANCE | 480150 | Reparaturen/Instandhaltung Bauten – Default |
| OTHER_TECHNICAL_MAINTENANCE | 480550 | sonstige Anlagen/BGA |
| OTHER_MAINTENANCE | 480900 | sonstige Reparaturen/Instandhaltung |

### Verwaltung / sonstige Werbungskosten

| FinancialCategory | DATEV-Konto | Bedeutung |
|---|---:|---|
| LEGAL_ADVICE | 495000 | Rechts-/Beratungskosten |
| ACCOUNTING | 495500 | Buchführungskosten |
| BANK_FEES | 497000 | Nebenkosten Geldverkehr |
| CUSTODY_FEE | 497100 | Verwahrentgelt |
| OTHER_ADMINISTRATION | 498000 | sonstige Werbungskosten |
| PROPERTY_MANAGEMENT | 499700 | Verwaltungskosten |

### Anlagen / Bestandswerte

| Kategorie | DATEV-Konto | Bedeutung |
|---|---:|---|
| LAND | 008500 | Grundstückswerte eigener bebauter Grundstücke |
| BUILDING | 014000 | Wohnbauten |
| GARAGE_ASSET | 014500 | Garagen |
| OUTDOOR_FACILITIES | 014600 | Außenanlagen |
| BUILDING_EQUIPMENT | 014800 | Einrichtungen für Wohnbauten |
| TECHNICAL_EQUIPMENT | 020000 / 024000 | technische Anlagen/Maschinen je Kontext |
| OTHER_EQUIPMENT | 030000 | andere Anlagen/BGA |

### Abschreibung

| FinancialCategory | DATEV-Konto |
|---|---:|
| BUILDING_DEPRECIATION | 483100 |
| OTHER_ASSET_DEPRECIATION | 483000 |

### Banken

SKR03 enthält Bankkonten u. a.:

```text
120000 Bank
121000 Bank 1
122000 Bank 2
123000 Bank 3
124000 Bank 4
125000 Bank 5
```

Mietfuchs ordnet BankAccount optional einem DATEV-Konto zu. Keine Nummer ist hart als „Hauskonto“ definiert.

### Kaution

Für vom Vermieter erhaltene Kautionen:

```text
173200 Erhaltene Kautionen
173300 Erhaltene Kautionen – Restlaufzeit bis 1 Jahr
173400 Erhaltene Kautionen – Restlaufzeit 1 bis 5 Jahre
173500 Erhaltene Kautionen – Restlaufzeit > 5 Jahre
```

Default:

```text
TENANT_DEPOSIT → 173200
```

### Darlehen / Kreditinstitute

Je Buchungskontext stehen u. a. zur Verfügung:

```text
063000 Verbindlichkeiten gegenüber Kreditinstituten
063100 Restlaufzeit bis 1 Jahr
064000 Restlaufzeit 1–5 Jahre
065000 Restlaufzeit >5 Jahre

170500 Darlehen
170600 Darlehen – Restlaufzeit bis 1 Jahr
170700 Darlehen – Restlaufzeit 1–5 Jahre
170800 Darlehen – Restlaufzeit >5 Jahre
```

Kein universelles Konto wird fest verdrahtet; `Loan.datevAccountId` bzw. AccountMapping ist konfigurierbar.

### Zinsen

Default für typische langfristige Immobilienfinanzierung:

```text
LOAN_INTEREST → 212000
```

Die konkrete Verwendung ist gegen den Kontenplan/Steuerberater abzugleichen.

### Forderungen / Verbindlichkeiten

Mietfuchs führt offene Posten fachlich über `Charge`, `PaymentAllocation` und `VendorInvoice`.

DATEV-Kontierung ist konfigurierbar; keine einzelne Debitoren-/Kreditorennummer wird als kanonische Fachidentität verwendet.

---

# 30. Warum SKR03 V+V nicht das Domänenmodell ist

SKR-Konto beantwortet:

> Was ist dies finanzwirtschaftlich?

Dimensionen beantworten:

> Wo ist es angefallen?

Betriebskostenklassifikation beantwortet:

> Ist und wie ist es mietrechtlich umlagefähig?

Steuerklassifikation beantwortet:

> Wie wird es steuerlich behandelt?

Technik beantwortet:

> Welche Anlage / welches Bauteil war betroffen?

Beispiel:

```text
Rechnung: Wartung Gastherme EG, 180 EUR

FinancialCategory:
  TECHNICAL_MAINTENANCE

DATEV:
  480000

Property:
  Haus A

Unit:
  EG

TechnicalAsset:
  Gastherme EG

OperatingCostCategory:
  ggf. HEATING/CHIMNEY/etc. nur wenn sachlich passend

TaxTreatment:
  IMMEDIATE_EXPENSE

§35a:
  Arbeitskostenanteil separat
```

Diese Achsen dürfen nicht zusammenfallen.

---

# 31. AccountingEvent

Der fachliche Geschäftsvorgang bleibt Source of Truth.

```prisma
model AccountingEvent {
  id          String @id @default(cuid())
  workspaceId String
  type        AccountingEventType
  sourceType  String
  sourceId    String
  occurredAt  DateTime
  postedAt    DateTime?
}
```

Mögliche Typen:

```text
RENT_CHARGE
OPERATING_COST_CHARGE
RENT_PAYMENT
VENDOR_INVOICE
VENDOR_PAYMENT
DEPOSIT_RECEIPT
DEPOSIT_REFUND
LOAN_DISBURSEMENT
LOAN_PAYMENT
DEPRECIATION
ADJUSTMENT
REVERSAL
```

---

# 32. Doppisches Journal

## JournalEntry

```prisma
model JournalEntry {
  id           String @id @default(cuid())
  workspaceId  String
  eventId      String @unique
  postingDate  DateTime
  status       JournalStatus
  reversalOfId String?
  createdAt    DateTime @default(now())
}
```

## JournalLine

```prisma
model JournalLine {
  id          String @id @default(cuid())
  entryId     String
  accountId   String
  debitCents  BigInt @default(0)
  creditCents BigInt @default(0)
}
```

Invariant:

```text
SUM(debitCents) = SUM(creditCents)
```

Das Journal kann für einen einfachen Nutzer vollständig unsichtbar bleiben.

---

# 33. Typische Buchungslogik

## Mietforderung

```text
Charge:
Kaltmiete 850 EUR
```

Accounting:

```text
Soll  Forderung Mieter   850
Haben Mietertrag         850
```

## Zahlung

```text
Bank +850
```

Accounting:

```text
Soll  Bank               850
Haben Forderung Mieter   850
```

## Kaution

```text
Bank +2.400
```

Accounting:

```text
Soll  Bank                     2.400
Haben Kautionsverbindlichkeit  2.400
```

Kein Mietertrag.

## Darlehensrate

```text
Bank -1.500
davon:
  900 Tilgung
  600 Zins
```

Accounting:

```text
Soll Darlehensverbindlichkeit  900
Soll Zinsaufwand               600
Haben Bank                    1500
```

Tilgung ist kein Aufwand.

---

# 34. Unveränderlichkeit / Revisionsprinzip

Wenn ein JournalEntry `POSTED` ist:

Nicht mehr ändern:

- Betrag
- Konto
- Posting Date
- Source
- Lines

Korrektur:

```text
Original Entry
   ↓
Reversal Entry
   ↓
Corrected Entry
```

Analog:

Ein abgeschlossener `SettlementSnapshot` bleibt unverändert.

---

# 35. Betriebskostenengine

Die bestehende Berechnungsengine wird nicht auf PostgreSQL-Datensätze umgeschrieben.

Ziel:

```text
PostgreSQL
   ↓
Repository Layer
   ↓
SettlementInput Snapshot
   ↓
bestehender / refaktorierter Calc Core
   ↓
SettlementResult
   ↓
Snapshot / PDF
```

Input:

```text
SettlementInput
  period
  units
  tenancies
  person histories
  areas
  costs
  advance payments
  meter consumption
```

Output:

```text
SettlementResult
  statements
  landlord shares
  §35a
  warnings
  checksums
  rounding details
```

---

# 36. Besondere Heizkosten-/CO₂-Situation

Bei Wohnungen mit eigener Gasetagenheizung und eigenem Gasliefervertrag des Mieters entfällt regelmäßig die klassische gebäudeweite Heizkostenverteilung der Zentralheizung.

Das System sollte deshalb Heizkostenmodule modular halten:

```text
OperatingCosts Core
CO2Allocation
Optional CentralHeating/HeizkostenV module
```

`CO2Allocation` soll unabhängig testbar sein.

---

# 37. API-Grenzen

Empfohlen:

```text
/api/v1/workspaces
/api/v1/properties
/api/v1/units
/api/v1/parties
/api/v1/leases
/api/v1/charges
/api/v1/payments
/api/v1/bank-transactions
/api/v1/vendor-invoices
/api/v1/technical-assets
/api/v1/tickets
/api/v1/maintenance
/api/v1/loans
/api/v1/deposits
/api/v1/assets
/api/v1/settlements
/api/v1/reports
/api/v1/accounting
```

Alle Mutationen validieren Request-Schemas über Zod.

---

# 38. Shared Domain Package

Server sollte auf TypeScript migriert werden.

Empfohlene Struktur:

```text
packages/
  domain/
    src/
      money.ts
      dates.ts
      schemas/
      settlement/
      accounting/
      classifications/

apps/
  server/
  client/
```

Gemeinsame Zod-Schemas dienen:

- Runtime Validation,
- TypeScript-Typen,
- API-Vertrag,
- Tests.

Client-Typen sind nicht länger alleinige Wahrheit.

---

# 39. PostgreSQL / Prisma

Empfohlen:

```text
PostgreSQL 17
Prisma
```

Warum PostgreSQL trotz nur weniger Wohnungen:

- relationale Integrität,
- Foreign Keys,
- Transaktionen,
- Auth/Multiuser,
- Open Items,
- eindeutige Bankimporte,
- saubere Migrationshistorie,
- Reporting,
- Backups,
- zukünftige Erweiterbarkeit.

Nicht wegen Datenmenge.

---

# 40. Docker-Zielbild

```yaml
services:
  app:
    # React build + Express API

  postgres:
    image: postgres:17
    volumes:
      - postgres_data:/var/lib/postgresql/data

  ollama:
    # optional
```

Dateien:

```text
uploads/
```

im Volume/Object Storage; PostgreSQL speichert nur Metadaten und SHA-256.

OIDC Provider bleibt extern oder optional in separatem Stack.

---

# 41. Migration von db.json

Einmaliger Importer:

```text
db.json
  ↓
validator
  ↓
migration mapping
  ↓
PostgreSQL
  ↓
domain snapshot
  ↓
existing calc engine
```

Migrationsanforderung:

> Für dieselben historischen Eingangsdaten muss das Ergebnis der Abrechnung vor und nach Migration cent-genau identisch sein.

---

# 42. Teststrategie

## 42.1 Ebenen

1. Domain Unit Tests
2. Repository Tests
3. Database Constraint Tests
4. Accounting Invariant Tests
5. Settlement Regression Tests
6. Integration Tests
7. API Tests
8. Auth/Permission Tests
9. E2E Tests
10. Seed-/Mappingtests

---

# 43. Testfälle – Mietforderungen

## T01 Wohnraummiete

Given:

```text
BASE_RENT = 850 EUR
```

When:

```text
September charge generated
```

Then:

```text
amountCents = 85000
FinancialCategory = RESIDENTIAL_RENT
DATEV mapping = 810500
```

---

## T02 Nebenkostenvorauszahlung

Given:

```text
BASE_RENT = 850
OPERATING_COST_ADVANCE = 200
```

Expected:

```text
Charge A: 850 → RESIDENTIAL_RENT → 810500
Charge B: 200 → OPERATING_COST_ADVANCE → 810800
```

Nicht nur ein unstrukturierter 1.050-EUR-Posten.

---

## T03 Betriebskostennachzahlung

Given:

```text
Settlement result = 143.27 EUR Nachzahlung
```

Expected:

```text
Charge amount = 14327
FinancialCategory = OPERATING_COST_SETTLEMENT
Default DATEV = 810850
```

---

# 44. Testfälle – SKR-Mapping

Parametrisierter Test:

```text
PROPERTY_TAX           → 237500
HEATING                → 423000
HOT_WATER              → 423100
CHIMNEY                → 423200
UTILITIES_COMBINED     → 424000
GAS                    → 424100
COMMON_ELECTRICITY     → 424200
WATER                  → 424300
STAIR_CLEANING         → 425000
INSURANCE_GENERAL      → 436000
PROPERTY_INSURANCE     → 436600
STREET_CLEANING        → 439100
SEWER                  → 439200
ELEVATOR               → 480500
WASTE                  → 496900

TECHNICAL_MAINTENANCE  → 480000
BUILDING_MAINTENANCE   → 480150
OTHER_MAINTENANCE      → 480900

LEGAL_ADVICE            → 495000
ACCOUNTING              → 495500
BANK_FEES               → 497000
PROPERTY_MANAGEMENT     → 499700

BUILDING_DEPRECIATION   → 483100
OTHER_ASSET_DEPRECIATION → 483000

RESIDENTIAL_RENT        → 810500
OPERATING_COST_ADVANCE  → 810800
OPERATING_COST_SETTLEMENT → 810850

TENANT_DEPOSIT          → 173200
LOAN_INTEREST           → 212000
```

Unknown category:

```text
Expected: validation error
```

Kein stilles Mapping auf „Sonstige“.

---

# 45. Test Betriebskosten vs. DATEV

## T20 Verwaltungskosten

Given:

```text
FinancialCategory = PROPERTY_MANAGEMENT
amount = 500 EUR
```

Expected:

```text
DATEV account = 499700
```

und unabhängig:

```text
operatingCostCategory = NULL
recoverable = false
```

Damit wird geprüft:

> Finanzklassifikation darf niemals Umlagefähigkeit implizieren.

---

# 46. Test Rechnungsaufteilung

## T30 Handwerkerrechnung

Invoice:

```text
1.190 EUR
```

Lines:

```text
A Wartung Therme 238 EUR
B Austausch Pumpe 952 EUR
```

Beispielklassifikation:

```text
A:
  FinancialCategory = TECHNICAL_MAINTENANCE
  TaxTreatment = IMMEDIATE_EXPENSE

B:
  TaxTreatment = CAPITALIZE
  TechnicalAsset = Pump
```

Erwartung:

- Invoice total = Sum InvoiceLines.
- ExpenseAllocations = vollständig.
- aktivierte Position erscheint nicht automatisch als sofortiger Erhaltungsaufwand.
- FinancialCategory und TaxTreatment bleiben getrennt.

---

# 47. Test Darlehen

## T40 Rate

BankTransaction:

```text
-1.500 EUR
```

Loan split:

```text
principal = 900
interest  = 600
```

Expected:

```text
cashflow = -1500
interest expense = 600
loan principal decrease = 900
```

Invariant:

```text
principal_payment != expense
```

---

# 48. Tests Kaution

## T50 Einzahlung

```text
Deposit receipt = 2.400 EUR
```

Expected:

```text
Bank +2400
Deposit liability +2400
Rental income +0
```

Default DATEV liability account:

```text
173200
```

## T51 Rückzahlung

```text
Bank -2400
Deposit liability -2400
Income 0
Expense 0
```

---

# 49. CAMT-Tests

## T60 Idempotenz

Gleiche CAMT-Transaktion zweimal importieren.

Expected:

```text
1 BankTransaction
```

Deduplizierung über externe Referenz bzw. stabilen `importHash`.

---

## T61 Matching

BankTransaction:

```text
+1.050 EUR
```

Offene Charges:

```text
850 Base Rent
200 Operating Cost Advance
```

Expected:

```text
PaymentAllocation A = 850
PaymentAllocation B = 200
unallocated = 0
```

---

## T62 Teilzahlung

```text
Charge 1050
Payment 700
```

Expected:

```text
outstanding = 350
```

---

# 50. Journaltests

## T70 Balance

Für jeden POSTED Entry:

```text
SUM(debitCents) == SUM(creditCents)
```

Posting wird sonst abgelehnt.

## T71 Immutable

Update eines POSTED Entry:

```text
Expected: reject
```

## T72 Reversal

Original:

```text
Debit 500
Credit 500
```

Reversal:

- exakt invertiert,
- referenziert Original,
- Original bleibt unverändert.

---

# 51. AfA-Tests

## T80 Grund und Boden

```text
AssetClass LAND
```

Expected:

```text
depreciable = false
```

## T81 Gebäude

```text
building allocation = 300000 EUR
```

Nur dieser Anteil wird AfA-Basis.

Default AfA-Konto:

```text
483100
```

## T82 Technische Anlage

Aktivierte technische Anlage:

```text
Default depreciation account = 483000
```

sofern kein spezifischeres Mapping konfiguriert ist.

---

# 52. Dimensions-Test

Rechnung:

```text
1000 EUR maintenance
```

Allocation:

```text
Property A 600
Property B 400
```

Expected:

```text
same FinancialCategory
same DATEV account
different Property dimension
```

Es dürfen keine neuen Konten pro Objekt entstehen.

---

# 53. Techniktests

## T90 Lebenszeitkosten

TechnicalAsset:

```text
Gastherme EG
```

Events:

```text
2026 Wartung 250
2027 Wartung 280
2028 Reparatur 900
```

Expected report:

```text
lifetimeCost = 1430
```

ohne Verlust der Finanz-/Steuerklassifikation der Rechnungen.

---

# 54. Zählerwechseltest

Meter A:

```text
installed 2020-01-01
removed   2026-06-30
end 10000
```

Meter B:

```text
installed 2026-07-01
start 0
end 500
```

Expected:

```text
consumption = consumption(A relevant period)
            + consumption(B relevant period)
```

Keine negative Differenz durch Seriennummernwechsel.

---

# 55. Settlement Regression Tests

Alle bestehenden Mietfuchs-Fixtures werden vor Migration gesichert.

Vergleich:

```text
old JSON implementation
==
PostgreSQL → Repository → Domain Snapshot → Calc Core
```

Cent-genau vergleichen:

- tenant share,
- landlord share,
- advance payments,
- settlement balance,
- §35a,
- meter consumption,
- rounding,
- warnings,
- snapshots.

Keine tolerierte Rundungsdifferenz außer wenn fachlich bewusst geändert und explizit dokumentiert.

---

# 56. Largest-Remainder-Test

```text
100.00 EUR
auf drei gleiche Einheiten
```

Expected:

```text
33.34
33.33
33.33
= 100.00
```

Tie-Break muss deterministisch sein.

---

# 57. Zeitraumtests

Zeitsemantik einheitlich.

Beispiel:

```text
Mieter A endDate = 2026-06-30
Mieter B startDate = 2026-07-01
```

Expected:

- kein doppelter Tag,
- kein fehlender Tag.

---

# 58. DB-Constraints

Mindestens:

```text
amountCents >= 0
areaM2 > 0
lease.endDate >= lease.startDate
meterInstallation.removedAt >= installedAt
debitCents >= 0
creditCents >= 0
NOT (debitCents > 0 AND creditCents > 0)
```

Unique:

```text
ChartOfAccounts(code, version)
Account(chartId, accountNumber)
BankTransaction(bankAccountId, importHash)
Membership(workspaceId, userId)
UserIdentity(issuer, subject)
```

Für Journal-Balance braucht es Service-/Transaction-Level-Prüfung, weil ein einfacher SQL-CHECK keine aggregierten Lines validieren kann.

---

# 59. Auth-/Permission-Tests

## P01 Workspace Isolation

User in Workspace A darf keine IDs aus Workspace B lesen.

Expected:

```text
404 or 403
```

Keine Information über Existenz fremder Datensätze leaken.

## P02 Readonly

`READONLY`:

- GET erlaubt.
- POST/PATCH/DELETE abgelehnt.

## P03 Tenant

Mieterportal-Nutzer darf nur freigegebene eigene Lease-/Settlement-/Document-Ressourcen sehen.

## P04 OIDC Identity

Gleiche E-Mail, anderer `(issuer, sub)`:

```text
not automatically same user
```

---

# 60. Audit

Langfristig:

```prisma
model AuditEvent {
  id          String @id @default(cuid())
  workspaceId String
  userId      String?
  action      String
  entityType  String
  entityId    String
  createdAt   DateTime @default(now())
  metadata    Json?
}
```

Nicht zur Rekonstruktion finanzieller Buchungen verwenden; dafür existiert das Journal.

---

# 61. Reporting

## Finanzreport

Nach FinancialCategory:

```text
Mieterträge
Betriebskosten
Instandhaltung
Versicherungen
Finanzierung
Verwaltung
AfA
```

## Objektreport

```text
Property → Jahr → Kategorie
```

## Technikreport

```text
TechnicalAsset → Wartungen / Reparaturen / Lifetime Cost
```

## Darlehensreport

```text
Originalbetrag
Restschuld
Tilgung Jahr
Zinsen Jahr
Sondertilgung
```

## Open Items

```text
Offene Mieten
Offene Betriebskosten-Nachzahlungen
Offene Lieferantenrechnungen
Ungeklärte Banktransaktionen
```

## Steuerreport

- Einnahmen V+V,
- Werbungskosten nach TaxTreatment/FinancialCategory,
- AfA,
- Zinsen,
- §35a,
- Anlage-V-Mapping.

---

# 62. DATEV Export

DATEV Export ist Adapter, nicht Kern.

Export verwendet:

```text
AccountingEvent / JournalEntry
+
AccountMapping
+
Property/Unit dimensions
```

Konfigurierbar:

- Chart Version,
- Kontenplan,
- Berater-/Mandantenparameter,
- ggf. Kostenstellen,
- Belegreferenzen.

Keine Geschäftslogik darf vom DATEV-Dateiformat abhängig sein.

---

# 63. Implementierungsreihenfolge

## Phase 1 – Foundation

1. Server auf TypeScript.
2. gemeinsames Domain Package.
3. Zod-Schemas.
4. PostgreSQL 17.
5. Prisma.
6. Repository-Abstraktion.
7. DB-Migrationspipeline.

## Phase 2 – sichere Migration

8. Import `db.json`.
9. Regressionstest alte vs. neue Berechnung.
10. Snapshot-/Money-/Date-Invarianten.

## Phase 3 – Auth

11. Workspace.
12. User.
13. Membership.
14. OIDC.
15. Permission Tests.

## Phase 4 – Kern-Domäne

16. Party.
17. Property/Building/Unit.
18. Lease/LeaseParty.
19. LeaseComponents.
20. RentAdjustments.

## Phase 5 – Forderung und Bank

21. Charge.
22. Payment.
23. PaymentAllocation.
24. BankAccount.
25. CAMT Import.
26. Bank Matching.

## Phase 6 – Kosten

27. VendorInvoice.
28. InvoiceLine.
29. ExpenseAllocation.
30. FinancialCategory.
31. OperatingCostCategory.
32. TaxTreatment.
33. SKR03-V+V-2026 Seeder.

## Phase 7 – Technik

34. TechnicalAsset.
35. Ticket.
36. WorkOrder.
37. MaintenancePlan.
38. MaintenanceEvent.
39. Documents.

## Phase 8 – Vermögen/Finanzierung

40. Deposit.
41. Loan.
42. Acquisition.
43. DepreciableAsset.
44. AfA.

## Phase 9 – Accounting

45. AccountingEvent.
46. JournalEntry.
47. JournalLine.
48. Reversal.
49. AccountingPeriods.
50. DATEV Export.

---

# 64. Pull-Request-Schnitt

Empfohlen, kleine reviewbare PRs:

### PR 1
`chore/domain-typescript-foundation`

### PR 2
`feat/postgres-prisma-repositories`

### PR 3
`feat/json-import-regression`

### PR 4
`feat/oidc-workspaces`

### PR 5
`feat/party-property-lease-model`

### PR 6
`feat/charges-payments-open-items`

### PR 7
`feat/camt-bank-reconciliation`

### PR 8
`feat/financial-classification-skr03`

### PR 9
`feat/vendor-invoices-expense-allocation`

### PR 10
`feat/technical-administration`

### PR 11
`feat/loans-deposits-assets`

### PR 12
`feat/accounting-journal`

### PR 13
`feat/datev-export`

---

# 65. Was ausdrücklich nicht in V1 gehört

- vollständiges ERP,
- Lagerhaltung,
- Sales Orders,
- Purchase Orders,
- HR/Payroll,
- WEG-Verwaltung,
- Eigentümerversammlungen,
- Gewerbeportfolio-Sonderlogik,
- komplexe zentrale HeizkostenV-Engine, solange nicht benötigt,
- eigener OAuth Authorization Server,
- eigene freie Kontenrahmenlogik ohne Mapping,
- Microservices.

---

# 66. Abgrenzung Double Entry

Doppelte Buchführung wird intern als robustes Modell eingesetzt, auch wenn der private Vermieter steuerlich regelmäßig keine handelsrechtliche Bilanz aufstellen muss.

Vorteile:

- Forderungen bleiben sichtbar.
- Verbindlichkeiten bleiben sichtbar.
- Kautionen werden korrekt als Verpflichtung behandelt.
- Tilgung/Zins werden getrennt.
- AfA ist nachvollziehbar.
- Bankabgleich ist konsistent.
- jeder finanzielle Vorgang hat Herkunft und Ziel.
- Reports können Cashflow, Aufwand und Bestand getrennt darstellen.

UI bleibt fachlich:

```text
Rechnung erfassen
Zahlung zuordnen
Miete verbuchen
Kaution erhalten
Darlehensrate aufteilen
```

nicht:

```text
Soll an Haben eingeben
```

---

# 67. Abgrenzung SKR03 V+V

Der SKR03 V+V wird verwendet für:

- standardisierte Finanzklassifikation,
- Vergleichbarkeit über Jahre,
- Vergleichbarkeit zwischen Objekten,
- Vorbereitung DATEV,
- plausible, etablierte Kategorien,
- automatische Belegklassifikation,
- Reporting.

Er wird **nicht** verwendet für:

- Eigentumsstruktur,
- Betriebskosten-Umlagefähigkeit,
- technische Anlagenstruktur,
- steuerliche Aktivierungsentscheidung,
- Mietvertragslogik,
- Zählerlogik,
- Rollen-/Rechteverwaltung.

---

# 68. Architekturentscheidung: Warum nicht ERPNext + PropMS?

ERPNext/PropMS bietet:

- sehr starke Buchhaltung,
- Assets,
- Invoices,
- Payments,
- Cost Centers,
- Wartung,
- Property/Lease-Erweiterungen.

Aber für wenige privat vermietete Wohnungen entstehen erhebliche Zusatzkomplexitäten:

- generisches ERP-Datenmodell,
- Item-/Invoice-/Sales-Logik,
- Company-Konzept,
- zahlreiche fachfremde Module,
- deutsche Nebenkosten-/Anlage-V-Logik fehlt weiterhin,
- bestehende Mietfuchs-Abrechnungsengine wäre verloren bzw. müsste integriert werden.

Mietfuchs modernisieren ist sinnvoller, weil die schwerste deutsche Speziallogik bereits vorhanden ist.

---

# 69. Architekturentscheidung: Warum nicht MicroRealEstate?

Vorteile:

- größere Community,
- Property/Tenant/Lease,
- Tenant/Landlord UI,
- Docker.

Nachteile:

- deutscher Betriebskostenkern fehlt,
- Anlage-V-Logik fehlt,
- deutsche Steuer-/SKR-/§35a-Logik fehlt,
- Germanisierung wäre umfangreicher als Modernisierung von Mietfuchs.

---

# 70. Architekturentscheidung: Warum nicht HaVeWa?

Fachlich sehr interessant.

Aber:

- keine klare Open-Source-Lizenz im geprüften Repository,
- damit keine sichere Basis für Fork/Weiterverwendung,
- junges Projekt.

HaVeWa bleibt Referenz für Datenmodellideen, nicht Codebasis.

---

# 71. Architekturentscheidung: warum PostgreSQL statt SQLite?

Für vier Wohnungen reicht SQLite von der Datenmenge problemlos.

PostgreSQL wird trotzdem empfohlen wegen:

- Auth/Multiuser,
- Foreign Keys,
- parallele Zugriffe,
- Transaktionen,
- komplexere relationale Modelle,
- Open Items,
- Accounting,
- klare Migrationen,
- robuste Backups,
- Reports,
- langfristige Erweiterbarkeit.

Es ist eine Architekturentscheidung, keine Skalierungsnotwendigkeit.

---

# 72. Architekturentscheidung: Warum Prisma?

Vorteile für dieses Projekt:

- Schema als zentrale Dokumentation,
- Migrationen,
- TypeScript-Typen,
- gute AI-Codebarkeit,
- Relationen/Constraints sichtbar,
- PostgreSQL-first.

Alternative:

- Drizzle wäre ebenfalls geeignet und näher an SQL.

Default:

```text
Prisma
```

---

# 73. Qualitätsanforderungen

Vor Merge jedes PR:

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

Kein PR darf bestehende Settlement-Fixtures ohne explizite fachliche Begründung verändern.

---

# 74. Definition of Done – PostgreSQL Migration

- kein regulärer Zugriff mehr auf `db.json`,
- Importer funktioniert,
- alte Fixtures migrieren,
- Abrechnungen cent-genau identisch,
- Foreign Keys aktiv,
- DB-Backups dokumentiert,
- Docker Compose funktioniert,
- Migrationen automatisch ausführbar.

---

# 75. Definition of Done – OIDC

- Authentik getestet,
- Keycloak oder zweiter generischer OIDC Provider getestet,
- Authorization Code + PKCE,
- `issuer + sub`,
- sichere Session Cookies,
- Workspace-Isolation,
- Logout,
- Permission-Test-Suite.

---

# 76. Definition of Done – CAMT

- camt.053 Import,
- idempotent,
- Originalreferenzen erhalten,
- Banktransaction separat von Payment,
- manuelles Matching,
- Auto-Matching mit Confidence,
- Teilzahlungen,
- Mehrfachzuordnung,
- ungeklärte Umsätze,
- Tests mit echten anonymisierten Fixtures.

---

# 77. Definition of Done – technische Administration

- technische Anlage an Property/Unit,
- Parent/Child,
- Wartungsintervall,
- nächste Fälligkeit,
- Ticket,
- WorkOrder,
- Dienstleister,
- Wartungsereignis,
- Rechnung verknüpfbar,
- Dokument/Fotos,
- Lifetime-Cost-Auswertung.

---

# 78. Definition of Done – SKR03

- Chart versioniert.
- aktueller 2026-Seed.
- Quelle hinterlegt.
- Mapping versioniert.
- unbekannte Kategorie erzeugt Fehler.
- keine Kontonummer in Business Logic hard-coded.
- Betriebskostenklassifikation separat.
- TaxTreatment separat.
- Objekt/Unit/Asset als Dimension separat.
- DATEV-Export kann Mapping überschreiben.

---

# 79. Offene fachliche Punkte

Vor produktiver Umsetzung noch gesondert rechtlich/steuerlich prüfen:

1. finale Anlage-V-Zuordnung je FinancialCategory,
2. AfA-Regeln nach Gebäudeart/Anschaffungsdatum,
3. anschaffungsnahe Herstellungskosten,
4. Verteilung größeren Erhaltungsaufwands,
5. konkrete DATEV-Exportparameter des Steuerberaters,
6. Umsatzsteuerpflichtige Vermietung, falls künftig relevant,
7. CO₂KostAufG-Workflow bei Gasetagenheizung,
8. §35a-Aufteilung je Beleg/Abrechnung,
9. Kautionszins-/Kontomodell nach gewünschter Genauigkeit.

Diese Punkte gehören nicht als implizite Logik in die Finanzkategorie.

---

# 80. Quellen

## Mietfuchs

- GitHub: https://github.com/speedone/mietfuchs
- `CLAUDE.md`: https://github.com/speedone/mietfuchs/blob/main/CLAUDE.md

Verwendet für:
- bestehende Architektur,
- JSON-Persistenz,
- Calc-Core,
- Money-/Date-Konventionen,
- vorhandene Abrechnungs-/Mietkonto-/Tax-Funktionen.

---

## DATEV – SKR03 Vermietung und Verpachtung

- Produkt-/Downloadseite, Stand Januar 2026:  
  https://www.datev.de/web/de/shop/produkt-details/skr-03-vermietung-und-verpachtung-12911

DATEV beschreibt:
- Basis SKR03,
- V+V-Erweiterungen,
- sechsstelligen Kontenrahmen,
- Zuordnung zur Überschussrechnung nach § 21 EStG,
- Stand Januar 2026.

Für produktive Seeds ist stets die jeweils aktuelle offizielle DATEV-Datei maßgeblich.

---

## DATEV – SKR03 / Kontenrahmen

Beispielhafte offizielle DATEV-Unterlagen bestätigen u. a. Standardkonten wie:

- `237500 Grundsteuer`
- `423000 Heizung`
- `424000 Gas, Strom, Wasser`
- `436000 Versicherungen`
- `436600 Versicherungen für Gebäude`
- `173200 Erhaltene Kautionen`

Allgemeine DATEV-Kontenrahmen-Unterlagen sind über das DATEV Help Center / DATEV Shop abrufbar.

---

## ERPNext – Chart of Accounts

https://docs.frappe.io/erpnext/chart-of-accounts

Verwendet für:
- Double Entry,
- Account Types,
- Trennung Kontenstruktur und Fachvorgang.

---

## ERPNext – Accounting Dimensions

https://docs.frappe.io/erpnext/accounting-dimensions

Zentrale Erkenntnis:

> Das Konto beschreibt den wirtschaftlichen Vorgang; zusätzliche Dimensionen beschreiben Kontext wie Region, Produkt, Cost Center etc.

Übertragen auf Mietfuchs:

```text
Account/FinancialCategory = WAS
Property/Unit/Asset       = WO/WORAN
```

---

## ERPNext – Accounting Introduction

https://docs.frappe.io/erpnext/accounting-introduction

Verwendet für:
- Source Document,
- GL Entry,
- Payment Ledger,
- automatisches Generieren von Buchungswirkungen aus Fachbelegen.

---

## PropMS

https://github.com/Aakvatech-Limited/PropMS

Verwendet für:
- Property,
- Unit,
- Lease,
- Meter,
- Maintenance,
- Security Deposit,
- Integration Immobilienobjekt ↔ ERP-Finanzkern.

---

## LeaseBook

https://github.com/jwh3times/LeaseBook

Verwendet für:
- Double-Entry-Kern,
- Trust-/Deposit-Trennung,
- Reversal statt Mutation,
- Accounting Periods,
- Audit-/Invariantengedanke,
- offene Posten und Banking.

Hinweis: Projekt laut Repository noch pre-release; als Architekturquelle, nicht als Produktionsbenchmark verwendet.

---

## MicroRealEstate

https://github.com/microrealestate/microrealestate

Verwendet für:
- Self-hosting,
- Property/Tenant/Lease,
- Tenant-/Landlord-Sichten,
- Rollen-/Frontend-Trennung.

---

## HaVeWa

https://github.com/fgilde/hausverwaltung

Verwendet ausschließlich als öffentlich sichtbare Architektur-/Datenmodellreferenz.

Wichtig:
- im geprüften Stand keine klare Open-Source-Lizenz,
- daher nicht als Codebasis oder Copy/Paste-Quelle behandeln.

Verwendete Ideen:
- Property/Building/Unit,
- Person getrennt von Lease,
- Renter-Relation,
- Rent Components,
- Deposits,
- Charges/Payments,
- Tickets,
- Maintenance,
- Documents.

---

## Historischer DATEV SKR97

Nur als konzeptionelle historische Referenz.

Verwendete Ideen:
- Immobilienvermögen,
- Forderungen gegen Mieter,
- Mietkautionen,
- Darlehen,
- Verbindlichkeiten,
- AfA,
- Erhaltungsaufwand,
- Fremdkapitalzinsen.

Nicht als aktueller Kontenrahmen einsetzen.

---

# 81. Schlussfolgerung

Die empfohlene Weiterentwicklung ist **kein Rewrite**.

Behalten:

- React UI,
- Kern der bisherigen UX,
- `calc.js` bzw. dessen fachliche Logik,
- cent-genaue Geldrechnung,
- bestehende Nebenkostenlogik,
- Mietkonto,
- Zähler-/Verbrauchslogik,
- Tax-/§35a-Grundfunktionen,
- lokale/self-hosted Ausrichtung.

Neu strukturieren:

```text
db.json
   ↓
PostgreSQL + Repository Layer

Tenancy mit Personendaten
   ↓
Party + Lease + LeaseParty

Payment-only Mietkonto
   ↓
Charge + Payment + PaymentAllocation

CostItem
   ↓
VendorInvoice + InvoiceLine + ExpenseAllocation

freie Kategorien
   ↓
FinancialCategory + SKR03 Mapping
                  + OperatingCostCategory
                  + TaxTreatment

keine technische Verwaltung
   ↓
TechnicalAsset + Ticket + WorkOrder
               + MaintenancePlan/Event

rudimentäre Kaution
   ↓
Deposit + DepositTransactions

kein Darlehensmodell
   ↓
Loan + LoanTransactions

kein Anlagenmodell
   ↓
Acquisition + DepreciableAsset + AfA

keine echte Buchhaltung
   ↓
AccountingEvent + optional sichtbares Double-Entry Journal
```

Das zentrale Architekturziel lautet:

> **Mietfuchs bleibt für den Nutzer eine einfache deutsche Vermietersoftware. Intern erhält es aber die Datenintegrität und Auswertbarkeit eines kleinen ERP, ohne dessen Bedien- und Prozessballast zu übernehmen.**

Der SKR03 V+V liefert dafür die standardisierte Finanzsprache. Property, Unit und TechnicalAsset liefern die Controlling-Dimensionen. Betriebskostenrecht und Steuerbehandlung bleiben getrennte fachliche Achsen. Damit sind Auswertungen über Jahre und Objekte vergleichbar, ohne die Software an einzelne DATEV-Kontonummern oder an einen bestimmten Steuerberater zu koppeln.

---

# 82. Steuerliche Gap-Analyse und Zielarchitektur (Steuerberater-Review)

**Stand:** 30.08.2026 — Ergebnis des fachlichen Reviews durch den Steuerberater.

Kernbefund: Nicht der SKR03 ist die größte verbleibende Lücke, sondern eine **eigene steuerliche Zeit- und Zurechnungslogik**. Die Spezifikation trennt bereits richtig Banktransaktion, Zahlung, Rechnung, Aufwand, Kaution und Tilgung — der bisher vorgesehene Steuerreport (§61) reicht steuerlich aber nicht, um verlässlich eine Anlage V bzw. ein Steuerberater-Paket zu erzeugen.

Leitentscheidung: Mietfuchs wird **keine Steuerbuchhaltung** und kein DATEV-/ELSTER-Ersatz. Stattdessen wird eine relativ kleine, fachlich saubere **Tax Layer** zwischen Fachvorgänge und Steuerreport gesetzt. Ziel:

> Mietfuchs kennt den steuerlich relevanten Sachverhalt vollständig und erzeugt ein prüfbares Steuerpaket. Der Steuerberater trifft die letztverbindliche steuerliche Würdigung.

## 82.1 Gesamturteil

| Bereich | Stand | Urteil |
|---|---|---|
| Miet-/Objektdomäne | 🟢 | sehr gut |
| Bank / offene Posten | 🟢 | sehr gut |
| Betriebskosten | 🟢 | stark |
| technische Verwaltung | 🟢 | stark |
| Finanzklassifikation / SKR03 | 🟢 | gut durchdacht |
| Darlehen / Kaution | 🟢 | grundsätzlich richtig |
| Steuerliche Periodisierung | 🔴 | wesentlicher Gap |
| AfA / Anschaffung | 🟠 | Datenmodell vorhanden, Steuerlogik fehlt |
| Erhaltungsaufwand | 🔴 | wesentliche Logik fehlt |
| Eigentümer-/Feststellungslogik | 🔴 | struktureller Gap |
| Eigentumswohnung / WEG | 🔴 | für Zielgruppe relevant, derzeit nicht abgedeckt |
| verbilligte Vermietung / Selbstnutzung | 🔴 | fehlt |
| USt / E-Rechnung | 🔴/🟠 | E-Rechnung heute Pflicht-Thema |
| Steuer-Nachweis/Audit | 🟠 | gute Basis, steuerliche Entscheidungen fehlen |

## 82.2 Geänderte Zielarchitektur

Der bisherige Aufbau wird um genau eine Schicht ergänzt:

```text
Fachvorgänge
Lease / Charge / Invoice / Payment / Loan / Asset
                    │
          ┌─────────┴──────────┐
          ↓                    ↓
AccountingEvent           TaxRecognition
          ↓                    ↓
JournalEntry              TaxEvent
          │                    │
          ↓                    ↓
Finanzreport           Steuerreport
                              │
                    ┌─────────┴─────────┐
                    ↓                   ↓
                 Anlage V             DATEV
```

**Neue Invariante 21 (ergänzt §3):**

```text
21. JournalEntry ≠ TaxEvent
```

Der Anlage-V-/Steuerreport wird **niemals unmittelbar aus dem Journal erzeugt**, sondern ausschließlich aus TaxEvents.

## 82.3 P0: TaxEvent und Zu-/Abflussprinzip (§ 11 EStG)

Private Vermietung ist eine Überschusseinkunftsart nach § 21 EStG; im Kern gilt das Zu-/Abflussprinzip des § 11 EStG: Steuerlich zählt grundsätzlich, wann Geld tatsächlich zufließt bzw. abfließt — nicht Rechnungsdatum oder Sollstellung. Damit existieren drei verschiedene Wahrheiten:

```text
Mietvertrag / Charge  → Was schuldet der Mieter?
Journal               → Welche Forderung besteht wirtschaftlich?
TaxEvent              → Was ist in diesem Steuerjahr steuerpflichtig?
```

Beispiel: Dezember-Miete 2026 (1.000 €), gezahlt am 15.01.2027 → operativ Dezember 2026, Forderung 2026, steuerlich grundsätzlich Einnahme 2027. Umgekehrt ist ein `VendorInvoice` noch kein steuerlicher Werbungskostenabfluss.

```prisma
model TaxEvent {
  id              String @id @default(cuid())
  taxSubjectId    String
  propertyId      String?
  sourceType      String
  sourceId        String
  recognitionDate DateTime
  taxYear         Int
  amountCents     BigInt
  taxCategory     String
  recognitionRule TaxRecognitionRule
  deductibleRatio Decimal?
  legalBasis      String?
  ruleVersion     String?
}
```

```text
recognitionRule:
CASH_RECEIPT
CASH_PAYMENT
TEN_DAY_RULE
DEPRECIATION
SPECIAL_DEPRECIATION
DISTRIBUTED_MAINTENANCE
CAPITALIZATION
NON_DEDUCTIBLE
MANUAL_ADJUSTMENT
```

Dazu gehört die **10-Tage-Regel** für regelmäßig wiederkehrende Zahlungen rund um den Jahreswechsel (Zahlung und Fälligkeit innerhalb des Zehn-Tage-Zeitraums). Teilzahlungen erzeugen anteilige TaxEvents.

## 82.4 P0: AcquisitionCostItem statt pauschaler Nebenkosten (ergänzt §18)

Ein einziges Feld `incidentalCostsCents` ist steuerlich gefährlich. Zu trennen sind mindestens:

```text
Grunderwerbsteuer / Makler / Kaufvertragsnotar / Grundbuch Eigentumsumschreibung
  → Anschaffungsnebenkosten
Grundschuld / Finanzierungsnotar / Bankgebühr / Darlehensgebühr / Disagio
  → Finanzierungskosten / gesonderte Behandlung
```

`Acquisition.incidentalCostsCents` wird durch `AcquisitionCostItem` (Betrag, Typ, steuerliche Einordnung, Belegverknüpfung) ersetzt.

## 82.5 P0: AfA-Engine mit gesetzlichen Methoden (ergänzt §19)

`DepreciableAsset.method` reicht nicht. 2026 bestehen mehrere AfA-Wege nebeneinander: reguläre Gebäude-AfA 3 % / 2 % / 2,5 % (abhängig von Fertigstellung und Gebäudeart), nachgewiesene kürzere tatsächliche Nutzungsdauer, degressive Gebäude-AfA 5 % vom Restwert für bestimmte neue Wohngebäude sowie zusätzlich die § 7b-Sonderabschreibung (bis 5 % jährlich in den ersten vier Jahren, parallel zur regulären AfA).

```text
DepreciableAsset
    ↓
DepreciationPlan[]        // mehrere parallele Pläne je Asset

Plan-Typen:
REGULAR_LINEAR
REGULAR_DECLINING_5
ACTUAL_USEFUL_LIFE
SPECIAL_7B
MANUAL_LEGACY
```

**Bestandsübernahme ist Pflicht:** Ein bereits zehn Jahre laufendes AfA-Objekt muss mit historischer AfA und Restwert übernommen werden können, ohne die Historie neu zu berechnen (`MANUAL_LEGACY`).

## 82.6 P0: Kaufpreisaufteilung als echter Vorgang (ergänzt §18)

Nicht nur `LAND = 200.000 / BUILDING = 400.000` speichern, sondern den Vorgang:

```prisma
model PurchasePriceAllocation {
  id                   String @id @default(cuid())
  acquisitionId        String
  method               AllocationMethod // BMF_2026 | CONTRACT | APPRAISAL | MANUAL
  calculationDate      DateTime
  sourceVersion        String?          // z. B. BMF-Arbeitshilfe Stand 03/2026
  landValueCents       BigInt
  buildingValueCents   BigInt
  allocationPercentage Decimal
  documentId           String?
  note                 String?
  approvedByAdvisor    Boolean @default(false)
}
```

Damit ist später beantwortbar: „Warum haben wir 67,3 % Gebäudeanteil angesetzt?"

## 82.7 P0: 15-%-Monitor — anschaffungsnahe Herstellungskosten (§ 6 Abs. 1 Nr. 1a EStG)

Instandsetzungs-/Modernisierungsaufwendungen innerhalb von **drei Jahren nach Anschaffung** werden zu anschaffungsnahen Herstellungskosten, wenn sie **netto 15 % der Gebäude-Anschaffungskosten** überschreiten. Softwarefolgen:

1. `InvoiceLine` braucht zwingend `netCents / vatRate / vatCents / grossCents` — auch beim Wohnungsvermieter ohne Vorsteuerabzug (Nettobetrag für die 15-%-Prüfung).
2. Rollierender 3-Jahres-Monitor mit Frühwarnung bei 80 %/90 % der Grenze:

```text
Gebäude-AK:                   300.000 €
15%-Grenze netto:              45.000 €
bisher relevante Maßnahmen:    39.800 €
aktuelle Rechnung:              8.000 €
──────────────────────────────────────
neuer Stand:                   47.800 €
⚠ Grenze überschritten
```

Bei Überschreitung: Umqualifizierung in AfA-Basis über Korrektur-TaxEvents — keine stille Änderung.

## 82.8 P0: § 82b EStDV als Entität, nicht als Enum

`DISTRIBUTED_MAINTENANCE` in TaxTreatment ist nur ein Label. Größere Erhaltungsaufwendungen an überwiegend zu Wohnzwecken dienenden Privatgebäuden können gleichmäßig auf **zwei bis fünf Jahre** verteilt werden; bei mehreren Eigentümern müssen alle denselben Zeitraum verwenden; bei Verkauf oder Ende der Einkunftserzielung ist der Rest zu berücksichtigen.

```prisma
model DistributedExpensePlan {
  id              String @id @default(cuid())
  expenseId       String
  startTaxYear    Int
  numberOfYears   Int      // 2..5
  originalCents   BigInt
  annualCents     BigInt[]
  remainingCents  BigInt
  electedAt       DateTime
  status          PlanStatus
}
```

Ereignisse: `SALE`, `END_OF_RENTAL`, `TRANSFER`.

## 82.9 P0: WEG-Abrechnung für vermietende Eigentümer (präzisiert §65)

Scope-Präzisierung: **WEG-Verwaltung** (Beschlussbuch, Eigentümerversammlung, WEG-ERP) bleibt aus V1 ausgeschlossen. Die **WEG-Abrechnung aus Sicht eines vermietenden Wohnungseigentümers** ist dagegen Pflicht für die Zielgruppe:

```text
Hausgeldabrechnung
    ├─ umlagefähige Kosten
    ├─ nicht umlagefähige Verwaltungskosten
    ├─ Erhaltungsaufwendungen
    ├─ Zuführung Erhaltungsrücklage
    └─ Entnahme/Verbrauch Erhaltungsrücklage
```

Steuerlich heikel ist die Erhaltungsrücklage (BFH 2025): Die **Einzahlung** in die Rücklage ist noch **kein** Werbungskostenabzug; erst die **tatsächliche Verausgabung durch die WEG** für Erhaltungsmaßnahmen führt zum Abzug. Dafür genügt ein kleines `WEGAnnualStatement` mit Import/Erfassung der Eigentümerabrechnung — verzahnt mit Betriebskostenabrechnung (umlagefähige Anteile) und TaxEvents.

## 82.10 P0: TaxSubject und Eigentümeraufteilung (§ 180 AO)

Ownership (§8) ist ein guter Anfang, reicht aber nicht: Bei Anteilsänderungen (Schenkung, Zukauf) und getrennter Finanzierung können AfA-Basis, Finanzierungsaufwand und Sonderwerbungskosten **je Eigentümer** unterschiedlich sein. Mehrere Beteiligte führen grundsätzlich zur gesonderten und einheitlichen Feststellung nach § 180 AO.

Ergänzt werden: `TaxSubject`, `TaxOwnershipInterest`, `OwnerTaxAllocation`, `SpecialAdvertisingExpense`. AfA hängt langfristig nicht ausschließlich an Property:

```text
Property → OwnershipInterest → TaxAssetShare → AfA
```

Zielbild im Report:

```text
Gesamtergebnis Haus:      -12.480 €
davon Eigentümer A 50 %:   -6.240 €
davon Eigentümer B 50 %:   -6.240 €
Sonder-WK Eigentümer A:    -1.170 €
```

## 82.11 P0: UnitUsePeriod — Nutzungsart und Leerstand (ergänzt §7)

Eine Einheit ist steuerlich nicht einfach „vorhanden". Zeitabhängige Nutzungsarten:

```text
RENTED_RESIDENTIAL
RENTED_COMMERCIAL
VACANT_FOR_RENT
OWNER_OCCUPIED
FREE_USE
OTHER
```

`UnitUsePeriod` (validFrom/validTo, type, evidenceDocumentIds[]). Bei Leerstand bleiben Werbungskosten abzugsfähig, wenn die ernsthafte Vermietungsabsicht fortbesteht (objektive Vermietungsbemühungen dokumentieren). Grundlage für AfA, Schuldzinsen und Gemeinkosten-Zuordnung.

## 82.12 P0: Verbilligte Vermietung

`RELATED_PARTY_RESIDENTIAL_RENT` löst das Problem nicht — relevant ist die Quote **tatsächliches Entgelt ÷ ortsübliche Marktmiete**: unter 50 % Aufteilung in entgeltlichen/unentgeltlichen Teil; ab 66 % gilt dauerhafte Wohnraumvermietung als voll entgeltlich; dazwischen gesonderte Prüfung/Totalüberschussprognose. Mindestens ein jährlicher Check je Einheit:

```text
Marktmiete / vereinbarte Kaltmiete / Umlagen / Quote / Quelle / Bewertungsdatum

>= 66 %      OK
50–<66 %     steuerliche Prüfung erforderlich
< 50 %       anteilige Kürzung wahrscheinlich erforderlich
```

Keine vollautomatische Rechtsentscheidung — aber niemand darf unbemerkt in diese Falle laufen.

## 82.13 P0/P1: E-Rechnung und Netto/USt/Brutto (ergänzt §14, §23)

Auch der rein steuerfrei vermietende Wohnungsvermieter ist umsatzsteuerlich Unternehmer und muss seit 01.01.2025 **E-Rechnungen empfangen** können. Mietfuchs muss XRechnung/ZUGFeRD importieren und das strukturierte XML-Original **unverändert archivieren**:

```text
Document:
  documentFormat            E_INVOICE | PDF | IMAGE
  structuredInvoiceFormat   XRECHNUNG | ZUGFERD | OTHER
  originalSha256

InvoiceLine:
  netCents / vatRate / vatCents / grossCents
```

Eine echte Umsatzsteuerachse (Option nach § 9 UStG, Vorsteuerberichtigung § 15a UStG bei COMMERCIAL/PARKING/GARAGE) wird entweder später richtig implementiert oder in V1 **ausdrücklich nicht unterstützt** — nichts dazwischen.

## 82.14 P1: Zuschüsse und Erstattungen

Ein Zuschuss kann abzugsfähigen Erhaltungsaufwand mindern, in einem anderen Veranlagungszeitraum zu Einnahmen aus V+V führen und bei § 82b den verbleibenden Verteilungsbetrag beeinflussen. Ein Modell genügt:

```text
Reimbursement / Grant → verknüpfte ExpenseAllocation / Asset → TaxTreatment
```

Deckt auch Versicherungsentschädigungen und Handwerkergutschriften ab.

## 82.15 P1: DepositApplication — Kautionsverwendung (ergänzt §21)

`WITHHOLDING` als Transaktion genügt nicht. Beispiel: 2.400 € Kaution → 1.000 € Rückzahlung, 900 € gegen Mietrückstand, 500 € wegen Beschädigung. `DepositApplication` verrechnet die Kaution konkret gegen `RentCharge` / `SettlementCharge` / `DamageClaim` / `OtherClaim` — die Steuerlogik folgt dann aus dem zugrunde liegenden Sachverhalt.

## 82.16 P1: LoanUseAllocation — Mittelverwendung (ergänzt §20)

Für die Abzugsfähigkeit von Schuldzinsen (§ 9 EStG) zählt der wirtschaftliche Zusammenhang bzw. die tatsächliche Mittelverwendung, nicht die Bezeichnung „Darlehen Haus A":

```text
LoanUseAllocation: loanId, amountCents, purpose,
  propertyId, unitId?, acquisitionId?, expenseId?, privateShare?
```

Verhindert Probleme bei Umschuldung, gemischter Nutzung und Miteigentum.

## 82.17 P1: PropertyDisposal — Verkauf steuerlich abschließen

Keine vollständige § 23-Berechnung, aber ein `PropertyDisposal`-Vorgang: Zehnjahresfrist-Hinweis (§ 23 EStG), AfA-Ende, Restwert-Dokumentation, Behandlung von § 82b-Restbeträgen, Darlehens-Ende/-Fortführung, Ownership-Ende. Das ist Domänenlogik, keine Steuerberater-Kür.

## 82.18 P1: ExpenseRecord — sonstige Vermieterkosten (ergänzt §14)

Nicht jede Werbungskostenposition beginnt mit einer Lieferantenrechnung (Fahrten, Porto, Telefonanteile, Software, Kontoführung, Inserate, Barauslagen, Fachliteratur). Neben `VendorInvoice` wird ein einfacher `ExpenseRecord` mit Beleg-/Nachweislink zugelassen — sonst zwingt das Modell zu künstlichen Rechnungen.

## 82.19 Steuerpaket je Steuerjahr

| Ausgabe | Inhalt |
|---|---|
| Anlage-V-Vorschau | Werte je Objekt und Kategorie |
| Einnahmennachweis | nur steuerliche Zuflüsse |
| Werbungskosten | nur steuerliche Abflüsse + Sonderregeln |
| AfA-Verzeichnis | Basis, Methode, Restwert, Sonder-AfA |
| 15-%-Monitor | 3-Jahres-Zeitraum und relevante Maßnahmen |
| §82b-Verzeichnis | offene Verteilungsbeträge |
| Darlehensübersicht | Zins / Tilgung / Mittelverwendung |
| Eigentümeraufteilung | je TaxSubject |
| WEG-Steuerblatt | Hausgeld, Rücklage, tatsächliche Entnahmen |
| Belegindex | Beleg → Zahlung → Kategorie → Steuerwert |
| Prüfliste | ungeklärte steuerliche Sachverhalte |

Produktziel: Am Jahresende nicht „400 PDFs und Kontoauszüge, viel Spaß", sondern „hier ist die steuerlich abgegrenzte Objektakte; diese sechs Sachverhalte brauchen noch Ihre Entscheidung."

## 82.20 Priorisierung der steuerlichen Ergänzungen

```text
 1. TaxEvent + Zufluss/Abfluss + 10-Tage-Regel + Teilzahlungen
 2. AcquisitionCostItem + belastbare Kaufpreisaufteilung
 3. AfA-Engine (3/2/2,5 %, 5 % degressiv, parallele §7b-Sonder-AfA, Bestandsübernahme)
 4. 15-%-Monitor für anschaffungsnahe Herstellungskosten
 5. §82b-Verteilungsplan
 6. TaxSubject / Eigentümeraufteilung
 7. UnitUsePeriod + Leerstand/Selbstnutzung + verbilligte Vermietung
 8. WEG-Abrechnungsimport einschließlich Erhaltungsrücklage
 9. E-Rechnung + Netto/USt/Brutto
10. Zuschüsse, Erstattungen, Kautionsverwendung und Verkauf
```

## 82.21 Auswirkungen auf bestehende Kapitel

- **§3**: Invariante 21 (`JournalEntry ≠ TaxEvent`) ergänzt.
- **§14/§15**: InvoiceLine um Netto/USt/Brutto; `ExpenseRecord` als Beleg ohne Lieferantenrechnung.
- **§18**: `incidentalCostsCents` → `AcquisitionCostItem`; `AcquisitionAllocation` → `PurchasePriceAllocation`-Vorgang.
- **§19**: `method` → `DepreciationPlan[]` mit gesetzlichen Methoden und Bestandsübernahme.
- **§20**: `LoanUseAllocation` ergänzt.
- **§21**: `DepositApplication` ergänzt.
- **§23**: Document um E-Rechnungs-Felder ergänzt.
- **§61**: Der Steuerreport wird ausschließlich aus TaxEvents erzeugt, nie direkt aus dem Journal.
- **§63/§64**: Neue Phase 10 „Steuerliche Ebene (Tax Layer)" mit eigenen PR-Schnitten.
- **§65**: Präzisierung — WEG-*Verwaltung* bleibt ausgeschlossen, die WEG-*Eigentümerabrechnung* ist V1-Pflicht.
- **§79**: Die dortigen offenen Punkte werden teilweise zu Kernanforderungen hochgestuft (AfA-Regeln, anschaffungsnahe HK, § 82b, verbilligte Vermietung); Tax Recognition, WEG, TaxSubject und Nutzungsarten kommen als eigenständige Kernanforderungen hinzu.


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

---

> **Editorischer Hinweis:** Die folgenden Kapitel 142–187 (Invarianten 41–60) übernehmen die Nummerierung der externen Addendum-Serie. Die Nummernbereiche 83–141 bzw. Invarianten 22–40 sind für das ausführliche Steuer-Addendum reserviert, dessen Kernaussagen derzeit in §82 zusammengefasst sind.

# 142. Addendum – Ergänzungen Accounting Layer

## 142.1 Ziel

Die bestehende Accounting-Architektur bleibt grundsätzlich erhalten. Mietfuchs verwendet intern doppelte Buchführung als Integritäts-, Bestands- und Nachvollziehbarkeitsmechanismus, ohne dem privaten Vermieter eine klassische Buchhaltungsoberfläche aufzuzwingen.

Das bestehende Grundmodell bleibt bestehen:

```text
Source Document → AccountingEvent → JournalEntry → JournalLine
```

Die Accounting-Schicht wird ergänzt um:

1. persistierte Accounting-Dimensionen auf JournalLine
2. Party als optionale Gegenparteidimension
3. Loan als optionale Finanzierungsdimension
4. AccountingPeriod mit Periodensperre
5. explizite Posting Rules für neue Fachvorgänge
6. verbindliche Trennung zwischen Accounting und Tax

---

# 143. Verbindliche Trennung Accounting und Tax

Accounting und Tax sind zwei getrennte Wirkungen desselben fachlichen Vorgangs.

```text
                    Source Document
                         │
             ┌───────────┴───────────┐
             ↓                       ↓
      Accounting Effect          Tax Effect
             ↓                       ↓
      AccountingEvent             TaxEvent
             ↓                       ↓
       JournalEntry           TaxDetermination
```

Nicht zulässig: aus einem JournalEntry automatisch steuerliche Recognition ableiten — und ebenso wenig: ein TaxAssessment verändert einen JournalEntry.

Accounting beantwortet: Was ist wirtschaftlich passiert? Welche Forderung/Verbindlichkeit besteht? Wie verändern sich Bank, Darlehenssaldo, Kautionsverbindlichkeit? Welche Aufwendungen und Erträge bestehen?

Tax beantwortet: Wann ist der Vorgang steuerlich relevant? Wie wird er behandelt? Welchem Steuerjahr und welchem Beteiligten wird er zugerechnet? Was wurde erklärt, was festgestellt?

---

# 144. Neue Accounting-Invarianten

Die bestehenden Invarianten werden ergänzt um:

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
58. Every financial Source Document may create at most one canonical AccountingEvent per posting action.
59. Accounting posting must be idempotent.
60. A source document must not silently create duplicate journal effects.
```

---

# 145. Erweiterung JournalLine

```prisma
model JournalLine {
  id          String @id @default(cuid())
  entryId     String
  accountId   String
  debitCents  BigInt @default(0)
  creditCents BigInt @default(0)
  propertyId       String?
  unitId           String?
  technicalAssetId String?
  partyId          String?
  loanId           String?
  description      String?
}
```

Die Dimensionen beschreiben den Kontext der Buchungswirkung.

---

# 146. Bedeutung der Accounting-Dimensionen

```text
Account         → Was ist dies wirtschaftlich? (Mietertrag, Instandhaltung, Bank,
                  Forderung, Verbindlichkeit, Darlehens-/Kautionsverbindlichkeit)
Property        → Welcher Immobilie ist der Vorgang zuzuordnen?
Unit            → Welche Einheit ist betroffen?
TechnicalAsset  → Welche technische Anlage ist betroffen?
Party           → Welche Gegenpartei? (Mieter, Lieferant, Bank, Darlehensgeber, …)
Loan            → Welchem Darlehen ist die Buchungswirkung zuzuordnen?
```

---

# 147. Beispiel – aufgeteilte Handwerkerrechnung

```text
Rechnung: 1.000 EUR (Haus A: 600, Haus B: 400)

Soll  Instandhaltung      600   Property = Haus A
Soll  Instandhaltung      400   Property = Haus B
Haben Verbindlichkeit   1.000   Party = Heizungsbauer
```

Das Konto bleibt identisch. Nicht zulässig: `Instandhaltung Haus A` / `Instandhaltung Haus B` als separate Konten allein zur Objektzuordnung.

---

# 148. Beispiel – Rechnung für technische Anlage

```text
Wartung Gastherme EG: 250 EUR

JournalLine:
  Account        = TECHNICAL_MAINTENANCE
  Property       = Haus A
  Unit           = EG
  TechnicalAsset = Gastherme EG
  Party          = Heizungsbauer Müller
```

Damit sind unabhängig auswertbar: Aufwand nach Konto, nach Objekt, nach Einheit, Lifetime Cost der Gastherme, Aufwand nach Lieferant.

---

# 149. Beispiel – Mietforderung

```text
Charge: Kaltmiete 850 EUR

Soll  Forderung Mieter   850
Haben Mietertrag         850

Dimensionen: Property = Haus A, Unit = EG, Party = Mieter Müller
```

---

# 150. Beispiel – Mietzahlung

```text
Bank +850 EUR

Soll  Bank               850
Haben Forderung Mieter   850

Dimension: Party = Mieter Müller
```

Property und Unit können aus der zugeordneten Forderung übernommen werden, sofern die Zahlung eindeutig dieser Forderung zugeordnet ist.

---

# 151. Beispiel – Darlehensrate

```text
Banktransaktion -1.500 EUR (Tilgung 900, Zins 600)

Soll  Darlehensverbindlichkeit   900   Loan = Immobilienkredit Haus A
Soll  Zinsaufwand                600   Property = Haus A, Loan = Immobilienkredit Haus A
Haben Bank                     1.500
```

Tilgung bleibt Bestandsveränderung und ist kein Aufwand.

---

# 152. Party-Ledger

Party kann optional als Accounting-Dimension verwendet werden. Ohne eigene Debitoren-/Kreditorenkonten pro Person sind damit auswertbar:

```text
offene Forderungen je Mieter
Zahlungen je Mieter
Verbindlichkeiten je Lieferant
Zahlungen je Lieferant
Kaution je Mieter
Darlehen je Darlehensgeber
```

Die Fachidentität bleibt `Party` — nicht die DATEV-Kontonummer.

---

# 153. Keine steuerliche Beteiligtenverteilung im Journal

Die steuerliche Verteilung eines V+V-Ergebnisses auf Beteiligte erzeugt keine Accounting-Buchung.

```text
V+V-Ergebnis 20.000 EUR, A 50 % / B 50 %

Tax:  TaxPartyAllocation A = 10.000, TaxPartyAllocation B = 10.000

Nicht zulässig: JournalEntry „Soll Beteiligter A / Haben V+V-Ergebnis …“
```

Die Beteiligtenzurechnung ist steuerliche Feststellungslogik, kein wirtschaftlicher Geschäftsvorfall.

---

# 154. Sonderwerbungskosten eines Beteiligten

Individuell zurechenbare Sonderwerbungskosten werden nicht allein wegen ihrer steuerlichen Zurechnung im gemeinsamen Objektjournal umgebucht.

```text
A trägt persönlich 2.500 EUR Schuldzinsen

Tax: TaxEvent (allocationMode = DIRECT_TO_PARTY, partyId = A, amount = -2.500)
```

Ob zusätzlich ein AccountingEvent entsteht, hängt davon ab, ob der zugrunde liegende finanzielle Vorgang tatsächlich im von Mietfuchs verwalteten Finanzbereich erfasst wird. Die steuerliche Zurechnung allein erzeugt keine Buchung.

---

# 155. Feststellungsbescheid und Accounting

Ein Feststellungsbescheid verändert das Accounting nicht rückwirkend.

```text
Mietfuchs-AfA: 6.000 EUR · steuerlich anerkannt: 5.600 EUR

Accounting: unverändert
Tax:        TaxAssessmentAdjustment +400 EUR
            ggf. TaxBasisDecision: neue AfA-Basis für Folgejahre
```

Kein vorhandener JournalEntry wird verändert.

---

# 156. AccountingPeriod

```prisma
model AccountingPeriod {
  id          String @id @default(cuid())
  workspaceId String
  year        Int
  month       Int?
  status      AccountingPeriodStatus // OPEN | CLOSED
  closedAt    DateTime?
  closedBy    String?
  note        String?

  @@unique([workspaceId, year, month])
}
```

---

# 157. Periodenmodell für private Vermieter

Keine komplexe handelsrechtliche Abschlussperiodenlogik. Unterstützt: **Jahresperiode** (Default für kleine private Vermieter) oder optional Monatsperioden. Beispiel: `2025 CLOSED · 2026 OPEN`.

---

# 158. Periodensperre

Für eine geschlossene AccountingPeriod gilt: normales Posting mit PostingDate innerhalb der Periode → **REJECT**. Nicht mehr zulässig: Betrag, Konto, Dimension, PostingDate, Source oder JournalLines ändern.

---

# 159. Korrektur geschlossener Perioden

```text
Original Entry → Reversal / Adjustment → Corrected Entry
```

Der ursprüngliche Vorgang bleibt unverändert. Gehört eine Korrektur wirtschaftlich in eine geschlossene Vorperiode, dokumentiert das System explizit: Original period, Correction period, Reason, Referenz auf Original. Keine stille Rückdatierung.

---

# 160. JournalEntry-Erweiterung

```prisma
model JournalEntry {
  id           String @id @default(cuid())
  workspaceId  String
  eventId      String @unique
  postingDate  DateTime
  periodId     String?
  status       JournalStatus
  reversalOfId String?
  createdAt    DateTime @default(now())
  postedAt     DateTime?
}
```

`periodId` wird aus `postingDate` bestimmt bzw. validiert.

---

# 161. Idempotentes Posting

Jeder fachliche Posting-Vorgang muss idempotent sein. Wird `VendorInvoice ABC` durch einen Netzwerkfehler zweimal gepostet, entstehen **1 AccountingEvent und 1 JournalEntry** — nicht zwei. `sourceType + sourceId + eventType` bilden eine eindeutige fachliche Posting-Identität.

---

# 162. AccountingEvent-Erweiterung

```prisma
model AccountingEvent {
  id          String @id @default(cuid())
  workspaceId String
  type        AccountingEventType
  sourceType  String
  sourceId    String
  postingKey  String
  occurredAt  DateTime
  postedAt    DateTime?

  @@unique([workspaceId, postingKey])
}
```

Beispiele: `VENDOR_INVOICE:invoice_123:INITIAL_POSTING`, `VENDOR_INVOICE:invoice_123:REVERSAL:1`.

---

# 163. Posting Rules

Finanzielle Fachobjekte erzeugen ihre Accounting-Wirkung ausschließlich über definierte Posting Rules. Keine UI darf freie JournalLines für normale Geschäftsprozesse erzeugen.

```text
Source Document → Posting Rule → AccountingEvent → JournalEntry
```

---

# 164. Posting Rules – bestehende Vorgänge

```text
RENT_CHARGE · RENT_PAYMENT · OPERATING_COST_CHARGE · OPERATING_COST_SETTLEMENT
VENDOR_INVOICE · VENDOR_PAYMENT · DEPOSIT_RECEIPT · DEPOSIT_REFUND
LOAN_DISBURSEMENT · LOAN_PAYMENT · ASSET_ACQUISITION · DEPRECIATION
REVERSAL · ADJUSTMENT
```

---

# 165. Posting Rules – neue Fachobjekte

Die neuen Fachobjekte aus dem Steuer-/V+V-Addendum werden in zwei Gruppen getrennt (§166, §167).

---

# 166. Neue Fachobjekte mit Accounting-Wirkung

```text
AcquisitionCostItem · ExpenseRecord · Reimbursement · Grant receipt
DepositApplication · PropertyDisposal · WEG payment · Asset disposal
Loan-related cash transaction
```

Die konkrete Posting Rule hängt vom Fachvorgang ab.

---

# 167. Neue Fachobjekte ohne eigene Accounting-Wirkung

Folgende Objekte erzeugen niemals allein einen AccountingEvent:

```text
TaxEvent · TaxEntity · TaxParticipation · TaxDetermination
TaxDeterminationSnapshot · TaxDeterminationItem · TaxPartyAllocation
TaxAssessmentAdjustment · TaxBasisDecision · TaxReviewItem
RentAdequacyAssessment · LoanUseAllocation
```

Sie beschreiben steuerliche Recognition, Zurechnung, Bewertung, Entscheidung und Dokumentation — keinen eigenständigen wirtschaftlichen Geschäftsvorfall.

---

# 168. Reimbursement / Grant

```text
Förderzuschuss 5.000 EUR, Bank +5.000

Soll  Bank                     5.000
Haben Zuschuss / Erstattung    5.000
```

Tax ist ein separater Vorgang: Je steuerlicher Behandlung kann der Zuschuss steuerliche Einnahme sein, AK/HK beeinflussen oder steuerlichen Aufwand mindern. Die Accounting-Buchung entscheidet darüber nicht.

---

# 169. DepositApplication

```text
Kaution 2.400 EUR: 900 gegen Mietrückstand verrechnet, 1.500 zurückgezahlt

Verrechnung:  Soll Kautionsverbindlichkeit    900 · Haben Forderung Mieter   900
Rückzahlung:  Soll Kautionsverbindlichkeit  1.500 · Haben Bank             1.500
```

Die Kaution wird nicht als Mietertrag behandelt.

---

# 170. ExpenseRecord

Ein ExpenseRecord erzeugt einen AccountingEvent, wenn der finanzielle Vorgang innerhalb Mietfuchs vollständig erfasst wird:

```text
Porto 8,50 EUR vom verwalteten Bankkonto:
Soll sonstiger Aufwand 8,50 · Haben Bank 8,50
```

Extern bezahlte individuelle Sonderwerbungskosten eines Beteiligten werden dagegen ausschließlich steuerlich erfasst (`TaxEvent`, `DIRECT_TO_PARTY`). Das System muss beide Fälle unterscheiden.

---

# 171. WEG

Die WEG-Jahresabrechnung erzeugt nicht automatisch eine neue Zahlung. Zu unterscheiden: tatsächliche Hausgeldzahlung (Accounting) vs. Jahresabrechnungs-Klassifikation (fachlich/steuerlich). Die spätere Aufteilung in umlagefähige Betriebskosten, Verwaltungskosten, Erhaltungsrücklage und Erhaltungsaufwand darf nicht automatisch eine zweite Bank-/Aufwandsbuchung erzeugen. Doppelerfassung ist durch Invariantentests zu verhindern.

---

# 172. PropertyDisposal

Ein Verkauf/Abgang kann mehrere Accounting-Wirkungen auslösen (Kaufpreiszahlung, Asset-Ausbuchung, Darlehensablösung, Verkaufsnebenkosten). Die einzelnen Vorgänge bleiben getrennte Source Documents bzw. AccountingEvents. PropertyDisposal darf nicht pauschal eine einzige unstrukturierte Journalbuchung erzeugen.

---

# 173. Dimensionen bei Bankbuchungen

Nicht jede Bank-JournalLine benötigt sämtliche Dimensionen:

```text
Soll  Bank 850                      (optional ohne Property-Dimension)
Haben Forderung Mieter 850          (Property, Unit, Party)
```

Reporting muss sowohl JournalEntry-level context als auch JournalLine-level dimensions korrekt berücksichtigen.

---

# 174. Dimension Completeness Rules

Je AccountType oder PostingRule können Mindestdimensionen definiert werden:

```text
Mietertrag:               Property erforderlich · Unit normalerweise erforderlich · Party empfohlen
Gebäudeinstandhaltung:    Property erforderlich · Unit optional · TechnicalAsset optional
Mieterforderung:          Party + Property + Unit erforderlich
Darlehensverbindlichkeit: Loan erforderlich
Kautionsverbindlichkeit:  Party erforderlich · Lease-Kontext über Source erforderlich
```

---

# 175. DimensionRule

```prisma
model DimensionRule {
  id          String @id @default(cuid())
  accountId   String?
  eventType   AccountingEventType?
  propertyRequired       Boolean @default(false)
  unitRequired           Boolean @default(false)
  technicalAssetRequired Boolean @default(false)
  partyRequired          Boolean @default(false)
  loanRequired           Boolean @default(false)
}
```

Fehlende Pflichtdimension → Posting rejected. Kein stilles Weglassen.

---

# 176. Reporting aus Accounting

Accounting Reports funktionieren unabhängig von Tax: Property → FinancialCategory/Account, Unit → Kosten, TechnicalAsset → Kosten, Party → Forderungen/Verbindlichkeiten, Loan → Saldo/Tilgung/Zinsen, Bank → Cashflow. Tax Reports verwenden dagegen TaxEvent, TaxDetermination, TaxPartyAllocation, TaxBasisDecision.

---

# 177. DATEV Export

DATEV bleibt Adapter. Der Export kann JournalEntry/JournalLine, AccountMapping und die Dimensionen (Property, Unit, TechnicalAsset, Party, Loan) verwenden — je Konfiguration z. B. als Kostenstelle, Belegfeld oder Zusatzinformation. Die interne Domänenlogik darf nicht vom konkreten Exportformat abhängen.

---

# 178. Kein Debitoren-/Kreditorenzwang

Mietfuchs führt nicht für jeden Mieter/Lieferanten ein eigenes DATEV-Sachkonto als kanonische Identität. Intern gilt `Party` als fachliche Identität; DATEV-spezifische Debitoren-/Kreditorenlogik kann später über AccountMapping/ExportMapping ergänzt werden.

---

# 179. Keine freie Journalbuchung im Standard-UI

Der private Vermieter arbeitet mit Fachvorgängen (Rechnung erfassen, Zahlung zuordnen, Miete verbuchen, Kaution erhalten, Darlehensrate aufteilen, Aufwand erfassen, Zuschuss erfassen) — nicht mit Soll-/Haben-Eingabe. Eine freie Journalbuchung ist höchstens als ADMIN/EXPERT MODE für kontrollierte Sonderfälle vorgesehen, kein normaler Workflow.

---

# 180. Testfälle Accounting Dimensions

```text
T200 Property Split:     1.000 EUR Rechnung → Lines 600 (Property A) + 400 (Property B);
                         Summe der Dimensionsbeträge = 1.000
T201 Unit Dimension:     Reparatur 300 EUR → BUILDING_MAINTENANCE, Haus A, EG
T202 TechnicalAsset:     Wartung Gastherme EG 250 EUR → Asset-Dimension gesetzt,
                         Lifetime-Cost-Report +250
T203 Party Dimension:    Mieter-Charge 850 EUR → Forderungszeile mit Party = Mieter
T204 Loan Dimension:     Rate 900/600 → Tilgungszeile mit Loan; Zinszeile mit Loan + Property
```

---

# 181. Testfälle Period Lock

```text
T210 Closed Period:  2025 CLOSED · Posting mit postingDate 2025-12-20 → reject
T211 Reversal:       Original bleibt unverändert · Reversal referenziert Original ·
                     korrigierter Entry ist separat
```

---

# 182. Testfälle Tax vs. Accounting

```text
T220 TaxAssessmentAdjustment:  erklärt 6.000 / festgestellt 5.600
                               → Adjustment +400 · geänderte JournalEntries = 0
T221 TaxPartyAllocation:       20.000 auf A/B je 50 %
                               → Allocations 10.000/10.000 · AccountingEvents = 0
T222 TaxBasisDecision:         Basis erklärt 300.000 / festgestellt 292.000
                               → künftige Forecast-Basis 292.000 · Journal-Mutation = 0
```

---

# 183. Testfälle Idempotenz

```text
T230 Double Posting Request:  VendorInvoice.post() zweimal → 1 AccountingEvent, 1 JournalEntry
T231 Bank Matching Retry:     gleiche Banktransaktion zweimal demselben Payment zugeordnet
                              → 1 Payment, 1 Accounting-Wirkung, kein Doppel-Posting
```

---

# 184. Testfall WEG ohne Doppelbuchung

```text
12 × 300 EUR Hausgeld → 3.600 EUR Cash-Abfluss (Accounting)

Jahresabrechnung klassifiziert später:
  Betriebskosten 2.000 · Verwaltung 500 · Rücklagen-Zuführung 1.100

Expected: zusätzlicher Bank-Abfluss aus der Klassifikation = 0 EUR
```

Die Jahresabrechnung klassifiziert bestehende Vorgänge und erzeugt nicht nochmals 3.600 EUR Aufwand/Zahlung.

---

# 185. Definition of Done – Accounting Layer

- JournalLine unterstützt Property-, Unit-, TechnicalAsset-, Party- und Loan-Dimension.
- Dimensionsregeln sind validierbar; Dimensionen sind nach Posting unveränderlich.
- AccountingPeriod existiert; geschlossene Perioden blockieren normale Rückbuchungen.
- Reversal/Adjustment funktioniert; Posting ist idempotent; keine doppelten JournalEntries je Source Posting.
- Alle wesentlichen finanziellen Fachobjekte besitzen definierte Posting Rules.
- TaxEvent, TaxDetermination, TaxPartyAllocation, TaxAssessmentAdjustment und TaxBasisDecision erzeugen niemals allein Accounting.
- Feststellungsbescheide verändern kein historisches Journal.
- WEG-Jahresabrechnung erzeugt keine Doppelbuchung bereits geleisteter Hausgelder.
- Beteiligtenverteilung bleibt ausschließlich in der Tax-Schicht.
- DATEV bleibt Export-/Mappingadapter.
- Der Standardnutzer muss keine Soll-/Haben-Buchungen erfassen.

---

# 186. Aktualisierte Gesamtarchitektur

```text
                              DOMAIN
                                │
      ┌─────────────────────────┼─────────────────────────┐
      │                         │                         │
      ↓                         ↓                         ↓
 Lease / Charge          VendorInvoice              Loan / Asset
 Payment / Deposit       ExpenseRecord              Reimbursement
 BankTransaction         WEG / Disposal             Acquisition
      │                         │                         │
      └─────────────────────────┼─────────────────────────┘
                                │
                     Source Documents
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
              ↓                                   ↓
        ACCOUNTING                             TAX
              │                                   │
        Posting Rules                       Recognition Rules
              │                                   │
              ↓                                   ↓
      AccountingEvent                         TaxEvent
              │                                   │
              ↓                                   ↓
       JournalEntry                      TaxDetermination
              │                                   │
              ↓                         ┌─────────┼─────────┐
        JournalLine                     ↓         ↓         ↓
              │                      Forecast  Declared  Assessed
              │                                   │
     ┌────────┼─────────┐                         ↓
     ↓        ↓         ↓                  Assessment Delta
  Account  Dimensions  Period                      │
     │        │                                     ↓
     │   Property / Unit                    TaxBasisDecision
     │   Asset / Party                             │
     │   Loan                                      ↓
     │                                      Future Tax Forecast
     ↓
Financial Reports
Bank / Open Items
DATEV Export
```

---

# 187. Fachliche Leitentscheidung

Die Accounting-Schicht dient der wirtschaftlichen Integrität und Nachvollziehbarkeit. Die Tax-Schicht dient der steuerlichen Behandlung von Vermietung und Verpachtung. Beide Schichten betrachten dieselben realen Vorgänge, beantworten aber unterschiedliche Fragen.

> Accounting beschreibt, was wirtschaftlich passiert ist. Tax beschreibt, wie dieser Vorgang für Vermietung und Verpachtung steuerlich zu behandeln ist. Keine der beiden Schichten darf stillschweigend die andere ersetzen oder rückwirkend verändern.

---

# 188. Addendum: Vermieter-Alltag, Lifecycle und operative Hausverwaltung

**Stand:** 30.08.2026 · Ergänzt §§1–187 · Zielgruppe: private Vermieter in Deutschland, typischerweise 1–50 Einheiten, Self-Hosting/lokaler Betrieb bevorzugt.

## 188.1 Ausgangspunkt

Die bisherige Spezifikation deckt Finanz-, Steuer- und Datenarchitektur bereits sehr tief ab (Property/Lease/Party, Charges/Payments, CAMT, ExpenseAllocation, Betriebskosten, Technik, Kaution, Darlehen, AfA, Tax Layer, Accounting Layer, DATEV, OIDC, Dokumente). Der verbleibende wesentliche Produkt-Gap liegt nicht mehr in der Finanz- oder Steuerarchitektur — er liegt im **operativen Vermieter-Alltag**.

Die zentrale Produktfrage lautet künftig zusätzlich:

> Nicht nur: „Wie wird dieser Sachverhalt korrekt gespeichert, abgerechnet, gebucht oder steuerlich behandelt?"
> Sondern auch: „Was muss der Vermieter jetzt tun, was ist überfällig und welcher Vorgang ist noch nicht abgeschlossen?"

Mietfuchs wird deshalb um eine schlanke operative Schicht ergänzt.

---

# 189. Produktprinzip: vom Datenbestand zum Vermieter-Arbeitsplatz

Die Fachobjekte bleiben unverändert. Neu kommt eine operative Sicht hinzu:

```text
Fachobjekt
    ├── erzeugt ggf. Vorgang
    ├── erzeugt ggf. Aufgabe
    ├── erzeugt ggf. Frist
    ├── erzeugt ggf. Korrespondenz
    └── erscheint ggf. in der Inbox
```

Beispiele:

```text
Lease endet         → MoveOutCase → Übergabetermin → Auszugsprotokoll → Zählerstände
                      → Schlüsselrückgabe → offene Forderungen prüfen → Kaution abrechnen
                      → Vorgang schließen
Charge überfällig   → DunningCase → Zahlungserinnerung → Wiedervorlage → ggf. nächste
                      Mahnstufe → Zahlungseingang → Vorgang automatisch schließen
MaintenancePlan fällig → MaintenanceCase → Angebot/Auftrag → Termin → Durchführung
                      → Rechnung → MaintenanceEvent → nächste Fälligkeit
```

Die operative Schicht ersetzt keine Domänenobjekte und erzeugt keine zweite Wahrheit.

---

# 190. Neue Invarianten 61–85

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

---

# 191. M11 – Vorgänge, Aufgaben, Fristen und Inbox

## 191.1 Ziel

Eine generische operative Schicht für alle wiederkehrenden und einmaligen Verwaltungsprozesse. Keine Domäne entwickelt künftig ein eigenes inkompatibles Aufgaben- oder Erinnerungssystem.

## 191.2 OperationalCase

Case-Typen: `MOVE_IN, MOVE_OUT, RENT_ADJUSTMENT, DUNNING, DAMAGE, MAINTENANCE, SERVICE_CONTRACT, INSURANCE, OPERATING_COST_SETTLEMENT, CO2_REIMBURSEMENT, TAX_PREPARATION, DOCUMENT_REQUEST, GENERAL`

```prisma
model OperationalCase {
  id              String   @id @default(cuid())
  workspaceId     String
  type            CaseType
  title           String
  description     String?
  status          CaseStatus   // OPEN | IN_PROGRESS | WAITING_EXTERNAL | WAITING_TENANT
                               // | WAITING_VENDOR | WAITING_OWNER | COMPLETED | CANCELLED
  priority        CasePriority // LOW | NORMAL | HIGH | URGENT
  ownerUserId     String?
  startedAt       DateTime?
  dueAt           DateTime?
  completedAt     DateTime?
  propertyId      String?
  buildingId      String?
  unitId          String?
  leaseId         String?
  partyId         String?
  technicalAssetId String?
  ticketId        String?
  workOrderId     String?
  serviceContractId String?
  chargeId        String?
  templateId      String?
  parentCaseId    String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

## 191.3 Task und ChecklistItem

```prisma
model Task {
  id            String @id @default(cuid())
  workspaceId   String
  caseId        String?
  title         String
  description   String?
  assignedToId  String?
  dueAt         DateTime?
  status        TaskStatus
  completedAt   DateTime?
  sortOrder     Int
}
```

Beispiel-Checkliste Move-out: Kündigung dokumentieren · Übergabetermin abstimmen · Zählerstände erfassen · Schlüssel vollständig zurücknehmen · Schäden dokumentieren · Nachsendeadresse erfassen · offene Forderungen prüfen · Kaution abrechnen · Einheit auf VACANT_FOR_RENT setzen.

## 191.4 Deadline

```prisma
model Deadline {
  id              String @id @default(cuid())
  workspaceId     String
  caseId          String?
  leaseId         String?
  propertyId      String?
  settlementId    String?
  serviceContractId String?
  type            DeadlineType
  baseDate        DateTime
  dueDate         DateTime
  calculationRule String?
  ruleVersion     String?
  legalBasis      String?
  source          DeadlineSource // LEGAL_RULE | CONTRACT | USER_DEFINED
                                 // | MAINTENANCE_PLAN | SYSTEM_WORKFLOW
  status          DeadlineStatus
  confirmedByUser Boolean @default(false)
  completedAt     DateTime?
}
```

Eine automatisch berechnete Frist muss immer anzeigen: Warum existiert sie? Aus welchem Datum berechnet? Nach welcher Regelversion? Gesetzlich, vertraglich oder nur organisatorisch?

## 191.5 Reminder

Ein Reminder ist nur eine Benachrichtigung zu Vorgang/Task/Deadline (z. B. 30/14/7 Tage vorher, am Fälligkeitstag, 1 Tag überfällig). Reminder verändern keine Fachobjekte.

## 191.6 WorkflowTemplate

Wiederkehrende Vorgänge (Move-in, Move-out, Schadensmeldung, Jahres-NK-Abrechnung, Versicherungsverlängerung, Heizungswartung, Mieterhöhung, Steuerjahresabschluss, CO2-Erstattungsantrag) werden aus **versionierten** Vorlagen erzeugt: Standardaufgaben, relative Fälligkeiten, Standardverantwortliche, Dokumentvorlagen, notwendige Fachobjekte, Abschlussbedingungen. Eine Vorlagenänderung verändert laufende Vorgänge nicht rückwirkend.

---

# 192. Operative Inbox und Kalender

## 192.1 Ziel

Die Startseite beantwortet primär: **„Was muss ich heute tun?"** — nicht „Welche Tabelle möchte ich öffnen?"

## 192.2 Inbox-Kategorien

```text
ÜBERFÄLLIG · HEUTE · DIESE WOCHE · WARTET AUF MICH · WARTET AUF MIETER
WARTET AUF DIENSTLEISTER · UNKLARE BANKUMSÄTZE · ÜBERFÄLLIGE MIETEN
OFFENE RECHNUNGEN · ABRECHNUNGEN MIT FRISTRISIKO · WARTUNGEN
VERTRAGSFRISTEN · STEUERLICHE PRÜFPUNKTE
```

Die Inbox speichert möglichst keine redundanten fachlichen Zustände; sie aggregiert OperationalCase, Task, Deadline, Charge, BankTransaction, Ticket, WorkOrder, MaintenancePlan, ServiceContract, Settlement, TaxReviewItem.

## 192.3 Kalender

Ansichten: Monat, Woche, Agenda, Objekt. Einträge: Termine, Übergaben, Besichtigungen, Wartungen, Vertragsfristen, Aufgaben, Abrechnungsfristen, Wiedervorlagen. P1: read-only ICS-Feed. P2: CalDAV/externe Kalenderadapter. Ein externer Kalender darf niemals führendes System für Fachfristen werden.

---

# 193. M12 – vollständiger Mietvertrags-Lifecycle

Lease beschreibt den Vertrag; ein zusätzlicher Lifecycle beschreibt die operativen Ereignisse:

```text
Vorvermietung → Vertrag → Einzug → laufende Vermietung → Kündigung/Vertragsende
→ Auszug → Schäden/Forderungen → Kautionsabschluss → Archiv
```

---

# 194. LeaseLifecycleEvent

```prisma
model LeaseLifecycleEvent {
  id          String @id @default(cuid())
  workspaceId String
  leaseId     String
  type        LeaseLifecycleEventType
  occurredAt  DateTime
  caseId      String?
  documentId  String?
  note        String?
}
```

Typen: `CONTRACT_CREATED, CONTRACT_SIGNED, MOVE_IN_PLANNED, MOVE_IN_COMPLETED, NOTICE_RECEIVED, NOTICE_CONFIRMED, LEASE_END_CONFIRMED, MOVE_OUT_PLANNED, MOVE_OUT_COMPLETED, DEPOSIT_SETTLEMENT_STARTED, DEPOSIT_SETTLED, LEASE_ARCHIVED`. Diese Events ersetzen niemals die historisierten Vertragsdaten.

---

# 195. Übergabe- und Abnahmeprotokoll

## 195.1 Inspection

```prisma
model Inspection {
  id          String @id @default(cuid())
  workspaceId String
  type        InspectionType   // MOVE_IN | MOVE_OUT | INTERIM | TECHNICAL | DAMAGE | OTHER
  status      InspectionStatus
  propertyId  String
  unitId      String?
  leaseId     String?
  scheduledAt DateTime?
  startedAt   DateTime?
  completedAt DateTime?
  caseId      String?
  generatedDocumentId String?
}
```

## 195.2 Räume und Feststellungen

```text
Inspection
 ├── InspectionArea
 │    ├── InspectionFinding
 │    └── Documents/Fotos
 ├── MeterReadings
 ├── KeyHandovers
 └── Participants
```

InspectionFinding: Zustand, Beschreibung, Kategorie, Schweregrad, Foto(s), bereits vorhanden?, neu festgestellt?, Mieter anerkannt?, weitere Bearbeitung erforderlich? Fotos laufen über das bestehende Dokument-/Storage-System.

---

# 196. Zähler bei Einzug/Auszug

Es entsteht keine zweite Zählerwelt. Ein im Übergabeprotokoll erfasster Stand erzeugt einen regulären `MeterReading` mit `source = INSPECTION`, `inspectionId`, optional `photoDocumentId`, `submittedBy`, `confirmedBy`.

---

# 197. Schlüsselverwaltung

## 197.1 KeySet

```text
Property / Unit / Lease → KeySet → KeyItem
```

Schlüsselarten z. B. Haustür, Wohnung, Keller, Briefkasten, Garage, Tor, Technikraum — je Art: expectedCount, issuedCount, returnedCount, identifier?, note?.

## 197.2 KeyHandover

Jede Ausgabe/Rückgabe wird historisiert: `ISSUE, RETURN, LOST, REPLACED`. Ein fehlender Schlüssel wird nicht nur als Freitext im Übergabeprotokoll gespeichert.

---

# 198. Schäden beim Auszug

```text
InspectionFinding
       ↓
DamageClaim
       ├── WorkOrder
       ├── VendorInvoice
       ├── Charge
       └── DepositApplication
```

Sauber getrennt: Was wurde festgestellt? Was wurde repariert? Was hat es gekostet? Wer trägt welchen Betrag?

---

# 199. Wohnungsgeberbestätigung

Der Move-in-Workflow enthält einen Generator für die Wohnungsgeberbestätigung — ausschließlich aus vorhandenen Stammdaten (Wohnungsgeber, ggf. Eigentümer, einziehende Personen, Objektanschrift, Einzugsdatum). Das erzeugte Dokument wird als GeneratedDocument dem Lease, der Party und dem MoveInCase zugeordnet. Die Vorlage ist versioniert; rechtliche Inhalte werden nie still per Softwareupdate ausgetauscht, nachdem ein Dokument erzeugt wurde.

---

# 200. Kündigung und Vertragsende

Ein Kündigungsvorgang speichert mindestens: `noticeReceivedAt, noticeByParty, noticeType, requestedEndDate, confirmedEndDate, documentId, caseId`. Die juristische Wirksamkeit wird nicht automatisch behauptet. Mietfuchs unterstützt: Eingang dokumentieren, Fristen vorberechnen, Prüfungshinweise anzeigen, Kündigungsbestätigung erzeugen, Übergabeprozess starten, Lease-Ende nach Bestätigung historisieren.

---

# 201. Mieterhöhung als Workflow

RentAdjustment bleibt fachliche Entität; ergänzt werden Prozesszustände: `DRAFT, CALCULATED, REVIEW_REQUIRED, APPROVED, NOTICE_GENERATED, SENT, EFFECTIVE, REJECTED, CANCELLED`. Methoden mindestens: `INDEX, STEP, AGREEMENT, COMPARABLE_RENT, MODERNIZATION, MANUAL`. Für INDEX und STEP kann stärker automatisiert werden; für komplexere Tatbestände gilt: berechnen/vorbereiten/dokumentieren ≠ rechtliche Zulässigkeit verbindlich feststellen. Eine wirksame Anpassung erzeugt neue historisierte LeaseComponent-Perioden.

---

# 202. M13 – Forderungsmanagement und Mahnwesen

Die Kette `Charge → Payment → PaymentAllocation → Outstanding` wird um den operativen Forderungsprozess ergänzt.

---

# 203. DunningCase

```text
Charge bleibt unverändert → DunningCase → DunningAction[]
```

DunningAction: `REMINDER, FIRST_NOTICE, SECOND_NOTICE, FINAL_NOTICE, PAYMENT_AGREEMENT, HANDOVER_LEGAL, DISPUTED, WRITE_OFF_PROPOSAL, CLOSED` — jede Aktion speichert date, outstandingAmountSnapshot, generatedDocumentId?, correspondenceId?, note.

---

# 204. Mahnregeln

Konfigurierbar je Workspace: Grace Period, Reminder nach X Tagen, weitere Wiedervorlage nach X Tagen, Mahngebühr optional, Verzugszinsberechnung optional. Keine rechtlich zulässige Pauschale/Gebühr wird ohne konfigurierbare Regel und nachvollziehbare Grundlage hart codiert.

---

# 205. Mahnkosten

Mahnkosten/Nebenforderungen sind **eigene** Charges (`Charge Miete 1.000 EUR` + `Charge Mahnkosten 5 EUR`), nie eine Mutation der Ursprungsforderung — Zahlung, Steuer, Erlass, Rechtsstreit und Auswertung bleiben nachvollziehbar.

---

# 206. Zahlungsvereinbarung

`PaymentAgreement` / `PaymentAgreementInstallment`: debtorParty, linkedCharges, agreedTotal, installments, dueDates, status, document. Eine Ratenzahlungsvereinbarung verändert die Ursprungsforderungen nicht rückwirkend.

---

# 207. SEPA

P1: SepaMandate, pain.008-Export, Mandatsreferenz, Unterschriftsdatum, Status, letzte Verwendung. Optional später: pain.001-Überweisungsdatei. Mietfuchs wird kein Payment Service Provider.

---

# 208. Dokumente werden zur Dokumentenakte

Document bleibt der gespeicherte Inhalt. Zusätzliche fachliche Ebenen: `Document, GeneratedDocument, Template, Correspondence, Delivery`.

---

# 209. Template

```prisma
model DocumentTemplate {
  id             String @id @default(cuid())
  workspaceId    String
  type           TemplateType
  name           String
  subjectTemplate String?
  bodyTemplate    String
  version        Int
  status         TemplateStatus
  jurisdiction   String?
  validFrom      DateTime?
  validTo        DateTime?
  reviewedAt     DateTime?
  sourceNote     String?
  createdAt      DateTime @default(now())
}
```

Beispiele: Wohnungsgeberbestätigung, Übergabeprotokoll, Zahlungserinnerung, Mahnung, Kündigungsbestätigung, Index-/Staffelmieterhöhung, Mietschuldenfreiheitsbescheinigung, Ankündigung Wartung, Schreiben Betriebskostenabrechnung. Eigene Templates müssen möglich sein.

---

# 210. GeneratedDocument

Beim Rendern werden gespeichert: templateId, templateVersion, renderedAt, contextSnapshot, SHA-256, Document. Beim Versand wird das erzeugte Dokument unveränderlich — spätere Stammdaten- oder Vorlagenänderungen verändern es nicht.

---

# 211. Correspondence

Der kommunizierte Inhalt: sender, recipient(s), subject, body, relatedCase/Lease/Property, attachments.

---

# 212. Delivery

Kanäle: `EMAIL, PORTAL, PRINT, LETTER, REGISTERED_LETTER, MANUAL_HANDOVER` — Core-V1: EMAIL, PORTAL, PRINT/PDF, MANUAL_HANDOVER; postalische Versanddienste später als Adapter. Status: `DRAFT, QUEUED, SENT, DELIVERED_BY_PROVIDER, FAILED, BOUNCED, ACKNOWLEDGED`. **Wichtig:** DELIVERED_BY_PROVIDER ist nur der technisch gemeldete Providerstatus — Mietfuchs behauptet daraus keinen rechtssicheren Zugang.

---

# 213. Outbox

Zentrale Postausgangsansicht: Entwürfe, wartet auf Versand, gesendet, fehlgeschlagen. Fehlgeschlagene E-Mails verschwinden niemals still; Retry muss explizit möglich sein.

---

# 214. Serien- und Objektkommunikation

Beispiele: Wasser wird abgestellt, Heizungswartung, Baumaßnahme, Hausordnung, Ablesetermin. Vor Versand werden Objekt, Einheiten, Mietverhältnisse, konkrete Empfänger, Versandkanäle und Anhänge angezeigt; beim Versand wird der Empfängerkreis als Snapshot eingefroren.

---

# 215. M14 – Verträge, Dienstleister und Objektbetrieb

## 215.1 ServiceContract

Rechnungen reichen für die laufende Objektverwaltung nicht aus — der Vertrag wird eigenständig modelliert:

```prisma
model ServiceContract {
  id              String @id @default(cuid())
  workspaceId     String
  type            ServiceContractType
  propertyId      String?
  buildingId      String?
  unitId          String?
  technicalAssetId String?
  providerPartyId String
  contractNumber  String?
  title           String
  startDate       DateTime
  initialEndDate  DateTime?
  noticePeriodValue Int?
  noticePeriodUnit  PeriodUnit?
  renewalValue    Int?
  renewalUnit     PeriodUnit?
  nextTerminationDate DateTime?
  expectedAnnualCostCents Int?
  status          ContractStatus
  documentId      String?
}
```

Typen: `MAINTENANCE, INSURANCE, ENERGY, WATER, ELECTRICITY, INTERNET, CABLE, CLEANING, GARDEN, CARETAKER, ELEVATOR, SMOKE_DETECTOR, METERING_SERVICE, WASTE, OTHER`

---

# 216. Vertragsfristen

Aus Vertragsdaten entstehen operative Hinweise: Vertragsende, nächste Kündigungsmöglichkeit, Preisprüfung, automatische Verlängerung, nächste Wartung. Berechnete Kündigungstermine zeigen ihre Grundlage; der Anwender kann bestätigen oder korrigieren.

---

# 217. Versicherungen

Versicherungen sind spezialisierte ServiceContracts mit Zusatzfeldern: policyNumber, coverageType, insuredValue?, deductible?, renewalDate?, brokerPartyId?. Typen z. B. `BUILDING, LIABILITY, ELEMENTARY, GLASS, LEGAL, OTHER`. Versicherungsleistungen/Erstattungen laufen über die Reimbursement-Logik (§82.14, §168).

---

# 218. Dienstleisterakte

Party bleibt Personen-/Unternehmensidentität. Ein Dienstleister erhält über Relationen: Gewerke, Objekte, ServiceContracts, VendorQuotes, WorkOrders, VendorInvoices, Tickets, MaintenanceEvents. Auswertbar: letzter Auftrag, offene Aufträge, Gesamtkosten, Reaktionszeit optional, betreute Anlagen. Kein globales `PersonType = HANDWERKER`.

---

# 219. Angebot vor Auftrag

Neu: **VendorQuote**. Ablauf: `Ticket → Angebotsanfrage → 1..n VendorQuote → Auswahl → WorkOrder → VendorInvoice`. VendorQuote enthält mindestens vendor, amount, date, validUntil, scope, document, status. Damit lassen sich Maßnahmen kalkulieren, bevor Kosten entstehen.

---

# 220. Gewährleistung / Garantie

Bei technischen Anlagen und abgeschlossenen WorkOrders speicherbar: warrantyUntil, warrantyType, warrantyDocument. Bei neuem Ticket zur selben Anlage: Hinweis „Möglicherweise Gewährleistung/Garantie vorhanden." — keine automatische rechtliche Entscheidung.

---

# 221. Wiederkehrende Betreiber- und Kontrollpflichten

Das Deadline-/Maintenance-System kann Vorlagen enthalten (Wartung, Prüfung, Ablesung, Vertragskontrolle, Versicherungsprüfung). Rechtliche/technische Pflichten werden nur als versionierte Templates mit Quelle und Prüfdatum ausgeliefert — niemals als universell geltende Pflicht für jedes Objekt angenommen.

---

# 222. CO₂-Kostenaufteilung wird P0

Die modulare Architektur bleibt (`OperatingCosts Core ├── CO2Allocation └── HeatingCostIntegration`). Eine vollständige eigene HeizkostenV-Engine bleibt zunächst optional — **CO2Allocation gehört zum produktiven Kern**.

---

# 223. Zwei CO₂-Workflows

## 223.1 Vermieter beschafft Wärme/Brennstoff

```text
Supplier Invoice → Brennstoff-/Wärmedaten → CO2AllocationCalculation
→ landlordShare / tenantShare → Betriebskostenabrechnung
```

## 223.2 Mieter versorgt sich selbst (z. B. Gasetagenheizung)

```text
Tenant reicht Abrechnung/Nachweis ein → CO2ReimbursementCase → Prüfung
→ CO2AllocationCalculation → landlordShare → Auszahlung oder Verrechnung → Abschluss
```

Dieser Fall muss unabhängig von einer zentralen Heizkostenabrechnung funktionieren.

---

# 224. CO2AllocationCalculation

Felder: sourceDocument, building, period, energyCarrier, energyQuantity, co2Quantity, co2Cost, buildingArea, ruleVersion, calculationInputs, landlordShare, tenantShare, manualOverride?, overrideReason?. Das Ergebnis muss jederzeit reproduzierbar sein; gesetzliche Stufen/Regeln stehen nicht als verstreute Magic Numbers im Fachcode.

---

# 225. Externe Heizkostenabrechnung

Für viele private Vermieter ist ein externer Messdienst sinnvoll. P1: **HeatingCostStatementImport** — manuelle Erfassung, CSV-Import, strukturierter Adapter, PDF als Originalbeleg.

```text
externe Abrechnung → Import → Zuordnung Property/Unit/Lease → Plausibilitätsprüfung
→ freigegebener Snapshot → SettlementInput
```

Keine stillschweigende Übernahme ungeprüfter Fremddaten.

---

# 226. Unterjährige Verbrauchsinformation (UVI)

P1: ConsumptionPeriod, ConsumptionValue, ConsumptionComparison, ConsumptionNotice — getrennt von der eigentlichen Betriebskostenabrechnung. Datenquellen: `MANUAL, IMPORT, PORTAL, EXTERNAL_METER_SERVICE, API`. P2: herstellerspezifische Adapter, generische REST-Adapter. Mietfuchs wird nicht zum proprietären Funkzähler-Gateway.

---

# 227. M15 – Mieterportal

Die Rolle TENANT wird fachlich umgesetzt. Der Mieter sieht ausschließlich explizit freigegebene eigene Ressourcen.

---

# 228. Portal-Funktionen P1

Mieter können: eigene Stammdaten ansehen, Mietvertragsdokumente ansehen, Betriebskostenabrechnungen ansehen, freigegebene Belege ansehen, Mietkonto/offene Positionen ansehen, Nachrichten empfangen/beantworten, Schadensmeldung erstellen, Fotos hochladen, Zählerstände einreichen, Termine/Übergaben ansehen, Dokumente herunterladen.

Nicht automatisch: Fachdatensätze ändern, Zahlungen verbuchen, Lease/Charge ändern, bestehende MeterReadings überschreiben.

---

# 229. PortalSubmission

Alle schreibenden Portalaktionen laufen über kontrollierte Submissions: MaintenanceSubmission, MeterReadingSubmission, ContactChangeRequest, DocumentSubmission, GeneralMessage.

```text
Mieter meldet Zählerstand 12.345 → MeterReadingSubmission → Plausibilitätsprüfung
→ Accept → MeterReading
```

Nicht: Portal → direkt UPDATE MeterReading.

---

# 230. Schadensmeldung aus dem Portal

```text
MaintenanceSubmission → Ticket → WorkOrder → MaintenanceEvent
```

Der Mieter sieht den für ihn freigegebenen Bearbeitungsstatus (eingegangen, in Prüfung, beauftragt, Termin vereinbaren, erledigt). Interne Notizen und Kosten bleiben getrennt.

---

# 231. Portal-Dokumentfreigabe

Eigene Relation **DocumentPortalGrant**: documentId, leaseId, partyId/userId, grantedAt, revokedAt?, grantedBy. Ein Dokument ist nie allein deshalb für einen Mieter sichtbar, weil es mit derselben Wohnung verknüpft ist.

---

# 232. Tenant Home Guide

P2: Je Wohnung/Objekt eine kleine Informationsseite (Hausmeister/Notfallkontakt, Heizung, Müll, Internet, Hausordnung, Schlüsselhinweise, Wasserabsperrung, Zähler, FAQ). Ersetzt keinen Mietvertrag.

---

# 233. PWA statt nativer App

Keine native iOS-/Android-App erforderlich. Die Webanwendung muss als responsive PWA insbesondere unterstützen: Übergabeprotokoll, Fotos, Zählerablesung, Schadensaufnahme, Aufgaben abhaken, Dokument anzeigen, Nachricht senden. P1: temporärer lokaler Entwurf bei Verbindungsabbruch — ein Offline-Entwurf gilt erst nach erfolgreicher Synchronisation als abgeschlossen.

---

# 234. M16 – Portfolio, Cashflow und Planung

Die vorhandenen Daten werden zu einer Vermieter-Managementsicht zusammengeführt.

---

# 235. Dashboard

```text
Handlungsbedarf: überfällige Aufgaben · überfällige Mieten · unklare Bankumsätze
                 offene Tickets · anstehende Wartungen · anstehende Vertragsfristen
                 gefährdete Abrechnungsfristen · steuerliche Prüfpunkte
Vermietung:      Einheiten gesamt · vermietet · leerstehend · in Übergabe
                 auslaufende Mietverträge
Finanzen:        Sollmiete Monat · Istmiete Monat · Rückstände · Einnahmen · Ausgaben
                 Cashflow · nicht umlagefähige Kosten
Technik:         offene Tickets · überfällige Wartungen · Kosten laufendes Jahr
```

---

# 236. Objekt-Cockpit

Je Property: Mieterliste, Soll/Ist-Miete, offene Forderungen, Betriebskostenstatus, laufende Verträge, Darlehen, Technische Assets, Wartungen, Tickets, Dokumente, Cashflow, Instandhaltungskosten, steuerlicher Status. Der Anwender darf nicht zwischen sechs Modulen springen müssen, um den Gesamtzustand eines Hauses zu verstehen.

---

# 237. Kennzahlen

Mindestens: `occupancyRate, rentCollectionRate, outstandingRent, operatingIncome, nonRecoverableCosts, maintenanceCost, maintenanceCostPerM2, interestCost, principalPayments, cashFlowBeforeFinancing, cashFlowAfterFinancing`. Optional bei vorhandenem Anschaffungs-/Marktwert: `grossRentalYield, netRentalYield`. Jede Kennzahl besitzt eine dokumentierte Berechnungsdefinition.

---

# 238. Cashflow-Forecast

Forecast über mindestens 12 Monate, optional 24/36. Inputs: LeaseComponents, geplante RentAdjustments, Loans, ServiceContracts, MaintenancePlans, RecurringExpenses, Budget, CapitalProjects. Outputs je Monat: erwartete Einnahmen, laufende Kosten, Zinsen, Tilgung, geplante Investitionen, erwarteter Netto-Cashflow. **Der Forecast ist kein Accounting und kein TaxEvent.**

---

# 239. Budget

`Budget` / `BudgetLine` mit Dimensionen Property, FinancialCategory, TechnicalAsset optional, Year/Period. Vergleich: Budget · Committed · Actual · Forecast · Variance.

---

# 240. CapitalProject

Größere Maßnahmen (Dach, PV, Heizung, Fenster, Fassade, Badsanierung) getrennt von einzelnen Tickets:

```text
CapitalProject
 ├── Budget
 ├── VendorQuotes
 ├── WorkOrders
 ├── VendorInvoices
 ├── TechnicalAssets
 └── Documents
```

Geplante und tatsächliche Kosten vergleichbar. Steuerliche Aktivierung folgt weiterhin ausschließlich der Tax Layer.

---

# 241. M17 – Datenportabilität und technischer Betrieb

Self-hosted Software darf ihre Nutzer nicht in der eigenen Datenbank einsperren.

---

# 242. Massenimport

Import-Assistenten mindestens für: Properties, Buildings, Units, Parties, Leases, LeaseComponents, historische Mietänderungen, Charges, Payments, BankTransactions optional, Meters, MeterReadings, TechnicalAssets, Loans, Depreciation opening values, ServiceContracts. Formate: CSV, XLSX.

```text
Upload → Spalten-Mapping → Preview → Validierung → Fehlerliste → Dry Run
→ Import → Ergebnisprotokoll
```

Kein stilles Ignorieren fehlerhafter Zeilen.

---

# 243. Historische Anfangsbestände

Für Umsteiger unterstützt das System einen definierten Stichtag: Mietforderung zum Stichtag, Kautionssaldo, Darlehensrestschuld, AfA-Restwert, Bank-Anfangsbestand, offener §82b-Betrag, Rücklagenbestand. Keine vollständige historische Rekonstruktion zwingend erforderlich.

---

# 244. Vollständiger Datenexport

Jederzeit vollständiger Export: `metadata.json, properties.csv, units.csv, parties.csv, leases.csv, …, documents/`. Optional: JSON domain export. Ziel: **Kein Vendor Lock-in — auch nicht bei Self-Hosting.**

---

# 245. Backup und Restore

PostgreSQL und Dokumentstorage müssen gemeinsam sicherbar sein. Admin-UI zeigt: letztes erfolgreiches Backup, Backup-Alter, DB-Größe, Storage-Größe, Restore-Dokumentation. P1: manuell auslösbares konsistentes Backup-Paket. P2: Backup-Scheduler. **Restore muss in Integrationstests tatsächlich geprüft werden** — ein Backup, das nie testweise wiederhergestellt wurde, gilt nicht als nachgewiesene Wiederherstellbarkeit.

---

# 246. System-Administration

Admin-Cockpit: App-Version, DB-Schema-Version, Migration-Status, PostgreSQL erreichbar, Storage schreibbar, freier Speicher, SMTP-Status, OIDC-Status, Ollama/AI-Status optional, letzter CAMT-Import, letztes Backup, fehlgeschlagene Jobs, Outbox-Fehler. Aktionen: SMTP testen, OIDC-Konfiguration testen, Storage testen, Backup auslösen, Systemdiagnose exportieren. Keine Secrets vollständig im UI anzeigen.

---

# 247. Hintergrundjobs

Der modulare Monolith erhält eine kontrollierte Job-Schicht: Charge generation, Deadline generation, Reminder generation, Maintenance due check, ServiceContract due check, Dunning suggestions, Tax year checks, Backup optional, Outbox delivery. Anforderungen: idempotent, retry-fähig, sichtbarer Status, Fehlerhistorie, kein stiller Datenverlust. Kein Microservice-System erforderlich.

---

# 248. Audit Trail

Zusätzlich zum unveränderlichen Accounting-Journal ein operativer Audit Trail. Mindestens: `CREATE, UPDATE, DELETE/ARCHIVE, STATUS_CHANGE, PORTAL_GRANT, PORTAL_REVOKE, SEND, IMPORT, APPROVE, REJECT` — gespeichert mit user, timestamp, entity, entityId, action, summary, relevanten before/after-Werten. Passwörter, Tokens oder andere Secrets werden niemals in Audit-Diffs gespeichert.

---

# 249. Datenschutz und Aufbewahrung

Status und Aufbewahrung personenbezogener Daten werden getrennt von Löschung modelliert. Besonders relevant: ehemalige Mieter, Interessenten, Portalaccounts, Korrespondenz, Schadensfotos, Bewerbungsunterlagen. P2: RetentionPolicy, RetentionCandidate, ReviewBeforeDeletion. Keine automatische Löschung aufbewahrungspflichtiger Dokumente allein aufgrund des Alters.

---

# 250. P2 – Leerstand und Neuvermietung

Relevant, aber keine Voraussetzung für Mietfuchs Next 1.0. Minimaler späterer Workflow:

```text
Unit wird frei → VacancyCase → Prospect → Viewing → Application → Decision
→ Party → Lease → MoveInCase
```

---

# 251. Prospect

Prospect: contact data, desiredUnit, status, createdAt, retentionUntil?. Status: `NEW, CONTACTED, VIEWING, APPLIED, SHORTLIST, ACCEPTED, REJECTED, WITHDRAWN, ARCHIVED`. Bewerbungsdaten werden nicht dauerhaft in Party übernommen, solange kein Mietverhältnis entsteht.

---

# 252. Nicht Bestandteil des Neuvermietungs-Core

Kein Core-Zwang für: SCHUFA-Integration, Bonitätsanbieter, Identitätsprüfung, Zahlungsdienst, Immobilienportal-Scraping, vollautomatische Mieterauswahl. Spätere Adapter möglich. P2: OpenImmo-Export, Portaladapter, externe E-Signatur.

---

# 253. Elektronische Signaturen

Kein eigener qualifizierter Signaturdienst. Unterschieden werden: `SIGNATURE_CAPTURE, EXTERNAL_E_SIGNATURE, SIGNED_DOCUMENT_UPLOAD`. Eine auf einem Tablet gezeichnete Unterschrift im Übergabeprotokoll darf nicht als qualifizierte elektronische Signatur bezeichnet werden. Externe E-Signaturdienste später über Adapter.

---

# 254. Custom Fields und Tags

P2: Administratoren können Custom Fields definieren — zunächst für Property, Unit, Party, Lease, TechnicalAsset, ServiceContract. Custom Fields dürfen keine zentrale Fachlogik umgehen: „Haustürcode" ist vertretbar; „offene Miete", „Eigentumsanteil", „AfA-Satz" gehören ins Fachmodell.

---

# 255. Suchfunktion

Globale Suche mindestens über Property, Unit, Party, Lease, Invoice, Document, Ticket, TechnicalAsset, ServiceContract, Case. Dokumente — P1: Metadaten, Dateiname, Kategorien, verknüpfte Fachobjekte; P2: Volltextindex, OCR-Text. KI-Suche darf die normale Suche nicht ersetzen.

---

# 256. Marktvergleich: bewusst übernommene Muster

**Aus deutschen Vermieterprodukten:** Vorgangsmanagement mit Wiedervorlage, mobile Übergabe, Mieteingangskontrolle, Mahnworkflow, Mietvertrags-/Mieterwechsel-Assistenten, Dokumentvorlagen, Mieterportal, Cashflow-Dashboard, externer Heizkostenimport, UVI.

**Aus Open-Source-Systemen:** Tenant-/Landlord-Trennung, Outbox, SEPA-Mandate, Kalender, Audit Trail, ServiceContracts, Versicherungsakte, Key Tracking, Lease-Schedules, API-fähige Fachmodule.

**Aus größeren internationalen Property-Systemen:** Maintenance Request → Work Order, Angebot → Auftrag → Rechnung, wiederverwendbare Prozessvorlagen, mobile Inspections, Lease-expiry alerts, Resident Self Service, Portfolio-KPIs.

Diese Muster werden nicht 1:1 kopiert, sondern auf die Zielgruppe privater deutscher Vermieter reduziert.

---

# 257. Bewusst nicht übernommen

Mietfuchs soll kein ERP und keine professionelle Verwalterplattform für 20.000 Einheiten werden. Nicht Bestandteil von V1: HR, Payroll, Lagerverwaltung, Materiallager, Beschaffungssystem, Sales Orders, Security-Guard-Attendance, WEG-Versammlungsverwaltung, Verwalterhonorare, Eigentümerakquise, Makler-CRM, Payment Processing, eigener Mailserver, eigener OIDC Provider, eigener Signaturdienst, Callcenter, native Mobile Apps, Microservices. Ebenfalls kein Core-Ziel: vollständiger WEG-Verwalter — die WEG-Eigentümerabrechnung aus Vermietersicht (§82.9) bleibt dagegen Bestandteil des Tax-/Betriebskostenumfangs.

---

# 258. Neue Gesamtarchitektur

```text
                            MIETFUCHS NEXT
                                 UI
                                  │
           ┌──────────────────────┼─────────────────────┐
           │                      │                     │
           ↓                      ↓                     ↓
       Cockpit                 Fachmodule           Mieterportal
       Inbox                   Property             Dokumente
       Kalender                Lease                Nachrichten
       Vorgänge                Banking              Meldungen
                                Costs                Zähler
                                Technical
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ↓             ↓             ↓
                OPERATIONS    ACCOUNTING       TAX
                    │             │             │
          Case / Task /      AccountingEvent   TaxEvent
          Deadline /         JournalEntry      Determination
          Correspondence     JournalLine       Assessment
                    │             │             │
                    └─────────────┼─────────────┘
                                  │
                              PostgreSQL
                                  │
                         Document Storage
```

Operations beantwortet: Was muss getan werden? Accounting: Was ist wirtschaftlich passiert? Tax: Wie wird es steuerlich behandelt? **Keine der drei Schichten ersetzt eine andere.**

---

# 259. Automatische Domänenereignisse

Relevante Fachereignisse dürfen operative Vorgänge auslösen:

```text
Lease notice recorded                      → MoveOutCase
Lease begins in 14 days                    → MoveIn checklist
Charge overdue                             → Dunning suggestion
MaintenancePlan due                        → MaintenanceCase
ServiceContract termination window begins  → Deadline/Task
Settlement period ends                     → SettlementCase
CO2 claim submitted                        → CO2ReimbursementCase
```

Zur Vermeidung von Doppelanlagen werden `eventKey, workflowTemplateVersion, sourceEntity, sourceEntityId` idempotent verarbeitet.

---

# 260. Testfälle Operations

```text
T240 Lease-Ende:        Lease endet 31.05. → genau ein MoveOutCase;
                        erneuter Joblauf erzeugt keinen zweiten Case
T241 WorkflowTemplate:  laufender MoveOutCase aus Template v1; Template → v2
                        → bestehender Case bleibt unverändert
T242 Deadline:          Vertragsfrist automatisch berechnet
                        → baseDate, ruleVersion und dueDate gespeichert
T243 Deadline Override: Nutzer korrigiert dueDate
                        → ursprüngliche Berechnung bleibt auditierbar
```

---

# 261. Testfälle Übergabe

```text
T250 Move-in: Übergabe mit 3 Zählern und 5 Schlüsselarten → 3 reguläre MeterReadings,
              KeyHandovers vollständig, PDF-Snapshot
T251 Foto:    Foto zu Schaden → Document gespeichert, InspectionFinding-Link, SHA-256
T252 Schaden: Finding → DamageClaim → WorkOrder → Invoice; keine automatische
              Mieterforderung ohne bestätigte DamageClaim-Zuordnung
```

---

# 262. Testfälle Mahnwesen

```text
T260 Mietrückstand:            Charge 1.000, Payment 700 → outstanding 300, Mahnsnapshot 300
T261 Teilzahlung nach Mahnung: Mahnstand 300, danach Payment 100 → Charge outstanding 200,
                               historische Mahnung behält Snapshot 300
T262 Mahnkosten:               Mahnkosten 5 → neue Charge 5, Ursprungs-Charge unverändert
T263 Zahlung vollständig:      outstanding = 0 → offener DunningCase wird als resolved
                               vorgeschlagen/automatisch geschlossen
```

---

# 263. Testfälle Dokumente

```text
T270 Vorlage: Template v1 erzeugt Mahnung, danach Template v2
              → erzeugtes Dokument bleibt Byte-/Hash-identisch
T271 Bulk:    10 Empfänger beim Versand; später zieht ein Mieter aus
              → RecipientSnapshot des alten Versands bleibt 10
T272 Portal:  Document mit Unit verknüpft, aber kein DocumentPortalGrant
              → Tenant sieht Dokument nicht
```

---

# 264. Testfälle ServiceContracts

```text
T280 Vertrag:   Kündigungsfrist 3 Monate → berechnete Deadline enthält baseDate + ruleVersion
T281 Rechnung:  erwartete Jahreskosten 500, VendorInvoice 550
                → Vertrag unverändert, Actual = 550, Abweichung = 50
T282 WorkOrder: Quote 1.000, WorkOrder 1.000, Invoice 1.150
                → estimate/committed/actual getrennt auswertbar
```

---

# 265. Testfälle Portal

```text
T290 Meter submission: Mieter reicht 12345 ein → noch kein MeterReading;
                       Admin bestätigt → genau ein MeterReading
T291 Ticket:           Mieter meldet Schaden → Ticket; interne WorkOrder-Kosten
                       für Mieter nicht sichtbar
T292 Rechte:           Mieter A ruft Dokument von Mieter B über bekannte ID ab
                       → 404/403 ohne Datenleck
```

---

# 266. Testfälle Backup / Import

```text
T300 CSV Dry Run:       100 Zeilen, 3 fehlerhaft → Import schreibt 0 Datensätze,
                        Fehlerliste enthält exakt 3 Zeilen
T301 bestätigter Import: 97 gültige Zeilen → genau 97 Datensätze
T302 Restore:           Backup einer Fixture-Instanz → leere Instanz → Restore
                        → identische Domain-Summen + Dokument-Hashes
```

---

# 267. Neue Milestones

Die bestehende Planung M1–M10 wird ergänzt:

**M11 – Vorgänge, Aufgaben & Fristen** — Haupt-Issue „Operational Core": OperationalCase, Task, Deadline, Reminder, WorkflowTemplate, Inbox, Kalender. Subissues: OperationalCase + Task · Deadline + versionierte Regeln · WorkflowTemplate · Reminder-/Job-Engine · operative Inbox · Kalender + ICS Feed · Operations-Audit. DoD: T240–T243 grün, keine zweite fachliche Wahrheit, idempotente Workflow-Erzeugung, Fristgrundlage sichtbar, überfällige Vorgänge im Cockpit.

**M12 – Mietvertrags-Lifecycle & Dokumente** — Haupt-Issues: LeaseLifecycle, Inspection/Übergabe, KeySet/KeyHandover, DamageClaim, RentAdjustment-Workflow, DocumentTemplate/GeneratedDocument, Correspondence/Delivery/Outbox. Subissues: LeaseLifecycleEvent · MoveInCase/MoveOutCase · mobile Inspection · InspectionFinding + Fotos · Zählerintegration · Schlüsselverwaltung · DamageClaim · Wohnungsgeberbestätigung · Kündigungsworkflow · Mieterhöhungsworkflow · Template Engine · GeneratedDocument Snapshot · Correspondence · Delivery + Outbox · Bulk Communication. DoD: vollständiger Einzug ohne externe Excel-/Word-Liste, vollständiger Auszug dokumentierbar, Zählerstände in regulärer Historie, Schlüssel historisiert, Schäden bis Kaution/WorkOrder verfolgbar, versandte Dokumente unveränderlich.

**M13 – Forderungen & Mieterportal** — Haupt-Issues: Dunning, PaymentAgreement, SEPA, Tenant Portal, PortalSubmission. Subissues: DunningCase · DunningAction · Mahnvorlagen · Mahnkosten als eigene Charge · Ratenzahlungsvereinbarung · SEPA Mandate · pain.008 Export · Tenant Portal Resource Scope · DocumentPortalGrant · MaintenanceSubmission · MeterReadingSubmission · Portal Messaging · Portal Permission Tests. DoD: offene Miete → Zahlungserinnerung → Zahlung nachvollziehbar, Teilzahlungen funktionieren, historische Mahnsnapshots unverändert, Tenant sieht nur freigegebene eigene Ressourcen, Portal schreibt nie ungeprüft in gebuchte Fachobjekte.

**M14 – Objektbetrieb & Energie** — Haupt-Issues: ServiceContract, VendorQuote, Insurance, Warranty, CO2Allocation, HeatingCostStatementImport, UVI. Subissues: ServiceContract · Vertragsfristberechnung · Versicherungsdaten · Dienstleisterakte · VendorQuote · WorkOrder Estimate/Committed/Actual · Warranty-Warnung · CO2Allocation Core · CO2ReimbursementCase · zentraler CO2-Workflow · externer Heizkostenimport · UVI-Datenmodell · Verbrauchsimportadapter. DoD: laufende Objektverträge vollständig sichtbar, Kündigungs-/Wartungsfristen im Cockpit, Angebot → Auftrag → Rechnung nachvollziehbar, CO₂ zentral und dezentral abbildbar, externe Heizkostenwerte kontrolliert in SettlementInput übernehmbar.

**M15 – Portfolio & Planung** — Haupt-Issues: Portfolio Dashboard, Property Cockpit, Budget, Cashflow Forecast, CapitalProject. Subissues: KPI Definitions · Portfolio Dashboard · Property Cockpit · Budget/BudgetLine · 12–36-Monats-Cashflow · CapitalProject · Budget vs. Committed vs. Actual. DoD: Ein privater Vermieter kann je Objekt unmittelbar beantworten: Was kommt herein? Was geht heraus? Was ist offen? Was ist überfällig? Was kostet die Technik? Welche größeren Ausgaben kommen? Wie entwickelt sich der Cashflow?

**M16 – Datenmigration, Portabilität & Systembetrieb** — Haupt-Issues: Import Wizard, Opening Balances, Full Export, Backup/Restore, System Administration, Job Monitoring, Operational Audit. Subissues: CSV/XLSX Mapping Framework · Property/Unit/Party Import · Lease Import · Payment/Meter/Asset Import · Opening Balances · kompletter Domain Export · Dokumentexport · konsistentes Backup · Restore-Test · Admin Cockpit · Health Checks · Background Job Monitor · allgemeiner Audit Trail · Retention Review. DoD: Excel-Bestandsvermieter können migrieren, Daten vollständig wieder exportierbar, Backup/Restore nachgewiesen, Admin erkennt technische Fehler ohne Shell-Zugriff.

---

# 268. Priorisierung für Mietfuchs Next 1.0

**P0 — für eine überzeugende private Vermieterlösung:** OperationalCase/Task/Deadline · Inbox · MoveIn/MoveOut · Übergabeprotokoll · Zähler + Schlüssel · DocumentTemplate/GeneratedDocument · Correspondence/Outbox · Mahnworkflow · ServiceContract · CO2Allocation · Massenimport · Backup/Restore · Admin Cockpit

**P1 — unmittelbar danach:** Tenant Portal · PaymentAgreement · SEPA · VendorQuote · externer Heizkostenimport · UVI · Portfolio Dashboard · Cashflow Forecast · Budget/CapitalProject · PWA Offline Draft · ICS Kalender

**P2:** Prospect/Vacancy Management · OpenImmo · externe E-Signatur · Volltext/OCR-Suche · Custom Fields · Tenant Home Guide · CalDAV · herstellerspezifische Meteradapter · Owner Portal · Postal Delivery Adapter

---

# 269. Definition of Done – „Mietfuchs Next für private Vermieter"

Eine Version darf fachlich als vollständige Mietfuchs-Next-Version bezeichnet werden, wenn folgende End-to-End-Szenarien ohne externe Schattenlisten funktionieren:

```text
A – neuer Mieter:       Lease anlegen → Einzugsvorgang → Wohnungsgeberbestätigung
                        → Übergabe → Fotos → Schlüssel → Zähler → Miet-Soll → Kaution
                        → Dokumentakte
B – Miete fehlt:        Charge → CAMT → kein Matching → offener Posten → Inbox
                        → Zahlungserinnerung → Dokument/Versand → Teilzahlung
                        → Restforderung → vollständige Zahlung → Abschluss
C – Heizung defekt:     Meldung → Ticket → TechnicalAsset → Dienstleister → Angebot
                        → WorkOrder → Termin → Rechnung → ExpenseAllocation
                        → MaintenanceEvent → Lifetime Cost
D – Mieter zieht aus:   Kündigung → Fristprüfung → MoveOutCase → Übergabe → Zähler
                        → Schlüssel → Schäden → offene Mieten → DamageClaim
                        → Kautionsverwendung → Rückzahlung → Lease Archive
E – Jahresabrechnung:   Bank/Rechnungen → Kosten → externe Heizkosten optional → CO₂
                        → Zähler → Settlement → Prüfung → Snapshot → Anschreiben
                        → Portal/PDF → Settlement Charge
F – Steuerjahr:         Payments, Invoices, Loans, AfA, WEG, TaxEvents
                        → TaxDetermination → Steuerpaket → Eigentümeraufteilung
                        → Anlage-V-Vorschau
G – Vertragsmanagement: ServiceContract → Kündigungsfrist → Reminder
                        → Angebot/Vertragsprüfung → neue Periode oder Kündigung
                        → Rechnungen bleiben historisch verknüpft
H – Serverausfall:      neue Instanz → Restore → Datenbank → Dokumente
                        → Benutzer-/Workspace-Daten → identische fachliche Bestände
```

---

# 270. Schlussfolgerung

Mit den §§188–269 wird Mietfuchs nicht zu einem ERP. Die Architektur bleibt bewusst klein, modular, self-hosted, deutsch, privater Vermieter zuerst.

Der Unterschied:

> Mietfuchs bisher / bisherige Next-Spec: „Ich kann meine Vermietung korrekt dokumentieren, abrechnen, finanziell auswerten und steuerlich vorbereiten."
> Mietfuchs mit diesem Addendum: „Mietfuchs sagt mir zusätzlich, was ich als Vermieter als Nächstes tun muss, führt mich durch den Vorgang und hält das Ergebnis nachvollziehbar fest."

Die zentrale Produktvision:

> **Mietfuchs ist der digitale Arbeitsplatz für private Vermieter: Mietvertrag, Geld, Betriebskosten, Technik, Steuer, Dokumente und tägliche Verwaltungsarbeit in einem fachlich sauberen, lokalen bzw. self-hosted System — ohne ERP-Ballast und ohne Cloudzwang.**


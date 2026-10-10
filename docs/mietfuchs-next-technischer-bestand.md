# Mietfuchs Next – Spezifikation Technischer Bestand, Gebäudezustand und Lebenszyklus

**Stand:** 30.08.2026  
**Status:** Architektur- und Produktspezifikation  
**Geltungsbereich:** Mietfuchs Next  
**Zielgruppe:** Private Vermieter in Deutschland mit typischerweise 1–12 Einheiten und einem oder wenigen Objekten  
**Einordnung:** Erweiterung von M7 „Technische Administration“, M11 „Operational Core“, M14 „Objektbetrieb“ und M15 „Portfolio & Planung“

---

# 0. Leitentscheidung

Mietfuchs soll nicht nur abbilden, **was an einem Gebäude vorhanden ist und was aktuell repariert werden muss**, sondern auch:

- welchen Zustand wesentliche Bauteile und Anlagen haben,
- welche bekannten Mängel bestehen,
- welche Wartungen und Prüfungen fällig sind,
- welcher mittel- und langfristige Erneuerungsbedarf absehbar ist,
- welche Maßnahmen bereits konkret geplant sind,
- was tatsächlich beauftragt und ausgeführt wurde,
- welche Kosten dadurch entstanden sind.

Die technische Domäne folgt deshalb der Kette:

```text
Bestand
→ Zustand
→ Feststellung / Mangel
→ Wartungs- oder Erneuerungsbedarf
→ Planung
→ Auftrag
→ Durchführung
→ Kosten
→ aktualisierte technische Historie
```

Mietfuchs wird damit **kein Facility-Management-System und kein CMMS**.

Insbesondere werden nicht nachgebaut:

- Lagerverwaltung,
- Ersatzteilwirtschaft,
- Personal-/Technikerdisposition,
- Arbeitszeiterfassung,
- SLA-Management,
- komplexe Beschaffung,
- BIM,
- GIS,
- CAD,
- Flächenmanagement professioneller Betreiber,
- IoT-Plattform,
- Enterprise-Workflow-Designer.

Die zugrunde liegende Domäne darf fachlich belastbar sein. Die Benutzeroberfläche bleibt auf typische Entscheidungen eines privaten Eigentümers reduziert.

---

# 1. Produktziel

Die technische Schicht muss einem Eigentümer jederzeit mindestens folgende Fragen beantworten können:

1. Was gehört zu meinem Gebäude?
2. Was ist aktuell kaputt?
3. Welche bekannten Mängel sind noch offen?
4. Welche Wartungen oder Prüfungen stehen an?
5. Welche Anlagen oder Bauteile muss ich beobachten?
6. Was wird voraussichtlich in den kommenden Jahren erneuert werden müssen?
7. Welche größeren Ausgaben zeichnen sich ab?
8. Welche Maßnahmen habe ich bereits geplant?
9. Was wurde wann repariert oder erneuert?
10. Was hat ein bestimmtes Bauteil bzw. eine Anlage über die Jahre gekostet?
11. Welche Rechnungen, Angebote, Fotos und Dokumente gehören dazu?
12. Gibt es technischen Instandhaltungsrückstau?
13. Welche technischen Risiken können mir später finanziell auf die Füße fallen?

Die Oberfläche soll daraus nicht ein technisches Anlagenbuch machen, sondern z. B.:

```text
Musterstraße 12

Technik
✓ Keine kritischen Störungen

1 Wartung fällig
Heizung · 18.10.2026

2 Punkte beobachten
Dach · Zustand mittel
Kellerabdichtung · Feuchtigkeit beobachtet

Größere Maßnahmen absehbar
Heizung: ca. 2028–2032
Dach: ca. 2031–2035

Erwarteter technischer Kapitalbedarf
5 Jahre: 25–45 T€
10 Jahre: 70–110 T€
```

---

# 2. Architekturprinzipien

## 2.1 Komplexität innen, Einfachheit außen

Intern darf ein Vorgang erzeugen oder verändern:

```text
Ticket
Defect
OperationalCase
Task
Deadline
VendorQuote
WorkOrder
VendorInvoice
ExpenseAllocation
MaintenanceEvent
ConditionAssessment
LifecyclePlanItem
CapitalProject
AccountingEvent
TaxEvent
```

Der normale Nutzer sieht dagegen beispielsweise nur:

```text
Heizung defekt
→ Angebot erhalten
→ Reparatur beauftragt
→ erledigt
→ Rechnung 1.280 €
```

---

## 2.2 Fachobjekte bleiben getrennt

Folgende Sachverhalte dürfen nicht miteinander gleichgesetzt werden:

```text
Meldung ≠ technischer Mangel
Mangel ≠ Arbeitsauftrag
Arbeitsauftrag ≠ Rechnung
Wartung ≠ Reparatur
Wartung ≠ Erneuerung
Erneuerungsbedarf ≠ beschlossenes Projekt
technisches Bauteil ≠ steuerliches Wirtschaftsgut
technischer Kapitalbedarf ≠ buchhalterische Rückstellung
technischer Kapitalbedarf ≠ WEG-Erhaltungsrücklage
Zustand ≠ Alter
geschätzte Lebensdauer ≠ bekannte Tatsache
```

---

# 3. Neue verbindliche Invarianten

Die bestehenden Mietfuchs-Invarianten bleiben erhalten.

Zusätzlich gelten für die technische Domäne:

```text
111. Ein TechnicalAsset kann ein Bauteil, technisches System, Gerät oder
     Element der Außenanlage repräsentieren.

112. TechnicalAsset ≠ DepreciableAsset.

113. Alter eines TechnicalAsset bestimmt niemals automatisch dessen Zustand.

114. Systemseitige Lebensdauerannahmen sind Schätzwerte und niemals als
     bekannte Tatsachen darzustellen.

115. UNKNOWN ist für technische Daten ein zulässiger und vollwertiger Zustand.

116. Eine Meldung oder ein Ticket ist nicht automatisch ein bestätigter Defect.

117. Ein Defect bleibt historisch erhalten und wird nicht durch einen WorkOrder
     ersetzt.

118. Ein WorkOrder beschreibt eine Beauftragung; die technische Erledigung
     muss separat bestätigt werden.

119. Ein geschlossener WorkOrder schließt einen Defect nicht automatisch,
     wenn dessen technische Beseitigung nicht bestätigt ist.

120. Wartung, Inspektion, gesetzliche Prüfung, Reparatur und Erneuerung sind
     getrennte Sachverhalte.

121. Wiederkehrende Wartungs- oder Prüfpflichten erzeugen einzelne,
     historisch nachvollziehbare Fälligkeiten.

122. Eine erledigte Fälligkeit wird niemals auf den nächsten Termin
     überschrieben.

123. LifecyclePlanItem ≠ CapitalProject.

124. Ein LifecyclePlanItem kann zu einem CapitalProject führen, bleibt aber als
     Ursprung und Planungshistorie erhalten.

125. Ein CapitalProject erzeugt niemals allein Accounting- oder TaxEvents.

126. Technischer Erhaltungsbedarf ist eine Planungsaussage und keine
     buchhalterische Rückstellung.

127. Technischer Erhaltungsbedarf ist keine WEG-Erhaltungsrücklage.

128. Instandhaltungsrückstau wird aus vorhandenen Fachobjekten abgeleitet und
     nicht als zweite fachliche Wahrheit separat gepflegt.

129. Jede technische Zustandsbewertung ist zeitbezogen und historisiert.

130. Eine neue Zustandsbewertung überschreibt frühere Bewertungen niemals.

131. Fotos und Dokumente werden über das zentrale Document-Modell referenziert;
     es entsteht keine zweite Dokumentenablage.

132. Ein Dokumenteingang erzeugt niemals ungeprüft einen technischen
     Fachvorgang.

133. Reparaturkosten, Wartungskosten und Erneuerungskosten müssen getrennt
     auswertbar sein.

134. Schätzwerte, beauftragte Kosten und tatsächliche Kosten bleiben getrennt.

135. Technische Prognosen müssen ihre Datengrundlage und Unsicherheit
     transparent machen.

136. Die fachliche Berechnung darf nicht vom verwendeten Datenbank-Backend
     abhängen.

137. Ein TechnicalAsset muss nicht bis auf Geräte- oder Einzelteilniveau
     detailliert werden.

138. Fehlende Detailtiefe darf einen normalen Vermietungsprozess niemals
     blockieren.

139. Der Standardnutzer arbeitet mit „Bauteil“, „Anlage“, „Schaden“,
     „Wartung“ und „Maßnahme“, nicht mit internen Entity-Namen.

140. Die technische Domäne darf Mietfuchs nicht zu einem CMMS oder
     Facility-Management-System erweitern.
```

---

# 4. Objekt- und Standortmodell

Das bestehende Grundmodell bleibt:

```text
Property
  └── Building
        └── Unit
```

Ein `Property` ist das wirtschaftlich zusammen verwaltete Immobilienobjekt.

Ein `Building` ist ein physisches Gebäude.

Eine `Unit` ist eine vermietbare oder anderweitig nutzbare Einheit.

## 4.1 Grundstücke / Flurstücke

Ein separates katastermäßiges Modell ist für V1 nicht zwingend.

Optional vorbereitet wird:

```text
LandParcel
  id
  propertyId
  cadastralDistrict?
  parcelNumber?
  areaM2?
  note?
```

Ein Property kann mehrere LandParcels besitzen.

Diese Ebene wird nur angezeigt, wenn der Nutzer sie benötigt.

Kein GIS wird daraus abgeleitet.

---

# 5. TechnicalAsset als allgemeines technisches Bestandselement

Der bestehende Begriff `TechnicalAsset` bleibt aus Gründen der Architektur- und Migrationsstabilität erhalten.

Er wird fachlich erweitert.

In der Benutzeroberfläche lautet die Bezeichnung:

> **Bauteile & Anlagen**

Ein `TechnicalAsset` kann sein:

```text
BUILDING_COMPONENT
TECHNICAL_SYSTEM
EQUIPMENT
EXTERNAL_ASSET
OTHER
```

## 5.1 Beispiele

### BUILDING_COMPONENT

```text
Dach
Fassade
Fenster
Außentüren
Balkone
Kellerabdichtung
Geschossdecken
Treppen
Bodenbeläge
Innenausbau
```

### TECHNICAL_SYSTEM

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

### EQUIPMENT

```text
Heizkessel
Wärmepumpe
Umwälzpumpe
Wechselrichter
Batteriespeicher
Hebeanlage
Aufzug
Enthärtungsanlage
```

### EXTERNAL_ASSET

```text
Garage
Carport
Hof
Wege
Stützmauer
Zaun
Tor
Außenbeleuchtung
Entwässerungsanlage
```

---

# 6. TechnicalAsset-Datenmodell

```text
TechnicalAsset
  id
  workspaceId

  propertyId
  buildingId?
  unitId?

  parentAssetId?

  assetKind
  category
  name
  description?

  locationLabel?

  manufacturer?
  model?
  serialNumber?

  installedAt?
  installationYear?
  approximateInstallationYear?

  acquiredAt?
  decommissionedAt?

  quantity?
  unitOfMeasure?

  status
  criticality?

  warrantyUntil?
  warrantyType?

  successorAssetId?
  predecessorAssetId?

  createdAt
  updatedAt
  archivedAt?
```

## 6.1 Status

```text
ACTIVE
INACTIVE
REPLACED
DECOMMISSIONED
UNKNOWN
```

---

# 7. Hierarchie

TechnicalAssets dürfen hierarchisch aufgebaut werden.

Beispiel:

```text
PV-Anlage
├── Module
├── Wechselrichter
└── Batteriespeicher
```

oder:

```text
Heizungsanlage
├── Wärmeerzeuger
├── Warmwasserspeicher
└── Umwälzpumpe
```

Die Hierarchie ist optional.

Für einen privaten Vermieter muss zulässig sein:

```text
Fenster
24 Stück
Baujahr ungefähr 1998
```

statt:

```text
Fenster Wohnung 1 Schlafzimmer links
Fenster Wohnung 1 Schlafzimmer rechts
...
```

**Grundsatz: Nur so tief modellieren wie für Entscheidungen erforderlich.**

---

# 8. Unbekannte Daten

Mietfuchs darf niemals dazu zwingen, Wissen vorzutäuschen.

Folgende Eingaben sind explizit zulässig:

```text
Baujahr: unbekannt
Hersteller: unbekannt
letzte Erneuerung: unbekannt
Zustand: noch nicht bewertet
erwartete Restlebensdauer: unbekannt
```

Die Vollständigkeitsprüfung darf daraus Hinweise erzeugen, aber einen normalen Bestand nicht blockieren.

---

# 9. ConditionAssessment

Der technische Zustand wird als eigenständige Historie geführt.

```text
ConditionAssessment
  id
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

  relatedInspectionId?
  relatedWorkOrderId?
  relatedDocumentIds[]

  createdAt
```

## 9.1 Zustandsstufen

Mietfuchs verwendet eine eigene verständliche Skala.

Sie darf nicht als DIN-zertifiziert bezeichnet werden.

```text
1 = sehr gut / neu bzw. neuwertig
2 = gut / normale Gebrauchsspuren
3 = ausreichend / beobachten
4 = schlecht / Maßnahme absehbar
5 = kritisch / zeitnaher Handlungsbedarf
UNKNOWN = nicht beurteilt
```

UI:

```text
Sehr gut
Gut
Beobachten
Handlungsbedarf
Kritisch
Unbekannt
```

---

# 10. Dringlichkeit

Zustand und Dringlichkeit werden getrennt.

Ein altes Bauteil kann noch gut funktionieren.

Ein kleines neues Bauteil kann trotzdem einen akuten Defekt haben.

```text
urgency:

NONE
OBSERVE
PLAN
SOON
IMMEDIATE
```

---

# 11. TechnicalInspection

Technische Gebäudeinspektionen werden nicht mit Mietübergaben gleichgesetzt.

```text
TechnicalInspection
  id
  propertyId
  buildingId?

  inspectionType
  performedAt
  performedByPartyId?

  status

  summary?
  nextRecommendedAt?

  createdAt
  completedAt?
```

Typen:

```text
ROUTINE
CONDITION_SURVEY
DAMAGE_INSPECTION
PURCHASE_INSPECTION
POST_WORK_INSPECTION
OTHER
```

Eine TechnicalInspection kann mehrere ConditionAssessments und Defects erzeugen.

Gemeinsame technische Komponenten mit dem bestehenden Inspection-Modell dürfen wiederverwendet werden:

- Fotos,
- Teilnehmer,
- Signatur-Capture,
- Dokumenterzeugung,
- mobile PWA-Komponenten.

Die Fachobjekte bleiben getrennt.

---

# 12. Ticket und Defect

## 12.1 Ticket

Ein Ticket beschreibt eine Meldung oder einen beobachteten Sachverhalt.

Beispiel:

> „An der Schlafzimmerwand ist Feuchtigkeit.“

Das ist noch keine technische Diagnose.

## 12.2 Defect

Ein `Defect` beschreibt einen bestätigten technischen Mangel.

Beispiel:

> „Undichtigkeit Balkonanschluss oberhalb der Wohnung.“

Datenmodell:

```text
Defect
  id

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

  createdAt
  updatedAt
```

---

# 13. Defect-Statusmodell

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

Der Mangel besteht fort, wurde aber bewusst akzeptiert.

Eine Begründung ist Pflicht.

---

# 14. Defect-Beispiel

```text
Mieter meldet Feuchtigkeit
        ↓
Ticket
        ↓
Besichtigung
        ↓
Defect:
„Balkonabdichtung undicht“
        ↓
VendorQuote
        ↓
WorkOrder Abdichtung
        ↓
WorkOrder Maler
        ↓
Defect RESOLVED
        ↓
Kontrolle
        ↓
Defect VERIFIED / CLOSED
```

Damit bleibt die technische Ursache nachvollziehbar, obwohl mehrere Aufträge erforderlich waren.

---

# 15. WorkOrder

Ein WorkOrder beschreibt die tatsächliche Beauftragung.

```text
WorkOrder
  id

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

  completionNote?

  createdAt
```

Status:

```text
DRAFT
REQUESTED
ORDERED
SCHEDULED
IN_PROGRESS
COMPLETED
CANCELLED
```

`COMPLETED` bedeutet:

> Auftrag nach eigener Dokumentation beendet.

Es bedeutet nicht automatisch:

> technischer Mangel sicher beseitigt.

---

# 16. Wartung und Prüfungen

Die technische Domäne unterscheidet:

```text
MAINTENANCE
INSPECTION
LEGAL_CHECK
FUNCTION_TEST
SERVICE
```

Beispiele:

- Heizungswartung,
- Rauchwarnmelderprüfung,
- Aufzugprüfung,
- Rückstausicherung,
- Trinkwasserprüfung,
- Feuerlöscherprüfung,
- Dachkontrolle.

Nicht jede mögliche Prüfung ist für jedes Gebäude erforderlich.

Mietfuchs trifft keine automatische Rechtsentscheidung darüber, ob eine gesetzliche Pflicht besteht.

---

# 17. MaintenancePlan

```text
MaintenancePlan
  id

  technicalAssetId

  requirementType

  title
  description?

  recurrenceType
  intervalMonths?
  intervalYears?

  anchorDate?
  nextDueDate?

  ruleSource?
  legalBasisNote?

  serviceContractId?

  proofRequired
  active

  createdAt
  updatedAt
```

---

# 18. MaintenanceDue

Aus wiederkehrenden Plänen entstehen konkrete Fälligkeiten.

```text
MaintenanceDue
  id

  maintenancePlanId
  technicalAssetId

  dueDate
  warningDate?

  status

  taskId?
  deadlineId?
  workOrderId?
  maintenanceEventId?

  waiverReason?

  createdAt
  completedAt?
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

Eine abgeschlossene MaintenanceDue bleibt historisch erhalten.

Die nächste Fälligkeit wird als neue Instanz erzeugt.

---

# 19. MaintenanceEvent

Die tatsächliche Durchführung wird als Event dokumentiert.

```text
MaintenanceEvent
  id

  technicalAssetId
  maintenancePlanId?
  maintenanceDueId?

  eventType

  performedAt
  performedByPartyId?

  workOrderId?
  vendorInvoiceId?

  result

  notes?

  documentIds[]

  nextRecommendedAt?

  createdAt
```

Resultat:

```text
OK
OBSERVE
DEFECT_FOUND
FOLLOW_UP_REQUIRED
UNKNOWN
```

Bei `DEFECT_FOUND` kann ein Defect vorgeschlagen werden.

Keine automatische Anlage ohne Bestätigung.

---

# 20. Lebensdauerannahmen

Mietfuchs darf technische Lebensdauern unterstützen, aber niemals als Tatsachen darstellen.

Dafür gibt es:

```text
LifecycleAssumption
  id

  category
  constructionVariant?

  minYears?
  likelyYears?
  maxYears?

  sourceType
  sourceReference?
  validFrom?

  note?
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

Systemwerte sind lediglich Startwerte für die Planung.

UI:

> Typischer Erfahrungsbereich: 25–35 Jahre  
> Tatsächlicher Zustand kann erheblich abweichen.

---

# 21. LifecyclePlanItem

Der zentrale neue Baustein für langfristige Planung ist `LifecyclePlanItem`.

Er beschreibt einen absehbaren technischen Handlungsbedarf, ohne bereits ein konkretes Projekt zu sein.

```text
LifecyclePlanItem
  id

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

  createdAt
  updatedAt
  completedAt?
```

---

# 22. LifecyclePlanItem-Typen

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

# 23. Planungsgrundlage

```text
basis:

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

# 24. Planungssicherheit

```text
confidence:

LOW
MEDIUM
HIGH
```

Beispiel:

```text
Dach
Erneuerung: 2031–2035
Kosten: 50–70 T€
Sicherheit: mittel
Basis: Zustandsbewertung 2026
```

Dadurch darf Mietfuchs niemals aus einer groben Annahme eine scheinpräzise Prognose erzeugen.

---

# 25. LifecyclePlanItem-Status

```text
OBSERVED
PLANNED
PROJECT_CREATED
DEFERRED
COMPLETED
CANCELLED
```

Ein PlanItem wird nicht gelöscht, nur weil daraus ein CapitalProject entstanden ist.

---

# 26. Übergang zum CapitalProject

Ein Lebenszykluspunkt wird erst dann zum `CapitalProject`, wenn eine Maßnahme tatsächlich konkret geplant wird.

Beispiel:

```text
2026
LifecyclePlanItem:
Dach voraussichtlich 2031–2035

2030
Eigentümer entscheidet:
Dachsanierung vorbereiten

        ↓

CapitalProject:
Dachsanierung Musterstraße 7
```

Das LifecyclePlanItem erhält:

```text
status = PROJECT_CREATED
capitalProjectId = ...
```

---

# 27. CapitalProject

Das bestehende CapitalProject-Modell bleibt bestehen.

Es wird mit der technischen Planung verknüpft.

Ein Projekt kann enthalten:

```text
LifecyclePlanItems
Defects
VendorQuotes
WorkOrders
VendorInvoices
Documents
TechnicalAssets
```

Beispiele:

- Dachsanierung,
- Heizungstausch,
- Fenstererneuerung,
- PV-Anlage,
- Balkonsanierung,
- Kellerabdichtung.

---

# 28. Estimate / Committed / Actual

Die drei Kostenebenen bleiben strikt getrennt.

```text
Estimate
= erwartete / angebotene Kosten

Committed
= tatsächlich beauftragte Kosten

Actual
= tatsächlich abgerechnete Kosten
```

Beispiel:

```text
Lebenszyklusplanung:
50–70 T€

Angebot:
63.000 €

Auftrag:
61.500 €

Rechnungen:
64.280 €
```

Mietfuchs darf diese Werte niemals vermischen.

---

# 29. Preisbasis langfristiger Schätzungen

Lebenszykluskosten werden grundsätzlich mit Preisbasis gespeichert.

Beispiel:

```text
estimatedCostLikely = 60.000 €
priceBaseYear = 2026
```

Der Forecast kann daraus wahlweise darstellen:

```text
60.000 € in heutigen Preisen
```

oder bei aktivierter Kostensteigerungsannahme:

```text
ca. 68.000 € erwarteter Nominalbetrag 2032
```

Annahmen zur Preissteigerung werden zentral konfiguriert und sichtbar ausgewiesen.

---

# 30. Technischer Erhaltungsbedarf

Mietfuchs berechnet aus LifecyclePlanItems einen langfristigen Erhaltungsbedarf.

Der Standardhorizont:

```text
5 Jahre
10 Jahre
20 Jahre
```

Die UI soll standardmäßig 10 Jahre anzeigen.

20 Jahre liegen unter „Mehr“.

---

# 31. Technischer Forecast

Der technische Forecast ist vom finanziellen Cashflow-Forecast zu unterscheiden.

## Finanzforecast

```text
Horizont:
12–36 Monate

hohe zeitliche Genauigkeit
```

## Technischer Forecast

```text
Horizont:
5–20 Jahre

Bandbreiten und Zeitfenster
```

Beide werden erst verbunden, wenn technische Maßnahmen ausreichend konkret werden.

---

# 32. Berechnung des Erhaltungsbedarfs

Für jedes LifecyclePlanItem wird eine erwartete Zeitverteilung abgeleitet.

Keine einzelne Jahreszahl darf vorgetäuscht werden, wenn lediglich ein Zeitraum bekannt ist.

Beispiel:

```text
Dach
2031–2035
50–70 T€
```

UI:

```text
Nächste 5 Jahre:
wahrscheinlich noch keine größere Maßnahme

6–10 Jahre:
ca. 50–70 T€
```

Später kann eine probabilistische oder gewichtete Forecast-Logik ergänzt werden.

V1 benötigt keine Monte-Carlo-Simulation.

---

# 33. Instandhaltungsrückstau

Es wird **keine eigenständige manuell gepflegte Entität** `MaintenanceBacklog` eingeführt.

Rückstau ist eine abgeleitete Sicht.

Er umfasst z. B.:

### offene bestätigte Defects

```text
Defect.status ∈
CONFIRMED
PLANNED
IN_PROGRESS
```

### überfällige Wartungen

```text
MaintenanceDue.status = OVERDUE
```

### überfällige Lebenszyklusmaßnahmen

```text
LifecyclePlanItem.expectedToYear < currentYear
AND status not COMPLETED/CANCELLED
```

### bewusst verschobene Maßnahmen

```text
LifecyclePlanItem.status = DEFERRED
```

---

# 34. Rückstau-Kennzahlen

Objektbezogen können abgeleitet werden:

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

# 35. Keine „Instandhaltungsrücklage“ für Mietobjekte

Mietfuchs bezeichnet den technischen Forecast nicht als:

```text
Instandhaltungsrücklage
```

sondern als:

```text
Technischer Erhaltungsbedarf
Erwarteter Kapitalbedarf
Geplante Erhaltungsmaßnahmen
```

Bei einer WEG bleibt die echte Erhaltungsrücklage der WEG ein anderer fachlicher Sachverhalt.

---

# 36. Erneuerung und Ersatz

Bei Austausch eines Geräts wird im Regelfall ein neues TechnicalAsset erzeugt.

Beispiel:

```text
Heizkessel alt
status = REPLACED
successorAssetId = neuer Heizkessel
```

Der neue Heizkessel verweist zurück:

```text
predecessorAssetId = alter Heizkessel
```

Dadurch bleibt die Historie vollständig.

---

# 37. Bauteilsanierung ohne Identitätswechsel

Bei Bauteilen wie:

- Dach,
- Fassade,
- Balkonen,
- Kellerabdichtung

muss eine Erneuerung nicht zwingend ein neues TechnicalAsset erzeugen.

Es darf dieselbe fachliche Komponente weitergeführt werden.

Die Maßnahme erscheint über:

```text
WorkOrder
CapitalProject
MaintenanceEvent
ConditionAssessment
```

in ihrer Historie.

Beispiel:

```text
Dach
1984 erstellt
2002 Teilsanierung
2032 komplett erneuert
```

---

# 38. Technische Historie

Die Benutzeroberfläche zeigt eine gemeinsame Timeline.

Diese wird als Projection aus bestehenden Fachobjekten erzeugt.

Keine zweite Timeline-Datenbank wird gepflegt.

Beispiel:

```text
1984  Dach erstellt
2002  Teilsanierung
2026  Zustand: beobachten
2029  erneute Prüfung
2031  Angebot Dachdecker
2032  Sanierung
2032  Zustand: sehr gut
```

---

# 39. Lifetime Cost

Für jedes TechnicalAsset werden Kosten aus den verknüpften tatsächlichen Fachvorgängen aggregiert.

Beispiel:

```text
Heizung

Wartungen       3.420 €
Reparaturen     4.860 €
Erneuerungen   12.500 €
Gesamt          20.780 €
```

Geschätzte Kosten werden nicht mit tatsächlichen Kosten vermischt.

---

# 40. Dokumente

Jedes technische Objekt kann Dokumente referenzieren.

Beispiele:

```text
Rechnung
Angebot
Bedienungsanleitung
Garantienachweis
Prüfprotokoll
Wartungsbericht
Foto
Gutachten
Plan
Herstellerunterlagen
```

Die Datei selbst liegt ausschließlich im zentralen Document-System.

---

# 41. Universal Document Inbox

Technische Dokumente laufen über die bestehende Universal Document Inbox.

Beispiel:

```text
Upload:
„wartung_heizung_2026.pdf“

Systemvorschlag:
Dokumenttyp: Wartungsbericht
Objekt: Musterstraße 7
Anlage: Gastherme Keller
Datum: 18.10.2026
Ergebnis: Wartung durchgeführt

[Übernehmen]
```

Erst die Bestätigung erzeugt den Fachvorgang.

---

# 42. Technische Inbox / Operational Core

Technische Fachereignisse speisen den bestehenden Operational Core.

Beispiele:

```text
Heizungswartung in 14 Tagen
Prüfung Rauchwarnmelder überfällig
Angebot Kellerabdichtung läuft morgen ab
Mangel Kellerfeuchtigkeit seit 60 Tagen offen
Dachzustand sollte 2028 erneut geprüft werden
```

Es entsteht kein zweites technisches Aufgabensystem.

---

# 43. ServiceContract

Bestehende ServiceContracts werden mit TechnicalAssets und MaintenancePlans verknüpft.

Beispiel:

```text
Wartungsvertrag Viessmann
        ↓
Heizungsanlage
        ↓
jährliche Wartung
```

Eine Vertragskündigungsfrist und eine technische Wartungsfälligkeit bleiben trotzdem getrennte Deadlines.

---

# 44. VendorQuote

Mehrere Angebote können zu einem:

```text
Defect
LifecyclePlanItem
CapitalProject
```

gehören.

Mietfuchs zeigt:

```text
Dachsanierung

Dachbau Müller     64.000 €
Meier Bedachung    71.500 €
Schmidt GmbH       68.800 €
```

Es wird kein vollständiger Einkaufsworkflow aufgebaut.

---

# 45. Technisches Onboarding

Der Nutzer wird niemals aufgefordert:

> „Bitte legen Sie jetzt Ihre TechnicalAssets an.“

Stattdessen führt Mietfuchs durch typische Gebäudebereiche.

Beispiel:

```text
Was weißt Du über das Gebäude?

Dach
Fassade
Fenster
Balkone
Keller / Abdichtung
Heizung / Warmwasser
Trinkwasser
Abwasser
Elektro
Außenanlagen
```

Pro Bereich maximal zunächst:

```text
Wann ungefähr gebaut / erneuert?
Wie würdest Du den Zustand einschätzen?
Gibt es bekannte Probleme?
```

Antwortmöglichkeiten:

```text
gut
beobachten
Handlungsbedarf
unbekannt
```

---

# 46. Automatische Grundstruktur

Aus Gebäudetyp und Ausstattung kann Mietfuchs eine einfache technische Grundstruktur vorschlagen.

Beispiel Mehrfamilienhaus:

```text
Gebäudehülle
├── Dach
├── Fassade
├── Fenster
├── Außentüren
└── Balkone

Haustechnik
├── Heizung
├── Trinkwasser
├── Abwasser
└── Elektro

Außen
└── Außenanlagen
```

Es werden keine fiktiven Geräteinformationen erzeugt.

---

# 47. Feature Detection

Nur relevante Bereiche werden angezeigt.

Beispiele:

```text
keine PV
→ kein PV-Bereich

keine Zentralheizung
→ keine zentrale Wärmeerzeugerstruktur

kein Aufzug
→ kein Aufzugsmodul

keine bekannten technischen Details
→ einfache Gebäudeübersicht
```

---

# 48. Objekt-Cockpit

Die Objektseite erhält einen Abschnitt „Technik“.

Standarddarstellung:

```text
Technik

Akut
1 offener Mangel

Wartung & Prüfung
1 in den nächsten 30 Tagen
0 überfällig

Beobachten
Dach
Kellerabdichtung

Größere Maßnahmen
Heizung 2028–2032
Dach 2031–2035

Technischer Kapitalbedarf
5 Jahre: 20–35 T€
10 Jahre: 70–110 T€
```

---

# 49. Technik-Hauptansicht

Die normale Ansicht besteht aus vier Bereichen:

```text
Jetzt erledigen
Wartung & Prüfungen
Zustand
Planung
```

Nicht aus Entity-Tabellen.

---

# 50. Primäre Benutzeraktionen

Der Standardnutzer sieht:

```text
[Schaden erfassen]

[Zustand dokumentieren]

[Wartung / Prüfung eintragen]

[Maßnahme vormerken]
```

Zusätzlich kontextbezogen:

```text
[Angebot hinzufügen]
[Auftrag erfassen]
[Rechnung zuordnen]
[als erledigt markieren]
```

---

# 51. TechnicalAsset-Detailansicht

Beispiel:

```text
Heizung

Status
Aktiv

Baujahr
2002

Zustand
Beobachten

Nächste Wartung
18.10.2026

Bekannte Mängel
keine

Erneuerung
voraussichtlich 2028–2032

Kosten bisher
8.320 €

Dokumente
12

Verlauf
2026 Wartung
2025 Reparatur Pumpe
2024 Wartung
...
```

Erweiterte technische Attribute liegen unter „Details“.

---

# 52. Mobile Nutzung

Technische Begehungen sollen als PWA mobil funktionieren.

Kernfunktionen:

- Objekt auswählen,
- Bauteil auswählen,
- Zustand erfassen,
- Foto aufnehmen,
- Mangel erfassen,
- Notiz,
- Folgemaßnahme vormerken.

Offline-Entwürfe dürfen P1 sein.

Ein Vorgang gilt erst nach Synchronisation als abgeschlossen.

---

# 53. Zustandsprüfung nach Reparatur

Bei Abschluss eines größeren WorkOrders bietet Mietfuchs an:

```text
Technischen Zustand aktualisieren?

Vorher:
Zustand 4 – Handlungsbedarf

Jetzt:
[Sehr gut]
[Gut]
[Beobachten]
[unverändert]
```

Keine automatische Verbesserung des Zustands.

---

# 54. Prognosen nach Reparatur oder Erneuerung

Bei Erneuerung kann das System vorschlagen:

```text
Baujahr / Erneuerungsjahr:
2032

neue Lebensdauerannahme übernehmen?
30–40 Jahre
```

Der Nutzer bestätigt oder korrigiert.

---

# 55. Warnlogik

Warnungen müssen nachvollziehbar sein.

Beispiele:

```text
Dach ist 42 Jahre alt.
Keine Zustandsbewertung hinterlegt.
→ Zustand prüfen
```

oder:

```text
Heizung:
Erneuerung ursprünglich bis 2028 erwartet.
Keine Maßnahme hinterlegt.
→ Planung prüfen
```

Nicht zulässig:

```text
„Ihre Heizung muss 2028 ersetzt werden.“
```

wenn nur eine allgemeine Altersannahme zugrunde liegt.

---

# 56. Ableitung aus bekannten Daten

Mietfuchs darf Vorschläge erzeugen aus:

- Baujahr,
- Erneuerungsjahr,
- ConditionAssessment,
- Defects,
- MaintenanceEvents,
- Rechnungen,
- Gutachten,
- Herstellerinformationen,
- Nutzerangaben.

Automatische Vorschläge bleiben als solche erkennbar.

---

# 57. KI

Eine lokale KI darf technische Dokumente oder Freitext analysieren und Vorschläge machen.

Beispiele:

```text
„Wartungsbericht enthält Hinweis auf Korrosion.“

Vorschlag:
ConditionAssessment → beobachten
Defect anlegen?
```

oder:

```text
Rechnung:
„Austausch Umwälzpumpe“

Vorschlag:
TechnicalAsset „Umwälzpumpe“
als ersetzt markieren
neue Pumpe anlegen
```

KI darf niemals ungeprüft Fachobjekte buchen oder abschließen.

---

# 58. Integration Rechnung / Expense

Eine VendorInvoice kann technischen Fachobjekten zugeordnet werden.

Beispiel:

```text
VendorInvoice
  2.380 €

ExpenseAllocation
  Property = Musterstraße 7
  TechnicalAsset = Heizung

WorkOrder = Pumpentausch
Defect = Pumpe ausgefallen
```

Diese Verknüpfungen dienen auch Lifetime-Cost und Steuerklassifikation.

---

# 59. Integration Accounting und Tax

Technische Fachobjekte erzeugen nicht selbst Buchungen.

Kette:

```text
TechnicalAsset
        ↓
WorkOrder
        ↓
VendorInvoice
        ↓
ExpenseRecord / ExpenseAllocation
        ↓
AccountingEvent
        ↓
JournalEntry

und separat:

Expense / Acquisition / Improvement
        ↓
TaxEvent / DepreciableAsset / TaxTreatment
```

`TechnicalAsset` und `DepreciableAsset` dürfen verknüpft sein, bleiben aber getrennt.

---

# 60. Integration AfA

Beispiel Wärmepumpe:

```text
TechnicalAsset
„Wärmepumpe“

optional verknüpft mit

DepreciableAsset
„Wärmepumpe steuerlich“
```

Die technische Lebensdauer und die steuerliche Abschreibungsdauer dürfen voneinander abweichen.

---

# 61. Integration CO₂ / Energie

Technische Assets können Energieinformationen referenzieren.

Beispiele:

```text
HeatingSystem
PV
Meter
```

Die bestehende Energie- und CO₂-Domäne bleibt fachlich getrennt.

Kein TechnicalAsset enthält selbst eine zweite Zähler- oder Verbrauchswelt.

---

# 62. Portfolio-Cockpit

Auf Portfolioebene soll langfristig angezeigt werden:

```text
Technischer Zustand

3 Objekte
2 ohne akuten Handlungsbedarf
1 mit offenem größeren Mangel

Nächste 12 Monate
4 Wartungen
1 technische Prüfung
1 geplante Maßnahme

Erwarteter Kapitalbedarf
5 Jahre    65–95 T€
10 Jahre  130–190 T€
```

---

# 63. Technischer Risikoindikator

Optional P1/P2 kann ein einfacher objektbezogener Indikator entstehen.

Er darf nur aus nachvollziehbaren Einzelindikatoren berechnet werden:

- kritische Defects,
- überfällige MaintenanceDue,
- Assets Zustand 4/5,
- überfällige LifecyclePlanItems,
- unbekannte Zustände wesentlicher Bauteile.

Kein undurchsichtiger proprietärer „Gebäude-Score“.

---

# 64. Jahresabschluss-Assistent

Der technische Bereich fließt in den Annual Completeness Check ein.

Beispiele:

```text
Technik

✓ alle bekannten Rechnungen zugeordnet
✓ keine ungeklärten größeren technischen Dokumente
⚠ 1 Wartungsnachweis fehlt
⚠ Dachzustand seit 5 Jahren nicht aktualisiert
```

Technische Zukunftsplanung darf den steuerlichen Jahresabschluss nicht blockieren.

---

# 65. Priorisierung

## P0 – fachliches Fundament

Für Mietfuchs Next 1.0 erforderlich:

```text
TechnicalAsset-Erweiterung
Bauteile + Systeme + Geräte + Außenanlagen

ConditionAssessment

Defect

MaintenancePlan

MaintenanceDue

MaintenanceEvent

Verknüpfung mit:
Ticket
WorkOrder
VendorQuote
VendorInvoice
Document
Operational Core

einfache Technik-Übersicht im Objekt-Cockpit
```

Zusätzlich muss das Schema für `LifecyclePlanItem` bereits Teil des P0-Domänenmodells sein.

---

# 66. P1 – Lebenszyklus und Eigentümerplanung

```text
LifecyclePlanItem vollständig

5-/10-/20-Jahres-Erhaltungsbedarf

Condition-basierte Planung

Grundstruktur / technische Templates

TechnicalInspection

mobile Zustandsaufnahme

technischer Rückstau

Portfolioübersicht

Integration CapitalProject

Preisbasierte Langfristprognose
```

Für die Produktvision wird insbesondere der **einfache 10-Jahres-Erhaltungsbedarf** empfohlen, bevor Mietfuchs Next als fachlich vollständig gilt.

---

# 67. P2

Bewusst später:

```text
QR-Codes an Anlagen
NFC
IoT-Zustandsdaten
herstellerspezifische Wartungsadapter
BIM-Import
GIS
CAD
Bauteilkataloge externer Hersteller
automatische technische Normenprüfung
professionelle Gebäudediagnostik
Material-/Ersatzteillager
Techniker-Ressourcenplanung
SLA
```

---

# 68. Änderungen an M7

M7 wird umbenannt von:

> **Technische Administration**

in:

> **Technischer Bestand, Zustand, Mängel & Instandhaltung**

Bestehendes Parent-Issue #11 wird entsprechend erweitert.

Ziel von M7:

```text
Was existiert?
Wie ist der Zustand?
Was ist kaputt?
Was wird gewartet/geprüft?
Was wurde repariert?
Was kostet es?
```

---

# 69. Empfohlene M7-Unterissues

Bestehendes Issue `TechnicalAsset mit Hierarchie` erweitern:

```text
TechnicalAsset:
assetKind
Bauteile/Systeme/Geräte/Außenanlagen
Lifecycle-Basisdaten
```

Neue Issues:

```text
ConditionAssessment & technische Zustandshistorie

TechnicalInspection

Defect: bestätigte technische Mängel

MaintenanceDue: konkrete Wartungs-/Prüffälligkeiten

Technische Rückstau-Projektion

Technik-Cockpit auf Objektebene
```

Bestehende WorkOrder-/Maintenance-/Document-Integrationen bleiben bestehen.

---

# 70. Änderungen an M15

M15 wird fachlich erweitert zu:

> **Portfolio, langfristiger Erhaltungsbedarf & Planung**

M15 enthält:

```text
Portfolio-Dashboard
Objekt-Cockpit
Budget
Cashflow-Forecast
LifecyclePlanItem
technischer 5-/10-/20-Jahres-Horizont
CapitalProject
Budget vs. Committed vs. Actual
```

---

# 71. Release-Slice D

Release-Slice D:

> Alltag funktioniert

wird präzisiert:

```text
Inbox
Tasks
Deadlines
Dokumente
Technik
Defects
Wartung
Prüfungen
```

---

# 72. Release-Slice H – Eigentümerperspektive

Optional sollte ein weiterer End-to-End-Slice definiert werden:

> **H – Das Gebäude bleibt beherrschbar**

Szenario:

```text
Bestandsgebäude wird übernommen
→ technische Grundstruktur wird angelegt
→ Zustand wesentlicher Bauteile erfasst
→ Wartung läuft
→ Mangel entsteht
→ Reparatur wird abgewickelt
→ langfristige Dachsanierung wird vorgemerkt
→ einige Jahre später entsteht daraus CapitalProject
→ Angebote
→ Auftrag
→ Rechnung
→ Zustand aktualisiert
→ Kosten und Historie bleiben nachvollziehbar
```

---

# 73. End-to-End-Test TECH-E2E-1

## Haus von 1984

Ausgangslage:

```text
Dach:
Baujahr 1984
Teilsanierung 2005
Zustand 3
geschätzte Erneuerung 2030–2035
50–70 T€

Heizung:
Baujahr 2002
Zustand 3
Wartung jährlich
Erneuerung 2028–2032
20–30 T€
```

Erwartung:

```text
keine akuten Defects

MaintenanceDue Heizungswartung sichtbar

LifecyclePlanItem Dach sichtbar

LifecyclePlanItem Heizung sichtbar

10-Jahres-Erhaltungsbedarf:
70–100 T€
```

---

# 74. End-to-End-Test TECH-E2E-2

## Feuchtigkeit

```text
Ticket:
Mieter meldet Feuchtigkeit

TechnicalInspection

Defect:
Balkonabdichtung undicht

2 VendorQuotes

WorkOrder Abdichtung

VendorInvoice

ConditionAssessment:
Zustand danach gut

Defect:
VERIFIED / CLOSED
```

Alle Zusammenhänge bleiben nachvollziehbar.

---

# 75. End-to-End-Test TECH-E2E-3

## Wiederkehrende Wartung

```text
MaintenancePlan:
jährliche Heizungswartung
```

erzeugt:

```text
MaintenanceDue 2026
```

nach Abschluss:

```text
MaintenanceEvent 2026

MaintenanceDue 2026 = COMPLETED

neue MaintenanceDue 2027
```

Die 2026er Instanz bleibt erhalten.

---

# 76. End-to-End-Test TECH-E2E-4

## Wartung findet Mangel

Wartungsbericht:

```text
Korrosion am Wärmetauscher
Kontrolle innerhalb 6 Monaten empfohlen
```

Nach manueller Bestätigung:

```text
MaintenanceEvent result = OBSERVE

ConditionAssessment

optional Defect

Task / Deadline für Nachprüfung
```

Keine ungeprüfte KI-Buchung.

---

# 77. End-to-End-Test TECH-E2E-5

## Langfristige Maßnahme wird konkret

2026:

```text
LifecyclePlanItem:
Dach erneuern 2031–2035
```

2030:

```text
CapitalProject:
Dachsanierung
```

Angebote:

```text
58.000
64.000
71.000
```

Auftrag:

```text
62.000
```

Final:

```text
Actual = 65.400
```

Danach:

```text
LifecyclePlanItem COMPLETED
ConditionAssessment = 1
```

Historie bleibt vollständig.

---

# 78. Unit Tests

Mindestens:

```text
T-TECH-001
ConditionAssessment überschreibt vorherige Bewertung nicht.

T-TECH-002
Ticket erzeugt nicht automatisch Defect.

T-TECH-003
WorkOrder COMPLETED schließt Defect nicht automatisch.

T-TECH-004
MaintenancePlan erzeugt neue Due-Instanz statt alte zu überschreiben.

T-TECH-005
MaintenanceDue OVERDUE erscheint im Rückstau.

T-TECH-006
LifecyclePlanItem ≠ CapitalProject.

T-TECH-007
CapitalProject-Verknüpfung löscht PlanItem nicht.

T-TECH-008
Estimate, Committed und Actual bleiben getrennt.

T-TECH-009
TechnicalAsset kann ohne Hersteller/Baujahr angelegt werden.

T-TECH-010
UNKNOWN blockiert normalen Workflow nicht.

T-TECH-011
TechnicalAsset ≠ DepreciableAsset.

T-TECH-012
Rückstau wird als Projection berechnet.

T-TECH-013
System-Lebensdauer erzeugt nur Vorschlag.

T-TECH-014
Defect ACCEPTED benötigt Begründung.

T-TECH-015
Asset REPLACED referenziert Nachfolger.

T-TECH-016
bestehende technische Historie bleibt nach Replacement erhalten.

T-TECH-017
Dokument-Inbox erzeugt ohne Accept keinen MaintenanceEvent.

T-TECH-018
Lifecycle-Forecast enthält keine abgeschlossenen Items.

T-TECH-019
Deferred Item bleibt im Forecast bzw. Rückstau sichtbar.

T-TECH-020
SQLite und PostgreSQL erzeugen identische Fachresultate.
```

---

# 79. Migration bestehender TechnicalAssets

Bestehende Daten werden nicht verworfen.

Migration:

```text
bestehendes TechnicalAsset
→ assetKind anhand vorhandener Kategorie bestimmen

wenn nicht eindeutig:
assetKind = OTHER
```

Bestehende:

- Tickets,
- WorkOrders,
- MaintenancePlans,
- MaintenanceEvents,
- Dokumentlinks

bleiben gültig.

Keine manuelle Nachpflege ist für die Migration zwingend erforderlich.

---

# 80. Migration bestehender Zustandsinformationen

Freitext-Zustände dürfen nicht automatisch in numerische Zustandsgrade umgedeutet werden, wenn die Aussage nicht eindeutig ist.

Stattdessen:

```text
legacy note erhalten

conditionGrade = UNKNOWN
```

Nutzer kann später bewerten.

---

# 81. Import

CSV/XLSX-Import soll optional unterstützen:

```text
Objekt
Bauteil/Anlage
Kategorie
Baujahr
letzte Erneuerung
Zustand
Wartungsintervall
nächste Wartung
erwartetes Erneuerungsjahr
geschätzte Kosten
Notiz
```

Fehlende Werte sind zulässig.

---

# 82. Export

Der vollständige Domain Export enthält:

```text
TechnicalAssets
ConditionAssessments
TechnicalInspections
Defects
MaintenancePlans
MaintenanceDue
MaintenanceEvents
LifecyclePlanItems
Links zu WorkOrders
Links zu CapitalProjects
```

Dokumente bleiben separat im versionierten Document Export.

---

# 83. Audit Trail

Mindestens folgende technische Aktionen werden auditierbar:

```text
TechnicalAsset angelegt/geändert/archiviert

ConditionAssessment angelegt

Defect bestätigt

Defect als ACCEPTED markiert

Defect geschlossen

MaintenanceDue waived

LifecyclePlanItem verschoben

LifecyclePlanItem cancelled

CapitalProject erzeugt

WorkOrder abgeschlossen
```

---

# 84. Keine stille Löschung

Technische Historie wird grundsätzlich nicht gelöscht, wenn sie Grundlage späterer Entscheidungen war.

Stattdessen:

```text
archivedAt
status = CANCELLED
status = REJECTED
```

mit Begründung, wo fachlich erforderlich.

---

# 85. Performance

Für die Zielgröße 1–12 Einheiten ist Optimierung auf Massendaten nicht erforderlich.

Die Architektur soll trotzdem ohne grundlegenden Umbau mehrere Tausend TechnicalAssets unterstützen.

Keine Microservices.

Keine externe Queue als fachliche Voraussetzung.

---

# 86. Referenzarchitektur

Die gesamte technische Domäne bleibt Teil des modularen Monolithen.

```text
domain/
  property/
  technical/
    assets
    condition
    defects
    maintenance
    lifecycle
  operations/
  documents/
  finance/
  accounting/
  tax/
```

Keine Domain importiert direkt:

```text
Prisma
SQLite
PostgreSQL
```

Repository-Abstraktion bleibt verbindlich.

---

# 87. Integrationsprinzip

Verknüpfungen erfolgen vorzugsweise über stabile Fach-IDs.

Keine technische Entität darf fremde Module durch direkte Datenbankmanipulation verändern.

Beispiel:

```text
Defect resolved

→ Domain Event

→ Operational Core schließt passende Tasks
→ Lifecycle kann Zustand neu bewerten
```

---

# 88. Keine zweite Wahrheit

Folgende Werte werden abgeleitet:

```text
aktueller Zustand
= jüngstes gültiges ConditionAssessment

offene Defects
= Defect-Status

nächste Wartung
= MaintenanceDue

Lifetime Costs
= tatsächliche Expenses / Invoices

technischer Rückstau
= Projection

10-Jahres-Bedarf
= LifecyclePlanItems
```

Sie werden nicht redundant als manuell editierbare Summen gespeichert.

---

# 89. UX-Invariante

Eine technische Funktion darf nur dann als eigener Menüpunkt erscheinen, wenn der normale private Vermieter sie als eigenes Konzept versteht.

Deshalb:

**sichtbar:**

```text
Schaden
Wartung
Prüfung
Zustand
Maßnahme
Angebot
Auftrag
```

**nicht als Standardnavigation sichtbar:**

```text
Defect
MaintenanceDue
ConditionAssessment
LifecyclePlanItem
TechnicalAssetRelationship
```

---

# 90. Definition of Done für die technische Domäne

Die technische Schicht gilt als fachlich vollständig, wenn ein privater Vermieter für jedes Objekt ohne zusätzliche Excel-Liste beantworten kann:

```text
Was habe ich?

Was ist kaputt?

Was ist überfällig?

Was muss ich beobachten?

Was kommt wahrscheinlich in den nächsten Jahren?

Was habe ich bereits geplant?

Was wurde beauftragt?

Was wurde tatsächlich gemacht?

Was hat es gekostet?

Welche Dokumente gehören dazu?
```

Und wenn das System daraus zuverlässig die zentrale Eigentümerfrage beantworten kann:

> **Ist mit meinem Gebäude im Wesentlichen alles in Ordnung – und welche größeren technischen und finanziellen Themen kommen auf mich zu?**

---

# 91. Nicht-Ziele

Auch nach Umsetzung dieser Spezifikation ist Mietfuchs ausdrücklich kein:

```text
CAFM
CMMS
ERP
BIM-System
Digital Twin
Gebäudeleittechnik
Energiemanagementsystem
Handwerkerportal
Einkaufssystem
Lagerverwaltung
Projektmanagementsystem für Großbaumaßnahmen
```

Mietfuchs besitzt lediglich so viel technische Domäne, wie ein privater Eigentümer benötigt, damit wichtige Informationen nicht erst sichtbar werden, wenn bereits ein Schaden entstanden ist.

---

# 92. Zusammenfassung der Architekturentscheidung

Das technische Kernmodell lautet:

```text
Property
   │
   ├── Building
   │
   │    └── Unit
   │
   └── TechnicalAsset
          │
          ├── ConditionAssessment
          │
          ├── Defect
          │      └── WorkOrder
          │
          ├── MaintenancePlan
          │      └── MaintenanceDue
          │             └── MaintenanceEvent
          │
          ├── LifecyclePlanItem
          │      └── CapitalProject
          │
          └── Documents / Costs / History
```

Die Oberfläche reduziert dies auf:

```text
Was ist akut?

Was ist fällig?

Was muss ich beobachten?

Was kommt später?

Was kostet es?
```

Damit bleibt Mietfuchs für einen kleinen privaten Bestand einfach bedienbar, besitzt intern aber ein ausreichend belastbares Modell, um Instandhaltungsrückstau, Alterung und größere Sanierungen nicht erst Jahre zu spät zu erkennen.
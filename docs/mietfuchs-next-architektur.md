# Mietfuchs Next — Architektur Bankabgleich, Kontoarten und Mischkonto (Fassung 2)

Stand: 14.10.2026, Abstimmung mit Upstream eingearbeitet · Status: Architekturentscheidung, verbindlich zusammen mit
[Spezifikation §274](mietfuchs-next-spezifikation.md) · Ergänzung zum
[Kanon](mietfuchs-next-kanon.md) und zur [Roadmap](mietfuchs-next-roadmap.md) (Phase 0)

Fassung 1 war der gemeinsame Entwurf von Software-Architektur und Datenschutz. Fassung 2 arbeitet
die Prüfung durch einen Steuerberater und eine GoBD-Prüfung sowie die Entscheidungen des
Projektinhabers vom 14.10.2026 ein. Übernommene Änderungen tragen den Vermerk **(Prüfung StB)**
bzw. **(Prüfung GoBD)**. Wo sich die Prüfungen widersprechen, gilt die strengere Lösung; der
Widerspruch steht dann in einem Satz dabei.

**Abstimmung mit Upstream (14.10.2026, speedone/mietfuchs#188):** Der Maintainer trägt die
Kontoarten mit und hat vier Punkte geändert; sie sind eingearbeitet und tragen den Vermerk
**(Upstream)**: Leser als eigener PR und danach kleine Schritte (3.1), keine Monatszuordnung im
Import und keine Tabelle `payment_allocations` (3.3, 3.6), Guthaben und Nachzahlungen als Art der
Zahlung nach speedone/mietfuchs#280 statt als eigene Link-Art (3.3), die Kaution nie in `payments`
und ein Kautionskonto, das nicht eingelesen wird (3.2), und der Wortlaut „Konto lückenlos
eingelesen“ (3.9).

Gegliedert ist nach Inkrementen. **Inkrement 1** ist Phase 0 der Roadmap und wird upstream-fähig
gebaut. **Inkrement 2** schließt die bekannten Lücken des ersten. **Später** steht, was an die
Phasen 5–8 oder an „nach Phase 8“ gebunden ist und im Fork bleibt.

Alle Beispiele sind erfunden. Beträge stehen als Platzhalter; Beispiel-IBANs gäbe es nur mit
Prüfziffer `00` (Kanon, „Echte Daten sind tabu“).

---

## 1. Leitprinzipien

1. **Local-first und eine Wahrheit.** Die SQLite-Datei der Installation ist die einzige fachliche
   Quelle (Inv. 101). Kein Cloud-Dienst ist für die Korrektheit nötig (Inv. 90).
2. **Eng an Upstream.** Schema mit drizzle-orm, Migrationen erzeugt, nie von Hand; Schreibschlange,
   Backup per `VACUUM INTO`, Umstieg und Regression stammen aus speedone/mietfuchs (§273). Neue
   Tabellen folgen dessen Mustern: englische Bezeichner, Cent-Integer, `CHECK` je Aufzählung,
   Fremdschlüssel mit begründetem Löschverhalten, Planer als reine Funktion, Ausführung in einer
   Transaktion durch die Schreibschlange, Vorschau mit Prüfmarke und 409 bei verändertem Stand
   (Vorbild `planBooking`).
3. **Umsatz ≠ Zahlung** (Inv. 5). Ein Kontoumsatz ist ein Fachbeleg. Zur Zahlung im Mietkonto wird
   er erst über eine bestätigte Verknüpfung. `payments` bleibt unverändert.
4. **Fachbeleg → Entscheidung → Wirkung** (Inv. 97). Kein Import erzeugt ungeprüft eine Zahlung.
   Jede Verbindung trägt Herkunft: Vorschlag (Regel), bestätigt von einem Menschen, mit Zeitpunkt.
   Der Bankabgleich ist regelbasiert, ohne KI; Bankdaten gehen nie an eine KI.
5. **Idempotent oder ausdrücklich bestätigt** (Inv. 19, 84). Gleiche Datei, gleicher Tag, gleicher
   Umsatz ergeben keinen zweiten Effekt. Ein abweichender bekannter Tag wird nie still
   überschrieben, sondern vorgelegt.
6. **Datenminimierung als Bauform** (Art. 5 Abs. 1 lit. c, Art. 25 DSGVO). Private Umsätze eines
   Mischkontos gelangen weder in die Datenbank noch ins Backup, auch nicht als Hash, sondern nur
   als Tagessumme.
7. **Centgenau, Kalendertag ≠ Zeitstempel.** Beträge als Integer-Cent (Inv. 17). Buchungs- und
   Wertstellungstag sind Kalenderdaten `YYYY-MM-DD`, Import- und Bestätigungszeitpunkte
   ISO-Zeitstempel in UTC (Inv. 102).
8. **Abgeleitet vor gespeichert.** Monats-Soll, offene Posten, privater Tagesrest und
   Kontoabstimmung werden berechnet, nicht gespeichert. Eine zweite gespeicherte Wahrheit läuft
   auseinander (Inv. 85).
9. **GoBD-Haltung: gebaut, als gälte § 146 Abs. 4 AO.** Für den privaten Vermieter ohne
   Umsatzsteueroption gelten § 147 AO und die GoBD nicht unmittelbar. Ob § 146 Abs. 6 AO
   freiwillige Aufzeichnungen eines Vermieters erfasst, ist nicht geklärt. Mietfuchs verhält sich
   deshalb so, als gälte das Änderungsverbot: Bestätigtes wird nicht geändert, sondern durch eine
   Gegenbuchung aufgehoben, und jede Änderung gespeicherter Aufzeichnungen steht im Protokoll
   **(Prüfung GoBD)**. Nie geworben wird mit „GoBD-zertifiziert“ oder „revisionssicher“.

## 2. Rechtlicher Rahmen (Kurzfassung)

- Privater Vermieter (V+V, Überschusseinkünfte): nicht buchführungspflichtig (§§ 140, 141 AO);
  § 147a AO erst ab 500.000 € positiver Überschusseinkünfte. Unmittelbar gelten Mitwirkung
  (§ 90 AO), Vorlage auf Anforderung (§§ 92, 97 AO) und Berichtigung (§ 153 AO).
- **Mietfuchs ist Aufzeichnungshilfe, nicht Buchführung.** Die Kontoabstimmung ist eine Zuordnungs-
  und Plausibilitätshilfe nach § 90 Abs. 1 AO. Sie **ersetzt den Kontoauszug nicht**; das Finanzamt
  kann vollständige Auszüge anfordern, auch eines Privatkontos **(Prüfung StB, Prüfung GoBD)**.
- Geschätzt wird nach § 162 AO in der Regel **vom Vertragssoll aus**, nicht vom Konto. Der
  Soll/Ist-Abgleich je Mietverhältnis ist deshalb so wichtig wie die Saldenkette **(Prüfung StB)**.
- Private Vorgänge sind bei Überschusseinkünften keine Geschäftsvorfälle der Einkunftsart. Sie nur
  als Summe zu führen, ist mit dem Grundsatz der Vollständigkeit vereinbar, **wenn der vollständige
  Bankauszug beim Vermieter vorliegt**; er ist der Einzelnachweis hinter jeder Tagessumme
  **(Prüfung GoBD)**. Mietfuchs macht das deshalb zu einem Prüfpunkt, nicht nur zu einem Hinweis
  (Abschnitt 3.9).
- Umsatzsteuerlich ist jeder Vermieter Unternehmer (§ 2 UStG). Mit Option nach § 9 UStG gelten die
  Aufzeichnungen des § 22 UStG mit Aufbewahrung nach § 147 AO. Mietfuchs unterstützt die Option
  nicht (Spec §82.13) und rät bei Option zu einem eigenen Konto **(Prüfung StB, Prüfung GoBD)**.

---

## 3. Inkrement 1 — Phase 0, upstream-fähig

### 3.1 Lieferweg

Der Import ist ein Beitrag zu speedone/mietfuchs#188 und wird in **kleinen PRs** gebaut, jeder mit
eigener Durchsicht. Der Leser geht allein nach Upstream, obwohl er noch nichts bewirkt; der
Maintainer wünscht das so **(Upstream)**, der Projektinhaber hat zugestimmt.

| PR | Inhalt | Stand |
|---|---|---|
| 1 | Leser camt.052/053/054 und MT940: nur Fakten, Saldenprobe je Auszug, Befunde statt Raten, Fingerabdruck mit `FINGERPRINT_VERSION` | fertig, PR eingereicht |
| 2 | Schema und Import: `bank_accounts`, `bank_imports`, `bank_days`, `bank_transactions`, `bank_events`; Planer und Ausführung des Imports | offen |
| 3 | Zuordnung und Buchen: `bank_transaction_links`, `tenancy_payers`; setzt die Art der Zahlung voraus (speedone/mietfuchs#280) | offen |
| 4 | Oberfläche: Import mit Rückfragen, Zuordnung, Jahres-Kontoabstimmung, Hinweise | offen |

Die Migration kommt **erst nach den Heizungs-Migrationen von Upstream (bis 0055)**. Fork-eigenes
(Tax Layer, Journal, Anlage-V-Paket, Verfahrensdokumentation) bleibt in Fork-Dateien und
berührt die Tabellen dieses Abschnitts nur lesend.

### 3.2 Kontoarten

| Kontoart (`kind`) | Was einzeln gespeichert wird | Summen und Salden | Kontoabstimmung |
|---|---|---|---|
| `rental` Mietkonto | alle Umsätze | Tagessummen, Tagesendsaldo | „lückenlos eingelesen“ möglich |
| `mixed` Mischkonto | nur Vermietungsumsätze (3.5) | Tagessummen, Tagesendsaldo; Saldenkette Pflicht | „lückenlos eingelesen“ möglich |
| `private` Privatkonto | nur bestätigt zugeordnete Mieteingänge | keine; nur der durchsuchte Zeitraum | nie „lückenlos“ |
| `deposit` Kautionskonto | nichts; eine Datei dieses Kontos wird in Inkrement 1 nicht eingelesen | keine | keine |

Ein unbekanntes Konto wird mit der Rückfrage „Kontoart?“ angelegt, **Voreinstellung Mischkonto**,
weil es am wenigsten speichert (Art. 25 Abs. 2 DSGVO). Der Vermieter muss vor dem ersten Import nicht
über die Kontoart nachdenken **(Upstream)**. „Mietkonto“ gilt nur nach ausdrücklicher Bestätigung
(„Über dieses Konto laufen keine privaten Umsätze“), damit eine falsche Wahl nicht still Privates
einzeln speichert; das Wechseln zurück bietet das Löschen nach 3.7 an. Die Kontoart gilt ab dem nächsten Import;
welche bei einem Tag galt, steht am Tag (`bank_days.scope`). Wechsel Mietkonto → Mischkonto bietet
an, gespeicherte Umsätze **ohne Zuordnung**, die nicht zur Vermietung gehören, zu löschen (3.7).

Das **Kautionskonto** (§ 551 Abs. 3 BGB) ist wirtschaftlich Geld des Mieters, die Erträge stehen
ihm zu und erhöhen die Sicherheit; Kontoinhaber ist meist der Vermieter als Treuhänder
**(Upstream)**. Mietfuchs kennt in Inkrement 1 nur seine IBAN, damit die Umbuchung einer Kaution
vom Mietkonto dorthin als `deposit_transfer` erkannt wird, weder Einnahme noch privat. Ein späteres
Einlesen ist möglich und sinnvoll, aber nie als Einnahme (8.13).

Beim Anlegen eines Mischkontos ein Satz, kein Dauerhinweis: „Ein eigenes Konto nur für die
Vermietung ist nicht Pflicht, erleichtert aber den Nachweis gegenüber dem Finanzamt erheblich.“
**(Prüfung StB)**

### 3.3 Tabellen

Alle Beträge `integer` Cent, Kalenderdaten `text 'YYYY-MM-DD'`, Zeitstempel `text` ISO UTC.

**`bank_accounts`** — das eigene Konto: `id` · `iban` NULL, eindeutig wenn gesetzt, normiert und nach
ISO 13616 geprüft · `other_id` NULL (Kennung ohne IBAN; `CHECK(iban IS NOT NULL OR other_id IS NOT
NULL)`) · `name` · `kind` `CHECK IN ('rental','mixed','private','deposit')` · `default_property_id` FK
`properties` SET NULL (nur Vorbelegung) · `currency` `CHECK = 'EUR'` · `closed_on` NULL.

**`bank_imports`** — eine Zeile je eingelesener Datei: `id` · `file_sha256` eindeutig („Diese Datei
wurde am … schon eingelesen“) · `format` `CHECK IN ('camt.052','camt.053','camt.054','mt940')` ·
`file_created_at` NULL (Grundlage „abgeschlossener Tag“) · `imported_at` · `fp_version` ·
**`app_version`** **(Prüfung GoBD)** · `stats` JSON (neu, schon bekannt, vorläufig, Rückfragen).
Kein Originaldateiname (enthält oft Namen oder Kontonummern), kein Dateiinhalt.

**`bank_days`** — je Konto und **abgeschlossenem Kalendertag im Auszugszeitraum**, auch an Tagen
ohne Umsatz:

| Spalte | Inhalt |
|---|---|
| `account_id` FK RESTRICT, `booking_date` | Primärschlüssel |
| `scope` `CHECK IN ('all','rental','payments_only')` | was an diesem Tag gespeichert wurde (Kontoart zum Zeitpunkt des Imports) |
| `entry_count` ≥ 0, `credit_cents` ≥ 0, `debit_cents` ≥ 0 | Anzahl laut Auszug (Sammelbuchung zählt als einer), Haben, Soll; bei `payments_only` NULL (`CHECK`) |
| `closing_cents` NULL | Tagesendsaldo; bei `payments_only` immer NULL |
| `statement_ref` NULL | Auszugsnummer laut Bank, Fundstelle für das Protokoll **(Prüfung GoBD)** |
| `date_estimated` | Tag stammt aus MT940 ohne Buchungstag |
| `import_id` FK RESTRICT, `fp_version` | Herkunft |

Eine eigene Tabelle `bank_statements` (Fassung 1) entfällt: Abdeckung, Kontoart je Zeitraum und
Auszugsnummer stehen je Tag, und die Abdeckung eines Jahres ist die Menge seiner Tage. Der
**private Rest** eines Mischkontotags wird nicht gespeichert, sondern abgeleitet:
Tagessumme minus Summe der gespeicherten Umsätze, getrennt nach Haben, Soll und Anzahl.

**`bank_transactions`** — einzeln gespeicherter Umsatz:

| Spalte | Inhalt |
|---|---|
| `id`; `account_id` FK RESTRICT | |
| `booking_date`, `day_seq` ≥ 0 | **eindeutig `(account_id, booking_date, day_seq)`**: Stelle im Tag laut Datei, die Identität des Umsatzes |
| `value_date` NULL; `amount_cents` (Eingang positiv) | |
| `counterparty_name`, `counterparty_iban`, `ultimate_party_name`, `purpose` | nur bei gespeicherten Umsätzen |
| `bank_reference`, `end_to_end_id` NULL | Originalreferenzen (Spec §76) |
| `reversal`; `batch_reference`, `batch_part`, `batch_parts`, `batch_total_cents` NULL | Rücklastschrift; aus camt.054 zerlegte Sammelbuchung, Summe = Sammler |
| `fingerprint`, `fp_version` | **nicht eindeutig**, Index `(account_id, booking_date, fingerprint)` |
| `class` `CHECK IN ('rent','tenant_out','deposit_transfer','tax_office','marked','unclear','other')` | warum er gespeichert ist; `vendor` folgt mit Phase 1, `own_transfer` mit Inkrement 2 |
| `dismissed_reason` NULL, `dismissed_at` NULL | „nicht relevant“ mit Grund aus fester Auswahl (z. B. Kaution auf falschem Konto) |
| `property_id` NULL FK `properties` **RESTRICT** | Objekt-Dimension für Umsätze ohne Mietverhältnis (3.13); mit Link ergibt sie sich aus dem Mietverhältnis. RESTRICT wie die übrigen Verweise aufs Objekt: Die Dimension darf nicht still verloren gehen, ein Objekt mit eingelesenen Umsätzen wird nicht gelöscht |

`class='other'` gibt es nur auf dem Mietkonto (gespeichert, weil dort alles gespeichert wird).

**`bank_transaction_links`** — die bestätigte Entscheidung Umsatz ↔ Fachobjekt: `id` (Quelle eines
späteren Posting-Schlüssels) · `bank_transaction_id` FK **RESTRICT** **(Prüfung GoBD; Fassung 1:
CASCADE)** · `kind` `CHECK IN ('payment','depositReceipt','depositReturn','reversal','fee')` ·
`amount_cents` ≠ 0, Vorzeichen wie der Umsatz, Summe der wirksamen Links ≤ Betrag · `payment_id` FK
`payments` CASCADE NULL (wie mit Upstream vereinbart; die Art der Zahlung, Miete oder Abrechnung,
steht an der Zahlung nach speedone/mietfuchs#280, nicht am Link **(Upstream)**) · `tenancy_id` FK
`tenancies` CASCADE NULL (Kaution ist keine Zahlung, Inv. 8; `depositReceipt` setzt
`depositStatus`) · `reverses_link_id` FK NULL ·
Herkunftsblock `origin` (`rule`/`manual`), `rule_version`, `confirmed_at`, `confirmed_by`
(`local`). `CHECK` genau ein Ziel passend zur Art. **Es werden nur bestätigte Links gespeichert**;
Vorschläge leben in der Vorschau. Ein bestätigter Link wird nie geändert oder gelöscht, sondern
durch einen Gegenlink (`reverses_link_id`) aufgehoben. Wirksam ist ein Link ohne Gegenlink.
Das `CASCADE` auf `payment_id` bleibt für Upstream; die Anwendung lehnt das Löschen einer Zahlung
mit wirksamem Link ab („erst Zuordnung lösen“) **(Prüfung GoBD, strenger als Fassung 1)**.

**`tenancy_payers`** — gemerkte Zahlerkonten: `id` · `tenancy_id` FK CASCADE · `iban` (Index,
**nicht** eindeutig) · `role` `CHECK IN ('tenant','coTenant','relative','socialAuthority',
'guarantor','other')` · `valid_from`, `valid_to` (`CHECK from ≤ to`; Kontowechsel beendet statt
löscht) · `expected_cents` NULL · `reference` NULL · Herkunftsblock. `tenancies.iban` bleibt
stilles Hauptkonto. Gemerkt wird nur auf ausdrückliche Wahl, kein Name des Zahlers; `reference`
(etwa ein Kassenzeichen des Jobcenters) nur, wenn der Vermieter sie selbst einträgt, weil sie den
Sozialleistungsbezug offenlegt.

**`payment_allocations` entfällt** **(Upstream; Fassung 2 sah sie vor)**. Eine gespeicherte
Monatszuordnung neben `rentLedger` wäre eine zweite Wahrheit, und § 366 Abs. 2 BGB heißt nicht
einfach „ältester Monat zuerst“. Verteilung auf Monate und Übertrag ins nächste Jahr werden
zusammen in `rentLedger` entschieden (speedone/mietfuchs#281). **Forderungen (`charges`) werden
in Inkrement 1 nicht gespeichert**; das Soll bleibt aus den Staffeln abgeleitet.

**`bank_events`** — das Protokoll des Bankabgleichs, nur anhängend (3.8).

### 3.4 Import: planen, dann ausführen

`planBankImport(datei, bestand) → { plan, rückfragen, token }` ist eine reine Funktion. Die
Ausführung bekommt Datei, Antworten und Prüfmarke erneut vom Browser (der Server legt keine
temporäre Datei an) und läuft in **einer** Transaktion durch die Schreibschlange: ganz oder gar
nicht. Weicht der Bestand von der Prüfmarke ab, antwortet der Server mit 409 und neuer Vorschau.

1. **Datei.** `file_sha256` bekannt → „schon eingelesen am …“, Ende. Saldenprobe eines Auszugs
   fehlgeschlagen → dieser Auszug wird nicht übernommen, Rückfrage.
2. **Konto** über IBAN bzw. `other_id`; unbekannt → Rückfrage Kontoart (3.2).
3. **Abgeschlossene Tage.** Ein Tag ist abgeschlossen, wenn er vor dem Kalendertag von
   `file_created_at` und vollständig im Auszugszeitraum liegt. camt.053 und MT940 erfüllen das
   regelmäßig, camt.052 nur für Vortage. camt.054 begründet nie einen Tag, es zerlegt nur Sammler.
   Nicht abgeschlossene Tage werden **nicht gespeichert**; die Vorschau zeigt sie mit „wird
   übernommen, sobald der Tagesauszug vorliegt“. Eine heute schon erfasste Zahlung von Hand wird
   beim späteren Import verknüpft („schon erfasst“), nicht doppelt angelegt.
4. **Tagesabgleich** je abgeschlossenem Tag:
   - Tag unbekannt → neu.
   - Tag bekannt → bekannt, wenn Anzahl, Haben- und Sollsumme gleich sind **und** jeder
     gespeicherte Umsatz des Tages in der Datei wiedergefunden wird (Multimenge über Fingerabdruck;
     Bankreferenz und Endkennung trennen, wo beide Seiten sie tragen). Dann wird nichts geschrieben.
   - Bekannt, aber abweichend → Rückfrage „Der Tag sieht in dieser Datei anders aus (n statt m
     Umsätze)“: Bestand behalten · Tag ersetzen · Abbrechen. **Ersetzt werden nur Umsätze ohne
     wirksamen oder aufgehobenen Link**; verknüpfte bleiben. Jeder ersetzte Umsatz erhält eine
     Protokollzeile alt/neu **(Prüfung GoBD)**. Gleiches gilt für „durch genaueren Auszug ersetzen“
     bei `date_estimated`.
   - Erkennt die Datei in einem bekannten Tag einen Umsatz als Vermietung, der nicht gespeichert ist
     (etwa weil inzwischen ein Zahlerkonto gemerkt ist) → Rückfrage „nachträglich übernehmen?“.
     Der Tag bleibt unverändert, der private Rest sinkt von selbst.
5. **Saldenkette.** Anfangssaldo neuer Tage = Tagesendsaldo des letzten bekannten Tages, sofern die
   Abdeckung anschließt. Bruch → Rückfrage mit Datum und Differenz. Auf Miet- und Mischkonten
   Pflicht; ein Mischkonto ohne Salden in der Datei → Rückfrage, Empfehlung camt.053 oder MT940 mit
   Salden. Eine Lücke in der Auszugsnummernfolge (MT940 `:28C:`, camt `ElctrncSeqNb`) ergibt einen
   Hinweis **(Prüfung GoBD, gute Praxis)**.
6. **Einordnen** je neuem Umsatz nach Kontoart (3.5).
7. **Schreiben**: `bank_imports`, `bank_days`, die einzeln zu speichernden `bank_transactions`,
   Protokollzeilen. Links entstehen erst im zweiten Schritt (3.6).
8. **Ergebnis** in einem Satz: „n neue Umsätze, m schon eingelesen, k Tage vorläufig, j Fragen.“

Rückfragen gibt es nur bei: unbekanntem Konto, abweichendem bekanntem Tag, Bruch der Saldenkette,
Mischkonto ohne Salden, Eingängen unbekannter Herkunft auf dem Mischkonto, Umsätzen mit dem
Finanzamt, geschätzten Buchungstagen mit Konflikt.

### 3.5 Mischkonto: was einzeln gespeichert wird

| Klasse | Regel | Voreinstellung |
|---|---|---|
| `rent` | Eingang von `tenancies.iban` oder gültigem Zahlerkonto, Rücklastschrift dazu | vorgeschlagen |
| `tenant_out` | Ausgang an ein bekanntes Mieterkonto (Guthaben-, Kautionserstattung) | vorgeschlagen |
| `tax_office` | Eingang **oder Ausgang** mit dem Finanzamt, erkannt an der Gegenseite nach einer versionierten Stichwortliste | **immer vorgelegt** **(Prüfung StB)** |
| `marked` | vom Vermieter als „gehört zur Vermietung“ markiert (Versicherung, Grundsteuer, Kontoführung, Darlehensrate, Handwerker) | nur auf Wahl |
| `unclear` | jeder Eingang von unbekannter Gegenseite | **Rückfrage** „Vermietung oder privat?“ |

Ausgänge an unbekannte Gegenseiten gelten ohne Rückfrage als privat und werden nur summiert. Die
Vorschau listet sie (nur im Arbeitsspeicher) zum Durchsehen und hebt Ausgänge mit Stichwörtern wie
Grundsteuer, Versicherung, Handwerk oder Kreditrate hervor **(Prüfung StB)**. Eingänge werden
immer vorgelegt, weil ein übersehener Eingang eine fehlende Einnahme wäre; die Asymmetrie folgt der
Feststellungslast **(Prüfung StB)**. Ein als privat entschiedener Eingang wird nicht gespeichert;
das Protokoll hält je Tag Anzahl und Summe der so entschiedenen Eingänge fest, getrennt von den
automatisch summierten Ausgängen **(Prüfung GoBD)**.

Datenschutz: Beim Einlesen werden private Umsätze und Daten Dritter kurz im Arbeitsspeicher
verarbeitet (Art. 4 Nr. 2 DSGVO), Rechtsgrundlage Art. 6 Abs. 1 lit. f, abgewogen durch sofortiges
Verwerfen ohne Speicherung, ohne KI und ohne Netzverkehr.

### 3.6 Zuordnung und Buchen

Zweiter Schritt nach dem Muster der Belegbuchung: `planBankLinks` (rein) → Vorschau mit Ampel und
Prüfmarke → Ausführen in einer Transaktion. Vorschlag aus `match.ts`: Referenz, gültiges
Zahlerkonto, beendetes Konto nur bei passendem offenem Posten, Name; bei Mehrdeutigkeit kein
Vorschlag. Ein Link `payment` verknüpft eine vorhandene Zahlung („schon erfasst“) oder legt eine
an, mit der Art **Miete** oder **Abrechnung** (Nachzahlung, Guthaben negativ) nach
speedone/mietfuchs#280. **Eine Monatszuordnung schreibt der Import nicht** **(Upstream)**: Die
Zahlung geht in `rentLedger` ein wie eine von Hand erfasste. Den Monat aus dem Verwendungszweck
zeigt die Vorschau nur an.

Eine Kaution fließt im Regelfall gar nicht über das Mietkonto (§ 551 Abs. 3 BGB, Kautionskonto).
Kommt sie doch dort an, bietet die Zuordnung „Kaution als erhalten markieren“: Link
`depositReceipt` am Mietverhältnis, setzt `depositStatus`, **keine Zahlung** (Inv. 8,
**(Upstream)**). Die anschließende Umbuchung aufs Kautionskonto ist `deposit_transfer`. Eine
Rückzahlung vom Mietkonto ist `depositReturn`. Rücklastschriften als `reversal` (Gegenlink).

### 3.7 Umstufung im ersten Inkrement

**Entscheidung des Projektinhabers:** „Reduzieren statt löschen“ gilt nicht beim Import, nur bei
späterer Umstufung gespeicherter Umsätze, und kommt erst mit Inkrement 2.

- **Vermietung → privat** geht in Inkrement 1 nur für Umsätze **ohne Zuordnung**. Der Umsatz wird
  gelöscht, nicht als „verworfen“ behalten (sonst stünde ein privater Datensatz im Bestand und im
  Backup), mit einer Protokollzeile nach 3.8.
- „Ohne Zuordnung“ heißt: **nie ein bestätigter Link**, auch kein inzwischen aufgehobener
  (vom Projektinhaber am 14.10.2026 bestätigt). Das ist die strengere Lesart; ein Umsatz mit
  Link-Geschichte ist eine verarbeitete Aufzeichnung, deren
  Löschen die GoBD-Prüfung ausschließt.
- Umsätze mit Zuordnung sind gesperrt: „Dieser Umsatz ist zugeordnet. Lösen Sie erst die
  Zuordnung.“ Ist die Zuordnung per Gegenlink gelöst, bleibt der Umsatz trotzdem gespeichert; er
  kann erst mit Inkrement 2 reduziert werden. **Bekannte Lücke, Inkrement 2.**
- **Privat → Vermietung** geht in Inkrement 1 nur über die Datei („nachträglich übernehmen“,
  3.4 Schritt 4).

**Widerspruch der Prüfungen:** Der Steuerberater hält Löschen mit Protokoll für unbedenklich, die
GoBD-Prüfung verlangt für verknüpfte Umsätze Reduktion statt Löschung; maßgeblich ist die
strengere GoBD-Lösung, und weil Reduktion erst mit Inkrement 2 kommt, sind verknüpfte Umsätze bis
dahin gesperrt.

### 3.8 Protokoll `bank_events`

Nur anhängend; das Repository bietet weder Ändern noch Löschen, ein Quelltext-Wächter hält das fest
(Trigger wären Handarbeit an einer Migration). Spalten: `id` · `at` · `app_version` · `actor`
(`local`) · `action` `CHECK IN ('import','link','unlink','decide_private','delete_unlinked',
'replace_day','change_kind')` · `account_id` · `booking_date` · `statement_ref` · `day_seq` ·
Vorzeichen und `amount_cents` bzw. Anzahl und Summe · `old_class` · `reason` aus fester Auswahl
(„Fehlzuordnung“, „privates Darlehen zurück“, „Übertrag“, „Kontoart gewechselt“, …)
**(Prüfung StB)** · betroffene Link- und Zahlungskennungen als Text ohne Fremdschlüssel, damit
die Zeile das Löschen überlebt **(Prüfung GoBD)**.

**Keine Namen, IBANs, Verwendungszwecke oder Freitexte.** Datum, Betrag und Fundstelle
(Auszugsnummer, Stelle im Tag) genügen, um den Umsatz im Bankauszug wiederzufinden; der
ursprüngliche Inhalt muss feststellbar sein, nicht in Mietfuchs stehen **(Prüfung GoBD)**. So
zieht eine Löschung keine Kopie im Protokoll nach sich (Art. 5 Abs. 1 lit. c, Art. 17 Abs. 3
lit. b/e DSGVO).

### 3.9 Jahres-Kontoabstimmung

Je Konto und Jahr abgeleitet, druckbar mit Erzeugungszeitpunkt und Programmversion:

```text
Konto „<Name>“ (Mischkonto), <Jahr>
Abdeckung: 01.01.–31.12. lückenlos (Auszüge Nr. a–b, Saldenkette geschlossen)
Anfangssaldo 01.01.                           S0
+ Mieteingänge (einzeln, n Umsätze)           E
− Erstattungen an Mieter (einzeln)            R
± Vermietungsumsätze sonst (einzeln)          V
+ übrige Eingänge (privat, Summe)             P+
− übrige Ausgaben (privat, Summe)             P−
= Endsaldo 31.12. laut Bank                   S1   ✓ stimmt
Ungeklärte Eingänge: 0 · Finanzamt-Umsätze vorgelegt: ja
Kontoauszüge liegen vollständig vor: bestätigt am …, Ablageort: …
```

„Lückenlos eingelesen“ heißt in Inkrement 1, dass alle fünf Prüfungen erfüllt sind:

1. Abdeckung lückenlos. Eine Lücke zwischen zwei abgedeckten Tagen gilt als **ohne Umsatz**, wenn
   der Endsaldo davor gleich dem Anfangssaldo danach ist **und** entweder beide Tage aus camt.053
   oder MT940 stammen und ihre Auszugsnummern (`ElctrncSeqNb`, `:28C:` ohne „0“) im selben Jahr
   unmittelbar aufeinander folgen, oder ein einzelner Auszug die Lücke ausdrücklich über `FrToDt`
   abdeckt. Am Jahreswechsel („letzte Nummer → 1“) nur, wenn die letzte Nummer des alten Jahres
   vorliegt. Ohne verlässliche Nummer (camt.052, `:28C:0`) beweist ein gleicher Saldo nur, dass
   sich die Lücke zu null saldiert, ein Paar +x/−x schließt er nicht aus: Die Lücke ist dann
   „vermutlich ohne Umsatz“ und wird einmal zur Bestätigung vorgelegt. Ein abweichender Saldo ist
   immer eine Lücke. Banken erzeugen Tagesauszüge in der Regel nur für Tage mit Umsatz; die
   DK-Spezifikation (DFÜ-Abkommen Anlage 3, V3.8) regelt das nicht (8.9).
2. Saldenkette geschlossen.
3. Kein Eingang in `unclear`, kein Finanzamt-Umsatz unentschieden.
4. Der Vermieter bestätigt: „Die Kontoauszüge 01.01.–31.12. liegen mir vollständig vor“, mit
   Ablageort. Ohne diese Bestätigung bleibt die Abstimmung „vorläufig“ **(Prüfung GoBD)**.
5. Je Import ist `file_sha256` ausgewiesen; damit lässt sich die Identität einer aufbewahrten Datei
   beweisen **(Prüfung GoBD)**.

Die Abstimmung behauptet **nie „Einnahmen vollständig“**, nur „Konto lückenlos eingelesen“
**(Upstream)**: Mietfuchs sieht weder Barzahlungen noch ein zweites Konto, und eine Pflicht, die
Vollständigkeit nachzuweisen, hat der private Vermieter nicht. Belastbar wird
die Vollständigkeit der Einnahmen erst, wenn alle Zahlungswege je Mietverhältnis erklärt sind
(Inkrement 2) **(Prüfung StB)**. Daneben zeigt das Mietkonto Soll und Ist je Mietverhältnis; ein
fehlender Monat ist ein offener Posten. Privatkonten zeigen nur „durchsucht bis …“.

### 3.10 Hinweise in der Oberfläche (knapp, Details im Lexikon)

- Beim Import: „Bewahren Sie Ihre Kontoauszüge (PDF) selbst auf. Mietfuchs speichert private
  Umsätze nicht, und viele Banken zeigen alte Auszüge online nur begrenzt an.“ **(Prüfung StB)**
- Beim Kautionseingang: Kaution getrennt vom eigenen Vermögen anlegen (§ 551 Abs. 3 BGB), Zinsen
  gehören dem Mieter, die Kaution ist keine Einnahme. **(Prüfung StB)**
- Bei der Abstimmung: „Gehen Mieten auch auf andere Konten oder bar ein? Dann ist die Abstimmung
  dieses Kontos allein kein Nachweis vollständiger Einnahmen.“ **(Prüfung StB)**
- Beim Mischkonto mit Umsatzsteueroption am Objekt: Option wird nicht unterstützt, eigenes Konto
  empfohlen, Steuerberater fragen. **(Prüfung StB, Prüfung GoBD)**
- Beim Umstufen eines zugeordneten Umsatzes: die Sperre aus 3.7.

### 3.11 Backup, Tests, Praxislauf

Die Tabellen kommen mit `VACUUM INTO` ins Backup, beim Mischkonto also nur Vermietungsumsätze und
Summen (Upstream-Auflage). Restore prüft wie bisher; der eingefrorene Eingang (`legacy/`) kennt die
Tabellen nicht, ein Archiv ohne sie ergibt leere Tabellen. Tests auf drei Ebenen (Leser und
Planer, API, Oberfläche) **nur mit erfundenen Auszügen**, IBAN-Prüfziffer `00`. Neuer Praxislauf-Fall:
Mischkonto einlesen, Backup, Wiederherstellen auf frischem Datenordner, dieselbe Datei erneut
einlesen → „0 neu“; dieselben Tage aus einer anderen Datei → „schon eingelesen“.

### 3.12 Kein Digest über die Fingerabdrücke eines Tages

Entschieden: **kein dauerhaft gespeicherter Digest**, nur flüchtig innerhalb eines Imports. Sind
Anzahl, Haben- und Sollsumme eines Tages gleich, ist der gespeicherte Rest identisch; ein Digest
verhinderte keine falsche Zahl. An Tagen mit einem einzigen Umsatz wäre er der Hash dieses Umsatzes
und ließe eine Vermutung über Empfänger und Zweck bestätigen; ein HMAC hilft nur, wenn der
Schlüssel nicht im Backup liegt, und dann ist er nach einer Wiederherstellung wertlos. Einen
Vermietungseingang, der in zwei Dateien als privat eingeordnet wurde, fängt der Soll/Ist-Abgleich
des Mietkontos.

### 3.13 Buchhaltungsfähig bleiben: SKR, doppelte Buchführung, virtuelle Hauskonten

**Vorgabe des Projektinhabers (15.10.2026):** Was Inkrement 1 speichert, muss später ohne
Nacherfassung ein doppisches Journal nach SKR 03 oder SKR 04 ergeben (#13, #14, nach Phase 8).
Upstream-Tabellen tragen dafür **keine Kontonummern**; kontiert wird im Fork über versionierte
Buchungsregeln (Inv. 16, 42). Inkrement 1 muss nur sicherstellen, dass jede Buchung daraus
eindeutig ableitbar ist.

**Ein Hauskonto ist eine Sicht, kein Sachkonto** (Inv. 43): Ein Bankkonto ist ein Sachkonto der
Gruppe „Bank“, das Objekt eine Dimension an jeder Buchungszeile. Das virtuelle Hauskonto ist das
Bankkonto, gefiltert auf die Dimension eines Objekts. Das gilt genauso für Misch- und Privatkonten:
Deren Vermietungsumsätze bilden das virtuelle Hauskonto, das Private läuft über das Privatkonto
des Kapitals.

Was die gespeicherten Daten dafür hergeben müssen, und wo es steht:

1. **Jeder gespeicherte Umsatz hat eine Objekt-Dimension.** Mit Verknüpfung zu einem
   Mietverhältnis ergibt sie sich daraus (Mietverhältnis → Wohnung → Objekt), keine zweite
   Spalte. Ohne Mietverhältnis (`marked`, `tax_office`, `fee`, `deposit_transfer`) trägt der Umsatz
   ein Objekt (`bank_transactions.property_id`, vorbelegt aus `bank_accounts.default_property_id`,
   änderbar) oder ausdrücklich „objektübergreifend“, das später nach Schlüssel verteilt wird. Wie
   „objektübergreifend“ von „noch nicht zugeordnet“ unterschieden wird, entscheidet Schritt 3.
   Aufteilen auf mehrere Objekte geht über mehrere Teil-Links mit Summe = Betrag (Inv. 57).
2. **Das Private eines Mischkontos getrennt nach Haben und Soll je Tag** (`bank_days`, schon so):
   Daraus entsteht je Tag oder Monat eine Buchung Privateinlage bzw. Privatentnahme gegen Bank,
   und die Bank stimmt mit dem Kontoauszug. Saldiert ließe sich das nicht mehr trennen.
3. **Mieteingang auf einem Privatkonto:** Das Privatkonto steht nicht im Hauptbuch; die Einnahme
   wird gegen Privatentnahme gebucht (das Geld ging in die Privatsphäre). Dafür genügt der
   gespeicherte Umsatz mit Link; die Kontoart sagt, welche Gegenbuchung gilt.
4. **Umbuchung zwischen eigenen Konten** über Geldtransit (`own_transfer`, Inkrement 2), auch
   zwischen Miet- und Mischkonto.
5. **Kautionskonto:** Treuhandvermögen, nicht im Vermögen des Vermieters; die Kaution ist eine
   Verbindlichkeit gegenüber dem Mieter, die Umbuchung dorthin (`deposit_transfer`) bucht gegen
   diese Verbindlichkeit bzw. ein Verrechnungskonto, nie als Aufwand oder Ertrag.
6. **Art der Zahlung** (Miete oder Abrechnung, speedone/mietfuchs#280) unterscheidet später
   Mieterlöse und Umlagen.
7. **Eine unveränderliche Quelle je Buchung:** Der bestätigte Link ist der Posting-Schlüssel;
   aufgehoben wird per Gegenlink, nie durch Ändern (Inv. 55, 56, 59, 60).

Beispiele für Konten nur zur Orientierung, vor Verwendung gegen den aktuellen Kontenrahmen zu
prüfen: Bank SKR 03 1200 / SKR 04 1800, Privatentnahme 1800 / 2100, Privateinlage 1890 / 2180,
Geldtransit 1360 / 1460.

---

## 4. Inkrement 2 — die Lücken des ersten schließen

1. **Reduktion zugeordneter Umsätze** **(Prüfung GoBD)**. Ein Umsatz mit Link-Geschichte oder aus
   einem eingefrorenen Stand wird bei Umstufung zu privat nicht gelöscht, sondern reduziert: Datum,
   Betrag, Stelle im Tag, Auszugsnummer, Klasse `private_reduced`, Grund und Zeitpunkt bleiben;
   Gegenseite, IBAN und Zweck werden geleert. Die Sperre aus 3.7 entfällt dann.
2. **Berichtigte Fassung des Ursprungsjahres** **(Prüfung StB)**. Ein nachträglich erkannter
   Umsatz gehört ins Zufluss- bzw. Abflussjahr (§ 11 EStG), nicht ins Folgejahr. Ist das Jahr
   bereits abgestimmt oder erklärt, entsteht eine Version 2 der Abstimmung mit Verweis und
   Differenz. Zu wenig erklärt → deutlicher Hinweis auf die Berichtigungspflicht nach § 153 Abs. 1
   AO; zu viel erklärt → Hinweis auf Einspruchsfrist (§ 355 AO), Vorbehalt (§ 164 AO) und
   § 173 Abs. 1 Nr. 2 AO, keine Aufgabe. **Widerspruch:** Fassung 1 und die GoBD-Prüfung hielten
   einen Nachtrag im Folgepaket für ausreichend; maßgeblich ist die strengere Lösung des
   Steuerberaters.
3. **Nacherfassung aus dem PDF-Auszug** gegen den Tagesrest **(Prüfung StB)**, für Fälle, in denen
   die Datei nicht mehr vorliegt: Umsatz in einem bekannten Tag von Hand erfassen; Betrag höchstens
   der private Haben- bzw. Sollrest, Anzahl höchstens die Restanzahl. Tag und Saldenkette bleiben
   stimmig. Ziel kann auch eine Kaution (`depositReceipt`) sein.
4. **Zahlungswege je Mietverhältnis** **(Prüfung StB)**: „Zahlungen gehen ein auf: Konto X, Y,
   bar“ und eine Jahresbestätigung „keine weiteren Konten, Barzahlungen erfasst“. Erst danach darf
   eine Sicht „Einnahmen vollständig“ zeigen.
5. **Grund je offenem Soll-Monat** **(Prüfung StB)**: Rückstand, Minderung, Leerstand mit
   Vermietungsabsicht, Verzicht; Verzicht unter Angehörigen mit Hinweis auf § 21 Abs. 2 EStG.
6. **Klasse „Übertrag eigenes Konto“** (`own_transfer`) **(Prüfung StB)**, wenn beide Konten
   bekannt sind; verhindert, dass weitergeleitete Miete als unklarer Eingang erscheint oder doppelt
   zählt.
7. **Gemischte Kosten** **(Prüfung StB)**: Postenentgelte einzeln, Grundgebühr als Vorschlag im
   Verhältnis Vermietungsumsätze zu allen Umsätzen (beide Zahlen liegen vor), Bestätigung durch den
   Vermieter; Kreditkarten-Sammelabbuchung mit Teil-Link, am Jahreswechsel Kaufdatum aus der
   Rechnung; Dispozinsen nur nennen, nicht aufteilen.
8. *Ergänzung dieser Fassung, nicht in der Vorgabe des Inhabers:* Gegenkontenregeln „immer privat“
   und „immer Vermietung“ (Gläubiger wie Gemeindekasse oder Versicherer), nur auf ausdrückliche
   Wahl, löschbar **(Prüfung StB)**.

## 5. Später — fork-eigen, an die Phasen gebunden

- **Tax Layer (Phase 5):** TaxEvents abgeleitet, Zehn-Tage-Regel mit gesetzlicher Fälligkeit als
  bestätigter Vorgabe (§ 556b Abs. 1 BGB; Ausnahme Stellplatz § 579 BGB; nie für Nachzahlungen)
  **(Prüfung StB)**; Erstattung an Mieter als negative Einnahme im Abflussjahr, auch bei
  Verrechnung ohne Kontobewegung; Darlehenszinsen nur aus Tilgungsplan oder Zinsbescheinigung.
- **Anlage-V-Paket (Phase 7):** Status je Wert (`confirmed`, `proposed`, `missing`,
  `not_relevant`, `zero`); `zero` nur bei erklärten Zahlungswegen und Einzelbestätigung mit Grund
  **(Prüfung StB)**; eingefrorene Pakete, berichtigte Fassungen nach 4.2; Hash-Kette über
  Protokoll und Paket mit gedrucktem Kopfwert **(Prüfung GoBD, gute Praxis)**.
- **Verfahrensdokumentation** je Steuerjahr, von Mietfuchs erzeugt und mit eingefroren
  (Allgemein, Anwender, Technik, Betrieb/IKS, Ereignisübersicht) **(Prüfung GoBD)**.
- **Export:** CSV (UTF-8, Semikolon) mit `index.xml` nach dem Beschreibungsstandard der
  Datenträgerüberlassung **(Prüfung GoBD)**; optional unveränderte Kopie der Bankdatei in einen
  vom Nutzer gewählten Ordner, Hash in `bank_imports`, nicht im Backup.
- **Aufbewahrung und Löschkonzept:** Voreinstellung **8 Jahre** nach Jahresende, **10 Jahre**
  wählbar **(Prüfung GoBD; Fassung 1: 10 Jahre)**; Löschung nur je Konto × Jahr, nie automatisch,
  gesperrt bei Ablaufhemmung (§ 171 AO); ein inhaltsfreies Löschprotokoll bleibt dauerhaft
  **(Prüfung GoBD)**; Erwerbs-, AfA- und Darlehensgrundlagen länger.
- Konto-Inhaber und Gemeinschaftskonto (Drittaufwand) mit den Eigentümeranteilen der Phase 6
  **(Prüfung StB)**; Journal mit Privatentnahme/-einlage aus den Tagessummen (nach Phase 8).

---

## 6. Bekannte Lücken

| Lücke | Folge | Geschlossen in |
|---|---|---|
| Umsatz mit Zuordnung (auch aufgehobener) kann nicht zu privat umgestuft werden | privater Inhalt bleibt im Bestand und im Backup, bis Reduktion möglich ist | Inkrement 2 (4.1) |
| Nachträgliche Übernahme nur mit der Datei | ohne Datei kein Weg, einen übersehenen Vermietungsumsatz nachzutragen | Inkrement 2 (4.3) |
| Keine berichtigte Fassung eines Vorjahres | eine Abstimmung zeigt den heutigen Stand, nicht den erklärten | Inkrement 2 (4.2) |
| Andere Zahlungswege und Gründe offener Monate fehlen | „Einnahmen vollständig“ wird nie behauptet | Inkrement 2 (4.4, 4.5) |
| Kein Übertrag eigenes Konto | weitergeleitete Miete erscheint als unklarer Eingang | Inkrement 2 (4.6) |
| Keine Monatszuordnung beim Import | `rentLedger` verteilt Jan → Dez ohne Übertrag ins nächste Jahr | speedone/mietfuchs#281 |
| Kautionskonto wird nicht eingelesen | Kautionsstand samt Zinsen wird von Hand geführt | später (8.13) |
| Umsatzsteueroption nicht unterstützt (Spec §82.13) | nur Hinweis, kein Paket | offen |
| Finanzamt-Erkennung über Stichwörter | ein Finanzamt-Umsatz unter anderem Namen fällt als Ausgang ins Private | offen (8.10) |

## 7. Datenschutz in Kürze

Voreinstellungen (Art. 25 Abs. 2): unbekanntes Konto als Mischkonto, Auszugsdatei nicht ablegen,
Zahler nicht ohne Wahl merken, Bankdaten nie an eine KI, Protokoll ohne Inhalte, Hinweis beim
Backup „unverschlüsselt“. Private Umsätze: keine Speicherung, kein Hash. Tagessummen enthalten keine
Inhalte Dritter, wohl aber Konsummuster des Vermieters; sie fallen mit dem Jahr. Mieter- und
Zahlerdaten: Art. 6 Abs. 1 lit. b, c bzw. f. Zugang vorerst über Reverse Proxy (Roadmap); Mietfuchs
ist im Heimnetz ohne Anmeldung erreichbar.

## 8. Offene Punkte, vor Veröffentlichung zu prüfen

Aus den Prüfungen ([?] bzw. [unsicher]):

1. GoBD-Randziffern nach den Änderungen 2024/2025 gegen die konsolidierte Fassung prüfen (genannt:
   Rz. 30–39, 46 ff., 53 ff., 58–64, 100, 107–110, 119, 131 ff., 151–155, 179 ff.); Datum des
   BMF-Schreibens 2025 zur E-Rechnung.
2. Reichweite § 146 Abs. 6 AO für private Vermieter.
3. § 22 Abs. 2 Nr. 1 und § 14b Abs. 1 UStG bei rein steuerfreier Wohnraumvermietung.
4. Fundstelle der BayLfSt-Verfügung vom 20.07.2017 zu elektronischen Kontoauszügen.
5. Entsprechende Geltung von § 147 Abs. 2, 5, 6 AO und die Frist im Rahmen des § 147a AO.
6. Anspruch auf geschwärzte Privatkontoauszüge gegenüber dem Finanzamt (kein gesicherter Anspruch).
7. Reihenfolge nach § 366 Abs. 2 BGB innerhalb eines Monats (Vorauszahlung vor Kaltmiete); keine
   eindeutige BGH-Entscheidung. Wird mit speedone/mietfuchs#281 entschieden.
8. Weitere [unsicher] des Steuerberaters ohne Wirkung auf Inkrement 1: Pauschalen für
   Kontoführung, Maßstab für Dispozinsen bei Überschusseinkünften, Übergangsregeln für das
   Ausstellen von E-Rechnungen ab 2028.

Aus dieser Fassung:

9. ~~Regel für Lücken zwischen Tagesauszügen~~ Recherchiert am 14.10.2026 und in 3.9 Nr. 1
   festgelegt. Offen bleibt die Praxis einzelner Bankengruppen beim Leerauszug (keine öffentliche
   Quelle); Pagination (`PgNb`, Zwischensalden `INTM`) wird vor der Prüfung zu einem Auszug
   zusammengefasst.
10. Erkennung von Finanzamt-Umsätzen: Stichwortliste gegen Fehlalarme und Lücken abwägen.
11. ~~Lesart „ohne Zuordnung = nie ein bestätigter Link“ (3.7) bestätigen lassen.~~ Bestätigt am
    14.10.2026.
12. Mit Upstream abstimmen: `RESTRICT` auf `bank_transaction_links.bank_transaction_id` (vereinbart
    war `CASCADE` auf die Zahlung, das bleibt) und das Protokoll `bank_events` als Teil von PR 2.
13. **Kautionskonto später einlesbar** (Vorschlag des Projektinhabers, in #188 angesprochen). Trägt
    für zwei Zwecke: den Stand der Kaution samt Zinsen führen, die bei Rückgabe mit auszuzahlen
    sind (§ 551 Abs. 3 BGB), und beim Sammelkonto mehrerer Mieter die Zinsen je Mieter aufteilen,
    weil der Vermieter sie für deren Steuer mitteilen bzw. feststellen lassen muss (§ 180 AO;
    Zinsen sind Kapitalerträge des Mieters, § 20 Abs. 1 Nr. 7 EStG, § 39 Abs. 2 Nr. 1 AO). Nicht
    tragend: Nachweis der getrennten Anlage (Bankbestätigung genügt), Steuerbescheinigung (steht
    nicht im Auszug). Bedingungen: nie als Zahlung oder Einnahme, je Mietverhältnis, optional,
    möglichst nur Saldo und Zinsgutschriften. Zu prüfen vor Zitat: Randziffer im BMF-Schreiben zu
    Einzelfragen der Abgeltungsteuer (Mieterkautionen), Art. 229 § 3 Abs. 8 EGBGB (Altverträge vor
    1983), Freistellungsauftrag auf Treuhandkonto.

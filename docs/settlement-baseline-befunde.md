# Settlement-Baseline — Befunde

Dieses Dokument sammelt, was beim Einfrieren der Abrechnungsengine als Golden Master
gefunden wurde. Es ist die Gegenprobe zur Regel aus dem Kanon: *Eine geänderte Erwartung ist
eine fachliche Entscheidung, kein Testfix.* Jeder Befund ist entweder behoben oder mit
Begründung als Baseline eingefroren — ein drittes „ist halt so“ gibt es nicht.

**Vorgehen:** Die Erwartungswerte der zehn Fixtures unter
`server/test/fixtures/settlement/` wurden strikt **spec-first** hergeleitet — von Hand aus
der Spezifikation vorgerechnet, nicht aus dem Verhalten des Codes abgelesen. Alle zehn haben
im ersten Durchlauf getroffen: Die Kernverteilung der Engine (Fläche, Personentage,
Einheiten, Verbrauch, Direktzuordnung, Restverteilung, §35a, Vorauszahlungen) ist fachlich
korrekt. Die Befunde stammen sämtlich aus den Invariantentests, also aus Eigenschaften, die
für *jede* Eingabe gelten müssen.

Stand: Issue #25 (Golden-Master-Hälfte) und #26, Branch `test/settlement-golden-master`.

---

## B1 — Direktzuordnung auf eine nicht beteiligte Wohnung ließ Geld verschwinden

**Status: behoben** · Test `I2b` · `server/src/calc.js`

Eine Kostenposition mit Schlüssel `direct` darf auf eine Wohnung zeigen, die nicht an der
Umlage teilnimmt — etwa eine Reparatur in der selbstbewohnten Wohnung. Die Verteilung lief
über *alle* Mietverhältnisse mit Jahresüberlappung, nicht nur über die beteiligten. Für die
nicht beteiligte Wohnung existiert aber kein Abrechnungsobjekt:

```js
distributed += shares[i]
const st = statements.get(x.t.id)
if (!st) return          // ← Anteil gezählt, aber niemandem gutgeschrieben
```

Folge: `landlordCents = amountCents − distributed` ergab 0, obwohl kein Mieter den Betrag
erhalten hatte. Der Betrag tauchte in der Abrechnung **überhaupt nicht mehr auf** — weder
beim Mieter noch beim Vermieter. Bei 500,00 € Reparaturkosten fehlten 500,00 € spurlos.

Behoben, indem `distributed` erst nach der Statement-Prüfung hochgezählt wird. Der Anteil
fällt damit korrekt an den Vermieter. Der bestehende Test *„Direktzuordnung geht vollständig
an eine Wohnung"* deckte den Fall nicht ab, weil er nur auf eine **beteiligte** Wohnung
zuordnete.

---

## B2 — Der Tie-Break der Restverteilung hing an der Eingabereihenfolge

**Status: behoben** · Tests `I4`, `I7` · Spec §56, §271.26

Bei gleichem Nachkommaanteil — dem Regelfall bei gleich großen Einheiten, siehe das Beispiel
in §56 — entschied die Position im Eingabe-Array, wer das Restcent erhält. `Array.sort` ist
zwar stabil, aber die Stabilität bezog sich auf eine Reihenfolge ohne fachliche Bedeutung.
Dieselben Daten in anderer Sortierung ergaben eine andere Abrechnung:

```
Eingabereihenfolge t1, t2, t3  →  t1 = 33,34 €   t2 = 33,33 €   t3 = 33,33 €
Eingabereihenfolge t3, t2, t1  →  t3 = 33,34 €   t2 = 33,33 €   t1 = 33,33 €
```

Das ist genau das, was §271.26 verbietet („Reihenfolgen ohne fachliche Bedeutung dürfen nicht
als implizite DB-Reihenfolge vorausgesetzt werden“) — und es wäre spätestens beim Wechsel von
`db.json` auf SQLite bzw. PostgreSQL zu unterschiedlichen Ergebnissen auf verschiedenen
Backends geworden, ohne dass irgendetwas an der Fachlogik geändert worden wäre.

Behoben: `largestRemainder` nimmt jetzt einen fachlich stabilen Schlüssel je Rohanteil
entgegen (die Mietverhältnis-ID) und bricht Gleichstände darüber. Welcher Schlüssel gewinnt,
ist fachlich beliebig; entscheidend ist, dass dieselben Daten immer dasselbe Ergebnis liefern.

---

## B3 — Fehlende Verteilbasis blieb außerhalb des Verbrauchsschlüssels stumm

**Status: behoben** · Test `I6b` · Invariante 20

Ist für eine Position keine Verteilbasis vorhanden, geht der Betrag vollständig an den
Vermieter. Das ist rechnerisch richtig, war aber nur beim Schlüssel `meter` mit einer Warnung
verbunden. Bei `area`, `persons`, `units` und `direct` passierte es **stillschweigend**:

- Sind bei allen beteiligten Wohnungen keine Flächen gepflegt (`areaM2` fehlt oder ist 0),
  landet die komplette Grundsteuer beim Vermieter — ohne jeden Hinweis.
- Zeigt eine Direktzuordnung auf eine Wohnung, die im Abrechnungsjahr nicht vermietet war,
  ebenso.

Der Vermieter hätte den Datenmangel nur bemerkt, wenn ihm der ungewöhnlich hohe Eigenanteil
aufgefallen wäre. Invariante 20 verlangt das Gegenteil: kein stiller Fallback bei unklarer
Klassifikation.

Behoben durch eine einheitliche Prüfung nach der Zielermittlung: Bleibt die Zielmenge leer und
ist die Position nicht als *Nicht umlagefähig* gekennzeichnet, wird gewarnt. Die bestehende
Verbrauchswarnung bleibt im Wortlaut erhalten; für die übrigen Schlüssel gibt es eine neue
Meldung „keine Verteilbasis für Schlüssel …“.

---

## B4 — Der §35a-Lohnanteil hat keine Summengarantie

**Status: offener fachlicher Punkt, Verhalten unverändert eingefroren** · Fixture F08

Der begünstigte Lohnanteil wird je Abrechnungszeile einzeln proportional gerundet:

```js
Math.round(item.labor35aCents * (shares[i] / item.amountCents))
```

Anders als bei der Kostenverteilung gibt es hier **kein Restverfahren**. Die Summe der
ausgewiesenen Lohnanteile kann daher um wenige Cent vom Ausgangsbetrag abweichen. Im Fixture
F08 geht die Summe zufällig exakt auf (23.334 + 23.333 + 23.333 = 70.000), das ist aber nicht
zugesichert.

Fachlich zu klären, bevor der Steuer-Layer gebaut wird (M10, Invariante 21 —
`JournalEntry ≠ TaxEvent`): Soll die Summe der bescheinigten Lohnanteile über alle Mieter
exakt dem Rechnungsbetrag entsprechen? Für den einzelnen Mieter ist die Abweichung
unerheblich, für eine Gesamtaufstellung gegenüber dem Finanzamt möglicherweise nicht.
Bis zur Klärung bleibt das heutige Verhalten Baseline.

---

## B5 — Bekannte Lücke des Testnetzes: Rundungsart innerhalb der Restverteilung

**Status: dokumentierte Grenze des Netzes, kein Fehler im Code**

Zur Kontrolle wurde das Netz sabotiert (Netzprobe): In `largestRemainder` wurde `Math.floor`
durch `Math.round` ersetzt. **Alle 44 Tests blieben grün.**

Das ist kein Loch in den Fixtures, sondern eine Eigenschaft des Verfahrens: Das
Largest-Remainder-Verfahren korrigiert sich selbst. Wird abgerundet, fehlen `rest`
Cent, die an die größten Nachkommaanteile gehen; wird kaufmännisch gerundet, sind einige
davon schon vergeben und `rest` fällt entsprechend kleiner (oder negativ) aus. Für alle
zehn Fixtures führt beides zum identischen Ergebnis.

Auseinander laufen die beiden Varianten erst, wenn **mehr Anteile ein Restcent brauchen, als
es Nachkommaanteile ≥ 0,5 gibt** — also etwa bei vier Zielen mit den Nachkommaanteilen
0,8 / 0,4 / 0,4 / 0,4. Dann erhält beim Aufrunden derselbe Anteil zweimal ein Cent, während
beim Abrunden zwei verschiedene je eines bekommen.

Bewertung: kein realistisches Regressionsmuster (niemand tauscht diese Rundung versehentlich
aus), aber eine ehrlich zu benennende Grenze. Ein Fixture, das den Fall abdeckt, bräuchte
konstruierte Flächen wie 250,08 m² — die fachliche Herleitung in der Fixture-`README.md`
wäre dann eine Fiktion und damit gegen die eigene Regel. Der Fall bleibt deshalb hier
dokumentiert, statt als Schein-Szenario eingebaut zu werden.

Gegenprobe mit realistischen Regressionen — das Netz greift:

| Sabotage | rote Tests von 44 |
|---|---|
| Tageszählung ohne inklusive Endgrenze (`+ 1` entfernt) | 20 |
| Eigennutzung fälschlich in der Bezugsfläche | 7 |
| Restverteilung entfernt (Restcent bleibt liegen) | 9 |

---

## B6 — Vorschlag der neuen Vorauszahlung unterschätzt bei Teiljahren

**Status: eingefrorene Baseline, fachlich zu prüfen** · Fixture F09

Der Vorschlag nach § 560 Abs. 4 BGB rechnet ein Zwölftel des **abgerechneten** Betrags:

```js
st.suggestedMonthlyCents = Math.round(st.totalShareCents / 12 / 100) * 100
```

Bei einem Mietverhältnis, das erst im April begonnen hat, ist `totalShareCents` aber nur der
Anteil für neun Monate. Der Vorschlag fällt entsprechend zu niedrig aus: In F09 werden
25,00 € vorgeschlagen, während ein volles Jahr rund 33,00 € gekostet hätte. Der Mieter würde
im Folgejahr planmäßig in eine Nachzahlung laufen.

Fachlich sauber wäre, den Teiljahresbetrag vor der Division auf ein volles Jahr hochzurechnen.
Das ist jedoch eine Verhaltensänderung mit Wirkung auf jede Abrechnung eines
Einzugs- oder Auszugsjahres und gehört deshalb nicht in einen PR, der nur das Netz spannt.
Aufgenommen als eigener fachlicher Punkt; bis dahin ist das heutige Verhalten Baseline und
in F09 eingefroren.

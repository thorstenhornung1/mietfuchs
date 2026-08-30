# F08 — §35a-Lohnanteil folgt dem Kostenanteil

**Geprüfte Regel:** Der nach § 35a EStG begünstigte Lohnanteil einer Position wird **im
selben Verhältnis** aufgeteilt wie die Position selbst — nicht nach einem eigenen Schlüssel
und nicht gleichmäßig. Wer einen Cent mehr an Kosten trägt, bescheinigt auch einen etwas
höheren Lohnanteil.

**Spec:** §55 (§35a gehört zu den cent-genau verglichenen Größen), §56 (Restverteilung).

## Ausgangslage

Drei gleich große Wohnungen (je 50 m²), alle ganzjährig vermietet.
Eine Kostenposition: Hausmeisterservice **1.000,00 €**, Schlüssel `units`, davon
**700,00 € Lohnanteil** (`labor35aCents`).

## Handrechnung

**Kostenverteilung** — wie in F04 ein unteilbarer Betrag:

```
Rohanteil je Einheit = 100.000 ct / 3 = 33.333,33… ct
Abrundung = 3 × 33.333 = 99.999 ct, Rest 1 ct → an t1 (fachlich erster bei Gleichstand)

t1 = 33.334 ct        t2 = 33.333 ct        t3 = 33.333 ct
```

**Lohnanteil**, proportional zum jeweiligen Kostenanteil:

```
t1 = 70.000 × 33.334/100.000 = 23.333,8  → 23.334 ct
t2 = 70.000 × 33.333/100.000 = 23.333,1  → 23.333 ct
t3 = 70.000 × 33.333/100.000 = 23.333,1  → 23.333 ct
                                   Summe = 70.000 ct   ✓
```

Die Summe der gerundeten Lohnanteile trifft hier den Ausgangsbetrag exakt. Das ist bei
proportionaler Rundung **nicht garantiert** — die Rundung erfolgt je Zeile einzeln, nicht
über ein Restverfahren. Dieses Fixture friert den gutmütigen Fall ein; ein Fixture mit
Rundungsabweichung im Lohnanteil wäre eine sinnvolle Ergänzung, sobald geklärt ist, ob die
Summenkonstanz des §35a-Ausweises fachlich zugesichert werden soll (offener Punkt, siehe
`docs/settlement-baseline-befunde.md`).

Gegenprobe zur falschen Rechnung: Eine Gleichverteilung des Lohnanteils ergäbe 23.333,33 →
23.333 je Mieter und damit in Summe 69.999 ct — ein Cent des begünstigten Betrags ginge
verloren.

**Salden** bei 30,00 € Vorauszahlung monatlich (= 360,00 € im Jahr):

```
t1 = 36.000 − 33.334 = +2.666 ct
t2 = 36.000 − 33.333 = +2.667 ct
t3 = 36.000 − 33.333 = +2.667 ct
```

Vorschlag neue Vorauszahlung: 33.334 / 12 = 27,78 € bzw. 33.333 / 12 = 27,78 € — beide auf
volle Euro 28,00 €.

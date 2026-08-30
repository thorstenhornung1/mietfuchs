# F01 — Flächenschlüssel mit Eigennutzung

**Geprüfte Regel:** Eine nicht beteiligte Einheit (`participates: false`) fällt vollständig aus
der Bezugsgröße heraus — sie verkleinert nicht nur den eigenen Anteil, sondern verschwindet
auch aus dem Nenner. Der Vermieter trägt in diesem Fall nichts, weil die verbleibenden
Mieter den Gesamtbetrag ausschöpfen.

**Spec:** §35 (Betriebskostenengine, Umlageschlüssel `area`), §55 (cent-genauer Vergleich).

## Ausgangslage

| Einheit | Fläche | beteiligt | Mietverhältnis | Personen | Vorauszahlung |
|---|---|---|---|---|---|
| u1 EG | 80 m² | **nein** (selbstbewohnt) | — | — | — |
| u2 OG links | 90 m² | ja | t2, ganzjährig | 4 | 150,00 €/Monat |
| u3 OG rechts | 60 m² | ja | t3, ganzjährig | 3 | 100,00 €/Monat |

Eine Kostenposition: Grundsteuer 2025, **900,00 €**, Schlüssel `area`.

## Handrechnung

Bezugsfläche = nur beteiligte Einheiten:

```
basisArea = 90 + 60 = 150 m²        (u1 mit 80 m² zählt NICHT mit)
```

Rohanteile (Tagesfaktor 365/365 = 1):

```
t2 = 90.000 ct × 90/150 = 54.000 ct = 540,00 €
t3 = 90.000 ct × 60/150 = 36.000 ct = 360,00 €
Summe = 90.000 ct → schöpft den Betrag exakt aus
```

Weil die Rohanteile den Betrag voll ausschöpfen, greift die cent-genaue Verteilung
(Hare/largest remainder). Beide Rohanteile sind bereits ganzzahlig, es bleibt kein Rest:

```
t2 = 54.000 ct        t3 = 36.000 ct        Vermieter = 0 ct
```

Wäre u1 mitgezählt worden (Nenner 230 m²), ergäbe sich 35.217 / 23.478 ct und ein
Vermieteranteil von 31.305 ct — das ist genau der Fehler, den dieses Fixture ausschließt.

Vorauszahlungen (12 Monate, Staffel gilt ab 2020-01):

```
t2 = 12 × 15.000 = 180.000 ct        t3 = 12 × 10.000 = 120.000 ct
```

Salden (`Vorauszahlung − Anteil`, positiv = Guthaben):

```
t2 = 180.000 − 54.000 = +126.000 ct = 1.260,00 € Guthaben
t3 = 120.000 − 36.000 =  +84.000 ct =   840,00 € Guthaben
```

Vorschlag neue Vorauszahlung (§560 Abs. 4 BGB, ein Zwölftel auf volle Euro):

```
t2 = 54.000 / 12 = 4.500 ct → 45,00 €
t3 = 36.000 / 12 = 3.000 ct → 30,00 €
```

Personentage: 4 × 365 = 1.460 bzw. 3 × 365 = 1.095 — hier ohne Wirkung auf die Verteilung,
aber Teil des eingefrorenen Ergebnisses.

# Referenz: gesetzliche Feiertage je Bundesland

`python-holidays.json` enthält die gesetzlichen Feiertage aller 16 Länder und ihrer regionalen
Varianten von 1995 bis 2100, erzeugt mit der Python-Bibliothek
[holidays](https://github.com/vacanza/holidays). Sie ist unabhängig von der npm-Bibliothek
[date-holidays](https://github.com/commenthol/date-holidays), die Mietfuchs zur Laufzeit nutzt.
`server/test/holidays.test.js` vergleicht beide für jedes Jahr und jede Variante.

Python wird nur zum Erzeugen dieser Datei gebraucht, weder für die Tests noch zur Laufzeit.

## Varianten

| Variante | `holidays` | date-holidays | Ort in den Stammdaten |
|---|---|---|---|
| `BB` … `TH` | Land, Kategorie *public* | Land (Bayern: Region `EVANG`) | Land, Fragen verneint |
| `BY:catholic` | `BY` mit *catholic* | `BY`, Region `KATH` | Mariä Himmelfahrt ja, nicht Augsburg |
| `Augsburg` | `Augsburg` | `BY`, Region `A` | Augsburg ja |
| `SN:catholic` | `SN` mit *catholic* | `SN`, Region `BZ` | Fronleichnam ja |
| `TH:catholic` | `TH` mit *catholic* | `TH`, Region `EIC` (`UH`, `WAK` gleich) | Fronleichnam ja |

Die Kategorie *catholic* ergänzt in Bayern Mariä Himmelfahrt, in Sachsen und Thüringen
Fronleichnam. Das sind die Feiertage, die nach Landesrecht nur in einem Teil der Gemeinden
gelten.

Der Zeitraum beginnt 1995: Seit diesem Jahr ist der Buß- und Bettag nur noch in Sachsen
gesetzlicher Feiertag.

## Format

Je Variante eine Liste von Schlüsseln:

- `MM-TT` — fester Tag, etwa `10-03` für den Tag der Deutschen Einheit
- `O±n` — `n` Tage nach dem Ostersonntag, etwa `O-2` Karfreitag, `O+60` Fronleichnam. Die
  Osterdaten stehen unter `ostern` (nach `dateutil.easter`).
- `@…` — gilt nur in diesen Jahren, etwa `03-08@2019-2100` (Frauentag in Berlin seit 2019)
  oder `10-31@2017` (Reformationstag 2017 einmalig bundesweit)

Ein Schlüssel ohne `@` gilt in jedem Jahr. Die Schreibweise ist verlustfrei: `generate.py`
prüft beim Erzeugen, dass sich aus den Schlüsseln wieder genau die Tage der Bibliothek ergeben.

## Neu erzeugen

Außerhalb des Repositorys, etwa in einem temporären Ordner:

```
python3 -m venv venv
venv/bin/pip install holidays==0.104 python-dateutil==2.9.0.post0
venv/bin/python server/test/fixtures/holidays/generate.py
```

Eine neue Version von `holidays` oder von date-holidays kann Abweichungen zeigen. Dann wird
nicht geraten: Maßgeblich ist das Feiertagsgesetz des Landes. Die Entscheidung steht mit
Fundstelle in `holidays.test.js`.

## Ergebnis des Vergleichs

Stand holidays 0.104 und date-holidays 3.36.1: Beide stimmen für alle Varianten und alle
Jahre von 1995 bis 2100 überein, einschließlich der einmaligen Feiertage. Stichproben gegen die
Feiertagsgesetze der Länder:

| Fall | Rechtsgrundlage |
|---|---|
| Mariä Himmelfahrt in überwiegend katholischen Gemeinden, Friedensfest nur in der Stadt Augsburg | Bayern, Art. 1 Abs. 1 Nr. 2 und Abs. 2 FTG |
| Mariä Himmelfahrt landesweit | Saarland, § 2 SFG |
| Fronleichnam in einzelnen Gemeinden und Ortsteilen im Landkreis Bautzen | Sachsen, § 1 SächsSFG, Fronleichnamsverordnung vom 4.5.1993 |
| Fronleichnam, wo er 1994 Feiertag war (Eichsfeld, Teile von Unstrut-Hainich- und Wartburgkreis); Weltkindertag seit 2019 | Thüringen, § 2 und § 10 Abs. 1 ThürFGtG |
| Frauentag seit 2019; einmalig 8.5.2020, 8.5.2025 und 17.6.2028 | Berlin, § 1 FeiertG (Gesetze vom 30.01.2019 und 10.07.2024) |
| Frauentag seit 2023 | Mecklenburg-Vorpommern, § 2 FTG M-V |
| Reformationstag seit 2018 | Bremen, Hamburg, Niedersachsen, Schleswig-Holstein |
| Reformationstag 2017 einmalig in allen Ländern | jeweils eigene Regelung, etwa Art. 1 Abs. 2a FTG Bayern a. F. |
| Buß- und Bettag | Sachsen, § 1 SächsSFG |

Eine gemeinsame Abweichung beider Bibliotheken vom Gesetz ist ohne Folgen: In Hessen sind alle
Sonntage gesetzliche Feiertage (§ 1 HFeiertagsG), also auch Oster- und Pfingstsonntag. Beide
Bibliotheken führen diese nur für Brandenburg (§ 2 FTG). Für Fristen nach Werktagen spielt das
keine Rolle, ein Sonntag ist nie Werktag.

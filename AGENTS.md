# AGENTS.md

Ein Kanon, zwei Einstiegspunkte: Die verbindlichen Regeln für dieses Repository stehen
vollständig in **[CLAUDE.md](CLAUDE.md)**. Diese Datei dupliziert sie nicht — sie zeigt
nur, wo nachzuschlagen ist, damit ein Agent, der nach `AGENTS.md` greift, denselben
Rahmen bekommt.

## Vor der ersten Änderung lesen

| Thema | Fundstelle |
|---|---|
| Aufbau, Commands, Architektur, Fallstricke | [CLAUDE.md](CLAUDE.md), Abschnitte *Was das ist* bis *Konventionen & Fallstricke* |
| **Invarianten 1–140** | [CLAUDE.md → Verbindlicher Kanon](CLAUDE.md#verbindlicher-kanon--mietfuchs-next) |
| Prioritätssystem F0/P0/C0/P1/P2/Step 20+ | ebenda, *Prioritätssystem* |
| PR-Checkliste vor jedem Merge | ebenda, *PR-Checkliste* |
| Lizenz- und Dependency-Prinzipien | ebenda, *Lizenz- und Dependency-Prinzipien* |
| Scope-Grenze für neue Features | ebenda, *Scope — Schlussentscheidung* |
| Reihenfolge der Umsetzung | ebenda, *Implementierungsreihenfolge* |

Fachliche Grundlage sind die vier Spezifikationen in [docs/](docs/).

## Die fünf Regeln, die am häufigsten gebrochen werden

1. **Geld ist Integer-Cent** (Invariante 17). Kein `float`, kein Euro-String in der Rechnung.
2. **Kein stiller Fallback auf „Sonstige“** (Invariante 20). Unbekannte Klassifikation erzeugt
   eine Warnung, keine Notverteilung.
3. **Fachliches Datum ≠ Zeitstempel** (Invariante 102). Mietbeginn ist ein Kalendertag, keine
   Uhrzeit in einer Zeitzone.
4. **Gebucht/versandt ist unveränderlich** (Invarianten 12, 13, 79, 94). Korrekturen entstehen
   als neuer Vorgang mit Bezug auf den alten, nie durch Überschreiben.
5. **Settlement-Fixtures ändert man nicht, um Tests grün zu bekommen.** Eine geänderte Erwartung
   ist eine fachliche Entscheidung mit Begründung in der Fixture-`README.md` und in
   `docs/settlement-baseline-befunde.md`.

## Arbeitsweise

Test-driven: Erst der Test, der die Regel aus der Spezifikation ausdrückt — dann der Code, der
ihn erfüllt. Erwartungswerte werden aus der Spezifikation hergeleitet und in der Fixture-
`README.md` vorgerechnet, nicht aus dem Ist-Verhalten des Codes abgelesen.

Sprache von UI, Kommentaren, Tests und Domänenbegriffen ist durchgängig **Deutsch**;
Entity-Namen und Invariantentexte bleiben in der Form, in der die Spezifikation sie führt.

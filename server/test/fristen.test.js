// Fristen des Mietrechts (server/src/fristen.js). Die Feiertage geben diese Tests von Hand vor,
// damit die Fristregeln unabhängig vom Feiertagskalender geprüft sind; welche Tage wo Feiertag
// sind, prüft holidays.test.js. Die erwarteten Tage sind am Kalender abgezählt, die Wochentage
// mit Pythons datetime gegengeprüft. Osterdaten aus dem Kirchenkalender.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deadlineOnWorkday, rentPayableBy } from '../src/fristen.js'

const feiertage = (...tage) => (iso) => tage.includes(iso)
const keine = feiertage()

// ---------- Zahlungsfrist der Miete, § 556b Abs. 1 BGB ----------
// „Die Miete ist zu Beginn, spätestens bis zum dritten Werktag der einzelnen Zeitabschnitte zu
// entrichten, nach denen sie bemessen ist." Der Samstag zählt dabei nicht als Werktag (BGH,
// Urteil vom 13.07.2010 – VIII ZR 129/09), Sonn- und Feiertage ohnehin nicht.

test('Zahlungsfrist: dritter Werktag, Samstage und Sonntage zählen nicht', () => {
  const faelle = [
    // [Jahr, Monat, letzter pünktlicher Zahltag, Herleitung]
    [2026, 2, '2026-02-04', 'So 1. · Mo 2. (1) · Di 3. (2) · Mi 4. (3)'],
    [2026, 9, '2026-09-03', 'Di 1. (1) · Mi 2. (2) · Do 3. (3)'],
    [2026, 8, '2026-08-05', 'Sa 1. zählt nicht · So 2. · Mo 3. (1) · Di 4. (2) · Mi 5. (3)'],
    [2027, 7, '2027-07-05', 'Do 1. (1) · Fr 2. (2) · Sa 3. zählt nicht · So 4. · Mo 5. (3)'],
  ]
  for (const [jahr, monat, erwartet, herleitung] of faelle) {
    assert.equal(rentPayableBy(jahr, monat, keine), erwartet, `${monat}/${jahr}: ${herleitung}`)
  }
})

test('Zahlungsfrist: Feiertage zählen nicht', () => {
  const faelle = [
    [2026, 5, ['2026-05-01'], '2026-05-06', 'Fr 1. Tag der Arbeit · Sa 2. · So 3. · Mo 4. (1) · Di 5. (2) · Mi 6. (3)'],
    [2025, 10, ['2025-10-03'], '2025-10-06', 'Mi 1. (1) · Do 2. (2) · Fr 3. Tag der Deutschen Einheit · Mo 6. (3)'],
    // Ostern 2026 am 5. April: Karfreitag 3. April, Ostermontag 6. April
    [2026, 4, ['2026-04-03', '2026-04-06'], '2026-04-07', 'Mi 1. (1) · Do 2. (2) · Fr 3. Karfreitag · Mo 6. Ostermontag · Di 7. (3)'],
    // Ostern 2024 am 31. März: Ostermontag 1. April
    [2024, 4, ['2024-04-01'], '2024-04-04', 'Mo 1. Ostermontag · Di 2. (1) · Mi 3. (2) · Do 4. (3)'],
    // Ostern 2011 am 24. April: Christi Himmelfahrt 2. Juni
    [2011, 6, ['2011-06-02'], '2011-06-06', 'Mi 1. (1) · Do 2. Christi Himmelfahrt · Fr 3. (2) · Mo 6. (3)'],
    // Ostern 2020 am 12. April: Pfingstmontag 1. Juni
    [2020, 6, ['2020-06-01'], '2020-06-04', 'Mo 1. Pfingstmontag · Di 2. (1) · Mi 3. (2) · Do 4. (3)'],
    // Landesfeiertage verschieben die Frist nur, wenn der Aufrufer sie als Feiertag angibt
    [2026, 1, ['2026-01-01', '2026-01-06'], '2026-01-07', 'Do 1. Neujahr · Fr 2. (1) · Mo 5. (2) · Di 6. Heilige Drei Könige · Mi 7. (3)'],
    [2026, 1, ['2026-01-01'], '2026-01-06', 'Do 1. Neujahr · Fr 2. (1) · Mo 5. (2) · Di 6. (3)'],
    // Ostern 2021 am 4. April: Fronleichnam 3. Juni
    [2021, 6, ['2021-06-03'], '2021-06-04', 'Di 1. (1) · Mi 2. (2) · Do 3. Fronleichnam · Fr 4. (3)'],
    [2021, 6, [], '2021-06-03', 'Di 1. (1) · Mi 2. (2) · Do 3. (3)'],
    [2027, 11, ['2027-11-01'], '2027-11-04', 'Mo 1. Allerheiligen · Di 2. (1) · Mi 3. (2) · Do 4. (3)'],
  ]
  for (const [jahr, monat, tage, erwartet, herleitung] of faelle) {
    assert.equal(rentPayableBy(jahr, monat, feiertage(...tage)), erwartet, `${monat}/${jahr}: ${herleitung}`)
  }
})

// ---------- § 193 BGB ----------
// „Ist an einem bestimmten Tage oder innerhalb einer Frist eine Willenserklärung abzugeben oder
// eine Leistung zu bewirken und fällt der bestimmte Tag oder der letzte Tag der Frist auf einen
// Sonntag, einen am Erklärungs- oder Leistungsort staatlich anerkannten allgemeinen Feiertag
// oder einen Sonnabend, so tritt an die Stelle eines solchen Tages der nächste Werktag."

test('§ 193 BGB: Ein Fristende am Samstag, Sonntag oder Feiertag rückt auf den nächsten Werktag', () => {
  const faelle = [
    ['2026-09-16', [], '2026-09-16', 'Mittwoch bleibt'],
    ['2026-09-19', [], '2026-09-21', 'Sa → So → Mo'],
    ['2026-09-20', [], '2026-09-21', 'So → Mo'],
    ['2026-05-23', ['2026-05-25'], '2026-05-26', 'Sa → So → Mo Pfingstmontag → Di'],
    ['2026-04-03', ['2026-04-03', '2026-04-06'], '2026-04-07', 'Fr Karfreitag → Sa → So → Mo Ostermontag → Di'],
    ['2022-12-31', ['2023-01-01'], '2023-01-02', 'Sa → So Neujahr → Mo, über den Jahreswechsel'],
    ['2026-12-24', ['2026-12-25', '2026-12-26'], '2026-12-24', 'Heiligabend ist kein Feiertag'],
  ]
  for (const [ende, tage, erwartet, herleitung] of faelle) {
    assert.equal(deadlineOnWorkday(ende, feiertage(...tage)), erwartet, `${ende}: ${herleitung}`)
  }
})

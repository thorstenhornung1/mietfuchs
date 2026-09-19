// Fristen des Mietrechts als reine Funktionen: Datum hinein, Datum heraus, ohne Uhr und ohne
// Datenzugriff. Welche Tage Feiertage sind, entscheidet der Aufrufer über `isHoliday(iso)`
// (siehe holidays.js) — und damit auch, in welche Richtung er bei unbekanntem Ort vorsichtig ist.
// Daten sind ISO-Strings 'YYYY-MM-DD', gerechnet in UTC wie in calc.js.

const MS_DAY = 86400000
const toIso = (ms) => new Date(ms).toISOString().slice(0, 10)
const weekdayOf = (iso) => new Date(`${iso}T00:00:00Z`).getUTCDay() // 0 = Sonntag, 6 = Samstag

// Werktag im engeren Sinn: Montag bis Freitag, kein Feiertag
const isWeekdayWorkday = (iso, isHoliday) => {
  const d = weekdayOf(iso)
  return d !== 0 && d !== 6 && !isHoliday(iso)
}

// Letzter Tag, an dem die Miete eines Monats noch pünktlich gezahlt ist: der dritte Werktag
// (§ 556b Abs. 1 BGB). Samstage zählen dabei nicht mit (BGH, Urteil vom 13.07.2010 –
// VIII ZR 129/09), Sonn- und Feiertage ohnehin nicht. Pünktlich ist auch eine Überweisung, die
// bis zu diesem Tag beauftragt wurde und erst danach eingeht (BGH, Urteil vom 05.10.2016 –
// VIII ZR 222/15). `month`: 1–12.
export function rentPayableBy(year, month, isHoliday) {
  let workdays = 0
  for (let ms = Date.UTC(year, month - 1, 1); ; ms += MS_DAY) {
    const iso = toIso(ms)
    if (isWeekdayWorkday(iso, isHoliday) && ++workdays === 3) return iso
  }
}

// § 193 BGB: Fällt der letzte Tag einer Frist auf einen Samstag, Sonntag oder gesetzlichen
// Feiertag, tritt an seine Stelle der nächste Werktag. Ein Werktag bleibt, wie er ist.
// Nicht für Kündigungsfristen: Auf sie ist § 193 BGB weder unmittelbar noch entsprechend
// anwendbar (BGH, Urteil vom 17.02.2005 – III ZR 172/04).
export function deadlineOnWorkday(date, isHoliday) {
  let ms = Date.parse(`${date}T00:00:00Z`)
  while (!isWeekdayWorkday(toIso(ms), isHoliday)) ms += MS_DAY
  return toIso(ms)
}

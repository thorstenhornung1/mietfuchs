// Einen db.json-Bestand nach SQLite schreiben.
//
// Das ist noch **nicht** der Migrationspfad aus #4 — der braucht Validierung, Backup,
// Migrationsbericht und die atomare Aktivierung aus §271.19. Hier geht es um das Fundament
// darunter: die Abbildung des Domänenmodells auf das relationale Schema, einmal
// geschrieben und von den Tests benutzt, um beide Backends gegeneinander zu prüfen.
//
// Alles läuft in einer Transaktion: Ein halb befüllter Bestand wäre schlimmer als ein leerer.

import type { Db } from '@mietfuchs/domain'
import { fromBool, type SqliteDatabase } from './driver.ts'

export function writeDb(db: SqliteDatabase, source: Db): void {
  db.runScript('BEGIN')
  try {
    writeSettings(db, source)
    writeUnits(db, source)
    writeTenancies(db, source)
    writeMeters(db, source)
    writeCostItems(db, source)
    writePayments(db, source)
    writeClosedSettlements(db, source)
    db.runScript('COMMIT')
  } catch (err) {
    db.runScript('ROLLBACK')
    throw err
  }
}

function writeSettings(db: SqliteDatabase, { settings }: Db): void {
  db.prepare(
    `INSERT INTO settings (id, house_name, address, landlord_name, iban, payment_deadline_days,
                           ollama_url, ollama_model, print_adjust_suggestion, print_attachments)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    settings.houseName ?? '',
    settings.address ?? '',
    settings.landlordName ?? '',
    settings.iban ?? '',
    settings.paymentDeadlineDays ?? 30,
    settings.ollamaUrl ?? '',
    settings.ollamaModel ?? '',
    settings.printAdjustSuggestion === undefined ? null : fromBool(settings.printAdjustSuggestion),
    settings.printAttachments === undefined ? null : fromBool(settings.printAttachments),
  )
}

function writeUnits(db: SqliteDatabase, { units }: Db): void {
  const stmt = db.prepare(
    'INSERT INTO unit (id, name, area_m2, participates, rooms, floor, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
  for (const u of units) {
    stmt.run(u.id, u.name, u.areaM2, fromBool(u.participates), u.rooms ?? null, u.floor ?? null, u.notes ?? null)
  }
}

function writeTenancies(db: SqliteDatabase, { tenancies }: Db): void {
  const tenancy = db.prepare(
    `INSERT INTO tenancy (id, unit_id, tenant_name, start_date, end_date, email, phone,
                          correspondence_address, iban, contract_date, deposit_cents,
                          deposit_status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const person = db.prepare('INSERT INTO tenancy_person (tenancy_id, from_date, persons) VALUES (?, ?, ?)')
  const prepayment = db.prepare(
    'INSERT INTO tenancy_prepayment (tenancy_id, from_month, monthly_cents) VALUES (?, ?, ?)',
  )
  const baseRent = db.prepare(
    'INSERT INTO tenancy_base_rent (tenancy_id, from_month, monthly_cents) VALUES (?, ?, ?)',
  )
  const override = db.prepare(
    'INSERT INTO tenancy_prepayment_override (tenancy_id, year, cents) VALUES (?, ?, ?)',
  )

  for (const t of tenancies) {
    tenancy.run(
      t.id,
      t.unitId,
      t.tenantName,
      t.start,
      t.end ?? null,
      t.email ?? null,
      t.phone ?? null,
      t.correspondenceAddress ?? null,
      t.iban ?? null,
      t.contractDate ?? null,
      t.depositCents ?? null,
      t.depositStatus ?? null,
      t.notes ?? null,
    )
    for (const e of t.personHistory) person.run(t.id, e.from, e.persons)
    for (const e of t.prepayments) prepayment.run(t.id, e.from, e.monthlyCents)
    for (const e of t.baseRents) baseRent.run(t.id, e.from, e.monthlyCents)
    for (const [year, cents] of Object.entries(t.prepaymentOverrides ?? {})) {
      override.run(t.id, Number(year), cents)
    }
  }
}

function writeMeters(db: SqliteDatabase, { meters, readings }: Db): void {
  const meter = db.prepare(
    'INSERT INTO meter (id, name, unit_id, type, meter_number, unit_label) VALUES (?, ?, ?, ?, ?, ?)',
  )
  for (const m of meters) {
    meter.run(m.id, m.name, m.unitId ?? null, m.type, m.meterNumber ?? null, m.unit)
  }
  const reading = db.prepare(
    `INSERT INTO reading (id, meter_id, read_date, value, replacement, old_end_value, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
  for (const r of readings) {
    reading.run(
      r.id,
      r.meterId,
      r.date,
      r.value,
      fromBool(r.replacement ?? false),
      r.oldEndValue ?? null,
      r.note ?? null,
    )
  }
}

function writeCostItems(db: SqliteDatabase, { costItems }: Db): void {
  const stmt = db.prepare(
    `INSERT INTO cost_item (id, year, category, description, vendor, amount_cents, key,
                            direct_unit_id, meter_type, labor_35a_cents, invoice_file)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  for (const c of costItems) {
    stmt.run(
      c.id,
      c.year,
      c.category,
      c.description,
      c.vendor ?? null,
      c.amountCents,
      c.key,
      c.directUnitId ?? null,
      c.meterType ?? null,
      c.labor35aCents ?? null,
      c.invoiceFile ?? null,
    )
  }
}

function writePayments(db: SqliteDatabase, { payments }: Db): void {
  const stmt = db.prepare(
    'INSERT INTO payment (id, tenancy_id, pay_date, amount_cents, note) VALUES (?, ?, ?, ?, ?)',
  )
  for (const p of payments) stmt.run(p.id, p.tenancyId, p.date, p.amountCents, p.note ?? null)
}

function writeClosedSettlements(db: SqliteDatabase, { closedSettlements }: Db): void {
  const stmt = db.prepare(
    `INSERT INTO closed_settlement (id, year, closed_at, sent_at, settlement_json)
     VALUES (?, ?, ?, ?, ?)`,
  )
  for (const c of closedSettlements) {
    stmt.run(c.id, c.year, c.closedAt, c.sentAt ?? null, JSON.stringify(c.settlement))
  }
}

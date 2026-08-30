// Repository-Schnittstellen (Spec §271.6).
//
//   HTTP/UI → Application Services → Domain → Repository Interfaces
//   → Persistence Adapter ├── SQLite └── PostgreSQL
//
// **Die Domäne importiert niemals einen Datenbanktreiber** — kein `@prisma/client`, kein
// `pg`, kein `better-sqlite3`, kein `node:sqlite` (Invariante 109, §271.6). Hier stehen nur
// Verträge; wer sie erfüllt, ist Sache der Adapter im Server.
//
// Das ist keine Formalie: Solange diese Grenze hält, ist die Wahl des Persistenzwerkzeugs
// eine Entscheidung im Adapter und keine im Fachcode (§271.10 — „Prisma = Persistenzwerkzeug,
// Prisma ≠ Domain Model"; ein späterer Wechsel darf die Domäne nicht berühren).
//
// **Noch nicht enthalten: Workspace-Scoping.** §271.6 zeigt die Signaturen mit einer
// `workspaceId`, und die Workspace-Isolation ist P0 (Priorisierung §105). Es gibt aber
// bisher weder Workspaces noch Nutzer im Datenmodell — ein Parameter, der überall denselben
// Platzhalterwert trüge, wäre eine Attrappe und würde die spätere echte Prüfung eher
// verschleiern als vorbereiten. Das Scoping kommt mit M3 (#5) und ändert dann bewusst diese
// Signaturen.

import type { SettlementInput, LedgerInput } from './settlement/input.ts'

/**
 * Liefert die Eingangsdaten einer Abrechnung als Schnappschuss.
 *
 * Ein Aufruf ist eine in sich stimmige Sicht auf einen Zeitpunkt: Was hier zurückkommt,
 * gehört zusammen. Ob der Adapter das über eine Transaktion, eine Datei oder einen
 * Snapshot-Read erreicht, ist seine Sache.
 */
export interface SettlementInputRepository {
  loadSettlementInput(year: number): Promise<SettlementInput>
  loadLedgerInput(year: number): Promise<LedgerInput>
}

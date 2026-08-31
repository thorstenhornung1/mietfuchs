// Typen für `bun:sqlite`.
//
// Der Server wird unter Node typgeprüft; Bun-eigene Module kennt TypeScript dort nicht.
// Statt `@types/bun` als Abhängigkeit aufzunehmen — ein großes Paket für eine einzige
// Import-Zeile — steht hier genau die Fläche, die der Treiber-Adapter benutzt. Weicht Bun
// davon ab, fällt es beim Bauen der Binary auf, nicht erst beim Nutzer.
//
// Zur Laufzeit ist das Modul nur in der gepackten Binary vorhanden; unter Node greift der
// Adapter auf `node:sqlite` zurück (siehe persistence/sqlite/driver.ts).
declare module 'bun:sqlite' {
  type SqlParam = string | number | bigint | null | Uint8Array

  export class Statement {
    all(...params: SqlParam[]): unknown[]
    get(...params: SqlParam[]): unknown
    run(...params: SqlParam[]): unknown
  }

  export class Database {
    constructor(filename: string, options?: { create?: boolean; readonly?: boolean })
    run(sql: string): unknown
    prepare(sql: string): Statement
    close(): void
  }
}

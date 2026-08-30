// Typen für das generierte Modul embedded-client.js.
//
// Die Datei selbst entsteht erst beim Packen (scripts/embed-client.mjs) und ist
// gitignoriert; im Dev-Betrieb existiert sie nicht und wird auch nie importiert
// (siehe die PACKAGED-Weiche in index.ts). Diese Deklaration hält den Typecheck
// trotzdem vollständig.

/** URL-Pfad → Dateipfad im eingebetteten Dateisystem der Bun-Binary. */
export declare const embeddedFiles: Record<string, string>

export declare function mimeFor(urlPath: string): string

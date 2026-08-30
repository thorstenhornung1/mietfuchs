// pdf-parse bringt keine Typen mit. Wir nutzen nur den Textextraktor und laden ihn
// bewusst über den Unterpfad lib/pdf-parse.js — der Paket-Einstiegspunkt führt eine
// Debug-Routine aus, die beim Import eine Testdatei von der Platte lesen will.
declare module 'pdf-parse/lib/pdf-parse.js' {
  export default function pdfParse(data: Buffer): Promise<{ text: string }>
}

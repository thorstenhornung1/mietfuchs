// Gemeinsames Domain-Package von Mietfuchs Next (Spec §38).
//
// Server und Client konsumieren dieselben fachlichen Regeln — die Typdefinitionen des
// Clients sind damit nicht länger die alleinige Wahrheit. Die Quellen werden als
// TypeScript ausgeliefert: Node führt sie über Type Stripping direkt aus, Bun kompiliert
// sie in die Binary, Vite bündelt sie. Es gibt bewusst keinen Build-Schritt und damit
// kein Zwischenartefakt, das veralten könnte.

export * from './money.ts'
export * from './dates.ts'
export * from './model.ts'
export * from './classifications.ts'

// In der gepackten Binary läuft der Server unter Bun, sonst unter Node. Der Unterschied
// wird an `globalThis.Bun` erkannt (siehe index.ts und store.ts) — Node kennt das nicht.
declare global {
  // eslint-disable-next-line no-var
  var Bun: unknown
}

export {}

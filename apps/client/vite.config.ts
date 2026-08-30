import { createRequire } from 'node:module'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// Den Ort von pdfjs-dist auflösen statt ihn zu raten: Im npm-Workspace hebt npm das Paket
// ins Root-node_modules, ein fest verdrahtetes "node_modules/pdfjs-dist" ginge dann ins
// Leere — und vite-plugin-static-copy bricht den Build ab, wenn ein Muster nichts trifft.
const pdfjsDir = path
  .dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json'))
  .split(path.sep)
  .join('/')

export default defineConfig({
  plugins: [
    react(),
    // pdf.js dekodiert JBIG2/JPEG2000 (typisch für Behörden-Scans) und Farbprofile
    // per WebAssembly — diese Dateien müssen mit ausgeliefert werden.
    viteStaticCopy({
      targets: [
        { src: `${pdfjsDir}/wasm/*`, dest: 'pdfjs/wasm', rename: { stripBase: true } },
        { src: `${pdfjsDir}/iccs/*`, dest: 'pdfjs/iccs', rename: { stripBase: true } },
        { src: `${pdfjsDir}/cmaps/*`, dest: 'pdfjs/cmaps', rename: { stripBase: true } },
        { src: `${pdfjsDir}/standard_fonts/*`, dest: 'pdfjs/standard_fonts', rename: { stripBase: true } },
      ],
    }),
  ],
  server: {
    proxy: {
      // 127.0.0.1 statt localhost: Auf Windows löst "localhost" zuerst zu IPv6 (::1)
      // auf — dort kann eine WSL-Portweiterleitung (wslrelay) Port 3001 belegen und
      // liefert dann 404 für alle /api-Routen. Die explizite IPv4-Adresse trifft
      // zuverlässig den lokalen Express-Server.
      '/api': 'http://127.0.0.1:3001',
      '/uploads': 'http://127.0.0.1:3001',
    },
  },
})

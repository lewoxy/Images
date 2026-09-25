// Packt den Build aus dist-single/ in eine einzige, eigenständige HTML-Datei
// (JS und CSS inline, Schriften als Data-URLs). Ergebnis: dist-single/hotel-hektik.html
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'dist-single';
let html = readFileSync(join(dir, 'index.html'), 'utf8');

html = html.replace(/<script type="module" crossorigin src="\.?\/?(assets\/[^"]+\.js)"><\/script>/g, (_, file) => {
  const js = readFileSync(join(dir, file), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script type="module">${js}</script>`;
});
html = html.replace(/<link rel="stylesheet" crossorigin href="\.?\/?(assets\/[^"]+\.css)">/g, (_, file) => {
  const css = readFileSync(join(dir, file), 'utf8');
  return `<style>${css}</style>`;
});
// modulepreload-Links auf nicht mehr vorhandene Chunks entfernen
html = html.replace(/<link rel="modulepreload"[^>]*>/g, '');

if (/src="\.?\/?assets\//.test(html) || /href="\.?\/?assets\//.test(html)) {
  console.error('Warnung: Es sind noch externe Asset-Verweise vorhanden:', readdirSync(join(dir, 'assets')));
}
const out = join(dir, 'hotel-hektik.html');
writeFileSync(out, html);
console.log(`${out}: ${(html.length / 1024).toFixed(0)} KB`);

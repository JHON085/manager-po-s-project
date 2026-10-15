import { build } from 'esbuild';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await build({
  entryPoints: ['vendor-entry.js'],
  outfile: 'dist/vendor.js',
  bundle: true,
  minify: true,
  platform: 'browser',
  format: 'iife',
  target: ['es2020'],
  logLevel: 'info'
});
await Promise.all(['index.html','app.js','styles.css','config.js'].map(file => copyFile(file, `dist/${file}`)));
await writeFile('dist/versao.txt', 'PO Control v6.9.1\nBibliotecas locais via Vercel build.\n');
console.log('PO Control v6.9.1: build completo em dist/.');

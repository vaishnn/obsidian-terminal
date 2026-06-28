import esbuild from 'esbuild';
import process from 'process';
import builtins from 'builtin-modules';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const prod = process.argv[2] === 'production';

// Merge xterm.css + custom styles → styles.css (Obsidian loads this automatically)
const xtermCss = fs.readFileSync(
  path.join(path.dirname(require.resolve('@xterm/xterm/package.json')), 'css', 'xterm.css'),
  'utf-8'
);
const customCss = fs.readFileSync('src/styles.css', 'utf-8');
fs.writeFileSync('styles.css', xtermCss + '\n\n' + customCss);
console.log('styles.css written');

await esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: [
    'obsidian',
    'electron',
    'node-pty',   // native module — must live in plugin's node_modules
    ...builtins,
  ],
  format: 'cjs',
  target: 'es2018',
  outfile: 'main.js',
  sourcemap: prod ? false : 'inline',
  treeShaking: true,
  logLevel: 'info',
  minify: prod,
}).catch(() => process.exit(1));

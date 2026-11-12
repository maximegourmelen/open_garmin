import console from 'node:console';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'));
const seen = new Set();
function include(key) {
  const chunk = manifest[key];
  if (!chunk) throw new Error(`Build manifest is missing ${key}`);
  if (seen.has(chunk.file)) return;
  seen.add(chunk.file);
  for (const dependency of chunk.imports ?? []) include(dependency);
}
include('index.html');
include('src/pages/Today/TodayPage.tsx');
const bytes = [...seen].reduce(
  (total, file) => total + gzipSync(readFileSync(join('dist', file))).length,
  0,
);
const kib = bytes / 1024;
console.log(`Overview initial JavaScript: ${kib.toFixed(1)} KiB gzip across ${seen.size} chunks`);
if (bytes >= 250 * 1024) {
  console.error('Overview initial JavaScript exceeds 250 KiB gzip.');
  process.exitCode = 1;
}

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, test } from 'vitest';
import { glossary, isMetricId, metricIds } from './glossary';

function tsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return tsxFiles(path);
    return entry.name.endsWith('.tsx') ? [path] : [];
  });
}

test('every metric label id used in the UI has glossary copy', () => {
  const src = resolve(process.cwd(), 'src');
  const used = tsxFiles(src).flatMap((path) =>
    [...readFileSync(path, 'utf8').matchAll(/<Metric(?:Label)?\b[^>]*?\bid="([^"]+)"/g)].map(
      (match) => ({ path, id: match[1] }),
    ),
  );
  expect(used.length).toBeGreaterThan(0);
  for (const { path, id } of used) expect(isMetricId(id), `${path}: ${id}`).toBe(true);
  expect(Object.keys(glossary).sort()).toEqual([...metricIds].sort());
});

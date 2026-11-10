import console from 'node:console';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import process from 'node:process';

const strict = process.argv.includes('--strict');
const roots = ['src', 'server/copy'];
const files = [];
for (const root of roots) walk(root);

function walk(path) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const target = join(path, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (
      (target.startsWith('src/') &&
        (target.endsWith('.tsx') || target.startsWith('src/content/'))) ||
      (target.startsWith('server/copy/') && target.endsWith('.py')) ||
      (target.startsWith('src/') && /\.(css|ts)$/.test(target))
    ) {
      files.push(target);
    }
  }
}

const checks = [
  ['emoji', /\p{Extended_Pictographic}/u],
  ['uppercase class', /(?:\buppercase\b|tracking-\[|\btracking-wide\b)/],
  ['banned copy', /\b(?:Pip|companion|confetti|streak flame|Hey\s|Nice\b|Great job)\b/i],
  ['monotone chart', /type\s*=\s*["']monotone["']/],
  ['native select', /<select\b/i],
];
const violations = [];
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const lines = source.split('\n');
  lines.forEach((line, index) => {
    const rules =
      file.endsWith('.tsx') || file.startsWith('src/content/') || file.startsWith('server/copy/')
        ? checks
        : [];
    for (const [name, pattern] of rules) {
      if (pattern.test(line)) violations.push(`${relative('.', file)}:${index + 1}: ${name}`);
    }
    if (
      file.startsWith('src/') &&
      file !== 'src/styles/tokens.css' &&
      /#[0-9a-fA-F]{3,8}\b/.test(line)
    ) {
      violations.push(`${relative('.', file)}:${index + 1}: hard-coded hex colour`);
    }
    if (
      file.endsWith('.tsx') ||
      file.startsWith('src/content/') ||
      file.startsWith('server/copy/')
    ) {
      const literals = line.match(/(['"`])(?:\\.|(?!\1).)*?\1/g) ?? [];
      if (
        literals.some((literal) => literal.replace(/\$\{[^}]*\}/g, '').includes('!')) ||
        />[^<>]*!</.test(line)
      ) {
        violations.push(`${relative('.', file)}:${index + 1}: exclamation in copy`);
      }
    }
  });
}

console.log(
  `UI rules: ${violations.length} current violation(s) in ${files.length} files${strict ? ' (strict)' : ' (report only)'}.`,
);
for (const violation of violations.slice(0, 200)) console.log(violation);
if (violations.length > 200) console.log(`… ${violations.length - 200} more`);
if (strict && violations.length) process.exitCode = 1;

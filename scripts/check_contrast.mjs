import console from 'node:console';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const css = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../src/styles/tokens.css'),
  'utf8',
);
const blocks = [...css.matchAll(/(:root[^{}]*)\{([^{}]*)\}/g)];

function tokens(block) {
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((match) => [
      match[1],
      match[2],
    ]),
  );
}

const light = tokens(blocks.find((block) => block[1].includes("data-theme='light'"))?.[2] ?? '');
const dark = {
  ...light,
  ...tokens(blocks.find((block) => block[1] === ":root[data-theme='dark'] ")?.[2] ?? ''),
};

function luminance(hex) {
  const values = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  return values
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}

function ratio(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

let failed = false;
for (const [theme, palette] of Object.entries({ light, dark })) {
  for (const surface of ['bg', 'surface']) {
    for (const [token, minimum] of [
      ['text', 4.5],
      ['text-2', 4.5],
      ['text-3', 3],
    ]) {
      const value = ratio(palette[token], palette[surface]);
      const okay = value >= minimum;
      failed ||= !okay;
      console.log(
        `${okay ? 'PASS' : 'FAIL'} ${theme} ${token} on ${surface}: ${value.toFixed(2)}:1`,
      );
    }
  }
  for (const [foreground, background, minimum] of [
    ['on-primary', 'primary', 4.5],
    ['accent', 'surface', 3],
    ['data-1', 'surface', 3],
    ['positive', 'surface', 3],
    ['caution', 'surface', 3],
    ['negative', 'surface', 3],
  ]) {
    const value = ratio(palette[foreground], palette[background]);
    const okay = value >= minimum;
    failed ||= !okay;
    console.log(
      `${okay ? 'PASS' : 'FAIL'} ${theme} ${foreground} on ${background}: ${value.toFixed(2)}:1`,
    );
  }
  for (const token of [
    'z1',
    'z2',
    'z3',
    'z4',
    'z5',
    'sleep-deep',
    'sleep-light',
    'sleep-rem',
    'sleep-awake',
    'bb',
    'stress-rest',
    'stress-low',
    'stress-med',
    'stress-high',
    'sport-walking',
    'sport-running',
    'sport-cycling',
    'sport-swimming',
    'sport-strength',
    'sport-hiking',
    'sport-other',
  ]) {
    const value = ratio(palette[token], palette.surface);
    const okay = value >= 3;
    failed ||= !okay;
    console.log(`${okay ? 'PASS' : 'FAIL'} ${theme} ${token} on surface: ${value.toFixed(2)}:1`);
  }
}
if (failed) process.exitCode = 1;

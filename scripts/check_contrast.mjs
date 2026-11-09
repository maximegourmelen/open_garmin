import { readFileSync } from 'node:fs';
import console from 'node:console';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const css = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../src/styles/tokens.css'),
  'utf8',
);
const blocks = [...css.matchAll(/(:root[^{}]*)\{([^{}]*)\}/g)];

function tokens(block) {
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?)\s*;/g)].map((match) => [
      match[1],
      match[2].length === 4
        ? `#${[...match[2].slice(1)].map((digit) => digit + digit).join('')}`
        : match[2],
    ]),
  );
}

const dark = tokens(blocks.find((match) => match[1].includes("data-theme='dark'"))?.[2] ?? '');
const light = {
  ...dark,
  ...tokens(blocks.find((match) => match[1].includes("data-theme='light'"))?.[2] ?? ''),
};

function luminance(hex) {
  const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  return channels
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrast(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

let failed = false;
for (const [theme, values] of Object.entries({ dark, light })) {
  for (const surface of ['bg', 'surface', 'surface-2', 'surface-3']) {
    for (const [text, minimum] of [
      ['text', 4.5],
      ['text-2', 4.5],
      ['text-3', 4.5],
      ['accent', 4.5],
    ]) {
      const ratio = contrast(values[text], values[surface]);
      const okay = ratio >= minimum;
      if (!okay) failed = true;
      console.log(
        `${okay ? 'PASS' : 'FAIL'} ${theme} ${text} on ${surface}: ${ratio.toFixed(2)}:1 (min ${minimum}:1)`,
      );
    }
  }
}
for (const [theme, values] of Object.entries({ dark, light })) {
  const ratio = contrast(values['on-accent'], values.accent);
  const okay = ratio >= 4.5;
  if (!okay) failed = true;
  console.log(
    `${okay ? 'PASS' : 'FAIL'} ${theme} on-accent on accent: ${ratio.toFixed(2)}:1 (min 4.5:1)`,
  );
}
if (failed) process.exitCode = 1;

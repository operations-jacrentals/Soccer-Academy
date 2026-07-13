// Reference feature-flag resolver (Node, no dependencies).
//
// Copy/adapt this into your app. It reads ../flags.json and answers whether a
// flag is enabled for the current environment.
//
//   APP_ENV=staging node readFlags.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const flagsPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'flags.json');

function load() {
  return JSON.parse(readFileSync(flagsPath, 'utf8')).flags ?? {};
}

/** Environment the app is running in: development | staging | production. */
export function currentEnv() {
  return process.env.APP_ENV ?? 'development';
}

/** Return true if `name` is enabled for `env` (defaults to currentEnv()). */
export function isEnabled(name, env = currentEnv(), fallback = false) {
  const flag = load()[name];
  if (!flag) return fallback;
  return Boolean(flag.environments?.[env] ?? fallback);
}

// Print all flag states when run directly.
if (import.meta.url === `file://${process.argv[1]}`) {
  const env = currentEnv();
  console.log(`Environment: ${env}`);
  for (const [name, flag] of Object.entries(load()).sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`  ${name}: ${flag.environments?.[env] ? 'on' : 'off'}`);
  }
}

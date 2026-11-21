// Leonida Trophy Atlas — dossier builder (Node 22, standard library only).
//
// Copies this entry's app/ and screenshots/ into the output directory, then
// writes the make.fun dossier for that directory with the kit's buildDossier.
//
//   MAKEFUN_OUTPUT_DIR=out node main.ts
//
// With no MAKEFUN_OUTPUT_DIR set, the output directory defaults to /output.
// The dossier is written to <output>/dossier.json. The caps below are the
// competition's: the text budget, four screenshots at most 256 KiB each, and
// the app's file and byte caps from the kit's example.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });

// Fail early with a named folder instead of a bare ENOENT from cpSync below.
for (const required of ['app', 'screenshots']) {
  const path = join(repoRoot, required);
  if (!existsSync(path)) {
    throw new Error(`Leonida Trophy Atlas: required folder missing: ${path} — restore it before building the dossier.`);
  }
}

// Fresh copy every run: stale files from an earlier build must never leak in.
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true, force: true });
cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true, force: true });

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
});

writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`dossier written: ${join(outputDir, 'dossier.json')} (${dossier.length} bytes)`);

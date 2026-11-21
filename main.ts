// Leonida Trophy Atlas v2 — the hand-in program for the gta6-trophy-guide-01 bounty.
// Node 22, standard library only. The guide itself is this directory's app/ folder:
// plain static files (HTML, CSS, ES modules, JSON data), no build step, and offline —
// the app loads nothing over the network. This program copies app/ and screenshots/
// from beside this file into the output directory and writes /output/dossier.json,
// the summary the judge reads, using the vendored make.fun library.
// vendor/makefun-frontend.ts is the kit's copy and must stay unchanged: the scorer
// requires dossier.json to be byte for byte what its own copy of the library writes.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// and serve the app for a look with `node serve.ts` (http://localhost:8080).
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Authored note: v2 packs four things — the checklist app, its step-by-step guides,
// its screenshots, and the dossier the judge reads. Keep them in step: a screenshot
// that shows a feature the app no longer has is a lie, so re-take shots after any
// app change. What changed from v1: every trophy now carries numbered steps, a tip,
// difficulty and time; the app adds a Next-up planner, per-stage roadmap progress,
// a 100% completion checklist, per-trophy notes and a sort control.
mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes;
// the others refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files and directories in app/ or 48 MiB of app files:
// app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);

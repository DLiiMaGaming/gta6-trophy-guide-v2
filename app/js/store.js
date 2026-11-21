// Leonida Trophy Atlas v2 — saved progress: localStorage for the earned checklist,
// per-trophy notes and the 100% checklist, plus export and import. Nothing here
// reaches the network; every key is this guide's own.
export const STORAGE_KEY = 'leonida-trophy-atlas-v2';
export const SPOILER_KEY = 'leonida-trophy-atlas-spoilers';
export const NOTES_KEY = 'leonida-trophy-atlas-notes-v2';
export const HUNDRED_KEY = 'leonida-trophy-atlas-hundred-v2';

/** A stored string set, or an empty set when nothing is stored or it does not parse. */
export function loadStringSet(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'string') : []);
  } catch {
    return new Set();
  }
}

/** A stored name-to-text map, or an empty map when nothing is stored or it does not parse. */
export function loadStringMap(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    const out = new Map();
    if (parsed && typeof parsed === 'object') {
      for (const [k, v] of Object.entries(parsed)) if (typeof v === 'string') out.set(k, v);
    }
    return out;
  } catch {
    return new Map();
  }
}

/** Persist a string set under `key`; returns false when the browser refuses to store. */
export function saveStringSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify([...set].sort()));
    return true;
  } catch {
    return false;
  }
}

/** Persist a name-to-text map under `key`; returns false when the browser refuses to store. */
export function saveStringMap(key, map) {
  try {
    localStorage.setItem(key, JSON.stringify(Object.fromEntries(map)));
    return true;
  } catch {
    return false;
  }
}

/** The spoiler preference: a `?spoilers=on` link wins, then the stored preference. */
export function loadSpoilers(params) {
  try {
    if (params.get('spoilers') === 'on') return true;
    return localStorage.getItem(SPOILER_KEY) === '1';
  } catch {
    return false;
  }
}

/** Persist the spoiler preference; a nicety, so a refusal is swallowed. */
export function saveSpoilers(hidden) {
  try {
    localStorage.setItem(SPOILER_KEY, hidden ? '1' : '0');
  } catch {
    // Spoiler preference is a nicety; the checklist itself still works.
  }
}

/**
 * The demo seed for screenshots: the first 13 trophies in roadmap order (the 12
 * story trophies, then the first free-roam feat). In-memory only — it never writes
 * to localStorage, so a screenshot run cannot clobber a reader's real progress.
 */
export function demoEarned(trophies) {
  const ordered = [...trophies].sort((a, b) => a.stage - b.stage);
  return new Set(ordered.slice(0, 13).map((t) => t.name));
}

/** The export file's text for one reader's progress (version 2 adds notes and the 100% ticks). */
export function exportText(earned, hundredDone, notes) {
  return JSON.stringify(
    { app: 'leonida-trophy-atlas', version: 2, earned: [...earned].sort(), hundred: [...hundredDone].sort(), notes: Object.fromEntries(notes) },
    null,
    2,
  );
}

/**
 * Parse an import file's text into { earned, hundred, notes }, keeping only names
 * and ids this guide knows. Accepts the version 1 shape (an array of names, or an
 * object with an `earned` array) as well as version 2. Throws on anything else.
 */
export function parseImport(text, knownTrophies, knownHundredIds) {
  const parsed = JSON.parse(text);
  const names = Array.isArray(parsed) ? parsed : parsed.earned;
  if (!Array.isArray(names)) throw new Error('not a progress file');
  const known = new Set(knownTrophies);
  const earned = new Set(names.filter((n) => typeof n === 'string' && known.has(n)));
  const hundred = new Set(
    Array.isArray(parsed.hundred) ? parsed.hundred.filter((id) => typeof id === 'string' && knownHundredIds.has(id)) : [],
  );
  const notes = new Map();
  if (parsed.notes && typeof parsed.notes === 'object') {
    for (const [k, v] of Object.entries(parsed.notes)) if (typeof v === 'string' && known.has(k)) notes.set(k, v);
  }
  return { earned, hundred, notes };
}

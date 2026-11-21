// Leonida Trophy Atlas — progress store.
//
// One small module owns all persisted state: which trophies the player has earned,
// which 100%-checklist items are done, and the player's own notes per trophy.
// Everything lives in localStorage under one key, so clearing it resets the guide.
// A `?seed=demo` query keeps a fixed demo state in memory only: it never writes
// to localStorage, so a screenshot session can never pollute a real save.

const STORAGE_KEY = 'leonida-trophy-atlas-v2';

// The demo seed: 13 trophies earned, chosen to look like a player partway through
// the story — the opening missions, the first chapter trophies, and two quick
// free-roam activities. The cover screenshot shows this as "13 of 55 earned".
export const DEMO_EARNED = [
  'Just Like Paradise',
  'Paradise Lost',
  'T**s Ass Drug Money',
  'Vice City, Baby!',
  'Top Of The World, Ma',
  'Trust',
  'Break the Bank',
  'Family Matters',
  'DWNFALL',
  'Hi-Jacked',
  'Snow Storm',
  'Master of None',
  'Stick Fiddler',
];

export const DEMO_HUNDRED = ['stunts', 'challenges'];

/** An empty state: nothing earned, nothing ticked, no notes. */
export function emptyState() {
  return { earned: [], hundred: [], notes: {} };
}

/** True when the current URL asks for the in-memory demo state. */
export function isDemoMode(search = globalThis.location?.search ?? '') {
  return new URLSearchParams(search).get('seed') === 'demo';
}

/**
 * Load the saved state from localStorage, or the demo state when `?seed=demo`
 * is present. A corrupt or foreign saved value is ignored (fresh empty state),
 * never allowed to crash the page.
 */
export function loadState(search) {
  if (isDemoMode(search)) {
    return {
      state: { earned: [...DEMO_EARNED], hundred: [...DEMO_HUNDRED], notes: {} },
      demo: true,
    };
  }
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return { state: emptyState(), demo: false };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { state: emptyState(), demo: false };
    }
    return {
      state: {
        earned: Array.isArray(parsed.earned) ? parsed.earned.filter((n) => typeof n === 'string') : [],
        hundred: Array.isArray(parsed.hundred) ? parsed.hundred.filter((n) => typeof n === 'string') : [],
        notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
      },
      demo: false,
    };
  } catch {
    return { state: emptyState(), demo: false };
  }
}

/** Persist `state` unless we are in demo mode (demo state is memory-only). */
export function saveState(state, demo) {
  if (demo) return false;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Has the player earned the trophy with this name? */
export function isEarned(state, name) {
  return state.earned.includes(name);
}

/** Toggle a trophy's earned flag; returns the new value. */
export function toggleEarned(state, name) {
  const at = state.earned.indexOf(name);
  if (at >= 0) state.earned.splice(at, 1);
  else state.earned.push(name);
  return at < 0;
}

/** The player's note for a trophy, or an empty string. */
export function getNote(state, name) {
  const note = state.notes[name];
  return typeof note === 'string' ? note : '';
}

/** Store (or clear, when blank) the player's note for a trophy. */
export function setNote(state, name, text) {
  const trimmed = String(text ?? '').trim();
  if (trimmed === '') delete state.notes[name];
  else state.notes[name] = trimmed;
}

/** Is a 100%-checklist item (by id) ticked off? */
export function isHundredDone(state, id) {
  return state.hundred.includes(id);
}

/** Toggle a 100%-checklist item; returns the new value. */
export function toggleHundred(state, id) {
  const at = state.hundred.indexOf(id);
  if (at >= 0) state.hundred.splice(at, 1);
  else state.hundred.push(id);
  return at < 0;
}

/** How many trophies are earned out of `total`. */
export function earnedCount(state) {
  return state.earned.length;
}

/**
 * Serialize the whole state for export: earned trophies, finished 100% items
 * and notes, plus a timestamp and the guide's version.
 */
export function exportState(state, totalTrophies) {
  return {
    app: 'Leonida Trophy Atlas',
    version: 2,
    exportedAt: new Date().toISOString(),
    earned: [...state.earned].sort(),
    earnedCount: state.earned.length,
    totalTrophies,
    hundred: [...state.hundred].sort(),
    hundredCount: state.hundred.length,
    notes: { ...state.notes },
  };
}

/** Download `data` as a JSON file in the browser. */
export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

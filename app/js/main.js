// Leonida Trophy Atlas v2 — boot and wiring: loads the three data files, holds the
// reader's state, and connects the controls. The app fetches only its own files
// (data/trophies.json, data/roadmap.json, data/checklist100.json) and nothing else.
import {
  STORAGE_KEY,
  NOTES_KEY,
  HUNDRED_KEY,
  loadStringSet,
  loadStringMap,
  saveStringSet,
  saveStringMap,
  loadSpoilers,
  saveSpoilers,
  demoEarned,
  exportText,
  parseImport,
} from './store.js';
import {
  renderProgress,
  renderChecklist,
  renderMissables,
  renderPlanner,
  buildTrophyCard,
} from './trophyViews.js';
import { renderRoadmap, renderHundred, renderHundredProgress } from './roadmapViews.js';

const params = new URLSearchParams(location.search);
const demo = params.get('seed') === 'demo';

const state = {
  trophies: [],
  roadmap: null,
  hundred: null,
  earned: loadStringSet(STORAGE_KEY),
  notes: loadStringMap(NOTES_KEY),
  hundredDone: loadStringSet(HUNDRED_KEY),
  spoilersHidden: loadSpoilers(params),
  openDetail: new Set(),
};

const els = {
  earnedCount: document.getElementById('earned-count'),
  earnedPercent: document.getElementById('earned-percent'),
  progressFill: document.getElementById('progress-fill'),
  gradeCounts: document.getElementById('grade-counts'),
  kindCounts: document.getElementById('kind-counts'),
  nextUp: document.getElementById('next-up'),
  nextAfter: document.getElementById('next-after'),
  search: document.getElementById('search'),
  kindSelect: document.getElementById('kind-filter'),
  gradeSelect: document.getElementById('grade-filter'),
  sortSelect: document.getElementById('sort-select'),
  earnedOnlyBox: document.getElementById('earned-only'),
  spoilerBox: document.getElementById('spoiler-toggle'),
  savedNote: document.getElementById('saved-note'),
  filterNote: document.getElementById('filter-note'),
  list: document.getElementById('trophy-list'),
  emptyNote: document.getElementById('empty-note'),
  roadmapIntro: document.getElementById('roadmap-intro'),
  roadmapStages: document.getElementById('roadmap-stages'),
  hundredIntro: document.getElementById('hundred-intro'),
  hundredCount: document.getElementById('hundred-count'),
  hundredPercent: document.getElementById('hundred-percent'),
  hundredFill: document.getElementById('hundred-fill'),
  hundredList: document.getElementById('hundred-list'),
  missableList: document.getElementById('missable-list'),
};

/** Re-render everything from state (used after a filter change, a spoiler toggle or an import). */
function renderAll() {
  renderProgress(state, els);
  renderChecklist(state, els, callbacks);
  renderMissables(state, els, callbacks);
  if (state.roadmap) renderRoadmap(state, { intro: els.roadmapIntro, stages: els.roadmapStages });
  if (state.hundred) renderHundred(state, { intro: els.hundredIntro, list: els.hundredList, count: els.hundredCount, percent: els.hundredPercent, fill: els.hundredFill }, onToggleHundred);
  renderPlanner(state, els, callbacks);
}

/** A tick that changes what the card shows needs a fresh render; anything else is a small update. */
function onToggleEarned(name, checked, card) {
  if (checked) state.earned.add(name);
  else state.earned.delete(name);
  if (!demo && saveStringSet(STORAGE_KEY, state.earned)) {
    els.savedNote.textContent = 'Saved just now.';
  } else if (demo) {
    els.savedNote.textContent = 'Demo progress — your saved checklist is untouched.';
  } else {
    els.savedNote.textContent = 'Could not save in this browser.';
  }
  const trophy = state.trophies.find((t) => t.name === name);
  if ((state.spoilersHidden && trophy && trophy.hidden) || els.earnedOnlyBox.checked) {
    renderAll();
    return;
  }
  card.classList.toggle('earned', checked);
  const box = card.querySelector('input[type="checkbox"]');
  if (box) box.checked = checked;
  renderProgress(state, els);
  if (state.roadmap) renderRoadmap(state, { intro: els.roadmapIntro, stages: els.roadmapStages });
  renderMissables(state, els, callbacks);
  renderPlanner(state, els, callbacks);
}

/** A note is saved as the reader types it. */
function onNote(name, text) {
  if (text.trim() === '') state.notes.delete(name);
  else state.notes.set(name, text);
  if (!demo) saveStringMap(NOTES_KEY, state.notes);
}

/** Open or close one card's step-by-step detail, in place, without rebuilding the list. */
function onToggleDetail(name, card, toggle) {
  const trophy = state.trophies.find((t) => t.name === name);
  if (!trophy) return;
  const detail = card.querySelector('.trophy-detail');
  if (detail) {
    detail.remove();
    state.openDetail.delete(name);
    toggle.textContent = 'Show steps & sources';
    toggle.setAttribute('aria-expanded', 'false');
    return;
  }
  state.openDetail.add(name);
  toggle.textContent = 'Hide steps & sources';
  toggle.setAttribute('aria-expanded', 'true');
  // Rebuild the card's detail from the same builder the list uses, so the open
  // card always shows the current notes.
  const fresh = buildTrophyCard(trophy, state, callbacks);
  const freshDetail = fresh.querySelector('.trophy-detail');
  if (freshDetail) card.append(freshDetail);
}

/** A 100% checklist tick: saved, then its own progress bar and the item's style update. */
function onToggleHundred(id, checked) {
  if (checked) state.hundredDone.add(id);
  else state.hundredDone.delete(id);
  if (!demo) saveStringSet(HUNDRED_KEY, state.hundredDone);
  renderHundredProgress(state, { count: els.hundredCount, percent: els.hundredPercent, fill: els.hundredFill });
  const item = state.hundred.items.find((i) => i.id === id);
  const box = els.hundredList.querySelector(`input[aria-label="Mark ${item ? item.title : ''} as done"]`);
  if (box && box.closest('.hundred-item')) box.closest('.hundred-item').classList.toggle('done', checked);
}

const callbacks = { onToggleEarned, onNote, onToggleDetail };

function downloadFile(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportProgress() {
  downloadFile('gta6-trophy-progress.json', exportText(state.earned, state.hundredDone, state.notes));
  els.savedNote.textContent = 'Progress exported.';
}

async function importProgress(file) {
  try {
    const parsed = parseImport(
      await file.text(),
      state.trophies.map((t) => t.name),
      new Set(state.hundred.items.map((i) => i.id)),
    );
    state.earned = parsed.earned;
    state.hundredDone = parsed.hundred;
    state.notes = parsed.notes;
    if (!demo) {
      saveStringSet(STORAGE_KEY, state.earned);
      saveStringSet(HUNDRED_KEY, state.hundredDone);
      saveStringMap(NOTES_KEY, state.notes);
    }
    renderAll();
    els.savedNote.textContent = `Imported ${state.earned.size} earned trophies.`;
  } catch {
    els.savedNote.textContent = 'That file is not a valid progress export.';
  }
}

async function boot() {
  els.spoilerBox.checked = state.spoilersHidden;
  const [trophyDoc, roadmapDoc, hundredDoc] = await Promise.all([
    fetch('data/trophies.json').then((r) => r.json()),
    fetch('data/roadmap.json').then((r) => r.json()),
    fetch('data/checklist100.json').then((r) => r.json()),
  ]);
  state.trophies = trophyDoc.trophies;
  state.roadmap = roadmapDoc;
  state.hundred = hundredDoc;
  if (demo) state.earned = demoEarned(state.trophies);
  const focusName = params.get('trophy');
  if (focusName && state.trophies.some((t) => t.name === focusName)) state.openDetail.add(focusName);
  renderAll();

  els.search.addEventListener('input', () => renderChecklist(state, els, callbacks));
  els.kindSelect.addEventListener('change', () => renderChecklist(state, els, callbacks));
  els.gradeSelect.addEventListener('change', () => renderChecklist(state, els, callbacks));
  els.sortSelect.addEventListener('change', () => renderChecklist(state, els, callbacks));
  els.earnedOnlyBox.addEventListener('change', () => renderChecklist(state, els, callbacks));
  els.spoilerBox.addEventListener('change', () => {
    state.spoilersHidden = els.spoilerBox.checked;
    saveSpoilers(state.spoilersHidden);
    renderAll();
  });
  document.getElementById('export-btn').addEventListener('click', exportProgress);
  document.getElementById('import-input').addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) importProgress(file);
    event.target.value = '';
  });
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (window.confirm('Clear every tick on the checklist?')) {
      state.earned = new Set();
      state.hundredDone = new Set();
      if (!demo) {
        saveStringSet(STORAGE_KEY, state.earned);
        saveStringSet(HUNDRED_KEY, state.hundredDone);
      }
      renderAll();
      els.savedNote.textContent = 'Checklist reset.';
    }
  });

  // Deep link: ?trophy=<name> opens that trophy's detail; ?view=<section> jumps to it.
  if (focusName) {
    const card = els.list.querySelector(`[data-trophy="${CSS.escape(focusName)}"]`);
    if (card) card.scrollIntoView({ block: 'start' });
  } else if (params.get('view')) {
    const target = document.getElementById(params.get('view'));
    if (target) target.scrollIntoView();
  }
}

boot().catch((error) => {
  els.list.replaceChildren();
  const note = document.createElement('p');
  note.className = 'empty-note';
  note.textContent = `The guide data could not be loaded (${error.message}). Serve the app/ folder over HTTP and reload.`;
  els.list.append(note);
});

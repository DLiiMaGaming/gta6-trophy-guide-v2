// Leonida Trophy Atlas — bootstrap.
//
// Loads the three data files, renders the three views, and wires every control:
// the tabs, search, sort, spoiler toggle, "not earned yet", the earned tick
// boxes, the per-trophy notes, the 100% ticks and the JSON export. Progress in
// the header is recomputed from state after every change, so the numbers on
// screen are always the numbers in the store.

import {
  downloadJson,
  exportState,
  isDemoMode,
  loadState,
  saveState,
  setNote,
  toggleEarned,
  toggleHundred,
} from './store.js';
import {
  listHint,
  renderMissables,
  renderTrophyDetail,
  renderTrophyList,
} from './trophyViews.js';
import { renderHundred, renderNextUp, renderRoadmap } from './roadmapViews.js';

const $ = (selector) => document.querySelector(selector);
const params = new URLSearchParams(globalThis.location.search);

/** The three data files, loaded in parallel. */
async function loadData() {
  const [trophies, roadmap, checklist] = await Promise.all([
    fetch('data/trophies.json').then((r) => r.json()),
    fetch('data/roadmap.json').then((r) => r.json()),
    fetch('data/checklist100.json').then((r) => r.json()),
  ]);
  return { trophies: trophies.trophies, roadmap, checklist };
}

/** The view the URL asks for: checklist, roadmap or hundred. Defaults to checklist. */
function initialView() {
  const view = params.get('view');
  return ['checklist', 'roadmap', 'hundred'].includes(view) ? view : 'checklist';
}

/** Show one view, hide the other two, and mark its tab active. */
function showView(view) {
  for (const name of ['checklist', 'roadmap', 'hundred']) {
    const section = $(`#view-${name}`);
    section.hidden = name !== view;
    section.classList.toggle('is-active', name === view);
    $(`.tab[data-view="${name}"]`).classList.toggle('is-active', name === view);
  }
}

/** Recompute the header progress from state and repaint every view that shows it. */
function refresh(ctx) {
  const { trophies, checklist, state } = ctx;
  const earned = state.earned.length;
  const total = trophies.length;
  const pct = total === 0 ? 0 : Math.round((earned / total) * 100);
  const hundredDone = state.hundred.length;
  $('#progress-count').textContent = `${earned} / ${total} trophies`;
  $('#progress-fill').style.width = `${pct}%`;
  $('#progress-platinum').textContent = `Platinum: ${pct}% there`;
  $('#progress-hundred').textContent = `100% checklist: ${hundredDone} / ${checklist.items.length}`;
  $('#progress-note').textContent = isDemoMode()
    ? 'Demo seed: 13 trophies checked in memory only — nothing is saved.'
    : 'Tick a trophy when it pops in your game.';
  renderTrophyList($('#trophy-list'), trophies, state, currentOptions());
  $('#list-hint').textContent = listHint(trophies, document.querySelectorAll('#trophy-list .trophy-card').length, state);
  renderRoadmap($('#roadmap'), ctx.roadmap, trophies, state);
  renderNextUp($('#next-up'), trophies, state);
  renderHundred($('#hundred'), checklist, state);
}

/** The current checklist filter/sort options, read from the toolbar controls. */
function currentOptions() {
  return {
    query: $('#search').value,
    sort: $('#sort').value,
    spoilersOn: $('#spoilers').checked,
    onlyMissing: $('#only-missing').checked,
  };
}

/** Open a trophy's detail panel by name (used by "Open guide" buttons and ?trophy=). */
function openGuide(ctx, name) {
  const trophy = ctx.trophies.find((t) => t.name === name);
  if (!trophy) return;
  showView('checklist');
  renderTrophyDetail($('#trophy-detail'), trophy, ctx.state, currentOptions().spoilersOn);
}

async function main() {
  const { trophies, roadmap, checklist } = await loadData();
  const { state, demo } = loadState();
  const ctx = { trophies, roadmap, checklist, state, demo };

  $('#hidden-count').textContent = String(trophies.filter((t) => t.hidden).length);
  $('#spoilers').checked = params.get('spoilers') === 'on';

  renderMissables($('#missables'), trophies);
  showView(initialView());
  refresh(ctx);

  // Tabs.
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => showView(tab.dataset.view));
  });

  // Toolbar: search, sort, spoilers and "not earned yet" re-render the list only.
  $('#search').addEventListener('input', () => {
    renderTrophyList($('#trophy-list'), trophies, state, currentOptions());
    $('#list-hint').textContent = listHint(trophies, document.querySelectorAll('#trophy-list .trophy-card').length, state);
  });
  $('#sort').addEventListener('change', () => {
    renderTrophyList($('#trophy-list'), trophies, state, currentOptions());
  });
  $('#spoilers').addEventListener('change', () => {
    renderTrophyList($('#trophy-list'), trophies, state, currentOptions());
    renderTrophyDetail($('#trophy-detail'), null, state, currentOptions().spoilersOn);
  });
  $('#only-missing').addEventListener('change', () => {
    renderTrophyList($('#trophy-list'), trophies, state, currentOptions());
    $('#list-hint').textContent = listHint(trophies, document.querySelectorAll('#trophy-list .trophy-card').length, state);
  });

  // Export progress as JSON.
  $('#export').addEventListener('click', () => {
    downloadJson('leonida-trophy-atlas-progress.json', exportState(state, trophies.length));
  });

  // One delegated listener covers the whole page: earned ticks, guide buttons,
  // 100% ticks, detail close and note typing — so re-renders never orphan a handler.
  document.addEventListener('click', (event) => {
    const earnBox = event.target.closest('[data-earn]');
    if (earnBox) {
      toggleEarned(state, earnBox.dataset.earn);
      saveState(state, demo);
      refresh(ctx);
      return;
    }
    const guideButton = event.target.closest('[data-guide]');
    if (guideButton) {
      openGuide(ctx, guideButton.dataset.guide);
      return;
    }
    const hundredBox = event.target.closest('[data-hundred]');
    if (hundredBox) {
      toggleHundred(state, hundredBox.dataset.hundred);
      saveState(state, demo);
      refresh(ctx);
      return;
    }
    if (event.target.closest('[data-close-detail]')) {
      renderTrophyDetail($('#trophy-detail'), null, state, currentOptions().spoilersOn);
    }
  });

  // Notes save as the player types (debounced so each keystroke is not a write).
  let noteTimer = null;
  document.addEventListener('input', (event) => {
    const area = event.target.closest('[data-note]');
    if (!area) return;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => {
      setNote(state, area.dataset.note, area.value);
      saveState(state, demo);
    }, 400);
  });

  // Deep link: ?trophy=<exact name> opens that trophy's guide on load.
  const wanted = params.get('trophy');
  if (wanted) openGuide(ctx, wanted);
}

main().catch((error) => {
  document.querySelector('main').insertAdjacentHTML(
    'afterbegin',
    `<p class="empty">The guide data could not be loaded (${error.message}). Serve the app over HTTP (node serve.ts) rather than opening index.html from disk.</p>`,
  );
});

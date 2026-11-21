// Leonida Trophy Atlas — roadmap and 100% views.
//
// The roadmap is the six-stage plan from app/data/roadmap.json; the 100% page is
// the sixteen-item checklist from app/data/checklist100.json. Both show progress
// computed from the player's own state, and the Next-up planner answers the only
// question that matters between sessions: "what should I do next?"

import { esc, gradeChip } from './trophyViews.js';
import { isEarned, isHundredDone } from './store.js';

/** "Stage 2 — The story" style heading for a stage number. */
function stageTitle(stage, trophiesByName) {
  const first = trophiesByName.get(stage.trophies?.[0] ?? '');
  return first ? `Stage ${stage.n} — ${stage.title}` : `Stage ${stage.n} — ${stage.title}`;
}

/**
 * Render the roadmap intro plus its six stages. Each stage shows its trophies
 * (linked to their guides), its timing, its tip, and a progress bar built from
 * the player's earned trophies.
 */
export function renderRoadmap(container, roadmap, trophies, state) {
  const byName = new Map(trophies.map((t) => [t.name, t]));
  const stages = roadmap.stages.map((stage) => {
    const names = stage.trophies ?? [];
    const done = names.filter((name) => isEarned(state, name)).length;
    const pct = names.length === 0 ? 100 : Math.round((done / names.length) * 100);
    const chips = names.map((name) => {
      const trophy = byName.get(name);
      const earned = isEarned(state, name);
      return `<li><button type="button" class="stage-trophy${earned ? ' is-earned' : ''}" data-guide="${esc(name)}" title="${trophy ? esc(trophy.description) : ''}">${earned ? '✓ ' : ''}${esc(name)}</button></li>`;
    }).join('\n');
    return `
<article class="stage">
  <header class="stage-head">
    <h3>${esc(stageTitle(stage, byName))}</h3>
    <span class="stage-when">${esc(stage.when ?? '')}</span>
  </header>
  <p>${esc(stage.body ?? '')}</p>
  ${stage.tip ? `<p class="tip"><strong>Tip:</strong> ${esc(stage.tip)}</p>` : ''}
  <div class="stage-progress">
    <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
    <span>${done} / ${names.length} trophies${names.length === 0 ? ' — preparation, no trophies' : ''}</span>
  </div>
  ${names.length > 0 ? `<ul class="stage-trophies">${chips}</ul>` : ''}
</article>`;
  }).join('\n');

  container.innerHTML = `
<h2>${esc(roadmap.title ?? 'Roadmap to the Platinum')}</h2>
<p class="lede">${esc(roadmap.intro ?? '')}</p>
${stages}`;
}

/**
 * The Next-up planner: the five most useful uneared trophies right now — the
 * earliest roadmap stage first, easiest within a stage — each with one line
 * saying why it is next. The Platinum itself is never suggested; it pops last.
 */
export function renderNextUp(container, trophies, state) {
  const pool = trophies
    .filter((t) => !isEarned(state, t.name) && t.grade !== 'platinum')
    .sort((a, b) => (a.stage - b.stage) || (a.difficulty - b.difficulty) || a.name.localeCompare(b.name, 'en'))
    .slice(0, 5);
  if (pool.length === 0) {
    container.innerHTML = `
<aside class="next-up">
  <h2>Next up</h2>
  <p>Everything is earned except the Platinum itself — check the 100% page for the
  last cleanup items, then enjoy the credits.</p>
</aside>`;
    return;
  }
  const rows = pool.map((trophy) => `
<li>
  <button type="button" class="next-up-item" data-guide="${esc(trophy.name)}">
    <span class="next-up-name">${esc(trophy.name)}</span>
    <span class="next-up-why">Stage ${trophy.stage} &middot; ${esc(trophy.time ?? '')} &middot; ${esc(trophy.kind)}</span>
  </button>
  ${gradeChip(trophy)}
</li>`).join('\n');
  container.innerHTML = `
<aside class="next-up">
  <h2>Next up — do these first</h2>
  <p>Earliest stage first, easiest within a stage. Tap any of them to open its guide.</p>
  <ol class="next-up-list">${rows}</ol>
</aside>`;
}

// ---------------------------------------------------------------- 100% page

/** One 100% item: a tick box, its title, its target and the trophy it feeds. */
function hundredItem(item, state) {
  const done = isHundredDone(state, item.id);
  const target = typeof item.target === 'number'
    ? `${item.target.toLocaleString('en-US')} ${esc(item.unit ?? '')}`
    : esc(item.unit ?? '');
  const trophyNames = (item.trophies ?? []).join(', ');
  return `
<li class="hundred-item${done ? ' is-done' : ''}">
  <label class="hundred-check">
    <input type="checkbox" data-hundred="${esc(item.id)}"${done ? ' checked' : ''}>
    <span class="hundred-title">${esc(item.title)}</span>
    <span class="hundred-target">${target}</span>
  </label>
  <p>${esc(item.detail ?? '')}</p>
  ${trophyNames ? `<p class="hundred-feeds">Feeds: ${esc(trophyNames)}</p>` : ''}
</li>`;
}

/**
 * Render the 100% completion checklist with its own progress bar. Progress
 * here is items ticked, not the in-game counters — the counts in each item are
 * the numbers PlayStation tracks, and the tick is the player's own record that
 * the game says it is done.
 */
export function renderHundred(container, checklist, state) {
  const items = checklist.items ?? [];
  const done = items.filter((item) => isHundredDone(state, item.id)).length;
  const pct = items.length === 0 ? 0 : Math.round((done / items.length) * 100);
  container.innerHTML = `
<h2>${esc(checklist.title ?? '100% Completion checklist')}</h2>
<p class="lede">${esc(checklist.intro ?? '')}</p>
<div class="progress-strip">
  <div class="progress-label">
    <strong>${done} / ${items.length} items done</strong>
    <span>Tick an item when the game says it is done.</span>
  </div>
  <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
</div>
<ol class="hundred-list">${items.map((item) => hundredItem(item, state)).join('\n')}</ol>`;
}

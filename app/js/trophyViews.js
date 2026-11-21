// Leonida Trophy Atlas — trophy views.
//
// Renders the checklist grid, the per-trophy detail panel and the Missables card.
// All text comes from the data files (app/data/trophies.json); this module only
// decides how it is laid out, filtered and sorted.

import { getNote, isEarned } from './store.js';

const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
const DIFFICULTY_LABEL = { 1: 'Easy', 2: 'Moderate', 3: 'Hard', 4: 'Very hard' };

/** Escape text for insertion into HTML. Data is trusted, but names contain quotes and apostrophes. */
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** "1".."4" plus a word, e.g. "2 / 4 — Moderate". */
export function difficultyText(level) {
  const n = Number(level) || 1;
  return `${n} / 4 — ${DIFFICULTY_LABEL[n] ?? 'Moderate'}`;
}

/** The small grade chip: a coloured dot plus the grade word. */
function gradeChip(trophy) {
  return `<span class="grade grade-${esc(trophy.grade)}">${esc(trophy.grade)}</span>`;
}

/** Badges for a trophy: Hidden, Missable, and a count target when it has one. */
function badges(trophy) {
  const parts = [];
  if (trophy.hidden) parts.push('<span class="badge badge-hidden">Hidden</span>');
  if (trophy.missable) parts.push('<span class="badge badge-missable">Missable</span>');
  if (typeof trophy.count === 'number') {
    parts.push(`<span class="badge badge-count">× ${trophy.count.toLocaleString('en-US')}</span>`);
  }
  return parts.join(' ');
}

/**
 * One trophy card. A hidden trophy with spoilers off is rendered masked: its
 * name and description are replaced by a placeholder, but the card still shows
 * its grade and stage so the list's shape stays honest.
 */
export function trophyCard(trophy, state, spoilersOn) {
  const earned = isEarned(state, trophy.name);
  const masked = trophy.hidden && !spoilersOn;
  const title = masked ? 'Hidden trophy' : trophy.name;
  const description = masked
    ? 'Enable “Show spoiler trophies” to reveal this one — it is hidden on PlayStation until it pops.'
    : trophy.description;
  const note = getNote(state, trophy.name);
  return `
<article class="trophy-card${earned ? ' is-earned' : ''}${masked ? ' is-masked' : ''}" data-name="${esc(trophy.name)}">
  <label class="trophy-check">
    <input type="checkbox" data-earn="${esc(trophy.name)}"${earned ? ' checked' : ''}>
    <span class="visually-hidden">Mark ${esc(title)} as earned</span>
  </label>
  <div class="trophy-body">
    <h3>${esc(title)}</h3>
    <p class="trophy-desc">${esc(description)}</p>
    <p class="trophy-meta">${gradeChip(trophy)} ${badges(trophy)}
      <span class="meta-item">Stage ${trophy.stage}</span>
      <span class="meta-item">${esc(trophy.time ?? '')}</span>
      <span class="meta-item">Difficulty ${esc(difficultyText(trophy.difficulty))}</span>
    </p>
    ${note ? `<p class="trophy-note">Your note: ${esc(note)}</p>` : ''}
    <button type="button" class="btn btn-small" data-guide="${esc(trophy.name)}"${masked ? ' disabled' : ''}>
      ${masked ? 'Guide hidden' : 'Open guide'}
    </button>
  </div>
</article>`;
}

/**
 * Filter and sort the trophy list for the checklist view.
 * `options`: { query, sort, spoilersOn, onlyMissing }.
 * Search matches the name, the description and the "when" line. Sorting by name
 * is a plain alphabetical sort; "default" keeps the data file's order, which is
 * grouped by roadmap stage.
 */
export function filterTrophies(trophies, state, options) {
  const query = (options.query ?? '').trim().toLowerCase();
  let list = trophies.filter((trophy) => {
    if (options.onlyMissing && isEarned(state, trophy.name)) return false;
    if (!query) return true;
    const haystack = `${trophy.name} ${trophy.description} ${trophy.when ?? ''}`.toLowerCase();
    return haystack.includes(query);
  });
  switch (options.sort) {
    case 'name':
      list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'en'));
      break;
    case 'difficulty':
      list = [...list].sort((a, b) => (a.difficulty - b.difficulty) || a.name.localeCompare(b.name, 'en'));
      break;
    case 'grade':
      list = [...list].sort((a, b) => (GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade]) || a.name.localeCompare(b.name, 'en'));
      break;
    default:
      break;
  }
  return list;
}

/** Render the whole checklist grid into `container`. Returns how many cards were shown. */
export function renderTrophyList(container, trophies, state, options) {
  const list = filterTrophies(trophies, state, options);
  container.innerHTML = list.length === 0
    ? '<p class="empty">No trophies match that search. Clear the search box or untick “Not earned yet”.</p>'
    : list.map((trophy) => trophyCard(trophy, state, options.spoilersOn)).join('\n');
  return list.length;
}

/** A one-line summary of what the list is showing, for the hint under the toolbar. */
export function listHint(trophies, shown, state) {
  const hidden = trophies.filter((t) => t.hidden).length;
  const earned = state.earned.length;
  return `Showing ${shown} of ${trophies.length} trophies — ${earned} earned. ${hidden} are hidden on PlayStation; tick “Show spoiler trophies” to reveal them.`;
}

// ---------------------------------------------------------------- detail

/** The numbered steps of a guide, as an ordered list. */
function stepsList(steps) {
  if (!Array.isArray(steps) || steps.length === 0) return '';
  return `<ol class="steps">${steps.map((step) => `<li>${esc(step)}</li>`).join('\n')}</ol>`;
}

/** The guide's sources, as links where a URL is given. */
function sourcesList(sources) {
  if (!Array.isArray(sources) || sources.length === 0) return '';
  const items = sources.map((source) => {
    if (source.url) return `<li><a href="${esc(source.url)}" target="_blank" rel="noopener">${esc(source.name)}</a></li>`;
    return `<li>${esc(source.name)}</li>`;
  }).join('\n');
  return `<ul class="sources">${items}</ul>`;
}

/**
 * The full detail panel for one trophy: name, description, grade and badges,
 * difficulty and time, when it can be earned, the guide text, numbered steps,
 * the tip, the sources, and a notes box that saves as the player types.
 * Hidden trophies stay masked here too unless spoilers are on.
 */
export function renderTrophyDetail(panel, trophy, state, spoilersOn) {
  if (!trophy) {
    panel.hidden = true;
    panel.innerHTML = '';
    return;
  }
  const masked = trophy.hidden && !spoilersOn;
  const earned = isEarned(state, trophy.name);
  panel.hidden = false;
  panel.innerHTML = `
  <button type="button" class="btn btn-small detail-close" data-close-detail>Close guide</button>
  <h2>${masked ? 'Hidden trophy' : esc(trophy.name)}</h2>
  <p class="detail-desc">${masked ? 'This trophy is hidden on PlayStation. Enable “Show spoiler trophies” to read its guide.' : esc(trophy.description)}</p>
  <p class="trophy-meta">${gradeChip(trophy)} ${badges(trophy)}
    <span class="meta-item">Stage ${trophy.stage}</span>
    <span class="meta-item">${esc(trophy.time ?? '')}</span>
    <span class="meta-item">Difficulty ${esc(difficultyText(trophy.difficulty))}</span>
    <span class="meta-item">${earned ? 'Earned ✓' : 'Not earned yet'}</span>
  </p>
  ${masked ? '' : `
  <h3>When</h3>
  <p>${esc(trophy.when ?? '')}</p>
  <h3>How to earn it</h3>
  <p>${esc(trophy.guide ?? '')}</p>
  <h3>Steps</h3>
  ${stepsList(trophy.steps)}
  ${trophy.tips ? `<h3>Tip</h3><p class="tip">${esc(trophy.tips)}</p>` : ''}
  <h3>Sources</h3>
  ${sourcesList(trophy.sources)}
  <h3>Your note</h3>
  <label class="note-box">
    <span class="visually-hidden">Your note for ${esc(trophy.name)}</span>
    <textarea data-note="${esc(trophy.name)}" rows="3" placeholder="e.g. “Race won on 2nd try — use the Comet, not the bike.”">${esc(getNote(state, trophy.name))}</textarea>
  </label>
  <p class="hint">Notes save automatically in this browser.</p>`}
  `;
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------------------------------------------------------------- missables

/**
 * The Missables card: the one trophy that can actually be missed, plus the one
 * time-sensitive strand. It sits above the grid so a new player sees it before
 * starting Chapter 1.
 */
export function renderMissables(container, trophies) {
  const meditation = trophies.find((t) => t.name === 'Positive Mental Attitude');
  const yago = trophies.find((t) => t.name === 'Strangers & Freaks');
  container.innerHTML = `
<aside class="missables" aria-label="Missable content">
  <h2>⚠ Missables — read before you start</h2>
  <p>There is exactly <strong>one missable trophy</strong> in the whole list, and one
  time-sensitive strand. Everything else stays open after the credits.</p>
  <div class="missables-grid">
    <div>
      <h3>${meditation ? esc(meditation.name) : 'Positive Mental Attitude'}</h3>
      <p>${meditation ? esc(meditation.when) : ''}</p>
      <p>In Chapter 1, after Lucia is home, check the kitchen in the morning and follow
      her to the balcony of Jason's house to meditate. Keep a manual save from the start
      of Chapter 1 until this trophy pops — there is no mission replay to fall back on.</p>
      ${meditation ? `<button type="button" class="btn btn-small" data-guide="${esc(meditation.name)}">Open its guide</button>` : ''}
    </div>
    <div>
      <h3>Race Against Yago — time-sensitive</h3>
      <p>In Chapter 3, Yago's street race carries an hourglass icon and counts toward
      ${yago ? esc(yago.name) : 'Strangers & Freaks'}. Save first, then race the moment it
      appears — if the hourglass is showing, stop what you are doing and go.</p>
      <p>Losing the race is fine if you reload the save; moving on past it is not.</p>
      ${yago ? `<button type="button" class="btn btn-small" data-guide="${esc(yago.name)}">Open its guide</button>` : ''}
    </div>
  </div>
</aside>`;
}

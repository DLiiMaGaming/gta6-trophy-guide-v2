// Leonida Trophy Atlas v2 — the trophy checklist: cards with step-by-step guides,
// the filters and sort, the progress header, the Next-up planner and the missables
// list. All rendering is DOM building; no HTML strings, so a trophy name can never
// break the page.

/** "Bronze" from "bronze". */
export function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

/** "Story" from "story"; the data's kind values, in display words. */
export function kindLabel(kind) {
  return { story: 'Story', collectible: 'Collectible', activity: 'Activity', online: 'Online' }[kind] ?? kind;
}

/** Difficulty 1-5 as five dots, filled to the level, with a word beside it. */
export function difficultyLabel(level) {
  const word = ['—', 'Easy', 'Straightforward', 'Tricky', 'Hard', 'Long grind'][level] ?? '—';
  return `${'●'.repeat(level)}${'○'.repeat(5 - level)} ${word}`;
}

/** One source as a link when it has a URL, or plain text when it is named only. */
function sourceParts(sources) {
  if (!sources || sources.length === 0) return { label: 'Sources: official trophy list.', parts: [] };
  return {
    label: 'Sources: ',
    parts: sources.map((s) => (s.url ? { text: s.name, url: s.url } : { text: s.name })),
  };
}

/** The detail block of one open card: steps, tip, facts, sources and the reader's notes. */
function buildDetail(trophy, state, callbacks) {
  const detail = document.createElement('div');
  detail.className = 'trophy-detail';

  if (Array.isArray(trophy.steps) && trophy.steps.length > 0) {
    const steps = document.createElement('ol');
    steps.className = 'detail-steps';
    trophy.steps.forEach((step) => {
      const li = document.createElement('li');
      li.textContent = step;
      steps.append(li);
    });
    detail.append(steps);
  }

  if (trophy.tips) {
    const tip = document.createElement('p');
    tip.className = 'detail-tip';
    tip.textContent = `Tip: ${trophy.tips}`;
    detail.append(tip);
  }

  const facts = document.createElement('p');
  facts.className = 'detail-facts';
  const bits = [];
  if (trophy.when) bits.push(`When: ${trophy.when}`);
  if (typeof trophy.difficulty === 'number') bits.push(`Difficulty: ${difficultyLabel(trophy.difficulty)}`);
  if (trophy.time) bits.push(`Time: ${trophy.time}`);
  if (trophy.missable) bits.push('Potentially missable — keep a Chapter 1 save');
  facts.textContent = bits.join(' · ');
  detail.append(facts);

  const src = document.createElement('p');
  src.className = 'sources';
  const built = sourceParts(trophy.sources);
  if (built.parts.length === 0) {
    src.textContent = built.label;
  } else {
    src.append(document.createTextNode(built.label));
    built.parts.forEach((part, i) => {
      if (i > 0) src.append(document.createTextNode(' · '));
      if (part.url) {
        const link = document.createElement('a');
        link.href = part.url;
        link.textContent = part.text;
        link.rel = 'noopener';
        src.append(link);
      } else {
        src.append(document.createTextNode(part.text));
      }
    });
  }
  detail.append(src);

  const noteLabel = document.createElement('label');
  noteLabel.className = 'note-label';
  noteLabel.textContent = 'Your notes';
  const note = document.createElement('textarea');
  note.className = 'note-input';
  note.rows = 2;
  note.placeholder = 'Where you found it, what worked, what to remember…';
  note.value = state.notes.get(trophy.name) ?? '';
  note.setAttribute('aria-label', `Notes for ${trophy.name}`);
  note.addEventListener('input', () => callbacks.onNote(trophy.name, note.value));
  noteLabel.append(note);
  detail.append(noteLabel);

  return detail;
}

/** One trophy's card: checkbox, name, official description, badges, guide and detail. */
export function buildTrophyCard(trophy, state, callbacks) {
  const card = document.createElement('article');
  card.className = 'trophy-card' + (state.earned.has(trophy.name) ? ' earned' : '');
  card.dataset.trophy = trophy.name;

  const top = document.createElement('div');
  top.className = 'card-top';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = state.earned.has(trophy.name);
  box.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
  box.addEventListener('change', () => callbacks.onToggleEarned(trophy.name, box.checked, card));
  top.append(box);

  const titleWrap = document.createElement('div');
  const masked = state.spoilersHidden && trophy.hidden && !state.earned.has(trophy.name);
  if (masked) {
    const mask = document.createElement('div');
    mask.className = 'spoiler-mask';
    mask.textContent = 'Hidden trophy — earn it (or turn spoilers off) to reveal its name and description.';
    titleWrap.append(mask);
  } else {
    const nameEl = document.createElement('div');
    nameEl.className = 'trophy-name';
    nameEl.textContent = trophy.name;
    const descEl = document.createElement('p');
    descEl.className = 'trophy-desc';
    descEl.textContent = trophy.description;
    titleWrap.append(nameEl, descEl);
  }
  top.append(titleWrap);
  card.append(top);

  const badges = document.createElement('div');
  badges.className = 'badges';
  const gradeBadge = document.createElement('span');
  gradeBadge.className = `badge ${trophy.grade}`;
  gradeBadge.textContent = gradeLabel(trophy.grade);
  badges.append(gradeBadge);
  const kindBadge = document.createElement('span');
  kindBadge.className = 'badge kind';
  kindBadge.textContent = kindLabel(trophy.kind);
  badges.append(kindBadge);
  if (trophy.hidden) {
    const hiddenBadge = document.createElement('span');
    hiddenBadge.className = 'badge hidden-flag';
    hiddenBadge.textContent = 'Hidden on PS5';
    badges.append(hiddenBadge);
  }
  if (trophy.missable) {
    const missBadge = document.createElement('span');
    missBadge.className = 'badge missable';
    missBadge.textContent = 'Potentially missable';
    badges.append(missBadge);
  }
  card.append(badges);

  if (typeof trophy.count === 'number') {
    const countEl = document.createElement('p');
    countEl.className = 'count-line';
    countEl.textContent = `Target: ${trophy.count.toLocaleString('en-US')}`;
    card.append(countEl);
  }

  if (!masked) {
    const guideEl = document.createElement('p');
    guideEl.className = 'trophy-guide';
    guideEl.textContent = trophy.guide;
    card.append(guideEl);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'detail-toggle';
    const open = state.openDetail.has(trophy.name);
    toggle.textContent = open ? 'Hide steps & sources' : 'Show steps & sources';
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.addEventListener('click', () => callbacks.onToggleDetail(trophy.name, card, toggle));
    card.append(toggle);
    if (open) card.append(buildDetail(trophy, state, callbacks));
  }
  return card;
}

/** Whether a trophy passes the current search, kind, grade and earned-only filters. */
export function trophyMatches(trophy, filters) {
  const query = filters.search.trim().toLowerCase();
  if (query) {
    const hay = `${trophy.name} ${trophy.description} ${trophy.guide} ${(trophy.steps ?? []).join(' ')}`.toLowerCase();
    if (!hay.includes(query)) return false;
  }
  if (filters.kind === 'missable') {
    if (!trophy.missable) return false;
  } else if (filters.kind === 'online') {
    return false; // No online trophies: all 55 are single-player.
  } else if (filters.kind !== 'all' && trophy.kind !== filters.kind) {
    return false;
  }
  if (filters.grade !== 'all' && trophy.grade !== filters.grade) return false;
  if (filters.earnedOnly && !filters.earned.has(trophy.name)) return false;
  return true;
}

/** The checklist order for one sort: roadmap stage, grade, name, or hardest first. */
export function sortTrophies(trophies, sort) {
  const list = [...trophies];
  const gradeRank = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
  if (sort === 'grade') list.sort((a, b) => gradeRank[a.grade] - gradeRank[b.grade] || a.name.localeCompare(b.name));
  else if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'difficulty') list.sort((a, b) => (b.difficulty ?? 0) - (a.difficulty ?? 0) || a.stage - b.stage);
  else list.sort((a, b) => a.stage - b.stage);
  return list;
}

/** The header progress: earned count, percent, per-grade and per-kind breakdowns. */
export function renderProgress(state, els) {
  const total = state.trophies.length;
  const done = state.trophies.filter((t) => state.earned.has(t.name)).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  els.earnedCount.textContent = `${done} / ${total}`;
  els.earnedPercent.textContent = `${pct}% to the Platinum`;
  els.progressFill.style.width = `${pct}%`;
  const byGrade = ['platinum', 'gold', 'silver', 'bronze'].map((g) => {
    const have = state.trophies.filter((t) => t.grade === g && state.earned.has(t.name)).length;
    const all = state.trophies.filter((t) => t.grade === g).length;
    return `${gradeLabel(g)} ${have}/${all}`;
  });
  els.gradeCounts.textContent = byGrade.join(' · ');
  const byKind = ['story', 'collectible', 'activity'].map((k) => {
    const have = state.trophies.filter((t) => t.kind === k && state.earned.has(t.name)).length;
    const all = state.trophies.filter((t) => t.kind === k).length;
    return `${kindLabel(k)} ${have}/${all}`;
  });
  const missable = state.trophies.filter((t) => t.missable);
  const missableDone = missable.filter((t) => state.earned.has(t.name)).length;
  els.kindCounts.textContent = `${byKind.join(' · ')} · Missable ${missableDone}/${missable.length} · No online trophies`;
}

/** The checklist itself, in the current sort and filters. */
export function renderChecklist(state, els, callbacks) {
  els.list.replaceChildren();
  const filters = {
    search: els.search.value,
    kind: els.kindSelect.value,
    grade: els.gradeSelect.value,
    earnedOnly: els.earnedOnlyBox.checked,
    earned: state.earned,
  };
  const shown = sortTrophies(state.trophies, els.sortSelect.value).filter((t) => trophyMatches(t, filters));
  shown.forEach((t) => els.list.append(buildTrophyCard(t, state, callbacks)));
  els.emptyNote.hidden = shown.length !== 0;
  if (els.kindSelect.value === 'online') {
    els.filterNote.textContent = 'No online trophies: all 55 trophies are single-player, so this filter is empty on purpose.';
  } else if (shown.length === 0) {
    els.filterNote.textContent = 'No trophies match these filters. Clear the search or change a filter.';
  } else {
    els.filterNote.textContent = `Showing ${shown.length} of ${state.trophies.length} trophies.`;
  }
}

/** The missables section: every trophy flagged potentially missable, with its card. */
export function renderMissables(state, els, callbacks) {
  els.missableList.replaceChildren();
  state.trophies.filter((t) => t.missable).forEach((t) => els.missableList.append(buildTrophyCard(t, state, callbacks)));
}

/** The Next-up planner: the next unearned trophy in roadmap order, plus the two after it. */
export function renderPlanner(state, els, callbacks) {
  const ordered = sortTrophies(state.trophies, 'stage');
  const next = ordered.filter((t) => !state.earned.has(t.name));
  els.nextUp.replaceChildren();
  els.nextAfter.replaceChildren();
  if (next.length === 0) {
    const done = document.createElement('p');
    done.textContent = 'Every trophy is earned — the Platinum should already be yours. Congratulations, Leonida Legend.';
    els.nextUp.append(done);
    return;
  }
  const first = next[0];
  const heading = document.createElement('h3');
  heading.textContent = `${first.name} — ${gradeLabel(first.grade)} · Stage ${first.stage}`;
  const guide = document.createElement('p');
  guide.textContent = first.guide;
  const why = document.createElement('p');
  why.className = 'next-why';
  why.textContent = first.when ?? '';
  const jump = document.createElement('p');
  const link = document.createElement('a');
  link.href = `#checklist`;
  link.textContent = 'Open its card in the checklist';
  link.addEventListener('click', () => {
    state.openDetail.add(first.name);
    renderChecklist(state, els, callbacks);
  });
  jump.append(link);
  els.nextUp.append(heading, guide, why, jump);
  next.slice(1, 3).forEach((t) => {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = t.name;
    li.append(strong, document.createTextNode(` — ${gradeLabel(t.grade)} · Stage ${t.stage}`));
    els.nextAfter.append(li);
  });
}

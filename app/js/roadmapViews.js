// Leonida Trophy Atlas v2 — the roadmap to the Platinum (with per-stage progress)
// and the 100% completion checklist. Both are built from the data files, and both
// re-render from the same state the checklist uses.

/** The roadmap's six stages, each with its trophies, its timing and its tip. */
export function renderRoadmap(state, els) {
  els.intro.textContent = state.roadmap.intro;
  els.stages.replaceChildren();
  state.roadmap.stages.forEach((stage) => {
    const li = document.createElement('li');
    li.className = 'roadmap-stage';
    const heading = document.createElement('h3');
    heading.textContent = `Stage ${stage.n} — ${stage.title}`;
    const when = document.createElement('span');
    when.className = 'stage-when';
    when.textContent = stage.when;
    heading.append(when);
    const have = stage.trophies.filter((name) => state.earned.has(name)).length;
    const count = document.createElement('span');
    count.className = 'stage-count';
    count.textContent = stage.trophies.length === 0 ? '' : `${have}/${stage.trophies.length} earned`;
    heading.append(count);
    const body = document.createElement('p');
    body.textContent = stage.body;
    li.append(heading, body);
    if (stage.tip) {
      const tip = document.createElement('p');
      tip.className = 'stage-tip';
      tip.textContent = `Tip: ${stage.tip}`;
      li.append(tip);
    }
    const chips = document.createElement('ul');
    chips.className = 'roadmap-trophies';
    stage.trophies.forEach((name) => {
      const chip = document.createElement('li');
      chip.textContent = name + (state.earned.has(name) ? ' ✓' : '');
      if (state.earned.has(name)) chip.className = 'done';
      chips.append(chip);
    });
    li.append(chips);
    els.stages.append(li);
  });
}

/** The 100% checklist: every requirement the in-game list tracks, with a tick box. */
export function renderHundred(state, els, onToggleHundred) {
  els.intro.textContent = state.hundred.intro;
  els.list.replaceChildren();
  state.hundred.items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'hundred-item' + (state.hundredDone.has(item.id) ? ' done' : '');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = state.hundredDone.has(item.id);
    box.setAttribute('aria-label', `Mark ${item.title} as done`);
    box.addEventListener('change', () => onToggleHundred(item.id, box.checked));
    li.append(box);
    const wrap = document.createElement('div');
    const heading = document.createElement('h3');
    heading.textContent = item.title;
    if (typeof item.target === 'number') {
      const target = document.createElement('span');
      target.className = 'hundred-target';
      target.textContent = item.unit ? `${item.target.toLocaleString('en-US')} ${item.unit}` : `${item.target.toLocaleString('en-US')}`;
      heading.append(target);
    } else if (item.unit) {
      const target = document.createElement('span');
      target.className = 'hundred-target';
      target.textContent = item.unit;
      heading.append(target);
    }
    const detail = document.createElement('p');
    detail.textContent = item.detail;
    wrap.append(heading, detail);
    if (Array.isArray(item.trophies) && item.trophies.length > 0) {
      const feeds = document.createElement('p');
      feeds.className = 'hundred-feeds';
      feeds.textContent = `Feeds: ${item.trophies.join(', ')}`;
      wrap.append(feeds);
    }
    li.append(wrap);
    els.list.append(li);
  });
  renderHundredProgress(state, els);
}

/** The 100% checklist's own progress bar. */
export function renderHundredProgress(state, els) {
  const total = state.hundred.items.length;
  const done = state.hundred.items.filter((item) => state.hundredDone.has(item.id)).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  els.count.textContent = `${done} / ${total}`;
  els.percent.textContent = `${pct}% of the 100% checklist`;
  els.fill.style.width = `${pct}%`;
}

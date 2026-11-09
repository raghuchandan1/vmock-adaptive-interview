// Dashboard replica, Practice page: which sidebar entry is open (from the path), the Mock Interviews sub-tabs (?tab=),
// the static tile library, and each adaptive entry's past interviews: AI Interviewer under Previously Recorded
// (?view=recorded), CV Deep Dive on its own page.
(() => {
  const entry = location.pathname.endsWith('/cv-deep-dive') ? 'cv' : 'mock';
  const recorded = entry === 'mock' && new URLSearchParams(location.search).get('view') === 'recorded';
  document.querySelectorAll('[data-view]').forEach((a) => a.setAttribute('aria-selected', String((a.dataset.view === 'recorded') === recorded)));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  document.querySelectorAll('[data-entry]').forEach((a) => { if (a.dataset.entry === entry && !recorded) a.setAttribute('aria-current', 'page'); });
  document.querySelector(`[data-entry-panel="${recorded ? 'recorded' : entry}"]`).hidden = false;
  document.title = `${recorded ? 'Previously Recorded' : entry === 'cv' ? 'CV Deep Dive' : 'Mock Interviews'} | VMock Dashboard`;

  // ---------- Mock Interviews sub-tabs ----------
  const TABS = ['library', 'recommended'];
  function showTab(tab) {
    if (!TABS.includes(tab)) tab = 'library';
    document.querySelectorAll('[data-tab]').forEach((a) => {
      a.setAttribute('aria-selected', String(a.dataset.tab === tab));
      if (a.dataset.tab === tab) a.parentElement.scrollLeft = a.offsetLeft - 16; // phones: the row scrolls; keep the open tab in view
    });
    document.querySelectorAll('[data-tab-panel]').forEach((p) => { p.hidden = p.dataset.tabPanel !== tab; });
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-tab]');
    if (!a) return;
    e.preventDefault();
    history.pushState(null, '', `?tab=${a.dataset.tab}`);
    showTab(a.dataset.tab);
  });
  addEventListener('popstate', () => showTab(new URLSearchParams(location.search).get('tab')));
  showTab(new URLSearchParams(location.search).get('tab'));

  // ---------- Static library (copy of the live page's Corporate Finance tiles) ----------
  const TILES = [
    ['Analyst, Financial Operations', 5, '8 - 10', true, '#cfe3f6'], ['Associate, Treasury', 5, '8 - 10', false, '#efe3cf'],
    ['Cash Operations Manager', 6, '10 - 12', false, '#e2e5ea'], ['Chief Financial Officer (CFO), Startup', 6, '10 - 12', true, '#f6ecd6'],
    ['Director, Cash Management', 6, '10 - 12', false, '#f3edd2'], ['Finance Manager, Digital Payments', 6, '10 - 12', false, '#d6e6ef'],
    ['Finance Manager, R&D', 6, '10 - 12', false, '#e4e9f0'], ['Financial Reporting Manager', 6, '10 - 12', false, '#d9e2f2'],
    ['Head, Financial Planning', 6, '10 - 12', false, '#e6eef6'], ['Investments Financial Analyst', 6, '10 - 12', false, '#dfe9e4'],
    ['Treasurer', 6, '10 - 12', false, '#ece6da'], ['Treasury Manager', 6, '10 - 12', false, '#dde4ef'],
  ];
  const tile = ([name, q, min, attempted, tint]) => `<div class="d-tile">
      <div class="d-tile-img" style="--tint:${tint}" aria-hidden="true"></div>
      <div class="d-tile-head"><strong title="${esc(name)}">${esc(name)}</strong><svg class="ic" aria-hidden="true"><use href="#i-bookmark"/></svg></div>
      <p>${q} Questions · ${min} min</p>${attempted ? '<span class="d-attempted">Attempted</span>' : ''}</div>`;
  document.querySelector('[data-tiles]').innerHTML = TILES.map(tile).join('');
  document.querySelector('[data-tiles="recommended"]').innerHTML = [TILES[1], TILES[4], TILES[10], TILES[11]].map(tile).join('');

  // ---------- Past adaptive interviews, split by entry (CV Deep Dive = the resume deep dive type) ----------
  (async () => {
    const box = document.querySelector(`[data-past="${entry}"]`);
    let list = [];
    try { list = (await (await fetch('/api/sessions')).json()).filter((x) => x.status === 'ended' && x.turns > 0 && !x.test_run); } catch (_) { return; }
    list = list.filter((x) => (x.interview_type === 'Back your resume') === (entry === 'cv'));
    const TYPE = { 'Recruiter screen': 'Screening round', 'Hiring manager': 'Hiring manager round', 'Back your resume': 'CV Deep Dive' };
    const date = (iso) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const row = (x) => `<a class="d-past-row" href="/interviews/adaptive/room?entry=${entry}&feedback=${encodeURIComponent(x.id)}">
        <span class="d-past-main"><strong>${esc(x.role || 'Practice interview')}</strong><span>${esc(TYPE[x.interview_type] || 'AI Interviewer')} · ${esc(date(x.created_at))} · ${x.turns} answer${x.turns === 1 ? '' : 's'}</span></span>
        <span class="d-past-cta">${x.has_feedback ? 'View Feedback' : 'Get Feedback'}<svg class="ic"><use href="#i-arrow"/></svg></span></a>`;
    box.innerHTML = `<div class="d-past-head"><h2 class="d-h">Your past interviews</h2>${list.length ? `<span>${list.length} interview${list.length === 1 ? '' : 's'}</span>` : ''}</div>
      ${list.length ? `<div class="d-past-list">${list.map(row).join('')}</div>` : '<p class="d-empty">No interviews yet. Your feedback shows up here after each one.</p>'}`;
  })();
})();

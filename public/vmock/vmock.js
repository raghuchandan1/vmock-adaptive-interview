// VMock replica: tab switching by ?tab= (as on VMock), and the sticky tab bar's flat look once scrolled.
(() => {
  const TABS = ['mock', 'case', 'technical', 'custom', 'adaptive'];

  function show(tab) {
    if (!TABS.includes(tab)) tab = 'custom';
    document.querySelectorAll('.vm-tabs [data-tab]').forEach((a) => a.setAttribute('aria-selected', String(a.dataset.tab === tab)));
    document.querySelectorAll('.vm-panel').forEach((p) => { p.hidden = p.dataset.panel !== tab; });
    window.scrollTo({ top: 0 });
  }

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-tab]');
    if (!link) return;
    e.preventDefault();
    history.pushState(null, '', `?tab=${link.dataset.tab}`);
    show(link.dataset.tab);
  });
  window.addEventListener('popstate', () => show(new URLSearchParams(location.search).get('tab')));
  show(new URLSearchParams(location.search).get('tab'));

  // Adaptive tab: finished interviews (npm test's scripted runs left out), newest first, each linking to its feedback.
  (async () => {
    const box = document.getElementById('pastWrap');
    if (!box) return;
    let list = [];
    try { list = (await (await fetch('/api/sessions')).json()).filter((x) => x.status === 'ended' && x.turns > 0 && !x.test_run); } catch (_) { return; }
    if (!list.length) return;
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const TYPE = { 'Recruiter screen': 'Screening round', 'Hiring manager': 'Hiring manager round', 'Back your resume': 'Resume deep dive' };
    const date = (iso) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const row = (x) => `<a class="vm-past-row" href="/vmock/adaptive-interview/room?feedback=${encodeURIComponent(x.id)}">
        <span class="vm-past-main"><strong>${esc(x.role || 'Practice interview')}</strong><span>${esc(TYPE[x.interview_type] || x.interview_type || 'Adaptive interview')} · ${esc(date(x.created_at))} · ${x.turns} answer${x.turns === 1 ? '' : 's'}</span></span>
        <span class="vm-past-cta">${x.has_feedback ? 'See feedback' : 'Get feedback'}<svg class="ic"><use href="#i-arrow"/></svg></span></a>`;
    const SHOW = 6;
    const render = (all) => {
      document.getElementById('pastList').innerHTML = (all ? list : list.slice(0, SHOW)).map(row).join('');
      document.getElementById('pastMore').hidden = all || list.length <= SHOW;
    };
    document.getElementById('pastCount').textContent = `${list.length} interview${list.length === 1 ? '' : 's'}`;
    document.getElementById('pastMore').addEventListener('click', () => render(true));
    render(false);
    box.hidden = false;
  })();

  const wrap = document.getElementById('tabsWrap');
  const onScroll = () => wrap.classList.toggle('stuck', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

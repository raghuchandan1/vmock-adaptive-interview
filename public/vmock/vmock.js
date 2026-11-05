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

  const wrap = document.getElementById('tabsWrap');
  const onScroll = () => wrap.classList.toggle('stuck', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

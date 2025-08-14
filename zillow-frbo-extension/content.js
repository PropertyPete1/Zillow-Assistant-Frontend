// content.js — Zillow search page collector (uses storage keys: api, skipAgents)
(function () {
  if (document.getElementById('frbo-collector')) return;

  const DEFAULTS = { api: 'https://zillow-assistant-backend.onrender.com', skipAgents: true };
  let cfg = { ...DEFAULTS };

  chrome.storage.sync.get(DEFAULTS).then(s => { cfg = { ...cfg, ...s }; init(); });

  function init() {
    if (!isSearchPage()) return;
    injectButton();
    new MutationObserver(() => ensureButton()).observe(document.body, { childList: true, subtree: true });
  }

  function isSearchPage() {
    const p = location.pathname;
    return /\/homes\//i.test(p) || /\/rentals\//i.test(p) || /\/b\/.*-rentals/i.test(p);
  }

  function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
  function normalizeUrl(u) {
    try { const x = new URL(u, location.href); x.hash=''; x.search=''; return x.toString(); }
    catch { return u; }
  }

  function detectAgentFromCard(card) {
    const t = (card.innerText || '').toLowerCase();
    const agent  = /listing agent|brokered by|property manager|managed by|realtor|brokerage/.test(t);
    const owner  = /for rent by owner|listed by owner|owner managed|message owner|landlord/.test(t);
    if (agent && !owner) return 'agent';
    if (owner && !agent) return 'owner';
    return 'unknown';
  }

  function collectVisibleRows() {
    const found = new Map();
    // prefer card-level detection
    $all('article, li').forEach(card => {
      const a = card.querySelector('a[href*="/homedetails/"]');
      if (!a) return;
      const url = normalizeUrl(a.href || a.getAttribute('href') || '');
      if (!url.includes('/homedetails/')) return;
      const tag = detectAgentFromCard(card);
      found.set(url, { url, _tag: tag });
    });
    // add any stray anchors
    $all('a[href*="/homedetails/"]').forEach(a => {
      const url = normalizeUrl(a.href || a.getAttribute('href') || '');
      if (!url.includes('/homedetails/')) return;
      if (!found.has(url)) found.set(url, { url, _tag: 'unknown' });
    });
    let rows = Array.from(found.values());
    if (cfg.skipAgents) rows = rows.filter(r => r._tag !== 'agent');
    return rows.map(r => ({ url: r.url, status: 'queued' }));
  }

  function ensureButton() { if (!document.getElementById('frbo-collector')) injectButton(); }

  function injectButton() {
    const btn = document.createElement('button');
    btn.id = 'frbo-collector';
    btn.className = 'frbo-collect-btn';
    btn.textContent = 'Collect visible results → Add to queue';
    btn.addEventListener('click', onCollectClick);
    document.documentElement.appendChild(btn);
  }

  async function onCollectClick() {
    try {
      const api = (cfg.api || '').replace(/\/+$/,'');
      if (!api) return toast('Set Backend URL in the popup first.', 'err');
      toast('Scanning page…', 'info');
      const rows = collectVisibleRows();
      if (!rows.length) return toast('No listings detected.', 'warn');

      const r = await fetch(`${api}/api/leads/ingest`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ rows })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast(`Queued ${rows.length} URL(s).`, 'ok');
    } catch (e) {
      console.error('[FRBO] ingest failed:', e);
      toast('Failed to queue. Check Backend URL.', 'err');
    }
  }

  function toast(msg, kind='ok') {
    let el = document.getElementById('frbo-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'frbo-toast';
      el.className = 'frbo-toast';
      document.documentElement.appendChild(el);
    }
    el.textContent = msg;
    el.setAttribute('data-kind', kind);
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2500);
  }
})();



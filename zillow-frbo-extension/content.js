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

// Listing page HUD for Mark Sent / Skip (proxied via background)
(function listingHud() {
  if (!/\/homedetails\//i.test(location.pathname)) return;
  if (document.getElementById('frbo-hud')) return;

  const hud = document.createElement('div');
  hud.id = 'frbo-hud';
  hud.style.cssText = `
    position: fixed; top: 14px; right: 14px; z-index: 2147483647;
    background: #111; color: #fff; border: 1px solid #444; border-radius: 10px;
    padding: 10px; width: 280px; font: 12px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  `;
  hud.innerHTML = `
    <div style="font-weight:600; margin-bottom:6px;">FRBO Helper</div>
    <label style="display:flex;align-items:center;gap:6px;margin:6px 0;">
      <input id="frbo-human" type="checkbox"> I am human
    </label>
    <div style="display:flex; gap:6px; margin-top:6px;">
      <button id="frbo-mark-sent" style="flex:1; background:#22c55e; border:0; color:#111; padding:6px 8px; border-radius:6px; cursor:pointer;">Mark Sent</button>
      <button id="frbo-skip" style="flex:1; background:#eab308; border:0; color:#111; padding:6px 8px; border-radius:6px; cursor:pointer;">Skip</button>
    </div>
    <div id="frbo-hud-note" style="margin-top:6px; color:#a3a3a3;">Send your message in Zillow, then click Mark Sent.</div>
  `;
  document.documentElement.appendChild(hud);

  const human = hud.querySelector('#frbo-human');
  const note  = hud.querySelector('#frbo-hud-note');

  function mustHuman() {
    if (!human.checked) {
      note.textContent = 'Please check "I am human" first.';
      note.style.color = '#fca5a5';
      return false;
    }
    note.style.color = '#a3a3a3';
    note.textContent = 'Logged. You can close this tab.';
    return true;
  }

  async function mark(status) {
    const url = location.href.split('#')[0].split('?')[0];
    const resp = await new Promise(res => {
      chrome.runtime.sendMessage({ type:'MARK_LEAD', url, status }, res);
    });
    if (!resp?.ok) {
      note.textContent = `Failed to mark: ${resp?.error || 'unknown'}`;
      note.style.color = '#fca5a5';
    } else {
      note.textContent = status === 'sent' ? 'Marked sent ✓' : 'Skipped ✓';
      note.style.color = '#a3a3a3';
      setTimeout(() => window.close(), 800);
    }
  }

  hud.querySelector('#frbo-mark-sent').addEventListener('click', () => {
    if (mustHuman()) mark('sent');
  });
  hud.querySelector('#frbo-skip').addEventListener('click', () => {
    if (mustHuman()) mark('skipped');
  });
})();



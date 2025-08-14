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

// Listing page HUD + auto-mark when clicking Zillow's Send button
(function listingHud() {
  let lastPath = location.pathname;
  let sentMarkedOnce = false;

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

  async function markRemote(status) {
    const url = location.href.split('#')[0].split('?')[0];
    try {
      const resp = await new Promise(res => {
        chrome.runtime.sendMessage({ type:'MARK_LEAD', url, status }, res);
      });
      if (!resp?.ok) throw new Error(resp?.error || 'mark failed');
      toast(status === 'sent' ? 'Marked sent ✓' : 'Skipped ✓', 'ok');
    } catch (e) {
      toast('Mark failed', 'err');
    }
  }

  function ensureHud() {
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
      <div style="display:flex; gap:6px; margin-top:6px;">
        <button id="frbo-mark-sent" style="flex:1; background:#22c55e; border:0; color:#111; padding:6px 8px; border-radius:6px; cursor:pointer;">Mark Sent</button>
        <button id="frbo-skip" style="flex:1; background:#eab308; border:0; color:#111; padding:6px 8px; border-radius:6px; cursor:pointer;">Skip</button>
      </div>
      <div id="frbo-hud-note" style="margin-top:6px; color:#a3a3a3;">Click Mark Sent after you send your message.</div>
    `;
    document.documentElement.appendChild(hud);
    hud.querySelector('#frbo-mark-sent').addEventListener('click', () => markRemote('sent'));
    hud.querySelector('#frbo-skip').addEventListener('click', () => markRemote('skipped'));
  }

  // Auto-mark when user clicks Zillow's "Send message" button
  function installAutoMark() {
    if (installAutoMark._installed) return;
    installAutoMark._installed = true;
    document.addEventListener('click', (ev) => {
      const target = ev.target && (ev.target.closest ? ev.target.closest('button, [role="button"]') : null);
      if (!target) return;
      const label = (target.textContent || target.getAttribute('aria-label') || '').trim();
      if (/^send message$/i.test(label)) {
        if (!sentMarkedOnce) {
          sentMarkedOnce = true;
          setTimeout(() => markRemote('sent'), 800); // allow Zillow to process
        }
      }
    }, true);
  }

  function tick() {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      sentMarkedOnce = false;
    }
    if (/\/homedetails\//i.test(location.pathname)) {
      ensureHud();
      installAutoMark();
    }
  }

  // Run periodically to handle SPA navigations
  setInterval(tick, 800);
  tick();
})();



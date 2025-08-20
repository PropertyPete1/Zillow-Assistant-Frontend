// popup.js — robust wiring with health check + strong status + console logs
(function () {
  const qs = (id) => document.getElementById(id);
  const status = qs('popupStatus');

  function showStatus(msg, kind = '') {
    status.textContent = msg;
    status.className = kind ? `status-${kind}` : '';
  }

  function log(...a) { console.log('[FRBO popup]', ...a); }

  // Elements
  const apiEl       = qs('apiInput');
  const capHourEl   = qs('capHour');
  const capDayEl    = qs('capDay');
  const countEl     = qs('count');
  const taUrlsEl    = qs('taUrls');
  const pasteCityEl = qs('pasteCity');
  const pastePriceEl= qs('pastePrice');
  const sheetUrlEl  = qs('sheetUrl');
  const sheetCountEl= qs('sheetCount');

  const btnSaveApi  = qs('btnSaveApi');
  const btnSaveCaps = qs('btnSaveCaps');
  const btnGetOpen  = qs('btnGetOpen');
  const btnPause    = qs('btnPause');
  const btnResume   = qs('btnResume');
  const btnSeed3    = qs('btnSeed3');
  const btnAddPasted= qs('btnAddPasted');
  const btnPullSheet= qs('btnPullSheet');

  // Helpers
  function normalizeBase(url) { return (url || '').trim().replace(/\/+$/,''); }
  async function getApi() {
    const s = await chrome.storage.sync.get({ api: 'https://zillow-assistant-backend.onrender.com' });
    return normalizeBase(s.api);
  }
  async function setApi(v) {
    const api = normalizeBase(v);
    await chrome.storage.sync.set({ api });
    return api;
  }

  async function apiRequest(url, options = {}) {
    for (let i = 0; i < 2; i++) {
      try {
        const r = await fetch(url, { ...options, headers: { 'Content-Type':'application/json', ...(options.headers||{}) }});
        if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
        const ct = r.headers.get('content-type') || '';
        return ct.includes('application/json') ? r.json() : r.text();
      } catch (e) {
        if (i === 1) throw e;
        await new Promise(res => setTimeout(res, 800 + Math.random()*400));
      }
    }
  }

  // Load saved values
  (async function init() {
    try {
      const s = await chrome.storage.sync.get({
        api: 'https://zillow-assistant-backend.onrender.com',
        capHour: 25,
        capDay: 75,
        sheetUrl: ''
      });
      apiEl.value = normalizeBase(s.api);
      capHourEl.value = s.capHour;
      capDayEl.value  = s.capDay;
      sheetUrlEl.value= s.sheetUrl;

      showStatus('Ready', '');
      log('Loaded settings:', s);
    } catch (e) {
      console.error(e);
      showStatus('Failed to load settings', 'red');
    }
  })();

  // Save URL + health check
  btnSaveApi.addEventListener('click', async () => {
    try {
      const api = await setApi(apiEl.value);
      showStatus('Checking backend…', 'yellow');
      await apiRequest(`${api}/api/leads/health`);
      showStatus('Backend URL saved & reachable ✓', 'green');
      log('Saved api =', api);
    } catch (e) {
      console.error(e);
      showStatus(`Save/health failed: ${e.message}`, 'red');
    }
  });

  // Save caps
  btnSaveCaps.addEventListener('click', async () => {
    try {
      const perHour = Math.max(1, parseInt(capHourEl.value) || 25);
      const perDay  = Math.max(1, parseInt(capDayEl.value)  || 75);
      await chrome.storage.sync.set({ capHour: perHour, capDay: perDay });
      chrome.runtime.sendMessage({ type:'SET_LIMITS', limits:{ perHour, perDay }});
      showStatus(`Caps saved: ${perHour}/${perDay}`, 'green');
      log('Caps saved', { perHour, perDay });
    } catch (e) {
      console.error(e);
      showStatus('Could not save caps', 'red');
    }
  });

  // Get & Open
  btnGetOpen.addEventListener('click', async () => {
    try {
      const api = await getApi();
      if (!api) return showStatus('Set backend URL first', 'red');
      const n = Math.max(1, Math.min(25, parseInt(countEl.value) || 10));
      showStatus('Fetching next batch…', 'yellow');
      const data = await apiRequest(`${api}/api/leads/next-batch?count=${n}`);
      log('next-batch returned', data);
      if (!Array.isArray(data) || data.length === 0) {
        return showStatus('No items returned. Fill queue first.', 'yellow');
      }
      chrome.runtime.sendMessage({ type:'OPEN_BATCH', items: data });
      showStatus(`Queued ${data.length} tabs. Opening…`, 'green');
    } catch (e) {
      console.error(e);
      showStatus(`Get & Open failed: ${e.message}`, 'red');
    }
  });

  btnPause.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type:'PAUSE' });
    showStatus('Paused', 'yellow');
  });
  btnResume.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type:'RESUME' });
    showStatus('Resumed', 'green');
  });

  // Seed 3 Test
  btnSeed3.addEventListener('click', async () => {
    try {
      const api = await getApi();
      if (!api) return showStatus('Set backend URL first', 'red');
      showStatus('Seeding…', 'yellow');
      await apiRequest(`${api}/api/leads/ingest`, {
        method: 'POST',
        body: JSON.stringify({
          rows: [
            { url: "https://www.zillow.com/homedetails/TEST1", city:"Austin",       price:"$1,995", status:"queued" },
            { url: "https://www.zillow.com/homedetails/TEST2", city:"Round Rock",   price:"$2,150", status:"queued" },
            { url: "https://www.zillow.com/homedetails/TEST3", city:"Pflugerville", price:"$1,875", status:"queued" }
          ]
        })
      });
      showStatus('Seeded 3 test leads', 'green');
    } catch (e) {
      console.error(e);
      showStatus(`Seed failed: ${e.message}`, 'red');
    }
  });

  // Add Pasted URLs
  btnAddPasted.addEventListener('click', async () => {
    try {
      const api = await getApi();
      if (!api) return showStatus('Set backend URL first', 'red');

      const urls = (taUrlsEl.value || '').split('\n')
        .map(s => s.trim()).filter(Boolean)
        .filter(u => /zillow\.com\/homedetails\//i.test(u));

      if (!urls.length) return showStatus('No valid Zillow URLs', 'yellow');

      const city = (pasteCityEl.value || '').trim();
      const price= (pastePriceEl.value || '').trim();
      const rows = Array.from(new Set(urls)).map(url => ({ url, city, price, status:'queued' }));

      showStatus('Adding…', 'yellow');
      await apiRequest(`${api}/api/leads/ingest`, {
        method:'POST',
        body: JSON.stringify({ rows })
      });
      showStatus(`Added ${rows.length} to queue`, 'green');
      taUrlsEl.value = '';
    } catch (e) {
      console.error(e);
      showStatus(`Add failed: ${e.message}`, 'red');
    }
  });

  // Pull & Add (optional)
  btnPullSheet.addEventListener('click', async () => {
    try {
      const api = await getApi();
      if (!api) return showStatus('Set backend URL first', 'red');
      const webApp = normalizeBase(sheetUrlEl.value);
      const cnt = Math.max(1, Math.min(50, parseInt(sheetCountEl.value) || 20));
      if (!webApp) return showStatus('Set Sheet Web App URL first', 'red');

      await chrome.storage.sync.set({ sheetUrl: webApp });

      showStatus('Pulling from Sheet…', 'yellow');
      const rows = await apiRequest(`${webApp}?count=${cnt}`);
      if (!Array.isArray(rows) || rows.length === 0) {
        return showStatus('Sheet returned 0 rows', 'yellow');
      }
      await apiRequest(`${api}/api/leads/ingest`, {
        method:'POST',
        body: JSON.stringify({ rows })
      });
      showStatus(`Pulled & queued ${rows.length} rows`, 'green');
    } catch (e) {
      console.error(e);
      showStatus(`Sheet pull failed: ${e.message}`, 'red');
    }
  });

  // On load, log current storage for debugging
  chrome.storage.sync.get(null, all => log('chrome.storage.sync snapshot →', all));
})();
// popup.js — hard-wired to backend with health check + strict status feedback
document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const apiEl = document.getElementById('apiInput');
  const capHourEl = document.getElementById('capHour');
  const capDayEl = document.getElementById('capDay');
  const sheetUrlEl = document.getElementById('sheetUrl');
  const sheetCountEl = document.getElementById('sheetCount');
  const countEl = document.getElementById('count');
  const status = document.getElementById('popupStatus');

  function showStatus(msg, kind = 'green', persistMs = 3000) {
    status.textContent = msg;
    status.className = `status-${kind}`;
    if (persistMs > 0) {
      setTimeout(() => { status.textContent = 'Ready'; status.className = ''; }, persistMs);
    }
  }

  // Helper: small backoff retry
  async function apiRequest(url, options = {}) {
    const tries = 2;
    let lastErr;
    for (let i = 0; i < tries; i++) {
      try {
        const r = await fetch(url, {
          ...options,
          headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
        });
        if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
        const ct = r.headers.get('content-type') || '';
        return ct.includes('application/json') ? r.json() : r.text();
      } catch (e) {
        lastErr = e;
        await new Promise(res => setTimeout(res, 800 + Math.random()*400));
      }
    }
    throw lastErr;
  }

  // Ensure API base
  function normalizeApiBase(raw) {
    return (raw || '').trim().replace(/\/+$/,'');
  }
  async function getApiBase() {
    const s = await chrome.storage.sync.get({ api: 'https://zillow-assistant-backend.onrender.com' });
    return normalizeApiBase(s.api);
  }
  async function setApiBase(val) {
    const api = normalizeApiBase(val);
    await chrome.storage.sync.set({ api });
    return api;
  }

  // Load saved values
  const saved = await chrome.storage.sync.get({
    api: 'https://zillow-assistant-backend.onrender.com',
    capHour: 25,
    capDay: 75,
    sheetUrl: ''
  });
  apiEl.value = normalizeApiBase(saved.api);
  capHourEl.value = saved.capHour;
  capDayEl.value = saved.capDay;
  sheetUrlEl.value = saved.sheetUrl;

  // On first load, try health ping if API filled
  if (apiEl.value) {
    try {
      await apiRequest(`${apiEl.value}/api/leads/health`);
      showStatus('Backend connected ✓', 'green', 1500);
    } catch (e) {
      showStatus('Backend not reachable. Save URL or check server.', 'red', 4000);
    }
  }

  // Save Backend URL + immediate health check
  document.getElementById('btnSaveApi').addEventListener('click', async () => {
    try {
      const api = await setApiBase(apiEl.value);
      await apiRequest(`${api}/api/leads/health`);
      showStatus('Backend URL saved & reachable ✓', 'green');
    } catch (e) {
      showStatus(`Save/health failed: ${e.message}`, 'red', 5000);
    }
  });

  // Save caps + push to background immediately
  document.getElementById('btnSaveCaps').addEventListener('click', async () => {
    try {
      const perHour = Math.max(1, parseInt(capHourEl.value) || 25);
      const perDay  = Math.max(1, parseInt(capDayEl.value)  || 75);
      await chrome.storage.sync.set({ capHour: perHour, capDay: perDay });
      chrome.runtime.sendMessage({ type: 'SET_LIMITS', limits: { perHour, perDay } });
      showStatus(`Caps saved: ${perHour}/${perDay}.`, 'green');
    } catch (e) {
      showStatus('Could not save caps.', 'red');
    }
  });

  // Get & Open
  document.getElementById('btnGetOpen').addEventListener('click', async () => {
    try {
      const api = await getApiBase();
      if (!api) return showStatus('Set backend URL first.', 'red');
      const n = Math.max(1, Math.min(25, parseInt(countEl.value) || 10));
      showStatus('Fetching next batch…', 'yellow', 0);
      const data = await apiRequest(`${api}/api/leads/next-batch?count=${n}`);
      if (!Array.isArray(data) || data.length === 0) {
        return showStatus('No items returned. Fill queue first.', 'yellow');
      }
      chrome.runtime.sendMessage({ type: 'OPEN_BATCH', items: data });
      showStatus(`Queued ${data.length} tabs. Opening with random delays.`, 'green');
    } catch (e) {
      showStatus(`Fetch failed: ${e.message}`, 'red', 5000);
    }
  });

  // Pause/Resume
  document.getElementById('btnPause').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'PAUSE' });
    showStatus('Paused.', 'yellow');
  });
  document.getElementById('btnResume').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'RESUME' });
    showStatus('Resumed.', 'green');
  });

  // Seed 3 Test
  document.getElementById('btnSeed3').addEventListener('click', async () => {
    try {
      const api = await getApiBase();
      if (!api) return showStatus('Set backend URL first.', 'red');
      showStatus('Seeding…', 'yellow', 0);
      await apiRequest(`${api}/api/leads/ingest`, {
        method: 'POST',
        body: JSON.stringify({
          rows: [
            { url: "https://www.zillow.com/homedetails/TEST1", city: "Austin",      price: "$1,995", status: "queued" },
            { url: "https://www.zillow.com/homedetails/TEST2", city: "Round Rock",  price: "$2,150", status: "queued" },
            { url: "https://www.zillow.com/homedetails/TEST3", city: "Pflugerville",price: "$1,875", status: "queued" }
          ]
        })
      });
      showStatus('Seeded 3 test leads.', 'green');
    } catch (e) {
      showStatus(`Seed failed: ${e.message}`, 'red', 5000);
    }
  });

  // Add Pasted URLs
  document.getElementById('btnAddPasted').addEventListener('click', async () => {
    try {
      const api = await getApiBase();
      if (!api) return showStatus('Set backend URL first.', 'red');
      const lines = (document.getElementById('taUrls').value || '').split('\n')
        .map(s => s.trim()).filter(Boolean);
      const urls = Array.from(new Set(lines.filter(u => /https?:\/\/(www\.)?zillow\.com\/homedetails\//i.test(u))));
      if (urls.length === 0) return showStatus('No valid Zillow URLs.', 'yellow');
      const city = (document.getElementById('pasteCity').value || '').trim();
      const price = (document.getElementById('pastePrice').value || '').trim();
      const rows = urls.map(url => ({ url, city, price, status: 'queued' }));
      showStatus('Adding…', 'yellow', 0);
      await apiRequest(`${api}/api/leads/ingest`, { method: 'POST', body: JSON.stringify({ rows }) });
      showStatus(`Added ${rows.length} lead(s) to queue.`, 'green');
      document.getElementById('taUrls').value = '';
    } catch (e) {
      showStatus(`Add failed: ${e.message}`, 'red', 5000);
    }
  });

  // Pull From Sheet
  document.getElementById('btnPullSheet').addEventListener('click', async () => {
    try {
      const api = await getApiBase();
      if (!api) return showStatus('Set backend URL first.', 'red');
      const sheetUrl = normalizeApiBase(sheetUrlEl.value);
      const cnt = Math.max(1, Math.min(50, parseInt(sheetCountEl.value) || 20));
      if (!sheetUrl) return showStatus('Set sheet URL first.', 'red');
      await chrome.storage.sync.set({ sheetUrl });
      showStatus('Pulling from Sheet…', 'yellow', 0);
      const rows = await apiRequest(`${sheetUrl}?count=${cnt}`);
      if (!Array.isArray(rows) || rows.length === 0) return showStatus('Sheet returned 0 rows.', 'yellow');
      await apiRequest(`${api}/api/leads/ingest`, { method: 'POST', body: JSON.stringify({ rows }) });
      showStatus(`Pulled & queued ${rows.length} rows.`, 'green');
    } catch (e) {
      showStatus(`Sheet pull failed: ${e.message}`, 'red', 5000);
    }
  });
});
// popup.js
document.addEventListener('DOMContentLoaded', async () => {
  // Load saved settings
  const settings = await chrome.storage.sync.get({
    api: 'https://zillow-assistant-backend.onrender.com',
    capHour: 25,
    capDay: 75,
    sheetUrl: ''
  });

  // Populate UI
  document.getElementById('apiInput').value = settings.api;
  document.getElementById('capHour').value = settings.capHour;
  document.getElementById('capDay').value = settings.capDay;
  document.getElementById('sheetUrl').value = settings.sheetUrl;

  // Status helper
  const status = document.getElementById('popupStatus');
  function showStatus(msg, type = 'green') {
    status.textContent = msg;
    status.className = `status-${type}`;
    setTimeout(() => {
      status.textContent = 'Ready';
      status.className = '';
    }, 3000);
  }

  // Network helper with retry
  async function apiRequest(url, options = {}) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        if (attempt === 0) {
          await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
          continue;
        }
        throw error;
      }
    }
  }

  // Save Backend URL
  document.getElementById('btnSaveApi').addEventListener('click', async () => {
    try {
      const url = document.getElementById('apiInput').value.trim().replace(/\/$/, '');
      if (!url) {
        showStatus('URL cannot be empty', 'red');
        return;
      }
      
      await chrome.storage.sync.set({ api: url });
      showStatus('Backend URL saved.', 'green');
    } catch (error) {
      showStatus('Could not save URL.', 'red');
    }
  });

  // Save Caps
  document.getElementById('btnSaveCaps').addEventListener('click', async () => {
    try {
      const perHour = parseInt(document.getElementById('capHour').value) || 25;
      const perDay = parseInt(document.getElementById('capDay').value) || 75;
      
      await chrome.storage.sync.set({ 
        capHour: perHour, 
        capDay: perDay 
      });
      
      // Send to background
      chrome.runtime.sendMessage({ 
        type: 'SET_LIMITS', 
        limits: { perHour, perDay } 
      });
      
      showStatus(`Caps saved: ${perHour}/${perDay}.`, 'green');
    } catch (error) {
      showStatus('Could not save caps.', 'red');
    }
  });

  // Get & Open
  document.getElementById('btnGetOpen').addEventListener('click', async () => {
    try {
      const count = parseInt(document.getElementById('count').value) || 10;
      const api = document.getElementById('apiInput').value.trim().replace(/\/$/, '');
      
      if (!api) {
        showStatus('Set backend URL first.', 'red');
        return;
      }

      const data = await apiRequest(`${api}/api/leads/next-batch?count=${count}`);
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        showStatus('No items returned. Fill queue first.', 'yellow');
        return;
      }

      chrome.runtime.sendMessage({ 
        type: 'OPEN_BATCH', 
        items: data 
      });
      
      showStatus(`Queued ${data.length} tabs. Opening with random delays.`, 'green');
    } catch (error) {
      showStatus(`Fetch failed: ${error.message}`, 'red');
    }
  });

  // Pause
  document.getElementById('btnPause').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'PAUSE' });
    showStatus('Paused.', 'yellow');
  });

  // Resume
  document.getElementById('btnResume').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'RESUME' });
    showStatus('Resumed.', 'green');
  });

  // Seed 3 Test
  document.getElementById('btnSeed3').addEventListener('click', async () => {
    try {
      const api = document.getElementById('apiInput').value.trim().replace(/\/$/, '');
      if (!api) {
        showStatus('Set backend URL first.', 'red');
        return;
      }

      const testData = {
        rows: [
          { url: "https://www.zillow.com/homedetails/TEST1", city: "Austin", price: "$1,995", status: "queued" },
          { url: "https://www.zillow.com/homedetails/TEST2", city: "Round Rock", price: "$2,150", status: "queued" },
          { url: "https://www.zillow.com/homedetails/TEST3", city: "Pflugerville", price: "$1,875", status: "queued" }
        ]
      };

      await apiRequest(`${api}/api/leads/ingest`, {
        method: 'POST',
        body: JSON.stringify(testData)
      });
      
      showStatus('Seeded 3 test leads.', 'green');
    } catch (error) {
      showStatus(`Seed failed: ${error.message}`, 'red');
    }
  });

  // Add Pasted URLs
  document.getElementById('btnAddPasted').addEventListener('click', async () => {
    try {
      const api = document.getElementById('apiInput').value.trim().replace(/\/$/, '');
      if (!api) {
        showStatus('Set backend URL first.', 'red');
        return;
      }

      const urls = document.getElementById('taUrls').value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && line.includes('zillow.com/homedetails'))
        .filter((url, index, arr) => arr.indexOf(url) === index); // dedupe

      if (urls.length === 0) {
        showStatus('No valid Zillow URLs.', 'yellow');
        return;
      }

      const city = document.getElementById('pasteCity').value.trim() || '';
      const price = document.getElementById('pastePrice').value.trim() || '';

      const rows = urls.map(url => ({
        url,
        city,
        price,
        status: 'queued'
      }));

      await apiRequest(`${api}/api/leads/ingest`, {
        method: 'POST',
        body: JSON.stringify({ rows })
      });
      
      showStatus(`Added ${rows.length} lead(s) to queue.`, 'green');
      document.getElementById('taUrls').value = '';
    } catch (error) {
      showStatus(`Add failed: ${error.message}`, 'red');
    }
  });

  // Pull From Sheet
  document.getElementById('btnPullSheet').addEventListener('click', async () => {
    try {
      const api = document.getElementById('apiInput').value.trim().replace(/\/$/, '');
      const sheetUrl = document.getElementById('sheetUrl').value.trim();
      const count = parseInt(document.getElementById('sheetCount').value) || 20;

      if (!api) {
        showStatus('Set backend URL first.', 'red');
        return;
      }

      if (!sheetUrl) {
        showStatus('Set sheet URL first.', 'red');
        return;
      }

      // Save sheet URL
      await chrome.storage.sync.set({ sheetUrl });

      // Fetch from sheet
      const sheetData = await apiRequest(`${sheetUrl}?count=${count}`);
      
      if (!Array.isArray(sheetData) || sheetData.length === 0) {
        showStatus('Sheet returned 0 rows.', 'yellow');
        return;
      }

      // Post to backend
      await apiRequest(`${api}/api/leads/ingest`, {
        method: 'POST',
        body: JSON.stringify({ rows: sheetData })
      });
      
      showStatus(`Pulled & queued ${sheetData.length} rows.`, 'green');
    } catch (error) {
      showStatus(`Sheet pull failed: ${error.message}`, 'red');
    }
  });
});


// === Phase 3.1 owners-only messaging UI ===
(function () {
  try {
    const container = document.querySelector('.container');
    if (!container) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'section';
    wrapper.innerHTML = `
      <h3>Owners-only Messaging</h3>
      <label>City or query</label>
      <input id="zx_city" style="width:100%" />
      <label style="display:flex;gap:8px;align-items:center;margin-top:8px">
        <input type="checkbox" id="zx_ownersOnly" checked /> Owners only
      </label>
      <label style="margin-top:8px">Message template</label>
      <textarea id="zx_tpl" rows="4" style="width:100%" placeholder="Hi ${name}, ..."></textarea>
      <button id="zx_find" style="margin-top:8px">Find Owners</button>
      <div id="zx_summary" style="margin-top:8px"></div>
      <ul id="zx_results" style="margin-top:8px; padding-left:16px"></ul>
    `;
    container.appendChild(wrapper);

    const city = wrapper.querySelector('#zx_city');
    const ownersOnly = wrapper.querySelector('#zx_ownersOnly');
    const tpl = wrapper.querySelector('#zx_tpl');
    const findBtn = wrapper.querySelector('#zx_find');
    const summary = wrapper.querySelector('#zx_summary');
    const list = wrapper.querySelector('#zx_results');

    city.value = 'austin, tx';
    ownersOnly.checked = true;
    tpl.value = `Hi ${'${name}'}${', I’m interested in your rental. Are you open to a quick chat today?'}`;

    async function startScrape(cityQuery, ownersOnlyVal) {
      const apiBase = (await chrome.storage.sync.get({ api: 'https://zillow-assistant-backend.onrender.com' })).api.replace(/\/+$/,'');
      const r = await fetch(`${apiBase}/api/scraper/start`, {
        method: 'POST', headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ cityQuery, ownersOnly: ownersOnlyVal !== false })
      });
      if (!r.ok) throw new Error(`scrape failed: ${r.status}`);
      return r.json();
    }
    async function checkDuplicate(listingId) {
      const apiBase = (await chrome.storage.sync.get({ api: 'https://zillow-assistant-backend.onrender.com' })).api.replace(/\/+$/,'');
      const u = new URL(`${apiBase}/api/messages/check`);
      u.searchParams.set('listingId', listingId);
      const r = await fetch(u.toString());
      if (!r.ok) throw new Error(`dup check failed: ${r.status}`);
      return r.json();
    }
    async function logMessage(payload) {
      const apiBase = (await chrome.storage.sync.get({ api: 'https://zillow-assistant-backend.onrender.com' })).api.replace(/\/+$/,'');
      const r = await fetch(`${apiBase}/api/messages/log`, {
        method: 'POST', headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(payload)
      });
      if (!r.ok) throw new Error(`log failed: ${r.status}`);
      return r.json();
    }

    findBtn.addEventListener('click', async () => {
      findBtn.disabled = true; findBtn.textContent = 'Working…';
      try {
        const res = await startScrape(city.value, ownersOnly.checked);
        list.innerHTML = '';
        const kept = res.included || [];
        const dropped = res.summary?.dropped || 0;
        summary.textContent = `Found owners: ${kept.length}   Dropped: ${dropped}`;
        for (const l of kept) {
          const li = document.createElement('li');
          li.style.marginBottom = '10px';
          li.innerHTML = `
            <div><a href="${l.url}" target="_blank">${l.address || l.url}</a></div>
            <div>Owner: <b>${l.ownerName || 'Unknown'}</b> <span style="opacity:.7">(${Math.round((l.ownerConfidence || 0)*100)}%)</span></div>
            <button class="zx_msg" style="margin-top:6px">Message owner</button>
          `;
          li.querySelector('.zx_msg').addEventListener('click', async () => {
            const listingId = l.id || l.url;
            const dup = await checkDuplicate(listingId);
            if (dup.duplicate) {
              const cont = confirm(`Already messaged within ${dup.windowDays} days. Proceed anyway?`);
              if (!cont) {
                await logMessage({
                  listingId, listingUrl: l.url, address: l.address, ownerName: l.ownerName,
                  messageText: tpl.value.replace('${name}', l.ownerName || 'there'),
                  status: 'BLOCKED_DUP', reason: 'duplicate_within_window'
                });
                return;
              }
            }
            const messageText = tpl.value.replace('${name}', l.ownerName || 'there');
            chrome.runtime.sendMessage({ type: 'OPEN_AND_MESSAGE', url: l.url, listingId, messageText });
          });
          list.appendChild(li);
        }
      } catch (e) {
        alert(`Find owners failed: ${e.message}`);
      } finally {
        findBtn.disabled = false; findBtn.textContent = 'Find Owners';
      }
    });

    chrome.runtime.onMessage.addListener((m) => {
      if (m?.type === 'MSG_RESULT') {
        const messageText = tpl.value;
        const status = m.ok ? 'SENT' : (m.reason === 'user_cancelled' ? 'CONFIRMED_BUT_NOT_SENT' : 'FAILED');
        logMessage({ listingId: m.listingId, listingUrl: '', address: '', ownerName: '', messageText, status, reason: m.reason || '' });
        alert(m.ok ? 'Message sent ✔' : `Message failed: ${m.reason || 'unknown'}`);
      }
    });
  } catch {}
})();



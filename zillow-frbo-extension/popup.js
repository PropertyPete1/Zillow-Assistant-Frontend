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



(function () {
  if (document.getElementById('collect-visible-results-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'collect-visible-results-btn';
  btn.innerText = 'Collect visible results → Add to queue';
  btn.style.position = 'fixed';
  btn.style.top = '80px';
  btn.style.right = '20px';
  btn.style.zIndex = '99999';
  btn.style.backgroundColor = '#2c82c9';
  btn.style.color = '#fff';
  btn.style.border = 'none';
  btn.style.padding = '10px 15px';
  btn.style.borderRadius = '6px';
  btn.style.cursor = 'pointer';
  btn.style.fontSize = '14px';
  btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';

  document.body.appendChild(btn);

  btn.addEventListener('click', async () => {
    try {
      const saved = await chrome.storage.sync.get({ api: '', backendUrl: '' });
      const apiBase = String(saved.api || saved.backendUrl || '').trim().replace(/\/+$/, '');
      if (!apiBase) {
        alert('Backend URL not set. Please open the extension popup and save it.');
        return;
      }

      const links = Array.from(document.querySelectorAll('a'))
        .map(a => a.href)
        .filter(href => /https?:\/\/(www\.)?zillow\.com\/homedetails\//i.test(href))
        .filter((v, i, arr) => arr.indexOf(v) === i);

      if (!links.length) {
        alert('No listings found on this page.');
        return;
      }

      const rows = links.map(url => ({ url, status: 'queued' }));
      const res = await fetch(`${apiBase}/api/leads/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows })
      });
      if (res.ok) {
        alert(`Added ${rows.length} listings to queue.`);
      } else {
        alert('Error adding listings to queue.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to send listings to backend.');
    }
  });
})();



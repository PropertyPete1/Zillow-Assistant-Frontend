// Default template
const DEFAULT_TEMPLATE = "Hi! Saw your {beds}/{baths} at {address} in {city}. Is it still available? I have qualified tenants. Price shows {price}.";

document.addEventListener('DOMContentLoaded', async () => {
  // Load saved settings
  const settings = await chrome.storage.sync.get({
    msgTemplate: DEFAULT_TEMPLATE,
    skipAgents: true
  });

  document.getElementById('tpl').value = settings.msgTemplate;
  document.getElementById('skipAgents').checked = settings.skipAgents;

  // Status helper
  const status = document.getElementById('status');
  function showStatus(msg, type = 'success') {
    status.textContent = msg;
    status.className = `status show ${type}`;
    setTimeout(() => {
      status.classList.remove('show');
    }, 3000);
  }

  // Save template
  document.getElementById('btnSaveTpl').addEventListener('click', async () => {
    try {
      const template = document.getElementById('tpl').value.trim();
      const skipAgents = document.getElementById('skipAgents').checked;

      if (!template) {
        showStatus('Template cannot be empty.', 'error');
        return;
      }

      await chrome.storage.sync.set({
        msgTemplate: template,
        skipAgents: skipAgents
      });

      showStatus('Template saved.');
    } catch (error) {
      showStatus('Could not save template.', 'error');
    }
  });
});



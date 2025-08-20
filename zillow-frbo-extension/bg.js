// bg.js — background service worker for messaging orchestration
const EXT_BACKEND_URL = (typeof process !== 'undefined' && process.env && process.env.EXT_BACKEND_URL) || 'http://localhost:8080';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'OPEN_AND_MESSAGE') {
    const { url, listingId, messageText } = msg;
    chrome.tabs.create({ url }, (tab) => {
      if (!tab || !tab.id) return sendResponse({ ok: false, error: 'NO_TAB' });
      const tabId = tab.id;
      function onUpdated(updatedTabId, info) {
        if (updatedTabId === tabId && info.status === 'complete') {
          chrome.tabs.sendMessage(tabId, { type: 'FILL_AND_SEND', listingId, messageText });
          chrome.tabs.onUpdated.removeListener(onUpdated);
        }
      }
      chrome.tabs.onUpdated.addListener(onUpdated);
    });
    return true;
  }
});



// content.js — fill and send message via Zillow UI
(function () {
  function findMessageBox() {
    const selectors = [
      'textarea[placeholder*="message" i]',
      'textarea[name*="message" i]',
      'textarea',
      '[contenteditable="true"]'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }
  function findSendButton() {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => /send/i.test(b.innerText)) || null;
  }
  function confirmOverlay(preview) {
    return new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif';
      const card = document.createElement('div');
      card.style.cssText = 'background:#0b0f14;color:#fff;width:480px;padding:16px;border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,.5)';
      card.innerHTML = `
        <div style="font-size:16px;font-weight:600;margin-bottom:8px">Confirm message</div>
        <div style="white-space:pre-wrap;background:#0f1720;padding:10px;border-radius:8px;min-height:80px">${(preview || '').replace(/</g,'&lt;')}</div>
        <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">
          <button id="zxcancel" style="padding:8px 12px;background:#333;color:#fff;border:none;border-radius:8px">Cancel</button>
          <button id="zxsend" style="padding:8px 12px;background:#2dd4bf;color:#0b0f14;border:none;border-radius:8px;font-weight:700">Send</button>
        </div>
      `;
      wrap.appendChild(card);
      document.body.appendChild(wrap);
      card.querySelector('#zxcancel').onclick = () => { wrap.remove(); resolve('cancel'); };
      card.querySelector('#zxsend').onclick = () => { wrap.remove(); resolve('send'); };
    });
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'FILL_AND_SEND') {
      (async () => {
        const box = findMessageBox();
        const button = findSendButton();
        if (!box || !button) {
          chrome.runtime.sendMessage({ type: 'MSG_RESULT', ok: false, listingId: msg.listingId, reason: 'form_not_found' });
          return;
        }
        if ('value' in box) { box.value = msg.messageText; box.dispatchEvent(new Event('input', { bubbles: true })); }
        else { box.textContent = msg.messageText; box.dispatchEvent(new Event('input', { bubbles: true })); }
        const decision = await confirmOverlay(msg.messageText);
        if (decision === 'cancel') {
          chrome.runtime.sendMessage({ type: 'MSG_RESULT', ok: false, listingId: msg.listingId, reason: 'user_cancelled' });
          return;
        }
        button.click();
        setTimeout(() => {
          chrome.runtime.sendMessage({ type: 'MSG_RESULT', ok: true, listingId: msg.listingId });
        }, 1500);
      })();
    }
  });
})();



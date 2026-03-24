// ============================================================
// QuickSwitch — Content Script
// Injects the switcher iframe and manages its lifecycle
// ============================================================

(() => {
  if (window.__quickswitch_injected) return;
  window.__quickswitch_injected = true;

  let overlay = null;
  let iframe = null;
  let isOpen = false;

  // ── Listen for toggle command from background ──────────────

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'TOGGLE_SWITCHER') {
      toggle();
    }
  });

  // ── Fallback: listen for Alt+Q directly ────────────────────
  // (In case chrome.commands doesn't fire on some pages)

  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key.toLowerCase() === 'q') {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    }
  }, true);

  // ── Toggle ─────────────────────────────────────────────────

  function toggle() {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }

  function open() {
    if (isOpen) return;
    isOpen = true;

    // Create overlay backdrop
    overlay = document.createElement('div');
    overlay.id = 'quickswitch-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 2147483646;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      opacity: 0;
      transition: opacity 120ms ease-out;
    `;
    overlay.addEventListener('click', close);

    // Create iframe
    iframe = document.createElement('iframe');
    iframe.id = 'quickswitch-frame';
    iframe.src = chrome.runtime.getURL('switcher/switcher.html');
    iframe.style.cssText = `
      position: fixed;
      top: 18%;
      left: 50%;
      transform: translateX(-50%) scale(0.96);
      width: 680px;
      max-height: 72vh;
      height: 0;
      z-index: 2147483647;
      border: none;
      border-radius: 16px;
      box-shadow:
        0 25px 60px rgba(0,0,0,0.3),
        0 0 0 1px rgba(255,255,255,0.1);
      opacity: 0;
      transition: opacity 120ms ease-out, transform 120ms ease-out, height 150ms ease-out;
      color-scheme: light dark;
    `;
    iframe.setAttribute('allow', '');
    iframe.setAttribute('tabindex', '-1');

    document.documentElement.appendChild(overlay);
    document.documentElement.appendChild(iframe);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        iframe.style.opacity = '1';
        iframe.style.transform = 'translateX(-50%) scale(1)';
      });
    });

    // Listen for messages from iframe
    window.addEventListener('message', handleIframeMessage);

    // Close on Escape (backup)
    document.addEventListener('keydown', handleEscape, true);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;

    if (overlay) {
      overlay.style.opacity = '0';
    }
    if (iframe) {
      iframe.style.opacity = '0';
      iframe.style.transform = 'translateX(-50%) scale(0.96)';
    }

    setTimeout(() => {
      overlay?.remove();
      iframe?.remove();
      overlay = null;
      iframe = null;
    }, 130);

    window.removeEventListener('message', handleIframeMessage);
    document.removeEventListener('keydown', handleEscape, true);
  }

  function handleEscape(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  }

  function handleIframeMessage(e) {
    if (e.source !== iframe?.contentWindow) return;

    const { type, data } = e.data;

    switch (type) {
      case 'QUICKSWITCH_CLOSE':
        close();
        break;
      case 'QUICKSWITCH_RESIZE':
        if (iframe) {
          iframe.style.height = data.height + 'px';
        }
        break;
    }
  }
})();

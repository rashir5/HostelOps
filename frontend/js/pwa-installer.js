/**
 * SPIT Hostel Ops — PWA Installation Helper
 * Enables "Install as App" on Android, Windows, macOS, and iOS Safari.
 */

let deferredInstallPrompt = null;

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('PWA ServiceWorker registration failed:', err);
    });
  });
}

// Capture Android/Chrome/Edge native install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  
  // Make install buttons visible
  document.querySelectorAll('.btn-install-app').forEach((btn) => {
    btn.style.display = 'inline-flex';
  });
});

// Detect iOS devices
const isIos = () => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
};

// Detect if already installed (standalone display)
const isAppInstalled = () => {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
};

// Global trigger function
window.triggerPwaInstall = async () => {
  if (isAppInstalled()) {
    if (typeof showToast === 'function') {
      showToast('App is already installed on your device!', 'info');
    } else {
      alert('App is already installed on your device!');
    }
    return;
  }

  // 1. Android / Chrome / Edge native install dialog
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User installed the SPIT Hostel Ops PWA');
      document.querySelectorAll('.btn-install-app').forEach((btn) => {
        btn.style.display = 'none';
      });
    }
    deferredInstallPrompt = null;
    return;
  }

  // 2. iOS Safari step-by-step guidance
  if (isIos()) {
    const iosModalHtml = `
      <div style="padding:1.5rem;max-width:440px;text-align:center;">
        <img src="assets/app_icon_192.png" alt="SPIT Hostel Ops Icon" style="width:68px;height:68px;border-radius:16px;box-shadow:0 8px 24px rgba(13,122,114,0.35);margin-bottom:0.75rem;object-fit:cover;" />
        <h3 style="font-size:1.25rem;font-weight:800;color:var(--text-primary);margin-bottom:0.35rem;">
          Install SPIT Hostel Ops
        </h3>
        <p style="font-size:0.8125rem;color:var(--text-muted);margin-bottom:1.25rem;">
          Add SPIT Hostel Ops to your iPhone Home Screen to use it full-screen just like a native app.
        </p>

        <div style="background:var(--bg-card-hover, #f8fafc);border:1px solid var(--border, #e2e8f0);border-radius:10px;padding:1rem;text-align:left;font-size:0.85rem;margin-bottom:1.25rem;">
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
            <span style="width:26px;height:26px;border-radius:50%;background:#0d7a72;color:white;display:inline-flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;">1</span>
            <span>Tap the <strong>Share</strong> button <span style="font-size:1.1rem;">⎋</span> at the bottom of Safari.</span>
          </div>
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
            <span style="width:26px;height:26px;border-radius:50%;background:#0d7a72;color:white;display:inline-flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;">2</span>
            <span>Scroll down and select <strong>"Add to Home Screen" ➕</strong>.</span>
          </div>
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <span style="width:26px;height:26px;border-radius:50%;background:#0d7a72;color:white;display:inline-flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;">3</span>
            <span>Tap <strong>"Add"</strong> in the top-right corner.</span>
          </div>
        </div>

        <button class="btn btn-primary" onclick="if(typeof closeModal==='function') closeModal();" style="width:100%;">
          Got it!
        </button>
      </div>
    `;

    if (typeof openModal === 'function') {
      openModal(iosModalHtml);
    } else {
      alert("To install on iPhone:\n1. Tap the Share button at bottom of Safari\n2. Tap 'Add to Home Screen'\n3. Tap 'Add'");
    }
    return;
  }

  // 3. Desktop / Other Browser guidance
  if (typeof openModal === 'function') {
    openModal(`
      <div style="padding:1.5rem;max-width:440px;text-align:center;">
        <img src="assets/app_icon_192.png" alt="SPIT Hostel Ops Icon" style="width:68px;height:68px;border-radius:16px;box-shadow:0 8px 24px rgba(13,122,114,0.35);margin-bottom:0.75rem;object-fit:cover;" />
        <h3 style="font-size:1.2rem;font-weight:800;color:var(--text-primary);margin-bottom:0.5rem;">
          Install as App
        </h3>
        <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1rem;">
          Click the install icon <strong>(⊕ or 🖥️)</strong> in your browser's address bar to install SPIT Hostel Ops onto your computer or phone!
        </p>
        <button class="btn btn-primary" onclick="closeModal();" style="width:100%;">Understood</button>
      </div>
    `);
  } else {
    alert("Look for the install icon (⊕) in your browser address bar to install this app!");
  }
};

// Check if app is already installed on page load
window.addEventListener('DOMContentLoaded', () => {
  if (isAppInstalled()) {
    document.querySelectorAll('.btn-install-app').forEach((btn) => {
      btn.style.display = 'none';
    });
  }
});

export function initPwa(log, enabled) {
  if (!('serviceWorker' in navigator)) {
    log?.warn?.('[PWA] Service Workers are not supported in this browser');
    return;
  }

  if (!enabled) {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        log?.info?.('[PWA] Service Worker registered successfully', {
          scope: registration.scope,
          active: !!registration.active,
          installing: !!registration.installing,
          waiting: !!registration.waiting,
        });

        setInterval(() => {
          registration.update().then(() => {
            log?.debug?.('[PWA] Checked for service worker updates');
          });
        }, 5 * 60 * 1000);

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          log?.info?.('[PWA] Service Worker update found');

          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              log?.info?.('[PWA] New Service Worker installed, update available');
            }
          });
        });
      })
      .catch((error) => {
        log?.error?.('[PWA] Service Worker registration failed', {
          error: error.message,
          stack: error.stack,
        });
      });

    navigator.serviceWorker.addEventListener('message', (event) => {
      log?.info?.('[PWA] Message from Service Worker', event.data);

      if (event.data.type === 'DATA_REFRESHED') {
        log?.info?.('[PWA] Data refreshed by background sync');
      }
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      log?.info?.('[PWA] Service Worker controller changed');
    });
  });
}

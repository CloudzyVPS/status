import { API_BASE, PWA_ENABLED, REFRESH_INTERVAL, STATUS_PAGE_SLUG } from './appConfig.js';
import { log } from './utils/log.js';
import { startTimestampTicker } from './utils/time.js';
import { initTheme, bindThemeToggle } from './theme.js';
import { initPanelControls, openRegionPanel } from './render/panel.js';
import { loadData } from './data/loadData.js';
import { initPwa } from './pwa.js';

function initNetworkListeners() {
  window.addEventListener('online', () => {
    log.info('[Network] Connection restored - Back online');
    loadData(log, openRegionPanel);
  });

  window.addEventListener('offline', () => {
    log.warn('[Network] Connection lost - Now offline');
  });

  log.info('[Network] Initial connection state', {
    online: navigator.onLine,
    effectiveType: navigator.connection?.effectiveType,
    downlink: navigator.connection?.downlink,
    rtt: navigator.connection?.rtt,
  });
}

async function bootstrap() {
  log.info('Status Page Initialized', {
    apiBase: API_BASE,
    pageSlug: STATUS_PAGE_SLUG,
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    timestamp: new Date().toISOString(),
  });

  initTheme();
  bindThemeToggle();
  startTimestampTicker();
  initPanelControls();
  initNetworkListeners();
  initPwa(log, PWA_ENABLED);

  await loadData(log, openRegionPanel);

  setInterval(() => {
    log.info('Auto-refreshing status data');
    loadData(log, openRegionPanel);
  }, REFRESH_INTERVAL);
}

bootstrap();

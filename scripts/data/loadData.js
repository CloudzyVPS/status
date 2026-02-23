import { API_BASE, STATUS_PAGE_SLUG } from '../appConfig.js';
import { updateState, state } from '../state.js';
import { renderRegionCards } from '../render/regions.js';
import { renderLatencyTable } from '../render/latency.js';
import { updateGlobalStatus } from '../render/globalStatus.js';
import { normalizeStatus, overallMessage, setUptimeFromBlocks } from '../utils/status.js';
import { mapStatusPayloadToRegions } from './mapPayload.js';
import { fetchWithRetry } from './fetch.js';

function syncGlobals() {
  window.REGIONS = state.regions;
  window.NETWORK_DELAYS = state.networkDelays;
  window.LATENCY_HUB = state.latencyHub;
  window.REGION_STATUS_DATA = state.regionStatusData;
}

export async function loadData(log, onRegionSelect) {
  log?.info('Starting initial data load', {
    phase: 'PHASE_1_CRITICAL',
    endpoint: `${API_BASE}/api/status/${STATUS_PAGE_SLUG}`,
  });

  const loadStartTime = performance.now();
  const base = `${API_BASE}/api/status/${STATUS_PAGE_SLUG}`;

  try {
    const phase1Start = performance.now();
    const statusRes = await fetchWithRetry(base, log);
    if (!statusRes || !statusRes.ok) {
      const statusText = statusRes ? statusRes.statusText : 'no response';
      throw new Error(`API returned ${statusRes?.status}: ${statusText}`);
    }

    const statusPayload = await statusRes.json();
    log?.info('Status payload received', {
      status: statusPayload.overall_status,
      groups: Array.isArray(statusPayload.groups) ? statusPayload.groups.length : 0,
      ungrouped: Array.isArray(statusPayload.ungrouped) ? statusPayload.ungrouped.length : 0,
      announcements: Array.isArray(statusPayload.announcements) ? statusPayload.announcements.length : 0,
      responseTime: `${(performance.now() - phase1Start).toFixed(2)}ms`,
    });

    const overall = normalizeStatus(statusPayload.overall_status || statusPayload.status);
    updateState({
      globalStatus: {
        status: overall,
        message: overallMessage(overall),
        lastUpdated: new Date().toISOString(),
      },
      regionStatusData: mapStatusPayloadToRegions(statusPayload),
    });

    syncGlobals();

    state.regionStatusData.forEach((r) => setUptimeFromBlocks(r.name, r.uptime_blocks, state.uptimeData));

    updateGlobalStatus(log);
    document.getElementById('header-status')?.classList.remove('loading');
    document.getElementById('hero-section')?.classList.remove('loading');

    renderRegionCards(onRegionSelect);
    document.getElementById('regions-section')?.classList.remove('loading');

    log?.info('Phase 1 UI render complete - First paint achieved', {
      timeToFirstPaint: `${(performance.now() - loadStartTime).toFixed(2)}ms`,
    });

    // Phase 2 enrichment
    const phase2Start = performance.now();
    const phase2Results = await Promise.allSettled([
      fetch(`${base}/regions`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${base}/regions/uptime`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${base}/regions/latency`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${base}/regions/incidents`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${base}/regions/maintenance`).then((r) => (r.ok ? r.json() : null)),
    ]);

    const regionsRes = phase2Results[0].status === 'fulfilled' ? phase2Results[0].value : null;
    const uptimeRes = phase2Results[1].status === 'fulfilled' ? phase2Results[1].value : null;
    const latencyRes = phase2Results[2].status === 'fulfilled' ? phase2Results[2].value : null;
    const incidentsRes =
      phase2Results[3]?.status === 'fulfilled' && Array.isArray(phase2Results[3].value)
        ? phase2Results[3].value
        : [];
    const maintenanceRes =
      phase2Results[4]?.status === 'fulfilled' && Array.isArray(phase2Results[4].value)
        ? phase2Results[4].value
        : [];

    updateState({
      regions: regionsRes?.regions ? regionsRes.regions.map((r) => ({ ...r, color: 0xd5ebff })) : state.regions,
      uptimeData: uptimeRes?.regions || state.uptimeData,
      networkDelays: latencyRes?.matrix || {},
      latencyHub: latencyRes?.hub || '',
      regionStatusData: state.regionStatusData.map((r) => {
        const incidents = (incidentsRes || []).filter((inc) => inc.region === r.name);
        const maintenance = (maintenanceRes || []).filter((m) => m.region === r.name);
        return { ...r, activeIncidents: incidents, scheduledMaintenance: maintenance };
      }),
    });

    syncGlobals();

    renderRegionCards(onRegionSelect);
    document.getElementById('regions-section')?.classList.remove('loading');
    renderLatencyTable();
    document.getElementById('latency-section')?.classList.remove('loading');

    // Globe init
    function initGlobeWithData() {
      if (typeof window.initGlobeRegions === 'function') window.initGlobeRegions();
      if (typeof window.precomputeAllArcs === 'function') window.precomputeAllArcs();
      document.getElementById('globe-section')?.classList.remove('loading');
      if (typeof window.updateGlobeStatusIndicators === 'function') setTimeout(window.updateGlobeStatusIndicators, 200);
    }

    if (typeof window.initGlobeRegions === 'function') {
      initGlobeWithData();
    } else {
      window._pendingGlobeInit = initGlobeWithData;
    }

    const totalLoadTime = performance.now() - loadStartTime;
    log?.info('✅ Complete data load finished successfully', {
      totalTime: `${totalLoadTime.toFixed(2)}ms`,
      phase1Time: `${(performance.now() - phase1Start).toFixed(2)}ms`,
      phase2Time: `${(performance.now() - phase2Start).toFixed(2)}ms`,
      regionsLoaded: state.regions.length,
      uptimeDataPoints: Object.values(state.uptimeData).reduce(
        (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
        0
      ),
      latencyPairs: Object.keys(state.networkDelays).length,
    });
  } catch (error) {
    log?.error('❌ Failed to load status data', {
      error: error.message,
      stack: error.stack,
      endpoint: `${API_BASE}/api/status/${STATUS_PAGE_SLUG}`,
      timestamp: new Date().toISOString(),
    });
    window.location.href = '/offline.html';
  }
}

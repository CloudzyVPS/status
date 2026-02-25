import { API_BASE, STATUS_PAGE_SLUG } from '../appConfig.js';
import { updateState, state } from '../state.js';
import { renderRegionCards } from '../render/regions.js';
import { renderLatencyTable } from '../render/latency.js';
import { updateGlobalStatus } from '../render/globalStatus.js';
import { renderAnnouncements, updateRssLink } from '../render/announcements.js';
import { normalizeStatus, overallMessage, setUptimeFromBlocks } from '../utils/status.js';
import { mapStatusPayloadToRegions, mapAnnouncementsFromPayload } from './mapPayload.js';
import {
  fetchStatusPage,
  fetchAllRegionDetail,
  fetchIncidentFeedJson,
} from '../api/statusApi.js';

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

  try {
    /* ── Phase 1 — main status payload (critical path) ────── */
    const phase1Start = performance.now();
    const statusPayload = await fetchStatusPage(log);
    if (!statusPayload) {
      throw new Error('API returned empty or error response');
    }

    log?.info('Status payload received', {
      status: statusPayload.overall_status,
      groups: Array.isArray(statusPayload.groups) ? statusPayload.groups.length : 0,
      ungrouped: Array.isArray(statusPayload.ungrouped) ? statusPayload.ungrouped.length : 0,
      announcements: Array.isArray(statusPayload.announcements) ? statusPayload.announcements.length : 0,
      responseTime: `${(performance.now() - phase1Start).toFixed(2)}ms`,
    });

    const overall = normalizeStatus(statusPayload.overall_status || statusPayload.status);

    // Extract announcements from the main payload (inline data)
    const inlineAnnouncements = mapAnnouncementsFromPayload(statusPayload);

    // Extract status page metadata when available
    const pageMeta = {
      name: statusPayload.name || statusPayload.page_name || '',
      slug: statusPayload.slug || STATUS_PAGE_SLUG,
      banner: statusPayload.banner || null,
      layout_preset: statusPayload.layout_preset || 'balanced',
    };

    updateState({
      globalStatus: {
        status: overall,
        message: overallMessage(overall),
        lastUpdated: new Date().toISOString(),
      },
      regionStatusData: mapStatusPayloadToRegions(statusPayload),
      announcements: inlineAnnouncements,
      statusPageMeta: pageMeta,
    });

    syncGlobals();

    state.regionStatusData.forEach((r) => setUptimeFromBlocks(r.name, r.uptime_blocks, state.uptimeData));

    updateGlobalStatus(log);
    document.getElementById('header-status')?.classList.remove('loading');
    document.getElementById('hero-section')?.classList.remove('loading');

    renderRegionCards(onRegionSelect);
    document.getElementById('regions-section')?.classList.remove('loading');

    // Render inline announcements immediately (will be enriched in phase 2)
    renderAnnouncements();
    updateRssLink();
    document.getElementById('announcements-section')?.classList.remove('loading');

    log?.info('Phase 1 UI render complete - First paint achieved', {
      timeToFirstPaint: `${(performance.now() - loadStartTime).toFixed(2)}ms`,
    });

    /* ── Phase 2 — enrichment (region detail + incident feed) ─ */
    const phase2Start = performance.now();

    const [regionDetail, incidentFeed] = await Promise.allSettled([
      fetchAllRegionDetail(log),
      fetchIncidentFeedJson(log),
    ]);

    const detail = regionDetail.status === 'fulfilled' ? regionDetail.value : {};
    const feed = incidentFeed.status === 'fulfilled' ? incidentFeed.value : null;

    // Merge region detail
    const regionsRes = detail.regions;
    const uptimeRes = detail.uptime;
    const latencyRes = detail.latency;
    const incidentsRes = detail.incidents || [];
    const maintenanceRes = detail.maintenance || [];

    // If incident feed returned richer announcements, merge them
    let mergedAnnouncements = state.announcements;
    if (feed && Array.isArray(feed.incidents || feed.announcements || feed)) {
      const feedItems = feed.incidents || feed.announcements || feed;
      if (feedItems.length > 0) {
        // Prefer feed data – it is more detailed (has entries / timeline)
        const existingIds = new Set(mergedAnnouncements.map((a) => a.id).filter(Boolean));
        const newItems = feedItems.filter((f) => f.id && !existingIds.has(f.id));
        // Replace matching items with feed version (richer), keep extras
        mergedAnnouncements = feedItems.map((fi) => {
          const existing = mergedAnnouncements.find((a) => a.id === fi.id);
          return existing ? { ...existing, ...fi } : fi;
        });
        // Append any existing items that weren't in the feed
        for (const a of state.announcements) {
          if (a.id && !mergedAnnouncements.find((m) => m.id === a.id)) {
            mergedAnnouncements.push(a);
          }
        }
      }
    }

    updateState({
      regions: regionsRes?.regions ? regionsRes.regions.map((r) => ({ ...r, color: 0xd5ebff })) : state.regions,
      uptimeData: uptimeRes?.regions || state.uptimeData,
      networkDelays: latencyRes?.matrix || {},
      latencyHub: latencyRes?.hub || '',
      incidentFeed: Array.isArray(feed?.incidents || feed?.announcements || feed) ? (feed.incidents || feed.announcements || feed) : [],
      announcements: mergedAnnouncements,
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
    renderAnnouncements();
    document.getElementById('announcements-section')?.classList.remove('loading');

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
      announcementsLoaded: state.announcements.length,
      incidentFeedItems: state.incidentFeed.length,
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

/**
 * Public Status API client
 *
 * Wraps all unauthenticated /api/status/* endpoints from the
 * Cloudzy Status Page as a Service API (OpenAPI 3.0.3).
 */
import { API_BASE, STATUS_PAGE_SLUG } from '../appConfig.js';
import { fetchWithRetry } from '../data/fetch.js';

const base = () => `${API_BASE}/api/status`;
const slug = () => STATUS_PAGE_SLUG;

/* ── helper ────────────────────────────────────────────────── */

async function getJson(url, log, { retry = true } = {}) {
  try {
    const res = retry ? await fetchWithRetry(url, log) : await fetch(url);
    if (!res || !res.ok) return null;
    return res.json();
  } catch (err) {
    log?.warn?.(`[API] Failed to fetch ${url}: ${err.message}`);
    return null;
  }
}

/* ── Public Status endpoints ───────────────────────────────── */

/** GET /api/status/regions — list all known regions */
export function fetchGlobalRegions(log) {
  return getJson(`${base()}/regions`, log);
}

/** GET /api/status/{slug} — main status page payload */
export function fetchStatusPage(log) {
  return getJson(`${base()}/${slug()}`, log);
}

/** GET /api/status/{slug}/regions — region-level status breakdown */
export function fetchPageRegions(log) {
  return getJson(`${base()}/${slug()}/regions`, log, { retry: false });
}

/** GET /api/status/{slug}/regions/uptime — per-region uptime */
export function fetchPageRegionsUptime(log) {
  return getJson(`${base()}/${slug()}/regions/uptime`, log, { retry: false });
}

/** GET /api/status/{slug}/regions/latency — per-region latency matrix */
export function fetchPageRegionsLatency(log) {
  return getJson(`${base()}/${slug()}/regions/latency`, log, { retry: false });
}

/** GET /api/status/{slug}/regions/incidents — active incidents per region */
export function fetchPageRegionsIncidents(log) {
  return getJson(`${base()}/${slug()}/regions/incidents`, log, { retry: false });
}

/** GET /api/status/{slug}/regions/maintenance — scheduled maintenance per region */
export function fetchPageRegionsMaintenance(log) {
  return getJson(`${base()}/${slug()}/regions/maintenance`, log, { retry: false });
}

/** GET /api/status/{slug}/incidents.json — incident feed (JSON) */
export function fetchIncidentFeedJson(log) {
  return getJson(`${base()}/${slug()}/incidents.json`, log, { retry: false });
}

/** GET /api/status/incidents.json — global incident feed (JSON) */
export function fetchGlobalIncidentFeedJson(log) {
  return getJson(`${base()}/incidents.json`, log, { retry: false });
}

/**
 * Returns the RSS feed URL for the current status page.
 * This is a URL (not a fetch) so it can be linked in the UI.
 */
export function getIncidentFeedRssUrl() {
  return `${base()}/${slug()}/incidents.rss`;
}

/** Returns the global RSS feed URL */
export function getGlobalIncidentFeedRssUrl() {
  return `${base()}/incidents.rss`;
}

/* ── Convenience: load all phase-2 region detail in parallel ─ */

export async function fetchAllRegionDetail(log) {
  const [regions, uptime, latency, incidents, maintenance] = await Promise.allSettled([
    fetchPageRegions(log),
    fetchPageRegionsUptime(log),
    fetchPageRegionsLatency(log),
    fetchPageRegionsIncidents(log),
    fetchPageRegionsMaintenance(log),
  ]);

  return {
    regions: regions.status === 'fulfilled' ? regions.value : null,
    uptime: uptime.status === 'fulfilled' ? uptime.value : null,
    latency: latency.status === 'fulfilled' ? latency.value : null,
    incidents:
      incidents.status === 'fulfilled' && Array.isArray(incidents.value) ? incidents.value : [],
    maintenance:
      maintenance.status === 'fulfilled' && Array.isArray(maintenance.value)
        ? maintenance.value
        : [],
  };
}

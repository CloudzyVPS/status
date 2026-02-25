import { aggregateServiceStatus, normalizeStatus } from '../utils/status.js';

export function mapStatusPayloadToRegions(payload) {
  if (!payload) return [];
  const regions = [];

  const groups = Array.isArray(payload.groups) ? payload.groups : [];
  for (const group of groups) {
    const status = normalizeStatus(group.aggregate_status || group.status);
    const uptimeBlocks = Array.isArray(group.aggregate_uptime_blocks) ? group.aggregate_uptime_blocks : [];
    const services = Array.isArray(group.services) ? group.services : [];
    regions.push({
      name: group.name || 'Group',
      code: group.region_code || '',
      flag: group.flag || '',
      status,
      uptime: Math.round((group.aggregate_uptime ?? 100) * 100) / 100,
      uptime_blocks: uptimeBlocks,
      activeIncidents: [],
      scheduledMaintenance: [],
      services: services.map((s) => ({
        name: s.display_name || s.name,
        status: normalizeStatus(s.status),
        uptime: Math.round((s.uptime ?? 100) * 100) / 100,
        uptime_blocks: Array.isArray(s.uptime_blocks) ? s.uptime_blocks : [],
        labels: s.labels || [],
        protocol: s.protocol || '',
        latency: s.latency ?? null,
      })),
    });
  }

  const ungrouped = Array.isArray(payload.ungrouped) ? payload.ungrouped : [];
  if (ungrouped.length > 0) {
    regions.push({
      name: 'Ungrouped',
      code: '',
      flag: '',
      status: aggregateServiceStatus(ungrouped),
      uptime:
        Math.round(
          (ungrouped.reduce((sum, s) => sum + (s.uptime ?? 100), 0) / ungrouped.length) * 100
        ) / 100,
      uptime_blocks: [],
      activeIncidents: [],
      scheduledMaintenance: [],
      services: ungrouped.map((s) => ({
        name: s.display_name || s.name,
        status: normalizeStatus(s.status),
        uptime: Math.round((s.uptime ?? 100) * 100) / 100,
        uptime_blocks: Array.isArray(s.uptime_blocks) ? s.uptime_blocks : [],
        labels: s.labels || [],
        protocol: s.protocol || '',
        latency: s.latency ?? null,
      })),
    });
  }

  return regions;
}

/**
 * Extract announcements (incidents + maintenance) from the main status payload.
 * The API embeds these in `payload.announcements`.
 */
export function mapAnnouncementsFromPayload(payload) {
  if (!payload) return [];
  const raw = Array.isArray(payload.announcements) ? payload.announcements : [];
  return raw.map((a) => ({
    id: a.id || null,
    title: a.title || '',
    type: a.type || 'incident', // 'incident' | 'maintenance'
    status: a.status || 'investigating',
    summary: a.summary || '',
    starts_at: a.starts_at || a.created_at || null,
    ends_at: a.ends_at || null,
    resolved_at: a.resolved_at || null,
    published: a.published !== false,
    service_ids: a.service_ids || [],
    group_ids: a.group_ids || [],
    label_ids: a.label_ids || [],
    entries: Array.isArray(a.entries) ? a.entries : [],
  }));
}

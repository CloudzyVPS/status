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
      code: '',
      flag: '',
      status,
      uptime: Math.round((group.aggregate_uptime ?? 100) * 100) / 100,
      uptime_blocks: uptimeBlocks,
      activeIncidents: [],
      scheduledMaintenance: [],
      services: services.map((s) => ({
        name: s.display_name,
        status: normalizeStatus(s.status),
        uptime: Math.round((s.uptime ?? 100) * 100) / 100,
        uptime_blocks: Array.isArray(s.uptime_blocks) ? s.uptime_blocks : [],
        labels: s.labels || [],
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
        name: s.display_name,
        status: normalizeStatus(s.status),
        uptime: Math.round((s.uptime ?? 100) * 100) / 100,
        uptime_blocks: Array.isArray(s.uptime_blocks) ? s.uptime_blocks : [],
        labels: s.labels || [],
      })),
    });
  }

  return regions;
}

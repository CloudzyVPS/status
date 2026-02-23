export const STATUS_MAP = {
  operational: 'operational',
  degraded: 'degraded',
  partial_outage: 'outage',
  major_outage: 'outage',
  outage: 'outage',
  maintenance: 'maintenance',
  up: 'operational',
  down: 'outage',
  degraded_service: 'degraded',
};

export const STATUS_LABELS = {
  operational: 'Operational',
  degraded: 'Degraded',
  outage: 'Major Outage',
  maintenance: 'Maintenance',
  unknown: 'Unknown',
};

export const GLOBAL_STATUS_LABELS = {
  operational: 'All Systems Operational',
  degraded: 'Some Systems Experiencing Issues',
  outage: 'Major Outage Detected',
  maintenance: 'Maintenance In Progress',
};

export const GLOBAL_STATUS_ICONS = {
  operational: '<svg class="check-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>',
  degraded: '<svg class="check-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>',
  outage: '<svg class="check-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>',
  maintenance: '<svg class="check-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>',
};

export const STATUS_ICONS = {
  operational: '<svg class="icon" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>',
  degraded: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
  outage: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>',
  maintenance: '<svg class="icon" viewBox="0 0 24 24"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>',
  unknown: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>',
};

export const INCIDENT_ICON = '<svg class="badge-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>';
export const MAINTENANCE_ICON = '<svg class="badge-icon" viewBox="0 0 24 24"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>';

export function normalizeStatus(value = '') {
  const key = String(value || '').toLowerCase();
  return STATUS_MAP[key] || 'unknown';
}

export function overallMessage(status) {
  switch (status) {
    case 'outage':
      return 'Major outage detected';
    case 'degraded':
      return 'Some systems are experiencing issues';
    case 'maintenance':
      return 'Maintenance in progress';
    default:
      return 'All Systems Operational';
  }
}

export function aggregateServiceStatus(services = []) {
  const statuses = services.map((s) => normalizeStatus(s.status || s.current_status));
  if (statuses.includes('outage')) return 'outage';
  if (statuses.includes('degraded')) return 'degraded';
  return 'operational';
}

export function setUptimeFromBlocks(regionName, blocks = [], uptimeData) {
  if (!regionName || !uptimeData) return;
  const statuses = blocks.map((pct) => {
    if (pct === null || pct === undefined) return 'unknown';
    if (pct < 90) return 'outage';
    if (pct < 99) return 'degraded';
    return 'operational';
  });
  if (statuses.length) {
    uptimeData[regionName] = statuses;
  }
}

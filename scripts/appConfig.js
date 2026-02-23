const cfg = window.STATUS_CONFIG || {};

export const API_BASE = cfg.apiBase || 'https://monitoring.cloudzy.com';
export const STATUS_PAGE_SLUG = cfg.statusSlug || 'uptime';
export const REFRESH_INTERVAL = 5 * 60 * 1000;
export const PWA_ENABLED = false;

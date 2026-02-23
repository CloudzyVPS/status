import { state } from '../state.js';
import { GLOBAL_STATUS_ICONS, GLOBAL_STATUS_LABELS } from '../utils/status.js';

export function updateGlobalStatus(log) {
  const chipEl = document.querySelector('.global-status-chip');
  const heroStatusEl = document.querySelector('.status-badge-large');
  const heroMsgEl = document.querySelector('.hero-summary p');
  if (!chipEl || !heroStatusEl || !heroMsgEl) return;

  const status = state.globalStatus.status || 'unknown';
  const label = GLOBAL_STATUS_LABELS[status] || state.globalStatus.message || 'Unknown';

  chipEl.className = 'global-status-chip ' + status;
  chipEl.innerHTML = '<span class="status-dot"></span>' + label;

  heroStatusEl.className = 'status-badge-large ' + status;
  heroStatusEl.innerHTML = (GLOBAL_STATUS_ICONS[status] || '') + ' ' + label;

  heroMsgEl.textContent = state.globalStatus.message || label;

  if (state.globalStatus.lastUpdated) {
    const timeStr = new Date(state.globalStatus.lastUpdated)
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19) + ' UTC';
    const el = document.getElementById('last-update-time');
    if (el) el.textContent = timeStr;
    if (log) log.debug('Updated last-update timestamp', { time: timeStr });
  }

  if (log) log.info('Global status UI updated successfully', { appliedStatus: status, label });
}

import { state } from '../state.js';
import { INCIDENT_ICON, MAINTENANCE_ICON, STATUS_ICONS, STATUS_LABELS } from '../utils/status.js';

function getUptimeDays(regionName) {
  return state.uptimeData[regionName] || Array(30).fill('operational');
}

export function renderRegionCards(onSelectRegion) {
  const grid = document.getElementById('region-grid');
  if (!grid) return;

  grid.innerHTML = state.regionStatusData
    .map((region, index) => {
      const uptimeDays = getUptimeDays(region.name);
      const hasIncidents = region.activeIncidents && region.activeIncidents.length > 0;
      const hasMaintenance = region.scheduledMaintenance && region.scheduledMaintenance.length > 0;

      let badges = '';
      if (hasIncidents) {
        badges += `<span class="incident-badge incident">${INCIDENT_ICON}${region.activeIncidents.length} Incident${region.activeIncidents.length > 1 ? 's' : ''}</span>`;
      }
      if (hasMaintenance) {
        badges += `<span class="incident-badge maintenance">${MAINTENANCE_ICON}Maintenance</span>`;
      }

      return `
        <div class="region-card" data-region-index="${index}">
            <div class="region-card-header">
                <div class="region-info">
                    <h3>${region.flag || ''} ${region.name} <span class="region-code">${region.code}</span>${badges}</h3>
                </div>
                <span class="status-pill ${region.status}">
                    ${STATUS_ICONS[region.status] || '<span class="dot"></span>'}
                    ${STATUS_LABELS[region.status]}
                </span>
            </div>
            <div class="region-meta">
                <span>30-day uptime: ${region.uptime}%</span>
                <span>${!hasIncidents && !hasMaintenance ? 'No active issues' : ''}</span>
            </div>
            <div class="uptime-bar">
                ${uptimeDays.map((d) => `<div class="uptime-day ${d === 'operational' ? '' : d}"></div>`).join('')}
            </div>
        </div>
      `;
    })
    .join('');

  grid.querySelectorAll('[data-region-index]').forEach((card) => {
    card.addEventListener('click', () => {
      const idx = Number(card.getAttribute('data-region-index'));
      if (Number.isInteger(idx) && onSelectRegion) onSelectRegion(idx);
    });
  });
}

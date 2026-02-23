import { state } from '../state.js';
import { formatLastIncident } from '../utils/time.js';
import { INCIDENT_ICON, MAINTENANCE_ICON, STATUS_ICONS, STATUS_LABELS } from '../utils/status.js';

let currentRegionIndex = null;
let currentTab = 'overview';

export function openRegionPanel(index) {
  currentRegionIndex = index;
  const region = state.regionStatusData[index];
  if (!region) return;

  const nameEl = document.getElementById('panel-region-name');
  const codeEl = document.getElementById('panel-region-code');
  const statusEl = document.getElementById('panel-status-badge');

  if (nameEl) nameEl.textContent = `${region.flag || ''} ${region.name}`.trim();
  if (codeEl) codeEl.textContent = region.code;
  if (statusEl) {
    statusEl.innerHTML = `
      <span class="status-pill ${region.status}">
        ${STATUS_ICONS[region.status] || '<span class="dot"></span>'}
        ${STATUS_LABELS[region.status]}
      </span>
    `;
  }

  switchTab('overview');

  document.getElementById('region-panel-overlay')?.classList.add('active');
  document.getElementById('region-panel')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

export function closeRegionPanel() {
  document.getElementById('region-panel-overlay')?.classList.remove('active');
  document.getElementById('region-panel')?.classList.remove('active');
  document.body.style.overflow = '';
  currentRegionIndex = null;
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.panel-tab').forEach((t) => t.classList.remove('active'));
  const target = document.querySelector(`[data-tab="${tab}"]`);
  target?.classList.add('active');
  renderPanelContent();
}

function renderPanelContent() {
  if (currentRegionIndex === null) return;
  const region = state.regionStatusData[currentRegionIndex];
  const content = document.getElementById('panel-content');
  if (!region || !content) return;

  switch (currentTab) {
    case 'overview':
      content.innerHTML = renderOverviewTab(region);
      break;
    case 'incidents':
      content.innerHTML = renderIncidentsTab(region);
      break;
    case 'maintenance':
      content.innerHTML = renderMaintenanceTab(region);
      break;
    case 'latency':
      content.innerHTML = renderLatencyTab(region);
      break;
  }
}

function renderOverviewTab(region) {
  const hasIssues = region.status !== 'operational';
  const hasIncidents = region.activeIncidents && region.activeIncidents.length > 0;
  const hasServices = Array.isArray(region.services) && region.services.length > 0;

  let alertHtml = '';
  if (hasIssues && hasIncidents) {
    alertHtml = `<div class="panel-alert warning">There are currently issues affecting services in ${region.name} (${region.code}). See incidents tab for details.</div>`;
  } else if (region.status === 'maintenance') {
    alertHtml = `<div class="panel-alert info" style="background: var(--state-information-lighter); color: var(--state-information-dark); border-color: var(--state-information-light);">Scheduled maintenance is in progress. See maintenance tab for details.</div>`;
  } else {
    alertHtml = `<div class="panel-alert info">All services in ${region.name} (${region.code}) are operating normally.</div>`;
  }

  let incidentPreview = '';
  if (hasIncidents) {
    const incident = region.activeIncidents[0];
    incidentPreview = `
      <div class="panel-section">
          <h4 style="font-size: 14px; font-weight: 600; color: var(--text-strong); margin-bottom: 12px;">Active Incidents</h4>
          <div class="incident-card">
              <div class="incident-header">
                  <span class="incident-status-badge ${incident.status}">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2z"/></svg>
                      ${incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                  </span>
                  <span class="severity-badge ${incident.severity}">${incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)}</span>
              </div>
              <div class="incident-title">${incident.title}</div>
              <div class="incident-description">${incident.description}</div>
              <div class="incident-meta">
                  Started: ${incident.startedAt} • <span class="ongoing">Ongoing</span>
              </div>
          </div>
      </div>
    `;
  }

  const servicesList = hasServices
    ? `
      <div class="panel-section">
          <h4 style="font-size: 14px; font-weight: 600; color: var(--text-strong); margin-bottom: 12px;">Services</h4>
          <div class="service-list">
              ${region.services
                .map(
                  (svc) => `
                  <div class="service-row">
                      <div class="service-name">${svc.name}</div>
                      <div class="service-status ${svc.status}">
                          ${STATUS_ICONS[svc.status] || '<span class="dot"></span>'}
                          ${svc.status.charAt(0).toUpperCase() + svc.status.slice(1)}
                      </div>
                      <div class="service-uptime">${svc.uptime ?? 100}%</div>
                  </div>
              `
                )
                .join('')}
          </div>
      </div>
    `
    : '';

  return `
      ${alertHtml}
      <div class="stats-grid">
          <div class="stat-card">
              <div class="stat-label">30-Day Uptime</div>
              <div class="stat-value ${region.uptime > 99.9 ? 'success' : ''}">${region.uptime}%</div>
          </div>
          <div class="stat-card">
              <div class="stat-label">Last Incident</div>
              <div class="stat-value" style="font-size: 16px;">${formatLastIncident(region.lastIncident)}</div>
          </div>
      </div>
      ${servicesList}
      ${incidentPreview}
  `;
}

function renderIncidentsTab(region) {
  const hasIncidents = region.activeIncidents && region.activeIncidents.length > 0;

  if (!hasIncidents) {
    return `
      <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
          <div class="empty-state-text">No incidents reported for this region in the last 30 days.</div>
      </div>
    `;
  }

  return region.activeIncidents
    .map(
      (incident) => `
        <div class="incident-card">
            <div class="incident-header">
                <span class="incident-status-badge ${incident.status}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2z"/></svg>
                    ${incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                </span>
                <span class="severity-badge ${incident.severity}">${incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)}</span>
            </div>
            <div class="incident-title">${incident.title}</div>
            <div class="incident-description">${incident.description}</div>
            <div class="incident-meta">
                Started: ${incident.startedAt} • <span class="ongoing">Ongoing</span>
            </div>
            <div class="status-updates">
                <div class="status-updates-title">Status Updates</div>
                ${incident.updates
                  .map(
                    (update) => `
                    <div class="update-item">
                        <div class="update-dot ${update.status}"></div>
                        <div class="update-content">
                            <div class="update-header">
                                <span class="update-status">${update.status.charAt(0).toUpperCase() + update.status.slice(1)}</span>
                                <span class="update-time">${update.time}</span>
                            </div>
                            <div class="update-message">${update.message}</div>
                        </div>
                    </div>
                `
                  )
                  .join('')}
            </div>
        </div>
    `
    )
    .join('');
}

function renderMaintenanceTab(region) {
  const hasMaintenance = region.scheduledMaintenance && region.scheduledMaintenance.length > 0;

  if (!hasMaintenance) {
    return `
      <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
          <div class="empty-state-text">No scheduled maintenance for this region.</div>
      </div>
    `;
  }

  return region.scheduledMaintenance
    .map(
      (maint) => `
        <div class="incident-card">
            <div class="incident-header">
                <span class="incident-status-badge" style="background: var(--state-information-lighter); color: var(--state-information-base);">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>
                    Scheduled / In Progress
                </span>
            </div>
            <div class="incident-title">${maint.title}</div>
            <div class="incident-description">${maint.description}</div>
            <div class="incident-meta">
                Scheduled: ${maint.scheduledStart || 'TBD'} ${maint.scheduledEnd ? '→ ' + maint.scheduledEnd : ''}
            </div>
            <div class="incident-meta" style="color: var(--text-subtle);">Impact: ${maint.impact || 'Moderate'}</div>
        </div>
    `
    )
    .join('');
}

function renderLatencyTab(region) {
  const delays = state.networkDelays?.[region.name] || {};
  const entries = Object.entries(delays).map(([dest, latency]) => ({ dest, latency }));

  if (entries.length === 0) {
    return `
      <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
          <div class="empty-state-text">No latency data available for this region.</div>
      </div>
    `;
  }

  return `
      <div class="latency-list">
          ${entries
            .map((entry) => {
              let statusClass = 'low';
              let statusText = 'Normal';
              if (entry.latency >= 150) {
                statusClass = 'high';
                statusText = 'High';
              } else if (entry.latency >= 80) {
                statusClass = 'medium';
                statusText = 'Elevated';
              }
              return `
                  <div class="latency-item">
                      <div class="latency-destination">${entry.dest}</div>
                      <div class="latency-value ${statusClass}">${entry.latency} ms</div>
                      <div class="latency-status ${statusClass === 'low' ? 'operational' : statusClass === 'medium' ? 'degraded' : 'outage'}">${statusText}</div>
                  </div>
              `;
            })
            .join('')}
      </div>
  `;
}

export function initPanelControls() {
  document.getElementById('region-panel-overlay')?.addEventListener('click', closeRegionPanel);
  document.getElementById('panel-close')?.addEventListener('click', closeRegionPanel);
  document.querySelectorAll('.panel-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab) switchTab(tab);
    });
  });
}

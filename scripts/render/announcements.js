import { state } from '../state.js';
import { formatLastIncident } from '../utils/time.js';
import { getIncidentFeedRssUrl } from '../api/statusApi.js';

/**
 * Render the announcements (incidents + maintenance) section.
 * Data comes from state.announcements (populated by the incident feed endpoint).
 */
export function renderAnnouncements() {
  const container = document.getElementById('announcements-list');
  if (!container) return;

  const announcements = state.announcements || [];

  if (announcements.length === 0) {
    container.innerHTML = `
      <div class="announcement-empty">
        <svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40" style="opacity:.35">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
        </svg>
        <p>No recent incidents or maintenance windows.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = announcements
    .map((a) => {
      const isIncident = a.type === 'incident';
      const typeClass = isIncident ? 'incident' : 'maintenance';
      const typeLabel = isIncident ? 'Incident' : 'Maintenance';

      const statusLabel = a.status
        ? a.status.charAt(0).toUpperCase() + a.status.slice(1).replace(/_/g, ' ')
        : '';

      const startDate = a.starts_at ? formatLastIncident(a.starts_at) : '';
      const endDate = a.ends_at ? formatLastIncident(a.ends_at) : '';
      const resolvedDate = a.resolved_at ? formatLastIncident(a.resolved_at) : '';

      const isResolved = ['resolved', 'completed'].includes(a.status);

      const entries = Array.isArray(a.entries) ? a.entries : [];
      const publicEntries = entries.filter((e) => e.visibility !== 'internal');

      let timeline = '';
      if (publicEntries.length > 0) {
        timeline = `
          <div class="announcement-timeline">
            ${publicEntries
              .map((entry) => {
                const entryStatus = entry.status
                  ? entry.status.charAt(0).toUpperCase() + entry.status.slice(1).replace(/_/g, ' ')
                  : '';
                const entryTime = entry.created_at
                  ? new Date(entry.created_at).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';
                return `
                  <div class="announcement-entry">
                    <div class="entry-dot ${entry.status || ''}"></div>
                    <div class="entry-body">
                      <div class="entry-head">
                        <span class="entry-status">${entryStatus}</span>
                        <span class="entry-time">${entryTime}</span>
                      </div>
                      <div class="entry-message">${entry.message || ''}</div>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
        `;
      }

      return `
        <div class="announcement-card ${typeClass} ${isResolved ? 'resolved' : 'active'}">
          <div class="announcement-header">
            <span class="announcement-type-badge ${typeClass}">${typeLabel}</span>
            <span class="announcement-status-badge ${a.status || ''}">${statusLabel}</span>
          </div>
          <h4 class="announcement-title">${a.title || 'Untitled'}</h4>
          ${a.summary ? `<p class="announcement-summary">${a.summary}</p>` : ''}
          <div class="announcement-meta">
            ${startDate ? `<span>Started: ${startDate}</span>` : ''}
            ${endDate ? `<span>Ends: ${endDate}</span>` : ''}
            ${resolvedDate ? `<span>Resolved: ${resolvedDate}</span>` : ''}
          </div>
          ${timeline}
        </div>
      `;
    })
    .join('');
}

/**
 * Update the RSS feed link href.
 */
export function updateRssLink() {
  const rssLink = document.getElementById('rss-feed-link');
  if (rssLink) {
    rssLink.href = getIncidentFeedRssUrl();
  }
}

import { state } from '../state.js';

export function renderLatencyTable() {
  const table = document.getElementById('latency-table');
  const tbody = table?.querySelector('tbody');
  if (!tbody) return;

  if (!state.networkDelays || Object.keys(state.networkDelays).length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align:center; color: var(--text-subtle); padding: 16px;">Latency data not available</td></tr>';
    return;
  }

  const hubDelays =
    state.networkDelays[state.latencyHub] || state.networkDelays[Object.keys(state.networkDelays)[0]] || {};

  tbody.innerHTML = Object.keys(hubDelays)
    .map((dest) => {
      const latency = hubDelays[dest];
      const p95 = Math.round(latency * 1.15);
      let statusClass;
      let statusText;

      if (latency < 80) {
        statusClass = 'low';
        statusText = 'Normal';
      } else if (latency < 150) {
        statusClass = 'medium';
        statusText = 'Elevated';
      } else {
        statusClass = 'high';
        statusText = 'High';
      }

      const regionData = state.regions.find((r) => r.name === dest);
      const flag = regionData?.flag || '';

      return `
          <tr>
              <td>${flag} ${dest}</td>
              <td><span class="latency-value ${statusClass}">${latency} ms</span></td>
              <td><span class="latency-value ${statusClass}">${p95} ms</span></td>
              <td><span class="status-pill ${statusClass === 'low' ? 'operational' : statusClass === 'medium' ? 'degraded' : 'outage'}">${statusText}</span></td>
          </tr>
      `;
    })
    .join('');
}

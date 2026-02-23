function writeTimestamp() {
  const now = new Date();
  const timeStr = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const el = document.getElementById('last-update-time');
  if (el) el.textContent = timeStr;
}

export function startTimestampTicker() {
  writeTimestamp();
  setInterval(writeTimestamp, 60000);
}

export function formatLastIncident(isoOrNull) {
  if (!isoOrNull) return 'No incidents';
  try {
    const d = new Date(isoOrNull);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return isoOrNull;
  }
}

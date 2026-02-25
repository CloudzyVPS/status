export const state = {
  regions: [],
  networkDelays: {},
  latencyHub: '',
  regionStatusData: [],
  uptimeData: {},
  globalStatus: {},
  announcements: [],
  incidentFeed: [],
  statusPageMeta: {},
};

export function updateState(patch) {
  Object.assign(state, patch);
}

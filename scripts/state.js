export const state = {
  regions: [],
  networkDelays: {},
  latencyHub: '',
  regionStatusData: [],
  uptimeData: {},
  globalStatus: {},
};

export function updateState(patch) {
  Object.assign(state, patch);
}

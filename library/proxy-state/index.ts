export {
  createProxyState,
  updateProxyState,
  createComputedState,
  batch,
  subscribeToStates
} from './proxy-state';

export type {
  StateListener,
  ProxyState,
  StateOptions,
  NestedStateTracker,
  StateUpdate,
  ComputedStateOptions
} from './types'; 
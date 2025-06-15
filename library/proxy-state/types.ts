export type StateListener<T = any> = (newState: T, oldState: T, path: string[]) => void;

export type ProxyState<T> = T & {
  readonly __isProxyState: true;
  readonly __subscribe: (listener: StateListener<T>) => () => void;
  readonly __getSnapshot: () => T;
  readonly __getPath: () => string[];
};

export interface StateOptions {
  name?: string;
  deep?: boolean;
  equals?: (a: any, b: any) => boolean;
}

export interface NestedStateTracker {
  subscribe: (listener: StateListener) => () => void;
  getSnapshot: () => any;
  dispose: () => void;
}

export type StateUpdate<T> = Partial<T> | ((current: T) => Partial<T>);

export interface ComputedStateOptions<T> {
  equals?: (a: T, b: T) => boolean;
  name?: string;
  dependencies?: ProxyState<any>[];
} 
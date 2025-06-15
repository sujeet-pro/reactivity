export type SignalGetter<T> = () => T;
export type SignalSetter<T> = (value: T | ((prev: T) => T)) => void;
export type Signal<T> = [SignalGetter<T>, SignalSetter<T>];

export type EffectFunction = () => void | (() => void);
export type Effect = {
  dispose: () => void;
  isDisposed: boolean;
};

export type MemoGetter<T> = () => T;
export type Memo<T> = MemoGetter<T>;

export type ResourceState<T> = {
  loading: boolean;
  error?: Error;
  data?: T;
  refetch: () => Promise<void>;
};

export type Resource<T> = () => ResourceState<T>;

export interface SignalOptions {
  equals?: boolean | ((prev: any, next: any) => boolean);
  name?: string;
} 
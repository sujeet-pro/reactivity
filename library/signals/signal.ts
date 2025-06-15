import type {
  Signal,
  SignalGetter,
  SignalSetter,
  Effect,
  EffectFunction,
  Memo,
  Resource,
  ResourceState,
  SignalOptions
} from './types';

// Global context for tracking signal dependencies
let currentObserver: EffectFunction | null = null;
const observerStack: (EffectFunction | null)[] = [];

function runWithObserver<T>(observer: EffectFunction | null, fn: () => T): T {
  const prevObserver = currentObserver;
  observerStack.push(prevObserver);
  currentObserver = observer;
  
  try {
    return fn();
  } finally {
    currentObserver = observerStack.pop() || null;
  }
}

// Default equality check
const defaultEquals = (a: any, b: any): boolean => a === b;

/**
 * Creates a signal - a reactive primitive that can be read and written
 */
export function createSignal<T>(
  initialValue: T,
  options: SignalOptions = {}
): Signal<T> {
  let value = initialValue;
  const subscribers = new Set<EffectFunction>();
  const { equals = defaultEquals } = options;
  
  const getter: SignalGetter<T> = () => {
    // Register current observer as a dependency
    if (currentObserver) {
      subscribers.add(currentObserver);
    }
    return value;
  };
  
  const setter: SignalSetter<T> = (newValue: T | ((prev: T) => T)) => {
    const nextValue = typeof newValue === 'function' 
      ? (newValue as (prev: T) => T)(value)
      : newValue;
    
    // Only update if value actually changed
    const shouldUpdate = typeof equals === 'function' 
      ? !equals(value, nextValue)
      : !equals;
      
    if (shouldUpdate) {
      value = nextValue;
      
      // Notify all subscribers
      for (const subscriber of subscribers) {
        subscriber();
      }
    }
  };
  
  return [getter, setter];
}

/**
 * Creates an effect - a computation that automatically re-runs when its dependencies change
 */
export function createEffect(fn: EffectFunction): Effect {
  let isDisposed = false;
  let cleanup: (() => void) | undefined;
  
  const effect = () => {
    if (isDisposed) return;
    
    // Clean up previous run
    if (cleanup) {
      cleanup();
      cleanup = undefined;
    }
    
    // Run the effect function and capture potential cleanup
    const result = runWithObserver(effect, fn);
    if (typeof result === 'function') {
      cleanup = result;
    }
  };
  
  // Run effect immediately
  effect();
  
  return {
    dispose: () => {
      isDisposed = true;
      if (cleanup) {
        cleanup();
        cleanup = undefined;
      }
    },
    get isDisposed() {
      return isDisposed;
    }
  };
}

/**
 * Creates a memo - a derived signal that caches its computation
 */
export function createMemo<T>(fn: () => T, initialValue?: T): Memo<T> {
  let hasInitialValue = initialValue !== undefined;
  const [signal, setSignal] = createSignal<T>(
    hasInitialValue ? initialValue! : undefined as any
  );
  
  createEffect(() => {
    const value = fn();
    if (!hasInitialValue) {
      hasInitialValue = true;
      setSignal(value);
    } else {
      setSignal(value);
    }
  });
  
  return signal;
}

/**
 * Creates a resource - for handling async operations
 */
export function createResource<T>(
  fetcher: () => Promise<T>,
  initialValue?: T
): Resource<T> {
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<Error | undefined>(undefined);
  const [data, setData] = createSignal<T | undefined>(initialValue);
  
  const refetch = async (): Promise<void> => {
    setLoading(true);
    setError(undefined);
    
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };
  
  // Initial fetch
  refetch();
  
  return (): ResourceState<T> => ({
    loading: loading(),
    error: error(),
    data: data(),
    refetch
  });
} 
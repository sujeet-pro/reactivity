/**
 * @fileoverview Core implementation of the signals reactivity system.
 * This module provides the foundational reactive primitives for building
 * reactive applications with fine-grained dependency tracking.
 * 
 * @module signals
 */

import type {
  Signal,
  SignalGetter,
  SignalSetter,
  Effect,
  EffectFunction,
  Memo,
  Resource,
  ResourceState,
  SignalOptions,
  ExtendedEffect
} from './types';

/**
 * Debug mode flag for development environment.
 * When enabled, provides detailed logging about signal operations.
 * @internal
 */
let isDebugMode = false;

/**
 * Enable or disable debug mode for signals.
 * When enabled, provides detailed logging about signal operations.
 * 
 * @param enable - Whether to enable debug mode
 * @example
 * ```typescript
 * setDebugMode(true);
 * const [count, setCount] = createSignal(0);
 * // Will log signal operations
 * setCount(1);
 * ```
 */
export function setDebugMode(enable: boolean): void {
  isDebugMode = enable;
}

/**
 * Custom error class for signal-related errors.
 * Provides better error messages and stack traces for debugging.
 * 
 * @extends Error
 */
export class SignalError extends Error {
  constructor(message: string) {
    super(`[Signal Error] ${message}`);
    this.name = 'SignalError';
  }
}

/**
 * Global context for tracking signal dependencies during effect execution.
 * This maintains a stack of current observers to handle nested effects properly.
 * @internal
 */
let currentObserver: EffectFunction | null = null;
const observerStack: (EffectFunction | null)[] = [];

/**
 * Executes a function within a specific observer context.
 * This is crucial for proper dependency tracking in nested effects.
 * 
 * @internal
 * @param observer - The observer function to set as current, or null to clear
 * @param fn - The function to execute within the observer context
 * @returns The result of the executed function
 */
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

/**
 * Default equality check function for signal updates.
 * Uses strict equality comparison.
 * 
 * @internal
 * @param a - First value to compare
 * @param b - Second value to compare
 * @returns Whether the values are equal
 */
const defaultEquals = (a: any, b: any): boolean => a === b;

/**
 * Performance optimization: WeakMap to store signal metadata.
 * This allows signals to be garbage collected when no longer referenced.
 * 
 * @internal
 */
interface SignalMetadata {
  name: string | undefined;
  subscribers: Set<EffectFunction>;
  lastUpdated: number;
}

const signalMetadata = new WeakMap<SignalGetter<any>, SignalMetadata>();

/**
 * Creates a signal - a reactive primitive that can be read and written.
 * Signals are the foundation of the reactivity system, providing fine-grained
 * dependency tracking and automatic updates.
 * 
 * @template T - The type of value stored in the signal
 * @param initialValue - The initial value for the signal
 * @param options - Configuration options for the signal
 * @returns A tuple containing [getter, setter] functions
 * 
 * @example
 * ```typescript
 * const [count, setCount] = createSignal(0);
 * console.log(count()); // 0
 * setCount(5);
 * console.log(count()); // 5
 * 
 * // With options
 * const [obj, setObj] = createSignal({ x: 1 }, {
 *   equals: false, // Always notify subscribers
 *   name: 'objectSignal' // For debugging
 * });
 * ```
 * 
 * @throws {SignalError} If there's an error reading or writing the signal value
 */
export function createSignal<T>(
  initialValue: T,
  options: SignalOptions = {}
): Signal<T> {
  let value = initialValue;
  const subscribers = new Set<EffectFunction>();
  const { equals = defaultEquals, name } = options;
  
  const getter: SignalGetter<T> = () => {
    try {
      if (currentObserver) {
        subscribers.add(currentObserver);
      }
      
      if (isDebugMode) {
        console.debug(`[Signal:${name || 'anonymous'}] Read value:`, value);
      }
      
      return value;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      throw new SignalError(`Error reading signal value: ${error.message}`);
    }
  };
  
  const setter: SignalSetter<T> = (newValue: T | ((prev: T) => T)) => {
    try {
      const nextValue = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(value)
        : newValue;
      
      const shouldUpdate = typeof equals === 'function' 
        ? !equals(value, nextValue)
        : !equals;
        
      if (shouldUpdate) {
        const prevValue = value;
        value = nextValue;
        
        if (isDebugMode) {
          console.debug(`[Signal:${name || 'anonymous'}] Value updated:`, {
            from: prevValue,
            to: nextValue,
            subscribers: subscribers.size
          });
        }
        
        // Update metadata
        signalMetadata.set(getter, {
          name,
          subscribers,
          lastUpdated: Date.now()
        });
        
        // Notify subscribers in a try-catch block
        for (const subscriber of subscribers) {
          try {
            subscriber();
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            console.error(`[Signal:${name || 'anonymous'}] Error in subscriber:`, error);
          }
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      throw new SignalError(`Error setting signal value: ${error.message}`);
    }
  };
  
  // Initialize metadata
  signalMetadata.set(getter, {
    name,
    subscribers,
    lastUpdated: Date.now()
  });
  
  return [getter, setter];
}

/**
 * Creates an effect - a computation that automatically re-runs when its dependencies change.
 * Effects are the primary way to create side effects in the reactive system.
 * 
 * @param fn - The effect function to execute
 * @returns An effect object with dispose method and error tracking
 * 
 * @example
 * ```typescript
 * const [count, setCount] = createSignal(0);
 * 
 * const effect = createEffect(() => {
 *   console.log(`Count is now: ${count()}`);
 *   // Optional cleanup function
 *   return () => console.log('Cleaning up');
 * });
 * 
 * setCount(5); // Logs: "Count is now: 5"
 * effect.dispose(); // Cleans up and stops tracking
 * ```
 * 
 * @throws {SignalError} If there's an error during effect execution
 */
export function createEffect(fn: EffectFunction): ExtendedEffect {
  let isDisposed = false;
  let cleanup: (() => void) | undefined;
  let lastError: Error | undefined;
  let retryCount = 0;
  const MAX_RETRIES = 3;
  
  const effect = () => {
    if (isDisposed) return;
    
    try {
      // Clean up previous run
      if (cleanup) {
        try {
          cleanup();
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          console.error('[Effect] Error during cleanup:', error);
        }
        cleanup = undefined;
      }
      
      // Run with dependency tracking
      const result = runWithObserver(effect, fn);
      if (typeof result === 'function') {
        cleanup = result;
      }
      
      // Reset error state on successful run
      lastError = undefined;
      retryCount = 0;
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      lastError = error;
      
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        if (isDebugMode) {
          console.debug(`[Effect] Retrying after error (${retryCount}/${MAX_RETRIES}):`, error);
        }
        // Exponential backoff retry
        setTimeout(effect, Math.pow(2, retryCount) * 100);
      } else {
        console.error('[Effect] Max retries exceeded:', error);
      }
    }
  };
  
  // Execute immediately
  effect();
  
  return {
    dispose: () => {
      isDisposed = true;
      if (cleanup) {
        try {
          cleanup();
          cleanup = undefined;
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          console.error('[Effect] Error during cleanup:', error);
        }
      }
    },
    get isDisposed() {
      return isDisposed;
    },
    get lastError() {
      return lastError;
    }
  };
}

/**
 * Creates a memo - a derived signal that caches its computation.
 * Memos only recompute when their dependencies change, providing performance optimization.
 * 
 * @template T - The type of the computed value
 * @param fn - The computation function
 * @param initialValue - Optional initial value (useful for avoiding undefined on first access)
 * @returns A memo getter function
 * 
 * @example
 * ```typescript
 * const [count, setCount] = createSignal(5);
 * const doubled = createMemo(() => count() * 2);
 * 
 * console.log(doubled()); // 10
 * setCount(10);
 * console.log(doubled()); // 20
 * ```
 */
export function createMemo<T>(fn: () => T, initialValue?: T): Memo<T> {
  const [signal, setSignal] = createSignal<T>(
    initialValue !== undefined ? initialValue : (fn() as T),
    { name: 'memo', equals: false } // Force updates since we control when to compute
  );
  
  // Run effect to track dependencies and update value
  createEffect(() => {
    const value = fn();
    setSignal(value);
  });
  
  return signal;
}

/**
 * Creates a resource - for handling async operations with loading states.
 * Resources provide a convenient way to manage async data fetching with
 * built-in loading, error, and data states.
 * 
 * @template T - The type of the resource data
 * @param fetcher - Async function that fetches the data
 * @param initialValue - Optional initial value for the resource
 * @returns A resource getter function that returns the current state
 * 
 * @example
 * ```typescript
 * const userResource = createResource(async () => {
 *   const response = await fetch('/api/user');
 *   return response.json();
 * });
 * 
 * const state = userResource();
 * console.log(state.loading); // true/false
 * console.log(state.data); // user data or undefined
 * console.log(state.error); // error or undefined
 * 
 * // Refetch data
 * await state.refetch();
 * ```
 * 
 * @throws {SignalError} If there's an error during data fetching
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
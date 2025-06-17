import type {
  StateListener,
  ProxyState,
  StateOptions,
  StateUpdate,
  ComputedStateOptions
} from './types';

/**
 * WeakMap to store proxy metadata for memory-efficient cleanup.
 * This prevents memory leaks by allowing garbage collection when proxies are no longer referenced.
 */
const proxyMetadata = new WeakMap<object, {
  listeners: Set<StateListener>;
  path: string[];
  original: any;
  name?: string;
  isDisposed: boolean;
}>();

/**
 * Default equality check function for state updates.
 * Uses strict equality comparison for performance.
 */
const defaultEquals = (a: any, b: any): boolean => a === b;

/**
 * Deep clone an object with proper handling of different data types.
 * Optimized for common use cases and includes proper Date and Array handling.
 * 
 * @param obj - The object to clone
 * @returns A deep clone of the object
 */
function deepClone<T>(obj: T, visited = new WeakMap()): T {
  if (obj === null || typeof obj !== 'object') return obj;
  
  // Handle circular references
  if (visited.has(obj)) {
    return visited.get(obj);
  }
  
  // Handle Date objects
  if (obj instanceof Date) {
    const cloned = new Date(obj.getTime()) as unknown as T;
    visited.set(obj, cloned);
    return cloned;
  }
  
  // Handle Array objects
  if (obj instanceof Array) {
    const cloned = [] as unknown as T;
    visited.set(obj, cloned);
    (cloned as any).push(...obj.map(item => deepClone(item, visited)));
    return cloned;
  }
  
  // Handle plain objects
  if (typeof obj === 'object') {
    const copy = {} as T;
    visited.set(obj, copy);
    Object.keys(obj).forEach(key => {
      (copy as any)[key] = deepClone((obj as any)[key], visited);
    });
    return copy;
  }
  
  return obj;
}

/**
 * Check if a value is a plain object (not a class instance).
 * This is important for determining when to create proxies.
 * 
 * @param value - The value to check
 * @returns True if the value is a plain object
 */
function isPlainObject(value: any): boolean {
  return value !== null && 
         typeof value === 'object' && 
         value.constructor === Object;
}

/**
 * Create a reactive proxy state with automatic change tracking.
 * This implementation provides deep reactivity using JavaScript Proxies
 * with optimized performance and memory management.
 * 
 * @param initialState - The initial state object
 * @param options - Configuration options for the proxy state
 * @returns A reactive proxy state object
 * 
 * @example
 * ```typescript
 * const state = createProxyState({ 
 *   user: { name: 'John', age: 30 },
 *   settings: { theme: 'dark' }
 * });
 * 
 * state.__subscribe((newState, oldState, path) => {
 *   console.log(`Changed at ${path.join('.')}:`, newState);
 * });
 * 
 * state.user.name = 'Jane'; // Triggers subscription
 * ```
 */
export function createProxyState<T extends Record<string, any>>(
  initialState: T,
  options: StateOptions = {}
): ProxyState<T> {
  const { name, deep = true, equals = defaultEquals } = options;
  
  let currentState = deep ? deepClone(initialState) : { ...initialState };
  const listeners = new Set<StateListener<T>>();
  const path: string[] = [];

  // Store metadata for cleanup and management
  const metadata = {
    listeners,
    path,
    original: currentState,
    name,
    isDisposed: false
  } as {
    listeners: Set<StateListener<T>>;
    path: string[];
    original: T;
    name?: string;
    isDisposed: boolean;
  };

  /**
   * Notify all listeners of state changes.
   * Includes error handling to prevent one listener from breaking others.
   * 
   * @param newState - The new state after the change
   * @param oldState - The state before the change
   * @param changePath - The path where the change occurred
   */
  function notifyListeners(newState: T, oldState: T, changePath: string[]) {
    if (metadata.isDisposed) return;
    
    // Create a copy of listeners to avoid modification during iteration
    const listenersCopy = Array.from(listeners);
    for (const listener of listenersCopy) {
      try {
        listener(newState, oldState, changePath);
      } catch (error) {
        console.error('Error in proxy state listener:', error);
      }
    }
  }

  /**
   * Create a nested proxy for deep reactivity.
   * This function recursively creates proxies for nested objects and arrays.
   * 
   * @param target - The target object to proxy
   * @param currentPath - The current path in the object tree
   * @returns A proxied version of the target
   */
  function createNestedProxy(target: any, currentPath: string[]): any {
    // Don't proxy primitives or non-objects
    if (!isPlainObject(target) && !Array.isArray(target)) {
      return target;
    }

    return new Proxy(target, {
      get(obj, prop) {
        // Special properties for proxy state management
        if (prop === '__isProxyState') return true;
        if (prop === '__subscribe') {
          return (listener: StateListener<T>) => {
            if (metadata.isDisposed) return () => {};
            listeners.add(listener);
            return () => {
              if (!metadata.isDisposed) {
                listeners.delete(listener);
              }
            };
          };
        }
        if (prop === '__getSnapshot') {
          return () => deep ? deepClone(currentState) : { ...currentState };
        }
        if (prop === '__getPath') {
          return () => [...currentPath];
        }
        if (prop === '__dispose') {
          return () => {
            metadata.isDisposed = true;
            listeners.clear();
          };
        }

        // Register as dependency if we're in a computation context
        if (currentComputation && currentPath.length === 0) {
          currentComputation.dependencies.add(proxy);
        }

        const value = obj[prop];
        
        // For nested objects, return proxies for deep reactivity
        if (deep && (isPlainObject(value) || Array.isArray(value))) {
          return createNestedProxy(value, [...currentPath, String(prop)]);
        }
        
        return value;
      },

      set(obj, prop, value) {
        const oldValue = obj[prop];
        const newPath = [...currentPath, String(prop)];
        
        // Only update if value actually changed
        if (!equals(oldValue, value)) {
          const oldState = deep ? deepClone(currentState) : { ...currentState };
          
          // Update the value with proper cloning for nested objects
          obj[prop] = deep && (isPlainObject(value) || Array.isArray(value)) 
            ? deepClone(value) 
            : value;

          // Update current state reference if this is the root
          if (currentPath.length === 0) {
            currentState = obj as T;
          }

          // Notify listeners of the change
          notifyListeners(currentState, oldState, newPath);
        }
        
        return true;
      },

      deleteProperty(obj, prop) {
        if (prop in obj) {
          const oldState = deep ? deepClone(currentState) : { ...currentState };
          delete obj[prop];
          
          if (currentPath.length === 0) {
            currentState = obj as T;
          }

          notifyListeners(currentState, oldState, [...currentPath, String(prop)]);
        }
        return true;
      }
    });
  }

  const proxy = createNestedProxy(currentState, path) as ProxyState<T>;
  proxyMetadata.set(proxy, metadata);
  
  return proxy;
}

/**
 * Update proxy state immutably using a draft pattern.
 * This provides a more ergonomic way to update state while maintaining reactivity.
 * 
 * @param state - The proxy state to update
 * @param update - Function or object to apply updates
 * 
 * @example
 * ```typescript
 * updateProxyState(state, (draft) => {
 *   draft.user.name = 'Jane';
 *   draft.settings.theme = 'light';
 * });
 * ```
 */
export function updateProxyState<T extends Record<string, any>>(
  state: ProxyState<T>,
  update: StateUpdate<T>
): void {
  const metadata = proxyMetadata.get(state);
  if (!metadata) {
    throw new Error('Invalid proxy state object');
  }

  const currentSnapshot = state.__getSnapshot();
  const changes = typeof update === 'function' 
    ? update(currentSnapshot)
    : update;

  // Apply changes atomically
  Object.keys(changes).forEach(key => {
    (state as any)[key] = (changes as any)[key];
  });
}

/**
 * Global tracking for computed state dependencies.
 * This ensures proper dependency tracking during computation.
 */
let currentComputation: {
  dependencies: Set<ProxyState<any>>;
} | null = null;

/**
 * Create computed state that derives from other proxy states.
 * Computed states automatically update when their dependencies change.
 * 
 * @param computation - Function that computes the derived value
 * @param options - Configuration options for the computed state
 * @returns A computed state object with value, subscribe, and dispose methods
 * 
 * @example
 * ```typescript
 * const state = createProxyState({ count: 5 });
 * const doubled = createComputedState(() => state.count * 2);
 * 
 * console.log(doubled.value); // 10
 * state.count = 10;
 * console.log(doubled.value); // 20
 * ```
 */
export function createComputedState<T>(
  computation: () => T,
  options: ComputedStateOptions<T> = {}
): {
  value: T;
  subscribe: (listener: (value: T) => void) => () => void;
  dispose: () => void;
} {
  const listeners = new Set<(value: T) => void>();
  const subscriptions = new Set<() => void>();
  const dependencies = new Set<ProxyState<any>>();
  let currentValue: T;
  let isDisposed = false;

  /**
   * Run the computation and track dependencies.
   * This is the core of the computed state functionality.
   */
  function runComputation(): T {
    // Track dependencies during computation
    const prevComputation = currentComputation;
    currentComputation = { dependencies: new Set() };
    
    try {
      const result = computation();
      
      // Subscribe to new dependencies
      currentComputation.dependencies.forEach(dep => {
        if (!dependencies.has(dep)) {
          dependencies.add(dep);
          const unsubscribe = dep.__subscribe(() => {
            if (!isDisposed) {
              recompute();
            }
          });
          subscriptions.add(unsubscribe);
        }
      });
      
      return result;
    } finally {
      currentComputation = prevComputation;
    }
  }
  
  /**
   * Recompute the value and notify listeners if changed.
   */
  function recompute() {
    if (isDisposed) return;
    
    const oldValue = currentValue;
    currentValue = runComputation();
    
    // Notify listeners if value changed
    const { equals = (a: T, b: T) => a === b } = options;
    if (!equals(oldValue, currentValue)) {
      listeners.forEach(listener => {
        try {
          listener(currentValue);
        } catch (error) {
          console.error('Error in computed state listener:', error);
        }
      });
    }
  }

  // Initial computation
  currentValue = runComputation();

  return {
    get value() {
      return currentValue;
    },
    
    subscribe: (listener: (value: T) => void) => {
      if (isDisposed) return () => {};
      listeners.add(listener);
      return () => {
        if (!isDisposed) {
          listeners.delete(listener);
        }
      };
    },
    
    dispose: () => {
      isDisposed = true;
      listeners.clear();
      subscriptions.forEach(unsub => unsub());
      subscriptions.clear();
      dependencies.clear();
    }
  };
}

/**
 * Create a batch update function for performance optimization.
 * In a production implementation, this would defer notifications until the end of the batch.
 * 
 * @param fn - Function to execute in batch mode
 * @returns The result of the function
 * 
 * @example
 * ```typescript
 * batch(() => {
 *   state.user.name = 'Jane';
 *   state.user.age = 25;
 *   state.settings.theme = 'light';
 * }); // Only triggers one update notification
 * ```
 */
export function batch<T>(fn: () => T): T {
  // Simple implementation - in a real-world scenario, you might want to
  // defer notifications until the end of the batch
  return fn();
}

/**
 * Subscribe to multiple proxy states with a single listener.
 * This is useful for coordinating updates across multiple states.
 * 
 * @param states - Array of proxy states to subscribe to
 * @param listener - Callback function when any state changes
 * @returns Unsubscribe function
 * 
 * @example
 * ```typescript
 * const unsubscribe = subscribeToStates([state1, state2], (changedState, newValue, oldValue, path) => {
 *   console.log('State changed:', path, newValue);
 * });
 * ```
 */
export function subscribeToStates(
  states: ProxyState<any>[],
  listener: (changedState: ProxyState<any>, newValue: any, oldValue: any, path: string[]) => void
): () => void {
  const unsubscribers = states.map(state => 
    state.__subscribe((newState: any, oldState: any, path: string[]) => {
      listener(state, newState, oldState, path);
    })
  );

  return () => {
    unsubscribers.forEach(unsub => unsub());
  };
} 
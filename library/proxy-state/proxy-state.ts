import type {
  StateListener,
  ProxyState,
  StateOptions,
  StateUpdate,
  ComputedStateOptions
} from './types';

// WeakMap to store proxy metadata
const proxyMetadata = new WeakMap<object, {
  listeners: Set<StateListener>;
  path: string[];
  original: any;
  name?: string;
}>();

const defaultEquals = (a: any, b: any): boolean => a === b;

/**
 * Deep clone an object
 */
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === 'object') {
    const copy = {} as T;
    Object.keys(obj).forEach(key => {
      (copy as any)[key] = deepClone((obj as any)[key]);
    });
    return copy;
  }
  return obj;
}

/**
 * Check if a value is a plain object
 */
function isPlainObject(value: any): boolean {
  return value !== null && 
         typeof value === 'object' && 
         value.constructor === Object;
}

/**
 * Create a reactive proxy state
 */
export function createProxyState<T extends Record<string, any>>(
  initialState: T,
  options: StateOptions = {}
): ProxyState<T> {
  const { name, deep = true, equals = defaultEquals } = options;
  
  let currentState = deep ? deepClone(initialState) : { ...initialState };
  const listeners = new Set<StateListener<T>>();
  const path: string[] = [];

  // Store metadata
  const metadata = {
    listeners,
    path,
    original: currentState,
    name
  };

  function notifyListeners(newState: T, oldState: T, changePath: string[]) {
    for (const listener of listeners) {
      listener(newState, oldState, changePath);
    }
  }

  function createNestedProxy(target: any, currentPath: string[]): any {
    if (!isPlainObject(target) && !Array.isArray(target)) {
      return target;
    }

    return new Proxy(target, {
      get(obj, prop) {
        if (prop === '__isProxyState') return true;
        if (prop === '__subscribe') {
          return (listener: StateListener<T>) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
          };
        }
        if (prop === '__getSnapshot') {
          return () => deep ? deepClone(currentState) : { ...currentState };
        }
        if (prop === '__getPath') {
          return () => [...currentPath];
        }

        // Register as dependency if we're in a computation
        if (currentComputation && currentPath.length === 0) {
          currentComputation.dependencies.add(proxy);
        }

        const value = obj[prop];
        
        // For nested objects, return proxies
        if (deep && (isPlainObject(value) || Array.isArray(value))) {
          return createNestedProxy(value, [...currentPath, String(prop)]);
        }
        
        return value;
      },

      set(obj, prop, value) {
        const oldValue = obj[prop];
        const newPath = [...currentPath, String(prop)];
        
        if (!equals(oldValue, value)) {
          const oldState = deep ? deepClone(currentState) : { ...currentState };
          
          // Update the value
          obj[prop] = deep && (isPlainObject(value) || Array.isArray(value)) 
            ? deepClone(value) 
            : value;

          // Update current state reference if this is the root
          if (currentPath.length === 0) {
            currentState = obj as T;
          }

          // Notify listeners
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
 * Update proxy state immutably
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

  // Apply changes
  Object.keys(changes).forEach(key => {
    (state as any)[key] = (changes as any)[key];
  });
}

// Global tracking for computed state dependencies
let currentComputation: {
  dependencies: Set<ProxyState<any>>;
} | null = null;

/**
 * Create computed state that derives from other proxy states
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
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
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
 * Create a batch update function
 */
export function batch<T>(fn: () => T): T {
  // Simple implementation - in a real-world scenario, you might want to
  // defer notifications until the end of the batch
  return fn();
}

/**
 * Subscribe to multiple proxy states
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
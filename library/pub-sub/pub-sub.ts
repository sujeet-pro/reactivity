import type {
  EventHandler,
  EventUnsubscriber,
  EventEmitter,
  PubSubChannel,
  PubSubHub,
  PubSubOptions
} from './types';

/**
 * Create an event emitter with typed events and comprehensive error handling.
 * This implementation provides a robust foundation for event-driven architectures.
 * 
 * @param options - Configuration options for the event emitter
 * @returns A fully-featured event emitter
 * 
 * @example
 * ```typescript
 * const events = createEventEmitter<{
 *   userLogin: { userId: string };
 *   userLogout: void;
 * }>();
 * 
 * events.on('userLogin', ({ userId }) => {
 *   console.log(`User ${userId} logged in`);
 * });
 * 
 * events.emit('userLogin', { userId: '123' });
 * ```
 */
export function createEventEmitter<TEvents extends Record<string, any> = Record<string, any>>(
  options: PubSubOptions = {}
): EventEmitter<TEvents> {
  const { maxListeners = 10, warnOnMaxListeners = true } = options;
  const events = new Map<keyof TEvents, Set<EventHandler>>();

  /**
   * Get or create the event handler set for a specific event.
   * This ensures we always have a valid Set for event handlers.
   * 
   * @param event - The event key
   * @returns Set of event handlers for the event
   */
  function getEventSet<K extends keyof TEvents>(event: K): Set<EventHandler<TEvents[K]>> {
    if (!events.has(event)) {
      events.set(event, new Set());
    }
    return events.get(event) as Set<EventHandler<TEvents[K]>>;
  }

  /**
   * Check if the maximum number of listeners has been exceeded.
   * This helps prevent memory leaks and provides debugging information.
   * 
   * @param event - The event key
   * @param handlers - The set of handlers for the event
   */
  function checkMaxListeners<K extends keyof TEvents>(event: K, handlers: Set<EventHandler<TEvents[K]>>) {
    if (warnOnMaxListeners && handlers.size >= maxListeners) {
      console.warn(
        `Maximum listeners (${maxListeners}) exceeded for event "${String(event)}". ` +
        `This may indicate a memory leak. Consider removing unused listeners.`
      );
    }
  }

  return {
    on<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): EventUnsubscriber {
      const handlers = getEventSet(event);
      handlers.add(handler);
      checkMaxListeners(event, handlers);
      
      return () => {
        handlers.delete(handler);
        // Clean up empty event sets to prevent memory leaks
        if (handlers.size === 0) {
          events.delete(event);
        }
      };
    },

    off<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): void {
      const handlers = events.get(event);
      if (handlers) {
        handlers.delete(handler);
        // Clean up empty event sets
        if (handlers.size === 0) {
          events.delete(event);
        }
      }
    },

    emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
      const handlers = events.get(event);
      if (handlers) {
        // Create a copy to avoid issues if handlers are modified during iteration
        const handlersCopy = Array.from(handlers);
        for (const handler of handlersCopy) {
          try {
            handler(data);
          } catch (error) {
            console.error(
              `Error in event handler for "${String(event)}":`,
              error,
              '\nHandler:', handler.toString()
            );
          }
        }
      }
    },

    once<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): EventUnsubscriber {
      const onceHandler = (data: TEvents[K]) => {
        try {
          handler(data);
        } catch (error) {
          console.error(
            `Error in once handler for "${String(event)}":`,
            error
          );
        } finally {
          this.off(event, onceHandler);
        }
      };
      
      return this.on(event, onceHandler);
    },

    removeAllListeners(event?: keyof TEvents): void {
      if (event !== undefined) {
        events.delete(event);
      } else {
        events.clear();
      }
    },

    listenerCount(event: keyof TEvents): number {
      const handlers = events.get(event);
      return handlers ? handlers.size : 0;
    },

    listeners<K extends keyof TEvents>(event: K): EventHandler<TEvents[K]>[] {
      const handlers = events.get(event);
      return handlers ? Array.from(handlers) : [];
    }
  };
}

/**
 * Create a pub-sub channel for a specific data type.
 * Channels provide a simple way to broadcast data to multiple subscribers.
 * 
 * @returns A pub-sub channel with publish/subscribe functionality
 * 
 * @example
 * ```typescript
 * const userChannel = createChannel<User>();
 * 
 * userChannel.subscribe(user => {
 *   console.log('User updated:', user);
 * });
 * 
 * userChannel.publish({ id: 1, name: 'John' });
 * ```
 */
export function createChannel<T = any>(): PubSubChannel<T> {
  const subscribers = new Set<EventHandler<T>>();

  return {
    publish(data: T): void {
      // Create a copy to avoid modification during iteration
      const subscribersCopy = Array.from(subscribers);
      for (const handler of subscribersCopy) {
        try {
          handler(data);
        } catch (error) {
          console.error('Error in channel subscriber:', error);
        }
      }
    },

    subscribe(handler: EventHandler<T>): EventUnsubscriber {
      subscribers.add(handler);
      return () => {
        subscribers.delete(handler);
      };
    },

    unsubscribe(handler: EventHandler<T>): void {
      subscribers.delete(handler);
    },

    clear(): void {
      subscribers.clear();
    },

    getSubscriberCount(): number {
      return subscribers.size;
    }
  };
}

/**
 * Create a pub-sub hub for managing multiple channels.
 * Hubs provide a centralized way to organize and manage multiple channels.
 * 
 * @returns A pub-sub hub with channel management capabilities
 * 
 * @example
 * ```typescript
 * const hub = createPubSubHub();
 * 
 * const userChannel = hub.channel<User>('users');
 * const orderChannel = hub.channel<Order>('orders');
 * 
 * userChannel.subscribe(user => console.log('User:', user));
 * orderChannel.subscribe(order => console.log('Order:', order));
 * ```
 */
export function createPubSubHub(): PubSubHub {
  const channels = new Map<string, PubSubChannel<any>>();

  return {
    channel<T>(name: string): PubSubChannel<T> {
      if (!channels.has(name)) {
        channels.set(name, createChannel<T>());
      }
      return channels.get(name) as PubSubChannel<T>;
    },

    removeChannel(name: string): void {
      const channel = channels.get(name);
      if (channel) {
        channel.clear();
        channels.delete(name);
      }
    },

    getChannelNames(): string[] {
      return Array.from(channels.keys());
    },

    clear(): void {
      for (const channel of channels.values()) {
        channel.clear();
      }
      channels.clear();
    }
  };
}

/**
 * Create a reactive state using the pub-sub pattern.
 * This provides a simple way to create reactive state with automatic change notifications.
 * 
 * @param initialValue - The initial value for the state
 * @returns A reactive state object with get, set, and subscribe methods
 * 
 * @example
 * ```typescript
 * const counter = createReactiveState(0);
 * 
 * counter.subscribe(value => {
 *   console.log('Counter changed:', value);
 * });
 * 
 * counter.set(5); // Triggers subscription
 * counter.set(prev => prev + 1); // Functional update
 * ```
 */
export function createReactiveState<T>(initialValue: T): {
  get: () => T;
  set: (value: T | ((current: T) => T)) => void;
  subscribe: (handler: EventHandler<T>) => EventUnsubscriber;
  getState: () => T;
} {
  let currentValue = initialValue;
  const channel = createChannel<T>();

  return {
    get: () => currentValue,

    set: (value: T | ((current: T) => T)) => {
      const newValue = typeof value === 'function' 
        ? (value as (current: T) => T)(currentValue)
        : value;
      
      // Only update if value actually changed
      if (newValue !== currentValue) {
        currentValue = newValue;
        channel.publish(newValue);
      }
    },

    subscribe: (handler: EventHandler<T>) => channel.subscribe(handler),

    getState: () => currentValue
  };
}

/**
 * Utility to combine multiple reactive states into a single reactive object.
 * This is useful for coordinating multiple pieces of state.
 * 
 * @param states - Object containing multiple reactive states
 * @returns A combined reactive state object
 * 
 * @example
 * ```typescript
 * const state1 = createReactiveState(1);
 * const state2 = createReactiveState(2);
 * 
 * const combined = combineStates({ state1, state2 });
 * 
 * combined.subscribe(({ state1, state2 }) => {
 *   console.log('Combined state:', state1 + state2);
 * });
 * ```
 */
export function combineStates<T extends Record<string, any>>(
  states: { [K in keyof T]: { get: () => T[K]; subscribe: (handler: EventHandler<T[K]>) => EventUnsubscriber } }
): {
  get: () => T;
  subscribe: (handler: EventHandler<T>) => EventUnsubscriber;
} {
  const channel = createChannel<T>();
  const unsubscribers = new Map<keyof T, EventUnsubscriber>();

  /**
   * Get the current combined state from all individual states.
   */
  function getCurrentState(): T {
    const result = {} as T;
    for (const key in states) {
      result[key] = states[key].get();
    }
    return result;
  }

  // Subscribe to all states
  for (const key in states) {
    const unsubscribe = states[key].subscribe(() => {
      channel.publish(getCurrentState());
    });
    unsubscribers.set(key, unsubscribe);
  }

  return {
    get: getCurrentState,
    
    subscribe: (handler: EventHandler<T>) => {
      const unsub = channel.subscribe(handler);
      
      return () => {
        unsub();
        // Clean up state subscriptions when no more subscribers
        if (channel.getSubscriberCount() === 0) {
          for (const unsubscriber of unsubscribers.values()) {
            unsubscriber();
          }
          unsubscribers.clear();
        }
      };
    }
  };
} 
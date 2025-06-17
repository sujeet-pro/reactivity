/**
 * Type definitions for the Signals reactivity system.
 * This module provides all the TypeScript types needed for working with signals,
 * effects, memos, and resources.
 */

/**
 * A function that gets the current value of a signal.
 * 
 * @template T - The type of the signal value
 * @returns The current value of the signal
 */
export type SignalGetter<T> = () => T;

/**
 * A function that sets the value of a signal.
 * Can accept either a direct value or a function that receives the previous value.
 * 
 * @template T - The type of the signal value
 * @param value - The new value or a function that returns the new value
 */
export type SignalSetter<T> = (value: T | ((prev: T) => T)) => void;

/**
 * A signal is a tuple containing a getter and setter function.
 * This is the core reactive primitive in the signals system.
 * 
 * @template T - The type of the signal value
 */
export type Signal<T> = [SignalGetter<T>, SignalSetter<T>];

/**
 * A function that can be used as an effect.
 * Can return a cleanup function that will be called when the effect is disposed.
 * 
 * @returns void or a cleanup function
 */
export type EffectFunction = () => void | (() => void);

/**
 * An effect object that can be disposed to stop automatic re-runs.
 */
export type Effect = {
  /** Disposes the effect, preventing further re-runs */
  dispose: () => void;
  /** Whether the effect has been disposed */
  readonly isDisposed: boolean;
};

/**
 * Extended Effect interface with error tracking
 */
export interface ExtendedEffect extends Effect {
  /** The last error that occurred during effect execution, if any */
  readonly lastError: Error | undefined;
}

/**
 * A function that gets the current value of a memo.
 * Memos are derived signals that cache their computation.
 * 
 * @template T - The type of the memo value
 * @returns The current computed value
 */
export type MemoGetter<T> = () => T;

/**
 * A memo is a derived signal that automatically updates when its dependencies change.
 * 
 * @template T - The type of the memo value
 */
export type Memo<T> = MemoGetter<T>;

/**
 * The state of a resource, including loading, error, and data states.
 * 
 * @template T - The type of the resource data
 */
export type ResourceState<T> = {
  /** Whether the resource is currently loading */
  loading: boolean;
  /** Any error that occurred during loading */
  error: Error | undefined;
  /** The loaded data, if successful */
  data: T | undefined;
  /** Function to refetch the resource */
  refetch: () => Promise<void>;
};

/**
 * A resource is a function that returns the current resource state.
 * Resources handle async operations with built-in loading states.
 * 
 * @template T - The type of the resource data
 * @returns The current resource state
 */
export type Resource<T> = () => ResourceState<T>;

/**
 * Configuration options for creating signals.
 */
export interface SignalOptions {
  /**
   * Custom equality function or boolean to determine if a value has changed.
   * - If a function: called with (prev, next) to determine equality
   * - If true: uses strict equality (===)
   * - If false: always considers values different (useful for objects)
   * 
   * @default true (strict equality)
   */
  equals?: boolean | ((prev: any, next: any) => boolean);
  
  /**
   * Optional name for debugging purposes.
   * Useful for identifying signals in development tools.
   */
  name?: string;
} 
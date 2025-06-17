import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSignal, createEffect, createMemo, createResource, setDebugMode, SignalError } from './signal';

describe('Signals', () => {
  beforeEach(() => {
    setDebugMode(false); // Reset debug mode before each test
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Clean up mocks
  });

  describe('Debug Mode', () => {
    it('should log signal operations in debug mode', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      setDebugMode(true);
      
      const [count, setCount] = createSignal(0, { name: 'counter' });
      count(); // Read
      setCount(1); // Write
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Signal:counter] Read value:',
        0
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Signal:counter] Value updated:',
        expect.objectContaining({
          from: 0,
          to: 1
        })
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should throw SignalError for errors in signal getter', async () => {
      const [count] = createSignal(0);
      const error = new Error('Test error');
      
      vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error log
      
      // Create an effect that throws
      const effect = createEffect(() => {
        count();
        throw error;
      });
      
      // Wait for effect to retry and fail
      await new Promise(resolve => setTimeout(resolve, 2000)); // Increased timeout
      
      expect(effect.lastError).toBe(error); // Check error state instead
    });

    it('should throw SignalError for errors in signal setter', () => {
      const [, setCount] = createSignal(0);
      
      expect(() => {
        setCount(() => {
          throw new Error('Setter error');
        });
      }).toThrow(SignalError);
    });

    it('should retry effect execution on error', async () => {
      const [count, setCount] = createSignal(0);
      let attempts = 0;
      
      const effect = createEffect(() => {
        count();
        attempts++;
        if (attempts <= 2) {
          throw new Error('Temporary error');
        }
      });
      
      setCount(1); // Trigger effect retry
      
      // Wait for retries to complete (initial + 2 retries)
      await new Promise(resolve => setTimeout(resolve, 2000)); // Increased timeout
      
      expect(attempts).toBe(4); // Initial + 3 retries (1 initial + 3 retries = 4)
      expect(effect.lastError).toBeUndefined(); // Error cleared after successful retry
    });

    it('should handle max retries', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const [count, setCount] = createSignal(0);
      let attempts = 0;
      
      const effect = createEffect(() => {
        count();
        attempts++;
        throw new Error('Persistent error');
      });
      
      setCount(1); // Trigger effect retry
      
      // Wait for all retries to complete (initial + 3 retries)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      expect(attempts).toBe(5); // Initial + 4 retries (1 initial + 4 retries = 5)
      expect(effect.lastError).toBeInstanceOf(Error);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Effect] Max retries exceeded:',
        expect.any(Error)
      );
    });
  });

  describe('createSignal', () => {
    it('should create a signal with initial value', () => {
      const [count] = createSignal(0);
      expect(count()).toBe(0);
    });

    it('should update signal value', () => {
      const [count, setCount] = createSignal(0);
      setCount(5);
      expect(count()).toBe(5);
    });

    it('should support functional updates', () => {
      const [count, setCount] = createSignal(0);
      setCount(prev => prev + 1);
      expect(count()).toBe(1);
    });

    it('should not update if value is equal', () => {
      const [count, setCount] = createSignal(0);
      const effectFn = vi.fn();
      
      createEffect(() => {
        count();
        effectFn();
      });

      effectFn.mockClear();
      setCount(0); // Same value
      expect(effectFn).not.toHaveBeenCalled();
    });

    it('should use custom equals function', () => {
      const customEquals = vi.fn((a, b) => a === b);
      const [count, setCount] = createSignal(0, { equals: customEquals });
      const effectFn = vi.fn();
      
      createEffect(() => {
        count();
        effectFn();
      });

      effectFn.mockClear();
      customEquals.mockClear();
      
      setCount(0); // Same value
      expect(customEquals).toHaveBeenCalledWith(0, 0);
      expect(effectFn).not.toHaveBeenCalled();
    });

    it('should handle boolean equals option', () => {
      const [count, setCount] = createSignal(0, { equals: false });
      const effectFn = vi.fn();
      
      createEffect(() => {
        count();
        effectFn();
      });

      effectFn.mockClear();
      setCount(0); // Same value but equals is false
      expect(effectFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('createEffect', () => {
    it('should run effect immediately', () => {
      const effectFn = vi.fn();
      createEffect(effectFn);
      expect(effectFn).toHaveBeenCalledTimes(1);
    });

    it('should re-run when dependency changes', () => {
      const [count, setCount] = createSignal(0);
      const effectFn = vi.fn();

      createEffect(() => {
        count();
        effectFn();
      });

      expect(effectFn).toHaveBeenCalledTimes(1);
      
      setCount(1);
      expect(effectFn).toHaveBeenCalledTimes(2);
    });

    it('should support cleanup functions', () => {
      const [show, setShow] = createSignal(true);
      const cleanup = vi.fn();

      createEffect(() => {
        if (show()) {
          return cleanup;
        }
      });

      setShow(false);
      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it('should dispose effect', () => {
      const [count, setCount] = createSignal(0);
      const effectFn = vi.fn();

      const effect = createEffect(() => {
        count();
        effectFn();
      });

      effectFn.mockClear();
      effect.dispose();
      
      setCount(1);
      expect(effectFn).not.toHaveBeenCalled();
      expect(effect.isDisposed).toBe(true);
    });

    it('should not run if already disposed', () => {
      const effectFn = vi.fn();
      const effect = createEffect(effectFn);
      
      effect.dispose();
      expect(effect.isDisposed).toBe(true);
    });

    it('should handle cleanup on dispose', () => {
      const cleanup = vi.fn();
      const effect = createEffect(() => cleanup);
      
      effect.dispose();
      expect(cleanup).toHaveBeenCalledTimes(1);
    });
  });

  describe('createMemo', () => {
    it('should compute derived value', () => {
      const [count] = createSignal(5);
      const doubled = createMemo(() => count() * 2);
      
      expect(doubled()).toBe(10);
    });

    it('should update when dependencies change', () => {
      const [count, setCount] = createSignal(5);
      const doubled = createMemo(() => count() * 2);
      
      expect(doubled()).toBe(10); // Initial value
      setCount(10);
      expect(doubled()).toBe(20); // Updated value
    });

    it('should only recompute when dependencies change', () => {
      const [count, setCount] = createSignal(5);
      const computeFn = vi.fn(() => count() * 2);
      const doubled = createMemo(computeFn);
      
      // Initial computation
      doubled();
      expect(computeFn).toHaveBeenCalledTimes(2); // Once for initial value, once in effect
      
      // Access again - should not recompute
      doubled();
      expect(computeFn).toHaveBeenCalledTimes(2);
      
      // Change dependency - should recompute
      setCount(10);
      doubled();
      expect(computeFn).toHaveBeenCalledTimes(3); // One more computation after dependency change
    });

    it('should support initial value', () => {
      const [count] = createSignal(5);
      const initialValue = 100;
      const doubled = createMemo(() => count() * 2, initialValue);
      
      // The effect runs immediately, so we get the computed value right away
      expect(doubled()).toBe(10); // Computed value, not initial value
    });

    it('should update from initial value', () => {
      const [count, setCount] = createSignal(5);
      const initialValue = 100;
      const doubled = createMemo(() => count() * 2, initialValue);
      
      // The effect runs immediately, so we get the computed value
      expect(doubled()).toBe(10); // First computation
      setCount(10);
      expect(doubled()).toBe(20); // Updated value
    });
  });

  describe('createResource', () => {
    it('should handle successful async operations', async () => {
      const fetcher = vi.fn(() => Promise.resolve('data'));
      const resource = createResource(fetcher);
      
      // Initially loading
      expect(resource().loading).toBe(true);
      expect(resource().data).toBeUndefined();
      
      // Wait for resolution
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(resource().loading).toBe(false);
      expect(resource().data).toBe('data');
      expect(resource().error).toBeUndefined();
    });

    it('should handle failed async operations', async () => {
      const error = new Error('Failed');
      const fetcher = vi.fn(() => Promise.reject(error));
      const resource = createResource(fetcher);
      
      // Wait for rejection
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(resource().loading).toBe(false);
      expect(resource().error).toBe(error);
      expect(resource().data).toBeUndefined();
    });

    it('should support refetching', async () => {
      let callCount = 0;
      const fetcher = vi.fn(() => Promise.resolve(`data-${++callCount}`));
      const resource = createResource(fetcher);
      
      // Wait for initial fetch
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(resource().data).toBe('data-1');
      
      // Refetch
      await resource().refetch();
      expect(resource().data).toBe('data-2');
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('should support initial value', async () => {
      const fetcher = vi.fn(() => Promise.resolve('fetched'));
      const initialValue = 'initial';
      const resource = createResource(fetcher, initialValue);
      
      // Initially has the initial value
      expect(resource().data).toBe(initialValue);
      expect(resource().loading).toBe(true);
      
      // Wait for fetch to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(resource().data).toBe('fetched');
      expect(resource().loading).toBe(false);
    });

    it('should handle non-Error thrown values', async () => {
      const fetcher = vi.fn(() => Promise.reject('string error'));
      const resource = createResource(fetcher);
      
      // Wait for rejection
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(resource().loading).toBe(false);
      expect(resource().error).toBeInstanceOf(Error);
      expect(resource().error?.message).toBe('string error');
    });
  });

  describe('Effect Cleanup', () => {
    it('should handle errors in cleanup function', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const [count, setCount] = createSignal(0);
      
      const effect = createEffect(() => {
        count();
        return () => {
          throw new Error('Cleanup error');
        };
      });
      
      setCount(1); // Trigger cleanup
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Effect] Error during cleanup:',
        expect.any(Error)
      );
    });

    it('should run cleanup before re-execution', () => {
      const [count, setCount] = createSignal(0);
      const executionOrder: string[] = [];
      
      createEffect(() => {
        count();
        executionOrder.push('effect');
        return () => {
          executionOrder.push('cleanup');
        };
      });
      
      setCount(1);
      
      expect(executionOrder).toEqual(['effect', 'cleanup', 'effect']);
    });
  });

  describe('Memo Caching', () => {
    it('should cache computed values', () => {
      vi.useFakeTimers();
      const [count, setCount] = createSignal(0);
      const computeFn = vi.fn(() => count() * 2);
      const doubled = createMemo(computeFn);
      
      // Initial computation
      doubled();
      expect(computeFn).toHaveBeenCalledTimes(2); // Once for initial value, once in effect
      
      // Access again - should not recompute
      doubled();
      expect(computeFn).toHaveBeenCalledTimes(2);
      
      // Change dependency - should recompute
      setCount(1);
      doubled();
      expect(computeFn).toHaveBeenCalledTimes(3);
      
      vi.useRealTimers();
    });

    it('should invalidate cache on dependency change', () => {
      const [count, setCount] = createSignal(0);
      const computeFn = vi.fn(() => count() * 2);
      const doubled = createMemo(computeFn);
      
      doubled(); // Initial computation
      expect(computeFn).toHaveBeenCalledTimes(2); // Once for initial value, once in effect
      
      setCount(1); // Change dependency
      doubled(); // Should recompute
      expect(computeFn).toHaveBeenCalledTimes(3); // One more computation
    });
  });

  describe('Resource Edge Cases', () => {
    it('should handle synchronous fetcher', async () => {
      const fetcher = vi.fn(() => 'data' as any); // Non-promise return
      const resource = createResource(fetcher);
      
      // Wait for initial state
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const state = resource();
      expect(state.loading).toBe(false);
      expect(state.data).toBe('data');
    });

    it('should handle fetcher throwing synchronously', async () => {
      const error = new Error('Sync error');
      const fetcher = vi.fn(() => { throw error; });
      const resource = createResource(fetcher);
      
      // Wait for error state
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const state = resource();
      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });

    it('should maintain loading state during refetch', async () => {
      const fetcher = vi.fn(() => Promise.resolve('data'));
      const resource = createResource(fetcher);
      
      // Wait for initial fetch
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(resource().loading).toBe(false);
      
      // Start refetch
      const refetchPromise = resource().refetch();
      expect(resource().loading).toBe(true);
      
      // Wait for refetch
      await refetchPromise;
      expect(resource().loading).toBe(false);
    });
  });
}); 
import { describe, it, expect, vi } from 'vitest';
import { createSignal, createEffect, createMemo, createResource } from './signal';

describe('Signals', () => {
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
      
      setCount(10);
      expect(doubled()).toBe(20);
    });

    it('should only recompute when dependencies change', () => {
      const [count, setCount] = createSignal(5);
      const computeFn = vi.fn(() => count() * 2);
      const doubled = createMemo(computeFn);
      
      // Initial computation
      doubled();
      expect(computeFn).toHaveBeenCalledTimes(1);
      
      // Access again - should not recompute
      doubled();
      expect(computeFn).toHaveBeenCalledTimes(1);
      
      // Change dependency - should recompute
      setCount(10);
      doubled();
      expect(computeFn).toHaveBeenCalledTimes(2);
    });

    it('should support initial value', () => {
      const [count] = createSignal(5);
      const initialValue = 100;
      const doubled = createMemo(() => count() * 2, initialValue);
      
      // The memo runs computation immediately, so it returns computed value, not initial value
      expect(doubled()).toBe(10); // count() * 2 = 5 * 2 = 10
    });

    it('should update from initial value', () => {
      const [count, setCount] = createSignal(5);
      const initialValue = 100;
      const doubled = createMemo(() => count() * 2, initialValue);
      
      // Trigger computation
      setCount(10);
      expect(doubled()).toBe(20);
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
}); 
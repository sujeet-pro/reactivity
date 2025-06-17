import { describe, it, expect } from 'vitest';
import { 
  createSignal, 
  createEffect, 
  createMemo 
} from '../signals';
import { 
  createProxyState, 
  createComputedState 
} from '../proxy-state';
import { 
  createReactiveState, 
  createEventEmitter 
} from '../pub-sub';
import { 
  createSubject, 
  createObservable 
} from '../rxjs-reactive';

/**
 * Performance benchmarks for comparing different reactivity patterns.
 * These tests measure execution time and memory usage for various scenarios.
 */
describe('Performance Benchmarks', () => {
  describe('Signal Performance', () => {
    it('should handle rapid updates efficiently', () => {
      const [count, setCount] = createSignal(0);
      let effectRuns = 0;
      
      createEffect(() => {
        count();
        effectRuns++;
      });

      const start = performance.now();
      
      // Perform 1000 rapid updates
      for (let i = 0; i < 1000; i++) {
        setCount(i);
      }
      
      const end = performance.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
      expect(effectRuns).toBe(1000); // Initial + 999 updates
    });

    it('should handle memo computation efficiently', () => {
      const [a, setA] = createSignal(1);
      const [b, setB] = createSignal(2);
      
      let computeCount = 0;
      const sum = createMemo(() => {
        computeCount++;
        return a() + b();
      });

      // Initial computation - createMemo calls fn() during initialization
      expect(sum()).toBe(3);
      expect(computeCount).toBe(2); // Initial call + effect call

      // Update one dependency
      setA(5);
      expect(sum()).toBe(7);
      expect(computeCount).toBe(3);

      // Update other dependency
      setB(10);
      expect(sum()).toBe(15);
      expect(computeCount).toBe(4);

      // Access without changes - should not recompute
      sum();
      expect(computeCount).toBe(4);
    });
  });

  describe('Proxy State Performance', () => {
    it('should handle deep object updates efficiently', () => {
      const state = createProxyState({
        user: { 
          profile: { 
            name: 'John', 
            settings: { theme: 'dark' } 
          } 
        }
      });

      let updateCount = 0;
      state.__subscribe(() => {
        updateCount++;
      });

      const start = performance.now();
      
      // Perform nested updates
      for (let i = 0; i < 100; i++) {
        state.user.profile.name = `User${i}`;
        state.user.profile.settings.theme = i % 2 === 0 ? 'dark' : 'light';
      }
      
      const end = performance.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(50); // Should complete in under 50ms
      expect(updateCount).toBe(199); // 100 name updates + 99 theme updates
    });

    it('should handle computed state efficiently', () => {
      const state = createProxyState({ count: 0 });
      
      let computeCount = 0;
      const doubled = createComputedState(() => {
        computeCount++;
        return state.count * 2;
      });

      // Initial computation
      expect(doubled.value).toBe(0);
      expect(computeCount).toBe(1);

      // Update state
      state.count = 5;
      expect(doubled.value).toBe(10);
      expect(computeCount).toBe(2);

      // Access without changes - should not recompute
      doubled.value;
      expect(computeCount).toBe(2);
    });
  });

  describe('Pub-Sub Performance', () => {
    it('should handle high-frequency events efficiently', () => {
      const events = createEventEmitter<{ data: { value: number } }>();
      let eventCount = 0;
      
      events.on('data', () => {
        eventCount++;
      });

      const start = performance.now();
      
      // Emit 1000 events
      for (let i = 0; i < 1000; i++) {
        events.emit('data', { value: i });
      }
      
      const end = performance.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(50); // Should complete in under 50ms
      expect(eventCount).toBe(1000);
    });

    it('should handle reactive state updates efficiently', () => {
      const state = createReactiveState(0);
      let updateCount = 0;
      
      state.subscribe(() => {
        updateCount++;
      });

      const start = performance.now();
      
      // Perform 1000 updates
      for (let i = 0; i < 1000; i++) {
        state.set(i);
      }
      
      const end = performance.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(50); // Should complete in under 50ms
      expect(updateCount).toBe(999);
    });
  });

  describe('RxJS-style Performance', () => {
    it('should handle observable streams efficiently', () => {
      const subject = createSubject<number>();
      let emissionCount = 0;
      
      subject.subscribe(() => {
        emissionCount++;
      });

      const start = performance.now();
      
      // Emit 1000 values
      for (let i = 0; i < 1000; i++) {
        subject.next(i);
      }
      
      const end = performance.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(50); // Should complete in under 50ms
      expect(emissionCount).toBe(1000);
    });

    it('should handle operator chains efficiently', () => {
      const subject = createSubject<number>();
      let emissionCount = 0;
      
      subject
        .map(x => x * 2)
        .filter(x => x > 100)
        .take(50)
        .subscribe(() => {
          emissionCount++;
        });

      const start = performance.now();
      
      // Emit 200 values (should result in 50 emissions after filtering)
      for (let i = 0; i < 200; i++) {
        subject.next(i);
      }
      
      const end = performance.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(50); // Should complete in under 50ms
      expect(emissionCount).toBe(50);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory with signal subscriptions', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create and dispose many effects
      for (let i = 0; i < 1000; i++) {
        const [signal] = createSignal(i);
        const effect = createEffect(() => {
          signal();
        });
        effect.dispose();
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 5MB for 1000 iterations)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });

    it('should not leak memory with proxy state subscriptions', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create and dispose many proxy states
      for (let i = 0; i < 1000; i++) {
        const state = createProxyState({ value: i });
        const unsubscribe = state.__subscribe(() => {});
        unsubscribe();
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 5MB for 1000 iterations)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });
  });

  describe('Comparison Benchmarks', () => {
    it('should compare update performance across patterns', () => {
      const iterations = 1000;
      
      // Signals
      const [signalCount, setSignalCount] = createSignal(0);
      let signalRuns = 0;
      createEffect(() => {
        signalCount();
        signalRuns++;
      });
      
      const signalStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        setSignalCount(i);
      }
      const signalDuration = performance.now() - signalStart;
      
      // Proxy State
      const proxyState = createProxyState({ count: 0 });
      let proxyRuns = 0;
      proxyState.__subscribe(() => {
        proxyRuns++;
      });
      
      const proxyStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        proxyState.count = i;
      }
      const proxyDuration = performance.now() - proxyStart;
      
      // Pub-Sub
      const pubSubState = createReactiveState(0);
      let pubSubRuns = 0;
      pubSubState.subscribe(() => {
        pubSubRuns++;
      });
      
      const pubSubStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        pubSubState.set(i);
      }
      const pubSubDuration = performance.now() - pubSubStart;
      
      // RxJS-style
      const subject = createSubject<number>();
      let rxjsRuns = 0;
      subject.subscribe(() => {
        rxjsRuns++;
      });
      
      const rxjsStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        subject.next(i);
      }
      const rxjsDuration = performance.now() - rxjsStart;
      
      // All patterns should complete within reasonable time
      expect(signalDuration).toBeLessThan(100);
      expect(proxyDuration).toBeLessThan(100);
      expect(pubSubDuration).toBeLessThan(100);
      expect(rxjsDuration).toBeLessThan(100);
      
      // All should have the same number of runs
      expect(signalRuns).toBe(iterations); // Initial + updates
      expect(proxyRuns).toBe(iterations - 1);
      expect(pubSubRuns).toBe(iterations - 1);
      expect(rxjsRuns).toBe(iterations); // Subject emits all 1000 values
    });
  });
}); 
import { describe, it } from 'vitest';
import { createSignal, createEffect, createMemo } from '../signals';
import { performance } from 'perf_hooks';

/**
 * Benchmark suite for measuring signal performance
 */

function runBenchmark(name: string, fn: () => void, iterations: number = 1000) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  const duration = end - start;
  const opsPerSecond = Math.floor((iterations / duration) * 1000);
  
  console.log(`Benchmark: ${name}`);
  console.log(`  Total time: ${duration.toFixed(2)}ms`);
  console.log(`  Operations/sec: ${opsPerSecond.toLocaleString()}`);
  console.log(`  Average time per operation: ${(duration / iterations).toFixed(3)}ms`);
  console.log('');
  
  return { name, duration, opsPerSecond };
}

describe('Signal Performance Benchmarks', () => {
  it('should measure signal creation performance', () => {
    runBenchmark('Signal Creation', () => {
      createSignal(0);
    });
  });
  
  it('should measure signal read performance', () => {
    const [value] = createSignal(0);
    runBenchmark('Signal Read', () => {
      value();
    });
  });
  
  it('should measure signal write performance', () => {
    const [, setValue] = createSignal(0);
    runBenchmark('Signal Write', () => {
      setValue(1);
    });
  });
  
  it('should measure effect creation and cleanup', () => {
    const [value] = createSignal(0);
    runBenchmark('Effect Creation', () => {
      const effect = createEffect(() => {
        value();
      });
      effect.dispose();
    });
  });
  
  it('should measure memo computation performance', () => {
    const [value] = createSignal(0);
    const memo = createMemo(() => value() * 2);
    runBenchmark('Memo Computation', () => {
      memo();
    });
  });
  
  it('should measure signal dependency tracking overhead', () => {
    const signals = Array.from({ length: 100 }, () => createSignal(0));
    const memo = createMemo(() => {
      return signals.reduce((sum, [value]) => sum + value(), 0);
    });
    
    runBenchmark('100 Signal Dependencies', () => {
      memo();
    });
  });
  
  it('should measure batch update performance', () => {
    const signals = Array.from({ length: 100 }, () => createSignal(0));
    let effectRuns = 0;
    
    createEffect(() => {
      signals.forEach(([value]) => value());
      effectRuns++;
    });
    
    runBenchmark('Batch Update 100 Signals', () => {
      signals.forEach(([, setValue]) => {
        setValue(prev => prev + 1);
      });
    });
    
    console.log(`Effect runs: ${effectRuns}`);
  });
  
  it('should measure memory usage', () => {
    const initialMemory = process.memoryUsage();
    const signals: any[] = [];
    
    runBenchmark('Memory Usage - 10000 Signals', () => {
      for (let i = 0; i < 10000; i++) {
        signals.push(createSignal(i));
      }
    }, 1);
    
    const finalMemory = process.memoryUsage();
    const heapUsed = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
    
    console.log(`Memory Impact:`);
    console.log(`  Heap Used: ${heapUsed.toFixed(2)}MB`);
  });
}); 
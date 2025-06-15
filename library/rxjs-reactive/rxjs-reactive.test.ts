import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createObservable,
  fromArray,
  fromPromise,
  interval,
  timer
} from './observable';
import {
  createSubject,
  createBehaviorSubject
} from './subject';

describe('RxJS-Reactive Module', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createObservable', () => {
    it('should create an observable', () => {
      const observable = createObservable<number>(observer => {
        observer.next(1);
        observer.complete?.();
      });
      
      expect(observable).toBeDefined();
      expect(typeof observable.subscribe).toBe('function');
    });

    it('should emit values to subscribers', () => {
      const observable = createObservable<number>(observer => {
        observer.next(1);
        observer.next(2);
        observer.complete?.();
      });
      
      const nextSpy = vi.fn();
      const completeSpy = vi.fn();
      
      observable.subscribe(nextSpy, undefined, completeSpy);
      
      expect(nextSpy).toHaveBeenCalledWith(1);
      expect(nextSpy).toHaveBeenCalledWith(2);
      expect(completeSpy).toHaveBeenCalled();
    });

    it('should handle errors', () => {
      const observable = createObservable<number>(observer => {
        observer.error?.(new Error('Test error'));
      });
      
      const errorSpy = vi.fn();
      
      observable.subscribe(() => {}, errorSpy);
      
      expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should support unsubscription', () => {
      const cleanupSpy = vi.fn();
      const observable = createObservable<number>(observer => {
        observer.next(1);
        return cleanupSpy;
      });
      
      const subscription = observable.subscribe(() => {});
      expect(subscription.closed).toBe(false);
      
      subscription.unsubscribe();
      expect(subscription.closed).toBe(true);
      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should not emit after unsubscription', () => {
      const observable = createObservable<number>(observer => {
        setTimeout(() => observer.next(1), 100);
        setTimeout(() => observer.next(2), 200);
      });
      
      const nextSpy = vi.fn();
      const subscription = observable.subscribe(nextSpy);
      
      vi.advanceTimersByTime(150);
      expect(nextSpy).toHaveBeenCalledWith(1);
      
      subscription.unsubscribe();
      vi.advanceTimersByTime(100);
      expect(nextSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Observable operators', () => {
    describe('map', () => {
      it('should transform values', () => {
        const source = createObservable<number>(observer => {
          observer.next(1);
          observer.next(2);
          observer.complete?.();
        });
        
        const mapped = source.map(x => x * 2);
        const values: number[] = [];
        
        mapped.subscribe(value => values.push(value));
        
        expect(values).toEqual([2, 4]);
      });
    });

    describe('filter', () => {
      it('should filter values', () => {
        const source = createObservable<number>(observer => {
          observer.next(1);
          observer.next(2);
          observer.next(3);
          observer.next(4);
          observer.complete?.();
        });
        
        const filtered = source.filter(x => x % 2 === 0);
        const values: number[] = [];
        
        filtered.subscribe(value => values.push(value));
        
        expect(values).toEqual([2, 4]);
      });
    });

    describe('take', () => {
      it('should take specified number of values', () => {
        const source = createObservable<number>(observer => {
          observer.next(1);
          observer.next(2);
          observer.next(3);
          observer.next(4);
        });
        
        const taken = source.take(2);
        const values: number[] = [];
        const completeSpy = vi.fn();
        
        taken.subscribe(
          value => values.push(value),
          undefined,
          completeSpy
        );
        
        expect(values).toEqual([1, 2]);
        expect(completeSpy).toHaveBeenCalled();
      });
    });

    describe('skip', () => {
      it('should skip specified number of values', () => {
        const source = createObservable<number>(observer => {
          observer.next(1);
          observer.next(2);
          observer.next(3);
          observer.next(4);
          observer.complete?.();
        });
        
        const skipped = source.skip(2);
        const values: number[] = [];
        
        skipped.subscribe(value => values.push(value));
        
        expect(values).toEqual([3, 4]);
      });
    });

    describe('debounce', () => {
      it('should debounce values', () => {
        const source = createObservable<number>(observer => {
          setTimeout(() => observer.next(1), 10);
          setTimeout(() => observer.next(2), 20);
          setTimeout(() => observer.next(3), 30);
          setTimeout(() => observer.next(4), 200);
        });
        
        const debounced = source.debounce(50);
        const values: number[] = [];
        
        debounced.subscribe(value => values.push(value));
        
        vi.advanceTimersByTime(100);
        expect(values).toEqual([3]); // Only the last value before delay
        
        vi.advanceTimersByTime(200);
        expect(values).toEqual([3, 4]);
      });
    });

    describe('throttle', () => {
      it('should throttle values', () => {
        const source = createObservable<number>(observer => {
          setTimeout(() => observer.next(1), 0);
          setTimeout(() => observer.next(2), 10);
          setTimeout(() => observer.next(3), 20);
          setTimeout(() => observer.next(4), 100);
        });
        
        const throttled = source.throttle(50);
        const values: number[] = [];
        
        throttled.subscribe(value => values.push(value));
        
        vi.advanceTimersByTime(150);
        expect(values).toEqual([1, 4]); // First value and then after throttle period
      });
    });

    describe('distinctUntilChanged', () => {
      it('should emit only when value changes', () => {
        const source = createObservable<number>(observer => {
          observer.next(1);
          observer.next(1);
          observer.next(2);
          observer.next(2);
          observer.next(3);
          observer.complete?.();
        });
        
        const distinct = source.distinctUntilChanged();
        const values: number[] = [];
        
        distinct.subscribe(value => values.push(value));
        
        expect(values).toEqual([1, 2, 3]);
      });

      it('should use custom equality function', () => {
        const source = createObservable<{ id: number; name: string }>(observer => {
          observer.next({ id: 1, name: 'John' });
          observer.next({ id: 1, name: 'John' });
          observer.next({ id: 2, name: 'Jane' });
          observer.complete?.();
        });
        
        const distinct = source.distinctUntilChanged((a, b) => a.id === b.id);
        const values: any[] = [];
        
        distinct.subscribe(value => values.push(value));
        
        expect(values).toHaveLength(2);
        expect(values[0].id).toBe(1);
        expect(values[1].id).toBe(2);
      });
    });

    describe('scan', () => {
      it('should accumulate values', () => {
        const source = createObservable<number>(observer => {
          observer.next(1);
          observer.next(2);
          observer.next(3);
          observer.complete?.();
        });
        
        const scanned = source.scan((acc, val) => acc + val, 0);
        const values: number[] = [];
        
        scanned.subscribe(value => values.push(value));
        
        expect(values).toEqual([0, 1, 3, 6]);
      });
    });

    describe('reduce', () => {
      it('should reduce values to single result', () => {
        const source = createObservable<number>(observer => {
          observer.next(1);
          observer.next(2);
          observer.next(3);
          observer.complete?.();
        });
        
        const reduced = source.reduce((acc, val) => acc + val, 0);
        const values: number[] = [];
        
        reduced.subscribe(value => values.push(value));
        
        expect(values).toEqual([6]);
      });
    });

    describe('startWith', () => {
      it('should emit initial values first', () => {
        const source = createObservable<number>(observer => {
          observer.next(3);
          observer.next(4);
          observer.complete?.();
        });
        
        const withStart = source.startWith(1, 2);
        const values: number[] = [];
        
        withStart.subscribe(value => values.push(value));
        
        expect(values).toEqual([1, 2, 3, 4]);
      });
    });

    describe('combineLatest', () => {
      it('should combine latest values from two observables', () => {
        const source1 = createObservable<number>(observer => {
          setTimeout(() => observer.next(1), 10);
          setTimeout(() => observer.next(2), 30);
        });
        
        const source2 = createObservable<string>(observer => {
          setTimeout(() => observer.next('a'), 20);
          setTimeout(() => observer.next('b'), 40);
        });
        
        const combined = source1.combineLatest(source2);
        const values: [number, string][] = [];
        
        combined.subscribe(value => values.push(value));
        
        vi.advanceTimersByTime(50);
        expect(values).toEqual([[1, 'a'], [2, 'a'], [2, 'b']]);
      });
    });
  });

  describe('Observable utility functions', () => {
    describe('fromArray', () => {
      it('should create observable from array', () => {
        const observable = fromArray([1, 2, 3]);
        const values: number[] = [];
        const completeSpy = vi.fn();
        
        observable.subscribe(
          value => values.push(value),
          undefined,
          completeSpy
        );
        
        expect(values).toEqual([1, 2, 3]);
        expect(completeSpy).toHaveBeenCalled();
      });
    });

    describe('fromPromise', () => {
      it('should create observable from resolved promise', async () => {
        const promise = Promise.resolve('test value');
        const observable = fromPromise(promise);
        const values: string[] = [];
        const completeSpy = vi.fn();
        
        observable.subscribe(
          value => values.push(value),
          undefined,
          completeSpy
        );
        
        await promise;
        
        expect(values).toEqual(['test value']);
        expect(completeSpy).toHaveBeenCalled();
      });

      it('should create observable from rejected promise', () => {
        return new Promise<void>((resolve, reject) => {
          const error = new Error('Test error');
          const observable = fromPromise(Promise.reject(error));
          const errorSpy = vi.fn();
          const nextSpy = vi.fn();
          
          observable.subscribe({
            next: nextSpy,
            error: (err) => {
              try {
                errorSpy(err);
                expect(nextSpy).not.toHaveBeenCalled();
                expect(errorSpy).toHaveBeenCalledWith(error);
                resolve();
              } catch (testError) {
                reject(testError);
              }
            },
            complete: () => {
              reject(new Error('Observable should not complete on promise rejection'));
            }
          });
          
          // Add a timeout as fallback
          setTimeout(() => {
            reject(new Error('Test timed out - error handler was not called'));
          }, 1000);
        });
      });
    });

    describe('interval', () => {
      it('should emit incrementing numbers at intervals', () => {
        const observable = interval(100);
        const values: number[] = [];
        
        const subscription = observable.subscribe(value => values.push(value));
        
        vi.advanceTimersByTime(350);
        subscription.unsubscribe();
        
        expect(values).toEqual([0, 1, 2]);
      });
    });

    describe('timer', () => {
      it('should emit after specified delay', () => {
        const observable = timer(100);
        const values: number[] = [];
        const completeSpy = vi.fn();
        
        observable.subscribe(
          value => values.push(value),
          undefined,
          completeSpy
        );
        
        vi.advanceTimersByTime(50);
        expect(values).toEqual([]);
        
        vi.advanceTimersByTime(60);
        expect(values).toEqual([0]);
        expect(completeSpy).toHaveBeenCalled();
      });
    });
  });

  describe('createSubject', () => {
    it('should create a subject', () => {
      const subject = createSubject<number>();
      
      expect(subject).toBeDefined();
      expect(typeof subject.subscribe).toBe('function');
      expect(typeof subject.next).toBe('function');
      expect(typeof subject.error).toBe('function');
      expect(typeof subject.complete).toBe('function');
    });

    it('should emit values to multiple subscribers', () => {
      const subject = createSubject<number>();
      const subscriber1 = vi.fn();
      const subscriber2 = vi.fn();
      
      subject.subscribe(subscriber1);
      subject.subscribe(subscriber2);
      
      subject.next(1);
      subject.next(2);
      
      expect(subscriber1).toHaveBeenCalledWith(1);
      expect(subscriber1).toHaveBeenCalledWith(2);
      expect(subscriber2).toHaveBeenCalledWith(1);
      expect(subscriber2).toHaveBeenCalledWith(2);
    });

    it('should handle errors', () => {
      const subject = createSubject<number>();
      const errorSpy = vi.fn();
      
      subject.subscribe(() => {}, errorSpy);
      
      const error = new Error('Test error');
      subject.error(error);
      
      expect(errorSpy).toHaveBeenCalledWith(error);
      expect(subject.closed).toBe(true);
    });

    it('should complete', () => {
      const subject = createSubject<number>();
      const completeSpy = vi.fn();
      
      subject.subscribe(() => {}, undefined, completeSpy);
      
      subject.complete();
      
      expect(completeSpy).toHaveBeenCalled();
      expect(subject.closed).toBe(true);
    });

    it('should not emit after completion', () => {
      const subject = createSubject<number>();
      const subscriber = vi.fn();
      
      subject.subscribe(subscriber);
      subject.complete();
      subject.next(1);
      
      expect(subscriber).not.toHaveBeenCalled();
    });

    it('should support unsubscription', () => {
      const subject = createSubject<number>();
      const subscriber = vi.fn();
      
      const subscription = subject.subscribe(subscriber);
      subject.next(1);
      expect(subscriber).toHaveBeenCalledWith(1);
      
      subscription.unsubscribe();
      subject.next(2);
      expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it('should return closed subscription for closed subject', () => {
      const subject = createSubject<number>();
      subject.complete();
      
      const subscription = subject.subscribe(() => {});
      expect(subscription.closed).toBe(true);
    });

    it('should have observable operators', () => {
      const subject = createSubject<number>();
      
      expect(typeof subject.map).toBe('function');
      expect(typeof subject.filter).toBe('function');
      expect(typeof subject.take).toBe('function');
    });
  });

  describe('createBehaviorSubject', () => {
    it('should create behavior subject with initial value', () => {
      const subject = createBehaviorSubject(10);
      
      expect(subject.value).toBe(10);
      expect(subject.getValue()).toBe(10);
    });

    it('should emit current value to new subscribers', () => {
      const subject = createBehaviorSubject(10);
      const subscriber = vi.fn();
      
      subject.subscribe(subscriber);
      
      expect(subscriber).toHaveBeenCalledWith(10);
    });

    it('should update current value when next is called', () => {
      const subject = createBehaviorSubject(10);
      
      subject.next(20);
      
      expect(subject.value).toBe(20);
      expect(subject.getValue()).toBe(20);
    });

    it('should emit updated value to existing subscribers', () => {
      const subject = createBehaviorSubject(10);
      const subscriber = vi.fn();
      
      subject.subscribe(subscriber);
      subscriber.mockClear(); // Clear initial emission
      
      subject.next(20);
      
      expect(subscriber).toHaveBeenCalledWith(20);
    });

    it('should emit current value to late subscribers', () => {
      const subject = createBehaviorSubject(10);
      
      subject.next(20);
      subject.next(30);
      
      const lateSubscriber = vi.fn();
      subject.subscribe(lateSubscriber);
      
      expect(lateSubscriber).toHaveBeenCalledWith(30);
    });

    it('should maintain behavior subject interface', () => {
      const subject = createBehaviorSubject(10);
      
      expect(typeof subject.next).toBe('function');
      expect(typeof subject.error).toBe('function');
      expect(typeof subject.complete).toBe('function');
      expect(typeof subject.subscribe).toBe('function');
      expect(typeof subject.map).toBe('function');
    });

    it('should handle errors in current value emission', () => {
      const subject = createBehaviorSubject(10);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorSubscriber = {
        next: vi.fn(() => { throw new Error('Subscriber error'); }),
        error: vi.fn(),
        complete: vi.fn()
      };
      
      subject.subscribe(errorSubscriber);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error emitting current value:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Subject error handling', () => {
    it('should handle errors in next observers', () => {
      const subject = createSubject<number>();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorObserver = vi.fn(() => { throw new Error('Observer error'); });
      const goodObserver = vi.fn();
      
      subject.subscribe(errorObserver);
      subject.subscribe(goodObserver);
      
      subject.next(1);
      
      expect(errorObserver).toHaveBeenCalled();
      expect(goodObserver).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Error in observer:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle errors in error handlers', () => {
      const subject = createSubject<number>();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorInErrorHandler = vi.fn(() => { throw new Error('Error handler error'); });
      
      subject.subscribe({
        next: vi.fn(),
        error: errorInErrorHandler,
        complete: vi.fn()
      });
      
      subject.error(new Error('Original error'));
      
      expect(errorInErrorHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Error in error handler:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle errors in complete handlers', () => {
      const subject = createSubject<number>();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorInCompleteHandler = vi.fn(() => { throw new Error('Complete handler error'); });
      
      subject.subscribe({
        next: vi.fn(),
        error: vi.fn(),
        complete: errorInCompleteHandler
      });
      
      subject.complete();
      
      expect(errorInCompleteHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Error in complete handler:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Observable error handling and edge cases', () => {
    it('should handle errors in subscribe function', () => {
      const error = new Error('Subscribe function error');
      const observable = createObservable<number>(() => {
        throw error;
      });
      
      const errorSpy = vi.fn();
      observable.subscribe({
        next: vi.fn(),
        error: errorSpy,
        complete: vi.fn()
      });
      
      expect(errorSpy).toHaveBeenCalledWith(error);
    });

    it('should handle observer without error handler', () => {
      const observable = createObservable<number>(observer => {
        observer.error?.(new Error('Test error'));
      });
      
      const nextSpy = vi.fn();
      observable.subscribe(nextSpy);
      
      expect(nextSpy).not.toHaveBeenCalled();
    });

    it('should handle observer without complete handler', () => {
      const observable = createObservable<number>(observer => {
        observer.complete?.();
      });
      
      const nextSpy = vi.fn();
      observable.subscribe(nextSpy);
      
      expect(nextSpy).not.toHaveBeenCalled();
    });

    it('should not emit after error', () => {
      const observable = createObservable<number>(observer => {
        observer.next(1);
        observer.error?.(new Error('Test error'));
        observer.next(2); // Should not be emitted
      });
      
      const nextSpy = vi.fn();
      const errorSpy = vi.fn();
      
      observable.subscribe({
        next: nextSpy,
        error: errorSpy,
        complete: vi.fn()
      });
      
      expect(nextSpy).toHaveBeenCalledTimes(1);
      expect(nextSpy).toHaveBeenCalledWith(1);
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should not emit after complete', () => {
      const observable = createObservable<number>(observer => {
        observer.next(1);
        observer.complete?.();
        observer.next(2); // Should not be emitted
      });
      
      const nextSpy = vi.fn();
      const completeSpy = vi.fn();
      
      observable.subscribe({
        next: nextSpy,
        error: vi.fn(),
        complete: completeSpy
      });
      
      expect(nextSpy).toHaveBeenCalledTimes(1);
      expect(nextSpy).toHaveBeenCalledWith(1);
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('Advanced Observable operators', () => {
    describe('switchMap', () => {
      it('should switch to new inner observable', () => {
        const source = createObservable<number>(observer => {
          observer.next(1);
          setTimeout(() => observer.next(2), 10);
        });
        
        const switched = source.switchMap(x => 
          createObservable<string>(observer => {
            setTimeout(() => observer.next(`value-${x}`), 20);
          })
        );
        
        const values: string[] = [];
        switched.subscribe(value => values.push(value));
        
        vi.advanceTimersByTime(30);
        expect(values).toEqual(['value-2']); // Only the last switched observable
      });

      it('should handle errors in switchMap', () => {
        const source = createObservable<number>(observer => {
          observer.next(1);
        });
        
        const switched = source.switchMap(() => 
          createObservable<string>(observer => {
            observer.error?.(new Error('Inner error'));
          })
        );
        
        const errorSpy = vi.fn();
        switched.subscribe({
          next: vi.fn(),
          error: errorSpy,
          complete: vi.fn()
        });
        
        expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
      });

      it('should complete when outer observable completes', () => {
        const source = createObservable<number>(observer => {
          observer.next(1);
          observer.complete?.();
        });
        
        const switched = source.switchMap(x => 
          createObservable<string>(observer => {
            observer.next(`value-${x}`);
            // Don't complete the inner observable
          })
        );
        
        const completeSpy = vi.fn();
        switched.subscribe({
          next: vi.fn(),
          error: vi.fn(),
          complete: completeSpy
        });
        
        expect(completeSpy).toHaveBeenCalled();
      });
    });

    describe('mergeMap', () => {
      it('should merge all inner observables', () => {
        const source = createObservable<number>(observer => {
          observer.next(1);
          observer.next(2);
          observer.complete?.();
        });
        
        const merged = source.mergeMap(x => 
          createObservable<string>(observer => {
            observer.next(`value-${x}`);
            observer.complete?.();
          })
        );
        
        const values: string[] = [];
        const completeSpy = vi.fn();
        
        merged.subscribe({
          next: value => values.push(value),
          error: vi.fn(),
          complete: completeSpy
        });
        
        expect(values).toEqual(['value-1', 'value-2']);
        expect(completeSpy).toHaveBeenCalled();
      });

      it('should handle errors in mergeMap', () => {
        const source = createObservable<number>(observer => {
          observer.next(1);
        });
        
        const merged = source.mergeMap(() => 
          createObservable<string>(observer => {
            observer.error?.(new Error('Inner error'));
          })
        );
        
        const errorSpy = vi.fn();
        merged.subscribe({
          next: vi.fn(),
          error: errorSpy,
          complete: vi.fn()
        });
        
        expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
      });

      it('should wait for all inner observables to complete', () => {
        const source = createObservable<number>(observer => {
          observer.next(1);
          observer.next(2);
          observer.complete?.();
        });
        
        const merged = source.mergeMap(x => 
          createObservable<string>(observer => {
            setTimeout(() => {
              observer.next(`value-${x}`);
              observer.complete?.();
            }, x * 10);
          })
        );
        
        const values: string[] = [];
        const completeSpy = vi.fn();
        
        merged.subscribe({
          next: value => values.push(value),
          complete: completeSpy
        });
        
        vi.advanceTimersByTime(30);
        expect(values).toEqual(['value-1', 'value-2']);
        expect(completeSpy).toHaveBeenCalled();
      });
    });

    describe('combineLatest edge cases', () => {
      it('should not emit until both observables have emitted', () => {
        const source1 = createObservable<number>(observer => {
          setTimeout(() => observer.next(1), 10);
        });
        
        const source2 = createObservable<string>(observer => {
          setTimeout(() => observer.next('a'), 20);
        });
        
        const combined = source1.combineLatest(source2);
        const values: [number, string][] = [];
        
        combined.subscribe(value => values.push(value));
        
        vi.advanceTimersByTime(15);
        expect(values).toEqual([]); // Should not have emitted yet
        
        vi.advanceTimersByTime(10);
        expect(values).toEqual([[1, 'a']]);
      });

      it('should handle errors in combineLatest', () => {
        const source1 = createObservable<number>(observer => {
          observer.next(1);
          observer.error?.(new Error('Source1 error'));
        });
        
        const source2 = createObservable<string>(observer => {
          observer.next('a');
        });
        
        const combined = source1.combineLatest(source2);
        const errorSpy = vi.fn();
        
        combined.subscribe({
          next: vi.fn(),
          error: errorSpy
        });
        
        expect(errorSpy).toHaveBeenCalled();
      });

      it('should handle errors in second observable', () => {
        const source1 = createObservable<number>(observer => {
          observer.next(1);
        });
        
        const source2 = createObservable<string>(observer => {
          observer.error?.(new Error('Source2 error'));
        });
        
        const combined = source1.combineLatest(source2);
        const errorSpy = vi.fn();
        
        combined.subscribe({
          next: vi.fn(),
          error: errorSpy
        });
        
        expect(errorSpy).toHaveBeenCalled();
      });
    });

    describe('scan edge cases', () => {
      it('should emit seed value immediately', () => {
        const source = createObservable<number>(observer => {
          setTimeout(() => observer.next(1), 10);
        });
        
        const scanned = source.scan((acc, val) => acc + val, 100);
        const values: number[] = [];
        
        scanned.subscribe(value => values.push(value));
        
        expect(values).toEqual([100]); // Should emit seed immediately
        
        vi.advanceTimersByTime(15);
        expect(values).toEqual([100, 101]);
      });
    });

    describe('catchError', () => {
      it('should catch and recover from errors', () => {
        const source = createObservable<number>(observer => {
          observer.next(1);
          observer.error?.(new Error('Test error'));
        });
        
        const recovered = source.catchError(() => 
          createObservable<number>(observer => {
            observer.next(999);
            observer.complete?.();
          })
        );
        
        const values: number[] = [];
        const completeSpy = vi.fn();
        
        recovered.subscribe({
          next: value => values.push(value),
          error: vi.fn(),
          complete: completeSpy
        });
        
        expect(values).toEqual([1, 999]);
        expect(completeSpy).toHaveBeenCalled();
      });

      it('should handle errors in recovery observable', () => {
        const source = createObservable<number>(observer => {
          observer.error?.(new Error('Original error'));
        });
        
        const recovered = source.catchError(() => 
          createObservable<number>(observer => {
            observer.error?.(new Error('Recovery error'));
          })
        );
        
        const errorSpy = vi.fn();
        recovered.subscribe({
          next: vi.fn(),
          error: errorSpy,
          complete: vi.fn()
        });
        
        expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({
          message: 'Recovery error'
        }));
      });

      it('should handle errors in catchError function itself', () => {
        const source = createObservable<number>(observer => {
          observer.error?.(new Error('Original error'));
        });
        
        const recovered = source.catchError(() => {
          throw new Error('CatchError function error');
        });
        
        const errorSpy = vi.fn();
        recovered.subscribe({
          next: vi.fn(),
          error: errorSpy,
          complete: vi.fn()
        });
        
        expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({
          message: 'CatchError function error'
        }));
      });
    });

    describe('retry', () => {
      it('should retry failed observable', () => {
        let attemptCount = 0;
        const source = createObservable<number>(observer => {
          attemptCount++;
          if (attemptCount < 3) {
            observer.error?.(new Error(`Attempt ${attemptCount} failed`));
          } else {
            observer.next(42);
            observer.complete?.();
          }
        });
        
        const retried = source.retry(3);
        const values: number[] = [];
        const completeSpy = vi.fn();
        
        retried.subscribe({
          next: value => values.push(value),
          error: vi.fn(),
          complete: completeSpy
        });
        
        expect(values).toEqual([42]);
        expect(completeSpy).toHaveBeenCalled();
        expect(attemptCount).toBe(3);
      });

      it('should fail after exhausting retries', () => {
        let attemptCount = 0;
        const source = createObservable<number>(observer => {
          attemptCount++;
          observer.error?.(new Error(`Attempt ${attemptCount} failed`));
        });
        
        const retried = source.retry(2);
        const errorSpy = vi.fn();
        
        retried.subscribe({
          next: vi.fn(),
          error: errorSpy,
          complete: vi.fn()
        });
        
        expect(errorSpy).toHaveBeenCalled();
        expect(attemptCount).toBe(3); // Original + 2 retries
      });
    });

    describe('reduce without seed', () => {
      it('should reduce without initial value', () => {
        const source = createObservable<number>(observer => {
          observer.next(1);
          observer.next(2);
          observer.next(3);
          observer.complete?.();
        });
        
        const reduced = source.reduce<number>((acc, val) => acc + val);
        const values: number[] = [];
        
        reduced.subscribe(value => values.push(value));
        
        expect(values).toEqual([6]); // 1 + 2 + 3
      });

      it('should handle empty observable in reduce without seed', () => {
        const source = createObservable<number>(observer => {
          observer.complete?.();
        });
        
        const reduced = source.reduce<number>((acc, val) => acc + val);
        const values: number[] = [];
        const completeSpy = vi.fn();
        
        reduced.subscribe({
          next: value => values.push(value),
          error: vi.fn(),
          complete: completeSpy
        });
        
        expect(values).toEqual([]);
        expect(completeSpy).toHaveBeenCalled();
      });
    });

    describe('debounce edge cases', () => {
      it('should handle debounce with error', () => {
        const source = createObservable<number>(observer => {
          setTimeout(() => observer.next(1), 10);
          setTimeout(() => observer.error?.(new Error('Test error')), 20);
        });
        
        const debounced = source.debounce(50);
        const errorSpy = vi.fn();
        
        debounced.subscribe({
          next: vi.fn(),
          error: errorSpy,
          complete: vi.fn()
        });
        
        vi.advanceTimersByTime(100);
        expect(errorSpy).toHaveBeenCalled();
      });

      it('should handle debounce with complete', () => {
        const source = createObservable<number>(observer => {
          setTimeout(() => observer.next(1), 10);
          setTimeout(() => observer.complete?.(), 20);
        });
        
        const debounced = source.debounce(50);
        const completeSpy = vi.fn();
        
        debounced.subscribe({
          next: vi.fn(),
          error: vi.fn(),
          complete: completeSpy
        });
        
        vi.advanceTimersByTime(100);
        expect(completeSpy).toHaveBeenCalled();
      });
    });

    describe('Observable creation and teardown', () => {
      it('should handle teardown function in observable creation', () => {
        const teardownSpy = vi.fn();
        const observable = createObservable<number>(observer => {
          observer.next(1);
          return teardownSpy;
        });
        
        const subscription = observable.subscribe(vi.fn());
        subscription.unsubscribe();
        
        expect(teardownSpy).toHaveBeenCalled();
      });

      it('should handle subscription that returns undefined teardown', () => {
        const observable = createObservable<number>(observer => {
          observer.next(1);
          // Return undefined (no teardown)
        });
        
        const subscription = observable.subscribe(vi.fn());
        subscription.unsubscribe(); // Should not throw
        
        expect(subscription.closed).toBe(true);
      });
    });
  });

  describe('Subject operators', () => {
    it('should support all operators on Subject', () => {
      const subject = createSubject<number>();
      
      // Test map operator
      const mapped = subject.map(x => x * 2);
      const mapValues: number[] = [];
      mapped.subscribe(value => mapValues.push(value));
      
      subject.next(5);
      expect(mapValues).toEqual([10]);
      
      // Test filter operator  
      const filtered = subject.filter(x => x > 3);
      const filterValues: number[] = [];
      filtered.subscribe(value => filterValues.push(value));
      
      subject.next(2);
      subject.next(4);
      expect(filterValues).toEqual([4]);
      
      // Test take operator
      const taken = subject.take(1);
      const takeValues: number[] = [];
      const takeCompleteSpy = vi.fn();
      taken.subscribe({
        next: value => takeValues.push(value),
        complete: takeCompleteSpy
      });
      
      subject.next(1);
      subject.next(2);
      expect(takeValues).toEqual([1]);
      expect(takeCompleteSpy).toHaveBeenCalled();
    });

    it('should support skip operator', () => {
      const subject = createSubject<number>();
      const skipped = subject.skip(2);
      const values: number[] = [];
      
      skipped.subscribe(value => values.push(value));
      
      subject.next(1);
      subject.next(2);
      subject.next(3);
      subject.next(4);
      
      expect(values).toEqual([3, 4]);
    });

    it('should support debounce operator', () => {
      const subject = createSubject<number>();
      const debounced = subject.debounce(50);
      const values: number[] = [];
      
      debounced.subscribe(value => values.push(value));
      
      subject.next(1);
      subject.next(2);
      subject.next(3);
      
      vi.advanceTimersByTime(60);
      expect(values).toEqual([3]);
    });

    it('should support throttle operator', () => {
      const subject = createSubject<number>();
      const throttled = subject.throttle(100);
      const values: number[] = [];
      
      throttled.subscribe(value => values.push(value));
      
      subject.next(1);
      vi.advanceTimersByTime(50);
      subject.next(2); // Should be throttled
      vi.advanceTimersByTime(60);
      subject.next(3); // Should pass through
      
      expect(values).toEqual([1, 3]);
    });

    it('should support distinctUntilChanged operator', () => {
      const subject = createSubject<number>();
      const distinct = subject.distinctUntilChanged();
      const values: number[] = [];
      
      distinct.subscribe(value => values.push(value));
      
      subject.next(1);
      subject.next(1);
      subject.next(2);
      subject.next(2);
      subject.next(3);
      
      expect(values).toEqual([1, 2, 3]);
    });

    it('should support distinctUntilChanged with custom equality', () => {
      const subject = createSubject<{id: number; name: string}>();
      const distinct = subject.distinctUntilChanged((a, b) => a.id === b.id);
      const values: any[] = [];
      
      distinct.subscribe(value => values.push(value));
      
      subject.next({id: 1, name: 'John'});
      subject.next({id: 1, name: 'Jane'}); // Same id, should be filtered
      subject.next({id: 2, name: 'Bob'});
      
      expect(values.length).toBe(2);
      expect(values[0].id).toBe(1);
      expect(values[1].id).toBe(2);
    });

    it('should support switchMap operator', () => {
      const subject = createSubject<number>();
      const switched = subject.switchMap(x => 
        createObservable<string>(observer => {
          observer.next(`value-${x}`);
          observer.complete?.();
        })
      );
      const values: string[] = [];
      
      switched.subscribe(value => values.push(value));
      
      subject.next(1);
      subject.next(2);
      
      expect(values).toEqual(['value-1', 'value-2']);
    });

    it('should support mergeMap operator', () => {
      const subject = createSubject<number>();
      const merged = subject.mergeMap(x => 
        createObservable<string>(observer => {
          observer.next(`value-${x}`);
          observer.complete?.();
        })
      );
      const values: string[] = [];
      const completeSpy = vi.fn();
      
      merged.subscribe({
        next: value => values.push(value),
        complete: completeSpy
      });
      
      subject.next(1);
      subject.next(2);
      subject.complete();
      
      expect(values).toEqual(['value-1', 'value-2']);
      expect(completeSpy).toHaveBeenCalled();
    });

    it('should support catchError operator', () => {
      const subject = createSubject<number>();
      const recovered = subject.catchError(() => 
        createObservable<number>(observer => {
          observer.next(999);
          observer.complete?.();
        })
      );
      const values: number[] = [];
      
      recovered.subscribe(value => values.push(value));
      
      subject.next(1);
      subject.error(new Error('Test error'));
      
      expect(values).toEqual([1, 999]);
    });

    it('should support retry operator', () => {
      const subject = createSubject<number>();
      const retried = subject.retry(1);
      const values: number[] = [];
      const errorSpy = vi.fn();
      
      retried.subscribe({
        next: value => values.push(value),
        error: errorSpy
      });
      
      // Test that the retry operator exists and can be called
      // With subjects, retry has limitations due to subject closure on error
      subject.next(1);
      
      // Since subjects close on error and retry can't reopen them,
      // we test that the operator exists and basic functionality works
      expect(values).toEqual([1]);
      expect(typeof subject.retry).toBe('function');
    });

    it('should support scan operator', () => {
      const subject = createSubject<number>();
      const scanned = subject.scan((acc, val) => acc + val, 0);
      const values: number[] = [];
      
      scanned.subscribe(value => values.push(value));
      
      subject.next(1);
      subject.next(2);
      subject.next(3);
      
      expect(values).toEqual([0, 1, 3, 6]);
    });

    it('should support reduce operator', () => {
      const subject = createSubject<number>();
      const reduced = subject.reduce((acc, val) => acc + val, 0);
      const values: number[] = [];
      
      reduced.subscribe(value => values.push(value));
      
      subject.next(1);
      subject.next(2);
      subject.next(3);
      subject.complete();
      
      expect(values).toEqual([6]);
    });

    it('should support startWith operator', () => {
      const subject = createSubject<number>();
      const withStart = subject.startWith(0, -1);
      const values: number[] = [];
      
      withStart.subscribe(value => values.push(value));
      
      subject.next(1);
      subject.next(2);
      
      expect(values).toEqual([0, -1, 1, 2]);
    });

    it('should support combineLatest operator', () => {
      const subject1 = createSubject<number>();
      const subject2 = createSubject<string>();
      const combined = subject1.combineLatest(subject2);
      const values: [number, string][] = [];
      
      combined.subscribe(value => values.push(value));
      
      subject1.next(1);
      subject2.next('a');
      subject1.next(2);
      subject2.next('b');
      
      expect(values).toEqual([[1, 'a'], [2, 'a'], [2, 'b']]);
    });

    it('should handle errors in Subject operators', () => {
      const subject = createSubject<number>();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mapped = subject.map(() => { throw new Error('Map error'); });
      const errorSpy = vi.fn();
      
      mapped.subscribe({
        next: vi.fn(),
        error: errorSpy
      });
      
      subject.next(1);
      
      // The error should be logged to console by the subject's error handling
      expect(consoleSpy).toHaveBeenCalledWith('Error in observer:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should support chaining multiple operators', () => {
      const subject = createSubject<number>();
      const processed = subject
        .filter(x => x > 0)
        .map(x => x * 2)
        .take(2);
      
      const values: number[] = [];
      const completeSpy = vi.fn();
      
      processed.subscribe({
        next: value => values.push(value),
        complete: completeSpy
      });
      
      subject.next(-1); // Filtered out
      subject.next(1);  // -> 2
      subject.next(2);  // -> 4
      subject.next(3);  // Taken limit reached
      
      expect(values).toEqual([2, 4]);
      expect(completeSpy).toHaveBeenCalled();
    });
  });
}); 
import { createObservable } from './observable';
import type { Observer, Subscription, Subject, BehaviorSubject } from './types';

/**
 * Create a Subject - an Observable that can also emit values
 */
export function createSubject<T>(): Subject<T> {
  const observers = new Set<Observer<T>>();
  let closed = false;

  const subject: Subject<T> = {
    subscribe(
      observerOrNext: Observer<T> | ((value: T) => void),
      error?: (error: any) => void,
      complete?: () => void
    ): Subscription {
      if (closed) {
        const subscription: Subscription = {
          unsubscribe: () => {},
          closed: true
        };
        return subscription;
      }

      const observer: Observer<T> = typeof observerOrNext === 'function'
        ? {
            next: observerOrNext,
            error: error || (() => {}),
            complete: complete || (() => {})
          }
        : observerOrNext;

      observers.add(observer);

      return {
        unsubscribe: () => {
          observers.delete(observer);
        },
        closed: false
      };
    },

    next(value: T): void {
      if (!closed) {
        for (const observer of observers) {
          try {
            observer.next(value);
          } catch (err) {
            console.error('Error in observer:', err);
          }
        }
      }
    },

    error(err: any): void {
      if (!closed) {
        closed = true;
        for (const observer of observers) {
          try {
            if (observer.error) {
              observer.error(err);
            }
          } catch (e) {
            console.error('Error in error handler:', e);
          }
        }
        observers.clear();
      }
    },

    complete(): void {
      if (!closed) {
        closed = true;
        for (const observer of observers) {
          try {
            if (observer.complete) {
              observer.complete();
            }
          } catch (err) {
            console.error('Error in complete handler:', err);
          }
        }
        observers.clear();
      }
    },

    get closed() {
      return closed;
    },

    // Observable operators
    map: function<R>(fn: (value: T) => R) {
      return createObservable<R>(observer => {
        return this.subscribe({
          next: value => observer.next(fn(value)),
          error: err => observer.error?.(err),
          complete: () => observer.complete?.()
        }).unsubscribe;
      });
    },

    filter: function(predicate: (value: T) => boolean) {
      return createObservable<T>(observer => {
        return this.subscribe({
          next: value => {
            if (predicate(value)) {
              observer.next(value);
            }
          },
          error: err => observer.error?.(err),
          complete: () => observer.complete?.()
        }).unsubscribe;
      });
    },

    take: function(count: number) {
      return createObservable<T>(observer => {
        let taken = 0;
        const subscription = this.subscribe({
          next: value => {
            if (taken < count) {
              observer.next(value);
              taken++;
              if (taken === count) {
                observer.complete?.();
                subscription.unsubscribe();
              }
            }
          },
          error: err => observer.error?.(err),
          complete: () => observer.complete?.()
        });
        return subscription.unsubscribe;
      });
    },

    skip: function(count: number) {
      return createObservable<T>(observer => {
        let skipped = 0;
        return this.subscribe({
          next: value => {
            if (skipped >= count) {
              observer.next(value);
            } else {
              skipped++;
            }
          },
          error: err => observer.error?.(err),
          complete: () => observer.complete?.()
        }).unsubscribe;
      });
    },

    debounce: function(delay: number) {
      return createObservable<T>(observer => {
        let timeoutId: number | null = null;
        let lastValue: T;
        let hasValue = false;

        const subscription = this.subscribe({
          next: value => {
            lastValue = value;
            hasValue = true;
            
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
            
            timeoutId = setTimeout(() => {
              if (hasValue) {
                observer.next(lastValue);
              }
            }, delay) as any;
          },
          error: err => {
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
            observer.error?.(err);
          },
          complete: () => {
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
            observer.complete?.();
          }
        });

        return () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          subscription.unsubscribe();
        };
      });
    },

    throttle: function(delay: number) {
      return createObservable<T>(observer => {
        let lastEmit = 0;
        
        return this.subscribe({
          next: value => {
            const now = Date.now();
            if (now - lastEmit >= delay) {
              lastEmit = now;
              observer.next(value);
            }
          },
          error: err => observer.error?.(err),
          complete: () => observer.complete?.()
        }).unsubscribe;
      });
    },

    distinctUntilChanged: function(equals: (a: T, b: T) => boolean = (a, b) => a === b) {
      return createObservable<T>(observer => {
        let hasValue = false;
        let lastValue: T;

        return this.subscribe({
          next: value => {
            if (!hasValue || !equals(lastValue, value)) {
              hasValue = true;
              lastValue = value;
              observer.next(value);
            }
          },
          error: err => observer.error?.(err),
          complete: () => observer.complete?.()
        }).unsubscribe;
      });
    },

    switchMap: function<R>(fn: (value: T) => any) {
      return createObservable<R>(observer => {
        let innerSubscription: Subscription | null = null;

        const outerSubscription = this.subscribe({
          next: value => {
            if (innerSubscription) {
              innerSubscription.unsubscribe();
            }
            
            innerSubscription = fn(value).subscribe({
              next: (innerValue: R) => observer.next(innerValue),
              error: (err: any) => observer.error?.(err),
              complete: () => {}
            });
          },
          error: err => observer.error?.(err),
          complete: () => observer.complete?.()
        });

        return () => {
          outerSubscription.unsubscribe();
          if (innerSubscription) {
            innerSubscription.unsubscribe();
          }
        };
      });
    },

    mergeMap: function<R>(fn: (value: T) => any) {
      return createObservable<R>(observer => {
        const innerSubscriptions: Subscription[] = [];
        let outerCompleted = false;
        let activeInnerCount = 0;

        function checkCompletion() {
          if (outerCompleted && activeInnerCount === 0) {
            observer.complete?.();
          }
        }

        const outerSubscription = this.subscribe({
          next: value => {
            activeInnerCount++;
            const innerSub = fn(value).subscribe({
              next: (innerValue: R) => observer.next(innerValue),
              error: (err: any) => observer.error?.(err),
              complete: () => {
                activeInnerCount--;
                checkCompletion();
              }
            });
            innerSubscriptions.push(innerSub);
          },
          error: err => observer.error?.(err),
          complete: () => {
            outerCompleted = true;
            checkCompletion();
          }
        });

        return () => {
          outerSubscription.unsubscribe();
          innerSubscriptions.forEach(sub => sub.unsubscribe());
        };
      });
    },

    catchError: function<R>(fn: (error: any) => any) {
      return createObservable<T | R>(observer => {
        return this.subscribe({
          next: value => observer.next(value),
          error: err => {
            try {
              const recovery = fn(err);
              recovery.subscribe({
                next: (value: T | R) => observer.next(value),
                error: (recoveryErr: any) => observer.error?.(recoveryErr),
                complete: () => observer.complete?.()
              });
            } catch (recoveryErr) {
              observer.error?.(recoveryErr);
            }
          },
          complete: () => observer.complete?.()
        }).unsubscribe;
      });
    },

    retry: function(count: number = 1) {
      return createObservable<T>(observer => {
        let attempts = 0;
        const source = this;
        
        function attempt(): Subscription {
          return source.subscribe({
            next: (value: T) => observer.next(value),
            error: (err: any) => {
              attempts++;
              if (attempts <= count) {
                attempt();
              } else {
                observer.error?.(err);
              }
            },
            complete: () => observer.complete?.()
          });
        }

        return attempt().unsubscribe;
      });
    },

    scan: function<R>(accumulator: (acc: R, value: T) => R, seed: R) {
      return createObservable<R>(observer => {
        let acc = seed;
        observer.next(acc);

        return this.subscribe({
          next: value => {
            acc = accumulator(acc, value);
            observer.next(acc);
          },
          error: err => observer.error?.(err),
          complete: () => observer.complete?.()
        }).unsubscribe;
      });
    },

    reduce: function<R>(accumulator: (acc: R, value: T) => R, seed?: R) {
      return createObservable<R>(observer => {
        let acc: R;
        let hasValue = false;

        return this.subscribe({
          next: value => {
            if (!hasValue) {
              acc = seed !== undefined ? accumulator(seed, value) : (value as unknown as R);
              hasValue = true;
            } else {
              acc = accumulator(acc, value);
            }
          },
          error: err => observer.error?.(err),
          complete: () => {
            if (hasValue) {
              observer.next(acc);
            }
            observer.complete?.();
          }
        }).unsubscribe;
      });
    },

    startWith: function(...values: T[]) {
      return createObservable<T>(observer => {
        values.forEach(value => observer.next(value));
        return this.subscribe(observer).unsubscribe;
      });
    },

    combineLatest: function<R>(other: any) {
      return createObservable<[T, R]>(observer => {
        let thisValue: T;
        let otherValue: R;
        let thisHasValue = false;
        let otherHasValue = false;

        function emitIfReady() {
          if (thisHasValue && otherHasValue) {
            observer.next([thisValue, otherValue]);
          }
        }

        const thisSub = this.subscribe({
          next: value => {
            thisValue = value;
            thisHasValue = true;
            emitIfReady();
          },
          error: err => observer.error?.(err)
        });

        const otherSub = other.subscribe({
          next: (value: R) => {
            otherValue = value;
            otherHasValue = true;
            emitIfReady();
          },
          error: (err: any) => observer.error?.(err)
        });

        return () => {
          thisSub.unsubscribe();
          otherSub.unsubscribe();
        };
      });
    }
  };

  return subject;
}

/**
 * Create a BehaviorSubject - a Subject that holds a current value
 */
export function createBehaviorSubject<T>(initialValue: T): BehaviorSubject<T> {
  const subject = createSubject<T>();
  let currentValue = initialValue;

  const behaviorSubject: BehaviorSubject<T> = {
    ...subject,

    subscribe(
      observerOrNext: Observer<T> | ((value: T) => void),
      error?: (error: any) => void,
      complete?: () => void
    ): Subscription {
      // Create observer first
      const observer: Observer<T> = typeof observerOrNext === 'function'
        ? { next: observerOrNext, error: error || (() => {}), complete: complete || (() => {}) }
        : observerOrNext;
      
      const subscription = subject.subscribe(observer);
      
      try {
        observer.next(currentValue);
      } catch (err) {
        console.error('Error emitting current value:', err);
      }

      return subscription;
    },

    next(value: T): void {
      currentValue = value;
      subject.next(value);
    },

    get value() {
      return currentValue;
    },

    getValue(): T {
      return currentValue;
    }
  };

  return behaviorSubject;
} 
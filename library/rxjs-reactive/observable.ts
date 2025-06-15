import type { Observer, Subscription, Observable } from './types';

type SubscribeFn<T> = (observer: Observer<T>) => (() => void) | void;

/**
 * Create a basic observable implementation
 */
export function createObservable<T>(subscribeFn: SubscribeFn<T>): Observable<T> {
  const observable: Observable<T> = {
    subscribe(
      observerOrNext: Observer<T> | ((value: T) => void),
      error?: (error: any) => void,
      complete?: () => void
    ): Subscription {
      let closed = false;
      let teardown: (() => void) | undefined;

      const observer: Observer<T> = typeof observerOrNext === 'function'
        ? {
            next: observerOrNext,
            error: error || (() => {}),
            complete: complete || (() => {})
          }
        : observerOrNext;

      const subscription: Subscription = {
        unsubscribe: () => {
          if (!closed) {
            closed = true;
            if (teardown) {
              teardown();
            }
          }
        },
        get closed() {
          return closed;
        }
      };

      try {
        teardown = subscribeFn({
          next: (value: T) => {
            if (!closed) {
              observer.next(value);
            }
          },
          error: (err: any) => {
            if (!closed) {
              closed = true;
              if (observer.error) {
                observer.error(err);
              }
            }
          },
          complete: () => {
            if (!closed) {
              closed = true;
              if (observer.complete) {
                observer.complete();
              }
            }
          }
        }) || undefined;
      } catch (err) {
        if (observer.error) {
          observer.error(err);
        }
      }

      return subscription;
    },

    map<R>(fn: (value: T) => R): Observable<R> {
      return createObservable<R>(observer => {
        return this.subscribe({
          next: value => observer.next(fn(value)),
          error: err => observer.error?.(err),
          complete: () => observer.complete?.()
        }).unsubscribe;
      });
    },

    filter(predicate: (value: T) => boolean): Observable<T> {
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

    take(count: number): Observable<T> {
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

    skip(count: number): Observable<T> {
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

    debounce(delay: number): Observable<T> {
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

    throttle(delay: number): Observable<T> {
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

    distinctUntilChanged(equals: (a: T, b: T) => boolean = (a, b) => a === b): Observable<T> {
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

    switchMap<R>(fn: (value: T) => Observable<R>): Observable<R> {
      return createObservable<R>(observer => {
        let innerSubscription: Subscription | null = null;

        const outerSubscription = this.subscribe({
          next: value => {
            if (innerSubscription) {
              innerSubscription.unsubscribe();
            }
            
            innerSubscription = fn(value).subscribe({
              next: innerValue => observer.next(innerValue),
              error: err => observer.error?.(err),
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

    mergeMap<R>(fn: (value: T) => Observable<R>): Observable<R> {
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
              next: innerValue => observer.next(innerValue),
              error: err => observer.error?.(err),
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

    catchError<R>(fn: (error: any) => Observable<R>): Observable<T | R> {
      return createObservable<T | R>(observer => {
        return this.subscribe({
          next: value => observer.next(value),
          error: err => {
            try {
              const recovery = fn(err);
              recovery.subscribe({
                next: value => observer.next(value),
                error: recoveryErr => observer.error?.(recoveryErr),
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

    retry(count: number = 1): Observable<T> {
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

    scan<R>(accumulator: (acc: R, value: T) => R, seed: R): Observable<R> {
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

    reduce<R>(accumulator: (acc: R, value: T) => R, seed?: R): Observable<R> {
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

    startWith(...values: T[]): Observable<T> {
      return createObservable<T>(observer => {
        values.forEach(value => observer.next(value));
        return this.subscribe(observer).unsubscribe;
      });
    },

    combineLatest<R>(other: Observable<R>): Observable<[T, R]> {
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
          next: value => {
            otherValue = value;
            otherHasValue = true;
            emitIfReady();
          },
          error: err => observer.error?.(err)
        });

        return () => {
          thisSub.unsubscribe();
          otherSub.unsubscribe();
        };
      });
    }
  };

  return observable;
}

/**
 * Create observable from array
 */
export function fromArray<T>(array: T[]): Observable<T> {
  return createObservable<T>(observer => {
    array.forEach(value => observer.next(value));
    observer.complete?.();
  });
}

/**
 * Create observable from Promise
 */
export function fromPromise<T>(promise: Promise<T>): Observable<T> {
  return createObservable<T>(observer => {
    promise
      .then(value => {
        observer.next(value);
        observer.complete?.();
      })
      .catch(err => observer.error?.(err));
  });
}

/**
 * Create observable that emits values at intervals
 */
export function interval(delay: number): Observable<number> {
  return createObservable<number>(observer => {
    let count = 0;
    const id = setInterval(() => {
      observer.next(count++);
    }, delay);

    return () => clearInterval(id);
  });
}

/**
 * Create observable that emits after a delay
 */
export function timer(delay: number): Observable<number> {
  return createObservable<number>(observer => {
    const id = setTimeout(() => {
      observer.next(0);
      observer.complete?.();
    }, delay);

    return () => clearTimeout(id);
  });
} 
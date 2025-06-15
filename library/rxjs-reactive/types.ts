export type Observer<T> = {
  next: (value: T) => void;
  error?: (error: any) => void;
  complete?: () => void;
};

export type Subscription = {
  unsubscribe: () => void;
  closed: boolean;
};

export type OperatorFunction<T, R> = (source: Observable<T>) => Observable<R>;

export interface Observable<T> {
  subscribe(observer: Observer<T>): Subscription;
  subscribe(next: (value: T) => void, error?: (error: any) => void, complete?: () => void): Subscription;
  
  // Operators
  map<R>(fn: (value: T) => R): Observable<R>;
  filter(predicate: (value: T) => boolean): Observable<T>;
  take(count: number): Observable<T>;
  skip(count: number): Observable<T>;
  debounce(delay: number): Observable<T>;
  throttle(delay: number): Observable<T>;
  distinctUntilChanged(equals?: (a: T, b: T) => boolean): Observable<T>;
  switchMap<R>(fn: (value: T) => Observable<R>): Observable<R>;
  mergeMap<R>(fn: (value: T) => Observable<R>): Observable<R>;
  catchError<R>(fn: (error: any) => Observable<R>): Observable<T | R>;
  retry(count?: number): Observable<T>;
  scan<R>(accumulator: (acc: R, value: T) => R, seed: R): Observable<R>;
  reduce<R>(accumulator: (acc: R, value: T) => R, seed?: R): Observable<R>;
  startWith(...values: T[]): Observable<T>;
  combineLatest<R>(other: Observable<R>): Observable<[T, R]>;
}

export interface Subject<T> extends Observable<T> {
  next(value: T): void;
  error(error: any): void;
  complete(): void;
  closed: boolean;
}

export interface BehaviorSubject<T> extends Subject<T> {
  value: T;
  getValue(): T;
}

export type SchedulerLike = {
  schedule<T>(work: () => T, delay?: number): Subscription;
};

export interface ObservableOptions {
  scheduler?: SchedulerLike;
} 
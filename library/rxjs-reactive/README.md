# RxJS-style Reactive Implementation

This implementation provides a comprehensive Observable-based reactive system inspired by RxJS. It includes Observables, Subjects, BehaviorSubjects, and a rich set of operators for handling asynchronous data streams and complex event processing.

## Key Features

- **Observable streams**: First-class support for asynchronous data flows
- **Rich operator library**: Map, filter, debounce, throttle, switchMap, and more
- **Error handling**: Built-in error recovery with retry and catchError
- **Memory management**: Automatic subscription cleanup and leak prevention
- **Type safety**: Full TypeScript support with proper type inference

## Core Concepts

### Observables
Lazy push collections that can emit multiple values over time.

```typescript
import { createObservable, fromArray, interval } from './rxjs-reactive';

// Create from function
const numbers$ = createObservable<number>(observer => {
  observer.next(1);
  observer.next(2);
  observer.next(3);
  observer.complete();
});

// Create from array
const items$ = fromArray([1, 2, 3, 4, 5]);

// Create periodic emissions
const timer$ = interval(1000);

// Subscribe to observe values
numbers$.subscribe({
  next: value => console.log(`Value: ${value}`),
  error: err => console.error('Error:', err),
  complete: () => console.log('Complete!')
});
```

### Subjects
Observables that can also emit values (hot observables).

```typescript
import { createSubject } from './rxjs-reactive';

const events$ = createSubject<string>();

// Subscribe before emitting
events$.subscribe(event => console.log(`Event: ${event}`));

// Emit values
events$.next('click');
events$.next('hover');
events$.complete();
```

### BehaviorSubjects
Subjects that hold a current value and emit it immediately to new subscribers.

```typescript
import { createBehaviorSubject } from './rxjs-reactive';

const currentUser$ = createBehaviorSubject<User | null>(null);

// Always get the current value immediately
currentUser$.subscribe(user => {
  console.log('Current user:', user);
});

// Update the value
currentUser$.next({ id: '1', name: 'John' });
```

## Operators

### Transformation Operators

```typescript
// Map - transform values
numbers$
  .map(x => x * 2)
  .subscribe(value => console.log(value)); // 2, 4, 6

// SwitchMap - flatten and switch to new Observable
const search$ = createSubject<string>();
search$
  .switchMap(query => fetchSearchResults(query))
  .subscribe(results => console.log(results));

// Scan - accumulate values
numbers$
  .scan((acc, curr) => acc + curr, 0)
  .subscribe(sum => console.log(`Sum: ${sum}`)); // 1, 3, 6
```

### Filtering Operators

```typescript
// Filter - only emit matching values
numbers$
  .filter(x => x % 2 === 0)
  .subscribe(even => console.log(`Even: ${even}`));

// Take - limit number of emissions
interval(1000)
  .take(5)
  .subscribe(count => console.log(count)); // 0, 1, 2, 3, 4

// DistinctUntilChanged - skip duplicates
values$
  .distinctUntilChanged()
  .subscribe(unique => console.log(unique));
```

### Timing Operators

```typescript
// Debounce - delay emissions
searchInput$
  .debounce(300)
  .subscribe(query => performSearch(query));

// Throttle - limit emission rate
mouseMove$
  .throttle(16) // ~60fps
  .subscribe(event => updatePosition(event));
```

### Error Handling Operators

```typescript
// CatchError - handle errors gracefully
dataStream$
  .catchError(error => fromArray(['fallback', 'data']))
  .subscribe(data => console.log(data));

// Retry - retry on error
unstableApi$
  .retry(3)
  .subscribe(
    data => console.log(data),
    error => console.log('Failed after 3 retries')
  );
```

## Advanced Patterns

### Combining Streams

```typescript
const user$ = createBehaviorSubject<User>(currentUser);
const settings$ = createBehaviorSubject<Settings>(userSettings);

// Combine latest values from multiple streams
const appState$ = user$.combineLatest(settings$);

appState$.subscribe(([user, settings]) => {
  console.log('App state:', { user, settings });
});
```

### Event Processing

```typescript
const clicks$ = createSubject<MouseEvent>();
const doubleClicks$ = createSubject<MouseEvent>();

// Detect double clicks
clicks$
  .debounce(250)
  .subscribe(event => {
    // Single click logic
  });

clicks$
  .scan((acc, curr) => {
    const now = curr.timeStamp;
    return acc.filter(prev => now - prev.timeStamp < 250).concat(curr);
  }, [] as MouseEvent[])
  .filter(events => events.length === 2)
  .subscribe(events => {
    doubleClicks$.next(events[1]);
  });
```

### State Management

```typescript
interface AppState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const actions$ = createSubject<Action>();
const initialState: AppState = { user: null, loading: false, error: null };

const state$ = actions$
  .scan((state, action) => {
    switch (action.type) {
      case 'LOGIN_START':
        return { ...state, loading: true, error: null };
      case 'LOGIN_SUCCESS':
        return { ...state, loading: false, user: action.payload };
      case 'LOGIN_ERROR':
        return { ...state, loading: false, error: action.payload };
      default:
        return state;
    }
  }, initialState);

// Subscribe to state changes
state$.subscribe(state => {
  renderApp(state);
});

// Dispatch actions
actions$.next({ type: 'LOGIN_START' });
```

### HTTP Requests

```typescript
const apiCall$ = (url: string) => createObservable<Response>(observer => {
  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(data => {
      observer.next(data);
      observer.complete();
    })
    .catch(error => observer.error(error));
});

// Use with operators
const userData$ = apiCall$('/api/user')
  .retry(2)
  .catchError(error => fromArray([{ id: null, name: 'Guest' }]));

userData$.subscribe(user => console.log('User:', user));
```

## Implementation Details

1. **Lazy Evaluation**: Observables only execute when subscribed to
2. **Push-based**: Data flows from producer to consumer  
3. **Composable**: Operators can be chained for complex transformations
4. **Memory Safe**: Automatic cleanup when subscriptions end
5. **Error Boundaries**: Errors are contained and can be handled gracefully

## Performance Considerations

- **Subscription overhead**: Each operator creates a new subscription layer
- **Memory usage**: Long chains can accumulate memory if not cleaned up
- **Timing precision**: Debounce/throttle use setTimeout with ~4ms minimum delay
- **Operator efficiency**: Some operators (like scan) maintain internal state

## Best Practices

1. **Always unsubscribe**: Prevent memory leaks by cleaning up subscriptions
2. **Use operators**: Leverage the operator library instead of manual logic
3. **Handle errors**: Always provide error handlers for production code
4. **Compose thoughtfully**: Order operators for optimal performance
5. **Avoid nested subscriptions**: Use operators like switchMap instead

## Comparison with Other Patterns

| Feature | RxJS-style | Signals | Pub-Sub |
|---------|------------|---------|---------|
| Async handling | Excellent | Good | Good |
| Operator richness | Excellent | Limited | Limited |
| Learning curve | High | Medium | Low |
| Memory usage | High | Low | Medium |
| Error handling | Excellent | Basic | Basic |
| Composability | Excellent | Good | Good |

## Common Use Cases

- **API calls**: HTTP requests with retry logic and error handling
- **User interactions**: Mouse/keyboard events with debouncing and throttling  
- **Real-time data**: WebSocket streams and live updates
- **State management**: Redux-style state machines
- **Animation**: Timed sequences and smooth transitions
- **Form validation**: Input validation with async rules 
# Proxy State Implementation

This implementation provides deep reactivity using JavaScript Proxies to track object mutations and nested property changes. It offers Vue.js-style reactivity with automatic change detection for complex object structures.

## Key Features

- **Deep reactivity**: Automatically tracks nested object and array changes
- **Path-based notifications**: Know exactly what changed and where
- **Immutable snapshots**: Get clean copies of state at any time  
- **Memory efficient**: Minimal overhead with automatic cleanup
- **Type safety**: Full TypeScript support with proper type inference

## Core Concepts

### Proxy State
Creates a reactive proxy wrapper around any object that tracks all mutations.

```typescript
const state = createProxyState({
  user: {
    name: 'John',
    profile: {
      age: 30,
      preferences: {
        theme: 'dark',
        notifications: true
      }
    }
  },
  todos: [
    { id: 1, text: 'Learn React', done: false },
    { id: 2, text: 'Build app', done: true }
  ]
});

// Subscribe to any changes
state.__subscribe((newState, oldState, path) => {
  console.log(`Changed at [${path.join('.')}]:`, newState);
});

// All mutations are tracked
state.user.name = 'Jane';                    // Triggers: ['user', 'name']
state.user.profile.age = 31;                // Triggers: ['user', 'profile', 'age'] 
state.todos.push({ id: 3, text: 'Deploy', done: false }); // Triggers: ['todos', '2']
```

### State Updates
Helper function for immutable-style updates while maintaining reactivity.

```typescript
// Functional updates
updateProxyState(state, current => ({
  user: {
    ...current.user,
    profile: {
      ...current.user.profile,
      age: current.user.profile.age + 1
    }
  }
}));

// Partial updates
updateProxyState(state, {
  'user.name': 'Alice',
  'todos[0].done': true
});
```

### Computed State
Create derived state that automatically recomputes when dependencies change.

```typescript
const userAge = createComputedState(() => state.user.profile.age);

userAge.subscribe(age => {
  console.log(`User age changed to: ${age}`);
});

// Changing the source triggers the computed
state.user.profile.age = 32; // Logs: "User age changed to: 32"
```

## Implementation Details

1. **Proxy Traps**: Uses get/set/deleteProperty traps to intercept mutations
2. **Deep Proxying**: Automatically wraps nested objects and arrays
3. **Path Tracking**: Maintains full path information for precise change notifications
4. **Memory Management**: WeakMap-based metadata storage prevents leaks
5. **Equality Checking**: Configurable equality functions to optimize updates

## Usage Examples

### Basic Object Tracking

```typescript
import { createProxyState } from './proxy-state';

const appState = createProxyState({
  ui: {
    theme: 'light',
    sidebar: { open: false, width: 250 },
    modals: []
  },
  data: {
    users: [],
    posts: [],
    cache: new Map()
  }
});

// Subscribe to specific changes
appState.__subscribe((newState, oldState, path) => {
  if (path[0] === 'ui') {
    updateUI(newState.ui);
  } else if (path[0] === 'data') {
    syncToServer(path, newState);
  }
});

// Direct mutations work naturally
appState.ui.theme = 'dark';
appState.ui.sidebar.open = true;
appState.data.users.push({ id: 1, name: 'John' });
```

### Form State Management

```typescript
const formState = createProxyState({
  values: {
    email: '',
    password: '',
    profile: {
      firstName: '',
      lastName: '',
      bio: ''
    }
  },
  errors: {},
  touched: {},
  isSubmitting: false
});

// Validation on change
formState.__subscribe((newState, oldState, path) => {
  if (path[0] === 'values') {
    const field = path.slice(1).join('.');
    formState.errors[field] = validateField(field, newState.values);
    formState.touched[field] = true;
  }
});

// Natural form binding
function handleChange(field: string, value: string) {
  // Works with nested paths
  setNestedValue(formState.values, field, value);
}
```

### State Persistence

```typescript
const persistentState = createProxyState(
  loadFromStorage() || { settings: {}, data: {} }
);

// Auto-save on changes
let saveTimeout: number;
persistentState.__subscribe((newState) => {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveToStorage(newState);
  }, 1000);
});

// Batch updates to minimize saves
batch(() => {
  persistentState.settings.theme = 'dark';
  persistentState.settings.language = 'en';
  persistentState.data.lastSeen = Date.now();
});
```

### Multiple State Coordination

```typescript
const userState = createProxyState({ 
  currentUser: null, 
  preferences: {} 
});

const appState = createProxyState({ 
  route: '/', 
  loading: false 
});

// Coordinate multiple states
subscribeToStates([userState, appState], (changedState, newValue, oldValue, path) => {
  if (changedState === userState && path.includes('currentUser')) {
    // User changed, update app state
    appState.loading = true;
    loadUserData(newValue.currentUser).then(() => {
      appState.loading = false;
    });
  }
});
```

## Advanced Features

### Custom Equality Checking

```typescript
const state = createProxyState(
  { items: [] },
  { 
    equals: (a, b) => JSON.stringify(a) === JSON.stringify(b) // Deep equality
  }
);
```

### Batch Updates

```typescript
// Defer notifications until batch completes
batch(() => {
  state.user.name = 'New Name';
  state.user.email = 'new@email.com';
  state.user.profile.age = 25;
}); // Only one notification fired
```

### State Snapshots

```typescript
// Get immutable snapshot
const snapshot = state.__getSnapshot();

// Restore from snapshot
updateProxyState(state, snapshot);
```

## Best Practices

1. **Keep state normalized**: Avoid deeply nested structures when possible
2. **Use batch updates**: Group related changes to minimize notifications
3. **Subscribe granularly**: Listen for specific path changes when relevant
4. **Avoid proxy pollution**: Don't store non-serializable objects
5. **Clean up subscriptions**: Always unsubscribe to prevent memory leaks

## Performance Considerations

- **Deep proxying overhead**: Each nested object creates a new proxy
- **Change detection cost**: Every property access goes through proxy traps
- **Memory usage**: WeakMap metadata storage scales with object complexity
- **Notification frequency**: Can be high-frequency with many small changes

## Comparison with Other Patterns

| Feature | Proxy State | Signals | Pub-Sub |
|---------|-------------|---------|---------|
| Mutation tracking | Automatic | Manual | Manual |
| Deep reactivity | Yes | No | No |
| Performance | Good | Excellent | Good |
| Learning curve | Low | Medium | Low |
| Memory usage | Medium | Low | Low |
| Path information | Yes | No | Limited | 
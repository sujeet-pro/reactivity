# Pub-Sub Implementation

This implementation provides a comprehensive publish-subscribe (pub-sub) pattern for event-driven architecture. It includes type-safe event emitters, reactive state management, and flexible subscription handling.

## Key Features

- **Type-safe events**: Full TypeScript support for event types
- **Memory management**: Automatic cleanup and leak prevention
- **Error handling**: Robust error recovery mechanisms
- **Flexible APIs**: Multiple patterns for different use cases

## Core Concepts

### Event Emitter
A centralized event hub that allows components to communicate without direct dependencies.

```typescript
const events = createEventEmitter<{
  userLogin: { userId: string; timestamp: number };
  userLogout: void;
  dataUpdate: { id: string; data: any };
}>();

// Subscribe to events
const unsubscribe = events.on('userLogin', (payload) => {
  console.log(`User ${payload.userId} logged in at ${payload.timestamp}`);
});

// Emit events
events.emit('userLogin', { userId: '123', timestamp: Date.now() });

// Cleanup
unsubscribe();
```

### Reactive State
Combines state management with the pub-sub pattern for reactive programming.

```typescript
const counter = createReactiveState(0);

// Subscribe to changes
counter.subscribe(value => {
  console.log(`Counter: ${value}`);
});

// Update state
counter.set(5);
counter.set(prev => prev + 1);
```

### Channels
Dedicated communication channels for specific data types.

```typescript
const userChannel = createChannel<User>();

const unsubscribe = userChannel.subscribe(user => {
  console.log('User updated:', user);
});

userChannel.publish({ id: '1', name: 'John' });
```

### Pub-Sub Hub
Centralized management of multiple channels.

```typescript
const hub = createPubSubHub();

const userChannel = hub.channel<User>('users');
const messageChannel = hub.channel<Message>('messages');

// Use channels independently
userChannel.subscribe(user => console.log('User:', user));
messageChannel.subscribe(msg => console.log('Message:', msg));
```

## Implementation Details

1. **Event Loop Integration**: Works seamlessly with the JavaScript event loop
2. **Memory Safety**: Automatic cleanup prevents memory leaks
3. **Error Isolation**: Errors in one subscriber don't affect others
4. **Performance**: Optimized for high-frequency events

## Usage Examples

### Basic Event Communication

```typescript
import { createEventEmitter } from './pub-sub';

interface AppEvents {
  'theme-change': { theme: 'light' | 'dark' };
  'user-action': { action: string; payload: any };
  'error': { message: string; code: number };
}

const appEvents = createEventEmitter<AppEvents>();

// Theme system
appEvents.on('theme-change', ({ theme }) => {
  document.body.className = `theme-${theme}`;
});

// Analytics
appEvents.on('user-action', ({ action, payload }) => {
  analytics.track(action, payload);
});

// Error handling
appEvents.on('error', ({ message, code }) => {
  console.error(`Error ${code}: ${message}`);
});

// Trigger events
appEvents.emit('theme-change', { theme: 'dark' });
appEvents.emit('user-action', { action: 'button-click', payload: { button: 'submit' } });
```

### State Management

```typescript
import { createReactiveState, combineStates } from './pub-sub';

// Individual states
const user = createReactiveState<User | null>(null);
const settings = createReactiveState({ theme: 'light', lang: 'en' });

// Combined state
const appState = combineStates({ user, settings });

// Subscribe to combined state
appState.subscribe(state => {
  console.log('App state:', state);
});

// Update individual states
user.set({ id: '1', name: 'John' });
settings.set(prev => ({ ...prev, theme: 'dark' }));
```

### Advanced Patterns

```typescript
// Event filtering and transformation
const clicks = createChannel<MouseEvent>();
const rightClicks = createChannel<MouseEvent>();

clicks.subscribe(event => {
  if (event.button === 2) { // Right click
    rightClicks.publish(event);
  }
});

// Event aggregation
const actions = createChannel<string>();
const actionCounts = new Map<string, number>();

actions.subscribe(action => {
  const count = actionCounts.get(action) || 0;
  actionCounts.set(action, count + 1);
  console.log(`Action '${action}' performed ${count + 1} times`);
});
```

## Best Practices

1. **Use TypeScript**: Leverage type safety for better developer experience
2. **Clean up subscriptions**: Always unsubscribe to prevent memory leaks
3. **Error boundaries**: Handle errors gracefully in subscribers
4. **Event naming**: Use descriptive, consistent event names
5. **Payload design**: Keep event payloads minimal and focused

## Comparison with Other Patterns

| Feature | Pub-Sub | Signals | Proxy State |
|---------|---------|---------|-------------|
| Coupling | Loose | Tight | Medium |
| Performance | Good | Excellent | Good |
| Debugging | Moderate | Easy | Easy |
| Learning Curve | Low | Medium | Medium |
| Use Cases | Events, Communication | Reactive UI | Object Tracking | 
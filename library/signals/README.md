# Signals Implementation

This implementation provides a reactive system based on signals, similar to SolidJS. Signals are reactive primitives that automatically track dependencies and update derived computations when their values change.

## Key Features

- **Fine-grained reactivity**: Only update what actually depends on changed values
- **Automatic dependency tracking**: No need to manually declare dependencies
- **Synchronous updates**: Changes propagate immediately
- **Memory efficient**: Automatic cleanup of unused dependencies

## Core Concepts

### Signals
The fundamental reactive primitive. A signal is a getter/setter pair that holds a value and notifies dependents when it changes.

```typescript
const [count, setCount] = createSignal(0);
console.log(count()); // 0
setCount(5);
console.log(count()); // 5
```

### Effects
Computations that automatically re-run when their signal dependencies change.

```typescript
const [name, setName] = createSignal('World');

createEffect(() => {
  console.log(`Hello, ${name()}!`);
});

setName('Alice'); // Logs: "Hello, Alice!"
```

### Memos
Cached derived computations that only recalculate when dependencies change.

```typescript
const [count, setCount] = createSignal(5);
const doubled = createMemo(() => count() * 2);

console.log(doubled()); // 10
setCount(10);
console.log(doubled()); // 20
```

### Resources
For handling async operations with loading, error, and data states.

```typescript
const user = createResource(() => fetchUser(id));

// Access the resource state
const state = user();
if (state.loading) console.log('Loading...');
if (state.error) console.log('Error:', state.error);
if (state.data) console.log('User:', state.data);
```

## Implementation Details

1. **Dependency Tracking**: Uses a global observer stack to track which effect is currently running
2. **Equality Checking**: Supports custom equality functions to prevent unnecessary updates
3. **Cleanup Support**: Effects can return cleanup functions that run before re-execution
4. **Error Handling**: Resources provide structured error handling for async operations

## Usage Example

```typescript
import { createSignal, createEffect, createMemo } from './signals';

// Create reactive state
const [count, setCount] = createSignal(0);
const [multiplier, setMultiplier] = createSignal(2);

// Create derived state
const result = createMemo(() => count() * multiplier());

// Create side effects
createEffect(() => {
  console.log(`Result: ${result()}`);
});

// Updates will automatically propagate
setCount(5); // Logs: "Result: 10"
setMultiplier(3); // Logs: "Result: 15"
``` 
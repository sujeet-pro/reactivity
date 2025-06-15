# Reactivity Library

A comprehensive TypeScript library showcasing different reactive programming patterns and implementations. This library demonstrates four distinct approaches to reactivity: Signals, Proxy-based State, Pub-Sub, and RxJS-style Observables.

## 🚀 Features

- **Signals**: Fine-grained reactivity with automatic dependency tracking (SolidJS-style)
- **Proxy State**: Object mutation tracking using JavaScript Proxies
- **Pub-Sub**: Event-driven architecture with publishers and subscribers
- **RxJS-style**: Observable streams with operators for complex data transformations

## 📁 Project Structure

```
.
├── library/                    # Core reactivity implementations
│   ├── signals/               # Signals implementation
│   ├── proxy-state/           # Proxy-based state management
│   ├── pub-sub/               # Publisher-Subscriber pattern
│   └── rxjs-reactive/         # RxJS-style observables
├── examples/                  # Example applications
│   ├── src/                   # Source code for examples
│   ├── index.html             # Main example page
│   └── package.json           # Examples dependencies
├── package.json               # Main package configuration
├── tsconfig.json              # TypeScript configuration
├── vitest.config.ts           # Test configuration
└── README.md                  # This file
```

## 🛠 Installation

### Prerequisites

- Node.js >= 18
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/sujeet-pro/reactivity.git
   cd reactivity
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the library**
   ```bash
   npm run build
   ```

4. **Install examples dependencies**
   ```bash
   cd examples
   npm install
   ```

## 🚦 Running Locally

### Development Server

Run the examples with hot reload:

```bash
# From the root directory
npm run dev

# Or from examples directory
cd examples
npm run dev
```

This will start a development server at `http://localhost:3000` with the interactive examples.

### Building for Production

```bash
# Build library
npm run build:library

# Build examples
npm run build:examples

# Build both
npm run build
```

### Running Tests

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

## 📚 Library Usage

### Signals

```typescript
import { createSignal, createEffect, createMemo } from '@sujeet-pro/reactivity';

// Create reactive state
const [count, setCount] = createSignal(0);

// Create derived state
const doubled = createMemo(() => count() * 2);

// Create side effects
createEffect(() => {
  console.log(`Count: ${count()}, Doubled: ${doubled()}`);
});

// Update state
setCount(5); // Logs: "Count: 5, Doubled: 10"
```

### Proxy State

```typescript
import { createProxyState } from '@sujeet-pro/reactivity';

// Create reactive object
const state = createProxyState({ 
  user: { name: 'John', age: 30 },
  settings: { theme: 'dark' }
});

// Subscribe to changes
state.__subscribe((newState, oldState, path) => {
  console.log(`Changed at ${path.join('.')}: `, newState);
});

// Mutate state
state.user.name = 'Jane'; // Triggers subscription
state.settings.theme = 'light'; // Triggers subscription
```

### Pub-Sub

```typescript
import { createEventEmitter, createReactiveState } from '@sujeet-pro/reactivity';

// Event emitter
const events = createEventEmitter<{
  userLogin: { userId: string };
  userLogout: void;
}>();

events.on('userLogin', ({ userId }) => {
  console.log(`User ${userId} logged in`);
});

events.emit('userLogin', { userId: '123' });

// Reactive state
const counter = createReactiveState(0);
counter.subscribe(value => console.log(`Counter: ${value}`));
counter.set(prev => prev + 1);
```

### RxJS-style

```typescript
import { createSubject, createObservable, interval } from '@sujeet-pro/reactivity';

// Subject
const clicks$ = createSubject<MouseEvent>();

clicks$
  .map(event => ({ x: event.clientX, y: event.clientY }))
  .filter(coords => coords.x > 100)
  .subscribe(coords => console.log('Click:', coords));

// Observable
const timer$ = interval(1000);
timer$
  .take(5)
  .subscribe(count => console.log(`Timer: ${count}`));
```

## 🎯 Examples

The examples application demonstrates all four reactivity patterns with interactive counter implementations. Each pattern shows:

- Counter state management
- Event handling
- Performance metrics
- Real-time updates

Visit the [examples page](https://sujeet-pro.github.io/reactivity/) to see them in action.

## 🧪 Testing

The library includes comprehensive tests using Vitest:

- Unit tests for all reactive patterns
- Integration tests for complex scenarios
- Performance benchmarks
- Edge case coverage

## 🎨 Implementation Details

### Signals
- Automatic dependency tracking using execution context
- Synchronous updates with batching support
- Memory-efficient cleanup
- Equality checking for optimization

### Proxy State  
- Deep reactivity using JavaScript Proxies
- Path-based change notifications
- Nested object support
- Immutable update patterns

### Pub-Sub
- Type-safe event emitters
- Memory leak prevention
- Error handling and recovery
- Flexible subscription management

### RxJS-style
- Full operator support (map, filter, debounce, etc.)
- Subscription management
- Error handling with retry logic
- Backpressure handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [SolidJS](https://solidjs.com) signals implementation
- [RxJS](https://rxjs.dev) for observable patterns
- [Vue.js](https://vuejs.org) for proxy-based reactivity concepts

## 🔗 Links

- [GitHub Repository](https://github.com/sujeet-pro/reactivity)
- [Live Examples](https://sujeet-pro.github.io/reactivity/)
- [Documentation](https://github.com/sujeet-pro/reactivity#readme)
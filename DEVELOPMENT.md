# Development Guide

## 🏗 Architecture Overview

This library implements four different reactivity patterns:

### 1. Signals
- Fine-grained reactivity with automatic dependency tracking
- Core primitives: `createSignal`, `createEffect`, `createMemo`, `createResource`
- Located in `library/signals/`
- Key concepts: dependency tracking, automatic subscriptions, cleanup

### 2. Proxy State
- Object mutation tracking using JavaScript Proxies
- Core primitives: `createProxyState`, `updateProxyState`, `createComputedState`
- Located in `library/proxy-state/`
- Key concepts: immutable updates, batching, computed properties

### 3. Pub-Sub
- Event-driven architecture with publishers and subscribers
- Core primitives: `createEventEmitter`, `createChannel`, `createPubSubHub`
- Located in `library/pub-sub/`
- Key concepts: event channels, message passing, reactive states

### 4. RxJS-style Observables
- Stream-based reactivity with operators
- Core primitives: `createObservable`, `createSubject`, `createBehaviorSubject`
- Located in `library/rxjs-reactive/`
- Key concepts: operators, subjects, subscription management

## 🔧 Development Setup

1. **Prerequisites**
   - Node.js >= 18
   - npm >= 8
   - TypeScript knowledge
   - Understanding of reactive programming patterns

2. **Initial Setup**
   ```bash
   git clone https://github.com/sujeet-pro/reactivity.git
   cd reactivity
   npm install
   ```

3. **Development Workflow**
   ```bash
   # Start development with hot reload
   npm run dev
   
   # Run tests
   npm test
   
   # Run tests with coverage
   npm run test:coverage
   
   # Run type checks
   npm run type-check
   
   # Run linting
   npm run lint
   ```

## 📝 Coding Guidelines

### TypeScript Best Practices

1. **Type Safety**
   - Use strict TypeScript configuration
   - Avoid `any` types
   - Leverage generics for reusable code
   - Use discriminated unions for complex types

2. **Documentation**
   - Add JSDoc comments for public APIs
   - Include examples in documentation
   - Document edge cases and limitations
   - Keep README.md up to date

3. **Error Handling**
   - Use custom error classes
   - Provide meaningful error messages
   - Handle edge cases gracefully
   - Add error recovery mechanisms

4. **Performance**
   - Minimize memory allocations
   - Use WeakMap/WeakSet for cleanup
   - Implement proper cleanup in effects
   - Profile and benchmark changes

### Code Style

1. **Naming Conventions**
   ```typescript
   // Interfaces
   interface UserState {
     name: string;
     age: number;
   }
   
   // Type aliases
   type UserCallback = (user: User) => void;
   
   // Constants
   const MAX_RETRIES = 3;
   
   // Functions
   function createUserSignal(): Signal<User> {
     // ...
   }
   ```

2. **File Organization**
   ```
   library/
   ├── signals/
   │   ├── index.ts        # Public API
   │   ├── signal.ts       # Core implementation
   │   ├── types.ts        # Type definitions
   │   └── signal.test.ts  # Tests
   ```

3. **Import/Export Style**
   ```typescript
   // Prefer named exports
   export { createSignal, createEffect };
   
   // Use barrel exports in index.ts
   export * from './signal';
   export * from './types';
   ```

## 🧪 Testing Guidelines

1. **Unit Tests**
   - Test each feature in isolation
   - Cover edge cases and error conditions
   - Use meaningful test descriptions
   - Follow AAA pattern (Arrange, Act, Assert)

2. **Integration Tests**
   - Test interactions between features
   - Cover common use cases
   - Test performance characteristics
   - Verify cleanup and memory usage

3. **Example Test Structure**
   ```typescript
   describe('Signal', () => {
     describe('createSignal', () => {
       it('should create with initial value', () => {
         const [count] = createSignal(0);
         expect(count()).toBe(0);
       });
       
       it('should update value', () => {
         const [count, setCount] = createSignal(0);
         setCount(1);
         expect(count()).toBe(1);
       });
     });
   });
   ```

## 🔍 Code Review Guidelines

1. **What to Look For**
   - Type safety and correctness
   - Error handling completeness
   - Performance implications
   - Documentation quality
   - Test coverage

2. **Review Checklist**
   - [ ] Types are properly defined
   - [ ] Error cases are handled
   - [ ] Tests cover new functionality
   - [ ] Documentation is updated
   - [ ] No unnecessary dependencies
   - [ ] Performance is considered
   - [ ] Code follows style guide

## 🐛 Debugging Tips

1. **Development Tools**
   - Use Chrome DevTools
   - Enable source maps
   - Use the React DevTools
   - Profile with Node.js tools

2. **Common Issues**
   - Memory leaks from uncleaned effects
   - Circular dependencies
   - Type inference issues
   - Performance bottlenecks

3. **Debugging Signals**
   ```typescript
   // Enable debug mode
   setDebugMode(true);
   
   // Add debug logging
   createEffect(() => {
     console.log('Effect running with:', value());
   });
   ```

## 📈 Performance Optimization

1. **Signal Optimization**
   - Use `batch` for multiple updates
   - Leverage `createMemo` for caching
   - Clean up effects properly
   - Use appropriate equality checks

2. **Memory Management**
   - Use WeakMap for metadata
   - Dispose effects when done
   - Avoid closure leaks
   - Profile memory usage

3. **Benchmarking**
   ```typescript
   // Run benchmarks
   npm run benchmark
   
   // Profile specific features
   node --prof app.js
   ```

## 📚 Additional Resources

1. **Reactive Programming**
   - [ReactiveX](http://reactivex.io/)
   - [SolidJS Documentation](https://www.solidjs.com/)
   - [RxJS Documentation](https://rxjs.dev/)

2. **TypeScript Resources**
   - [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
   - [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

3. **Performance Resources**
   - [Node.js Profiling](https://nodejs.org/en/docs/guides/simple-profiling/)
   - [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools/)

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- npm >= 8
- Git

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
   npm run build:library
   ```

4. **Run tests**
   ```bash
   npm test
   ```

## 📁 Project Structure

```
reactivity/
├── library/                    # Core library implementation
│   ├── signals/               # Signals reactivity pattern
│   │   ├── signal.ts          # Core signal implementation
│   │   ├── types.ts           # TypeScript definitions
│   │   ├── signal.test.ts     # Unit tests
│   │   └── index.ts           # Module exports
│   ├── proxy-state/           # Proxy-based state management
│   ├── pub-sub/               # Publisher-Subscriber pattern
│   ├── rxjs-reactive/         # RxJS-style observables
│   ├── benchmarks/            # Performance benchmarks
│   └── index.ts               # Main library exports
├── examples/                  # Example applications
├── dist/                      # Built library files
├── coverage/                  # Test coverage reports
└── docs/                      # Documentation
```

## 🛠 Development Workflow

### Development Server

Start the development server with hot reload:

```bash
npm run dev
```

This will:
- Build the library in watch mode
- Start the examples development server
- Open the examples at `http://localhost:5173`

### Library Development

For library-only development:

```bash
npm run dev:library
```

This builds the library in watch mode, automatically recompiling on changes.

### Testing

Run the full test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Run tests with UI:

```bash
npm run test:ui
```

Generate coverage report:

```bash
npm run test:coverage
```

### Type Checking

Check TypeScript types:

```bash
npm run type-check
```

### Linting

Lint the codebase:

```bash
npm run lint
```

Fix linting issues:

```bash
npm run lint:fix
```

## 🧪 Testing Strategy

### Test Structure

Each module follows this testing pattern:

1. **Unit Tests**: Test individual functions and methods
2. **Integration Tests**: Test interactions between components
3. **Performance Tests**: Benchmark performance characteristics
4. **Edge Case Tests**: Test error conditions and edge cases

### Test Coverage

We maintain high test coverage (>95%) across all modules:

- **Signals**: 268+ tests
- **Proxy State**: 712+ tests  
- **Pub-Sub**: 532+ tests
- **RxJS-style**: 1499+ tests

### Performance Benchmarks

Performance benchmarks are located in `library/benchmarks/` and test:

- Update frequency handling
- Memory usage patterns
- Cross-pattern performance comparisons
- Memory leak detection

## 📝 Code Style & Standards

### TypeScript

- Use strict TypeScript configuration
- Prefer explicit types over `any`
- Use JSDoc comments for public APIs
- Follow naming conventions:
  - Functions: `camelCase`
  - Types/Interfaces: `PascalCase`
  - Constants: `UPPER_SNAKE_CASE`

### Documentation

- All public APIs must have JSDoc comments
- Include usage examples in JSDoc
- Document parameters, return types, and exceptions
- Keep README files up to date

### Error Handling

- Use descriptive error messages
- Include context in error objects
- Handle edge cases gracefully
- Log errors appropriately

## 🔧 Performance Considerations

### Memory Management

- Use WeakMap/WeakSet for metadata storage
- Implement proper cleanup in dispose methods
- Avoid circular references
- Test for memory leaks in benchmarks

### Optimization Strategies

- Minimize object allocations
- Use efficient data structures
- Implement lazy evaluation where appropriate
- Batch updates when possible

### Benchmarking

- Run performance tests regularly
- Monitor for performance regressions
- Use realistic test scenarios
- Compare against previous versions

## 🚀 Release Process

### Version Management

We follow [Semantic Versioning](https://semver.org/):

- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes (backward compatible)

### Release Checklist

Before releasing:

1. **Update version** in `package.json`
2. **Run full test suite** with coverage
3. **Update documentation** and changelog
4. **Build library** for production
5. **Test examples** in production build
6. **Create release notes**

### Publishing

```bash
npm run build:library
npm test
npm publish
```

## 🤝 Contributing

### Pull Request Process

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Add tests** for new functionality
5. **Update documentation**
6. **Run the full test suite**
7. **Submit a pull request**

### Commit Message Format

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

### Code Review

All changes require:

- Passing tests
- Adequate test coverage
- Documentation updates
- Performance considerations
- Code review approval

## 🐛 Debugging

### Common Issues

1. **Memory Leaks**: Use browser dev tools to check for memory leaks
2. **Performance Issues**: Run performance benchmarks
3. **Type Errors**: Use `npm run type-check`
4. **Test Failures**: Check test output and coverage

### Debug Tools

- **Browser DevTools**: For runtime debugging
- **Vitest UI**: For test debugging
- **TypeScript**: For type checking
- **Performance Profiler**: For performance analysis

## 📚 Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [Reactive Programming Concepts](https://rxjs.dev/guide/overview)
- [SolidJS Signals](https://solidjs.com/docs/latest/api#createsignal)

## 🆘 Getting Help

- **Issues**: Create an issue on GitHub
- **Discussions**: Use GitHub Discussions
- **Documentation**: Check the README and inline docs
- **Examples**: Run the examples to see usage patterns

---

For more information, see the [main README](../README.md) or create an issue on GitHub. 
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-03-20

### Added
- Initial release with four reactivity patterns:
  - Signals: Fine-grained reactivity with automatic dependency tracking
  - Proxy State: Object mutation tracking using JavaScript Proxies
  - Pub-Sub: Event-driven architecture with publishers and subscribers
  - RxJS-style: Observable streams with operators
- Comprehensive documentation and examples
- Full TypeScript support with strict type checking
- Performance benchmarks and optimization tools
- Development tools and debugging utilities
- Error handling with custom error classes
- Memory management optimizations
- Test suite with high coverage

### Changed
- N/A (Initial release)

### Deprecated
- N/A (Initial release)

### Removed
- N/A (Initial release)

### Fixed
- N/A (Initial release)

### Security
- N/A (Initial release)

## [Unreleased]

### Added
- Debug mode for signals with detailed logging
- Performance optimizations for memo caching
- Error retry mechanism for effects
- Memory usage tracking and optimization
- Comprehensive JSDoc documentation
- Development guidelines and best practices
- Benchmarking tools and performance tests

### Changed
- Enhanced error handling with custom error classes
- Improved memory management with WeakMap
- Better TypeScript types with stricter checks
- More detailed debugging information

### Fixed
- Memory leaks in effect cleanup
- Type inference issues
- Error handling in async operations
- Documentation gaps and examples

[1.0.0]: https://github.com/sujeet-pro/reactivity/releases/tag/v1.0.0
[Unreleased]: https://github.com/sujeet-pro/reactivity/compare/v1.0.0...HEAD 
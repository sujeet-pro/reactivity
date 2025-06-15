// Import all reactivity patterns from the library
import { 
  // Signals
  createSignal, 
  createEffect,
  
  // Proxy State  
  createProxyState,
  
  // Pub-Sub
  createReactiveState,
  
  // RxJS-style
  createSubject
} from '@sujeet-pro/reactivity';

// Signals Implementation
function setupSignalsExample() {
  const [count, setCount] = createSignal(0);
  let effectRuns = 0;

  // Create effect to update DOM
  createEffect(() => {
    const countValue = count();
    const countDisplay = document.getElementById('signals-count')!;
    countDisplay.textContent = countValue.toString();
    effectRuns++;
    
    const statsDisplay = document.getElementById('signals-stats')!;
    statsDisplay.textContent = `Effects run: ${effectRuns}`;
  });

  // Set up event listeners
  document.getElementById('signals-increment')!.addEventListener('click', () => {
    setCount(c => c + 1);
  });

  document.getElementById('signals-decrement')!.addEventListener('click', () => {
    setCount(c => c - 1);
  });

  document.getElementById('signals-reset')!.addEventListener('click', () => {
    setCount(0);
  });

  console.log('✅ Signals example initialized');
}

// Proxy State Implementation
function setupProxyStateExample() {
  const state = createProxyState({ count: 0 });
  let updateCount = 0;

  // Subscribe to changes
  state.__subscribe(() => {
    updateCount++;
    const countDisplay = document.getElementById('proxy-count')!;
    countDisplay.textContent = state.count.toString();
    
    const statsDisplay = document.getElementById('proxy-stats')!;
    statsDisplay.textContent = `Updates: ${updateCount}`;
  });

  // Set up event listeners
  document.getElementById('proxy-increment')!.addEventListener('click', () => {
    state.count += 1;
  });

  document.getElementById('proxy-decrement')!.addEventListener('click', () => {
    state.count -= 1;
  });

  document.getElementById('proxy-reset')!.addEventListener('click', () => {
    state.count = 0;
  });

  console.log('✅ Proxy State example initialized');
}

// Pub-Sub Implementation
function setupPubSubExample() {
  const counter = createReactiveState(0);
  let eventCount = 0;

  // Subscribe to changes
  counter.subscribe((value) => {
    eventCount++;
    const countDisplay = document.getElementById('pubsub-count')!;
    countDisplay.textContent = value.toString();
    
    const statsDisplay = document.getElementById('pubsub-stats')!;
    statsDisplay.textContent = `Events: ${eventCount}`;
  });

  // Set up event listeners
  document.getElementById('pubsub-increment')!.addEventListener('click', () => {
    counter.set(current => current + 1);
  });

  document.getElementById('pubsub-decrement')!.addEventListener('click', () => {
    counter.set(current => current - 1);
  });

  document.getElementById('pubsub-reset')!.addEventListener('click', () => {
    counter.set(0);
  });

  console.log('✅ Pub-Sub example initialized');
}

// RxJS-style Implementation
function setupRxJSExample() {
  const counter$ = createSubject<number>();
  let emissionCount = 0;

  // Subscribe to the subject
  counter$.subscribe(value => {
    emissionCount++;
    const countDisplay = document.getElementById('rxjs-count')!;
    countDisplay.textContent = value.toString();
    
    const statsDisplay = document.getElementById('rxjs-stats')!;
    statsDisplay.textContent = `Emissions: ${emissionCount}`;
  });

  let currentValue = 0;
  counter$.next(currentValue); // Initial emission

  // Set up event listeners
  document.getElementById('rxjs-increment')!.addEventListener('click', () => {
    currentValue += 1;
    counter$.next(currentValue);
  });

  document.getElementById('rxjs-decrement')!.addEventListener('click', () => {
    currentValue -= 1;
    counter$.next(currentValue);
  });

  document.getElementById('rxjs-reset')!.addEventListener('click', () => {
    currentValue = 0;
    counter$.next(currentValue);
  });

  console.log('✅ RxJS-style example initialized');
}

// Advanced demonstration with combined patterns
function setupAdvancedDemo() {
  console.log('🚀 Setting up advanced demonstrations...');
  
  // Signals with computed values
  const [base, setBase] = createSignal(1);
  const [multiplier, setMultiplier] = createSignal(2);
  
  createEffect(() => {
    const result = base() * multiplier();
    console.log(`Signals computed: ${base()} × ${multiplier()} = ${result}`);
  });

  // Demonstrate proxy state with nested objects
  const appState = createProxyState({
    user: { name: 'Demo User', preferences: { theme: 'dark' } },
    counters: { signals: 0, proxy: 0, pubsub: 0, rxjs: 0 }
  });

  appState.__subscribe((newState, oldState, path) => {
    console.log(`Proxy state changed at path [${path.join('.')}]:`, newState);
  });

  // RxJS-style with operators
  const events$ = createSubject<string>();
  
  events$
    .filter(event => event.startsWith('button'))
    .map(event => event.toUpperCase())
    .subscribe(event => {
      console.log(`Filtered and transformed event: ${event}`);
    });

  // Emit some test events
  setTimeout(() => {
    events$.next('button_click');
    events$.next('mouse_move'); // This will be filtered out
    events$.next('button_hover');
  }, 1000);

  console.log('✅ Advanced demo initialized');
}

// Initialize all examples when DOM is loaded
function init() {
  console.log('🎯 Initializing Reactivity Examples...');
  
  setupSignalsExample();
  setupProxyStateExample();
  setupPubSubExample();
  setupRxJSExample();
  setupAdvancedDemo();
  
  console.log('🎉 All examples initialized successfully!!');
  console.log('📝 Open browser devtools to see advanced demonstrations');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
} 
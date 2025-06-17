import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createEventEmitter,
  createChannel,
  createPubSubHub,
  createReactiveState,
  combineStates
} from './pub-sub';

describe('Pub-Sub Module', () => {
  describe('createEventEmitter', () => {
    it('should create an event emitter', () => {
      const emitter = createEventEmitter();
      expect(emitter).toBeDefined();
      expect(typeof emitter.on).toBe('function');
      expect(typeof emitter.emit).toBe('function');
      expect(typeof emitter.off).toBe('function');
    });

    it('should emit and receive events', () => {
      const emitter = createEventEmitter<{ test: string }>();
      const handler = vi.fn();
      
      emitter.on('test', handler);
      emitter.emit('test', 'hello');
      
      expect(handler).toHaveBeenCalledWith('hello');
    });

    it('should allow multiple listeners for same event', () => {
      const emitter = createEventEmitter<{ test: string }>();
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      emitter.on('test', handler1);
      emitter.on('test', handler2);
      emitter.emit('test', 'hello');
      
      expect(handler1).toHaveBeenCalledWith('hello');
      expect(handler2).toHaveBeenCalledWith('hello');
    });

    it('should unsubscribe when calling returned function', () => {
      const emitter = createEventEmitter<{ test: string }>();
      const handler = vi.fn();
      
      const unsubscribe = emitter.on('test', handler);
      emitter.emit('test', 'hello');
      expect(handler).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      emitter.emit('test', 'world');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support off method to remove listeners', () => {
      const emitter = createEventEmitter<{ test: string }>();
      const handler = vi.fn();
      
      emitter.on('test', handler);
      emitter.emit('test', 'hello');
      expect(handler).toHaveBeenCalledTimes(1);
      
      emitter.off('test', handler);
      emitter.emit('test', 'world');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support once method for one-time listeners', () => {
      const emitter = createEventEmitter<{ test: string }>();
      const handler = vi.fn();
      
      emitter.once('test', handler);
      emitter.emit('test', 'hello');
      emitter.emit('test', 'world');
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('hello');
    });

    it('should count listeners correctly', () => {
      const emitter = createEventEmitter<{ test: string }>();
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      expect(emitter.listenerCount('test')).toBe(0);
      
      emitter.on('test', handler1);
      expect(emitter.listenerCount('test')).toBe(1);
      
      emitter.on('test', handler2);
      expect(emitter.listenerCount('test')).toBe(2);
      
      emitter.off('test', handler1);
      expect(emitter.listenerCount('test')).toBe(1);
    });

    it('should return array of listeners', () => {
      const emitter = createEventEmitter<{ test: string }>();
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      emitter.on('test', handler1);
      emitter.on('test', handler2);
      
      const listeners = emitter.listeners('test');
      expect(listeners).toHaveLength(2);
      expect(listeners).toContain(handler1);
      expect(listeners).toContain(handler2);
    });

    it('should remove all listeners when called without event', () => {
      const emitter = createEventEmitter<{ test1: string; test2: number }>();
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      emitter.on('test1', handler1);
      emitter.on('test2', handler2);
      
      emitter.removeAllListeners();
      
      expect(emitter.listenerCount('test1')).toBe(0);
      expect(emitter.listenerCount('test2')).toBe(0);
    });

    it('should remove all listeners for specific event', () => {
      const emitter = createEventEmitter<{ test1: string; test2: number }>();
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      emitter.on('test1', handler1);
      emitter.on('test2', handler2);
      
      emitter.removeAllListeners('test1');
      
      expect(emitter.listenerCount('test1')).toBe(0);
      expect(emitter.listenerCount('test2')).toBe(1);
    });

    it('should handle errors in event handlers', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const emitter = createEventEmitter<{ test: string }>();
      const handler1 = vi.fn(() => { throw new Error('Handler 1 error'); });
      const handler2 = vi.fn();
      
      emitter.on('test', handler1);
      emitter.on('test', handler2);
      
      emitter.emit('test', 'hello');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in event handler for "test":',
        expect.any(Error),
        '\nHandler:',
        expect.any(String)
      );
      expect(handler2).toHaveBeenCalled(); // Second handler still executes
      
      consoleSpy.mockRestore();
    });

    it('should handle cleanup in once handlers', () => {
      const emitter = createEventEmitter<{ test: string }>();
      const cleanup = vi.fn();
      
      emitter.once('test', () => {
        cleanup();
      });
      emitter.emit('test', 'hello');
      emitter.emit('test', 'world');
      
      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple event types', () => {
      interface Events {
        userJoined: { id: string; name: string };
        userLeft: string;
        messageReceived: { from: string; text: string };
      }
      
      const emitter = createEventEmitter<Events>();
      const handlers = {
        userJoined: vi.fn(),
        userLeft: vi.fn(),
        messageReceived: vi.fn()
      };
      
      emitter.on('userJoined', handlers.userJoined);
      emitter.on('userLeft', handlers.userLeft);
      emitter.on('messageReceived', handlers.messageReceived);
      
      emitter.emit('userJoined', { id: '1', name: 'John' });
      emitter.emit('userLeft', '1');
      emitter.emit('messageReceived', { from: '2', text: 'Hello' });
      
      expect(handlers.userJoined).toHaveBeenCalledWith({ id: '1', name: 'John' });
      expect(handlers.userLeft).toHaveBeenCalledWith('1');
      expect(handlers.messageReceived).toHaveBeenCalledWith({ from: '2', text: 'Hello' });
    });

    it('should warn when max listeners exceeded', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const emitter = createEventEmitter<{ test: string }>({ maxListeners: 2 });
      
      emitter.on('test', vi.fn());
      emitter.on('test', vi.fn());
      emitter.on('test', vi.fn()); // Should trigger warning
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Maximum listeners (2) exceeded')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('createChannel', () => {
    it('should create a channel', () => {
      const channel = createChannel<string>();
      expect(channel).toBeDefined();
      expect(typeof channel.publish).toBe('function');
      expect(typeof channel.subscribe).toBe('function');
    });

    it('should publish and receive data', () => {
      const channel = createChannel<string>();
      const handler = vi.fn();
      
      channel.subscribe(handler);
      channel.publish('hello');
      
      expect(handler).toHaveBeenCalledWith('hello');
    });

    it('should support multiple subscribers', () => {
      const channel = createChannel<string>();
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      channel.subscribe(handler1);
      channel.subscribe(handler2);
      channel.publish('hello');
      
      expect(handler1).toHaveBeenCalledWith('hello');
      expect(handler2).toHaveBeenCalledWith('hello');
    });

    it('should unsubscribe correctly', () => {
      const channel = createChannel<string>();
      const handler = vi.fn();
      
      const unsubscribe = channel.subscribe(handler);
      channel.publish('hello');
      expect(handler).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      channel.publish('world');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should track subscriber count', () => {
      const channel = createChannel<string>();
      
      expect(channel.getSubscriberCount()).toBe(0);
      
      const unsub1 = channel.subscribe(vi.fn());
      expect(channel.getSubscriberCount()).toBe(1);
      
      const unsub2 = channel.subscribe(vi.fn());
      expect(channel.getSubscriberCount()).toBe(2);
      
      unsub1();
      expect(channel.getSubscriberCount()).toBe(1);
      
      unsub2();
      expect(channel.getSubscriberCount()).toBe(0);
    });

    it('should clear all subscribers', () => {
      const channel = createChannel<string>();
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      channel.subscribe(handler1);
      channel.subscribe(handler2);
      
      expect(channel.getSubscriberCount()).toBe(2);
      channel.clear();
      expect(channel.getSubscriberCount()).toBe(0);
      
      channel.publish('hello');
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should handle errors in subscribers', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const channel = createChannel<string>();
      
      channel.subscribe(() => { throw new Error('Subscriber error'); });
      const handler2 = vi.fn();
      channel.subscribe(handler2);
      
      channel.publish('test');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in channel subscriber:',
        expect.any(Error)
      );
      expect(handler2).toHaveBeenCalled(); // Second subscriber still executes
      
      consoleSpy.mockRestore();
    });

    it('should support async subscribers', async () => {
      const channel = createChannel<string>();
      const asyncHandler = vi.fn(async (data) => {
        await new Promise(resolve => setTimeout(resolve, 0));
        return `processed-${data}`;
      });
      
      channel.subscribe(asyncHandler);
      channel.publish('test');
      
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(asyncHandler).toHaveBeenCalledWith('test');
    });

    it('should maintain subscription order', () => {
      const channel = createChannel<number>();
      const results: number[] = [];
      
      channel.subscribe(n => results.push(n * 1));
      channel.subscribe(n => results.push(n * 2));
      channel.subscribe(n => results.push(n * 3));
      
      channel.publish(2);
      
      expect(results).toEqual([2, 4, 6]); // Order preserved
    });
  });

  describe('createPubSubHub', () => {
    it('should create a hub', () => {
      const hub = createPubSubHub();
      expect(hub).toBeDefined();
      expect(typeof hub.channel).toBe('function');
      expect(typeof hub.removeChannel).toBe('function');
    });

    it('should create and manage channels', () => {
      const hub = createPubSubHub();
      
      const channel1 = hub.channel<string>('test1');
      const channel2 = hub.channel<number>('test2');
      
      expect(channel1).toBeDefined();
      expect(channel2).toBeDefined();
      // Channels with different names should be different instances
      expect(Object.is(channel1, channel2)).toBe(false);
    });

    it('should return same channel for same name', () => {
      const hub = createPubSubHub();
      
      const channel1 = hub.channel<string>('test');
      const channel2 = hub.channel<string>('test');
      
      expect(channel1).toBe(channel2);
    });

    it('should list channel names', () => {
      const hub = createPubSubHub();
      hub.channel<string>('channel1');
      hub.channel<number>('channel2');
      
      const names = hub.getChannelNames();
      expect(names).toHaveLength(2);
      expect(names).toContain('channel1');
      expect(names).toContain('channel2');
    });

    it('should remove channels', () => {
      const hub = createPubSubHub();
      const channel = hub.channel<string>('test');
      const handler = vi.fn();
      
      channel.subscribe(handler);
      expect(hub.getChannelNames()).toContain('test');
      
      hub.removeChannel('test');
      expect(hub.getChannelNames()).not.toContain('test');
      
      // Channel should be cleared
      channel.publish('hello');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should clear all channels', () => {
      const hub = createPubSubHub();
      const channel1 = hub.channel<string>('test1');
      const channel2 = hub.channel<string>('test2');
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      channel1.subscribe(handler1);
      channel2.subscribe(handler2);
      
      hub.clear();
      
      expect(hub.getChannelNames()).toHaveLength(0);
      
      // Channels should be cleared
      channel1.publish('hello');
      channel2.publish('world');
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should handle channel type safety', () => {
      interface Events {
        userEvent: { id: string; action: string };
        systemEvent: { code: number; message: string };
      }
      
      const hub = createPubSubHub();
      const userChannel = hub.channel<Events['userEvent']>('user');
      const systemChannel = hub.channel<Events['systemEvent']>('system');
      
      const userHandler = vi.fn();
      const systemHandler = vi.fn();
      
      userChannel.subscribe(userHandler);
      systemChannel.subscribe(systemHandler);
      
      userChannel.publish({ id: '1', action: 'login' });
      systemChannel.publish({ code: 200, message: 'OK' });
      
      expect(userHandler).toHaveBeenCalledWith({ id: '1', action: 'login' });
      expect(systemHandler).toHaveBeenCalledWith({ code: 200, message: 'OK' });
    });

    it('should handle channel cleanup', () => {
      const hub = createPubSubHub();
      const channel = hub.channel<string>('test');
      const handler = vi.fn();
      
      channel.subscribe(handler);
      hub.removeChannel('test');
      
      // Create new channel with same name
      const newChannel = hub.channel<string>('test');
      newChannel.publish('hello');
      
      expect(handler).not.toHaveBeenCalled(); // Old subscriber removed
    });
  });

  describe('createReactiveState', () => {
    it('should create reactive state with initial value', () => {
      const state = createReactiveState(10);
      expect(state.get()).toBe(10);
      expect(state.getState()).toBe(10);
    });

    it('should update state value', () => {
      const state = createReactiveState(10);
      
      state.set(20);
      expect(state.get()).toBe(20);
    });

    it('should support functional updates', () => {
      const state = createReactiveState(10);
      
      state.set(current => current + 5);
      expect(state.get()).toBe(15);
    });

    it('should notify subscribers on state change', () => {
      const state = createReactiveState(10);
      const handler = vi.fn();
      
      state.subscribe(handler);
      state.set(20);
      
      expect(handler).toHaveBeenCalledWith(20);
    });

    it('should not notify if value unchanged', () => {
      const state = createReactiveState(10);
      const handler = vi.fn();
      
      state.subscribe(handler);
      state.set(10); // Same value
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should support multiple subscribers', () => {
      const state = createReactiveState(10);
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      state.subscribe(handler1);
      state.subscribe(handler2);
      state.set(20);
      
      expect(handler1).toHaveBeenCalledWith(20);
      expect(handler2).toHaveBeenCalledWith(20);
    });

    it('should unsubscribe correctly', () => {
      const state = createReactiveState(10);
      const handler = vi.fn();
      
      const unsubscribe = state.subscribe(handler);
      state.set(20);
      expect(handler).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      state.set(30);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle circular dependencies', () => {
      const state1 = createReactiveState(1);
      const state2 = createReactiveState(2);
      
      const computed1 = combineStates({
        value: state1,
        other: state2
      });
      
      const computed2 = combineStates({
        value: state2,
        other: computed1
      });
      
      state1.set(3);
      
      expect(computed1.get()).toEqual({ value: 3, other: 2 });
      expect(computed2.get()).toEqual({
        value: 2,
        other: { value: 3, other: 2 }
      });
    });

    it('should handle async state updates', async () => {
      const state = createReactiveState<string | null>(null);
      const loadData = async () => {
        state.set('loading');
        await new Promise(resolve => setTimeout(resolve, 0));
        state.set('loaded');
      };
      
      const values: string[] = [];
      state.subscribe(value => value && values.push(value));
      
      await loadData();
      
      expect(values).toEqual(['loading', 'loaded']);
    });

    it('should support computed values', () => {
      const count = createReactiveState(0);
      const isEven = createReactiveState(false);
      
      // Set initial value based on count
      isEven.set(count.get() % 2 === 0);
      
      count.subscribe(() => {
        isEven.set(count.get() % 2 === 0);
      });
      
      expect(isEven.get()).toBe(true); // 0 is even
      
      count.set(1);
      expect(isEven.get()).toBe(false);
      
      count.set(2);
      expect(isEven.get()).toBe(true);
    });
  });

  describe('combineStates', () => {
    it('should combine multiple states', () => {
      const state1 = createReactiveState('hello');
      const state2 = createReactiveState(42);
      
      const combined = combineStates({ name: state1, age: state2 });
      
      expect(combined.get()).toEqual({ name: 'hello', age: 42 });
    });

    it('should notify when any state changes', () => {
      const state1 = createReactiveState('hello');
      const state2 = createReactiveState(42);
      const combined = combineStates({ name: state1, age: state2 });
      const handler = vi.fn();
      
      combined.subscribe(handler);
      
      state1.set('world');
      expect(handler).toHaveBeenCalledWith({ name: 'world', age: 42 });
      
      state2.set(24);
      expect(handler).toHaveBeenCalledWith({ name: 'world', age: 24 });
    });

    it('should clean up subscriptions when no more subscribers', () => {
      const state1 = createReactiveState('hello');
      const state2 = createReactiveState(42);
      const combined = combineStates({ name: state1, age: state2 });
      const handler = vi.fn();
      
      const unsubscribe = combined.subscribe(handler);
      unsubscribe();
      
      // After unsubscribing, changes should not trigger the handler
      state1.set('world');
      expect(handler).toHaveBeenCalledTimes(0);
    });

    it('should not clean up subscriptions when other subscribers remain', () => {
      const state1 = createReactiveState('hello');
      const state2 = createReactiveState(42);
      const combined = combineStates({ name: state1, age: state2 });
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      const unsubscribe1 = combined.subscribe(handler1);
      const unsubscribe2 = combined.subscribe(handler2);
      
      // Unsubscribe only one handler
      unsubscribe1();
      
      // The remaining handler should still receive updates
      state1.set('world');
      expect(handler1).toHaveBeenCalledTimes(0);
      expect(handler2).toHaveBeenCalledWith({ name: 'world', age: 42 });
      
      // Clean up
      unsubscribe2();
    });

    it('should handle empty state object', () => {
      const combined = combineStates({});
      expect(combined.get()).toEqual({});
    });

    it('should properly manage cleanup when all subscribers are removed', () => {
      const state1 = createReactiveState('hello');
      const state2 = createReactiveState(42);
      const combined = combineStates({ name: state1, age: state2 });
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();
      
      // Add multiple subscribers
      const unsubscribe1 = combined.subscribe(handler1);
      const unsubscribe2 = combined.subscribe(handler2); 
      const unsubscribe3 = combined.subscribe(handler3);
      
      // Trigger a change to verify all handlers work
      state1.set('world');
      expect(handler1).toHaveBeenCalledWith({ name: 'world', age: 42 });
      expect(handler2).toHaveBeenCalledWith({ name: 'world', age: 42 });
      expect(handler3).toHaveBeenCalledWith({ name: 'world', age: 42 });
      
      // Remove subscribers one by one (this should test the cleanup condition)
      unsubscribe1();
      unsubscribe2();
      
      // State changes should still notify remaining subscriber
      state2.set(100);
      expect(handler3).toHaveBeenCalledWith({ name: 'world', age: 100 });
      
      // Remove the last subscriber - this should trigger full cleanup
      unsubscribe3();
      
      // After all unsubscribed, changes should not trigger handlers
      handler1.mockClear();
      handler2.mockClear();
      handler3.mockClear();
      
      state1.set('test');
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled(); 
      expect(handler3).not.toHaveBeenCalled();
    });

    it('should handle nested state combinations', () => {
      interface UserState {
        name: string;
        age: number;
      }
      interface SettingsState {
        theme: string;
      }
      interface NotificationsState {
        enabled: boolean;
      }
      interface ComputedState {
        userName: string;
        isDarkMode: boolean;
      }
      
      const user = createReactiveState<UserState>({ name: 'John', age: 30 });
      const settings = createReactiveState<SettingsState>({ theme: 'dark' });
      const notifications = createReactiveState<NotificationsState>({ enabled: true });
      
      const appState = combineStates({
        user,
        settings,
        notifications
      });
      
      const computed = createReactiveState<ComputedState>({
        userName: 'John',
        isDarkMode: true
      });
      
      appState.subscribe(state => {
        computed.set({
          userName: state.user.name,
          isDarkMode: state.settings.theme === 'dark'
        });
      });
      
      const derivedState = combineStates({
        app: appState,
        computed
      });
      
      expect(derivedState.get()).toEqual({
        app: {
          user: { name: 'John', age: 30 },
          settings: { theme: 'dark' },
          notifications: { enabled: true }
        },
        computed: {
          userName: 'John',
          isDarkMode: true
        }
      });
      
      user.set({ name: 'Jane', age: 25 });
      settings.set({ theme: 'light' });
      
      expect(derivedState.get()).toEqual({
        app: {
          user: { name: 'Jane', age: 25 },
          settings: { theme: 'light' },
          notifications: { enabled: true }
        },
        computed: {
          userName: 'Jane',
          isDarkMode: false
        }
      });
    });

    it('should handle unsubscription', () => {
      const state1 = createReactiveState(1);
      const state2 = createReactiveState(2);
      const combined = combineStates({ state1, state2 });
      
      const listener = vi.fn();
      const unsubscribe = combined.subscribe(listener);
      
      state1.set(3);
      expect(listener).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      state1.set(4);
      state2.set(5);
      expect(listener).toHaveBeenCalledTimes(1); // No more updates
    });

    it('should handle state dependencies', () => {
      interface ComputedState {
        value: number;
        isPositive: boolean;
      }
      
      const count = createReactiveState(0);
      const multiplier = createReactiveState(2);
      const computed = createReactiveState<ComputedState>({
        value: 0,
        isPositive: false
      });
      
      const updateComputed = () => {
        const value = count.get() * multiplier.get();
        computed.set({ value, isPositive: value > 0 });
      };
      
      count.subscribe(updateComputed);
      multiplier.subscribe(updateComputed);
      
      const combined = combineStates({
        count,
        multiplier,
        computed
      });
      
      expect(combined.get()).toEqual({
        count: 0,
        multiplier: 2,
        computed: { value: 0, isPositive: false }
      });
      
      count.set(3);
      expect(combined.get().computed).toEqual({
        value: 6,
        isPositive: true
      });
      
      multiplier.set(3);
      expect(combined.get().computed).toEqual({
        value: 9,
        isPositive: true
      });
    });
  });
}); 
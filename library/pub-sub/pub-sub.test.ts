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

    it('should handle errors in event handlers gracefully', () => {
      const emitter = createEventEmitter<{ test: string }>();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorHandler = vi.fn(() => { throw new Error('Handler error'); });
      const goodHandler = vi.fn();
      
      emitter.on('test', errorHandler);
      emitter.on('test', goodHandler);
      
      emitter.emit('test', 'hello');
      
      expect(errorHandler).toHaveBeenCalled();
      expect(goodHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in event handler'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
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

    it('should handle errors in subscribers gracefully', () => {
      const channel = createChannel<string>();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorHandler = vi.fn(() => { throw new Error('Subscriber error'); });
      const goodHandler = vi.fn();
      
      channel.subscribe(errorHandler);
      channel.subscribe(goodHandler);
      
      channel.publish('hello');
      
      expect(errorHandler).toHaveBeenCalled();
      expect(goodHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in channel subscriber:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
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
      
      hub.channel('channel1');
      hub.channel('channel2');
      
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
  });
}); 
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProxyState } from './types';
import {
  createProxyState,
  updateProxyState,
  createComputedState,
  batch,
  subscribeToStates
} from './proxy-state';

describe('Proxy State Module', () => {
  describe('createProxyState', () => {
    it('should create a proxy state with initial value', () => {
      const state = createProxyState({ count: 0, name: 'test' });
      
      expect(state.count).toBe(0);
      expect(state.name).toBe('test');
    });

    it('should track changes to properties', () => {
      const state = createProxyState({ count: 0 });
      const listener = vi.fn();
      
      state.__subscribe(listener);
      state.count = 5;
      
      expect(state.count).toBe(5);
      expect(listener).toHaveBeenCalledWith(
        { count: 5 },
        { count: 0 },
        ['count']
      );
    });

    it('should handle nested object changes', () => {
      const state = createProxyState({
        user: { name: 'John', age: 25 },
        settings: { theme: 'dark' }
      });
      const listener = vi.fn();
      
      state.__subscribe(listener);
      state.user.name = 'Jane';
      
      expect(state.user.name).toBe('Jane');
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { name: 'Jane', age: 25 }
        }),
        expect.objectContaining({
          user: { name: 'John', age: 25 }
        }),
        ['user', 'name']
      );
    });

    it('should handle array changes', () => {
      const state = createProxyState({ items: [1, 2, 3] });
      const listener = vi.fn();
      
      state.__subscribe(listener);
      state.items.push(4);
      
      expect(state.items).toEqual([1, 2, 3, 4]);
      expect(listener).toHaveBeenCalled();
    });

    it('should support property deletion', () => {
      const state = createProxyState({ count: 0, name: 'test' } as { count: number; name?: string });
      const listener = vi.fn();
      
      state.__subscribe(listener);
      delete state.name;
      
      expect(state.name).toBeUndefined();
      expect(listener).toHaveBeenCalledWith(
        { count: 0 },
        { count: 0, name: 'test' },
        ['name']
      );
    });

    it('should not notify if value is equal', () => {
      const state = createProxyState({ count: 0 });
      const listener = vi.fn();
      
      state.__subscribe(listener);
      state.count = 0; // Same value
      
      expect(listener).not.toHaveBeenCalled();
    });

    it('should support custom equality function', () => {
      const customEquals = (a: any, b: any) => Math.abs(a - b) < 0.1;
      const state = createProxyState(
        { value: 1.0 },
        { equals: customEquals }
      );
      const listener = vi.fn();
      
      state.__subscribe(listener);
      state.value = 1.05; // Within tolerance
      
      expect(listener).not.toHaveBeenCalled();
      
      state.value = 1.2; // Outside tolerance
      expect(listener).toHaveBeenCalled();
    });

    it('should support shallow mode', () => {
      const state = createProxyState(
        { user: { name: 'John' } },
        { deep: false }
      );
      const listener = vi.fn();
      
      state.__subscribe(listener);
      
      // In shallow mode, nested changes might not be tracked the same way
      const newUser = { name: 'Jane' };
      state.user = newUser;
      
      expect(state.user.name).toBe('Jane');
      expect(listener).toHaveBeenCalled();
    });

    it('should unsubscribe correctly', () => {
      const state = createProxyState({ count: 0 });
      const listener = vi.fn();
      
      const unsubscribe = state.__subscribe(listener);
      state.count = 1;
      expect(listener).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      state.count = 2;
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should provide snapshot functionality', () => {
      const state = createProxyState({ count: 0, user: { name: 'John' } });
      
      const snapshot = state.__getSnapshot();
      
      expect(snapshot).toEqual({ count: 0, user: { name: 'John' } });
      expect(snapshot).not.toBe(state); // Should be a copy
      if (snapshot.user && state.user) {
        expect(snapshot.user).not.toBe(state.user); // Deep copy
      }
    });

    it('should provide path information', () => {
      const state = createProxyState({ user: { profile: { name: 'John' } } });
      
      expect(state.__getPath()).toEqual([]);
      expect((state.user as any).__getPath()).toEqual(['user']);
      expect((state.user.profile as any).__getPath()).toEqual(['user', 'profile']);
    });

    it('should handle complex nested operations', () => {
      const state = createProxyState({
        users: [
          { id: 1, name: 'John', settings: { theme: 'dark' } },
          { id: 2, name: 'Jane', settings: { theme: 'light' } }
        ]
      });
      const listener = vi.fn();
      
      state.__subscribe(listener);
      if (state.users[0]) {
        state.users[0].settings.theme = 'blue';
        expect(state.users[0].settings.theme).toBe('blue');
      }
      
      expect(listener).toHaveBeenCalled();
    });

    it('should support multiple subscribers', () => {
      const state = createProxyState({ count: 0 });
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      state.__subscribe(listener1);
      state.__subscribe(listener2);
      state.count = 1;
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should handle deep object mutations', () => {
      const state = createProxyState({
        user: {
          profile: {
            name: 'John',
            address: {
              city: 'New York'
            }
          }
        }
      });
      const listener = vi.fn();
      
      state.__subscribe(listener);
      state.user.profile.address.city = 'London';
      
      expect(state.user.profile.address.city).toBe('London');
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          user: {
            profile: {
              name: 'John',
              address: {
                city: 'London'
              }
            }
          }
        }),
        expect.any(Object),
        ['user', 'profile', 'address', 'city']
      );
    });

    it('should handle array methods', () => {
      const state = createProxyState({ items: [1, 2, 3] });
      const listener = vi.fn();
      
      state.__subscribe(listener);
      
      // Push
      state.items.push(4);
      expect(state.items).toEqual([1, 2, 3, 4]);
      expect(listener).toHaveBeenCalled();
      listener.mockClear();
      
      // Pop
      state.items.pop();
      expect(state.items).toEqual([1, 2, 3]);
      expect(listener).toHaveBeenCalled();
      listener.mockClear();
      
      // Splice
      state.items.splice(1, 1, 5);
      expect(state.items).toEqual([1, 5, 3]);
      expect(listener).toHaveBeenCalled();
      listener.mockClear();
      
      // Sort
      state.items.sort((a, b) => b - a);
      expect(state.items).toEqual([5, 3, 1]);
      expect(listener).toHaveBeenCalled();
    });

    it('should handle Date objects', () => {
      const state = createProxyState({
        createdAt: new Date('2024-01-01')
      });
      const listener = vi.fn();
      
      state.__subscribe(listener);
      const newDate = new Date('2024-02-01');
      state.createdAt = newDate;
      
      expect(state.createdAt).toEqual(newDate);
      expect(listener).toHaveBeenCalled();
    });

    it('should handle circular references gracefully', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;
      
      const state = createProxyState(circular);
      const listener = vi.fn();
      
      state.__subscribe(listener);
      state.name = 'updated';
      
      expect(state.name).toBe('updated');
      expect(state.self.name).toBe('updated');
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('updateProxyState', () => {
    it('should update proxy state with object', () => {
      const state = createProxyState({ count: 0, name: 'test' });
      
      updateProxyState(state, { count: 5 });
      
      expect(state.count).toBe(5);
      expect(state.name).toBe('test'); // Unchanged
    });

    it('should update proxy state with function', () => {
      const state = createProxyState({ count: 0, name: 'test' });
      
      updateProxyState(state, (current) => ({
        count: current.count + 1,
        name: current.name.toUpperCase()
      }));
      
      expect(state.count).toBe(1);
      expect(state.name).toBe('TEST');
    });

    it('should notify listeners on update', () => {
      const state = createProxyState({ count: 0 });
      const listener = vi.fn();
      
      state.__subscribe(listener);
      updateProxyState(state, { count: 5 });
      
      expect(listener).toHaveBeenCalledWith(
        { count: 5 },
        { count: 0 },
        ['count']
      );
    });

    it('should throw error for invalid proxy state', () => {
      const invalidState = {} as any;
      
      expect(() => {
        updateProxyState(invalidState, { count: 5 });
      }).toThrow('Invalid proxy state object');
    });

    it('should handle partial updates', () => {
      interface UserState {
        name: string;
        age: number;
      }
      interface AppState {
        user: UserState;
        settings: { theme: string };
      }
      
      const state = createProxyState<AppState>({
        user: { name: 'John', age: 30 },
        settings: { theme: 'dark' }
      });
      
      updateProxyState<AppState>(state, {
        user: { name: 'John', age: 31 }
      });
      
      expect(state.user.name).toBe('John');
      expect(state.user.age).toBe(31);
      expect(state.settings.theme).toBe('dark');
    });

    it('should handle deep updates', () => {
      interface ProfileState {
        name: string;
        address: { city: string };
      }
      interface UserState {
        profile: ProfileState;
      }
      
      const state = createProxyState<UserState>({
        profile: {
          name: 'John',
          address: { city: 'New York' }
        }
      });
      
      updateProxyState<UserState>(state, {
        profile: {
          name: 'John',
          address: { city: 'London' }
        }
      });
      
      expect(state.profile.name).toBe('John');
      expect(state.profile.address.city).toBe('London');
    });

    it('should handle array updates', () => {
      const state = createProxyState({
        items: [1, 2, 3]
      });
      
      updateProxyState(state, {
        items: [4, 5, 6]
      });
      
      expect(state.items).toEqual([4, 5, 6]);
    });

    it('should handle function updates with previous state', () => {
      const state = createProxyState({
        counter: 0,
        items: [1, 2, 3]
      });
      
      updateProxyState(state, prev => ({
        counter: prev.counter + 1,
        items: [...prev.items, 4]
      }));
      
      expect(state.counter).toBe(1);
      expect(state.items).toEqual([1, 2, 3, 4]);
    });
  });

  describe('createComputedState', () => {
    it('should create computed state with initial value', () => {
      const computed = createComputedState(() => 'hello world');
      
      expect(computed.value).toBe('hello world');
    });

    it('should update when dependencies change', () => {
      interface ItemsState {
        items: number[];
      }
      
      const state = createProxyState<ItemsState>({
        items: [1, 2, 3]
      });
      
      const computed = createComputedState(() => {
        // Directly access the state properties to trigger dependency tracking
        return {
          total: state.items.reduce((sum, n) => sum + n, 0),
          count: state.items.length
        };
      });
      
      expect(computed.value.total).toBe(6);
      expect(computed.value.count).toBe(3);
      
      state.items.push(4);
      
      expect(computed.value.total).toBe(10);
      expect(computed.value.count).toBe(4);
    });

    it('should notify subscribers when value changes', () => {
      const state = createProxyState({ count: 5 });
      const computed = createComputedState(() => state.count * 2);
      const listener = vi.fn();
      
      computed.subscribe(listener);
      state.count = 10;
      
      expect(listener).toHaveBeenCalledWith(20);
    });

    it('should support unsubscribing', () => {
      const state = createProxyState({ count: 5 });
      const computed = createComputedState(() => state.count * 2);
      const listener = vi.fn();
      
      const unsubscribe = computed.subscribe(listener);
      state.count = 10;
      expect(listener).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      state.count = 15;
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should support disposing', () => {
      const state = createProxyState({ count: 5 });
      const computed = createComputedState(() => state.count * 2);
      const listener = vi.fn();
      
      computed.subscribe(listener);
      computed.dispose();
      
      state.count = 10;
      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle multiple subscribers', () => {
      const state = createProxyState({ count: 5 });
      const computed = createComputedState(() => state.count * 2);
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      computed.subscribe(listener1);
      computed.subscribe(listener2);
      state.count = 10;
      
      expect(listener1).toHaveBeenCalledWith(20);
      expect(listener2).toHaveBeenCalledWith(20);
    });

    it('should handle errors in computed state listeners', () => {
      const state = createProxyState({ count: 5 });
      const computed = createComputedState(() => state.count * 2);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorListener = vi.fn(() => { throw new Error('Listener error'); });
      const goodListener = vi.fn();
      
      computed.subscribe(errorListener);
      computed.subscribe(goodListener);
      state.count = 10;
      
      expect(errorListener).toHaveBeenCalled();
      expect(goodListener).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in computed state listener:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should track dependencies correctly during computation', () => {
      const state1 = createProxyState({ a: 1 });
      const state2 = createProxyState({ b: 2 });
      
      const computed = createComputedState(() => {
        // Access both states to make them dependencies
        return state1.a + state2.b;
      });
      
      expect(computed.value).toBe(3);
      
      // Changes to either state should trigger recomputation
      state1.a = 5;
      expect(computed.value).toBe(7);
      
      state2.b = 10;
      expect(computed.value).toBe(15);
    });

    it('should compute derived state', () => {
      interface NameState {
        firstName: string;
        lastName: string;
      }
      
      const state = createProxyState<NameState>({
        firstName: 'John',
        lastName: 'Doe'
      });
      
      const computed = createComputedState(() => {
        const current = state.__getSnapshot();
        return {
          fullName: `${current.firstName} ${current.lastName}`
        };
      });
      
      expect(computed.value.fullName).toBe('John Doe');
    });

    it('should handle multiple dependencies', () => {
      interface CountState {
        count: number;
      }
      interface MultiplierState {
        multiplier: number;
      }
      
      const state1 = createProxyState<CountState>({ count: 1 });
      const state2 = createProxyState<MultiplierState>({ multiplier: 2 });
      
      const computed = createComputedState(() => {
        // Directly access the state properties to trigger dependency tracking
        return {
          result: state1.count * state2.multiplier
        };
      });
      
      expect(computed.value.result).toBe(2);
      
      state1.count = 3;
      expect(computed.value.result).toBe(6);
      
      state2.multiplier = 3;
      expect(computed.value.result).toBe(9);
    });
  });

  describe('Deep clone functionality', () => {
    it('should handle primitive values in deepClone', () => {
      const state = createProxyState({ value: null as any }, { deep: true });
      
      state.value = 'string';
      expect(state.value).toBe('string');
      
      state.value = 42;
      expect(state.value).toBe(42);
      
      state.value = true;
      expect(state.value).toBe(true);
    });

    it('should handle Date objects in deepClone', () => {
      const date = new Date('2023-01-01');
      const state = createProxyState({ timestamp: date }, { deep: true });
      
      expect(state.timestamp).toEqual(date);
      expect(state.timestamp).not.toBe(date); // Should be a copy
    });
  });

  describe('Nested proxy creation', () => {
    it('should handle non-object values in nested structures', () => {
      const state = createProxyState({
        mixed: {
          string: 'hello',
          number: 42,
          boolean: true,
          nullValue: null,
          undefinedValue: undefined
        }
      });
      
      expect(state.mixed.string).toBe('hello');
      expect(state.mixed.number).toBe(42);
      expect(state.mixed.boolean).toBe(true);
      expect(state.mixed.nullValue).toBe(null);
      expect(state.mixed.undefinedValue).toBe(undefined);
    });

    it('should update nested state references correctly', () => {
      const state = createProxyState({ nested: { value: 1 } });
      const listener = vi.fn();
      
      state.__subscribe(listener);
      
      // Update nested value
      state.nested.value = 2;
      
      expect(state.nested.value).toBe(2);
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle invalid proxy state in updateProxyState', () => {
      const invalidState = { count: 0 }; // Regular object, not a proxy state
      
      expect(() => {
        updateProxyState(invalidState as any, { count: 5 });
      }).toThrow('Invalid proxy state object');
    });

    it('should handle primitive values in deep clone', () => {
      // Test the deepClone behavior indirectly through proxy state creation
      const state = createProxyState({ 
        nullValue: null,
        numberValue: 42,
        stringValue: 'test',
        undefinedValue: undefined
      }, { deep: true });
      
      const snapshot = state.__getSnapshot();
      expect(snapshot.nullValue).toBe(null);
      expect(snapshot.numberValue).toBe(42);
      expect(snapshot.stringValue).toBe('test');
      expect(snapshot.undefinedValue).toBe(undefined);
    });

    it('should handle dependency tracking in computed state', () => {
      const state = createProxyState({ value: 10 });
      
      // Create a computed state that accesses the proxy
      const computed = createComputedState(() => {
        // This should trigger the currentComputation dependency tracking
        return state.value * 2;
      });
      
      expect(computed.value).toBe(20);
      
      // Change the state to trigger recomputation
      state.value = 15;
      expect(computed.value).toBe(30);
      
      computed.dispose();
    });

    it('should handle nested state updates correctly', () => {
      const state = createProxyState({ 
        nested: { 
          deep: { value: 1 }
        }
      });
      const listener = vi.fn();
      
      state.__subscribe(listener);
      
      // Update deeply nested value - tests currentPath.length === 0 check
      state.nested.deep.value = 2;
      
      expect(state.nested.deep.value).toBe(2);
      expect(listener).toHaveBeenCalled();
    });

    it('should handle property deletion in nested objects', () => {
      const state = createProxyState({ 
        nested: { 
          prop1: 'value1',
          prop2: 'value2'
        }
      } as { nested: { prop1?: string; prop2?: string } });
      const listener = vi.fn();
      
      state.__subscribe(listener);
      
      // Delete property in nested object
      delete state.nested.prop1;
      
      expect(state.nested.prop1).toBeUndefined();
      expect(state.nested.prop2).toBe('value2');
      expect(listener).toHaveBeenCalled();
    });

    it('should handle various data types in deep clone', () => {
      const now = new Date();
      const state = createProxyState({ 
        dateValue: now,
        arrayValue: [1, 2, { nested: true }],
        objectValue: { a: 1, b: { c: 2 } },
        primitives: {
          nullVal: null,
          undefinedVal: undefined,
          numberVal: 42,
          stringVal: 'test',
          boolVal: true
        }
      }, { deep: true });
      
      const snapshot = state.__getSnapshot();
      
      // Date should be cloned
      expect(snapshot.dateValue).toEqual(now);
      expect(snapshot.dateValue).not.toBe(now);
      
      // Array should be deeply cloned
      expect(snapshot.arrayValue).toEqual([1, 2, { nested: true }]);
      expect(snapshot.arrayValue).not.toBe(state.arrayValue);
      expect(snapshot.arrayValue[2]).not.toBe((state.arrayValue as any)[2]);
      
      // Primitives should be copied correctly
      expect(snapshot.primitives.nullVal).toBe(null);
      expect(snapshot.primitives.undefinedVal).toBe(undefined);
      expect(snapshot.primitives.numberVal).toBe(42);
      expect(snapshot.primitives.stringVal).toBe('test');
      expect(snapshot.primitives.boolVal).toBe(true);
    });

    it('should handle dependency tracking across multiple computed states', () => {
      const state1 = createProxyState({ value: 1 });
      const state2 = createProxyState({ value: 2 });
      
      // Create computed states that directly access proxy states  
      const computed1 = createComputedState(() => state1.value * 10);
      const computed2 = createComputedState(() => state2.value * 100);
      const computed3 = createComputedState(() => state1.value + state2.value);
      
      expect(computed1.value).toBe(10);
      expect(computed2.value).toBe(200);
      expect(computed3.value).toBe(3);
      
      // Changes should trigger appropriate recomputations
      state1.value = 5;
      expect(computed1.value).toBe(50);
      expect(computed3.value).toBe(7); // 5 + 2
      
      state2.value = 10;
      expect(computed2.value).toBe(1000);
      expect(computed3.value).toBe(15); // 5 + 10
      
      computed1.dispose();
      computed2.dispose();
      computed3.dispose();
    });

    it('should track property access during computation', () => {
      const state = createProxyState({ a: 1, b: 2, c: 3 });
      let accessedProperties: string[] = [];
      
      // Create computed state that accesses specific properties
      const computed = createComputedState(() => {
        accessedProperties = [];
        const result = state.a + state.b; // Only access 'a' and 'b'
        return result;
      });
      
      expect(computed.value).toBe(3);
      
      // Changing 'c' should not trigger recomputation since it wasn't accessed
      const listener = vi.fn();
      computed.subscribe(listener);
      
      state.c = 999; // This should NOT trigger recomputation
      expect(listener).not.toHaveBeenCalled();
      
      state.a = 10; // This SHOULD trigger recomputation
      expect(listener).toHaveBeenCalled();
      expect(computed.value).toBe(12);
      
      computed.dispose();
    });

    it('should handle nested proxy state mutations at different levels', () => {
      const state = createProxyState({
        level1: {
          level2: {
            level3: {
              value: 'deep'
            }
          }
        }
      });
      const listener = vi.fn();
      
      state.__subscribe(listener);
      
      // Modify at different nesting levels to test currentPath.length checks
      
      // Level 3 (deepest)
      state.level1.level2.level3.value = 'changed-deep';
      expect(listener).toHaveBeenCalledTimes(1);
      
      // Level 2
      state.level1.level2 = { level3: { value: 'changed-mid' } };
      expect(listener).toHaveBeenCalledTimes(2);
      
      // Level 1
      state.level1 = { level2: { level3: { value: 'changed-shallow' } } };
      expect(listener).toHaveBeenCalledTimes(3);
      
      expect(state.level1.level2.level3.value).toBe('changed-shallow');
    });
  });

  describe('batch', () => {
    it('should execute function and return result', () => {
      const result = batch(() => {
        return 'test result';
      });
      
      expect(result).toBe('test result');
    });

    it('should handle synchronous operations', () => {
      const state = createProxyState({ count: 0 });
      const listener = vi.fn();
      
      state.__subscribe(listener);
      
      const result = batch(() => {
        state.count = 1;
        state.count = 2;
        state.count = 3;
        return state.count;
      });
      
      expect(result).toBe(3);
      expect(state.count).toBe(3);
      // Note: In this simple implementation, batch doesn't actually defer notifications
      // But the function should still work correctly
    });

    it('should handle errors in batched operations', () => {
      expect(() => {
        batch(() => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');
    });

    it('should batch multiple updates', () => {
      const state = createProxyState({
        count: 0,
        name: 'test'
      });
      const listener = vi.fn();
      
      state.__subscribe(listener);
      
      batch(() => {
        state.count = 1;
        state.name = 'updated';
      });
      
      // Since batch doesn't defer notifications in this implementation,
      // each change triggers a separate notification
      expect(listener).toHaveBeenCalledTimes(2);
      expect(state.count).toBe(1);
      expect(state.name).toBe('updated');
    });

    it('should handle nested batches', () => {
      const state = createProxyState({ count: 0 });
      const listener = vi.fn();
      
      state.__subscribe(listener);
      
      batch(() => {
        state.count = 1;
        batch(() => {
          state.count = 2;
          state.count = 3;
        });
        state.count = 4;
      });
      
      // Each state change triggers a notification since batch doesn't defer
      expect(listener).toHaveBeenCalledTimes(4);
      expect(state.count).toBe(4);
    });

    it('should handle errors in batch', () => {
      const state = createProxyState({ count: 0 });
      const listener = vi.fn();
      
      state.__subscribe(listener);
      
      expect(() => {
        batch(() => {
          state.count = 1;
          throw new Error('Batch error');
          state.count = 2; // Should not execute
        });
      }).toThrow('Batch error');
      
      expect(state.count).toBe(1); // First update should persist
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscribeToStates', () => {
    it('should subscribe to multiple states', () => {
      const state1 = createProxyState({ count: 0 });
      const state2 = createProxyState({ name: 'test' });
      const listener = vi.fn();
      
      subscribeToStates([state1, state2], listener);
      
      state1.count = 1;
      expect(listener).toHaveBeenCalledWith(
        state1,
        { count: 1 },
        { count: 0 },
        ['count']
      );
      
      state2.name = 'updated';
      expect(listener).toHaveBeenCalledWith(
        state2,
        { name: 'updated' },
        { name: 'test' },
        ['name']
      );
    });

    it('should unsubscribe from all states', () => {
      const state1 = createProxyState({ count: 0 });
      const state2 = createProxyState({ name: 'test' });
      const listener = vi.fn();
      
      const unsubscribe = subscribeToStates([state1, state2], listener);
      
      state1.count = 1;
      expect(listener).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      
      state1.count = 2;
      state2.name = 'updated';
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should handle empty states array', () => {
      const listener = vi.fn();
      
      const unsubscribe = subscribeToStates([], listener);
      
      expect(typeof unsubscribe).toBe('function');
      unsubscribe(); // Should not throw
    });

    it('should track which state changed', () => {
      const state1 = createProxyState({ value: 'a' });
      const state2 = createProxyState({ value: 'b' });
      const listener = vi.fn();
      
      subscribeToStates([state1, state2], listener);
      
      state1.value = 'changed';
      expect(listener).toHaveBeenLastCalledWith(
        state1,
        expect.objectContaining({ value: 'changed' }),
        expect.objectContaining({ value: 'a' }),
        ['value']
      );
      
      state2.value = 'also changed';
      expect(listener).toHaveBeenLastCalledWith(
        state2,
        expect.objectContaining({ value: 'also changed' }),
        expect.objectContaining({ value: 'b' }),
        ['value']
      );
    });

    it('should notify when any state changes', () => {
      const state1 = createProxyState({ count: 0 });
      const state2 = createProxyState({ name: 'test' });
      const listener = vi.fn();
      
      subscribeToStates([state1, state2], listener);
      
      state1.count = 1;
      expect(listener).toHaveBeenCalledWith(
        state1,
        { count: 1 },
        { count: 0 },
        ['count']
      );
      
      state2.name = 'updated';
      expect(listener).toHaveBeenCalledWith(
        state2,
        { name: 'updated' },
        { name: 'test' },
        ['name']
      );
    });

    it('should handle unsubscribe', () => {
      const state = createProxyState({ count: 0 });
      const listener = vi.fn();
      
      const unsubscribe = subscribeToStates([state], listener);
      
      state.count = 1;
      expect(listener).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      state.count = 2;
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should handle batch updates to multiple states', () => {
      const state1 = createProxyState({ count: 0 });
      const state2 = createProxyState({ name: 'test' });
      const listener = vi.fn();
      
      subscribeToStates([state1, state2], listener);
      
      batch(() => {
        state1.count = 1;
        state2.name = 'updated';
      });
      
      // Each state change triggers a separate notification
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenNthCalledWith(1, state1, { count: 1 }, { count: 0 }, ['count']);
      expect(listener).toHaveBeenNthCalledWith(2, state2, { name: 'updated' }, { name: 'test' }, ['name']);
    });
  });
}); 
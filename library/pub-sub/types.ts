export type EventHandler<T = any> = (data: T) => void;
export type EventUnsubscriber = () => void;

export interface EventEmitter<TEvents extends Record<string, any> = Record<string, any>> {
  on<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): EventUnsubscriber;
  off<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): void;
  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void;
  once<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): EventUnsubscriber;
  removeAllListeners(event?: keyof TEvents): void;
  listenerCount(event: keyof TEvents): number;
  listeners<K extends keyof TEvents>(event: K): EventHandler<TEvents[K]>[];
}

export interface PubSubChannel<T = any> {
  publish(data: T): void;
  subscribe(handler: EventHandler<T>): EventUnsubscriber;
  unsubscribe(handler: EventHandler<T>): void;
  clear(): void;
  getSubscriberCount(): number;
}

export interface PubSubHub {
  channel<T>(name: string): PubSubChannel<T>;
  removeChannel(name: string): void;
  getChannelNames(): string[];
  clear(): void;
}

export interface PubSubOptions {
  maxListeners?: number;
  warnOnMaxListeners?: boolean;
} 
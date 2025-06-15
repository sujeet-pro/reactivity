export {
  createObservable,
  fromArray,
  fromPromise,
  interval,
  timer
} from './observable';

export { createSubject, createBehaviorSubject } from './subject';

export type {
  Observer,
  Subscription,
  OperatorFunction,
  Observable,
  Subject,
  BehaviorSubject,
  SchedulerLike,
  ObservableOptions
} from './types'; 
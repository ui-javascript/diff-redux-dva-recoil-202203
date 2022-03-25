import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';

/**
 * @see https://github.com/facebook/react/blob/bb88ce95a87934a655ef842af776c164391131ac/packages/shared/objectIs.js
 * inlined Object.is polyfill to avoid requiring consumers ship their own
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
 */
function is(x: any, y: any): boolean {
  return (x === y && (x !== 0 || 1 / x === 1 / y)) || (x !== x && y !== y);
}

const objectIs = typeof Object.is === 'function' ? Object.is : is;

/**
 * @see https://github.com/facebook/react/blob/933880b4544a83ce54c8a47f348effe725a58843/packages/shared/shallowEqual.js
 * Performs equality by iterating through keys on an object and returning false
 * when any key has values which are not strictly equal between the arguments.
 * Returns true when the values of all keys are strictly equal.
 */
function shallowEqual(objA: any, objB: any): boolean {
  if (is(objA, objB)) {
    return true;
  }

  if (
    typeof objA !== 'object' ||
    objA === null ||
    typeof objB !== 'object' ||
    objB === null
  ) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  // Test for A's keys different from B.
  for (let i = 0; i < keysA.length; i++) {
    if (
      !Object.prototype.hasOwnProperty.call(objB, keysA[i]) ||
      !is(objA[keysA[i]], objB[keysA[i]])
    ) {
      return false;
    }
  }

  return true;
}

const useForceUpdate = () => useReducer(() => ({}), {})[1] as VoidFunction;

type ISubscriber<T> = (prevState: T, nextState: T) => void;

export interface ISharedState<T> {
  /** 静态方式获取数据, 适合在非组件中或者数据无绑定视图的情况下使用 */
  get: () => T;
  /** 修改数据，赋予新值 */
  set: Dispatch<SetStateAction<T>>;
  /** （浅）合并更新数据 */
  update: Dispatch<Partial<T>>;
  /** hooks方式获取数据, 适合在组件中使用, 数据变更时会自动重渲染该组件 */
  use: () => T;
  /** 订阅数据的变更 */
  subscribe: (cb: ISubscriber<T>) => () => void;
  /** 取消订阅数据的变更 */
  unsubscribe: (cb: ISubscriber<T>) => void;
  /** 筛出部分 state */
  usePick<R>(picker: (state: T) => R, deps?: readonly any[]): R;
}

export type IReadonlyState<T> = Omit<ISharedState<T>, 'set' | 'update'>;

/**
 * 创建不同实例之间可以共享的状态
 * @param initialState 初始数据
 */
export const createSharedState = <T>(initialState: T): ISharedState<T> => {
  let state = initialState;
  const subscribers: ISubscriber<T>[] = [];

  // 订阅 state 的变化
  const subscribe = (subscriber: ISubscriber<T>) => {
    subscribers.push(subscriber);
    return () => unsubscribe(subscriber);
  };

  // 取消订阅 state 的变化
  const unsubscribe = (subscriber: ISubscriber<T>) => {
    const index = subscribers.indexOf(subscriber);
    index > -1 && subscribers.splice(index, 1);
  };

  // 获取当前最新的 state
  const get = () => state;

  // 变更 state
  const set = (next: SetStateAction<T>) => {
    const prevState = state;
    // @ts-ignore
    const nextState = typeof next === 'function' ? next(prevState) : next;
    if (objectIs(state, nextState)) {
      return;
    }
    state = nextState;
    subscribers.forEach((cb) => cb(prevState, state));
  };

  // 获取当前最新的 state 的 hooks 用法
  const use = () => {
    const forceUpdate = useForceUpdate();

    useEffect(() => {
      let isMounted = true;
      // 组件挂载后立即更新一次, 避免无法使用到第一次更新数据
      forceUpdate();
      const un = subscribe(() => {
        if (!isMounted) return;
        forceUpdate();
      });
      return () => {
        un();
        isMounted = false;
      };
    }, []);

    return state;
  };

  const usePick = <R>(picker: (s: T) => R, deps = []) => {
    const ref = useRef<any>({});

    ref.current.picker = picker;

    const [pickedState, setPickedState] = useState<R>(() =>
      ref.current.picker(state),
    );

    ref.current.oldState = pickedState;

    const sub = useCallback(() => {
      const pickedOld = ref.current.oldState;
      const pickedNew = ref.current.picker(state);
      if (!shallowEqual(pickedOld, pickedNew)) {
        // 避免 pickedNew 是一个 function
        setPickedState(() => pickedNew);
      }
    }, []);

    useEffect(() => {
      const un = subscribe(sub);
      return un;
    }, []);

    useEffect(() => {
      sub();
    }, [...deps]);

    return pickedState;
  };

  return {
    get,
    set,
    update: (input: Partial<T>) => {
      set((pre) => ({
        ...pre,
        ...input,
      }));
    },
    use,
    subscribe,
    unsubscribe,
    usePick,
  };
};
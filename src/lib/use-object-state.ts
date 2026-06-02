import { useReducer } from 'react';

type ObjectStatePatch<T> = Partial<T> | ((state: T) => Partial<T>);

export function useObjectState<T extends Record<string, unknown>>(initialState: T) {
  return useReducer((state: T, patch: ObjectStatePatch<T>) => {
    const nextPatch = typeof patch === 'function' ? patch(state) : patch;
    return { ...state, ...nextPatch };
  }, initialState);
}

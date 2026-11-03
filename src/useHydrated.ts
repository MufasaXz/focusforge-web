import { useSyncExternalStore } from 'react';

// Being in the browser never changes after load, so there is nothing to
// subscribe to and nothing to clean up.
const noSubscription = () => () => undefined;

/** False in the prerendered page and while hydrating, true once React runs in the browser. */
export function useHydrated() {
  return useSyncExternalStore(noSubscription, () => true, () => false);
}

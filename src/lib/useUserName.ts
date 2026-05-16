"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "babytracker_username";

// Same-document `storage` events don't fire for the tab that made the change,
// so we keep our own listener set and notify it on writes.
const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): string | null {
  return localStorage.getItem(KEY);
}

function getServerSnapshot(): string | null {
  return null;
}

/**
 * Reads the stored username from localStorage as an external store.
 * Avoids the read-then-setState-in-effect pattern (and its extra render /
 * hydration mismatch) by using useSyncExternalStore.
 */
export function useUserName(): readonly [string | null, (name: string) => void] {
  const userName = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const setUserName = useCallback((name: string) => {
    localStorage.setItem(KEY, name);
    for (const listener of listeners) listener();
  }, []);

  return [userName, setUserName] as const;
}

"use client";

import { useSyncExternalStore } from "react";

// A shared ticking clock exposed as an external store, so components can read
// "now" during render without calling the impure Date.now() in render/init.
let current = Date.now();
const listeners = new Set<() => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  if (intervalId === null) {
    intervalId = setInterval(() => {
      current = Date.now();
      for (const listener of listeners) listener();
    }, 30000);
  }
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

function getSnapshot(): number {
  return current;
}

function getServerSnapshot(): number {
  return 0;
}

/** Current time in ms, refreshed every 30s. 0 until mounted on the client. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

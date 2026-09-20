"use client";

import { useSyncExternalStore } from "react";
import type { LocalStore } from "@/lib/local-store";

/** Subscribe to a browser-local store. The server (and first hydration pass) sees `initial`, so markup always matches. */
export function useLocal<T>(store: LocalStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, () => store.initial);
}

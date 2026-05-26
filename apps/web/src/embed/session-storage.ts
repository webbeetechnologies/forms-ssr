import type { SessionStorage } from "@taylordb/forms-ui";

export function localStorageSessionStorage(key: string): SessionStorage {
  return {
    read() {
      try {
        const value = window.localStorage.getItem(key);
        if (value === null) return null;

        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      } catch {
        return null;
      }
    },
    write(id) {
      try {
        window.localStorage.setItem(key, String(id));
      } catch {
        // If storage is unavailable, the in-memory client session still works
        // until the page unloads.
      }
    },
    clear() {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignore blocked storage.
      }
    },
  };
}


import "server-only";

export class QueueFullError extends Error {
  constructor() {
    super("queue full");
  }
}

/**
 * One outbound call at a time, at least `minGapMs` apart, for public services that ask for a
 * request rate (Nominatim, the OSRM demo router). At most `maxPending` calls wait; past that the
 * call fails at once with QueueFullError instead of keeping a request open for half a minute.
 */
export function serialQueue(minGapMs: number, maxPending: number) {
  let tail: Promise<unknown> = Promise.resolve();
  let lastAt = 0;
  let pending = 0;
  return function run<T>(task: () => Promise<T>): Promise<T> {
    if (pending >= maxPending) return Promise.reject(new QueueFullError());
    pending++;
    const result = tail.then(async () => {
      const wait = lastAt + minGapMs - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastAt = Date.now();
      return task();
    });
    const settled = result.finally(() => {
      pending--;
    });
    // A failed call doesn't break the chain for the next one.
    tail = settled.catch(() => undefined);
    return result;
  };
}

/**
 * A small TTL cache that also shares in-flight loads, so two identical lookups at once make one
 * call. Failed loads aren't kept.
 */
export function sharedCache<T>(ttlMs: number, max: number) {
  const entries = new Map<string, { at: number; value: Promise<T> }>();
  return function get(key: string, load: () => Promise<T>): Promise<T> {
    const hit = entries.get(key);
    if (hit && Date.now() - hit.at < ttlMs) return hit.value;
    const value = load();
    if (entries.size >= max) entries.delete(entries.keys().next().value!);
    entries.set(key, { at: Date.now(), value });
    value.catch(() => {
      if (entries.get(key)?.value === value) entries.delete(key);
    });
    return value;
  };
}

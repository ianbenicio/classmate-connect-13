// =====================================================================
// store-base — Factory para stores singleton com pub/sub + init lazy
// =====================================================================
// Extrai o boilerplate comum a todos os *-store.ts:
//   initialized / initPromise / listeners / emit / ensureInit / subscribe
//
// USO:
//   const base = createStoreBase<MyItem[]>(
//     async (set) => { const data = await loadFromDb(); set(data); },
//     [],
//   );
//
//   export const myStore = {
//     getAll: () => base.get(),
//     subscribe: base.subscribe.bind(base),
//     ensureInit: base.ensureInit.bind(base),
//     async add(item: MyItem) {
//       const snap = base.get();           // capture for rollback
//       base.set([item, ...snap]);
//       base.emit();
//       const { error } = await supabase.from(...).insert(...);
//       if (error) { base.set(snap); base.emit(); toast.error(...); }
//     },
//   };
// =====================================================================

export interface StoreBase<T> {
  /** Read current snapshot. */
  get(): T;
  /** Replace snapshot (does NOT emit — call emit() after if needed). */
  set(value: T): void;
  /** Notify all listeners. */
  emit(): void;
  /** Subscribe to changes. Returns unsubscribe fn. */
  subscribe(fn: () => void): () => void;
  /**
   * Lazy init: calls loader exactly once; concurrent calls coalesce on
   * the same Promise. Resolves immediately if already initialized.
   */
  ensureInit(): Promise<void>;
}

/**
 * Creates a reactive singleton base for an in-memory store.
 *
 * @param loader   Async fn that fetches initial data and calls `set(value)`.
 *                 Runs at most once; the Promise is cached.
 * @param initial  Starting snapshot value before first load.
 */
export function createStoreBase<T>(
  loader: (set: (value: T) => void) => Promise<void>,
  initial: T,
): StoreBase<T> {
  let snapshot: T = initial;
  let initialized = false;
  let initPromise: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  function emit() {
    for (const l of listeners) l();
  }

  return {
    get() {
      return snapshot;
    },
    set(value: T) {
      snapshot = value;
    },
    emit,
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    ensureInit() {
      if (initialized) return Promise.resolve();
      if (!initPromise) {
        initPromise = loader((value) => {
          snapshot = value;
        }).then(() => {
          initialized = true;
          emit();
        });
      }
      return initPromise;
    },
  };
}

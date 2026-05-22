function createCache(defaultTtlMs) {
  const entries = new Map();

  function get(key) {
    const entry = entries.get(key);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      entries.delete(key);
      return null;
    }
    return entry.value;
  }

  function set(key, value, ttlMs = defaultTtlMs) {
    entries.set(key, {
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
    });
    return value;
  }

  function del(key) {
    entries.delete(key);
  }

  function clear() {
    entries.clear();
  }

  function status() {
    const now = Date.now();
    return {
      size: entries.size,
      keys: [...entries.entries()].map(([key, entry]) => ({
        key,
        fresh: now < entry.expiresAt,
        createdAt: new Date(entry.createdAt).toISOString(),
        expiresAt: new Date(entry.expiresAt).toISOString(),
      })),
    };
  }

  return {
    clear,
    del,
    get,
    set,
    status,
  };
}

module.exports = {
  createCache,
};

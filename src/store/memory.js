/** @returns {import('../types.js').Store} */
export const memoryStore = (/** @type {Record<string,string>} */ seed = {}) => {
  const m = new Map(Object.entries(seed))
  return {
    list: async (p) => [...m.keys()].filter((k) => k.startsWith(p)).sort(),
    get: async (k) => m.get(k) ?? null,
    put: async (k, v) => void m.set(k, v),
    del: async (k) => void m.delete(k),
  }
}

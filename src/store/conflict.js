/** Syncthing conflict copy. No imports: Workers can load this where store/contract (node:test) fails. */
export const isConflict = (/** @type {string} */ k) => k.includes('.sync-conflict-')

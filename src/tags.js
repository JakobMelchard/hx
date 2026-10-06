/**
 * `a b -c k:v` → every positive term present, no negative term present. Empty query matches all.
 * @param {string[]} tags @param {string} q
 */
export const match = (tags, q) =>
  q
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => (t[0] === '-' ? !tags.includes(t.slice(1)) : tags.includes(t)))

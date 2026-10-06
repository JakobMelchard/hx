export class Raw {
  constructor(/** @type {string} */ s) {
    this.s = s
  }
  toString() {
    return this.s
  }
}
export const raw = (/** @type {unknown} */ s) => new Raw(String(s))
/**
 * Safe in text and in quoted attribute values only. An unquoted attribute value ends at a space,
 * which passes through, so always quote attributes that take interpolations.
 */
export const esc = (/** @type {unknown} */ s) =>
  String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
/** @param {unknown} v @returns {string} */
const str = (v) =>
  v instanceof Raw
    ? v.s
    : Array.isArray(v)
      ? v.map(str).join('')
      : v == null || v === false
        ? ''
        : esc(v)
/** Escapes interpolations; nest `html` or `raw()` to opt out. @param {TemplateStringsArray} s @param {unknown[]} v */
export const html = (s, ...v) => new Raw(s.reduce((a, x, i) => a + str(v[i - 1]) + x))

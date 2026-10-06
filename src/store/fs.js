import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'

/**
 * Keys are paths under `root`. A key that resolves outside it reads as absent (`get` null,
 * `list` empty) and makes `put` and `del` reject. The check is on the path: a symlink placed
 * under `root` is followed, as it is whoever owns the directory that put it there.
 * @param {string} root @returns {import('../types.js').Store}
 */
export const fsStore = (root) => {
  const base = resolve(root)
  /** @param {string} k */
  const at = (k) => {
    const f = join(base, k)
    if (!f.startsWith(base + sep)) throw new Error(`key outside store root: ${k}`)
    return f
  }
  // Only a path that does not exist is absent; any other error (EACCES, EMFILE) rejects.
  /** @param {NodeJS.ErrnoException} e */
  const missing = (e) => e.code === 'ENOENT' || e.code === 'ENOTDIR'
  return {
    async list(p) {
      // prefix may be partial filename; list its directory, filter by string prefix like R2/KV
      const dir = join(base, p.endsWith('/') ? p : dirname(p))
      if (dir !== base && !dir.startsWith(base + sep)) return []
      const names = await readdir(dir, { recursive: true, withFileTypes: true }).catch((e) => {
        if (missing(e)) return []
        throw e
      })
      return names
        .filter((d) => d.isFile() && !d.name.endsWith('.tmp'))
        .map((d) => relative(base, join(d.parentPath, d.name)).split(sep).join('/'))
        .filter((k) => k.startsWith(p))
        .sort()
    },
    get: async (k) => {
      const f = join(base, k)
      if (!f.startsWith(base + sep)) return null
      return readFile(f, 'utf8').catch((e) => {
        if (missing(e)) return null
        throw e
      })
    },
    async put(k, v) {
      const f = at(k)
      await mkdir(dirname(f), { recursive: true })
      // tmp+rename: Syncthing must never pick up a half-written file
      await writeFile(f + '.tmp', v)
      await rename(f + '.tmp', f)
    },
    del: async (k) => rm(at(k), { force: true }),
  }
}

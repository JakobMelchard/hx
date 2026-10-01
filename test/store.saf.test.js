import { runStoreContract } from '../src/store/contract.js'
import { safStore } from '../src/store/saf.js'

/** In-memory double of the SafPluginBridge safStore uses. */
const fakePlugin = () => {
  /** @type {Map<string,string>} */ const m = new Map()
  return {
    async pickFolder() { return { uri: 'tree://fake' } },
    /** @param {{path:string}} o */
    async readFile(o) { return { data: m.has(o.path) ? m.get(o.path) ?? null : null } },
    /** @param {{path:string,content:string}} o */
    async writeFile(o) { m.set(o.path, o.content) },
    /** @param {{prefix:string}} o */
    async listFiles(o) { return { files: [...m.keys()].filter(k => k.startsWith(o.prefix)) } },
    /** @param {{path:string}} o */
    async deleteFile(o) { m.delete(o.path) },
  }
}

runStoreContract('saf', async () => safStore(fakePlugin(), 'tree://fake'))

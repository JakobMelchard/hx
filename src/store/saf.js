/**
 * SAF (Storage Access Framework) store adapter for Android.
 *
 * SAF plugin decision — custom Kotlin plugin vs Capawesome File Manager:
 *   Capawesome requires an extra npm package + gradle dep + their own plugin API,
 *   adding ~5 MB and an indirect trust dependency.  A single 60-line Kotlin class
 *   using DocumentFile + takePersistableUriPermission covers all four operations
 *   (read, write, list, delete) with no Play-restricted permissions and no extra
 *   deps.  Decision: custom plugin.  See NOTES.md for the full analysis.
 *
 * The plugin object is injected (not imported) so this file is browser-bundleable
 * without @capacitor/core appearing as a core dependency.
 *
 * @typedef {{
 *   pickFolder(): Promise<{uri:string}>,
 *   readFile(o:{uri:string,path:string}): Promise<{data:string|null}>,
 *   writeFile(o:{uri:string,path:string,content:string}): Promise<void>,
 *   listFiles(o:{uri:string,prefix:string}): Promise<{files:string[]}>,
 *   deleteFile(o:{uri:string,path:string}): Promise<void>,
 * }} SafPluginBridge
 */

/**
 * @param {SafPluginBridge} plugin
 * @param {string} treeUri
 * @returns {import('../types.js').Store}
 */
export const safStore = (plugin, treeUri) => ({
  get: async path => (await plugin.readFile({ uri: treeUri, path })).data,
  put: (path, content) => plugin.writeFile({ uri: treeUri, path, content }),
  list: async prefix => (await plugin.listFiles({ uri: treeUri, prefix })).files.sort(),
  del: path => plugin.deleteFile({ uri: treeUri, path }),
})

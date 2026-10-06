import globals from 'globals'
import base from '@jakobmelchard/config/eslint'

// src/transport.js runs in the page; everything else on Node or in the Workers runtime.
export default [
  ...base,
  { languageOptions: { globals: { ...globals.node, ...globals.browser, htmx: 'readonly' } } },
]

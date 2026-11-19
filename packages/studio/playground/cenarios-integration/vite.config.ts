import { resolve } from 'node:path'
import { mergeConfig } from 'vite'
import base from '../vite.config'

export default mergeConfig(base, {
  root: import.meta.dirname,
  publicDir: resolve(import.meta.dirname, '../public'),
  server: { host: '127.0.0.1', port: 5413, strictPort: true },
})

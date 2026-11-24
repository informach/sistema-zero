import { resolve } from 'node:path'
import { mergeConfig, type ViteDevServer } from 'vite'
import base from '../vite.config'

export default mergeConfig(base, {
  root: import.meta.dirname,
  publicDir: resolve(import.meta.dirname, '../public'),
  resolve: {
    alias: [
      {
        find: '@sistemazero/studio/player',
        replacement: resolve(
          import.meta.dirname,
          '../../src/components/preview/StudioProjectPlayer.tsx',
        ),
      },
      {
        find: '@sistemazero/studio/controls',
        replacement: resolve(import.meta.dirname, '../../src/controls/projectControls.ts'),
      },
      {
        find: '@sistemazero/studio/python-project-validation',
        replacement: resolve(import.meta.dirname, '../../src/state/pythonProjectValidation.ts'),
      },
    ],
  },
  plugins: [
    {
      name: 'local-public-player-proof',
      configureServer(server: ViteDevServer) {
        server.middlewares.use((req, _res, next) => {
          if (/^\/jogar\/[0-9a-f-]{36}(?:\?.*)?$/.test(req.url ?? '')) req.url = '/jogar.html'
          next()
        })
      },
    },
  ],
  server: { host: '127.0.0.1', port: 5413, strictPort: true },
})

import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

test('server project checks bundle without browser editor dependencies', async () => {
  const result = await Bun.build({
    entrypoints: [resolve(import.meta.dir, '../projectCheckAuthoring.ts')],
    target: 'bun',
    plugins: [
      {
        name: 'server-boundary',
        setup(build) {
          build.onResolve({ filter: /^(blockly|react|react-dom|monaco-editor)(\/|$)/ }, (args) => {
            throw new Error(`Browser dependency reached the server catalog: ${args.path}`)
          })
        },
      },
    ],
  })
  expect(result.logs.filter((log) => log.level === 'error')).toEqual([])
  expect(result.success).toBe(true)
})

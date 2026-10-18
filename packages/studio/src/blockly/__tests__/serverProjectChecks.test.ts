import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

test.each([
  ['server project checks', '../projectCheckAuthoring.ts'],
  ['server check (o teste que roda o jogo)', '../../check/serverCheck.ts'],
])('%s bundle without browser editor dependencies', async (_name, entry) => {
  const result = await Bun.build({
    entrypoints: [resolve(import.meta.dir, entry)],
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

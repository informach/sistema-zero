import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { buildProjectRunContextRuntime } from './projectRunContext'

test('the portable execution runtime keeps its identity in a minified browser build', async () => {
  const bundle = await Bun.build({
    entrypoints: [fileURLToPath(new URL('./projectRunContext.ts', import.meta.url))],
    target: 'browser',
    format: 'esm',
    minify: true,
  })
  expect(bundle.success).toBe(true)
  const output = bundle.outputs[0]
  if (!output) throw new Error('The browser build did not emit its module.')
  const source = await output.text()
  const module: unknown = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  )
  if (
    !module ||
    typeof module !== 'object' ||
    !('buildProjectRunContextRuntime' in module) ||
    typeof module.buildProjectRunContextRuntime !== 'function'
  )
    throw new Error('The browser build did not export its portable runtime.')
  const portable: unknown = module.buildProjectRunContextRuntime()
  if (typeof portable !== 'string') throw new Error('The portable runtime is not source text.')
  const digest = (text: string) => createHash('sha256').update(text).digest('hex')
  expect(digest(portable)).toBe(digest(buildProjectRunContextRuntime()))
})

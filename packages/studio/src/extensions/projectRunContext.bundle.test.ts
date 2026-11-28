import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { mkdtemp, rm, rmdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { buildProjectRunContextRuntime } from './projectRunContext'

test('the portable execution runtime loads in native Node ESM used by browser tests', async () => {
  const source = new URL('./projectRunContext.ts', import.meta.url).href
  const child = Bun.spawn(
    [
      'node',
      '--input-type=module',
      '--eval',
      `import { buildProjectRunContextRuntime } from ${JSON.stringify(source)}; process.stdout.write(buildProjectRunContextRuntime());`,
    ],
    { stdout: 'pipe', stderr: 'pipe', windowsHide: true },
  )
  const [code, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  expect({ code, stderr }).toEqual({ code: 0, stderr: '' })
  expect(stdout).toBe(buildProjectRunContextRuntime())
})

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
  const directory = await mkdtemp(join(tmpdir(), 'sz-project-run-context-'))
  const file = join(directory, 'runtime.mjs')
  try {
    await writeFile(file, source)
    const module: unknown = await import(pathToFileURL(file).href)
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
  } finally {
    await rm(file, { force: true })
    await rmdir(directory)
  }
})

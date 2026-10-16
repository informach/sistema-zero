import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { browserWorkerUrl } from '@sistemazero/agent-integrations/browser'
import type { Processes } from '../process/manager'
import { hash, readBounded } from '../tools/paths'

let bundle: Promise<string> | undefined
async function buildDevelopmentWorker() {
  const result = await Bun.build({
    entrypoints: [fileURLToPath(browserWorkerUrl())],
    target: 'node',
    format: 'esm',
    external: ['playwright-core'],
  })
  if (!result.success || result.outputs.length !== 1)
    throw new AggregateError(result.logs, 'Browser worker build failed')
  const output = result.outputs[0]
  if (!output) throw new Error('Browser worker output missing')
  return output.text()
}
export async function startBrowserWorker(
  processes: Processes,
  directory: string,
  signal: AbortSignal,
) {
  const node = Bun.which('node')
  if (!node)
    throw new Error(
      'Browser automation requires Node.js 22 or newer and the pinned Playwright Chromium installation',
    )
  const version = await processes.run(
    { executable: node, args: ['--version'], cwd: directory, timeoutMs: 10000 },
    signal,
  )
  const major = /^v(\d+)\./.exec(version.output.trim())?.[1]
  if (version.code !== 0 || !major || Number(major) < 22)
    throw new Error('Browser worker requires Node.js 22 or newer')
  let entry = fileURLToPath(browserWorkerUrl())
  if (entry.endsWith('.ts')) {
    // Development sources are bundled once; releases ship this separate Node entrypoint.
    if (!bundle)
      bundle = buildDevelopmentWorker().catch((error) => {
        bundle = undefined
        throw error
      })
    const code = await bundle
    const cache = resolve(dirname(entry), '../../.cache/browser-runtime')
    await mkdir(cache, { recursive: true, mode: 0o700 })
    entry = join(cache, `browser-worker-${hash(code)}.mjs`)
    try {
      await writeFile(entry, code, { flag: 'wx', mode: 0o600 })
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'EEXIST') throw error
      if (hash(await readBounded(entry, 16_000_000)) !== hash(code))
        throw new Error('Browser worker cache integrity failure')
    }
  }
  signal.throwIfAborted()
  return processes.open({
    executable: node,
    args: [entry, directory],
    cwd: directory,
    ...(process.platform === 'win32' ? { memoryMb: 2048, pids: 32 } : {}),
  })
}

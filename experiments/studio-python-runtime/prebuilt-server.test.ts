import { expect, test } from 'bun:test'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rmdir, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { setTimeout as delay } from 'node:timers/promises'
import { canonicalJson } from '../../packages/core/src/creations/content-fingerprint'
import { pythonDistributionFixture } from '../../packages/studio-runtime/tests/python-distribution-fixture'

const root = resolve(import.meta.dirname, '../..')
const binary = process.env.STUDIO_PYTHON_PROBE_TEST_BUN ?? process.execPath
type Started = { url: string } | { code: number | null; signal: string | null } | { error: string }

async function withFixture<Value>(
  inspect: (fixture: {
    directory: string
    contents: Map<string, Uint8Array<ArrayBuffer>>
    hash: string
  }) => Promise<Value>,
): Promise<Value> {
  // These bytes exercise packaging/HTTP integrity, without claiming to execute Python.
  const { contents, deployment } = await pythonDistributionFixture()
  const directory = await mkdtemp(resolve(tmpdir(), 'sz-python-prebuilt-'))
  const files = [...contents.keys(), 'distribution.json', 'false-recipe.json']
  const hash = createHash('sha256').update(canonicalJson(deployment.distribution)).digest('hex')
  const outcome: { value: Value } | { error: unknown } = await (async () => {
    for (const [path, bytes] of contents) await writeFile(resolve(directory, path), bytes)
    await writeFile(
      resolve(directory, 'distribution.json'),
      JSON.stringify(deployment.distribution),
    )
    await writeFile(resolve(directory, 'false-recipe.json'), 'false\n')
    return inspect({ directory, contents, hash })
  })().then(
    (value) => ({ value }),
    (error: unknown) => ({ error }),
  )
  // Attempt every known flat file even after partial setup; never recursively delete a directory.
  const cleanupErrors: unknown[] = []
  const results = await Promise.allSettled(files.map((path) => unlink(resolve(directory, path))))
  for (const result of results) {
    if (result.status !== 'rejected') continue
    const error: unknown = result.reason
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') continue
    cleanupErrors.push(error)
  }
  try {
    await rmdir(directory)
  } catch (error) {
    cleanupErrors.push(error)
  }
  if (cleanupErrors.length)
    throw new AggregateError(
      [...('error' in outcome ? [outcome.error] : []), ...cleanupErrors],
      'Fixture cleanup failed; the original failure is retained.',
    )
  if ('error' in outcome) throw outcome.error
  return outcome.value
}

async function withServer<Value>(
  directory: string,
  hash: string,
  overrides: Record<string, string | undefined>,
  inspect: (started: Started, stderr: () => string) => Promise<Value>,
): Promise<Value> {
  const env = { ...process.env }
  for (const key of ['PYTHON_PROBE_EDITOR', 'PYTHON_PROBE_STDLIB_RECIPE', 'PYTHON_PROBE_NETWORK'])
    delete env[key]
  Object.assign(env, {
    PYTHON_PROBE_PORT: '0',
    PYTHON_PROBE_DISTRIBUTION_DIRECTORY: directory,
    PYTHON_PROBE_DISTRIBUTION_SHA256: hash,
    ...overrides,
  })
  const child = spawn(binary, ['experiments/studio-python-runtime/server.ts'], {
    cwd: root,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  let stderr = ''
  child.stderr.on('data', (bytes) => {
    stderr = (stderr + String(bytes)).slice(-16384)
  })
  const stdout = createInterface({ input: child.stdout })
  const started = new Promise<Started>((accept) => {
    stdout.on('line', (line) => {
      try {
        const value: unknown = JSON.parse(line)
        if (value && typeof value === 'object' && 'url' in value && typeof value.url === 'string')
          accept({ url: value.url })
      } catch {
        // Non-JSON build diagnostics do not indicate server readiness.
      }
    })
    child.once('error', (error) => accept({ error: error.message }))
  })
  // close includes stdout/stderr drain; exit alone can race the diagnostic assertions.
  const closed = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((accept) => {
    child.once('close', (code, signal) => accept({ code, signal }))
  })
  const outcome: { value: Value } | { error: unknown } = await (async () =>
    inspect(
      await Promise.race([
        started,
        closed,
        delay(15000, undefined, { ref: false }).then(() => {
          throw new Error(`Probe startup timed out: ${stderr}`)
        }),
      ]),
      () => stderr,
    ))().then(
    (value) => ({ value }),
    (error: unknown) => ({ error }),
  )
  const cleanupErrors: unknown[] = []
  try {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM')
    await Promise.race([
      closed,
      delay(10000, undefined, { ref: false }).then(() => {
        throw new Error('The owned qualification server did not stop.')
      }),
    ])
  } catch (error) {
    cleanupErrors.push(error)
  } finally {
    stdout.close()
  }
  if (cleanupErrors.length)
    throw new AggregateError(
      [...('error' in outcome ? [outcome.error] : []), ...cleanupErrors],
      'Qualification server cleanup failed; the original failure is retained.',
    )
  if ('error' in outcome) throw outcome.error
  return outcome.value
}

test('prebuilt probe rejects a simultaneous false recipe before listening', async () => {
  await withFixture(async (f) => {
    await withServer(
      f.directory,
      f.hash,
      { PYTHON_PROBE_STDLIB_RECIPE: resolve(f.directory, 'false-recipe.json') },
      async (started, stderr) => {
        expect(started).toMatchObject({ code: 1 })
        expect(stderr()).toContain('sem outra receita')
      },
    )
  })
}, 45000)

test('prebuilt probe refuses a different manifest pin without rebuilding', async () => {
  await withFixture(async (f) => {
    await withServer(f.directory, '0'.repeat(64), {}, async (started, stderr) => {
      expect(started).toMatchObject({ code: 1 })
      expect(stderr()).toContain('SHA-256 da distribuição pré-compilada diferente')
    })
  })
}, 45000)

test('prebuilt probe refuses corrupt file bytes before listening', async () => {
  await withFixture(async (f) => {
    await writeFile(resolve(f.directory, 'frame.mjs'), 'changed-before-verification')
    await withServer(f.directory, f.hash, {}, async (started, stderr) => {
      expect(started).toMatchObject({ code: 1 })
      expect(stderr()).toContain('Integridade inválida: frame.mjs')
    })
  })
}, 45000)

test('prebuilt probe serves verified immutable alias bytes after the source file changes', async () => {
  await withFixture(async (f) => {
    await withServer(f.directory, f.hash, {}, async (started, stderr) => {
      if (!('url' in started)) throw new Error(`Probe did not start: ${stderr()}`)
      const configuration: unknown = await (
        await fetch(`${started.url}/configuration`, { signal: AbortSignal.timeout(5000) })
      ).json()
      if (
        !configuration ||
        typeof configuration !== 'object' ||
        !('frameURL' in configuration) ||
        typeof configuration.frameURL !== 'string'
      )
        throw new Error('Probe frame URL was not returned.')
      const alias = new URL('frame.mjs', configuration.frameURL)
      const read = async () => {
        const response = await fetch(alias, { signal: AbortSignal.timeout(5000) })
        expect(response.status).toBe(200)
        expect(response.headers.get('content-type')).toContain('text/javascript')
        return new Uint8Array(await response.arrayBuffer())
      }
      expect(await read()).toEqual(f.contents.get('frame.mjs'))
      await writeFile(resolve(f.directory, 'frame.mjs'), 'changed-after-verification')
      expect(await readFile(resolve(f.directory, 'frame.mjs'), 'utf8')).toBe(
        'changed-after-verification',
      )
      expect(await read()).toEqual(f.contents.get('frame.mjs'))
    })
  })
}, 45000)

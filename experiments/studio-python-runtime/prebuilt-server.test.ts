import { expect, test } from 'bun:test'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rmdir, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { setTimeout as delay } from 'node:timers/promises'
import { canonicalJson } from '../../packages/core/src/creations/content-fingerprint'
import { verifyStudioPythonDeployment } from '../../packages/core/src/studio/python-runtime-distribution'
import { createStudioRuntimeRelease } from '../../packages/core/src/studio/runtime-catalog'
import { pythonDistributionFixture } from '../../packages/studio-runtime/tests/python-distribution-fixture'

const root = resolve(import.meta.dirname, '../..')
const binary = process.env.STUDIO_PYTHON_PROBE_TEST_BUN ?? process.execPath
type Started = { url: string } | { code: number | null; signal: string | null } | { error: string }

async function withFixture<Value>(
  inspect: (fixture: {
    directory: string
    contents: Map<string, Uint8Array<ArrayBuffer>>
    hash: string
    deployment: Awaited<ReturnType<typeof pythonDistributionFixture>>['deployment']
  }) => Promise<Value>,
): Promise<Value> {
  // These bytes exercise packaging/HTTP integrity, without claiming to execute Python.
  const { contents, deployment } = await pythonDistributionFixture()
  const directory = await mkdtemp(resolve(tmpdir(), 'sz-python-prebuilt-'))
  const files = [...contents.keys(), 'distribution.json', 'false-recipe.json', 'release.json']
  const hash = createHash('sha256').update(canonicalJson(deployment.distribution)).digest('hex')
  const outcome: { value: Value } | { error: unknown } = await (async () => {
    for (const [path, bytes] of contents) await writeFile(resolve(directory, path), bytes)
    await writeFile(
      resolve(directory, 'distribution.json'),
      JSON.stringify(deployment.distribution),
    )
    await writeFile(resolve(directory, 'false-recipe.json'), 'false\n')
    return inspect({ directory, contents, hash, deployment })
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
  for (const key of [
    'PYTHON_PROBE_EDITOR',
    'PYTHON_PROBE_STDLIB_RECIPE',
    'PYTHON_PROBE_NETWORK',
    'PYTHON_PROBE_RELEASE_FILE',
    'PYTHON_PROBE_RELEASE_MANIFEST_SHA256',
  ])
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

test('explicit release rejects a partial pair before distribution preparation', async () => {
  await withFixture(async (f) => {
    for (const selection of [
      { PYTHON_PROBE_RELEASE_FILE: resolve(f.directory, 'release.json') },
      { PYTHON_PROBE_RELEASE_MANIFEST_SHA256: 'a'.repeat(64) },
    ]) {
      // The wrong distribution pin also fails closed on an older server. The diagnostic
      // proves selection validation ran first, without a build/listener in either case.
      await withServer(f.directory, '0'.repeat(64), selection, async (started, stderr) => {
        expect(started).toMatchObject({ code: 1 })
        expect(stderr()).toContain('A release explícita exige')
        expect(stderr()).not.toContain('SHA-256 da distribuição pré-compilada diferente')
      })
    }
  })
}, 45000)

test('explicit release rejects missing prebuilt inputs before distribution preparation', async () => {
  await withFixture(async (f) => {
    await withServer(
      f.directory,
      f.hash,
      {
        PYTHON_PROBE_RELEASE_FILE: resolve(f.directory, 'release.json'),
        PYTHON_PROBE_RELEASE_MANIFEST_SHA256: 'a'.repeat(64),
        PYTHON_PROBE_DISTRIBUTION_DIRECTORY: undefined,
      },
      async (started, stderr) => {
        expect(started).toMatchObject({ code: 1 })
        expect(stderr()).toContain('A release explícita exige')
      },
    )
  })
}, 45000)

test('explicit release rejects a wrong selected SHA before listening', async () => {
  await withFixture(async (f) => {
    const path = resolve(f.directory, 'release.json')
    await writeFile(path, canonicalJson(f.deployment.release))
    await withServer(
      f.directory,
      f.hash,
      {
        PYTHON_PROBE_RELEASE_FILE: path,
        PYTHON_PROBE_RELEASE_MANIFEST_SHA256: 'f'.repeat(64),
      },
      async (started, stderr) => {
        expect(started).toMatchObject({ code: 1 })
        expect(stderr()).toContain('A release QA não corresponde ao SHA explícito')
      },
    )
  })
}, 45000)

test('explicit release rejects manifest corruption before listening', async () => {
  await withFixture(async (f) => {
    const path = resolve(f.directory, 'release.json')
    const changed = {
      ...f.deployment.release,
      manifest: {
        ...f.deployment.release.manifest,
        capabilities: [...f.deployment.release.manifest.capabilities, 'publish'],
      },
    }
    await writeFile(path, canonicalJson(changed))
    await withServer(
      f.directory,
      f.hash,
      {
        PYTHON_PROBE_RELEASE_FILE: path,
        PYTHON_PROBE_RELEASE_MANIFEST_SHA256: f.deployment.release.manifestSha256,
      },
      async (started, stderr) => {
        expect(started).toMatchObject({ code: 1 })
        expect(stderr()).toContain('A distribuição não corresponde à release Python')
      },
    )
  })
}, 45000)

test('explicit release rejects canonically hashed artifacts from another distribution before listening', async () => {
  await withFixture(async (f) => {
    const release = await createStudioRuntimeRelease({
      ...f.deployment.release.manifest,
      artifacts: f.deployment.release.manifest.artifacts.map((artifact, index) =>
        index === 0 ? { ...artifact, sha256: 'f'.repeat(64) } : artifact,
      ),
    })
    const path = resolve(f.directory, 'release.json')
    await writeFile(path, canonicalJson(release))
    await withServer(
      f.directory,
      f.hash,
      {
        PYTHON_PROBE_RELEASE_FILE: path,
        PYTHON_PROBE_RELEASE_MANIFEST_SHA256: release.manifestSha256,
      },
      async (started, stderr) => {
        expect(started).toMatchObject({ code: 1 })
        expect(stderr()).toContain('Os artefatos da distribuição diferem da release')
      },
    )
  })
}, 45000)

test('explicit release serves a new canonical identity without replacing the legacy release', async () => {
  await withFixture(async (f) => {
    const release = await createStudioRuntimeRelease({
      ...f.deployment.release.manifest,
      releaseId: 'fixture-publish-assist-2',
      capabilities: ['edit', 'export-source', 'execute', 'python-repl', 'publish', 'assist'],
    })
    const path = resolve(f.directory, 'release.json')
    await writeFile(path, canonicalJson(release))
    await withServer(
      f.directory,
      f.hash,
      {
        PYTHON_PROBE_RELEASE_FILE: path,
        PYTHON_PROBE_RELEASE_MANIFEST_SHA256: release.manifestSha256,
      },
      async (started, stderr) => {
        if (!('url' in started)) throw new Error(`Probe did not start: ${stderr()}`)
        const wire: unknown = await (
          await fetch(`${started.url}/distribution`, { signal: AbortSignal.timeout(5000) })
        ).json()
        if (!wire || typeof wire !== 'object' || !('release' in wire) || !('manifest' in wire))
          throw new Error('The complete release/distribution was not returned.')
        const verified = await verifyStudioPythonDeployment({
          release: wire.release,
          distribution: wire.manifest,
        })
        expect(verified.release).toEqual(release)
        expect(verified.distributionSha256).toBe(f.hash)
        expect(verified.release.manifestSha256).not.toBe(f.deployment.release.manifestSha256)
      },
    )
  })
}, 45000)

test('prebuilt probe serves verified immutable alias bytes after the source file changes', async () => {
  await withFixture(async (f) => {
    await withServer(f.directory, f.hash, {}, async (started, stderr) => {
      if (!('url' in started)) throw new Error(`Probe did not start: ${stderr()}`)
      const wire: unknown = await (
        await fetch(`${started.url}/distribution`, { signal: AbortSignal.timeout(5000) })
      ).json()
      if (!wire || typeof wire !== 'object' || !('release' in wire) || !('manifest' in wire))
        throw new Error('The complete legacy release/distribution was not returned.')
      const legacy = await verifyStudioPythonDeployment({
        release: wire.release,
        distribution: wire.manifest,
      })
      expect(legacy.release.profileId).toBe('python-probe')
      expect(legacy.release.releaseId).toBe('probe-1')
      expect(legacy.release.manifest.capabilities).toEqual([
        'edit',
        'export-source',
        'execute',
        'python-repl',
      ])
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

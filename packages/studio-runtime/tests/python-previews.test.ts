import { expect, test } from 'bun:test'
import { canonicalJson } from '@sistemazero/core/creations'
import { studioPythonExecutionRevision } from '@sistemazero/core/studio/python-execution-content'
import { StudioPythonPlaytestRecipeSchema } from '@sistemazero/core/studio/python-playtest'
import { STUDIO_PYTHON_PREVIEW_LIMITS } from '@sistemazero/core/studio/python-preview'
import { StudioPythonValidationReportSchema } from '@sistemazero/core/studio/python-validation'
import { sha256 } from '../src/artifacts'
import { createPythonDistributionRegistry } from '../src/python-distributions'
import type { PythonInputBucket } from '../src/python-inputs'
import {
  collectPythonPreviewGarbage,
  pythonPreviewPrefix,
  pythonPreviewRecordKey,
  servePythonPreview,
  storePythonPreview,
} from '../src/python-previews'
import { pythonDistributionFixture } from './python-distribution-fixture'
import { pythonInputFixture } from './python-input-fixture'

async function fixture() {
  const input = await pythonInputFixture()
  const runtime = await pythonDistributionFixture({ standalone: true })
  await runtime.store()
  let active = true
  const registry = await createPythonDistributionRegistry({
    approvedDeployments: [runtime.deployment],
    parentOrigins: ['https://app.example'],
    status: () => (active ? 'active' : 'revoked'),
  })
  const hash = runtime.deployment.release.manifestSha256
  const assets = new Map<string, Uint8Array<ArrayBuffer>>([
    ['main.py', new TextEncoder().encode('print("ok")')],
    ['index.html', new TextEncoder().encode('<script>parent.attacked=true</script>')],
    ['assets/a.svg', new TextEncoder().encode('<svg onload="alert(1)"></svg>')],
  ])
  const original = input.request.snapshot
  const { projectId, revision: _revision, ...content } = original
  content.configuration.runtime = {
    profileId: runtime.deployment.release.profileId,
    releaseId: runtime.deployment.release.releaseId,
    manifestSha256: hash,
  }
  content.configuration.python.dependencyLock.runtimeManifestSha256 = hash
  content.files = await Promise.all(
    [...assets].map(async ([path, bytes]) => ({
      path,
      kind: 'source' as const,
      sha256: await sha256(bytes),
      byteLength: bytes.byteLength,
    })),
  )
  const snapshot = { ...content, projectId, revision: await studioPythonExecutionRevision(content) }
  const recipe = StudioPythonPlaytestRecipeSchema.parse({ version: 1 })
  // Synthetic service evidence exercises storage contracts; it does not qualify CPython execution.
  const report = StudioPythonValidationReportSchema.parse({
    version: 1,
    projectId,
    recipe,
    status: 'passed',
    inspection: {
      version: 1,
      revision: snapshot.revision,
      runtimeManifestSha256: hash,
      pythonVersion: '3.14.2',
      status: 'passed',
      files: snapshot.files
        .filter((file) => file.path.endsWith('.py'))
        .map((file) => ({
          path: file.path,
          sha256: file.sha256,
          status: 'passed',
          diagnostics: [],
        })),
    },
    execution: {
      version: 1,
      projectId,
      revision: snapshot.revision,
      runtimeManifestSha256: hash,
      pythonVersion: '3.14.2',
      instanceId: crypto.randomUUID(),
      runId: crypto.randomUUID(),
      recipe,
      status: 'passed',
      started: true,
      stopped: true,
      stateBeforeStop: 'completed',
      observedDurationMs: 1000,
      stdout: 'ok',
      stderr: '',
      omittedChars: 0,
      errors: [],
      input: { stdinRequests: 0, stdinSubmitted: 0, keysDispatched: 0, clicksDispatched: 0 },
    },
  })
  const writes: string[] = []
  let onPut: ((key: string) => void) | undefined
  const bucket: PythonInputBucket = {
    ...input.bucket,
    async put(key, bytes, options) {
      writes.push(key)
      const result = await input.bucket.put(key, bytes, options)
      onPut?.(key)
      return result
    },
  }
  const options = {
    bucket,
    registry,
    runtimeBucket: runtime.bucket,
    serviceOrigin: 'https://runtime.example',
    preview: { parentOrigin: 'https://app.example' },
    snapshot,
    input: await input.store.open({ ...input.request, snapshot }, input.controller.signal),
    report,
    validation: { profileVersion: 1 as const, runtimeFingerprint: 'e'.repeat(64) },
    signal: input.controller.signal,
    assertCurrent() {},
    now: 1000,
    async readProject(path: string) {
      const bytes = assets.get(path)
      if (!bytes) throw new Error('Missing fixture')
      return new Blob([bytes]).stream()
    },
  }
  const serving = {
    bucket,
    registry,
    runtimeBucket: runtime.bucket,
    serviceOrigin: options.serviceOrigin,
    assertCurrent() {},
    async authorize() {
      return true
    },
    now: () => 1000,
  }
  return {
    ...input,
    runtime,
    registry,
    assets,
    snapshot,
    report,
    options,
    serving,
    writes,
    revoke() {
      active = false
    },
    onPut(callback: (key: string) => void) {
      onPut = callback
    },
  }
}

test('preview streams exact project bytes, commits last, shares runtime and keeps authored files inert', async () => {
  const f = await fixture()
  const ref = await storePythonPreview(f.options)
  expect(f.writes[0]).toBe(pythonPreviewRecordKey(ref.id))
  expect(f.writes.at(-1)).toBe(`${pythonPreviewPrefix(ref.id)}complete.json`)
  expect(f.writes.some((key) => key.includes('wasm'))).toBe(false)
  const page = await servePythonPreview(new Request(ref.url), f.serving)
  expect(page.status).toBe(200)
  expect(page.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example')
  expect(page.headers.get('Access-Control-Allow-Origin')).not.toBe('*')
  expect(page.headers.get('Content-Security-Policy')).toContain(
    'sandbox allow-scripts allow-same-origin',
  )
  expect(page.headers.get('Content-Security-Policy')).not.toContain('unsafe-inline')
  const launcher = await page.text()
  expect(launcher).not.toContain('parent.attacked')
  expect(launcher).toContain(
    '<meta name="studio-python-preview-parent" content="https://app.example">',
  )
  for (const path of ['index.html', 'assets/a.svg', 'main.py']) {
    const response = await servePythonPreview(
      new Request(new URL(`project/${path}`, ref.url)),
      f.serving,
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/octet-stream')
    expect(response.headers.get('Content-Disposition')).toBe('attachment')
    expect(response.headers.get('Content-Security-Policy')).toContain('sandbox;')
    const expected = f.assets.get(path)
    if (!expected) throw new Error('Missing expected project bytes')
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(expected)
  }
  const record = f.objects.get(pythonPreviewRecordKey(ref.id))
  expect(record && (await sha256(record.bytes))).toBe(ref.sha256)
  const validation = await servePythonPreview(
    new Request(new URL('validation.json', ref.url)),
    f.serving,
  )
  expect(await validation.text()).toBe(canonicalJson(f.report))
})

test('preview refuses stale scope, missing marker, tampered bytes/checksums and path aliases', async () => {
  const f = await fixture()
  const ref = await storePythonPreview(f.options)
  for (const path of [
    '%69ndex.html',
    'project/%6dain.py',
    'other.py',
    'project/a%2f..%2fmain.py',
    'index.html?x=1',
  ])
    expect((await servePythonPreview(new Request(new URL(path, ref.url)), f.serving)).status).toBe(
      404,
    )
  expect(
    (await servePythonPreview(new Request(ref.url, { method: 'POST' }), f.serving)).status,
  ).toBe(404)
  expect(
    (await servePythonPreview(new Request(ref.url), { ...f.serving, now: () => ref.expiresAt }))
      .status,
  ).toBe(404)
  const key = `${pythonPreviewPrefix(ref.id)}files/index.html`
  const original = f.objects.get(key)!
  f.objects.set(key, { ...original, hash: new ArrayBuffer(32) })
  expect((await servePythonPreview(new Request(ref.url), f.serving)).status).toBe(404)
  f.objects.set(key, original)
  f.objects.delete(`${pythonPreviewPrefix(ref.id)}complete.json`)
  expect((await servePythonPreview(new Request(ref.url), f.serving)).status).toBe(404)
  f.revoke()
  await expect(storePythonPreview(f.options)).rejects.toThrow('retirado')
})

test('a completion marker alone never authorizes preview delivery and every response rechecks the decision', async () => {
  const f = await fixture()
  const ref = await storePythonPreview(f.options)
  expect(
    (
      await servePythonPreview(new Request(ref.url), {
        ...f.serving,
        async authorize() {
          return false
        },
      })
    ).status,
  ).toBe(404)
  let checks = 0
  expect(
    (
      await servePythonPreview(new Request(ref.url), {
        ...f.serving,
        async authorize() {
          return ++checks === 1
        },
      })
    ).status,
  ).toBe(404)
  expect(checks).toBe(2)
})

test('preview rejects corrupt source before publishing and keeps a collectable failed record', async () => {
  const f = await fixture()
  f.assets.set('main.py', new TextEncoder().encode('print("NO")'))
  await expect(storePythonPreview(f.options)).rejects.toThrow()
  expect(f.writes.some((key) => key.endsWith('complete.json'))).toBe(false)
  expect([...f.objects.keys()].filter((key) => key.startsWith('python-previews/'))).toEqual([])
  expect(
    [...f.objects.keys()].filter((key) => key.startsWith('python-preview-records/')),
  ).toHaveLength(1)
})

test('cancel or configuration withdrawal between writes never commits a preview', async () => {
  for (const cancel of [true, false]) {
    const f = await fixture()
    f.onPut((key) => {
      if (key.includes('/files/')) {
        if (cancel) f.controller.abort(new Error('cancelled'))
        else f.revoke()
      }
    })
    await expect(storePythonPreview(f.options)).rejects.toThrow()
    expect(f.writes.some((key) => key.endsWith('complete.json'))).toBe(false)
    expect([...f.objects.keys()].filter((key) => key.startsWith('python-previews/'))).toEqual([])
  }
})

test('preview captures its signal, ports and authorization callback before asynchronous storage', async () => {
  const f = await fixture()
  let current = true
  f.options.assertCurrent = () => {
    if (!current) throw new Error('original fence')
  }
  f.onPut((key) => {
    if (!key.startsWith('python-preview-records/')) return
    f.options.signal = new AbortController().signal
    f.options.assertCurrent = () => {}
    f.options.bucket = {
      ...f.bucket,
      async put() {
        throw new Error('substituted bucket')
      },
    }
    current = false
    f.controller.abort(new Error('original cancellation'))
  })
  await expect(storePythonPreview(f.options)).rejects.toThrow('original cancellation')
  expect(f.writes.some((key) => key.endsWith('complete.json'))).toBe(false)
})

test('a native put with a missing acknowledgement cannot block cancellation', async () => {
  const f = await fixture()
  let enter!: () => void, release!: () => void
  const entered = new Promise<void>((resolve) => {
    enter = resolve
  })
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const bucket: PythonInputBucket = {
    ...f.bucket,
    async put(key, value, metadata) {
      const result = await f.bucket.put(key, value, metadata)
      if (key.includes('/files/')) {
        enter()
        await gate
      }
      return result
    },
  }
  const pending = storePythonPreview({ ...f.options, bucket })
  // Observe the rejection immediately; the native ACK remains under this test's control.
  const outcome = pending.then(
    () => 'unexpected-success',
    () => 'cancelled',
  )
  await entered
  f.controller.abort(new Error('cancelled without ACK'))
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const result = await Promise.race([
      outcome,
      new Promise<string>((resolve) => {
        timer = setTimeout(() => resolve('blocked-by-ACK'), 500)
      }),
    ])
    expect(result).toBe('cancelled')
    expect(f.writes.some((key) => key.endsWith('complete.json'))).toBe(false)
  } finally {
    if (timer) clearTimeout(timer)
    release()
    await pending.catch(() => {})
  }
})

test('a deterministically invalid GC record does not starve valid expired previews', async () => {
  const f = await fixture()
  const ref = await storePythonPreview(f.options)
  const badKey = pythonPreviewRecordKey('0'.repeat(64))
  const bytes = new TextEncoder().encode('{"invalid":true}')
  f.objects.set(badKey, { bytes, hash: await crypto.subtle.digest('SHA-256', bytes) })
  let saved = false
  const result = await collectPythonPreviewGarbage({
    bucket: {
      ...f.bucket,
      async list() {
        return {
          objects: [{ key: badKey }, { key: pythonPreviewRecordKey(ref.id) }],
          truncated: false,
        }
      },
    },
    cursor: {
      async load() {
        return undefined
      },
      async save() {
        saved = true
      },
    },
    now: () => ref.expiresAt,
  })
  expect(result).toEqual({ scanned: 2, removed: 1, failed: 1 })
  expect(saved).toBe(true)
  expect(f.objects.has(badKey)).toBe(true)
  expect(f.objects.has(pythonPreviewRecordKey(ref.id))).toBe(false)
})

test('unresponsive body retirement cannot retain an aborted preview request', async () => {
  const f = await fixture()
  const ref = await storePythonPreview(f.options)
  const controller = new AbortController()
  let enter!: () => void, release!: () => void
  const entered = new Promise<void>((resolve) => {
    enter = resolve
  })
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const bucket = {
    ...f.bucket,
    async get(key: string) {
      const object = await f.bucket.get(key)
      if (!object || !key.endsWith('/complete.json')) return object
      await object.body.cancel()
      return {
        ...object,
        body: new ReadableStream<Uint8Array>({
          cancel() {
            enter()
            return gate
          },
        }),
      }
    },
  }
  const pending = servePythonPreview(new Request(ref.url, { signal: controller.signal }), {
    ...f.serving,
    bucket,
  })
  await entered
  controller.abort(new Error('request retired'))
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const result = await Promise.race([
      pending.then((response) => response.status),
      new Promise<number>((resolve) => {
        timer = setTimeout(() => resolve(999), 500)
      }),
    ])
    expect(result).toBe(404)
  } finally {
    if (timer) clearTimeout(timer)
    release()
    await pending
  }
})

test('preview garbage collection preserves live previews and all other namespaces, retries failed deletes', async () => {
  const f = await fixture()
  const ref = await storePythonPreview(f.options)
  const sentinel = 'published/mural/permanent'
  f.objects.set(sentinel, { bytes: new Uint8Array([1]), hash: new ArrayBuffer(32) })
  let cursor: string | undefined
  let failDelete = false
  const bucket = {
    ...f.options.bucket,
    async list(options: { prefix: string; limit: number; cursor?: string }) {
      expect(options.prefix).toBe('python-preview-records/')
      return {
        objects: [...f.objects.keys()]
          .filter((key) => key.startsWith(options.prefix))
          .map((key) => ({ key })),
        truncated: false,
      }
    },
    async delete(keys: string[]) {
      if (failDelete) throw new Error('storage offline')
      await f.bucket.delete(keys)
    },
  }
  const options = {
    bucket,
    cursor: {
      async load() {
        return cursor
      },
      async save(value?: string) {
        cursor = value
      },
    },
    now: () => 1000,
  }
  expect((await collectPythonPreviewGarbage(options)).removed).toBe(0)
  failDelete = true
  cursor = 'keep-on-failure'
  await expect(
    collectPythonPreviewGarbage({ ...options, now: () => ref.expiresAt }),
  ).rejects.toThrow('offline')
  expect(cursor).toBe('keep-on-failure')
  expect(f.objects.has(pythonPreviewRecordKey(ref.id))).toBe(true)
  failDelete = false
  expect(
    (
      await collectPythonPreviewGarbage({
        ...options,
        now: () => 1000 + STUDIO_PYTHON_PREVIEW_LIMITS.lifetimeMs,
      })
    ).removed,
  ).toBe(1)
  expect(f.objects.has(sentinel)).toBe(true)
  expect([...f.objects.keys()].filter((key) => key.startsWith('python-preview'))).toEqual([])
  expect(cursor).toBeUndefined()
})

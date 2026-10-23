import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  type StudioPythonExecutionMetadata,
  studioPythonExecutionRevision,
} from '@sistemazero/core/studio/python-execution-content'
import { STUDIO_PYTHON_MATERIAL_LIMITS } from '@sistemazero/core/studio/python-material-policy'
import { pythonInputFixture } from './python-input-fixture'

test('real workerd R2 verifies binary, empty, corrupt and quota-sized streamed inputs', async () => {
  const directory = resolve(
    import.meta.dirname,
    '../../../.cache/studio-python-l0/r2-inputs',
    crypto.randomUUID(),
  )
  await mkdir(directory, { recursive: true })
  const worker = resolve(import.meta.dirname, 'fixtures/python-inputs-worker.ts')
  const configuration = resolve(directory, 'wrangler.json')
  await Bun.write(
    configuration,
    JSON.stringify({
      name: 'studio-python-inputs-proof',
      main: worker,
      compatibility_date: '2026-07-01',
      compatibility_flags: ['nodejs_compat'],
      r2_buckets: [{ binding: 'INPUTS', bucket_name: 'studio-python-inputs-proof', remote: false }],
    }),
  )
  const f = await pythonInputFixture()
  const emptyHash = createHash('sha256').digest('hex')
  const size = STUDIO_PYTHON_MATERIAL_LIMITS.snapshotBytes
  const chunk = new Uint8Array(64 * 1024).fill(42)
  const hash = createHash('sha256')
  for (let remaining = size; remaining > 0; remaining -= chunk.byteLength)
    hash.update(chunk.subarray(0, Math.min(remaining, chunk.byteLength)))
  const quotaHash = hash.digest('hex')
  async function requestFor(files: StudioPythonExecutionMetadata['files']) {
    const { revision: _revision, projectId, ...content } = f.request.snapshot
    const snapshot = { ...content, files }
    return {
      ...f.request,
      requestId: crypto.randomUUID(),
      snapshot: { ...snapshot, projectId, revision: await studioPythonExecutionRevision(snapshot) },
    }
  }
  const empty = { path: 'main.py', kind: 'source' as const, sha256: emptyHash, byteLength: 0 }
  const seed = resolve(directory, 'seed.json')
  await Bun.write(
    seed,
    JSON.stringify({
      binary: { request: f.request, fileHash: f.fileHash, bytes: [...f.bytes] },
      empty: { request: await requestFor([empty]), fileHash: emptyHash, bytes: [] },
      quota: {
        request: await requestFor([
          empty,
          { path: 'sound.bin', kind: 'asset', sha256: quotaHash, byteLength: size },
        ]),
        fileHash: quotaHash,
        size,
        byte: 42,
      },
    }),
  )
  // workerd/Wrangler runs under native Node; CI may supply its pinned executable.
  const node = process.env.STUDIO_PYTHON_TEST_NODE ?? 'node'
  const child = Bun.spawn(
    [
      node,
      resolve(import.meta.dirname, 'fixtures/python-inputs-workerd.cjs'),
      worker,
      seed,
      configuration,
    ],
    {
      cwd: resolve(import.meta.dirname, '..'),
      windowsHide: true,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    },
  )
  const timer = setTimeout(() => child.kill(), 55_000)
  async function drain(stream: ReadableStream<Uint8Array>) {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let tail = ''
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) return tail + decoder.decode()
        tail = (tail + decoder.decode(value, { stream: true })).slice(-20_000)
      }
    } finally {
      reader.releaseLock()
    }
  }
  try {
    const [exit, stdout, stderr] = await Promise.all([
      child.exited,
      drain(child.stdout),
      drain(child.stderr),
    ])
    await Bun.write(resolve(directory, 'result.json'), JSON.stringify({ exit, stdout, stderr }))
    if (exit !== 0) throw new Error(`R2 proof failed (${exit}): ${stderr.slice(-8000)}`)
    expect(JSON.parse(stdout)).toEqual({
      verified: true,
      cases: ['binary', 'empty', 'short', 'over', 'hash', 'quota'],
    })
  } finally {
    clearTimeout(timer)
    if (child.exitCode === null) child.kill()
  }
}, 60_000)

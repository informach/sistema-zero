import { expect, test } from 'bun:test'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { StudioPythonInputReferenceSchema } from '@sistemazero/core/studio/python-validation-input'

test('controlled controller races run in an isolated Bun process, without claiming SDK qualification', async () => {
  const child = Bun.spawn(
    [process.execPath, 'test', './tests/fixtures/python-job-controller.cases.cjs'],
    { cwd: resolve(import.meta.dirname, '..'), windowsHide: true, stdout: 'pipe', stderr: 'pipe' },
  )
  const timer = setTimeout(() => child.kill(), 10_000)
  try {
    const [exit, stdout, stderr] = await Promise.all([
      child.exited,
      Bun.readableStreamToText(child.stdout),
      Bun.readableStreamToText(child.stderr),
    ])
    if (exit !== 0) throw new Error(`Controller race proof failed: ${stdout}${stderr}`)
    expect(stderr).toMatch(/[1-9]\d* pass/)
    expect(stderr).toContain('0 fail')
  } finally {
    clearTimeout(timer)
    if (child.exitCode === null) child.kill()
  }
}, 15_000)

test('actual DO controller persists pre-start cancellation and terminal admission without SDK', async () => {
  const directory = resolve(
    import.meta.dirname,
    '../../../.cache/studio-python-l0/job-controller',
    crypto.randomUUID(),
  )
  await mkdir(directory, { recursive: true })
  const input = StudioPythonInputReferenceSchema.parse({
    version: 1,
    inputId: 'a'.repeat(32),
    requestId: crypto.randomUUID(),
    generation: crypto.randomUUID(),
    projectId: 'job-controller-proof',
    owner: 'b'.repeat(64),
    executionId: 'python-job-controller-1234567890abcdef',
    revision: 'c'.repeat(64),
    expiresAt: Date.now() + 60_000,
  })
  const worker = resolve(import.meta.dirname, 'fixtures/python-job-controller-worker.ts')
  const config = resolve(directory, 'wrangler.json')
  const seed = resolve(directory, 'seed.json')
  await Bun.write(seed, JSON.stringify(input))
  await Bun.write(
    config,
    JSON.stringify({
      name: 'python-job-controller-proof',
      main: worker,
      compatibility_date: '2026-07-01',
      compatibility_flags: ['nodejs_compat'],
      durable_objects: { bindings: [{ class_name: 'JobControllerProbe', name: 'Probe' }] },
      migrations: [{ new_sqlite_classes: ['JobControllerProbe'], tag: 'v1' }],
    }),
  )
  const child = Bun.spawn(
    [
      process.env.STUDIO_PYTHON_TEST_NODE ?? 'node',
      resolve(import.meta.dirname, 'fixtures/python-job-controller-workerd.cjs'),
      worker,
      seed,
      config,
    ],
    {
      cwd: resolve(import.meta.dirname, '..'),
      windowsHide: true,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        WRANGLER_SEND_METRICS: 'false',
        WRANGLER_LOG_PATH: resolve(directory, 'wrangler.log'),
      },
    },
  )
  const timer = setTimeout(() => child.kill(), 25_000)
  async function drain(stream: ReadableStream<Uint8Array>) {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let tail = ''
    try {
      for (;;) {
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
    if (exit !== 0) throw new Error(`Native Python controller proof failed: ${stdout}${stderr}`)
    expect(stdout).toContain('"verified":true')
    expect(stdout).toContain('"sdk":false')
  } finally {
    clearTimeout(timer)
    if (child.exitCode === null) child.kill()
  }
}, 30_000)

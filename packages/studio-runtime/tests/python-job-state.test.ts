import { expect, test } from 'bun:test'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { studioPythonInspectionJobId } from '@sistemazero/core/studio/python-inspection-job'
import { StudioPythonInputReferenceSchema } from '@sistemazero/core/studio/python-validation-input'

test('real workerd SQLite keeps exclusive job ownership, terminal fences and state through DO reset', async () => {
  const directory = resolve(
    import.meta.dirname,
    '../../../.cache/studio-python-l0/job-state',
    crypto.randomUUID(),
  )
  await mkdir(directory, { recursive: true })
  const input = StudioPythonInputReferenceSchema.parse({
    version: 1,
    inputId: 'a'.repeat(32),
    requestId: crypto.randomUUID(),
    generation: crypto.randomUUID(),
    projectId: 'job-state-proof',
    owner: 'b'.repeat(64),
    executionId: 'python-job-state-1234567890abcdef',
    revision: 'c'.repeat(64),
    expiresAt: 900_000,
  })
  const state = {
    version: 1,
    stateVersion: 1,
    jobId: await studioPythonInspectionJobId(input),
    input,
    structure: true,
    status: 'running',
    createdAt: 1000,
    deadline: 121_000,
    sandboxCreated: false,
    cleanupConfirmed: false,
  }
  const worker = resolve(import.meta.dirname, 'fixtures/python-job-state-worker.ts')
  const config = resolve(directory, 'wrangler.json')
  const seed = resolve(directory, 'seed.json')
  await Bun.write(seed, JSON.stringify(state))
  await Bun.write(
    config,
    JSON.stringify({
      name: 'python-job-state-proof',
      main: worker,
      compatibility_date: '2026-07-01',
      compatibility_flags: ['nodejs_compat'],
      durable_objects: { bindings: [{ class_name: 'JobStateProbe', name: 'Probe' }] },
      migrations: [{ new_sqlite_classes: ['JobStateProbe'], tag: 'v1' }],
    }),
  )
  const child = Bun.spawn(
    [
      process.env.STUDIO_PYTHON_TEST_NODE ?? 'node',
      resolve(import.meta.dirname, 'fixtures/python-job-state-workerd.cjs'),
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
    if (exit !== 0) throw new Error(`Native Python job state proof failed: ${stdout}${stderr}`)
    expect(stdout).toContain('"verified":true')
    expect(stdout).toContain('"resetPreserved":true')
  } finally {
    clearTimeout(timer)
    if (child.exitCode === null) child.kill()
  }
}, 30_000)

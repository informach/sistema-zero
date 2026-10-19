const { expect, test, mock } = require('bun:test')
const { Database } = require('bun:sqlite')

// Isolated process only: ports control scheduling, not SDK/container behavior.
mock.module('cloudflare:workers', () => ({
  DurableObject: class {
    constructor(ctx, env) {
      this.ctx = ctx
      this.env = env
    }
  },
  RpcTarget: class {},
}))
mock.module('@cloudflare/sandbox', () => ({
  getSandbox() {
    throw new Error('The controller model must not invoke the real SDK')
  },
}))
let readConfiguration = async () => ({})
mock.module('../../src/python-configuration-storage', () => ({
  createPythonRuntimeConfigurationLoader:
    () =>
    (...args) =>
      readConfiguration(...args),
}))
mock.module('../../src/python-r2-inputs', () => ({
  createPythonR2InputStorage: (bucket) => bucket,
}))
let handler
mock.module('../../src/python-requests', () => ({
  handlePythonRequest: (request, options) => handler(request, options),
}))
const { PythonInspectionJob } = require('../../src/python-inspection-job')
const { createPythonJobStateStore } = require('../../src/python-job-state')

function gate() {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}
function fixture(expiresIn = 900_000) {
  readConfiguration = async () => ({})
  const db = new Database(':memory:')
  const sql = {
    exec(query, ...bindings) {
      const rows = db.query(query).all(...bindings)
      return { toArray: () => rows }
    },
  }
  const alarms = []
  const ctx = {
    storage: {
      sql,
      async setAlarm(at) {
        alarms.push(at)
      },
      async deleteAlarm() {},
    },
    waitUntil(pending) {
      void pending.catch(() => {})
    },
  }
  let creates = 0
  let destroys = 0
  const destroyGate = gate()
  class Probe extends PythonInspectionJob {
    createOwnedSandbox() {
      creates++
      return {
        async mkdir() {},
        async writeFile() {},
        async readFile() {
          return { content: '' }
        },
        async exec() {
          return { success: true, stdout: '', stderr: '' }
        },
        async destroy() {
          destroys++
          await destroyGate.promise
        },
      }
    }
  }
  const job = new Probe(ctx, {
    STUDIO_PYTHON_DISTRIBUTIONS_SHA256: 'd'.repeat(64),
    PYTHON_INPUTS: {},
    PRO_ARTIFACTS: {},
    ProBuildSandbox: {},
  })
  const input = {
    version: 1,
    inputId: 'a'.repeat(32),
    requestId: crypto.randomUUID(),
    generation: crypto.randomUUID(),
    projectId: 'controlled-job',
    owner: 'b'.repeat(64),
    executionId: 'python-job-1234567890abcdef',
    revision: 'c'.repeat(64),
    expiresAt: Date.now() + expiresIn,
  }
  return {
    job,
    input,
    db,
    destroyGate,
    alarms,
    store: createPythonJobStateStore(sql),
    get creates() {
      return creates
    },
    get destroys() {
      return destroys
    },
  }
}
test('catalog wait cannot admit an SDK after digest/bucket withdrawal or cancellation', async () => {
  for (const change of ['digest', 'bucket', 'cancel']) {
    const f = fixture()
    const entered = gate(),
      release = gate()
    readConfiguration = async () => {
      entered.resolve()
      await release.promise
      return {}
    }
    handler = () => {
      throw new Error('Withdrawn configuration cannot invoke the handler')
    }
    try {
      const pending = f.job.validate({ version: 1, input: f.input, recipe: { version: 1 } })
      await entered.promise
      if (change === 'digest') f.job.env.STUDIO_PYTHON_DISTRIBUTIONS_SHA256 = 'e'.repeat(64)
      if (change === 'bucket') f.job.env.PRO_ARTIFACTS = {}
      if (change === 'cancel') await f.job.cancel(f.input)
      release.resolve()
      expect((await pending).status).toBe(change === 'cancel' ? 408 : 503)
      expect(f.creates).toBe(0)
      expect(f.store.read().cleanupConfirmed).toBe(true)
      expect(f.store.read().status).toBe(change === 'cancel' ? 'cancelled' : 'failed')
    } finally {
      release.resolve()
      f.db.close()
    }
  }
})

test('validation admission captures immutable recipe and rejects mode/recipe changes for the same input', async () => {
  const started = gate(),
    reply = gate()
  handler = async (request, options) => {
    const body = await request.json()
    options.createSandbox()
    started.resolve(body)
    await reply.promise
    return Response.json({ ok: true, report: 'controlled admission result, not execution proof' })
  }
  const f = fixture()
  const recipe = { version: 1, stdin: ['Lia'] }
  const preview = { parentOrigin: 'https://app.example' }
  const work = f.job.validate({ version: 1, input: f.input, recipe, preview })
  recipe.stdin[0] = 'mutated'
  preview.parentOrigin = 'https://mutated.example'
  try {
    const admitted = await started.promise
    expect(admitted.recipe.stdin).toEqual(['Lia'])
    expect(admitted.preview).toEqual({ parentOrigin: 'https://app.example' })
    expect(f.store.read().operation.preview).toEqual({ parentOrigin: 'https://app.example' })
    expect(f.store.read().operation.recipe.stdin).toEqual(['Lia'])
    const identical = {
      version: 1,
      input: f.input,
      recipe: { version: 1, stdin: ['Lia'] },
      preview: { parentOrigin: 'https://app.example' },
    }
    for (const preview of [undefined, { parentOrigin: 'https://other.example' }])
      expect(JSON.parse((await f.job.validate({ ...identical, preview })).bodyJson).code).toBe(
        'JOB_SCOPE_CHANGED',
      )
    expect(JSON.parse((await f.job.validate(identical)).bodyJson).code).toBe('JOB_ALREADY_RUNNING')
    expect(
      JSON.parse(
        (
          await f.job.validate({
            ...identical,
            recipe: { version: 1, stdin: ['Lia'], observeMs: 999 },
          })
        ).bodyJson,
      ).code,
    ).toBe('JOB_SCOPE_CHANGED')
    expect(JSON.parse((await f.job.inspect(f.input)).bodyJson).code).toBe('JOB_SCOPE_CHANGED')
    expect(f.creates).toBe(1)
    f.destroyGate.resolve()
    reply.resolve()
    expect((await work).status).toBe(200)
    expect(f.destroys).toBe(1)
    expect((await f.job.validate(identical)).status).toBe(410)
    const state = f.store.read()
    const scope = {
      jobId: state.jobId,
      projectId: f.input.projectId,
      revision: f.input.revision,
      parentOrigin: 'https://app.example',
      expiresAt: state.deadline + 24 * 60 * 60_000,
    }
    expect(await f.job.previewAvailable(scope)).toBe(true)
    for (const changes of [
      { parentOrigin: 'https://other.example' },
      { revision: '0'.repeat(64) },
      { expiresAt: scope.expiresAt + 1 },
    ])
      expect(await f.job.previewAvailable({ ...scope, ...changes })).toBe(false)
    await f.job.cancel(f.input)
    expect(await f.job.previewAvailable(scope)).toBe(true)
    expect(() => f.store.purgeExpired(f.store.read(), f.input.expiresAt + 1)).toThrow()
    await f.job.discardPreview(f.input)
    expect(await f.job.previewAvailable(scope)).toBe(false)
    expect(f.store.read().previewRetired).toBe(true)
    expect(() => f.store.update(f.store.read(), { previewRetired: false })).toThrow()
    expect(() => f.store.update(f.store.read(), { previewRetired: undefined })).toThrow()
    expect(await f.job.previewAvailable(scope)).toBe(false)
  } finally {
    f.destroyGate.resolve()
    reply.resolve()
    await work
    f.db.close()
  }
})

test('pre-admission cancellation blocks every validation recipe without creating an SDK', async () => {
  const f = fixture()
  handler = () => {
    throw new Error('Cancelled admission cannot invoke the handler')
  }
  try {
    await f.job.cancel(f.input)
    for (const structure of [false, true])
      expect(
        (await f.job.validate({ version: 1, input: f.input, structure, recipe: { version: 1 } }))
          .status,
      ).toBe(409)
    expect(f.store.read().status).toBe('cancelled')
    expect(f.creates).toBe(0)
  } finally {
    f.db.close()
  }
})

test('a withdrawn owner fence after SDK creation still confirms cleanup and blocks readmission', async () => {
  const f = fixture()
  handler = async (_request, options) => {
    options.createSandbox()
    f.job.env.STUDIO_PYTHON_DISTRIBUTIONS_SHA256 = 'e'.repeat(64)
    return Response.json({ ok: true, report: 'late' })
  }
  try {
    f.destroyGate.resolve()
    expect(
      (await f.job.validate({ version: 1, input: f.input, recipe: { version: 1 } })).status,
    ).toBe(503)
    expect(f.store.read().status).toBe('failed')
    expect(f.store.read().cleanupConfirmed).toBe(true)
    expect(f.destroys).toBe(1)
    expect(
      (await f.job.validate({ version: 1, input: f.input, recipe: { version: 1 } })).status,
    ).toBe(410)
  } finally {
    f.db.close()
  }
})

test('pre-start cancellation persists a terminal fence and never admits an SDK owner', async () => {
  const f = fixture()
  try {
    expect(await f.job.cancel(f.input)).toEqual({ retired: true, cleanupConfirmed: true })
    expect((await f.job.inspect(f.input)).status).toBe(410)
    expect(f.creates).toBe(0)
  } finally {
    f.db.close()
  }
})
test('cancellation waits for destruction acknowledgement and denies a late successful result', async () => {
  const started = gate()
  handler = async (request, options) => {
    options.createSandbox()
    started.resolve()
    await new Promise((resolve) =>
      request.signal.addEventListener('abort', resolve, { once: true }),
    )
    return Response.json({ ok: true, report: 'late' })
  }
  const f = fixture()
  try {
    const work = f.job.inspect(f.input)
    await started.promise
    let ack = false
    const cancel = f.job.cancel(f.input).then((value) => {
      ack = true
      return value
    })
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(ack).toBe(false)
    expect(f.store.read().cleanupConfirmed).toBe(false)
    f.destroyGate.resolve()
    expect(await cancel).toEqual({ retired: true, cleanupConfirmed: true })
    expect((await work).status).toBe(408)
    expect(f.destroys).toBe(1)
    expect(f.store.read().status).toBe('cancelled')
  } finally {
    f.db.close()
  }
})
test('expiry preserves the terminal state while its cancelled response is still unwinding', async () => {
  const started = gate()
  const beganAbort = gate()
  const releaseReply = gate()
  handler = async (request, options) => {
    const sdk = options.createSandbox()
    started.resolve()
    await new Promise((resolve) =>
      request.signal.addEventListener('abort', resolve, { once: true }),
    )
    beganAbort.resolve()
    await sdk.destroy()
    await releaseReply.promise
    return Response.json({ ok: false, code: 'REQUEST_RETIRED' }, { status: 408 })
  }
  const f = fixture(1000)
  const originalNow = Date.now
  try {
    const work = f.job.inspect(f.input)
    void work.catch(() => {})
    await started.promise
    Date.now = () => f.input.expiresAt + 1
    const alarm = f.job.alarm()
    await beganAbort.promise
    f.destroyGate.resolve()
    await alarm
    expect(f.store.read().status).toBe('cancelled')
    expect(f.store.read().cleanupConfirmed).toBe(true)
    expect(f.alarms.at(-1)).toBeGreaterThan(Date.now())
    releaseReply.resolve()
    expect((await work).status).toBe(408)
    await f.job.alarm()
    expect(f.store.read()).toBeUndefined()
    expect(f.destroys).toBe(1)
  } finally {
    Date.now = originalNow
    f.db.close()
  }
})

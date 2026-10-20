import { Database } from 'bun:sqlite'
import { expect, it, mock } from 'bun:test'
import { PYTHON_LANGUAGE_LIMITS } from '@sistemazero/core/studio/python-language'
import {
  type StudioPythonAnalysisAuthorization,
  studioPythonAnalysisBinding,
} from '@sistemazero/core/studio/python-language-authorization'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { providedPythonRelease } from '../../core/tests/fixtures/python-provided-release'
import { createPythonLanguageHttpProvider } from '../../studio/src/python/language/httpProvider'
import { documentFixture } from '../../studio/src/state/fixtures/projectDocuments'

const binding = 'b'.repeat(64)
function analysisAuthorization(projectId: string): StudioPythonAnalysisAuthorization {
  const project = documentFixture('python', 'pro')
  project.id = projectId
  return {
    operation: 'analyze',
    revision: 'a'.repeat(64),
    subject: studioRuntimeSubject(project),
    context: { kind: 'free', audience: 'kids', projectId },
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
const tick = async () => {
  for (let index = 0; index < 80; index++) await Promise.resolve()
}
type Stage =
  | 'startProcess'
  | 'port'
  | 'configure'
  | 'configure-create'
  | 'health'
  | 'create'
  | 'command'
  | 'none'
function sandboxProbe(stage: Stage) {
  const gate = deferred<void>(),
    entered = deferred<void>(),
    trace: string[] = [],
    configurations: unknown[] = []
  let commandAborted = false
  async function visit(current: Stage) {
    trace.push(current)
    if (stage === current) {
      entered.resolve()
      await gate.promise
    }
  }
  return {
    trace,
    configurations,
    gate,
    entered,
    aborted: () => commandAborted,
    sandbox: {
      async startProcess() {
        await visit('startProcess')
        return {
          async waitForPort() {
            await visit('port')
          },
        }
      },
      async checkLanguageHealth(token: string) {
        return checkPythonLanguageHealth(token, async () => {
          await visit('health')
          return Response.json({ ready: true })
        })
      },
      async createLanguageCommand(body: ReadableStream<Uint8Array> | null, token: string) {
        if (stage === 'create') await visit('create')
        return new PythonLanguageCommand({
          body,
          token,
          send: async (request) => {
            request.signal.addEventListener('abort', () => {
              commandAborted = true
            })
            await visit('command')
            return Response.json({ ok: true })
          },
          retain() {},
        })
      },
      async createLanguageConfiguration(
        body: ReadableStream<Uint8Array> | null,
        token: string,
        timeoutMs: number,
      ) {
        if (stage === 'configure-create') await visit('configure-create')
        return new PythonLanguageCommand({
          body,
          token,
          target: 'configure',
          timeoutMs,
          send: async (request) => {
            request.signal.addEventListener('abort', () => {
              commandAborted = true
            })
            expect(request.url).toBe('http://language/configure')
            const configuration = await request.json()
            configurations.push(configuration)
            await visit('configure')
            return Response.json({ protocolVersion: 1, ready: true })
          },
          retain() {},
        })
      },
      async destroy() {
        trace.push('destroy')
      },
    },
  }
}
// Platform boundaries only: lease SQL and the worker/provider implementation are real.
// A deliberately non-cooperative SDK exposes container recreation races after cancellation.
mock.module('cloudflare:workers', () => ({
  RpcTarget: class {},
  DurableObject: class {
    constructor(
      public ctx: unknown,
      public env: unknown,
    ) {}
  },
}))
mock.module('@cloudflare/sandbox', () => ({
  Sandbox: class {},
  getSandbox(binding: { sandbox: ReturnType<typeof sandboxProbe>['sandbox'] }) {
    return binding.sandbox
  },
}))
const { checkPythonLanguageHealth, PythonLanguageCommand } = await import(
  '../src/language-transport'
)
const { PythonLanguageOwner, default: worker } = await import('../src/index')

it('health rejects invalid credentials before I/O and reports success or denial after local drain', async () => {
  let sends = 0
  await expect(
    checkPythonLanguageHealth('invalid', async () => {
      sends++
      return Response.json({})
    }),
  ).rejects.toThrow('Invalid language credential')
  expect(sends).toBe(0)
  expect(
    await checkPythonLanguageHealth('a'.repeat(64), async (request) => {
      sends++
      expect(request.method).toBe('GET')
      expect(request.url).toBe('http://language/healthz')
      expect(request.headers.get('authorization')).toBe(`Bearer ${'a'.repeat(64)}`)
      expect(request.signal.aborted).toBe(false)
      return Response.json({ ready: true })
    }),
  ).toBe(true)
  expect(
    await checkPythonLanguageHealth('a'.repeat(64), async () => Response.json({}, { status: 401 })),
  ).toBe(false)
  expect(sends).toBe(1)
})

it('health native timeout cancels and drains a pending response body', async () => {
  let cancelled = false
  // AbortSignal.timeout does not retain the event loop. This referenced watchdog
  // keeps the harness alive and fails independently if the real deadline stalls.
  let watchdog: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    watchdog = setTimeout(() => reject(new Error('Health timeout did not finish')), 8000)
  })
  try {
    await expect(
      Promise.race([
        checkPythonLanguageHealth(
          'a'.repeat(64),
          async () =>
            new Response(
              new ReadableStream({
                pull() {},
                cancel() {
                  cancelled = true
                },
              }),
            ),
        ),
        deadline,
      ]),
    ).rejects.toMatchObject({ name: 'TimeoutError' })
    expect(cancelled).toBe(true)
  } finally {
    clearTimeout(watchdog)
  }
}, 15_000)

it('cancels a command handle before run without container I/O and releases its source', async () => {
  let sends = 0,
    cancelled = 0
  const command = new PythonLanguageCommand({
    body: new ReadableStream({
      cancel() {
        cancelled++
      },
    }),
    token: 'a'.repeat(64),
    async send() {
      sends++
      return Response.json({ ok: true })
    },
    retain() {},
  })
  await command.cancel()
  await expect(command.run()).rejects.toThrow()
  await expect(command.run()).rejects.toThrow()
  expect(sends).toBe(0)
  expect(cancelled).toBe(1)
})

it('runs a command only once, including concurrent and repeated RPC invocations', async () => {
  let sends = 0
  const retained: Promise<unknown>[] = []
  const command = new PythonLanguageCommand({
    body: null,
    token: 'a'.repeat(64),
    async send() {
      sends++
      return Response.json({ ready: true })
    },
    retain(promise) {
      retained.push(promise)
    },
  })
  const replies = await Promise.all([command.run(), command.run(), command.run()])
  for (const reply of replies) expect(await reply.text()).toBe('{"ready":true}')
  expect(sends).toBe(1)
  expect(retained).toHaveLength(1)
  await Promise.all(retained)
  command[Symbol.dispose]()
})

it('awaits actual cancellation of a pending body before reporting command drain', async () => {
  const entered = deferred<void>(),
    release = deferred<void>()
  let cancelled = false,
    settled = false
  const command = new PythonLanguageCommand({
    body: null,
    token: 'a'.repeat(64),
    retain() {},
    async send() {
      return new Response(
        new ReadableStream({
          pull() {
            entered.resolve()
          },
          async cancel() {
            cancelled = true
            await release.promise
          },
        }),
      )
    },
  })
  const running = command
    .run()
    .then(
      () => false,
      () => true,
    )
    .finally(() => {
      settled = true
    })
  await entered.promise
  await command.cancel()
  await tick()
  expect(cancelled).toBe(true)
  expect(settled).toBe(false)
  release.resolve()
  expect(await running).toBe(true)
})

it('cancels an oversized response instead of passing or retaining an unbounded body', async () => {
  let cancelled = 0
  const command = new PythonLanguageCommand({
    body: null,
    token: 'a'.repeat(64),
    retain() {},
    async send() {
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(PYTHON_LANGUAGE_LIMITS.maxResponseBytes + 1))
          },
          cancel() {
            cancelled++
          },
        }),
      )
    },
  })
  await expect(command.run()).rejects.toThrow('Language response too large')
  expect(cancelled).toBe(1)
})

function fixture(stage: Stage = 'none', legacy = false) {
  const probe = sandboxProbe(stage),
    database = new Database(':memory:'),
    background: Promise<unknown>[] = [],
    tasks: Promise<Response>[] = []
  if (legacy) {
    database.exec(
      'CREATE TABLE leases (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, token TEXT NOT NULL, created_ms INTEGER NOT NULL, used_ms INTEGER NOT NULL, phase TEXT NOT NULL, cleanup_ms INTEGER NOT NULL)',
    )
    database
      .query("INSERT INTO leases VALUES (?, 'old-project', 'old-token', ?, ?, 'reserved', 0)")
      .run('c'.repeat(32), Date.now(), Date.now())
  }
  const ctx = {
    storage: {
      sql: {
        exec(sql: string, ...values: (string | number | null)[]) {
          const rows = database.query(sql).all(...values)
          return { toArray: () => rows, one: () => rows[0] }
        },
      },
      async setAlarm() {},
      async deleteAlarm() {},
    },
    blockConcurrencyWhile(callback: () => Promise<unknown>) {
      return callback()
    },
    waitUntil(promise: Promise<unknown>) {
      background.push(promise)
    },
  }
  const env = {
    INTERNAL_TOKEN: 'test-private-token',
    PythonLanguageSandbox: { sandbox: probe.sandbox },
    PythonLanguageOwner: {
      getByName: (_name: string): InstanceType<typeof PythonLanguageOwner> => owner,
    },
    LANGUAGE_OPEN_LIMIT: {
      async limit() {
        return { success: true }
      },
    },
    LANGUAGE_COMMAND_LIMIT: {
      async limit() {
        return { success: true }
      },
    },
  }
  const owner = new PythonLanguageOwner(
    ctx as unknown as ConstructorParameters<typeof PythonLanguageOwner>[0],
    env as unknown as ConstructorParameters<typeof PythonLanguageOwner>[1],
  )
  const calls: string[] = []
  let reservationGate: ReturnType<typeof deferred<void>> | undefined
  const reserved = deferred<void>()
  const provider = createPythonLanguageHttpProvider({
    authorization: async (projectId) => analysisAuthorization(projectId),
    async request(input, init) {
      const suffix = String(input).replace('/api/studio/python-language', '') || '/open'
      calls.push(`${init?.method} ${suffix}`)
      const inputBody = init?.body ? JSON.parse(String(init.body)) : null
      const trustedBinding = inputBody
        ? await studioPythonAnalysisBinding('a'.repeat(64), inputBody.authorization)
        : null
      const request = new Request(
        `https://service.test/v1/python-language/${'a'.repeat(64)}${suffix}`,
        {
          method: init?.method,
          headers: {
            authorization: `Bearer ${env.INTERNAL_TOKEN}`,
            'content-type': 'application/json',
            ...(trustedBinding ? { 'x-studio-python-binding': trustedBinding } : {}),
            ...(inputBody?.command ? { 'x-studio-python-operation': inputBody.command.kind } : {}),
          },
          body: inputBody
            ? JSON.stringify(
                suffix === '/open'
                  ? { projectId: inputBody.authorization.subject.id, binding: trustedBinding }
                  : suffix.endsWith('/start')
                    ? { binding: trustedBinding }
                    : inputBody.command,
              )
            : undefined,
        },
      )
      const server = worker
        .fetch(request, env as unknown as Parameters<typeof worker.fetch>[1])
        .then(async (response) => {
          if (suffix === '/open' && reservationGate) {
            reserved.resolve()
            await reservationGate.promise
          }
          return Response.json({
            transportVersion: 1,
            status: response.status,
            body: await response.json(),
          })
        })
      tasks.push(server)
      return new Promise<Response>((resolve, reject) => {
        const abort = () => reject(init?.signal?.reason)
        if (init?.signal?.aborted) {
          abort()
          return
        }
        init?.signal?.addEventListener('abort', abort, { once: true })
        void server
          .then(resolve, reject)
          .then(() => init?.signal?.removeEventListener('abort', abort))
      })
    },
  })
  return {
    owner,
    probe,
    provider,
    calls,
    tasks,
    reserved,
    database,
    rehydrate() {
      return new PythonLanguageOwner(
        ctx as unknown as ConstructorParameters<typeof PythonLanguageOwner>[0],
        env as unknown as ConstructorParameters<typeof PythonLanguageOwner>[1],
      )
    },
    rows: () =>
      database.query('SELECT id,phase FROM leases').all() as { id: string; phase: string }[],
    holdReservation() {
      reservationGate = deferred<void>()
      return reservationGate
    },
    async finish() {
      probe.gate.resolve()
      await Promise.allSettled([...tasks, ...background])
      database.close()
    },
  }
}

it('classifies startup failure for operations while hiding SDK environment and preserving cleanup', async () => {
  const env = fixture()
  const privateValue = 'private-process-environment-token'
  env.probe.sandbox.startProcess = async () => {
    throw Object.assign(new TypeError(`start is not a function ${privateValue}`), {
      code: 'PROCESS_ERROR',
      context: { env: { TOKEN: privateValue } },
    })
  }
  try {
    const reservation = await env.owner.open('project', binding)
    const payload = await reservation.json()
    if (
      !payload ||
      typeof payload !== 'object' ||
      !('sessionId' in payload) ||
      typeof payload.sessionId !== 'string'
    )
      throw new Error('Missing session reservation')
    const { sessionId } = payload
    const response = await env.owner.start(sessionId, binding)
    expect(response.status).toBe(503)
    expect(JSON.parse(response.headers.get('x-studio-language-startup-failure') ?? 'null')).toEqual(
      {
        stage: 'process',
        name: 'TypeError',
        code: 'PROCESS_ERROR',
        reason: 'missing-method',
      },
    )
    expect(await response.text()).not.toContain(privateValue)
    expect(response.headers.get('x-studio-language-startup-failure')).not.toContain(privateValue)
    expect(env.probe.trace).toEqual(['destroy'])
    expect(env.rows()).toEqual([])
  } finally {
    await env.finish()
  }
})

it('closes a reservation whose caller left before receiving its ID without starting a container', async () => {
  const env = fixture(),
    gate = env.holdReservation(),
    controller = new AbortController()
  try {
    const opening = env.provider.open({ projectId: 'project' }, controller.signal).then(
      () => false,
      () => true,
    )
    await env.reserved.promise
    expect(env.probe.trace).toEqual([])
    controller.abort()
    gate.resolve()
    expect(await opening).toBe(true)
    await tick()
    expect(env.rows()).toEqual([])
    expect(env.probe.trace).toEqual([])
    expect(env.calls.filter((call) => call.startsWith('DELETE'))).toHaveLength(1)
  } finally {
    gate.resolve()
    await env.finish()
  }
})

for (const stage of ['startProcess', 'port', 'configure', 'configure-create', 'health'] as const)
  it(`drains ${stage} before destroying a cancelled startup, even if the SDK ignores cancellation`, async () => {
    const env = fixture(stage),
      controller = new AbortController()
    try {
      const opening = env.provider.open({ projectId: 'project' }, controller.signal).then(
        () => false,
        () => true,
      )
      await env.probe.entered.promise
      controller.abort()
      expect(await opening).toBe(true)
      await tick()
      expect(env.rows()[0]?.phase).toBe('closing')
      expect(env.probe.trace).not.toContain('destroy')
      env.probe.gate.resolve()
      await Promise.allSettled(env.tasks)
      await tick()
      expect(env.rows()).toEqual([])
      expect(env.probe.trace.filter((item) => item === 'destroy')).toHaveLength(1)
      expect(env.probe.trace.at(-1)).toBe('destroy')
    } finally {
      await env.finish()
    }
  })

it('coalesces duplicate startup and cleanup without resurrecting a closed session', async () => {
  const env = fixture('port')
  try {
    const { sessionId } = (await (await env.owner.open('project', binding)).json()) as {
      sessionId: string
    }
    const first = env.owner.start(sessionId, binding),
      second = env.owner.start(sessionId, binding)
    await env.probe.entered.promise
    const close = env.owner.close(sessionId),
      duplicate = env.owner.close(sessionId)
    env.probe.gate.resolve()
    await Promise.all([first, second, close, duplicate])
    expect(env.probe.trace.filter((item) => item === 'startProcess')).toHaveLength(1)
    expect(env.probe.trace.filter((item) => item === 'destroy')).toHaveLength(1)
    expect(env.rows()).toEqual([])
    expect((await env.owner.start(sessionId, binding)).status).toBe(410)
  } finally {
    await env.finish()
  }
})

it('aborts and drains an in-flight SDK command before final destruction and rejects its late response', async () => {
  const env = fixture('command')
  try {
    const { sessionId } = (await (await env.owner.open('project', binding)).json()) as {
      sessionId: string
    }
    expect((await env.owner.start(sessionId, binding)).status).toBe(200)
    const pending = env.owner.command(
      sessionId,
      new Request('https://private/command', {
        method: 'POST',
        headers: { 'x-studio-python-operation': 'query' },
        body: '{}',
      }),
      binding,
    )
    await env.probe.entered.promise
    const closed = env.owner.close(sessionId)
    await tick()
    expect(env.probe.aborted()).toBe(true)
    expect(env.probe.trace).not.toContain('destroy')
    env.probe.gate.resolve()
    expect((await pending).status).toBe(410)
    expect((await closed).status).toBe(200)
    expect(env.probe.trace.at(-1)).toBe('destroy')
    expect(env.rows()).toEqual([])
  } finally {
    await env.finish()
  }
})

it('rejects a late success when Owner cancellation reaches RPC after the response', async () => {
  const env = fixture('command'),
    cancellation = deferred<void>(),
    controller = new AbortController()
  const create = env.probe.sandbox.createLanguageCommand.bind(env.probe.sandbox)
  env.probe.sandbox.createLanguageCommand = async (body, token) => {
    const handle = await create(body, token),
      cancel = handle.cancel.bind(handle)
    handle.cancel = async () => {
      await cancellation.promise
      await cancel()
    }
    return handle
  }
  try {
    const payload = await (await env.owner.open('project', binding)).json()
    if (
      !payload ||
      typeof payload !== 'object' ||
      !('sessionId' in payload) ||
      typeof payload.sessionId !== 'string'
    )
      throw new Error('Missing session reservation')
    const { sessionId } = payload
    expect((await env.owner.start(sessionId, binding)).status).toBe(200)
    const pending = env.owner.command(
      sessionId,
      new Request('https://private/command', {
        method: 'POST',
        headers: { 'x-studio-python-operation': 'query' },
        body: '{}',
        signal: controller.signal,
      }),
      binding,
    )
    await env.probe.entered.promise
    controller.abort()
    env.probe.gate.resolve()
    expect((await pending).status).toBe(410)
  } finally {
    cancellation.resolve()
    await env.finish()
  }
})

it('drains handle creation during close and never runs the late command', async () => {
  const env = fixture('create')
  try {
    const payload = await (await env.owner.open('project', binding)).json()
    if (
      !payload ||
      typeof payload !== 'object' ||
      !('sessionId' in payload) ||
      typeof payload.sessionId !== 'string'
    )
      throw new Error('Missing session reservation')
    const { sessionId } = payload
    expect((await env.owner.start(sessionId, binding)).status).toBe(200)
    const pending = env.owner.command(
      sessionId,
      new Request('https://private/command', {
        method: 'POST',
        headers: { 'x-studio-python-operation': 'query' },
        body: '{}',
      }),
      binding,
    )
    await env.probe.entered.promise
    const closed = env.owner.close(sessionId)
    await tick()
    expect(env.rows()[0]?.phase).toBe('closing')
    expect(env.probe.trace).not.toContain('destroy')
    env.probe.gate.resolve()
    expect((await pending).status).toBe(410)
    expect((await closed).status).toBe(200)
    expect(env.probe.trace).not.toContain('command')
    expect(env.probe.trace.at(-1)).toBe('destroy')
    expect(env.rows()).toEqual([])
  } finally {
    await env.finish()
  }
})

it('expires a lost reservation in thirty seconds without a paid container', async () => {
  const env = fixture()
  try {
    await env.owner.open('lost-response', binding)
    databaseExpire(env.database)
    await env.owner.alarm()
    expect(env.rows()).toEqual([])
    expect(env.probe.trace).toEqual([])
  } finally {
    await env.finish()
  }
})
function databaseExpire(database: Database) {
  database.query('UPDATE leases SET used_ms=?').run(Date.now() - 31_000)
}

it('persists context binding across owner restarts and rejects a different context before startup or source transfer', async () => {
  const f = fixture()
  try {
    const { sessionId } = (await (await f.owner.open('project', binding)).json()) as {
      sessionId: string
    }
    const owner = f.rehydrate()
    expect((await owner.start(sessionId, 'f'.repeat(64))).status).toBe(410)
    expect(f.probe.trace).toEqual([])
    expect(f.rows()).toEqual([{ id: sessionId, phase: 'reserved' }])
    expect((await owner.start(sessionId, binding)).status).toBe(200)
    const before = [...f.probe.trace]
    const used = f.database.query('SELECT used_ms FROM leases WHERE id=?').get(sessionId)
    expect(
      (
        await owner.command(
          sessionId,
          new Request('https://private/command', { method: 'POST', body: 'private source' }),
          'f'.repeat(64),
        )
      ).status,
    ).toBe(410)
    expect(f.probe.trace).toEqual(before)
    expect(f.database.query('SELECT used_ms FROM leases WHERE id=?').get(sessionId)).toEqual(used)
    expect(f.rows()[0]?.phase).toBe('ready')
    expect(
      (
        await owner.command(
          sessionId,
          new Request('https://private/command', {
            method: 'POST',
            headers: { 'x-studio-python-operation': 'query' },
            body: '{}',
          }),
          binding,
        )
      ).status,
    ).toBe(200)
    expect(f.probe.trace.at(-1)).toBe('command')
    await owner.close(sessionId)
  } finally {
    await f.finish()
  }
})

it('migrates legacy SQLite leases additively and idempotently; unbound leases only close or expire', async () => {
  const f = fixture('none', true)
  try {
    const owner = f.rehydrate()
    expect(f.database.query('SELECT binding FROM leases').get()).toEqual({ binding: null })
    expect(f.database.query('SELECT bootstrap FROM leases').get()).toEqual({ bootstrap: null })
    expect((await owner.start('c'.repeat(32), binding)).status).toBe(410)
    expect(
      (
        await owner.command(
          'c'.repeat(32),
          new Request('https://private/command', {
            method: 'POST',
            headers: { 'x-studio-python-operation': 'query' },
            body: '{}',
          }),
          binding,
        )
      ).status,
    ).toBe(410)
    expect(f.probe.trace).toEqual([])
    expect((await owner.close('c'.repeat(32))).status).toBe(200)
    expect(f.rows()).toEqual([])
    expect((await owner.open('new-project', binding)).status).toBe(200)
    expect((await owner.open('spoofed', '')).status).toBe(400)
    expect(f.probe.trace).toEqual([])
  } finally {
    await f.finish()
  }
})

it('pins verified metadata in the lease across restart and refuses a forged release before quota or startup', async () => {
  const f = fixture()
  try {
    const release = await providedPythonRelease()
    expect(
      (await f.owner.open('project', binding, { ...release, manifestSha256: '0'.repeat(64) }))
        .status,
    ).toBe(400)
    expect(f.rows()).toEqual([])
    const opened = (await (await f.owner.open('project', binding, release)).json()) as {
      sessionId: string
    }
    const stored = f.database.query('SELECT bootstrap FROM leases').get() as { bootstrap: string }
    expect(JSON.parse(stored.bootstrap)).toEqual({ protocolVersion: 1, runtimeRelease: release })
    expect(f.probe.trace).toEqual([])
    const owner = f.rehydrate()
    expect((await owner.start(opened.sessionId, binding)).status).toBe(200)
    expect(f.probe.configurations).toEqual([{ protocolVersion: 1, runtimeRelease: release }])
    expect(f.probe.trace).toEqual(['startProcess', 'port', 'configure', 'health'])
    await owner.close(opened.sessionId)
    const legacy = (await (await owner.open('legacy', binding)).json()) as { sessionId: string }
    expect(f.database.query('SELECT bootstrap FROM leases').get()).toEqual({ bootstrap: null })
    expect((await owner.start(legacy.sessionId, binding)).status).toBe(200)
    expect(f.probe.configurations.at(-1)).toEqual({ protocolVersion: 1 })
    await owner.close(legacy.sessionId)
  } finally {
    await f.finish()
  }
})

it('cancellation can reduce existing work after policy loss without renewing the paid lease', async () => {
  const f = fixture()
  try {
    const { sessionId } = (await (await f.owner.open('project', binding)).json()) as {
      sessionId: string
    }
    await f.owner.start(sessionId, binding)
    const aged = Date.now() - 290_000
    f.database.query('UPDATE leases SET used_ms=? WHERE id=?').run(aged, sessionId)
    const command = (kind: 'cancel' | 'query') =>
      new Request('https://private/command', {
        method: 'POST',
        headers: { 'x-studio-python-operation': kind },
        body: JSON.stringify({ version: 1, id: kind, kind, requestId: 'absent' }),
      })
    expect((await f.owner.command(sessionId, command('cancel'), binding)).status).toBe(200)
    expect(f.database.query('SELECT used_ms FROM leases WHERE id=?').get(sessionId)).toEqual({
      used_ms: aged,
    })
    expect((await f.owner.command(sessionId, command('query'), binding)).status).toBe(200)
    expect(
      (
        f.database.query('SELECT used_ms FROM leases WHERE id=?').get(sessionId) as {
          used_ms: number
        }
      ).used_ms,
    ).toBeGreaterThan(aged)
    await f.owner.close(sessionId)
  } finally {
    await f.finish()
  }
})

import { expect, spyOn, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import type { LiveWorkspaceView } from '@sistemazero/core/live'
import { StudioPythonAnalysisAuthorizationSchema } from '@sistemazero/core/studio/python-language-authorization'
import { StudioLiveRuntimeRequestSchema } from '@sistemazero/core/studio/runtime-authorization'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { createContextualPythonLanguageProvider } from '../../studio/src/python/language/contextProvider'
import { pythonEnvironmentFixture } from '../../studio/src/state/fixtures/pythonEnvironment'
import { useLiveStudioRuntime } from '../src/components/live/use-live-studio-runtime'
import { liveStudioAnalysisContext, requestLiveStudioRuntime } from '../src/lib/live/studio-runtime'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
type Input = Parameters<typeof useLiveStudioRuntime>[0]
function intercept(handler: (...args: Parameters<typeof fetch>) => Promise<Response>) {
  return spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(handler, { preconnect: globalThis.fetch.preconnect }),
  )
}
async function setup() {
  const fixture = await pythonEnvironmentFixture('pro')
  const userId = crypto.randomUUID()
  const project = { ...fixture.project, id: crypto.randomUUID() }
  let current: LiveWorkspaceView = {
    id: project.id,
    sessionId: crypto.randomUUID(),
    learnerId: userId,
    revision: 0,
    writerId: userId,
    writerEpoch: 1,
    writerDeviceId: crypto.randomUUID(),
    leaseExpiresAt: new Date(Date.now() + 30_000).toISOString(),
    project,
    assistance: null,
    updatedAt: new Date().toISOString(),
  }
  const input: Input = {
    project,
    userId,
    enabled: true,
    leaseExpiresAt: current.leaseExpiresAt,
    context: {
      kind: 'live',
      workspaceId: current.id,
      sessionId: current.sessionId,
      blockId: crypto.randomUUID(),
      deviceId: current.writerDeviceId ?? '',
      writerEpoch: 1,
    },
    queue: { current: Promise.resolve() },
    current: () => current,
  }
  async function response(raw: unknown) {
    const request = StudioLiveRuntimeRequestSchema.parse(raw)
    return Response.json({
      version: 1,
      actor: { userId, accountId: userId },
      context: request.context,
      workspaceRevision: request.expectedWorkspaceRevision,
      baselineId: 'b'.repeat(64),
      projectId: request.subject.id,
      revision: request.revision,
      subjectSha256: await sha256Hex(canonicalJson(request.subject)),
      runtime: project.runtime,
      releaseStatus: 'active',
      operation: request.operation,
      capabilities: ['edit', 'execute', 'export-source', 'python-repl'],
      grantedExtensionIds: [],
      catalog: fixture.environment.catalog,
      blockIds: ['py_print'],
      curation: {},
      frame: {
        url: `https://runtime.test/v1/runtimes/${project.runtime.manifestSha256}/frame.html`,
        allowedOrigins: ['https://runtime.test'],
      },
      issuedAt: 1_000_000,
      expiresAt: 1_030_000,
    })
  }
  return {
    input,
    project,
    response,
    update(change: Partial<LiveWorkspaceView>) {
      current = { ...current, ...change }
    },
  }
}
async function settle(predicate: () => boolean) {
  for (let attempt = 0; attempt < 100 && !predicate(); attempt++)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5))
    })
  expect(predicate()).toBe(true)
}

test('native analysis captures a committed revision, releases the journal on authorization and waits for startup outside it', async () => {
  const f = await setup()
  if (!f.input.context) throw new Error('Missing context')
  const scope = new AbortController()
  const commit = Promise.withResolvers<void>()
  const started = Promise.withResolvers<void>()
  const native = Promise.withResolvers<void>()
  f.input.queue.current = commit.promise.then(() => f.update({ revision: 1 }))
  const language = liveStudioAnalysisContext({
    ...f.input,
    context: f.input.context,
    signal: scope.signal,
  })
  const revisions: number[] = []
  const provider = createContextualPythonLanguageProvider({
    initialProject: f.project,
    project: () => f.project,
    ...language,
    signal: scope.signal,
    request: async (url, init) => {
      if (init?.method === 'DELETE') return Response.json({ closed: true })
      const input = JSON.parse(String(init?.body))
      const authorization = StudioPythonAnalysisAuthorizationSchema.parse(input.authorization)
      if (authorization.context.kind !== 'live') throw new Error('Missing live context')
      revisions.push(authorization.context.expectedWorkspaceRevision)
      if (String(url).endsWith('/start')) {
        started.resolve()
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('{"transportVersion":1,'))
              void native.promise.then(() => {
                controller.enqueue(new TextEncoder().encode('"status":200,"body":{"ready":true}}'))
                controller.close()
              })
            },
          }),
        )
      }
      return Response.json({
        transportVersion: 1,
        status: 200,
        body: { version: 1, projectId: f.project.id, sessionId: 'a'.repeat(32) },
      })
    },
  })
  let ready = false
  const opening = provider
    .open({ projectId: f.project.id }, new AbortController().signal)
    .then((connection) => {
      ready = true
      return connection
    })
  await Promise.resolve()
  expect(revisions).toEqual([])
  commit.resolve()
  await started.promise
  const saved = f.input.queue.current.then(() => f.update({ revision: 2 }))
  f.input.queue.current = saved
  await saved
  expect(ready).toBe(false)
  expect(revisions).toEqual([1, 1])
  expect(language.context().expectedWorkspaceRevision).toBe(2)
  native.resolve()
  const connection = await opening
  expect(ready).toBe(true)
  scope.abort()
  connection.close()
  await expect(
    connection.send(
      { version: 1, id: 'late', kind: 'cancel', requestId: 'none' },
      new AbortController().signal,
    ),
  ).rejects.toThrow()
})
function mount() {
  let state: ReturnType<typeof useLiveStudioRuntime> | undefined
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  function Probe(input: Input) {
    state = useLiveStudioRuntime(input)
    return null
  }
  return {
    state: () => {
      if (!state) throw new Error('Not mounted')
      return state
    },
    render: (input: Input) =>
      act(async () => {
        root.render(<Probe {...input} />)
      }),
    close: async () => {
      await act(async () => root.unmount())
      container.remove()
    },
  }
}

test('live permission reads wait for commits and capture their revision before later queued saves', async () => {
  const f = await setup()
  if (!f.input.context) throw new Error('Missing context')
  const commit = Promise.withResolvers<void>()
  f.input.queue.current = commit.promise.then(() => {
    f.update({ revision: 1 })
  })
  const response = Promise.withResolvers<Response>()
  const sent = Promise.withResolvers<void>()
  let body: unknown
  const fetch = intercept(async (_url, init) => {
    body = JSON.parse(String(init?.body))
    sent.resolve()
    return response.promise
  })
  try {
    const operation = requestLiveStudioRuntime({
      ...f.input,
      context: f.input.context,
      candidate: {
        subject: studioRuntimeSubject(f.project),
        revision: 'a'.repeat(64),
        operation: 'execute',
      },
      signal: new AbortController().signal,
    })
    let saved = false
    const nextSave = f.input.queue.current.then(() => {
      saved = true
      f.update({ revision: 2 })
    })
    expect(fetch).not.toHaveBeenCalled()
    commit.resolve()
    await sent.promise
    expect(StudioLiveRuntimeRequestSchema.parse(body).expectedWorkspaceRevision).toBe(1)
    expect(saved).toBe(false)
    response.resolve(await f.response(body))
    await expect(operation).resolves.toMatchObject({ workspaceRevision: 1 })
    await nextSave
    expect(saved).toBe(true)
  } finally {
    fetch.mockRestore()
  }
})

test('live source/autosave/lease renewal preserve the interpreter; observer and expiry abort it', async () => {
  const f = await setup()
  const fetch = intercept(async (_url, init) => f.response(JSON.parse(String(init?.body))))
  const view = mount()
  const original = JSON.stringify(f.input.project)
  try {
    await view.render({ ...f.input, enabled: false })
    expect(fetch).not.toHaveBeenCalled()
    await view.render(f.input)
    await settle(() => !!view.state().environment)
    const environment = view.state().environment
    f.update({ revision: 4 })
    await view.render({
      ...f.input,
      project: { ...f.input.project, name: 'Edição preservada' },
      leaseExpiresAt: new Date(Date.now() + 45_000).toISOString(),
    })
    expect(view.state().environment).toBe(environment)
    expect(fetch).toHaveBeenCalledTimes(1)
    await view.render({ ...f.input, enabled: false })
    expect(environment?.signal?.aborted).toBe(true)
    expect(view.state().environment).toBeUndefined()
    await view.render(f.input)
    await settle(() => !!view.state().environment)
    const renewed = view.state().environment
    await view.render({ ...f.input, leaseExpiresAt: new Date(0).toISOString() })
    expect(renewed?.signal?.aborted).toBe(true)
    expect(view.state().environment).toBeUndefined()
    expect(view.state().error).toContain('expirou')
    expect(JSON.stringify(f.input.project)).toBe(original)
  } finally {
    await view.close()
    fetch.mockRestore()
  }
})

test.each([
  ['writer', { writerId: 'another-writer' }],
  ['device', { writerDeviceId: 'another-device' }],
  ['epoch', { writerEpoch: 2 }],
  ['access', { readOnly: true }],
  ['lease', { leaseExpiresAt: new Date(0).toISOString() }],
] satisfies [
  string,
  Partial<LiveWorkspaceView>,
][])('a pending runtime response cannot authorize after %s changes or block subsequent saves', async (_reason, change) => {
  const f = await setup()
  if (!f.input.context) throw new Error('Missing context')
  const pending = Promise.withResolvers<Response>()
  const sent = Promise.withResolvers<unknown>()
  const fetch = intercept(async (_url, init) => {
    sent.resolve(JSON.parse(String(init?.body)))
    return pending.promise
  })
  try {
    const operation = requestLiveStudioRuntime({
      ...f.input,
      context: f.input.context,
      candidate: {
        subject: studioRuntimeSubject(f.project),
        revision: 'a'.repeat(64),
        operation: 'execute',
      },
      signal: new AbortController().signal,
    })
    const outcome = operation.then(
      () => null,
      (error: unknown) => error,
    )
    const body = await sent.promise
    f.update(change)
    pending.resolve(await f.response(body))
    expect(await outcome).toMatchObject({ code: 'LIVE_AUTHORITY_CHANGED', status: 409 })
    await expect(f.input.queue.current.then(() => 'save remains possible')).resolves.toBe(
      'save remains possible',
    )
  } finally {
    pending.resolve(new Response('{}'))
    fetch.mockRestore()
  }
})

test('explicit authority invalidation aborts immediately while a runtime response is pending', async () => {
  const f = await setup()
  const pending = Promise.withResolvers<Response>()
  const sent = Promise.withResolvers<unknown>()
  let calls = 0
  const fetch = intercept(async (_url, init) => {
    const body: unknown = JSON.parse(String(init?.body))
    if (++calls === 1) return f.response(body)
    sent.resolve(body)
    return pending.promise
  })
  const view = mount()
  try {
    await view.render(f.input)
    await settle(() => !!view.state().environment)
    const environment = view.state().environment
    if (!environment?.authorize) throw new Error('Expected authority')
    const outcome = environment
      .authorize({
        project: f.project,
        operation: 'execute',
        revision: 'a'.repeat(64),
        signal: new AbortController().signal,
      })
      .then(
        () => null,
        (error: unknown) => error,
      )
    const body = await sent.promise
    await act(async () => view.state().invalidate())
    expect(environment.signal?.aborted).toBe(true)
    expect(view.state().environment).toBeUndefined()
    pending.resolve(await f.response(body))
    expect(await outcome).toBeInstanceOf(Error)
    await f.input.queue.current
    expect(view.state().environment).toBeUndefined()
  } finally {
    pending.resolve(new Response('{}'))
    await view.close()
    fetch.mockRestore()
  }
})

test('an observer opens analysis without a lease and cannot dispatch execution or REPL', async () => {
  const f = await setup()
  f.update({
    writerId: crypto.randomUUID(),
    writerDeviceId: crypto.randomUUID(),
    leaseExpiresAt: null,
  })
  const fetch = intercept(async (_url, init) => {
    const body = await (await f.response(JSON.parse(String(init?.body)))).json()
    return Response.json({ ...body, capabilities: [] })
  })
  const view = mount()
  try {
    await view.render({ ...f.input, enabled: false, observe: true, leaseExpiresAt: null })
    await settle(() => !!view.state().environment)
    const environment = view.state().environment
    expect(environment?.access(f.project).grantedCapabilities).toEqual([])
    await view.render({
      ...f.input,
      enabled: false,
      observe: true,
      leaseExpiresAt: new Date(0).toISOString(),
    })
    expect(view.state().environment).toBe(environment)
    expect(environment?.signal?.aborted).toBe(false)
    if (!f.input.context) throw new Error('Missing context')
    for (const operation of ['execute', 'python-repl'] as const) {
      await expect(
        requestLiveStudioRuntime({
          ...f.input,
          context: f.input.context,
          candidate: {
            subject: studioRuntimeSubject(f.project),
            operation,
            revision: 'a'.repeat(64),
          },
          access: 'observer',
          signal: new AbortController().signal,
        }),
      ).rejects.toThrow('autoria mudou')
    }
    expect(fetch).toHaveBeenCalledTimes(1)
  } finally {
    await view.close()
    fetch.mockRestore()
  }
})

test('late response after writer handoff cannot restore authority and a non-JSON denial revokes it', async () => {
  const f = await setup()
  const pending = Promise.withResolvers<Response>()
  let body: unknown
  let deny = false
  let calls = 0
  const fetch = intercept(async (_url, init) => {
    body = JSON.parse(String(init?.body))
    calls++
    return deny
      ? new Response('Forbidden', { status: 403 })
      : calls === 1
        ? pending.promise
        : f.response(body)
  })
  const view = mount()
  try {
    await view.render(f.input)
    await settle(() => body !== undefined)
    await view.render({ ...f.input, enabled: false })
    await act(async () => {
      pending.resolve(await f.response(body))
      await f.input.queue.current
    })
    expect(view.state().environment).toBeUndefined()
    expect(view.state().loading).toBe(false)
    await view.render(f.input)
    await settle(() => !!view.state().environment)
    const environment = view.state().environment
    const authorize = environment?.authorize
    if (!environment || !authorize) throw new Error('Expected authority')
    deny = true
    await act(async () => {
      await expect(
        authorize({
          project: f.project,
          operation: 'execute',
          revision: 'a'.repeat(64),
          signal: new AbortController().signal,
        }),
      ).rejects.toThrow()
    })
    expect(environment.signal?.aborted).toBe(true)
    expect(view.state().environment).toBeUndefined()
    expect(view.state().error).toContain('acesso mudou')
  } finally {
    await view.close()
    fetch.mockRestore()
  }
})

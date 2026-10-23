import { expect, spyOn, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { StudioFreeRuntimeRequestSchema } from '@sistemazero/core/studio/runtime-authorization'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { createEmptyProject } from '../../studio/src/core/project'
import { pythonEnvironmentFixture } from '../../studio/src/state/fixtures/pythonEnvironment'
import { useFreeStudioRuntime } from '../src/components/studio/use-free-runtime'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
type Input = Parameters<typeof useFreeStudioRuntime>[0]
type Pending = { body: unknown; signal: AbortSignal; resolve(response: Response): void }
function intercept() {
  const requests: Pending[] = []
  const original = globalThis.fetch
  const fetch = spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((resolve) => {
          expect(_url.toString()).toBe('/api/studio/free-runtime')
          requests.push({ body: JSON.parse(String(init?.body)), signal: init!.signal!, resolve })
        }),
      { preconnect: original.preconnect },
    ),
  )
  return { requests, fetch }
}
async function settle(predicate: () => boolean) {
  for (let attempt = 0; attempt < 100 && !predicate(); attempt++)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5))
    })
  expect(predicate()).toBe(true)
}
function mount() {
  let current: ReturnType<typeof useFreeStudioRuntime>
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  function Probe(input: Input) {
    current = useFreeStudioRuntime(input)
    return null
  }
  return {
    current: () => current!,
    render: (input: Input) => act(async () => root.render(<Probe {...input} />)),
    close: async () => {
      await act(async () => root.unmount())
      container.remove()
    },
  }
}
async function response(
  fixture: Awaited<ReturnType<typeof pythonEnvironmentFixture>>,
  body: unknown,
  viewerId: string,
) {
  const input = StudioFreeRuntimeRequestSchema.parse(body)
  return Response.json({
    version: 1,
    actor: { userId: viewerId, accountId: viewerId },
    context: input.context,
    projectId: input.subject.id,
    revision: input.revision,
    subjectSha256: await sha256Hex(canonicalJson(input.subject)),
    runtime: fixture.project.runtime,
    releaseStatus: 'active',
    operation: input.operation,
    capabilities: ['edit', 'export-source'],
    grantedExtensionIds: [],
    catalog: fixture.environment.catalog,
    blockIds: ['py_print'],
    curation: { pythonLevel: 3 },
    frame: {
      url: `https://runtime.test/v1/runtimes/${fixture.project.runtime.manifestSha256}/frame.html`,
      allowedOrigins: ['https://runtime.test'],
    },
    issuedAt: 1_000_000,
    expiresAt: 1_030_000,
  })
}

test('free runtime excludes JS, missing profiles and contextual/disabled hosts', async () => {
  const fixture = await pythonEnvironmentFixture('classic')
  const f = intercept()
  const view = mount()
  try {
    for (const input of [
      { project: createEmptyProject('js', 'JS'), viewerId: 'child' },
      { project: fixture.project, viewerId: null },
      { project: fixture.project, viewerId: 'child', enabled: false },
    ]) {
      await view.render(input)
      expect(view.current().loading).toBe(false)
      expect(view.current().environment).toBeUndefined()
    }
    expect(f.requests).toEqual([])
  } finally {
    await view.close()
    f.fetch.mockRestore()
  }
})

test('free source edits and autosave retain the interpreter; denial aborts it while source stays intact', async () => {
  const fixture = await pythonEnvironmentFixture('classic')
  const viewerId = crypto.randomUUID()
  const f = intercept()
  const view = mount()
  try {
    await view.render({ project: fixture.project, viewerId })
    await settle(() => f.requests.length === 1)
    await act(async () =>
      f.requests[0]!.resolve(await response(fixture, f.requests[0]!.body, viewerId)),
    )
    await settle(() => !!view.current().environment)
    const environment = view.current().environment!
    const edited = { ...fixture.project, updatedAt: 123, name: 'Editado' }
    await view.render({ project: edited, viewerId })
    expect(view.current().environment).toBe(environment)
    expect(f.requests.length).toBe(1)
    const before = JSON.stringify(edited)
    const controller = new AbortController()
    const denied = environment.authorize!({
      project: edited,
      operation: 'execute',
      revision: 'a'.repeat(64),
      signal: controller.signal,
    }).then(
      () => ({ unexpected: 'allowed' }),
      (error: unknown) => error,
    )
    await settle(() => f.requests.length === 2)
    await act(async () => {
      f.requests[1]!.resolve(Response.json({ error: { code: 'ACCESS_DENIED' } }, { status: 403 }))
      expect(await denied).toMatchObject({ status: 403 })
    })
    await settle(() => !!view.current().error)
    expect(environment.signal?.aborted).toBe(true)
    expect(view.current().environment).toBeUndefined()
    expect(JSON.stringify(edited)).toBe(before)
  } finally {
    await view.close()
    f.fetch.mockRestore()
  }
})

test('A to B to A cancels old profile grants without resurfacing stale authority', async () => {
  const fixture = await pythonEnvironmentFixture('classic')
  const a = crypto.randomUUID(),
    b = crypto.randomUUID()
  const f = intercept()
  const view = mount()
  try {
    await view.render({ project: fixture.project, viewerId: a })
    await settle(() => f.requests.length === 1)
    await view.render({ project: fixture.project, viewerId: b })
    await settle(() => f.requests.length === 2)
    await view.render({ project: fixture.project, viewerId: a })
    await settle(() => f.requests.length === 3)
    expect(f.requests[0]!.signal.aborted).toBe(true)
    expect(f.requests[1]!.signal.aborted).toBe(true)
    await act(async () => {
      f.requests[0]!.resolve(await response(fixture, f.requests[0]!.body, a))
      f.requests[1]!.resolve(await response(fixture, f.requests[1]!.body, b))
    })
    expect(view.current().environment).toBeUndefined()
    await act(async () => f.requests[2]!.resolve(await response(fixture, f.requests[2]!.body, a)))
    await settle(() => !!view.current().environment)
    const environment = view.current().environment!
    await view.render({ project: { ...fixture.project, id: 'other-project' }, viewerId: a })
    expect(environment.signal?.aborted).toBe(true)
    expect(view.current().environment).toBeUndefined()
  } finally {
    await view.close()
    f.fetch.mockRestore()
  }
})

test('free Python analysis carries the document session through open, start and close', async () => {
  const fixture = await pythonEnvironmentFixture('pro')
  const viewerId = crypto.randomUUID()
  const sessionId = crypto.randomUUID()
  const originalURL = location.href
  const browserWindow = window as unknown as { happyDOM: { setURL(url: string): void } }
  browserWindow.happyDOM.setURL('https://kids.test/estudio')
  const meta = document.createElement('meta')
  meta.name = 'sz-session'
  meta.content = sessionId
  document.head.append(meta)
  const calls: { url: string; method: string; session: string | null }[] = []
  const originalFetch = globalThis.fetch
  const fetch = spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(
      async (url: RequestInfo | URL, init?: RequestInit) => {
        const path = url.toString()
        if (path === '/api/studio/free-runtime')
          return response(fixture, JSON.parse(String(init?.body)), viewerId)
        const session = new Headers(init?.headers).get('x-sz-session')
        calls.push({ url: path, method: init?.method ?? 'GET', session })
        if (session !== sessionId)
          return Response.json({ error: { code: 'SESSION_CHANGED' } }, { status: 409 })
        if (path === '/api/studio/python-language')
          return Response.json({
            transportVersion: 1,
            status: 201,
            body: { version: 1, sessionId: 'a'.repeat(32), projectId: fixture.project.id },
          })
        if (path.endsWith('/start'))
          return Response.json({ transportVersion: 1, status: 200, body: { ready: true } })
        if (init?.method === 'DELETE') return new Response(null, { status: 204 })
        throw new Error('Unexpected analysis request')
      },
      { preconnect: originalFetch.preconnect },
    ),
  )
  const view = mount()
  try {
    await view.render({ project: fixture.project, viewerId })
    await settle(() => !!view.current().environment)
    const provider = view.current().environment!.createPythonLanguage!(() => fixture.project)
    const connection = await provider.open(
      { projectId: fixture.project.id },
      new AbortController().signal,
    )
    expect(calls.map((call) => call.method)).toEqual(['POST', 'POST'])
    meta.content = crypto.randomUUID()
    connection.close()
    await settle(() => calls.length === 3)
    expect(calls.map((call) => call.method)).toEqual(['POST', 'POST', 'DELETE'])
    expect(calls.every((call) => call.session === sessionId)).toBe(true)
    expect(calls[2]!.url).toBe(`/api/studio/python-language/${'a'.repeat(32)}`)
  } finally {
    await view.close()
    fetch.mockRestore()
    meta.remove()
    browserWindow.happyDOM.setURL(originalURL)
  }
})

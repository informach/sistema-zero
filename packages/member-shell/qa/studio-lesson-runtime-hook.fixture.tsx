import { expect, spyOn, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { StudioPythonAnalysisAuthorizationSchema } from '@sistemazero/core/studio/python-language-authorization'
import { StudioLessonRuntimeRequestSchema } from '@sistemazero/core/studio/runtime-authorization'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { createEmptyProject } from '../../studio/src/core/project'
import { pythonEnvironmentFixture } from '../../studio/src/state/fixtures/pythonEnvironment'
import { useLessonRuntime } from '../src/components/studio/use-lesson-runtime'

if (typeof document === 'undefined') GlobalRegistrator.register({ url: 'https://kids.test/' })
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

type Input = Parameters<typeof useLessonRuntime>[0]
function intercept(handler: (...args: Parameters<typeof fetch>) => Promise<Response>) {
  const original = globalThis.fetch
  return spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(handler, { preconnect: original.preconnect }),
  )
}
const scope = {
  userId: '11111111-1111-4111-8111-111111111111',
  lessonId: '22222222-2222-4222-8222-222222222222',
  blockId: '33333333-3333-4333-8333-333333333333',
  baselineId: 'b'.repeat(64),
  offline: false,
}

async function settle(predicate: () => boolean) {
  for (let attempt = 0; attempt < 100 && !predicate(); attempt++)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5))
    })
  expect(predicate()).toBe(true)
}

function mount() {
  let current: ReturnType<typeof useLessonRuntime> | undefined
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  function Probe(input: Input) {
    current = useLessonRuntime(input)
    return (
      <output>
        {current.error ?? (current.environment ? 'ready' : current.loading ? 'loading' : 'idle')}
      </output>
    )
  }
  return {
    current: () => current!,
    render: async (input: Input) => {
      await act(async () => {
        root.render(<Probe {...input} />)
      })
    },
    close: async () => {
      await act(async () => root.unmount())
      container.remove()
    },
  }
}

async function response(
  fixture: Awaited<ReturnType<typeof pythonEnvironmentFixture>>,
  body: unknown,
) {
  const input = StudioLessonRuntimeRequestSchema.parse(body)
  return Response.json({
    version: 1,
    actor: { userId: scope.userId, accountId: scope.userId },
    context: {
      kind: 'lesson',
      lessonId: scope.lessonId,
      blockId: scope.blockId,
      baselineId: input.baselineId,
    },
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
    curation: { pythonLevel: 2 },
    frame: {
      url: `https://runtime.test/v1/runtimes/${fixture.project.runtime.manifestSha256}/frame.html`,
      allowedOrigins: ['https://runtime.test'],
    },
    issuedAt: 1_000_000,
    expiresAt: 1_030_000,
  })
}

test('JavaScript, unbound lessons and offline buffers never request a Python environment', async () => {
  const fixture = await pythonEnvironmentFixture('classic')
  const fetch = spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected request'))
  const view = mount()
  try {
    for (const input of [
      { ...scope, project: createEmptyProject('js', 'Meu jogo') },
      { ...scope, project: fixture.project, baselineId: undefined },
      { ...scope, project: fixture.project, userId: undefined },
      { ...scope, project: fixture.project, offline: true },
    ]) {
      await view.render(input)
      expect(view.current().loading).toBe(false)
      expect(view.current().environment).toBeUndefined()
    }
    expect(fetch).not.toHaveBeenCalled()
  } finally {
    await view.close()
    fetch.mockRestore()
  }
})

test('changing the original lesson baseline aborts pending admission and ignores its late response', async () => {
  const fixture = await pythonEnvironmentFixture('classic')
  const requests: { body: unknown; signal: AbortSignal; resolve: (result: Response) => void }[] = []
  const fetch = intercept(
    (_url, init) =>
      new Promise<Response>((resolve) => {
        expect(_url.toString()).toContain(
          `/lessons/${scope.lessonId}/blocks/${scope.blockId}/studio-runtime`,
        )
        requests.push({ body: JSON.parse(String(init?.body)), signal: init!.signal!, resolve })
      }),
  )
  const view = mount()
  const original = JSON.stringify(fixture.project)
  try {
    await view.render({ ...scope, project: fixture.project })
    await settle(() => requests.length === 1)
    await view.render({ ...scope, baselineId: 'c'.repeat(64), project: fixture.project })
    await settle(() => requests.length === 2)
    expect(requests[0]!.signal.aborted).toBe(true)
    await act(async () => {
      requests[1]!.resolve(await response(fixture, requests[1]!.body))
    })
    await settle(() => !!view.current().environment)
    const environment = view.current().environment!
    await act(async () => {
      requests[0]!.resolve(await response(fixture, requests[0]!.body))
    })
    expect(view.current().environment).toBe(environment)
    await view.render({ ...scope, project: fixture.project, offline: true })
    expect(view.current().environment).toBeUndefined()
    expect(environment.access(fixture.project).grantedCapabilities).toEqual([])
    expect(JSON.stringify(fixture.project)).toBe(original)
  } finally {
    await view.close()
    fetch.mockRestore()
  }
})

test('retry after an authorization error preserves the lesson source and releases authority on unmount', async () => {
  const fixture = await pythonEnvironmentFixture('pro')
  const original = JSON.stringify(fixture.project)
  let count = 0
  const fetch = intercept(async (_url, init) => {
    if (++count === 1)
      return Response.json(
        { error: { code: 'RUNTIME_UNAVAILABLE', message: 'Ambiente indisponível.' } },
        { status: 503 },
      )
    return response(fixture, JSON.parse(String(init?.body)))
  })
  const view = mount()
  try {
    await view.render({ ...scope, project: fixture.project })
    await settle(() => !!view.current().error)
    expect(view.current().error).toBe('Ambiente indisponível.')
    await act(async () => view.current().retry())
    await settle(() => !!view.current().environment)
    const environment = view.current().environment!
    expect(count).toBe(2)
    expect(JSON.stringify(fixture.project)).toBe(original)
    await view.close()
    expect(environment.access(fixture.project).grantedCapabilities).toEqual([])
  } finally {
    fetch.mockRestore()
  }
})

test('a later contextual refusal removes the environment and an explicit retry creates a fresh authority', async () => {
  const fixture = await pythonEnvironmentFixture('classic')
  let deny = false
  const fetch = intercept(async (_url, init) =>
    deny
      ? Response.json({ error: { code: 'DENIED', message: 'Acesso encerrado.' } }, { status: 403 })
      : response(fixture, JSON.parse(String(init?.body))),
  )
  const view = mount()
  try {
    await view.render({ ...scope, project: fixture.project })
    await settle(() => !!view.current().environment)
    const previous = view.current().environment!
    deny = true
    await act(async () => {
      await expect(
        previous.authorize!({
          project: fixture.project,
          operation: 'execute',
          revision: 'c'.repeat(64),
          signal: new AbortController().signal,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })
    expect(previous.signal?.aborted).toBe(true)
    expect(view.current().environment).toBeUndefined()
    expect(view.current().error).toBe(
      'Seu acesso mudou. O projeto continua salvo. Tente reabrir o ambiente.',
    )
    deny = false
    await act(async () => view.current().retry())
    await settle(() => !!view.current().environment)
    expect(view.current().environment).not.toBe(previous)
    expect(view.current().environment!.signal?.aborted).toBe(false)
    expect(previous.access(fixture.project).grantedCapabilities).toEqual([])
  } finally {
    await view.close()
    fetch.mockRestore()
  }
})

test('lesson analysis carries the document session through open, start, cancel and close', async () => {
  const fixture = await pythonEnvironmentFixture('pro')
  const meta = document.createElement('meta')
  meta.name = 'sz-session'
  meta.content = 'lesson-document-session'
  document.head.append(meta)
  const calls: { path: string; method?: string; session: string | null }[] = []
  const fetch = intercept(async (url, init) => {
    const path = String(url)
    if (!path.startsWith('/api/studio/python-language'))
      return response(fixture, JSON.parse(String(init?.body)))
    const session = new Headers(init?.headers).get('x-sz-session')
    calls.push({ path, method: init?.method, session })
    if (session !== 'lesson-document-session')
      return Response.json({ error: { code: 'SESSION_CHANGED' } }, { status: 409 })
    if (init?.method === 'DELETE') return Response.json({ closed: true })
    const body = JSON.parse(String(init?.body))
    const authorization = StudioPythonAnalysisAuthorizationSchema.parse(body.authorization)
    expect(authorization.context).toEqual({
      kind: 'lesson',
      lessonId: scope.lessonId,
      blockId: scope.blockId,
      baselineId: scope.baselineId,
    })
    expect(authorization.subject.id).toBe(fixture.project.id)
    return Response.json({
      transportVersion: 1,
      status: 200,
      body: path.endsWith('/start')
        ? { ready: true }
        : body.command
          ? { version: 1, id: body.command.id }
          : { version: 1, projectId: fixture.project.id, sessionId: 'a'.repeat(32) },
    })
  })
  const view = mount()
  try {
    await view.render({ ...scope, project: fixture.project })
    await settle(() => !!view.current().environment)
    const environment = view.current().environment!
    const provider = environment.createPythonLanguage?.(() => fixture.project)
    if (!provider) throw new Error('Expected the real lesson analysis provider')
    const outcome = await provider
      .open({ projectId: fixture.project.id }, new AbortController().signal)
      .then(
        (connection) => ({ connection }),
        (error) => ({ error }),
      )
    expect(calls[0]?.session).toBe('lesson-document-session')
    if (!('connection' in outcome)) throw outcome.error
    await outcome.connection.send(
      { version: 1, id: 'cancel-query', kind: 'cancel', requestId: 'query' },
      new AbortController().signal,
    )
    // A replaced page marker must not silently change the document's identity.
    meta.content = 'other-session'
    await view.close()
    await settle(() => calls.some((call) => call.method === 'DELETE'))
    outcome.connection.close()
    expect(calls.map((call) => call.method)).toEqual(['POST', 'POST', 'POST', 'DELETE'])
    expect(calls.every((call) => call.session === 'lesson-document-session')).toBe(true)
    expect(environment.signal?.aborted).toBe(true)
  } finally {
    await view.close()
    fetch.mockRestore()
    meta.remove()
  }
})

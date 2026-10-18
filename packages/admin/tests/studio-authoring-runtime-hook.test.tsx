import { expect, spyOn, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { StudioAuthoringRuntimeRequestSchema } from '@sistemazero/core/studio/runtime-authorization'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { createEmptyProject } from '../../studio/src/core/project'
import { pythonEnvironmentFixture } from '../../studio/src/state/fixtures/pythonEnvironment'
import {
  type StudioAuthoringRuntimeScope,
  useStudioAuthoringRuntime,
} from '../src/components/studio/use-studio-authoring-runtime'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const scope: StudioAuthoringRuntimeScope = {
  userId: '11111111-1111-4111-8111-111111111111',
  context: {
    kind: 'authoring',
    lessonId: '22222222-2222-4222-8222-222222222222',
    draftRevision: '33333333-3333-4333-8333-333333333333',
    blockId: null,
    purpose: 'authoring',
  },
}
function intercept(handler: (...args: Parameters<typeof fetch>) => Promise<Response>) {
  return spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(handler, { preconnect: globalThis.fetch.preconnect }),
  )
}
async function settle(predicate: () => boolean) {
  for (let attempt = 0; attempt < 100 && !predicate(); attempt++)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5))
    })
  expect(predicate()).toBe(true)
}
function mount() {
  let current: ReturnType<typeof useStudioAuthoringRuntime> | undefined
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  type Input = {
    project: Parameters<typeof useStudioAuthoringRuntime>[0]
    scope?: StudioAuthoringRuntimeScope
  }
  function Probe(input: Input) {
    current = useStudioAuthoringRuntime(input.project, input.scope)
    return null
  }
  return {
    current: () => current!,
    render: async (input: Input) => {
      await act(async () => root.render(<Probe {...input} />))
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
  const input = StudioAuthoringRuntimeRequestSchema.parse(body)
  return Response.json({
    version: 1,
    actor: { userId: scope.userId, accountId: scope.userId },
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
    curation: {},
    frame: {
      url: `https://runtime.test/v1/runtimes/${fixture.project.runtime.manifestSha256}/frame.html`,
      allowedOrigins: ['https://runtime.test'],
    },
    issuedAt: 1_000_000,
    expiresAt: 1_030_000,
  })
}

test('source edits preserve the interpreter authority; changing the draft retires it', async () => {
  const fixture = await pythonEnvironmentFixture('classic')
  const calls: unknown[] = []
  const fetch = intercept(async (url, init) => {
    expect(url.toString()).toBe('/api/members/studio/authoring-runtime')
    const body: unknown = JSON.parse(String(init?.body))
    calls.push(body)
    return response(fixture, body)
  })
  const view = mount()
  try {
    await view.render({ project: fixture.project, scope })
    await settle(() => !!view.current().environment)
    const first = view.current().environment!
    const edited = structuredClone(fixture.project)
    if (edited.kind !== 'classic') throw new Error('Expected the classic fixture')
    edited.files['main.py'] = 'print("novo código")'
    await view.render({ project: edited, scope: structuredClone(scope) })
    expect(view.current().environment).toBe(first)
    expect(first.signal?.aborted).toBe(false)
    expect(calls.length).toBe(1)
    await view.render({
      project: edited,
      scope: {
        ...scope,
        context: { ...scope.context, draftRevision: '44444444-4444-4444-8444-444444444444' },
      },
    })
    expect(first.signal?.aborted).toBe(true)
    await settle(() => !!view.current().environment)
    expect(view.current().environment).not.toBe(first)
    expect(calls.length).toBe(2)
    expect(edited.files['main.py']).toBe('print("novo código")')
  } finally {
    await view.close()
    fetch.mockRestore()
  }
})

test('JavaScript and missing authoring context do not start Python; late responses cannot restore removed authority', async () => {
  const fixture = await pythonEnvironmentFixture('pro')
  const requests: { signal: AbortSignal; body: unknown; resolve: (value: Response) => void }[] = []
  const fetch = intercept(
    (_url, init) =>
      new Promise<Response>((resolve) => {
        requests.push({ signal: init!.signal!, body: JSON.parse(String(init?.body)), resolve })
      }),
  )
  const view = mount()
  try {
    await view.render({ project: createEmptyProject('js', 'Projeto'), scope })
    await view.render({ project: fixture.project })
    expect(view.current().loading).toBe(false)
    expect(requests.length).toBe(0)
    await view.render({ project: fixture.project, scope })
    await settle(() => requests.length === 1)
    await view.render({ project: fixture.project })
    expect(requests[0]!.signal.aborted).toBe(true)
    await act(async () => requests[0]!.resolve(await response(fixture, requests[0]!.body)))
    expect(view.current().environment).toBeUndefined()
  } finally {
    await view.close()
    fetch.mockRestore()
  }
})

test('a non-JSON 403 retires authority and retry creates a fresh one without changing source', async () => {
  const fixture = await pythonEnvironmentFixture('pro')
  const before = JSON.stringify(fixture.project)
  let deny = false
  const fetch = intercept(async (_url, init) =>
    deny
      ? new Response('Forbidden', { status: 403 })
      : response(fixture, JSON.parse(String(init?.body))),
  )
  const view = mount()
  try {
    await view.render({ project: fixture.project, scope })
    await settle(() => !!view.current().environment)
    const first = view.current().environment!
    deny = true
    await act(async () => {
      await expect(
        first.authorize!({
          project: fixture.project,
          operation: 'execute',
          revision: 'a'.repeat(64),
          signal: new AbortController().signal,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })
    expect(first.signal?.aborted).toBe(true)
    expect(view.current().environment).toBeUndefined()
    expect(view.current().error).toContain('rascunho mudou')
    deny = false
    await act(async () => view.current().retry())
    await settle(() => !!view.current().environment)
    expect(view.current().environment).not.toBe(first)
    expect(JSON.stringify(fixture.project)).toBe(before)
  } finally {
    await view.close()
    fetch.mockRestore()
  }
})

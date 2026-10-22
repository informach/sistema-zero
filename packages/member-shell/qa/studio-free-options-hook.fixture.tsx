import { expect, spyOn, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { PYTHON_PROGRAMMING_CODECS } from '../../studio/src/python/blocks/catalog'
import { pythonEnvironmentFixture } from '../../studio/src/state/fixtures/pythonEnvironment'
import { useFreeStudioOptions } from '../src/components/studio/use-free-options'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
async function settle(predicate: () => boolean) {
  for (let i = 0; i < 100 && !predicate(); i++)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5))
    })
  expect(predicate()).toBe(true)
}
function mount() {
  let current: ReturnType<typeof useFreeStudioOptions>
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  function Probe({
    id,
    enabled,
    audience,
  }: {
    id: string | null
    enabled: boolean
    audience: 'kids' | 'adult'
  }) {
    current = useFreeStudioOptions(id, enabled, audience)
    return null
  }
  return {
    current: () => current!,
    render: (id: string | null, enabled = true, audience: 'kids' | 'adult' = 'kids') =>
      act(async () => root.render(<Probe id={id} enabled={enabled} audience={audience} />)),
    close: async () => {
      await act(async () => root.unmount())
      container.remove()
    },
  }
}
async function options() {
  const fixture = await pythonEnvironmentFixture('classic')
  return {
    legacyJavaScript: true,
    canCreatePro: true,
    canCreateJavaScript: true,
    canCreatePython: true,
    pythonGrantedExtensionIds: ['python-turtle'],
    pythonCuration: {
      pythonLevel: 3,
      allowedModes: ['blocks', 'bridge', 'code'],
      allowLevelReveal: false,
    },
    catalog: {
      version: 1,
      catalog: fixture.environment.catalog,
      releases: [
        {
          runtime: fixture.project.runtime,
          status: 'active',
          proTemplateIds: ['python-blank'],
          blockIds: ['sz_py_pass'],
          categoryIds: ['python-basics'],
        },
      ],
    },
  }
}

test('disabled Python discovery makes no request or offer, including retry and profile changes', async () => {
  const raw = await options()
  const original = globalThis.fetch
  const fetch = spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(async () => Response.json(raw), { preconnect: original.preconnect }),
  )
  const view = mount()
  try {
    await view.render('student', false)
    await act(async () => view.current().retry())
    await view.render('staff', false)
    expect(fetch).not.toHaveBeenCalled()
    expect(view.current().creation).toBeUndefined()
    expect(view.current().loading).toBe(false)
    expect(view.current().error).toBeUndefined()
    expect(view.current().unavailable).toBe(false)
    await expect(view.current().authorizeImport({}, new AbortController().signal)).rejects.toThrow(
      'perfil',
    )
    expect(fetch).not.toHaveBeenCalled()

    await view.render('admin', true)
    await settle(() => !!view.current().creation)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(
      view
        .current()
        .creation?.environments.map(({ kind }) => kind)
        .sort(),
    ).toEqual(['classic', 'pro'])

    await view.render('admin', false)
    await act(async () => view.current().retry())
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(view.current().creation).toBeUndefined()
    expect(view.current().loading).toBe(false)
    expect(view.current().error).toBeUndefined()
    expect(view.current().unavailable).toBe(false)
  } finally {
    await view.close()
    fetch.mockRestore()
  }
})

test('free import rechecks Python eligibility even after initial discovery allowed creation', async () => {
  const raw = await options()
  const fixture = await pythonEnvironmentFixture('pro')
  const original = globalThis.fetch
  const fetch = spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(async () => Response.json(raw), { preconnect: original.preconnect }),
  )
  const view = mount()
  try {
    await view.render(crypto.randomUUID())
    await settle(() => !!view.current().creation)
    raw.canCreatePython = false
    await expect(
      view.current().authorizeImport(fixture.project, new AbortController().signal),
    ).rejects.toThrow('Python')
    expect(fetch).toHaveBeenCalledTimes(2)
  } finally {
    await view.close()
    fetch.mockRestore()
  }
})

test('free discovery rechecks retirement at creation and cannot reuse an old profile response', async () => {
  const raw = await options()
  const pending: { signal: AbortSignal; resolve(response: Response): void }[] = []
  const original = globalThis.fetch
  const fetch = spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((resolve) => {
          expect(_url.toString()).toBe('/api/studio/free-options')
          pending.push({ signal: init!.signal!, resolve })
        }),
      { preconnect: original.preconnect },
    ),
  )
  const view = mount()
  try {
    await view.render('a')
    await settle(() => pending.length === 1)
    await act(async () => pending[0]!.resolve(Response.json(raw)))
    await settle(() => !!view.current().creation)
    const old = view.current().creation!
    const result = old.prepare({ kind: 'classic', environmentKey: old.environments[0]!.key }).then(
      () => 'allowed',
      (error: unknown) => error,
    )
    await settle(() => pending.length === 2)
    const retired = structuredClone(raw)
    retired.catalog.releases[0]!.status = 'retired'
    await act(async () => {
      pending[1]!.resolve(Response.json(retired))
      expect(await result).toBeInstanceOf(Error)
    })
    expect(view.current().creation?.environments).toEqual([])
    await view.render('b')
    await settle(() => pending.length === 3)
    await view.render('a')
    await settle(() => pending.length === 4)
    expect(pending[2]!.signal.aborted).toBe(true)
    await act(async () => pending[2]!.resolve(Response.json(raw)))
    expect(view.current().creation).toBeUndefined()
    await act(async () => pending[3]!.resolve(Response.json(raw)))
    await settle(() => !!view.current().creation)
    await expect(
      old.prepare({ kind: 'classic', environmentKey: old.environments[0]!.key }),
    ).rejects.toThrow('perfil')
    await view.render('a', false)
    expect(view.current().creation).toBeUndefined()
    expect(pending[3]!.signal.aborted).toBe(true)
  } finally {
    await view.close()
    fetch.mockRestore()
  }
})

test('failed discovery exposes an explicit retry and then restores Python choices', async () => {
  const raw = await options()
  let attempts = 0
  const original = globalThis.fetch
  const fetch = spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(
      async () =>
        ++attempts === 1
          ? Response.json({ error: { code: 'UPSTREAM_ERROR' } }, { status: 503 })
          : Response.json(raw),
      { preconnect: original.preconnect },
    ),
  )
  const view = mount()
  try {
    await view.render('child')
    await settle(() => !!view.current().error)
    expect(view.current().loading).toBe(false)
    expect(view.current().unavailable).toBe(false)
    expect(view.current().creation).toBeUndefined()
    await act(async () => view.current().retry())
    await settle(() => !!view.current().creation)
    expect(attempts).toBe(2)
    expect(view.current().error).toBeUndefined()
    expect(view.current().creation?.environments.length).toBe(2)
  } finally {
    await view.close()
    fetch.mockRestore()
  }
})

test('course grants are discarded on profile and audience changes, including late replies', async () => {
  const granted = await options()
  const empty = structuredClone(granted)
  empty.pythonGrantedExtensionIds = []
  empty.catalog.releases[0]!.blockIds = []
  const pending: { signal: AbortSignal; resolve(response: Response): void }[] = []
  const original = globalThis.fetch
  const fetch = spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((resolve) => pending.push({ signal: init!.signal!, resolve })),
      { preconnect: original.preconnect },
    ),
  )
  const view = mount()
  try {
    await view.render('first')
    await settle(() => pending.length === 1)
    await act(async () => pending[0]!.resolve(Response.json(granted)))
    await settle(() => !!view.current().creation)
    expect(view.current().creation?.environments[0]?.context.grantedExtensionIds).toEqual([
      'python-turtle',
    ])
    await view.render('second')
    await settle(() => pending.length === 2)
    expect(view.current().creation).toBeUndefined()
    await view.render('second', true, 'adult')
    await settle(() => pending.length === 3)
    expect(pending[1]!.signal.aborted).toBe(true)
    await act(async () => pending[1]!.resolve(Response.json(granted)))
    expect(view.current().creation).toBeUndefined()
    await act(async () => pending[2]!.resolve(Response.json(empty)))
    await settle(() => !!view.current().creation)
    const context = view.current().creation?.environments[0]?.context
    expect(context?.grantedExtensionIds).toEqual([])
    expect(context?.authoringBlockIds).toEqual([])
  } finally {
    await view.close()
    fetch.mockRestore()
  }
})

test('example port performs fresh authenticated Pro/Turtle approval and preserves the exact owner/subject', async () => {
  const raw = await options()
  const fixture = await pythonEnvironmentFixture('pro')
  const candidate = {
    ...fixture.project,
    installedExtensions: [{ id: 'python-turtle', version: '1.0.0', installedAt: Date.now() }],
  }
  const viewerId = crypto.randomUUID()
  const accountId = crypto.randomUUID()
  let allowTurtle = false
  let approvals = 0
  let reads = 0
  const original = globalThis.fetch
  const fetch = spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(
      async (url: RequestInfo | URL, init?: RequestInit) => {
        if (url.toString() === '/api/studio/free-options') {
          reads++
          return Response.json(raw)
        }
        expect(url.toString()).toBe('/api/studio/free-runtime')
        const request = JSON.parse(String(init?.body))
        expect(init?.method).toBe('POST')
        expect(init?.signal?.aborted).toBe(false)
        expect(request.subject.kind).toBe('pro')
        expect(request.subject.mode).toBe('code')
        expect(request.subject.installedExtensions).toEqual([
          { id: 'python-turtle', version: '1.0.0' },
        ])
        approvals++
        const now = Date.now()
        return Response.json({
          version: 1,
          actor: { userId: viewerId, accountId },
          context: request.context,
          projectId: request.subject.id,
          revision: request.revision,
          subjectSha256: await sha256Hex(canonicalJson(request.subject)),
          runtime: request.subject.runtime,
          releaseStatus: 'active',
          operation: request.operation,
          capabilities: ['edit'],
          grantedExtensionIds: allowTurtle ? ['python-turtle'] : [],
          catalog: fixture.environment.catalog,
          blockIds: ['sz_py_pass'],
          curation: raw.pythonCuration,
          frame: {
            url: 'https://runtime.test/frame.html',
            allowedOrigins: ['https://runtime.test'],
          },
          issuedAt: now,
          expiresAt: now + 30_000,
        })
      },
      { preconnect: original.preconnect },
    ),
  )
  const view = mount()
  try {
    await view.render(viewerId)
    await settle(() => !!view.current().creation)
    const port = view.current().creation!
    await expect(port.authorizeExample(candidate, new AbortController().signal)).rejects.toThrow(
      'acesso mudou',
    )
    allowTurtle = true
    await port.authorizeExample(candidate, new AbortController().signal)
    expect(approvals).toBe(2)
    expect(reads).toBe(3)
    if (candidate.kind !== 'pro') throw new Error('Expected Pro fixture')
    const editing = {
      ...candidate,
      tree: {
        ...candidate.tree,
        'requirements.txt': { kind: 'file' as const, content: '# Em edição\n' },
      },
    }
    const original = structuredClone(editing)
    await view.current().authorizeImport(editing, new AbortController().signal)
    expect(approvals).toBe(3)
    expect(reads).toBe(4)
    expect(editing).toEqual(original)
    await view.render(crypto.randomUUID())
    await expect(port.authorizeExample(candidate, new AbortController().signal)).rejects.toThrow(
      'perfil',
    )
    expect(approvals).toBe(3)
  } finally {
    await view.close()
    fetch.mockRestore()
  }
})

test('example port forwards captured authoring requirements to the final Classic decision', async () => {
  const raw = await options()
  const fixture = await pythonEnvironmentFixture('classic')
  const approved = PYTHON_PROGRAMMING_CODECS.map(({ id }) => id)
  raw.catalog.releases[0]!.blockIds = [...approved]
  const viewerId = crypto.randomUUID()
  const accountId = crypto.randomUUID()
  const requirements = {
    requiredBlockIds: ['sz_py_class'],
    requiredModes: ['blocks', 'bridge'] as ('blocks' | 'bridge')[],
  }
  let revoke = true
  let approvals = 0
  const original = globalThis.fetch
  const fetch = spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(
      async (url: RequestInfo | URL, init?: RequestInit) => {
        if (url.toString() === '/api/studio/free-options') {
          // Revocation does not change this older discovery response. A caller's
          // mutable requirements cannot change during its asynchronous fetch.
          requirements.requiredBlockIds.length = 0
          return Response.json(raw)
        }
        expect(url.toString()).toBe('/api/studio/free-runtime')
        const request = JSON.parse(String(init?.body))
        expect(request.subject.kind).toBe('classic')
        approvals++
        const now = Date.now()
        return Response.json({
          version: 1,
          actor: { userId: viewerId, accountId },
          context: request.context,
          projectId: request.subject.id,
          revision: request.revision,
          subjectSha256: await sha256Hex(canonicalJson(request.subject)),
          runtime: request.subject.runtime,
          releaseStatus: 'active',
          operation: request.operation,
          capabilities: ['edit'],
          grantedExtensionIds: [],
          catalog: fixture.environment.catalog,
          blockIds: revoke ? approved.filter((id) => id !== 'sz_py_class') : approved,
          curation: raw.pythonCuration,
          frame: {
            url: 'https://runtime.test/frame.html',
            allowedOrigins: ['https://runtime.test'],
          },
          issuedAt: now,
          expiresAt: now + 30_000,
        })
      },
      { preconnect: original.preconnect },
    ),
  )
  const view = mount()
  try {
    await view.render(viewerId)
    await settle(() => !!view.current().creation)
    requirements.requiredBlockIds.push('sz_py_class')
    const port = view.current().creation!
    await expect(
      port.authorizeExample(fixture.project, new AbortController().signal, requirements),
    ).rejects.toThrow('autoria')
    expect(requirements.requiredBlockIds).toEqual([])
    revoke = false
    await port.authorizeExample(fixture.project, new AbortController().signal, {
      requiredBlockIds: ['sz_py_class'],
      requiredModes: ['blocks', 'bridge'],
    })
    expect(approvals).toBe(2)
  } finally {
    await view.close()
    fetch.mockRestore()
  }
})

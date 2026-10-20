import { expect, spyOn, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
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
  function Probe({ id, enabled }: { id: string | null; enabled: boolean }) {
    current = useFreeStudioOptions(id, enabled)
    return null
  }
  return {
    current: () => current!,
    render: (id: string | null, enabled = true) =>
      act(async () => root.render(<Probe id={id} enabled={enabled} />)),
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
          blockIds: ['py_print'],
          categoryIds: ['python-basics'],
        },
      ],
    },
  }
}

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
          blockIds: ['py_print'],
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
    await view.render(crypto.randomUUID())
    await expect(port.authorizeExample(candidate, new AbortController().signal)).rejects.toThrow(
      'perfil',
    )
    expect(approvals).toBe(2)
  } finally {
    await view.close()
    fetch.mockRestore()
  }
})

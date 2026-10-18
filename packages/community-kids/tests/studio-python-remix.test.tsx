import { afterAll, afterEach, expect, mock, spyOn, test } from 'bun:test'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { StudioFreeRuntimeRequestSchema } from '@sistemazero/core/studio/runtime-authorization'
import { pythonRemixCapabilities } from '@sistemazero/member-shell/lib/studio-python-remix'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import { StrictMode } from 'react'
import { toast } from 'sonner'
import { createEmptyProject } from '../../studio/src/core/project'
import { projectPublicationId } from '../../studio/src/core/projectPublication'
import { pythonEnvironmentFixture } from '../../studio/src/state/fixtures/pythonEnvironment'
import { listAllProjects } from '../../studio/src/state/persistence'
import { getProjectStorageScope } from '../../studio/src/state/projectStorageRuntime'
import { loadSanitizedProjectById } from '../../studio/src/state/projectStore'
import type { HubThreadView } from '../src/lib/types'

const navigation = { ...(await import('next/navigation')) }
const push = mock(() => {})
mock.module('next/navigation', () => ({
  ...navigation,
  useRouter: () => ({ push, replace() {}, refresh() {}, back() {} }),
}))
const { KidsSpaceViewClient } = await import('../src/components/kids/kids-space-view-client')
const originalFetch = globalThis.fetch
const idbDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory(), configurable: true })
afterAll(() => {
  mock.module('next/navigation', () => navigation)
  if (idbDescriptor) Object.defineProperty(globalThis, 'indexedDB', idbDescriptor)
  else Reflect.deleteProperty(globalThis, 'indexedDB')
})
afterEach(() => {
  cleanup()
  globalThis.fetch = originalFetch
  mock.restore()
  push.mockClear()
})

async function setup(kind: 'classic' | 'pro' = 'classic') {
  const f = await pythonEnvironmentFixture(kind)
  if (f.project.kind === 'classic') f.project.publication = { playId: crypto.randomUUID() }
  else f.project.proMeta.publication = { playId: crypto.randomUUID() }
  const viewerId = crypto.randomUUID()
  const options = {
    legacyJavaScript: true,
    canCreatePro: true,
    pythonCuration: {
      pythonLevel: 3,
      allowedModes: ['blocks', 'bridge', 'code'],
      allowLevelReveal: false,
    },
    catalog: {
      version: 1,
      catalog: f.environment.catalog,
      releases: [
        {
          runtime: f.project.runtime,
          status: 'active',
          proTemplateIds: ['python-blank'],
          blockIds: ['py_print'],
          categoryIds: ['python-basics'],
        },
      ],
    },
  }
  const thread: HubThreadView = {
    id: 'game',
    version: 1,
    channelId: 'wall',
    authorId: crypto.randomUUID(),
    authorProfileId: null,
    title: 'Jogo Python',
    slug: 'game',
    body: 'Meu jogo',
    isPinned: false,
    isLocked: false,
    status: 'visible',
    pending: false,
    commentCount: 0,
    isShowcase: true,
    authorDisplayName: 'Bia',
    authorPublic: false,
    coverImageUrl: null,
    playId: crypto.randomUUID(),
    challengeKey: null,
    reactions: [],
    attachments: [],
    lastActivityAt: '2026-10-17T12:00:00Z',
    createdAt: '2026-10-17T12:00:00Z',
    editedAt: null,
    studioMeta: {
      pro: kind === 'pro',
      extensions: [],
      programmingLanguage: 'python',
      runtime: f.project.runtime,
    },
  }
  const requests: string[] = []
  let play = async () => Response.json(f.project)
  let discovery = async () => Response.json(options)
  let hubStatus = 200
  let hubLocked = false
  let authorization = async (init?: RequestInit) => {
    const input = StudioFreeRuntimeRequestSchema.parse(JSON.parse(String(init?.body)))
    const now = Date.now()
    return Response.json({
      version: 1,
      actor: { userId: viewerId, accountId: crypto.randomUUID() },
      context: input.context,
      projectId: input.subject.id,
      revision: input.revision,
      subjectSha256: await sha256Hex(canonicalJson(input.subject)),
      runtime: input.subject.runtime,
      releaseStatus: 'active',
      operation: input.operation,
      capabilities: ['edit', 'execute'],
      grantedExtensionIds: ['python-turtle'],
      catalog: f.environment.catalog,
      blockIds: ['py_print'],
      curation: options.pythonCuration,
      frame: { url: 'https://runtime.test/frame.html', allowedOrigins: ['https://runtime.test'] },
      issuedAt: now,
      expiresAt: now + 30_000,
    })
  }
  globalThis.fetch = Object.assign(
    mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input)
      requests.push(path)
      if (path === '/api/hub/spaces/mural')
        return hubStatus === 403
          ? Response.json({ error: { code: 'ACCESS_DENIED' } }, { status: 403 })
          : Response.json({
              id: 'space',
              slug: 'mural',
              name: 'Mural',
              description: '',
              iconUrl: null,
              audience: 'kids',
              locked: hubLocked,
              canInteract: true,
            })
      if (path === '/api/hub/spaces/mural/channels')
        return Response.json({
          items: [
            {
              id: 'wall',
              spaceId: 'space',
              slug: 'parede',
              name: 'Parede',
              topic: null,
              postingPolicy: 'staff_only',
              requiresApproval: false,
              hasUnread: false,
            },
          ],
        })
      if (path === '/api/hub/channels/wall/threads')
        return Response.json({ items: [thread], hasMore: false, nextCursor: null })
      if (path === `/api/studio/play/${thread.playId}`) return play()
      if (path === '/api/studio/free-options') return discovery()
      if (path === '/api/studio/free-runtime') return authorization(init)
      if (path === '/api/studio/remix') return Response.json({ ok: true })
      throw new Error(`Unexpected route ${path}`)
    }),
    { preconnect: originalFetch.preconnect },
  )
  const tier = { pro: true, allowedExtensions: [], python: await pythonRemixCapabilities(options) }
  const props = { slug: 'mural', viewerId, mode: 'wall' as const, remixTier: tier }
  return {
    ...f,
    viewerId,
    requests,
    props,
    options,
    denyHub: (locked: boolean) => {
      hubStatus = locked ? 200 : 403
      hubLocked = locked
    },
    discovery: (handler: typeof discovery) => {
      discovery = handler
    },
    play: (handler: typeof play) => {
      play = handler
    },
    authorize: (handler: typeof authorization) => {
      authorization = handler
    },
  }
}

for (const kind of ['classic', 'pro'] as const)
  test(`Mural imports a fresh Python ${kind} private copy in the viewer namespace, including StrictMode`, async () => {
    const f = await setup(kind)
    render(
      <StrictMode>
        <KidsSpaceViewClient {...f.props} />
      </StrictMode>,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Fazer a minha versão' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/estudio'))
    const copies = await listAllProjects(getProjectStorageScope(f.viewerId))
    expect(copies).toHaveLength(1)
    expect(copies[0]?.id).not.toBe(f.project.id)
    expect(copies[0]?.name).toBe('Remix de Jogo Python')
    expect(copies[0]?.programmingLanguage).toBe('python')
    expect(copies[0]?.kind).toBe(kind)
    const loaded = await loadSanitizedProjectById(copies[0]!.id, getProjectStorageScope(f.viewerId))
    if (loaded?.programmingLanguage !== 'python') throw new Error('Missing Python copy')
    expect(loaded.runtime).toEqual(f.project.runtime)
    expect(loaded.python).toEqual(f.project.python)
    expect(projectPublicationId(loaded)).toBeUndefined()
    if (loaded.kind === 'classic' && f.project.kind === 'classic')
      expect(loaded.files).toEqual(f.project.files)
    else if (loaded.kind === 'pro' && f.project.kind === 'pro')
      expect(loaded.tree).toEqual(f.project.tree)
    else throw new Error('Changed project kind')
    expect(f.requests).toContain('/api/studio/free-options')
    expect(f.requests).toContain('/api/studio/free-runtime')
    expect(f.requests).toContain('/api/studio/remix')
  })

test('an access denial after loading the Mural creates no project and does not navigate', async () => {
  const f = await setup()
  f.authorize(async () => Response.json({ error: { code: 'ACCESS_DENIED' } }, { status: 403 }))
  const error = spyOn(toast, 'error')
  render(<KidsSpaceViewClient {...f.props} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Fazer a minha versão' }))
  await waitFor(() => expect(error).toHaveBeenCalledTimes(1))
  expect(await listAllProjects(getProjectStorageScope(f.viewerId))).toEqual([])
  expect(push).not.toHaveBeenCalled()
})

test('legacy JavaScript remix keeps its source and does not request a Python permission', async () => {
  const f = await setup()
  const source = createEmptyProject('legacy-game', 'Jogo antigo')
  source.files['script.js'] = 'console.log("meu jogo")'
  f.play(async () => Response.json(source))
  render(<KidsSpaceViewClient {...f.props} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Fazer a minha versão' }))
  await waitFor(() => expect(push).toHaveBeenCalledWith('/estudio'))
  const copies = await listAllProjects(getProjectStorageScope(f.viewerId))
  expect(copies).toHaveLength(1)
  const copy = await loadSanitizedProjectById(copies[0]!.id, getProjectStorageScope(f.viewerId))
  expect(copy?.files).toEqual(source.files)
  expect(f.requests).not.toContain('/api/studio/free-options')
  expect(f.requests).not.toContain('/api/studio/free-runtime')
})

test('profile A→B→A during download cancels the old copy even if the transport returns later', async () => {
  const f = await setup()
  let finish!: (response: Response) => void
  f.play(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const error = spyOn(toast, 'error')
  const view = render(<KidsSpaceViewClient {...f.props} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Fazer a minha versão' }))
  await waitFor(() => expect(finish).toBeDefined())
  const second = crypto.randomUUID()
  view.rerender(<KidsSpaceViewClient {...f.props} viewerId={second} />)
  view.rerender(<KidsSpaceViewClient {...f.props} />)
  await act(async () => {
    finish(Response.json(f.project))
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  expect(await listAllProjects(getProjectStorageScope(f.viewerId))).toEqual([])
  expect(await listAllProjects(getProjectStorageScope(second))).toEqual([])
  expect(f.requests).not.toContain('/api/studio/free-runtime')
  expect(push).not.toHaveBeenCalled()
  expect(error).not.toHaveBeenCalled()
})

test('a session change while authorization is pending prevents import and late navigation', async () => {
  const f = await setup()
  let finish!: (response: Response) => void
  f.authorize(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const error = spyOn(toast, 'error')
  render(<KidsSpaceViewClient {...f.props} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Fazer a minha versão' }))
  await waitFor(() => expect(finish).toBeDefined())
  await act(async () => {
    window.dispatchEvent(new Event('sz:session-changed'))
    finish(Response.json({}))
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  expect(await listAllProjects(getProjectStorageScope(f.viewerId))).toEqual([])
  expect(push).not.toHaveBeenCalled()
  expect(error).not.toHaveBeenCalled()
})

for (const loss of ['all', 'pro', 'runtime'] as const)
  test(`losing ${loss} remix rights during discovery cancels that operation in the same profile`, async () => {
    const f = await setup('pro')
    let finish!: (response: Response) => void
    f.discovery(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const error = spyOn(toast, 'error')
    const success = spyOn(toast, 'success')
    const view = render(<KidsSpaceViewClient {...f.props} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Fazer a minha versão' }))
    await waitFor(() => expect(finish).toBeDefined())
    const remixTier =
      loss === 'all'
        ? null
        : { ...f.props.remixTier, ...(loss === 'pro' ? { pro: false } : { python: [] }) }
    view.rerender(<KidsSpaceViewClient {...f.props} remixTier={remixTier} />)
    await act(async () => {
      finish(Response.json(f.options))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(await listAllProjects(getProjectStorageScope(f.viewerId))).toEqual([])
    expect(f.requests).not.toContain('/api/studio/free-runtime')
    expect(f.requests).not.toContain('/api/studio/remix')
    expect(push).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
    expect(success).not.toHaveBeenCalled()
  })

test('equivalent refreshed remix rights preserve a pending operation', async () => {
  const f = await setup('pro')
  let finish!: (response: Response) => void
  f.discovery(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const view = render(<KidsSpaceViewClient {...f.props} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Fazer a minha versão' }))
  await waitFor(() => expect(finish).toBeDefined())
  view.rerender(<KidsSpaceViewClient {...f.props} remixTier={structuredClone(f.props.remixTier)} />)
  await act(async () => {
    finish(Response.json(f.options))
  })
  await waitFor(() => expect(push).toHaveBeenCalledWith('/estudio'))
  expect(await listAllProjects(getProjectStorageScope(f.viewerId))).toHaveLength(1)
})

for (const locked of [false, true])
  test(`Hub ${locked ? 'locked teaser' : 'HTTP 403'} received during remix cancels the prior discovery`, async () => {
    const f = await setup('pro')
    let finish!: (response: Response) => void
    f.discovery(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const success = spyOn(toast, 'success')
    const view = render(<KidsSpaceViewClient {...f.props} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Fazer a minha versão' }))
    await waitFor(() => expect(finish).toBeDefined())
    f.denyHub(locked)
    view.rerender(<KidsSpaceViewClient {...f.props} mode="forum" />)
    await screen.findByText('Ainda não liberado')
    await act(async () => {
      finish(Response.json(f.options))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(await listAllProjects(getProjectStorageScope(f.viewerId))).toEqual([])
    expect(f.requests).not.toContain('/api/studio/free-runtime')
    expect(f.requests).not.toContain('/api/studio/remix')
    expect(push).not.toHaveBeenCalled()
    expect(success).not.toHaveBeenCalled()
  })

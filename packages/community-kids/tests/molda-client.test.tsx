import { afterAll, afterEach, expect, mock, test } from 'bun:test'
import type { MoldaHostAdapter } from '@sistemazero/molda'
import { createModelAsset, type MoldaAsset } from '@sistemazero/molda/assets'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { type ReactNode, useState } from 'react'
import { handoffFixture, PROFILE_ID } from '../../pensa/src/components/pensa.fixture'
import { missionSessionFixture } from '../../ui/tests/mission-fixture'

const actualNavigation = await import('next/navigation')
const actualMolda = await import('@sistemazero/molda')
const actualPersonal = await import('@sistemazero/studio/personal-assets')
const namespaces: string[] = []
const originalFetch = globalThis.fetch
let query = new URLSearchParams()
let localAssets: MoldaAsset[] = []
afterEach(() => {
  globalThis.fetch = originalFetch
  query = new URLSearchParams()
  localAssets = []
})
/** O adapter que o host entregou ao último `<MoldaApp>` montado. */
let lastAdapter: MoldaHostAdapter | undefined
/** A biblioteca pessoal do Estúdio, falsa: o que existe e o que foi regravado. */
const personalRecords = new Map<string, { id: string }>()
const savedToStudio: Array<Record<string, unknown>> = []
const personalNamespaces: Array<string | undefined> = []
let personalSaveFailure: string | null = null

const router = {
  back: mock(() => {}),
  forward: mock(() => {}),
  refresh: mock(() => {}),
  push: mock(() => {}),
  replace: mock(() => {}),
  prefetch: mock(async () => {}),
}

function localPersistence(namespace: string) {
  return {
    namespace,
    loadAll: async () => localAssets,
    load: async (id: string) => localAssets.find((asset) => asset.id === id) ?? null,
    save: async () => {},
    saveMany: async () => {},
    remove: async () => {},
    removeMany: async () => {},
    subscribe: () => () => {},
    dispose: () => {},
  }
}

function ObservedMoldaApp({
  persistence,
  adapter,
  onWorkspaceChange,
}: {
  persistence?: object
  adapter?: MoldaHostAdapter
  onWorkspaceChange?: (active: boolean) => void
}): ReactNode {
  lastAdapter = adapter
  const [initialPersistence] = useState(persistence)
  // The public adapter consumes initialAssetId once per app instance.
  const [openedId, setOpenedId] = useState(adapter?.initialAssetId ?? null)
  const namespace = initialPersistence ? Reflect.get(initialPersistence, 'namespace') : undefined
  return (
    <>
      <output data-testid="molda-persistence">
        {typeof namespace === 'string'
          ? `local:${namespace}`
          : initialPersistence
            ? 'wrapped'
            : 'default'}
      </output>
      <output data-testid="molda-opened">{openedId ?? 'gallery'}</output>
      <button type="button" onClick={() => setOpenedId(null)}>
        Voltar à galeria
      </button>
      <button type="button" onClick={() => onWorkspaceChange?.(true)}>
        Abrir modelo de teste
      </button>
      <button type="button" onClick={() => onWorkspaceChange?.(false)}>
        Sair do modelo de teste
      </button>
    </>
  )
}

mock.module('next/navigation', () => ({
  ...actualNavigation,
  usePathname: () => '/molda',
  useRouter: () => router,
  useSearchParams: () => query,
}))

mock.module('@sistemazero/molda', () => ({
  ...actualMolda,
  MoldaApp: ObservedMoldaApp,
  setMoldaStorageNamespace: (namespace: string) => namespaces.push(namespace),
  createMoldaPersistence: ({ namespace = '' }: { namespace?: string } = {}) =>
    localPersistence(namespace),
  isMoldaAssetOpen: () => false,
  subscribeMoldaAssetOpenState: () => () => {},
}))

mock.module('@sistemazero/studio/personal-assets', () => ({
  ...actualPersonal,
  setPersonalAssetsNamespace: (namespace: string) => namespaces.push(`personal:${namespace}`),
  getPersonalAsset: async (id: string, options?: { namespace?: string }) => {
    personalNamespaces.push(options?.namespace)
    return personalRecords.get(id) ?? null
  },
  savePersonalAsset: async (input: Record<string, unknown>, options?: { namespace?: string }) => {
    personalNamespaces.push(options?.namespace)
    savedToStudio.push(input)
    if (personalSaveFailure) return { ok: false, error: personalSaveFailure }
    return { ok: true, name: String(input.name), updatedAt: 1 }
  },
}))

const { MoldaClient } = await import('../src/components/kids/molda-client')
const { FocusModeProvider, useFocusMode } = await import('../src/components/kids/focus-mode')

function NavProbe() {
  const { navCollapsed, toggleNav } = useFocusMode()
  return (
    <>
      <output data-testid="nav-collapsed">{String(navCollapsed)}</output>
      <button type="button" onClick={toggleNav}>
        Abrir menu de teste
      </button>
    </>
  )
}

test('o Molda comunica a abertura do modelo ao menu do shell', async () => {
  render(
    <FocusModeProvider viewerId="perfil-molda">
      <MoldaClient viewerId="perfil-molda" studioAvailable />
      <NavProbe />
    </FocusModeProvider>,
  )
  await screen.findByTestId('molda-opened')
  fireEvent.click(screen.getByRole('button', { name: 'Abrir menu de teste' }))
  expect(screen.getByTestId('nav-collapsed').textContent).toBe('false')
  fireEvent.click(screen.getByRole('button', { name: 'Abrir modelo de teste' }))
  expect(screen.getByTestId('nav-collapsed').textContent).toBe('true')
  fireEvent.click(screen.getByRole('button', { name: 'Sair do modelo de teste' }))
  expect(screen.getByTestId('nav-collapsed').textContent).toBe('false')
})

afterAll(() => {
  mock.module('next/navigation', () => actualNavigation)
  mock.module('@sistemazero/molda', () => actualMolda)
  mock.module('@sistemazero/studio/personal-assets', () => actualPersonal)
})

test('trocar de um perfil para o modo local nunca reutiliza a persistência espelhada anterior', async () => {
  const view = render(<MoldaClient viewerId="perfil-a" studioAvailable={false} />)
  await waitFor(() => expect(screen.getByTestId('molda-persistence').textContent).toBe('wrapped'))

  view.rerender(<MoldaClient viewerId={null} studioAvailable={false} />)

  await waitFor(() => expect(screen.getByTestId('molda-persistence').textContent).toBe('local:'))
  expect(namespaces.at(-1)).toBe('')
})

test('a volta da ponte só regrava a criação que JÁ está na biblioteca do Estúdio', async () => {
  personalSaveFailure = null
  render(<MoldaClient viewerId="perfil-b" studioAvailable />)
  await waitFor(() => expect(lastAdapter?.resyncToStudio).toBeDefined())
  const resync = lastAdapter?.resyncToStudio
  if (!resync) throw new Error('sem resyncToStudio')
  const asset = {
    id: 'm1',
    name: 'nave',
    kind: 'model3d' as const,
    dataUrl: 'data:model/gltf-binary;base64,AAAA',
    originalFileName: 'nave.glb',
    bytes: 3,
    thumbDataUrl: null,
  }
  // Nunca levada ao Estúdio ("Trazer do Molda" é a decisão explícita): nada é gravado.
  expect(await resync(asset)).toEqual({ updated: false, reason: 'not-linked' })
  expect(savedToStudio).toHaveLength(0)
  // Já está lá: salvar no Molda regrava com o kind, a origem e o nome do arquivo.
  personalRecords.set('m1', { id: 'm1' })
  expect(await resync(asset)).toEqual({ updated: true })
  expect(savedToStudio).toHaveLength(1)
  expect(savedToStudio[0]).toMatchObject({
    id: 'm1',
    name: 'nave',
    kind: 'model3d',
    origin: 'molda',
    originalFileName: 'nave.glb',
  })
  expect(personalNamespaces).toEqual(['perfil-b', 'perfil-b', 'perfil-b'])
  expect(namespaces).not.toContain('personal:perfil-b')

  personalSaveFailure = 'A biblioteca está cheia.'
  expect(await resync(asset)).toEqual({
    updated: false,
    reason: 'failed',
    error: 'A biblioteca está cheia.',
  })
})

function modelHandoff() {
  const handoff = handoffFixture()
  const session = missionSessionFixture()
  handoff.mission = {
    ...session.mission,
    kind: 'asset',
    destination: 'molda',
    assetSlotIds: session.assetSlots.map((slot) => slot.id),
  }
  handoff.progress = session.progress
  handoff.assetSlots = [{ ...session.assetSlots[0]!, name: 'Rocha', kind: 'model' }]
  return handoff
}

test('o guia reabre a criação associada ao slot depois de voltar à galeria', async () => {
  const asset = createModelAsset({ name: 'Rocha do plano' })
  localAssets = [asset]
  const handoff = modelHandoff()
  handoff.progress.deliveries = [
    {
      assetSlotId: handoff.assetSlots[0]!.id,
      creation: {
        tool: 'molda',
        profileId: PROFILE_ID,
        creationId: asset.id,
        saveRevision: '1',
        contentFingerprint: null,
      },
    },
  ]
  query = new URLSearchParams({ criacao: asset.id, missao: handoff.mission.id })
  globalThis.fetch = Object.assign(
    async (input: RequestInfo | URL) =>
      Response.json(String(input).includes('/pensa/') ? handoff : { items: [], serverNow: 1 }),
    { preconnect: originalFetch.preconnect },
  )
  render(<MoldaClient viewerId={PROFILE_ID} studioAvailable />)
  await waitFor(() => expect(screen.getByTestId('molda-opened').textContent).toBe(asset.id))
  for (let attempt = 0; attempt < 2; attempt++) {
    fireEvent.click(screen.getByRole('button', { name: 'Voltar à galeria' }))
    expect(screen.getByTestId('molda-opened').textContent).toBe('gallery')
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir Rocha' }))
    await waitFor(() => expect(screen.getByTestId('molda-opened').textContent).toBe(asset.id))
  }
})

test('o portão do posto chega ao adapter; sem ele, nada trancado', async () => {
  const access = {
    allow: ['model.pieces', 'paint.brush'],
    upcoming: [{ when: 'Abrem no nível Lenda', families: ['model.skin'] }],
  }
  const view = render(<MoldaClient viewerId={null} studioAvailable={false} toolAccess={access} />)
  await waitFor(() => expect(lastAdapter?.toolAccess).toEqual(access))
  view.rerender(<MoldaClient viewerId={null} studioAvailable={false} toolAccess={null} />)
  await waitFor(() => expect(lastAdapter && 'toolAccess' in lastAdapter).toBe(false))
})

test('o mesmo portão num objeto novo (outro render do servidor) não troca o adapter', async () => {
  const access = () => ({
    allow: ['model.pieces', 'paint.brush'],
    upcoming: [{ when: 'Abrem no nível Lenda', families: ['model.skin'] }],
  })
  const view = render(<MoldaClient viewerId={null} studioAvailable={false} toolAccess={access()} />)
  await waitFor(() => expect(lastAdapter?.toolAccess).toEqual(access()))
  const first = lastAdapter
  view.rerender(<MoldaClient viewerId={null} studioAvailable={false} toolAccess={access()} />)
  expect(lastAdapter).toBe(first)
  view.rerender(
    <MoldaClient
      viewerId={null}
      studioAvailable={false}
      toolAccess={{ ...access(), allow: ['model.pieces'] }}
    />,
  )
  await waitFor(() => expect(lastAdapter?.toolAccess?.allow).toEqual(['model.pieces']))
  expect(lastAdapter).not.toBe(first)
})

test('limpar o deep link mantém a prévia da equipe (`?nivel=`) e a tarefa', async () => {
  const asset = createModelAsset({ name: 'Carro da prévia' })
  localAssets = [asset]
  router.replace.mockClear()
  query = new URLSearchParams({ criacao: asset.id, nivel: 'explorer' })
  const view = render(<MoldaClient viewerId={null} studioAvailable={false} />)
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/molda?nivel=explorer'))
  view.unmount()
  router.replace.mockClear()
  query = new URLSearchParams({ criacao: asset.id })
  render(<MoldaClient viewerId={null} studioAvailable={false} />)
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/molda'))
})

test('missão ocupada mostra a frase autorizada e volta ao plano sem montar o Molda', async () => {
  const handoff = modelHandoff()
  handoff.availability = {
    ...handoff.availability,
    available: false,
    reason: 'claimed',
    message: 'Outra pessoa da equipe já está fazendo essa missão.',
    eligibleProfileIds: [],
  }
  query = new URLSearchParams({ missao: handoff.mission.id })
  globalThis.fetch = Object.assign(async () => Response.json(handoff), {
    preconnect: originalFetch.preconnect,
  })
  render(<MoldaClient viewerId={PROFILE_ID} studioAvailable />)
  expect(
    await screen.findByText('Outra pessoa da equipe já está fazendo essa missão.'),
  ).not.toBeNull()
  expect(screen.queryByTestId('molda-opened')).toBeNull()
  router.push.mockClear()
  fireEvent.click(screen.getByRole('button', { name: 'Voltar ao plano' }))
  expect(router.push).toHaveBeenCalledWith(`/pensa?plano=${handoff.project.id}`)
})

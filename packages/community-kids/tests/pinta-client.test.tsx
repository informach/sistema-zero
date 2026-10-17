import { afterAll, expect, mock, spyOn, test } from 'bun:test'
import type { PintaHostAdapter } from '@sistemazero/pinta'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { handoffFixture, PROFILE_ID } from '../../pensa/src/components/pensa.fixture'
import { missionSessionFixture } from '../../ui/tests/mission-fixture'

const actualNavigation = await import('next/navigation')
const actualPinta = await import('@sistemazero/pinta')
const actualPersonal = await import('@sistemazero/studio/personal-assets')
const namespaces: string[] = []
/** O adapter que o host entregou ao último `<PintaApp>` montado. */
let lastAdapter: PintaHostAdapter | undefined
let pintaRenders = 0
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
    persistAsset: async () => {},
    persistAssets: async () => {},
    deleteAsset: async () => {},
    loadAssetById: async () => null,
    listAllAssets: async () => [],
    subscribe: () => () => {},
    dispose: () => {},
  }
}

function ObservedPintaApp({
  adapter,
  onWorkspaceChange,
}: {
  adapter?: PintaHostAdapter
  persistence?: object
  onWorkspaceChange?: (active: boolean) => void
}): ReactNode {
  lastAdapter = adapter
  pintaRenders += 1
  return (
    <>
      <output data-testid="pinta-app">montado</output>
      <button type="button" onClick={() => onWorkspaceChange?.(true)}>
        Abrir desenho de teste
      </button>
      <button type="button" onClick={() => onWorkspaceChange?.(false)}>
        Voltar à galeria de teste
      </button>
    </>
  )
}

/** A query string da vez (`?missao=` é o deep link do Pensa). */
let searchParams = new URLSearchParams()

mock.module('next/navigation', () => ({
  ...actualNavigation,
  usePathname: () => '/pinta',
  useRouter: () => router,
  useSearchParams: () => searchParams,
}))

mock.module('@sistemazero/pinta', () => ({
  ...actualPinta,
  PintaApp: ObservedPintaApp,
  setPintaStorageNamespace: (namespace: string) => namespaces.push(namespace),
  createPintaPersistence: ({ namespace = '' }: { namespace?: string } = {}) =>
    localPersistence(namespace),
  isPintaAssetOpen: () => false,
  subscribePintaAssetOpenState: () => () => {},
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

const { PintaClient } = await import('../src/components/kids/pinta-client')
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

test('o Pinta comunica a abertura do desenho ao menu do shell', async () => {
  render(
    <FocusModeProvider viewerId="perfil-pinta">
      <PintaClient viewerId="perfil-pinta" studioAvailable />
      <NavProbe />
    </FocusModeProvider>,
  )
  await screen.findByTestId('pinta-app')
  fireEvent.click(screen.getByRole('button', { name: 'Abrir menu de teste' }))
  expect(screen.getByTestId('nav-collapsed').textContent).toBe('false')
  fireEvent.click(screen.getByRole('button', { name: 'Abrir desenho de teste' }))
  expect(screen.getByTestId('nav-collapsed').textContent).toBe('true')
  fireEvent.click(screen.getByRole('button', { name: 'Voltar à galeria de teste' }))
  expect(screen.getByTestId('nav-collapsed').textContent).toBe('false')
})

afterAll(() => {
  mock.module('next/navigation', () => actualNavigation)
  mock.module('@sistemazero/pinta', () => actualPinta)
  mock.module('@sistemazero/studio/personal-assets', () => actualPersonal)
})

test('a volta da ponte diz POR QUE não atualizou (nunca levado ao Estúdio, biblioteca recusou) e regrava o desenho que já está lá', async () => {
  personalSaveFailure = null
  render(<PintaClient viewerId="perfil-b" studioAvailable />)
  await waitFor(() => expect(lastAdapter?.resyncToStudio).toBeDefined())
  const resync = lastAdapter?.resyncToStudio
  if (!resync) throw new Error('sem resyncToStudio')
  const asset = {
    id: 'd1',
    name: 'nave',
    dataUrl: 'data:image/png;base64,AAAA',
    width: 8,
    height: 8,
  }
  // Nunca levado ao Estúdio ("Usar no Estúdio" é a decisão explícita): nada é gravado, e o
  // motivo viaja em vez de um `updated: false` mudo.
  expect(await resync(asset)).toEqual({ updated: false, reason: 'not-linked' })
  expect(savedToStudio).toHaveLength(0)
  // Já está lá: salvar no Pinta regrava o desenho na biblioteca do Estúdio.
  personalRecords.set('d1', { id: 'd1' })
  expect(await resync(asset)).toEqual({ updated: true })
  expect(savedToStudio).toHaveLength(1)
  expect(savedToStudio[0]).toMatchObject({ id: 'd1', name: 'nave' })
  // A biblioteca recusou: o erro dela chega ao pacote, que mostra o recado.
  personalSaveFailure = 'A biblioteca está cheia.'
  expect(await resync(asset)).toEqual({
    updated: false,
    reason: 'failed',
    error: 'A biblioteca está cheia.',
  })
  expect(savedToStudio).toHaveLength(2)
  // Tudo no namespace do PERFIL, sem mexer no namespace global da biblioteca.
  expect(personalNamespaces).toEqual(['perfil-b', 'perfil-b', 'perfil-b', 'perfil-b', 'perfil-b'])
  expect(namespaces).toContain('perfil-b')
  expect(namespaces).not.toContain('personal:perfil-b')
})

/** Canonical saved-art mission used by the host. */
function artHandoff() {
  const session = missionSessionFixture()
  return {
    ...handoffFixture(),
    mission: session.mission,
    progress: session.progress,
    assetSlots: session.assetSlots,
  }
}

test('com ?missao= o retorno usa o projeto do handoff canônico', async () => {
  const handoff = artHandoff()
  searchParams = new URLSearchParams(`missao=${handoff.mission.id}`)
  const original = globalThis.fetch
  globalThis.fetch = Object.assign(async () => Response.json(handoff), {
    preconnect: original.preconnect,
  })
  try {
    const view = render(<PintaClient viewerId={PROFILE_ID} studioAvailable />)
    await waitFor(() => expect(lastAdapter?.taskSession).toBeDefined())
    router.push.mockClear()
    await lastAdapter?.taskSession?.onReturnToPlan()
    expect(router.push).toHaveBeenCalledWith(`/pensa?plano=${handoff.project.id}`)
    view.unmount()
  } finally {
    globalThis.fetch = original
    searchParams = new URLSearchParams()
  }
})

test('sem missão o Pinta abre livre, sem painel do plano', async () => {
  searchParams = new URLSearchParams()
  const before = pintaRenders
  const view = render(<PintaClient viewerId="perfil-d" studioAvailable />)
  await waitFor(() => expect(pintaRenders).toBeGreaterThan(before))
  expect(lastAdapter?.taskSession).toBeUndefined()
  view.unmount()
})

test('missão de outra pessoa mostra a disponibilidade do servidor e volta ao plano', async () => {
  const handoff = artHandoff()
  handoff.availability = {
    ...handoff.availability,
    available: false,
    reason: 'not_your_mission',
    message: 'Essa missão é de quem cuida das artes.',
    eligibleProfileIds: [],
  }
  searchParams = new URLSearchParams(`missao=${handoff.mission.id}`)
  const original = globalThis.fetch
  globalThis.fetch = Object.assign(async () => Response.json(handoff), {
    preconnect: original.preconnect,
  })
  try {
    const view = render(<PintaClient viewerId={PROFILE_ID} studioAvailable />)
    expect(await screen.findByText('Essa missão é de quem cuida das artes.')).not.toBeNull()
    expect(screen.queryByTestId('pinta-app')).toBeNull()
    router.push.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Voltar ao plano' }))
    expect(router.push).toHaveBeenCalledWith(`/pensa?plano=${handoff.project.id}`)
    view.unmount()
  } finally {
    globalThis.fetch = original
    searchParams = new URLSearchParams()
  }
})

test('a missão de arte vinculada ao Pro abre o mesmo jogo e não exige importação para concluir', async () => {
  const handoff = artHandoff()
  handoff.studioAuthoring = 'code'
  searchParams = new URLSearchParams(`missao=${handoff.mission.id}`)
  const original = globalThis.fetch
  globalThis.fetch = Object.assign(async () => Response.json(handoff), {
    preconnect: original.preconnect,
  })
  const full = spyOn(window.location, 'assign').mockImplementation(() => {})
  try {
    const view = render(<PintaClient viewerId={PROFILE_ID} studioAvailable={false} />)
    await waitFor(() => expect(lastAdapter?.taskSession).toBeDefined())
    expect(lastAdapter?.studioOwned).toBe(true)
    expect(lastAdapter?.sendToStudio).toBeFunction()
    expect(lastAdapter?.sendGameToStudio).toBeUndefined()
    expect(lastAdapter?.taskSession?.mission.kind).toBe('asset')
    lastAdapter?.onOpenStudio?.()
    expect(full).toHaveBeenCalledWith(`/estudio/pro/${handoff.studioProjectId}`)
    view.unmount()
  } finally {
    full.mockRestore()
    globalThis.fetch = original
    searchParams = new URLSearchParams()
  }
})

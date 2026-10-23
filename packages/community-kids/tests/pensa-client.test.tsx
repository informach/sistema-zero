import { afterAll, afterEach, describe, expect, it, mock, spyOn } from 'bun:test'
import type { PensaHostAdapter, PensaHostChrome } from '@sistemazero/pensa'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/**
 * O `pensa-client` embrulha o `<PensaApp>` no `PensaHostChromeProvider` do PRÓPRIO pacote
 * (07/09/2026). O Pensa lê o contrato do host, mas o botão do menu agora pertence ao shell
 * Kids: o contrato passa `menu: null` para não duplicar a alça nos cabeçalhos da ferramenta.
 *
 * ⚠️ `mock.module` não é isolado por arquivo no bun: os mocks ESPALHAM o módulo real.
 */
const actualNavigation = await import('next/navigation')
const actualPensa = await import('@sistemazero/pensa')
let pathname = '/pensa'
let lastAdapter: PensaHostAdapter
let lastChrome: PensaHostChrome | null | undefined

const router = {
  back: mock(() => {}),
  forward: mock(() => {}),
  refresh: mock(() => {}),
  push: mock(() => {}),
  replace: mock(() => {}),
  prefetch: mock(async () => {}),
}

function ObservedPensaApp({
  adapter,
  onWorkspaceChange,
}: {
  adapter: PensaHostAdapter
  onWorkspaceChange?: (active: boolean) => void
}) {
  lastAdapter = adapter
  const chrome = actualPensa.usePensaHostChrome()
  lastChrome = chrome
  return (
    <>
      <output data-testid="pensa-app">{chrome?.menu ? chrome.menu.label : 'sem menu'}</output>
      <button type="button" onClick={() => onWorkspaceChange?.(true)}>
        Abrir plano de teste
      </button>
      <button type="button" onClick={() => onWorkspaceChange?.(false)}>
        Voltar aos planos de teste
      </button>
    </>
  )
}

mock.module('next/navigation', () => ({
  ...actualNavigation,
  usePathname: () => pathname,
  useRouter: () => router,
}))

mock.module('@sistemazero/pensa', () => ({
  ...actualPensa,
  PensaApp: ObservedPensaApp,
}))

const { PensaClient } = await import('../src/components/kids/pensa-client')
const { FocusModeProvider } = await import('../src/components/kids/focus-mode')
const { FocusModeToggle } = await import('../src/components/kids/focus-mode-toggle')

function setViewportWidth(width: number): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => {
      const min = Number(/\(min-width:\s*(\d+)px\)/.exec(query)?.[1] ?? '0')
      return { matches: width >= min, addEventListener: () => {}, removeEventListener: () => {} }
    },
  })
}

const matchMediaOriginal = Object.getOwnPropertyDescriptor(window, 'matchMedia')
afterAll(() => {
  if (matchMediaOriginal) Object.defineProperty(window, 'matchMedia', matchMediaOriginal)
  else Reflect.deleteProperty(window, 'matchMedia')
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('pensa-client: o chrome do host chega ao Pensa', () => {
  it('no desktop o Pensa não duplica a alça do shell (sem selo de nuvem)', async () => {
    pathname = '/pensa'
    setViewportWidth(1280)
    render(
      <FocusModeProvider viewerId="perfil-1">
        <PensaClient />
        <FocusModeToggle target="nav" />
      </FocusModeProvider>,
    )
    await waitFor(() => {
      expect(screen.getByTestId('pensa-app').textContent).toBe('sem menu')
    })
    expect(lastChrome?.menu).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Mostrar menu' })).toHaveLength(1)
    // O Pensa persiste no servidor: o host manda `status: null` (o contrato do Pensa nem o lê).
    expect((lastChrome as { status?: unknown } | null)?.status ?? null).toBeNull()
  })

  it('abaixo de 768px (sem sidebar) o menu é null e o Pensa não desenha botão', async () => {
    pathname = '/pensa'
    setViewportWidth(500)
    render(
      <FocusModeProvider viewerId="perfil-1">
        <PensaClient />
      </FocusModeProvider>,
    )
    await waitFor(() => {
      expect(screen.getByTestId('pensa-app').textContent).toBe('sem menu')
    })
    expect(lastChrome?.menu).toBeNull()
  })

  it('um plano aberto retira a alça e a lista a recebe de volta', async () => {
    pathname = '/pensa'
    setViewportWidth(1280)
    render(
      <FocusModeProvider viewerId="perfil-1">
        <PensaClient />
        <FocusModeToggle target="nav" />
      </FocusModeProvider>,
    )
    await screen.findByTestId('pensa-app')
    expect(screen.getByRole('button', { name: 'Mostrar menu' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Abrir plano de teste' }))
    expect(screen.queryByRole('button', { name: /menu/i }) === null).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Voltar aos planos de teste' }))
    expect(screen.getByRole('button', { name: 'Mostrar menu' })).toBeDefined()
  })
})

it('preserves the canonical API error for definitive refusals in project care', async () => {
  render(
    <FocusModeProvider viewerId="perfil-1">
      <PensaClient viewerId="perfil-1" />
    </FocusModeProvider>,
  )
  await screen.findByTestId('pensa-app')
  const original = globalThis.fetch
  globalThis.fetch = Object.assign(
    async () =>
      Response.json(
        { error: { code: 'REVISION_CONFLICT', message: 'A tentativa foi encerrada.' } },
        { status: 409 },
      ),
    { preconnect: original.preconnect },
  )
  try {
    const result = lastAdapter.transport.request('/projects/test/checkpoints', { method: 'POST' })
    await expect(result).rejects.toBeInstanceOf(actualPensa.PensaApiError)
    await expect(result).rejects.toMatchObject({ status: 409, code: 'REVISION_CONFLICT' })
  } finally {
    globalThis.fetch = original
  }
})

it('opens Pro missions and games through a full navigation, preserving classic routing', async () => {
  render(
    <FocusModeProvider viewerId="perfil-1">
      <PensaClient />
    </FocusModeProvider>,
  )
  await screen.findByTestId('pensa-app')
  const navigation = spyOn(window.location, 'assign').mockImplementation(() => {})
  router.push.mockClear()
  try {
    lastAdapter.onOpenMission({
      missionId: 'mission',
      destination: 'studio',
      studioProjectId: 'pensa-plan',
      studioAuthoring: 'code',
    })
    expect(navigation).toHaveBeenLastCalledWith('/estudio/pro/pensa-plan?missao=mission')
    lastAdapter.onOpenGame?.({
      projectId: 'p-l-a-n',
      studioAuthoring: 'code',
      studioProjectId: 'pensa-plan',
    })
    expect(navigation).toHaveBeenLastCalledWith('/estudio/pro/pensa-plan')
    expect(router.push).not.toHaveBeenCalled()
    lastAdapter.onOpenGame?.({
      projectId: 'p-l-a-n',
      studioAuthoring: 'blocks',
      studioProjectId: 'pensa-plan',
    })
    expect(router.push).toHaveBeenLastCalledWith('/estudio?projeto=pensa-plan')
    lastAdapter.onOpenMission({
      missionId: 'classic',
      destination: 'studio',
      studioProjectId: 'pensa-plan',
      studioAuthoring: 'blocks',
    })
    expect(router.push).toHaveBeenLastCalledWith('/estudio?missao=classic')
  } finally {
    navigation.mockRestore()
  }
})

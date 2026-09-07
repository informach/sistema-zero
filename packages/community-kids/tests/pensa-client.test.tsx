import { afterEach, describe, expect, it, mock } from 'bun:test'
import type { PensaHostChrome } from '@sistemazero/pensa'
import { cleanup, render, screen, waitFor } from '@testing-library/react'

/**
 * O `pensa-client` embrulha o `<PensaApp>` no `PensaHostChromeProvider` do PRÓPRIO pacote
 * (07/09/2026): o botão de esconder o menu lateral passa a ser desenhado pelo Pensa nos
 * cabeçalhos dele, e o host só manda os dados. A prova aqui é que o Pensa (dublado) LÊ o
 * contexto que o host passou — mesma instância do módulo, nada de Provider paralelo.
 *
 * ⚠️ `mock.module` não é isolado por arquivo no bun: os mocks ESPALHAM o módulo real.
 */
const actualNavigation = await import('next/navigation')
const actualPensa = await import('@sistemazero/pensa')
let pathname = '/pensa'
let lastChrome: PensaHostChrome | null | undefined

const router = {
  back: mock(() => {}),
  forward: mock(() => {}),
  refresh: mock(() => {}),
  push: mock(() => {}),
  replace: mock(() => {}),
  prefetch: mock(async () => {}),
}

function ObservedPensaApp() {
  const chrome = actualPensa.usePensaHostChrome()
  lastChrome = chrome
  return <output data-testid="pensa-app">{chrome?.menu ? chrome.menu.label : 'sem menu'}</output>
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

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('pensa-client: o chrome do host chega ao Pensa', () => {
  it('no desktop o Pensa lê o botão do menu pelo Provider do próprio pacote (sem selo de nuvem)', async () => {
    pathname = '/pensa'
    setViewportWidth(1280)
    render(
      <FocusModeProvider viewerId="perfil-1">
        <PensaClient pintaOwned studioAvailable />
      </FocusModeProvider>,
    )
    await waitFor(() => {
      expect(screen.getByTestId('pensa-app').textContent).toBe('Esconder menu')
    })
    expect(lastChrome?.menu?.hidden).toBe(false)
    // O Pensa persiste no servidor: o host manda `status: null` (o contrato do Pensa nem o lê).
    expect((lastChrome as { status?: unknown } | null)?.status ?? null).toBeNull()
  })

  it('abaixo de 768px (sem sidebar) o menu é null e o Pensa não desenha botão', async () => {
    pathname = '/pensa'
    setViewportWidth(500)
    render(
      <FocusModeProvider viewerId="perfil-1">
        <PensaClient pintaOwned studioAvailable />
      </FocusModeProvider>,
    )
    await waitFor(() => {
      expect(screen.getByTestId('pensa-app').textContent).toBe('sem menu')
    })
    expect(lastChrome?.menu).toBeNull()
  })
})

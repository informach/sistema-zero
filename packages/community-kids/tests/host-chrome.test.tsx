import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import type { CloudSyncState, CreationsCloud } from '../src/lib/creations-cloud'
import type { HostChrome } from '../src/lib/host-chrome'

/**
 * `useHostChrome` (07/09/2026): o contrato que as ferramentas desenham na própria barra —
 * o botão do menu (do modo foco) e o selo da nuvem (da fila). Trava ONDE o menu é oferecido,
 * a persistência por perfil ao alternar, a reatividade ao estado da nuvem, a região viva do
 * host (só offline/erro) e a identidade estável do objeto (senão a barra da ferramenta
 * re-renderiza a cada autosave).
 *
 * ⚠️ `mock.module` não é isolado por arquivo no bun: o mock ESPALHA o módulo real (receita
 * do focus-mode.test.tsx) para nenhum outro arquivo perder export.
 */
const nav = await import('next/navigation')
let pathname = '/pinta'
mock.module('next/navigation', () => ({
  ...nav,
  usePathname: () => pathname,
}))

const { FocusModeProvider } = await import('../src/components/kids/focus-mode')
const { HostChromeAnnouncer, useHostChrome } = await import(
  '../src/components/kids/use-host-chrome'
)

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

function fakeCloud(initial: Partial<CloudSyncState> = {}) {
  let state: CloudSyncState = {
    status: 'idle',
    pending: 0,
    lastSavedAt: null,
    lastError: null,
    ...initial,
  }
  const listeners = new Set<(s: CloudSyncState) => void>()
  const cloud = {
    getState: () => state,
    subscribe: (listener: (s: CloudSyncState) => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  } as unknown as CreationsCloud
  return {
    cloud,
    set(patch: Partial<CloudSyncState>) {
      state = { ...state, ...patch }
      for (const listener of listeners) listener(state)
    },
  }
}

const seen: HostChrome[] = []

function Probe({ cloud, syncing = false }: { cloud: CreationsCloud | null; syncing?: boolean }) {
  const { chrome, announcement } = useHostChrome({ cloud, syncing })
  seen.push(chrome)
  return (
    <>
      <HostChromeAnnouncer text={announcement} />
      <output data-testid="menu">
        {chrome.menu ? `${chrome.menu.label}|${String(chrome.menu.hidden)}` : 'null'}
      </output>
      <output data-testid="status">
        {chrome.status ? `${chrome.status.tone}|${chrome.status.label}` : 'null'}
      </output>
      {chrome.menu ? (
        <button type="button" onClick={chrome.menu.onToggle}>
          alternar
        </button>
      ) : null}
    </>
  )
}

/** Um pai que re-renderiza por motivo alheio ao chrome (prova a identidade estável). */
function Parent({ cloud }: { cloud: CreationsCloud | null }) {
  const [n, setN] = useState(0)
  return (
    <>
      <button type="button" onClick={() => setN(n + 1)}>
        re-render {n}
      </button>
      <Probe cloud={cloud} />
    </>
  )
}

function mount(cloud: CreationsCloud | null, syncing = false, viewerId = 'perfil-1') {
  return render(
    <FocusModeProvider viewerId={viewerId}>
      <Probe cloud={cloud} syncing={syncing} />
    </FocusModeProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  setViewportWidth(1280)
  pathname = '/pinta'
  seen.length = 0
})

afterEach(cleanup)

describe('useHostChrome — o menu', () => {
  it('nas rotas embarcadas a partir de 768px oferece o botão, e alternar grava por PERFIL', () => {
    mount(null)
    expect(screen.getByTestId('menu').textContent).toBe('Esconder menu|false')
    fireEvent.click(screen.getByRole('button', { name: 'alternar' }))
    expect(screen.getByTestId('menu').textContent).toBe('Mostrar menu|true')
    expect(localStorage.getItem('sz:kids:hide-nav:perfil-1')).toBe('1')
  })

  it('abaixo de 768px (sem sidebar) e fora das rotas embarcadas o menu é null', () => {
    setViewportWidth(500)
    const { unmount } = mount(null)
    expect(screen.getByTestId('menu').textContent).toBe('null')
    unmount()

    setViewportWidth(1280)
    localStorage.setItem('sz:kids:hide-nav:perfil-1', '1')
    for (const route of ['/cursos', '/perfil', '/']) {
      pathname = route
      const view = mount(null)
      expect(screen.getByTestId('menu').textContent).toBe('null')
      view.unmount()
    }
  })

  it('lembra a preferência salva do perfil e ignora a do irmão', () => {
    localStorage.setItem('sz:kids:hide-nav:perfil-1', '1')
    const { unmount } = mount(null, false, 'perfil-1')
    expect(screen.getByTestId('menu').textContent).toBe('Mostrar menu|true')
    unmount()
    mount(null, false, 'perfil-2')
    expect(screen.getByTestId('menu').textContent).toBe('Esconder menu|false')
  })
})

describe('useHostChrome — o selo da nuvem', () => {
  it('sem nuvem (Pensa) o status é null; com nuvem acompanha a fila', () => {
    const { unmount } = mount(null)
    expect(screen.getByTestId('status').textContent).toBe('null')
    unmount()

    const fake = fakeCloud({ status: 'saved', lastSavedAt: 1 })
    mount(fake.cloud)
    expect(screen.getByTestId('status').textContent).toBe('ok|Guardado na sua conta')
    act(() => fake.set({ status: 'saving' }))
    expect(screen.getByTestId('status').textContent).toBe('muted|Guardando…')
    act(() => fake.set({ status: 'error', lastError: 'Não consegui.' }))
    expect(screen.getByTestId('status').textContent).toBe('danger|Não consegui guardar')
  })

  it('`syncing` só fala sobre idle/saved (a descida em voo)', () => {
    const fake = fakeCloud({ status: 'idle' })
    mount(fake.cloud, true)
    expect(screen.getByTestId('status').textContent).toBe('muted|Buscando…')
  })

  it('a região viva do host só recebe texto em offline/erro (e sempre existe)', () => {
    const fake = fakeCloud({ status: 'saved', lastSavedAt: 1 })
    const { container } = mount(fake.cloud)
    const live = container.querySelector('[aria-live="polite"]')
    expect(live).not.toBeNull()
    expect(live?.textContent).toBe('')
    act(() => fake.set({ status: 'offline' }))
    expect(live?.textContent).toContain('Sem internet agora')
    act(() => fake.set({ status: 'saved', lastSavedAt: 2 }))
    expect(live?.textContent).toBe('')
  })

  it('a identidade do chrome é ESTÁVEL quando nada visível muda', () => {
    const fake = fakeCloud({ status: 'saved', lastSavedAt: 1 })
    render(
      <FocusModeProvider viewerId="perfil-1">
        <Parent cloud={fake.cloud} />
      </FocusModeProvider>,
    )
    const before = seen.at(-1)
    fireEvent.click(screen.getByRole('button', { name: /re-render/ }))
    expect(seen.at(-1)).toBe(before)
    // E muda quando o estado muda (anti-vácuo do memo).
    act(() => fake.set({ status: 'saving' }))
    expect(seen.at(-1)).not.toBe(before)
  })
})

import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import type { CloudSyncState, CreationsCloud } from '../src/lib/creations-cloud'
import type { HostChrome } from '../src/lib/host-chrome'

/**
 * `useHostChrome` (07/09/2026): o contrato que as ferramentas desenham na própria barra —
 * o selo da nuvem (da fila) e a seta de voltar. O menu de foco agora mora no shell, não
 * na barra da ferramenta. Trava essa separação, a reatividade da nuvem, a região viva do
 * host (só offline/erro) e a identidade estável do objeto (senão a barra da ferramenta
 * re-renderiza a cada autosave). Desde 11/09 também a seta das galerias (`back`) e o sinal
 * da nuvem da conta (`account`).
 *
 * ⚠️ `mock.module` não é isolado por arquivo no bun: o mock ESPALHA o módulo real (receita
 * do focus-mode.test.tsx) para nenhum outro arquivo perder export. O `router` é UM objeto
 * só, como o do App Router: um `useRouter` que devolvesse objeto novo a cada render
 * esconderia (ou inventaria) quebra de identidade da seta.
 */
const nav = await import('next/navigation')
let pathname = '/pinta'
const router = {
  back: mock(() => {}),
  forward: mock(() => {}),
  refresh: mock(() => {}),
  push: mock((_href: string) => {}),
  replace: mock(() => {}),
  prefetch: mock(async () => {}),
}
mock.module('next/navigation', () => ({
  ...nav,
  usePathname: () => pathname,
  useRouter: () => router,
}))

const { FocusModeProvider } = await import('../src/components/kids/focus-mode')
const { HostChromeAnnouncer, useHostChrome } = await import(
  '../src/components/kids/use-host-chrome'
)
const { EMPTY_HOST_CHROME } = await import('../src/lib/host-chrome')

/**
 * ⚠️⚠️ Só responde a `min-width` (o resto é `false`) e o original volta no `afterAll`: a receita do
 * `focus-mode.test.tsx`, onde o falso sem restaurar ligou "menos movimento" para os arquivos seguintes.
 */
const matchMediaOriginal = Object.getOwnPropertyDescriptor(window, 'matchMedia')
function setViewportWidth(width: number): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => {
      const min = /\(min-width:\s*(\d+)px\)/.exec(query)?.[1]
      return {
        matches: min !== undefined && width >= Number(min),
        addEventListener: () => {},
        removeEventListener: () => {},
      }
    },
  })
}
afterAll(() => {
  if (matchMediaOriginal) Object.defineProperty(window, 'matchMedia', matchMediaOriginal)
  else Reflect.deleteProperty(window, 'matchMedia')
})

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
      <output data-testid="back">
        {chrome.back ? `${chrome.back.label}|${chrome.back.href}` : 'null'}
      </output>
      <output data-testid="account">{chrome.account ? chrome.account.label : 'null'}</output>
      {chrome.menu ? (
        <button type="button" onClick={chrome.menu.onToggle}>
          alternar
        </button>
      ) : null}
      {chrome.back ? (
        <button type="button" onClick={chrome.back.onNavigate}>
          voltar
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
  router.push.mockClear()
})

afterEach(cleanup)

describe('useHostChrome — o menu', () => {
  it('não entrega outro botão às ferramentas embarcadas; a alça é do shell', () => {
    mount(null)
    expect(screen.getByTestId('menu').textContent).toBe('null')
    expect(screen.queryByRole('button', { name: 'alternar' })).toBeNull()
    expect(screen.getByTestId('back').textContent).toBe('Voltar para Criar|/criar')
  })

  it('abaixo de 768px (sem sidebar) e fora das rotas embarcadas o menu é null', () => {
    setViewportWidth(500)
    const { unmount } = mount(null)
    expect(screen.getByTestId('menu').textContent).toBe('null')
    unmount()

    setViewportWidth(1280)
    for (const route of ['/criar', '/cursos', '/perfil', '/']) {
      pathname = route
      const view = mount(null)
      expect(screen.getByTestId('menu').textContent).toBe('null')
      view.unmount()
    }
  })

  it('não reintroduz o botão mesmo com preferência antiga salva', () => {
    localStorage.setItem('sz:kids:hide-nav:perfil-1', '1')
    const { unmount } = mount(null, false, 'perfil-1')
    expect(screen.getByTestId('menu').textContent).toBe('null')
    unmount()
    mount(null, false, 'perfil-2')
    expect(screen.getByTestId('menu').textContent).toBe('null')
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

describe('useHostChrome — a seta das galerias', () => {
  it('as quatro ferramentas voltam para Criar', () => {
    for (const route of ['/pinta', '/estudio', '/pensa', '/molda']) {
      pathname = route
      const view = mount(null)
      expect(screen.getByTestId('back').textContent).toBe('Voltar para Criar|/criar')
      view.unmount()
    }
  })

  it('o clique simples navega pelo roteador do host, sem recarregar a página', () => {
    pathname = '/estudio'
    mount(null)
    fireEvent.click(screen.getByRole('button', { name: 'voltar' }))
    expect(router.push).toHaveBeenCalledTimes(1)
    expect(router.push).toHaveBeenCalledWith('/criar')
  })

  it('não existe onde não há para onde voltar (a própria página principal)', () => {
    for (const route of ['/criar', '/']) {
      pathname = route
      const view = mount(null)
      expect(screen.getByTestId('back').textContent).toBe('null')
      view.unmount()
    }
  })

  it('não depende da sidebar: abaixo de 768px o menu some e a seta continua', () => {
    setViewportWidth(500)
    pathname = '/pinta'
    mount(null)
    expect(screen.getByTestId('menu').textContent).toBe('null')
    expect(screen.getByTestId('back').textContent).toBe('Voltar para Criar|/criar')
  })
})

describe('useHostChrome — a nuvem da conta', () => {
  it('sem nuvem (Pensa, ou sem perfil) é null; navegador que não guarda também', () => {
    const { unmount } = mount(null)
    expect(screen.getByTestId('account').textContent).toBe('null')
    unmount()

    const semSuporte = fakeCloud({ status: 'unsupported' })
    mount(semSuporte.cloud)
    expect(screen.getByTestId('account').textContent).toBe('null')
    // E o selo também não fala nada ali (a regra do `cloudStatusView`, que isto não muda).
    expect(screen.getByTestId('status').textContent).toBe('null')
  })

  it('com a nuvem ligada vale em REPOUSO, quando o selo ainda não tem nada a dizer', () => {
    const fake = fakeCloud({ status: 'idle' })
    mount(fake.cloud)
    expect(screen.getByTestId('status').textContent).toBe('null')
    expect(screen.getByTestId('account').textContent).toBe('Guardado na sua conta')
  })

  it('guardando↔guardado mexe no selo, NUNCA na identidade da conta nem da seta', () => {
    const fake = fakeCloud({ status: 'saved', lastSavedAt: 1 })
    mount(fake.cloud)
    const before = seen.at(-1)
    act(() => fake.set({ status: 'saving' }))
    act(() => fake.set({ status: 'saved', lastSavedAt: 2 }))
    act(() => fake.set({ status: 'offline' }))
    const after = seen.at(-1)
    expect(after).not.toBe(before) // o selo mudou (anti-vácuo)
    expect(after?.account).toBe(before?.account ?? null)
    expect(after?.account).not.toBeNull()
    expect(after?.back).toBe(before?.back ?? null)
    expect(after?.back).not.toBeNull()
  })
})

describe('EMPTY_HOST_CHROME', () => {
  it('é o contrato inteiro, com os quatro campos nulos (quem não embrulha não desenha nada)', () => {
    expect(Object.keys(EMPTY_HOST_CHROME).sort()).toEqual(['account', 'back', 'menu', 'status'])
    expect(Object.values(EMPTY_HOST_CHROME).every((value) => value === null)).toBe(true)
  })
})

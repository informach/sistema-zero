import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createEmptyProject } from '#core'
import { useProjectStore } from '../../state/projectStore'
import { type StudioHostChrome, StudioHostChromeProvider } from '../../studio/host-chrome'
import { type StudioLayout, StudioLayoutProvider } from '../../studio/layoutContext'
import { Topbar } from './Topbar'

/**
 * Chrome do HOST na Topbar (07/09/2026): o botão de esconder o menu da comunidade vem
 * PRIMEIRO na barra e o selo "Guardado na sua conta" fica ao lado do "Salvo" — Badge no
 * tier wide, bolinha (com o texto no aria-label) em narrow/compact, como o próprio "Salvo".
 * Sem Provider nada aparece. ⚠️ A Topbar nunca teve teste próprio; este é o primeiro.
 */
const layoutFor = (width: number): StudioLayout => ({
  width,
  isNarrow: width < 1024,
  isCompact: width < 440,
})

function chromeWith(overrides: Partial<StudioHostChrome> = {}): {
  chrome: StudioHostChrome
  onToggle: ReturnType<typeof mock>
} {
  const onToggle = mock(() => {})
  return {
    onToggle,
    chrome: {
      menu: { hidden: false, label: 'Esconder menu', onToggle },
      status: {
        tone: 'ok',
        icon: 'cloud',
        label: 'Guardado na sua conta',
        text: 'Guardado na sua conta',
      },
      ...overrides,
    },
  }
}

function mount(width: number, chrome: StudioHostChrome | null) {
  const topbar = <Topbar onExit={() => {}} />
  return render(
    <StudioLayoutProvider value={layoutFor(width)}>
      {chrome ? (
        <StudioHostChromeProvider value={chrome}>{topbar}</StudioHostChromeProvider>
      ) : (
        topbar
      )}
    </StudioLayoutProvider>,
  )
}

beforeEach(() => {
  useProjectStore.setState({
    project: createEmptyProject('01J00000000000000000000TOP', 'Meu jogo'),
    isDirty: false,
    saveError: null,
  })
})

afterEach(() => {
  cleanup()
  useProjectStore.setState({ project: null, isDirty: false, saveError: null })
})

describe('Topbar × olhinho do preview', () => {
  /**
   * No ESTREITO o preview é uma ABA (ver NarrowPanels), não um painel ao lado. O
   * olhinho não teria o que esconder ali, e pior: ele apagaria a própria aba. A
   * criança clicaria, o preview sumiria da tira e não haveria botão para trazer de
   * volta — leitura natural para uma criança: "o app quebrou".
   */
  it('wide: o olhinho aparece', () => {
    mount(1280, null)
    expect(screen.getByRole('button', { name: 'Ocultar pré-visualização' })).toBeTruthy()
  })

  it('narrow: o olhinho NÃO aparece (lá o preview é aba)', () => {
    mount(800, null)
    expect(screen.queryByRole('button', { name: 'Ocultar pré-visualização' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Mostrar pré-visualização' })).toBeNull()
  })
})

describe('Topbar × chrome do host', () => {
  it('wide: o menu é o PRIMEIRO botão da barra (sem title) e o selo é um Badge ao lado do Salvo', () => {
    const { chrome, onToggle } = chromeWith()
    const { container } = mount(1200, chrome)
    const header = container.querySelector('header')
    const primeiro = header?.querySelector('button')
    expect(primeiro?.getAttribute('aria-label')).toBe('Esconder menu')
    expect(primeiro?.getAttribute('aria-pressed')).toBe('false')
    expect(primeiro?.getAttribute('title')).toBeNull()
    // A ABA desconta o padding da barra para encostar na linha da sidebar.
    expect(primeiro?.className).toBe('sz-tool-btn-menu')
    expect(header?.className).toContain('[--sz-tool-inset:1rem]')
    fireEvent.click(primeiro as HTMLButtonElement)
    expect(onToggle).toHaveBeenCalledTimes(1)

    const selo = screen.getByRole('status', { name: 'Guardado na sua conta' })
    expect(selo.textContent).toBe('Guardado na sua conta')
    expect(selo.getAttribute('title')).toBe('Guardado na sua conta')
    // O "Salvo" local continua na barra.
    expect(screen.getByText('Salvo')).toBeTruthy()
  })

  it('menu escondido = pressionado, na receita COMPARTILHADA das ferramentas', () => {
    const { chrome } = chromeWith({
      menu: { hidden: true, label: 'Mostrar menu', onToggle: () => {} },
    })
    mount(1200, chrome)
    const botao = screen.getByRole('button', { name: 'Mostrar menu' })
    expect(botao.getAttribute('aria-pressed')).toBe('true')
    // `.sz-tool-btn-menu` de `@sistemazero/ui/tool-chrome.css` (a mesma do Pinta e do Pensa);
    // o "ligado" é pintado pelo `[aria-pressed="true"]` da folha.
    expect(botao.className).toBe('sz-tool-btn-menu')
  })

  it('narrow e compact: o selo vira BOLINHA com o texto no aria-label (a barra não tem wrap)', () => {
    for (const width of [900, 400]) {
      const { chrome } = chromeWith({
        status: {
          tone: 'warn',
          icon: 'offline',
          label: 'Sem internet agora',
          text: 'Sem internet agora. Vou guardar na sua conta quando voltar.',
        },
      })
      const { unmount } = mount(width, chrome)
      const bolinha = screen.getByRole('status', {
        name: 'Sem internet agora. Vou guardar na sua conta quando voltar.',
      })
      expect(bolinha.textContent).toBe('')
      expect(bolinha.className).toContain('rounded-full')
      expect(bolinha.className).toContain('bg-sz-warn')
      expect(screen.queryByText('Sem internet agora')).toBeNull()
      unmount()
    }
  })

  it('sem Provider (aula, admin, playground) nada do host aparece', () => {
    const { container } = mount(1200, null)
    expect(screen.queryByRole('button', { name: /menu/i })).toBeNull()
    expect(screen.queryByText(/na sua conta/)).toBeNull()
    // A marca continua sendo o primeiro botão.
    expect(container.querySelector('header')?.querySelector('button')?.textContent).toContain(
      'Studio',
    )
  })
})

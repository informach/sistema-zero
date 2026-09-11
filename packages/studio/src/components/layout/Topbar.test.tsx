import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createEmptyProject } from '#core'
import { useProjectStore } from '../../state/projectStore'
import { type StudioHostChrome, StudioHostChromeProvider } from '../../studio/host-chrome'
import { type StudioLayout, StudioLayoutProvider } from '../../studio/layoutContext'
import {
  type StudioShareAdapter,
  StudioShareDisabledProvider,
  StudioShareProvider,
} from '../../studio/share'
import { type StudioTutorAdapter, StudioTutorProvider } from '../../studio/tutor'
import { Topbar } from './Topbar'

/**
 * Chrome do HOST na Topbar (07/09/2026): o botão de esconder o menu da comunidade vem
 * PRIMEIRO na barra e o selo "Guardado na sua conta" fica ao lado do "Salvo" (desde 11/09 só a
 * nuvem em repouso), bolinha com o texto no aria-label em narrow/compact, como o próprio
 * "Salvo". Sem Provider nada aparece. E o desenho da tela-modelo (11/09/2026): os três grupos,
 * a marca que vira nome acessível quando aperta, o segmentado com ícones, o nome em pílula e a
 * pílula azul do Compartilhar. happy-dom não faz layout: trava-se a estrutura, os nomes e o
 * foco; o desenho confere-se no playground.
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
      back: null,
      account: null,
      ...overrides,
    },
  }
}

function mount(
  width: number,
  chrome: StudioHostChrome | null,
  wrap: (node: ReactElement) => ReactElement = (node) => node,
) {
  const topbar = <Topbar onExit={() => {}} />
  return render(
    <StudioLayoutProvider value={layoutFor(width)}>
      {wrap(
        chrome ? (
          <StudioHostChromeProvider value={chrome}>{topbar}</StudioHostChromeProvider>
        ) : (
          topbar
        ),
      )}
    </StudioLayoutProvider>,
  )
}

const SHARE: StudioShareAdapter = {
  publish: async () => ({}),
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
    const olho = screen.getByRole('button', { name: 'Ocultar pré-visualização' })
    expect(olho.className).toBe('sz-bar-icon-btn')
    expect(olho.getAttribute('aria-pressed')).toBe('true')
  })

  it('narrow: o olhinho NÃO aparece (lá o preview é aba)', () => {
    mount(800, null)
    expect(screen.queryByRole('button', { name: 'Ocultar pré-visualização' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Mostrar pré-visualização' })).toBeNull()
  })
})

describe('Topbar × chrome do host', () => {
  it('wide: o menu é o PRIMEIRO botão da barra (sem title) e, em repouso, o selo é só a nuvem', () => {
    const { chrome, onToggle } = chromeWith()
    const { container } = mount(1200, chrome)
    const header = container.querySelector('header')
    const primeiro = header?.querySelector('button')
    expect(primeiro?.getAttribute('aria-label')).toBe('Esconder menu')
    expect(primeiro?.getAttribute('aria-pressed')).toBe('false')
    expect(primeiro?.getAttribute('title')).toBeNull()
    // O quadrado das telas-modelo, dentro do padding: a barra não desconta mais o respiro
    // (a aba colada na linha da sidebar saiu em 11/09/2026).
    expect(primeiro?.className).toBe('sz-tool-btn-menu')
    expect(header?.className).not.toContain('--sz-tool-inset')
    fireEvent.click(primeiro as HTMLButtonElement)
    expect(onToggle).toHaveBeenCalledTimes(1)

    // Em repouso a tela-modelo não tem frase nenhuma: a nuvem na pílula menta, com o nome no
    // `title` (que também é a dica do mouse).
    const selo = screen.getByRole('status', { name: 'Guardado na sua conta' })
    expect(selo.textContent).toBe('')
    expect(selo.getAttribute('title')).toBe('Guardado na sua conta')
    expect(selo.className).toContain('sz-bar-seal--icon')
    expect(selo.className).toContain('sz-bar-seal--ok')
    // O "Salvo" local continua na barra.
    expect(screen.getByText('Salvo')).toBeTruthy()
  })

  it('wide: quando algo acontece (sem internet) o selo volta a ter a frase curta', () => {
    const { chrome } = chromeWith({
      status: {
        tone: 'warn',
        icon: 'offline',
        label: 'Sem internet agora',
        text: 'Sem internet agora. Vou guardar na sua conta quando voltar.',
      },
    })
    mount(1200, chrome)
    const selo = screen.getByRole('status', {
      name: 'Sem internet agora. Vou guardar na sua conta quando voltar.',
    })
    expect(selo.textContent).toBe('Sem internet agora')
    expect(selo.className).toContain('sz-bar-seal--warn')
    expect(selo.getAttribute('aria-live')).toBe('off')
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

describe('Topbar × a tela-modelo do Estúdio', () => {
  it('três grupos: [voltar, nome, Salvo] · [modos] · [olho, ⋯, Compartilhar]', () => {
    const { container } = mount(1440, null, (node) => (
      <StudioShareProvider value={SHARE}>{node}</StudioShareProvider>
    ))
    const header = container.querySelector('header') as HTMLElement
    expect(header.className).toBe('sz-bar')
    const grupos = Array.from(header.children).map((el) => el.className)
    expect(grupos).toEqual(['sz-bar__start', 'sz-bar__center', 'sz-bar__end'])

    const [inicio, meio, fim] = Array.from(header.children) as HTMLElement[]
    expect(
      within(inicio as HTMLElement).getByRole('button', { name: 'Sistema Zero Studio' }),
    ).toBeTruthy()
    expect(within(inicio as HTMLElement).getByText('Salvo')).toBeTruthy()
    expect(within(meio as HTMLElement).getByRole('group', { name: 'Modo de edição' })).toBeTruthy()
    const nomes = within(fim as HTMLElement)
      .getAllByRole('button')
      .map((b) => b.getAttribute('aria-label') ?? b.textContent)
    expect(nomes).toEqual(['Ocultar pré-visualização', 'Mais opções', 'Compartilhar'])
  })

  it('o voltar é UM botão (círculo + marca) com o nome e o title de sempre; a 1440 a marca aparece', () => {
    const onExit = mock(() => {})
    const { container } = render(
      <StudioLayoutProvider value={layoutFor(1440)}>
        <Topbar onExit={onExit} />
      </StudioLayoutProvider>,
    )
    const voltar = screen.getByRole('button', { name: 'Sistema Zero Studio' })
    expect(voltar.className).toBe('sz-bar-back')
    expect(voltar.getAttribute('title')).toBe('Voltar à lista de projetos')
    expect(voltar.querySelector('.sz-bar-back__circle svg')).not.toBeNull()
    expect(within(voltar).getByText('Sistema Zero Studio').className).toBe('sz-bar-brand')
    // A divisória separa a marca da pílula do nome.
    expect(container.querySelector('.sz-bar-divider')).not.toBeNull()
    fireEvent.click(voltar)
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('abaixo de 1360px a marca vira só nome acessível (e a divisória sai)', () => {
    const { container } = mount(1200, null)
    const voltar = screen.getByRole('button', { name: 'Sistema Zero Studio' })
    expect(within(voltar).getByText('Sistema Zero Studio').className).toBe('sr-only')
    expect(container.querySelector('.sz-bar-divider')).toBeNull()
  })

  it('sem onExit (aula, admin) a marca é estática e só aparece quando cabe', () => {
    const { container, unmount } = render(
      <StudioLayoutProvider value={layoutFor(1440)}>
        <Topbar />
      </StudioLayoutProvider>,
    )
    expect(screen.queryByRole('button', { name: 'Sistema Zero Studio' })).toBeNull()
    expect(container.querySelector('.sz-bar-brand')?.textContent).toBe('Sistema Zero Studio')
    unmount()
    const estreito = render(
      <StudioLayoutProvider value={layoutFor(1200)}>
        <Topbar />
      </StudioLayoutProvider>,
    )
    expect(estreito.container.querySelector('.sz-bar-brand')).toBeNull()
  })

  it('o segmentado: ícone + rótulo no largo, só o ícone (rótulo sr-only + title) abaixo dele', () => {
    const { unmount } = mount(1440, null)
    const blocos = screen.getByRole('button', { name: 'Blocos' })
    expect(blocos.className).toBe('sz-bar-mode')
    expect(blocos.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Ponte' }).getAttribute('aria-pressed')).toBe('false')
    expect(blocos.querySelector('svg')).not.toBeNull()
    expect(within(blocos).getByText('Blocos').className).toBe('')
    expect(blocos.getAttribute('title')).toBeNull()
    unmount()

    mount(900, null)
    const estreito = screen.getByRole('button', { name: 'Blocos' })
    expect(within(estreito).getByText('Blocos').className).toBe('sr-only')
    expect(estreito.getAttribute('title')).toBe('Blocos')
    fireEvent.click(screen.getByRole('button', { name: 'Ponte' }))
    expect(useProjectStore.getState().project?.mode).toBe('bridge')
  })

  it('o "Salvo" é a pílula menta sem role no largo; não salvo e erro trocam o tom', () => {
    const { unmount } = mount(1440, null)
    const salvo = screen.getByText('Salvo')
    expect(salvo.className).toBe('sz-bar-seal sz-bar-seal--ok')
    expect(salvo.getAttribute('role')).toBeNull()
    unmount()

    useProjectStore.setState({ isDirty: true })
    const sujo = mount(1440, null)
    expect(screen.getByText('Alterações não salvas').className).toContain('sz-bar-seal--warn')
    sujo.unmount()

    useProjectStore.setState({ saveError: 'Sem espaço no aparelho' })
    mount(1440, null)
    const erro = screen.getByText('Erro ao salvar')
    expect(erro.className).toContain('sz-bar-seal--danger')
    expect(erro.getAttribute('title')).toBe('Sem espaço no aparelho')
  })

  it('compacto: o "Salvo" continua a bolinha com role status (o e2e a 390px)', () => {
    mount(390, null)
    const bolinha = screen.getByRole('status', { name: 'Salvo' })
    expect(bolinha.textContent).toBe('')
    expect(bolinha.className).toContain('rounded-full')
  })

  it('o nome: pílula com lápis; clicar leva o FOCO ao campo, Enter grava e devolve o foco', () => {
    mount(1440, null)
    const pilula = screen.getByRole('button', { name: 'Meu jogo' })
    expect(pilula.className).toBe('sz-bar-name')
    expect(pilula.getAttribute('title')).toBe('Renomear projeto')
    expect(pilula.querySelector('svg')).not.toBeNull()

    fireEvent.click(pilula)
    const campo = screen.getByRole('textbox', { name: 'Nome do projeto' }) as HTMLInputElement
    expect(document.activeElement).toBe(campo)
    fireEvent.change(campo, { target: { value: '  Nave veloz  ' } })
    fireEvent.keyDown(campo, { key: 'Enter' })
    // O Enter tira o foco do campo (blur → grava); aqui o blur é disparado à mão, como o
    // navegador faria.
    fireEvent.blur(campo)
    expect(useProjectStore.getState().project?.name).toBe('Nave veloz')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Nave veloz' }))
  })

  it('o nome: Esc desiste sem gravar e devolve o foco à pílula', () => {
    mount(1440, null)
    fireEvent.click(screen.getByRole('button', { name: 'Meu jogo' }))
    const campo = screen.getByRole('textbox', { name: 'Nome do projeto' })
    fireEvent.change(campo, { target: { value: 'Outro nome' } })
    fireEvent.keyDown(campo, { key: 'Escape' })
    expect(screen.queryByRole('textbox', { name: 'Nome do projeto' })).toBeNull()
    expect(useProjectStore.getState().project?.name).toBe('Meu jogo')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Meu jogo' }))
  })

  it('compacto: o nome fica sem o lápis (cada pixel vai para as letras)', () => {
    mount(390, null)
    expect(screen.getByRole('button', { name: 'Meu jogo' }).querySelector('svg')).toBeNull()
  })

  it('o "⋯" é o círculo quieto da barra', () => {
    mount(1440, null)
    expect(screen.getByRole('button', { name: 'Mais opções' }).className).toBe('sz-bar-icon-btn')
  })

  it('Compartilhar: pílula azul com o rótulo no largo, só o ícone abaixo dele', () => {
    const comShare = (node: ReactElement) => (
      <StudioShareProvider value={SHARE}>{node}</StudioShareProvider>
    )
    const { unmount } = mount(1440, null, comShare)
    const largo = screen.getByRole('button', { name: 'Compartilhar' })
    expect(largo.className).toBe('sz-bar-pill sz-bar-pill--primary')
    expect(largo.textContent).toBe('Compartilhar')
    unmount()

    mount(900, null, comShare)
    const estreito = screen.getByRole('button', { name: 'Compartilhar' })
    expect(estreito.className).toBe('sz-bar-pill sz-bar-pill--primary sz-bar-pill--icon')
    expect(estreito.textContent).toBe('')
  })

  it('Zappy: a pílula suave com o nome no largo, só a faísca abaixo dele; abrir = expandido', () => {
    const comZappy = (node: ReactElement) => (
      <StudioTutorProvider value={{ adapter: {} as StudioTutorAdapter }}>
        {node}
      </StudioTutorProvider>
    )
    const { unmount } = mount(1440, null, comZappy)
    const largo = screen.getByRole('button', { name: 'Abrir Zappy' })
    expect(largo.className).toBe('sz-bar-pill sz-bar-pill--soft')
    expect(largo.textContent).toBe('Zappy')
    expect(largo.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(largo)
    expect(screen.getByRole('button', { name: 'Fechar Zappy' }).getAttribute('aria-expanded')).toBe(
      'true',
    )
    unmount()

    mount(900, null, comZappy)
    const estreito = screen.getByRole('button', { name: 'Abrir Zappy' })
    expect(estreito.className).toBe('sz-bar-pill sz-bar-pill--soft sz-bar-pill--icon')
    expect(estreito.textContent).toBe('')
  })

  it('Compartilhar desabilitado: aria-disabled, o motivo no nome e a bolha de dica', () => {
    const motivo = 'Envie ao professor primeiro'
    mount(1440, null, (node) => (
      <StudioShareProvider value={SHARE}>
        <StudioShareDisabledProvider value={motivo}>{node}</StudioShareDisabledProvider>
      </StudioShareProvider>
    ))
    const botao = screen.getByRole('button', { name: motivo })
    expect(botao.getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByRole('tooltip').textContent).toBe(motivo)
    fireEvent.click(botao)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

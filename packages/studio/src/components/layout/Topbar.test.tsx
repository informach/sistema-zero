import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createEmptyProject } from '#core'
import { useProjectStore } from '../../state/projectStore'
import { StudioStoresContext } from '../../state/storesContext'
import { createStudioStores } from '../../state/studioStores'
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
    const { container } = mount(1440, chrome)
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
    mount(1440, chrome)
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

  it('largo apertado, narrow e compact: o selo vira BOLINHA com o texto no aria-label', () => {
    // 1200 = o largo abaixo de `STUDIO_BAR_LABELS_MIN_PX`: a barra não tem wrap, e com a frase o
    // "Salvo" e a nuvem passavam por baixo do segmentado (full review de 11/09/2026).
    for (const width of [1200, 900, 400]) {
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

  it('o voltar é UM botão (círculo + marca) com o nome e o title de sempre; a 1600 a marca aparece', () => {
    const onExit = mock(() => {})
    const { container } = render(
      <StudioLayoutProvider value={layoutFor(1600)}>
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

  it('abaixo de 1600px a marca vira só nome acessível (e a divisória sai)', () => {
    // 1440 de propósito: com desfazer e refazer na barra, a marca a 1360 empurrava o "Salvo" por
    // baixo do segmentado; hoje ela só aparece com folga.
    const { container } = mount(1440, null)
    const voltar = screen.getByRole('button', { name: 'Sistema Zero Studio' })
    expect(within(voltar).getByText('Sistema Zero Studio').className).toBe('sr-only')
    expect(container.querySelector('.sz-bar-divider')).toBeNull()
  })

  it('sem onExit (aula, admin) a marca é estática e só aparece quando cabe', () => {
    const { container, unmount } = render(
      <StudioLayoutProvider value={layoutFor(1600)}>
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
    // O texto mora num span próprio (que encolhe com reticências); a pílula é o pai dele.
    const salvo = screen.getByText('Salvo').parentElement as HTMLElement
    expect(salvo.className).toBe('sz-bar-seal sz-bar-seal--ok')
    expect(salvo.getAttribute('role')).toBeNull()
    expect(salvo.getAttribute('title')).toBe('Salvo')
    unmount()

    useProjectStore.setState({ isDirty: true })
    const sujo = mount(1440, null)
    expect(screen.getByText('Alterações não salvas').parentElement?.className).toContain(
      'sz-bar-seal--warn',
    )
    sujo.unmount()

    useProjectStore.setState({ saveError: 'Sem espaço no aparelho' })
    mount(1440, null)
    const erro = screen.getByText('Erro ao salvar').parentElement as HTMLElement
    expect(erro.className).toContain('sz-bar-seal--danger')
    expect(erro.getAttribute('title')).toBe('Sem espaço no aparelho')
  })

  // Full review de 11/09/2026: com desfazer e refazer na barra, os limites antigos deixavam a
  // esquerda passar por baixo do segmentado (medido no playground com o chrome do host, no pior
  // caso de texto). Os limites novos, travados pelo que eles fazem:
  it('no largo apertado (abaixo de 1400) as pílulas e o segmentado ficam no ícone, na altura larga', () => {
    mount(1200, null, (node) => <StudioShareProvider value={SHARE}>{node}</StudioShareProvider>)
    const header = document.querySelector('header') as HTMLElement
    expect(header.className).toBe('sz-bar')
    const blocos = screen.getByRole('button', { name: 'Blocos' })
    expect(within(blocos).getByText('Blocos').className).toBe('sr-only')
    expect(screen.getByRole('button', { name: 'Compartilhar' }).textContent).toBe('')
  })

  it('abaixo de 520px a barra fica compacta (o "Salvo" vira a bolinha, o nome perde o lápis)', () => {
    const { container } = mount(500, null)
    expect(container.querySelector('header')?.className).toContain('sz-bar--compact')
    expect(screen.getByRole('status', { name: 'Salvo' }).className).toContain('rounded-full')
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

describe('Topbar × desfazer e refazer', () => {
  /** Uma pilha falsa que a barra lê pelo registro da instância (o `editorHistory` das stores). */
  function fakeHistory(canUndo: boolean, canRedo: boolean) {
    const listeners = new Set<() => void>()
    const state = { canUndo, canRedo }
    return {
      state,
      undo: mock(() => {}),
      redo: mock(() => {}),
      canUndo: () => state.canUndo,
      canRedo: () => state.canRedo,
      subscribe(listener: () => void) {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
      emit() {
        for (const listener of listeners) listener()
      },
    }
  }

  function mountInStudio(width: number, mode: 'blocks' | 'bridge' | 'code' = 'blocks') {
    const stores = createStudioStores({ persistence: 'none' })
    const project = createEmptyProject('01J00000000000000000000UND', 'Meu jogo')
    stores.project.setState({ project: { ...project, mode }, isDirty: false, saveError: null })
    const view = render(
      <StudioStoresContext.Provider value={stores}>
        <StudioLayoutProvider value={layoutFor(width)}>
          <Topbar onExit={() => {}} />
        </StudioLayoutProvider>
      </StudioStoresContext.Provider>,
    )
    return { stores, view }
  }

  it('fora de um Studio (sem editor) a barra não mostra os botões', () => {
    mount(1440, null)
    expect(screen.queryByRole('button', { name: 'Desfazer' })).toBeNull()
  })

  it('no largo: dois círculos entre o Zappy e o olho, nome fixo e a dica diz onde', () => {
    const { stores } = mountInStudio(1440)
    const blocos = fakeHistory(true, false)
    act(() => {
      stores.editorHistory.register('blocks', blocos)
    })
    const desfazer = screen.getByRole('button', { name: 'Desfazer' })
    const refazer = screen.getByRole('button', { name: 'Refazer' })
    expect(desfazer.className).toBe('sz-bar-icon-btn')
    expect(desfazer.getAttribute('title')).toBe('Desfazer nos blocos (Ctrl+Z)')
    expect(refazer.getAttribute('title')).toBe('Refazer nos blocos (Ctrl+Y)')
    expect((desfazer as HTMLButtonElement).disabled).toBe(false)
    expect((refazer as HTMLButtonElement).disabled).toBe(true)
    // A ordem da tela-modelo: desfazer e refazer antes do olho, do "⋯" e do Compartilhar.
    const fim = desfazer.closest('.sz-bar__end') as HTMLElement
    const nomes = within(fim)
      .getAllByRole('button')
      .map((b) => b.getAttribute('aria-label'))
    expect(nomes.slice(0, 4)).toEqual([
      'Desfazer',
      'Refazer',
      'Ocultar pré-visualização',
      'Mais opções',
    ])

    fireEvent.click(desfazer)
    expect(blocos.undo).toHaveBeenCalledTimes(1)
    // A pilha mudou (o adaptador avisa): o refazer liga.
    blocos.state.canRedo = true
    act(() => blocos.emit())
    fireEvent.click(screen.getByRole('button', { name: 'Refazer' }))
    expect(blocos.redo).toHaveBeenCalledTimes(1)
  })

  it('com o editor ainda carregando (nada registrado), os botões aparecem desligados', () => {
    mountInStudio(1440)
    const desfazer = screen.getByRole('button', { name: 'Desfazer' })
    expect((desfazer as HTMLButtonElement).disabled).toBe(true)
  })

  it('na Ponte o alvo é o último editor tocado: blocos até a criança tocar no código', () => {
    const { stores } = mountInStudio(1440, 'bridge')
    const blocos = fakeHistory(true, false)
    const codigo = fakeHistory(true, true)
    act(() => {
      stores.editorHistory.register('blocks', blocos)
      stores.editorHistory.register('code', codigo)
    })
    const desfazer = () => screen.getByRole('button', { name: 'Desfazer' })
    expect(desfazer().getAttribute('title')).toBe('Desfazer nos blocos (Ctrl+Z)')

    act(() => stores.editorHistory.markActive('code'))
    expect(desfazer().getAttribute('title')).toBe('Desfazer no código (Ctrl+Z)')
    fireEvent.click(desfazer())
    expect(codigo.undo).toHaveBeenCalledTimes(1)
    expect(blocos.undo).not.toHaveBeenCalled()
  })

  it('no modo Código o alvo é sempre o código', () => {
    const { stores } = mountInStudio(1440, 'code')
    const codigo = fakeHistory(true, false)
    act(() => {
      stores.editorHistory.register('code', codigo)
      // Um toque antigo nos blocos (de outro modo) não muda o alvo aqui.
      stores.editorHistory.markActive('blocks')
    })
    const desfazer = screen.getByRole('button', { name: 'Desfazer' })
    expect(desfazer.getAttribute('title')).toBe('Desfazer no código (Ctrl+Z)')
  })

  it('abaixo de 720px (o estreito apertado) os dois também moram no "⋯"; a 760 ficam na barra', () => {
    const acima = mountInStudio(760)
    act(() => {
      acima.stores.editorHistory.register('blocks', fakeHistory(true, false))
    })
    expect(screen.getByRole('button', { name: 'Desfazer' })).toBeTruthy()
    acima.view.unmount()

    const { stores } = mountInStudio(700)
    act(() => {
      stores.editorHistory.register('blocks', fakeHistory(true, false))
    })
    expect(screen.queryByRole('button', { name: 'Desfazer' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Mais opções' }))
    const editar = screen.getByRole('group', { name: 'Editar' })
    expect(
      within(editar)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Desfazer', 'Refazer'])
  })

  it('no compacto os dois saem da barra e entram no "⋯", numa seção Editar', () => {
    const { stores } = mountInStudio(390)
    const blocos = fakeHistory(true, false)
    act(() => {
      stores.editorHistory.register('blocks', blocos)
    })
    expect(screen.queryByRole('button', { name: 'Desfazer' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Mais opções' }))
    const editar = screen.getByRole('group', { name: 'Editar' })
    const itens = within(editar).getAllByRole('menuitem')
    expect(itens.map((item) => item.textContent)).toEqual(['Desfazer', 'Refazer'])
    expect((itens[1] as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(itens[0] as HTMLElement)
    expect(blocos.undo).toHaveBeenCalledTimes(1)
  })
})

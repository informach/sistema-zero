import { afterEach, describe, expect, it } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createEmptyProject } from '#core'
import { en } from '../../../core/i18n/en'
import { ptBR } from '../../../core/i18n/pt-BR'
import { StudioStoresContext } from '../../../state/storesContext'
import { createStudioStores } from '../../../state/studioStores'
import { StudioCloudSyncProvider } from '../../../studio/cloud-sync'
import { STANDALONE_CONFIG, StudioConfigProvider } from '../../../studio/config'
import { StudioLayoutProvider } from '../../../studio/layoutContext'
import { Topbar } from '../Topbar'
import { STUDIO_MENU_LAYOUT, type StudioMenuItemId } from '../topbar/menuLayout'

/**
 * A árvore editorial do menu "⋯" (18/09/2026) e o que ela promete. A régua é a
 * mesma da reorganização da paleta do Jogo 2D, e cada caso aqui existe porque a
 * falha correspondente seria MUDA: um item da árvore sem comportamento nunca
 * aparece, e uma linha de apoio dentro do botão engoliria o nome acessível — os
 * dois "funcionam". ⚠️ A direção oposta (comportamento registrado para um id que
 * NÃO está na árvore) não precisa de caso aqui: a lista é derivada da árvore e o
 * mapa é tipado por ela, então o compilador recusa o id órfão — medido, a
 * sabotagem só passa com um `as` explícito.
 */
describe('a árvore editorial do menu ⋯', () => {
  afterEach(cleanup)

  const grupos = STUDIO_MENU_LAYOUT.map((g) => g.id)
  const itens = STUDIO_MENU_LAYOUT.flatMap((g) => g.items.map((i) => i.id))

  /** A régua do despejo, aplicada a uma lista qualquer de grupos. */
  const despejoEntre = (grupos: { id: string; labelKey: string }[]) =>
    grupos
      .filter((g) => /mais|outros|tudo|misc|geral/i.test(`${g.id} ${ptBR[g.labelKey] ?? ''}`))
      .map((g) => g.id)

  it('não tem grupo de despejo ("Mais", "Outros", "Tudo")', () => {
    // O balde é a versão silenciosa do problema: quem não cabe em grupo nenhum
    // cai lá e a criança acha o item no lugar errado, sem nada acusar. A poda de
    // grupo VAZIO continua valendo (é o que faz a aula mostrar menos).
    expect(despejoEntre([...STUDIO_MENU_LAYOUT])).toEqual([])
  })

  it('e a régua do despejo MORDE (senão o caso acima passaria para sempre)', () => {
    // Sem esta metade, corromper a expressão regular deixaria o teste de cima
    // verde eternamente — é o `toEqual([])` sobre filtro derivado que esta base
    // já pagou caro noutros lugares.
    expect(despejoEntre([{ id: 'misc', labelKey: 'topbar.group.studio' }])).toEqual(['misc'])
    expect(despejoEntre([{ id: 'take', labelKey: 'topbar.group.take' }])).toEqual([])
  })

  it('cada item mora em UM grupo só, e nenhum id se repete', () => {
    expect([...new Set(itens)].length).toBe(itens.length)
    expect([...new Set(grupos)].length).toBe(grupos.length)
  })

  it('todo texto da árvore existe nos DOIS dicionários', () => {
    const chaves = [
      ...STUDIO_MENU_LAYOUT.map((g) => g.labelKey),
      ...STUDIO_MENU_LAYOUT.flatMap((g) =>
        g.items.flatMap((i) => ('hintKey' in i ? [i.labelKey, i.hintKey] : [i.labelKey])),
      ),
    ]
    expect(chaves.filter((k) => !ptBR[k])).toEqual([])
    expect(chaves.filter((k) => !en[k])).toEqual([])
  })

  /** Monta a barra com TODAS as features do host ligadas e devolve os ids exibidos. */
  function idsExibidos(
    mode: 'blocks' | 'code',
    opts: { with3D?: boolean } = {},
    width = 390,
  ): StudioMenuItemId[] {
    // Limpa ANTES (e não depois): quem chama dois contextos seguidos teria duas
    // barras na tela, e o `getByRole` acusaria ambiguidade em vez do que mede.
    cleanup()
    const stores = createStudioStores({ persistence: 'none' })
    const project = createEmptyProject('01J0000000000000000000MENU', 'Meu jogo')
    stores.project.setState({
      project: {
        ...project,
        mode,
        installedExtensions: opts.with3D
          ? [{ id: 'game-3d', version: '0.30.0', installedAt: 0 }]
          : project.installedExtensions,
      },
      isDirty: false,
      saveError: null,
    })
    render(
      <StudioStoresContext.Provider value={stores}>
        <StudioConfigProvider value={{ ...STANDALONE_CONFIG, professional: true }}>
          <StudioCloudSyncProvider value={() => {}}>
            <StudioLayoutProvider value={{ width, isNarrow: width < 1024, isCompact: width < 440 }}>
              <Topbar onExit={() => {}} canToggleTheme />
            </StudioLayoutProvider>
          </StudioCloudSyncProvider>
        </StudioConfigProvider>
      </StudioStoresContext.Provider>,
    )
    act(() => {
      stores.editorHistory.register('blocks', {
        undo: () => {},
        redo: () => {},
        canUndo: () => true,
        canRedo: () => true,
        subscribe: () => () => {},
      })
    })
    fireEvent.click(screen.getByRole('button', { name: 'Mais opções' }))
    return screen
      .getAllByRole('menuitem')
      .map((el) => el.getAttribute('data-sz-menu-item') as StudioMenuItemId)
  }

  it('todo item da árvore é alcançável por ALGUM contexto real (nenhum item morto)', () => {
    // Nenhum contexto sozinho mostra tudo: terminal e IA só existem no modo
    // Código, os materiais só no básico (o Pro gerencia arquivos na árvore) e a
    // porta dos modelos 3D pede quem consuma 3D. A UNIÃO dos contextos é que tem
    // de cobrir a árvore inteira — um id que nenhum cenário produz é item que a
    // criança nunca vê.
    const cobertos = new Set([
      ...idsExibidos('blocks'),
      ...idsExibidos('blocks', { with3D: true }),
      ...idsExibidos('code'),
    ])
    expect(itens.filter((id) => !cobertos.has(id))).toEqual([])
  })

  it('os itens saem na ordem da árvore, agrupados como ela manda', () => {
    const exibidos = idsExibidos('blocks')
    // ⚠️ A lista INTEIRA e literal, não um piso numérico: com `length > 8` o menu
    // podia perder um grupo de quatro itens e passar. Este é o contexto do host
    // com tudo ligado, a 390px (por isso desfazer e refazer entram no menu).
    expect(exibidos).toEqual([
      'undo',
      'redo',
      'save',
      'sync',
      'extensions',
      'convert',
      'assetsImages',
      'assetsSounds',
      'console',
      'exportStudio',
      'download',
      'export',
      'theme',
      'projects',
    ])
    // ⚠️ Anti-vácuo do AGRUPAMENTO: sem esta linha, achatar o menu numa lista só
    // (ou tirar o `aria-label` dos grupos) deixaria o laço abaixo sem nenhuma
    // caixa para conferir, e ele viraria um no-op verde. Ela também é o que cobra
    // a poda de grupo VAZIO — um cabeçalho sem item nenhum apareceria aqui.
    // Escopado no `role="menu"`: o segmentado dos modos também é um `fieldset`.
    const menu = screen.getByRole('menu', { name: 'Mais opções' })
    const gruposEsperados = STUDIO_MENU_LAYOUT.filter((g) =>
      g.items.some((i) => exibidos.includes(i.id)),
    )
    expect(
      within(menu)
        .getAllByRole('group')
        .map((el) => el.getAttribute('aria-label')),
    ).toEqual(gruposEsperados.map((g) => ptBR[g.labelKey] ?? null))
    for (const grupo of gruposEsperados) {
      const caixa = within(menu).getByRole('group', { name: ptBR[grupo.labelKey] })
      const dentro = within(caixa)
        .getAllByRole('menuitem')
        .map((el) => el.getAttribute('data-sz-menu-item'))
      expect(dentro).toEqual(grupo.items.map((i) => i.id).filter((id) => dentro.includes(id)))
    }
  })

  it('a linha de apoio NÃO entra no nome acessível do item', () => {
    // O nome acessível é contrato dos e2e (`getByRole('menuitem', { exact: true })`
    // do Playwright).
    // Sem o `aria-label` do `Menu`, o nome viraria "Baixar o código uma pasta .zip…"
    // e os specs quebrariam em silêncio.
    idsExibidos('blocks')
    // `name` como string no testing-library já é casamento EXATO da string
    // normalizada — é a mesma pergunta que o `exact: true` faz no Playwright.
    expect(screen.getByRole('menuitem', { name: 'Baixar o código' })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: 'Salvar' })).toBeTruthy()
    expect(screen.getByText(ptBR['topbar.hint.download'] as string)).toBeTruthy()
  })
})

/**
 * As três portas dos materiais no menu. A janela é UMA só, então o que a criança
 * vê ligado precisa ser a aba que está aberta — marcar as três diria que há três
 * janelas, e não marcar nenhuma esconderia que a janela já está aberta.
 */
describe('as portas dos materiais no menu ⋯', () => {
  afterEach(cleanup)

  function montar(mode: 'blocks' | 'code' = 'blocks') {
    const stores = createStudioStores({ persistence: 'none' })
    const project = createEmptyProject('01J000000000000000000PORT', 'Meu jogo')
    stores.project.setState({ project: { ...project, mode }, isDirty: false, saveError: null })
    render(
      <StudioStoresContext.Provider value={stores}>
        <StudioLayoutProvider value={{ width: 1440, isNarrow: false, isCompact: false }}>
          <Topbar onExit={() => {}} />
        </StudioLayoutProvider>
      </StudioStoresContext.Provider>,
    )
    const abrirMenu = () => fireEvent.click(screen.getByRole('button', { name: 'Mais opções' }))
    return { stores, abrirMenu }
  }

  it('Imagens e Sons são portas distintas, e o som deixou de morar atrás de "Imagens"', () => {
    const { abrirMenu } = montar()
    abrirMenu()
    expect(screen.getByRole('menuitem', { name: 'Imagens' })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: 'Sons' })).toBeTruthy()
    // ⚠️ Com a janela FECHADA nenhuma porta pode aparecer ligada. Sem esta metade,
    // apagar o `showAssets &&` do `active` passaria batido: a porta da aba padrão
    // ficaria marcada como aberta para sempre.
    expect(
      screen.getByRole('menuitem', { name: 'Imagens' }).getAttribute('aria-current'),
    ).toBeNull()
  })

  it('sem quem consuma 3D, sem arquivo 3D e sem o Molda, a porta "Modelos 3D" não existe', () => {
    const { abrirMenu } = montar()
    abrirMenu()
    expect(screen.queryByRole('menuitem', { name: 'Modelos 3D' })).toBeNull()
  })

  it('só a porta da aba ABERTA fica ligada', () => {
    const { stores, abrirMenu } = montar()
    act(() => {
      stores.ui.getState().openAssetsTab('sounds')
    })
    abrirMenu()
    expect(screen.getByRole('menuitem', { name: 'Sons' }).getAttribute('aria-current')).toBe('true')
    expect(
      screen.getByRole('menuitem', { name: 'Imagens' }).getAttribute('aria-current'),
    ).toBeNull()
  })

  it('a porta abre a janela na aba dela', () => {
    const { stores, abrirMenu } = montar()
    abrirMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sons' }))
    expect(stores.ui.getState().showAssets).toBe(true)
    expect(stores.ui.getState().assetsTab).toBe('sounds')
  })

  it('no modo Código não há porta de material nenhuma (o Pro usa a árvore de arquivos)', () => {
    const { abrirMenu } = montar('code')
    abrirMenu()
    expect(screen.queryByRole('menuitem', { name: 'Imagens' })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: 'Sons' })).toBeNull()
  })
})

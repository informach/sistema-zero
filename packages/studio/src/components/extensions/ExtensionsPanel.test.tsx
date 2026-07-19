import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createEmptyProject } from '#core'
import { OFFICIAL_CATALOG } from '#official-extensions'
import { useProjectStore } from '../../state/projectStore'
import { resolveLearning, STANDALONE_CONFIG, StudioConfigProvider } from '../../studio/config'
import { StudioExamplesVisibleProvider } from '../../studio/examples-visibility'
import { ExtensionsPanel } from './ExtensionsPanel'

// Exemplos prontos (CORE_EXAMPLES + os das extensões) são material de TESTE do
// admin — podem estar desatualizados/com erro. Só aparecem quando o host libera
// (playground); para clientes o default `false` do contexto os esconde. O painel
// é renderizado FORA de um <Studio>, então lê a store DEFAULT (getState/setState).
function seedProject(): void {
  useProjectStore.setState({
    project: createEmptyProject('p1', 'Meu Jogo'),
    isDirty: false,
    saveError: null,
  })
}

describe('ExtensionsPanel — exemplos gated por showExamples', () => {
  afterEach(() => {
    cleanup()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  it('esconde os "Exemplos clássicos" quando showExamples é false (cliente)', () => {
    seedProject()
    render(
      <StudioExamplesVisibleProvider value={false}>
        <ExtensionsPanel open onClose={() => {}} />
      </StudioExamplesVisibleProvider>,
    )
    expect(screen.queryByText('Exemplos clássicos (sem extensão)')).toBeNull()
  })

  it('mostra os "Exemplos clássicos" quando o host libera (playground)', () => {
    seedProject()
    render(
      <StudioExamplesVisibleProvider value={true}>
        <ExtensionsPanel open onClose={() => {}} />
      </StudioExamplesVisibleProvider>,
    )
    expect(screen.getByText('Exemplos clássicos (sem extensão)')).not.toBeNull()
  })

  it('default do contexto (sem provider) esconde — cliente nunca vê exemplo à toa', () => {
    seedProject()
    render(<ExtensionsPanel open onClose={() => {}} />)
    expect(screen.queryByText('Exemplos clássicos (sem extensão)')).toBeNull()
  })
})

describe('ExtensionsPanel — extensões para instalar gated por nível', () => {
  const ext2d = OFFICIAL_CATALOG.find((e) => e.minLevel === 'iniciante-2d')
  const ext3d = OFFICIAL_CATALOG.find((e) => e.minLevel === 'iniciante-3d')
  if (!ext2d || !ext3d)
    throw new Error('fixture: esperava extensão iniciante-2d (2D) e iniciante-3d (3D)')

  afterEach(() => {
    cleanup()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  it('iniciante (literal LEGADO) NÃO vê o Jogo 3D p/ instalar (só o Jogo 2D)', () => {
    seedProject()
    const config = {
      ...STANDALONE_CONFIG,
      // Literal LEGADO de propósito: prova que a fronteira `resolveLearning`
      // normaliza props públicas antigas (iniciante → iniciante-2d).
      learning: resolveLearning({ level: 'iniciante', allowLevelReveal: false }),
    }
    render(
      <StudioConfigProvider value={config}>
        <ExtensionsPanel open onClose={() => {}} />
      </StudioConfigProvider>,
    )
    expect(screen.getByText(ext2d.manifest.name)).not.toBeNull()
    expect(screen.queryByText(ext3d.manifest.name)).toBeNull()
  })

  it('iniciante-3d (porta do 3D) vê o Jogo 3D, mas não o Mundo 3D (intermediario-3d)', () => {
    seedProject()
    const w3d = OFFICIAL_CATALOG.find((e) => e.manifest.id === 'world-3d')
    if (!w3d) throw new Error('fixture: esperava o world-3d no catálogo')
    const config = {
      ...STANDALONE_CONFIG,
      learning: resolveLearning({ level: 'iniciante-3d', allowLevelReveal: false }),
    }
    render(
      <StudioConfigProvider value={config}>
        <ExtensionsPanel open onClose={() => {}} />
      </StudioConfigProvider>,
    )
    expect(screen.getByText(ext2d.manifest.name)).not.toBeNull()
    expect(screen.getByText(ext3d.manifest.name)).not.toBeNull()
    expect(screen.queryByText(w3d.manifest.name)).toBeNull()
  })

  it('avançado (literal LEGADO → topo da escada) vê as duas (2D e 3D)', () => {
    seedProject()
    const config = {
      ...STANDALONE_CONFIG,
      learning: resolveLearning({ level: 'avancado', allowLevelReveal: false }),
    }
    render(
      <StudioConfigProvider value={config}>
        <ExtensionsPanel open onClose={() => {}} />
      </StudioConfigProvider>,
    )
    expect(screen.getByText(ext2d.manifest.name)).not.toBeNull()
    expect(screen.getByText(ext3d.manifest.name)).not.toBeNull()
  })
})

describe('ExtensionsPanel — "Saiba mais" expande a docs do manifest', () => {
  afterEach(() => {
    cleanup()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  it('a docs fica oculta até expandir; expandir renderiza o markdown; um por vez', () => {
    seedProject()
    render(<ExtensionsPanel open onClose={() => {}} />)
    // Um TÍTULO interno da docs do gk (### vira h5) — só existe após expandir.
    // (O 1º ## repete o NOME da extensão, que já está no card — não serve.)
    const gk = OFFICIAL_CATALOG.find((e) => e.manifest.id === 'game-2d-advanced')
    if (!gk) throw new Error('fixture: esperava o game-2d-advanced no catálogo')
    const heading = 'Começando (a receita)'
    expect(gk.manifest.docs).toContain(`### ${heading}`)
    expect(screen.queryByText(heading)).toBeNull()
    const toggles = screen.getAllByText('📖 Saiba mais')
    expect(toggles.length).toBeGreaterThan(1) // um por card com docs
    const gkCard = screen.getByText(gk.manifest.name).closest('li')
    const gkToggle = gkCard?.querySelector('[aria-expanded]') as HTMLElement
    fireEvent.click(gkToggle)
    expect(screen.getByText(heading)).not.toBeNull()
    expect(gkToggle.textContent).toBe('Esconder detalhes')
    // Abrir OUTRO card fecha o primeiro (acordeão — o modal fica curto).
    const other = screen.getAllByText('📖 Saiba mais')[0] as HTMLElement
    fireEvent.click(other)
    expect(screen.queryByText(heading)).toBeNull()
    // Fechar o aberto volta ao estado inicial.
    fireEvent.click(screen.getByText('Esconder detalhes'))
    expect(screen.queryByText('Esconder detalhes')).toBeNull()
  })
})

describe('ExtensionsPanel — conflitos entre motores', () => {
  afterEach(() => {
    cleanup()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  it('explica por que Jogo 2D Avançado fica bloqueado quando Jogo 2D está instalado', () => {
    const simple = OFFICIAL_CATALOG.find((extension) => extension.manifest.id === 'game-2d')
    const advanced = OFFICIAL_CATALOG.find(
      (extension) => extension.manifest.id === 'game-2d-advanced',
    )
    if (!simple || !advanced) throw new Error('fixture: esperava os dois motores 2D')
    const project = createEmptyProject('p1', 'Meu Jogo')
    project.installedExtensions = [
      { id: simple.manifest.id, version: simple.manifest.version, installedAt: 0 },
    ]
    useProjectStore.setState({ project, isDirty: false, saveError: null })

    render(<ExtensionsPanel open onClose={() => {}} />)

    const card = screen.getByText(advanced.manifest.name).closest('li')
    expect(card?.querySelector('button[disabled]')).not.toBeNull()
    expect(
      screen.getByText(
        `Remova ${simple.manifest.name} antes de instalar: as duas extensões controlam a mesma tela.`,
      ),
    ).not.toBeNull()
  })
})

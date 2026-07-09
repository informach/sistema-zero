import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
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
  const ext2d = OFFICIAL_CATALOG.find((e) => e.minLevel === 'iniciante')
  const ext3d = OFFICIAL_CATALOG.find((e) => e.minLevel === 'intermediario')
  if (!ext2d || !ext3d)
    throw new Error('fixture: esperava extensão iniciante (2D) e intermediário (3D)')

  afterEach(() => {
    cleanup()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  it('iniciante NÃO vê o Jogo 3D p/ instalar (só o Jogo 2D)', () => {
    seedProject()
    const config = {
      ...STANDALONE_CONFIG,
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

  it('avançado vê as duas (2D e 3D)', () => {
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

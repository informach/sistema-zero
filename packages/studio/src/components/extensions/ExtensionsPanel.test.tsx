import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { createEmptyProject } from '#core'
import { useProjectStore } from '../../state/projectStore'
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

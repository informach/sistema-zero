import { afterEach, describe, expect, it, mock } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createEmptyProject } from '#core'
import { StudioStoresContext } from '../../state/storesContext'
import { createStudioStores } from '../../state/studioStores'
import { StudioLayoutProvider } from '../../studio/layoutContext'
import { ClassicStage } from '../preview/ClassicStage'
import { ClassicDock } from './ClassicDock'

/**
 * A gaveta do clássico e o caminho único do erro (redesenho de 11/2026, D4): a gaveta começa
 * fechada só com as abas e os contadores; o erro do jogo aparece no palco ("Opa, o jogo parou"),
 * conta em Problemas e pede ao editor o "Mostrar o bloco"; as Mensagens não repetem o erro.
 */
function setup(width = 1440) {
  const stores = createStudioStores({ persistence: 'none' })
  stores.project.setState({
    project: createEmptyProject('01J0000000000000000000DOCK', 'Meu jogo'),
    isDirty: false,
    saveError: null,
  })
  const wrap = (node: ReactElement) => (
    <StudioStoresContext.Provider value={stores}>
      <StudioLayoutProvider value={{ width, isNarrow: width < 1024, isCompact: width < 440 }}>
        {node}
      </StudioLayoutProvider>
    </StudioStoresContext.Provider>
  )
  return { stores, wrap }
}

const runtimeError = {
  phase: 'error' as const,
  canRun: true,
  canStop: true,
  errorKind: 'runtime' as const,
  error: "TypeError: Cannot read properties of undefined (reading 'x')",
  errorHint: 'Você tentou usar algo que ainda não existe.',
  errorAt: { file: 'script.js', line: 7 },
}

afterEach(cleanup)

describe('ClassicDock', () => {
  it('começa fechada: só as abas Mensagens do jogo e Problemas, sem corpo aberto', () => {
    const { wrap } = setup()
    render(wrap(<ClassicDock />))
    const abas = screen.getAllByRole('tab').map((tab) => tab.textContent)
    expect(abas).toEqual(['Mensagens do jogo', 'Problemas'])
    expect(
      screen.getAllByRole('tab').every((tab) => tab.getAttribute('aria-selected') === 'false'),
    ).toBe(true)
    expect(
      screen.getByRole('button', { name: 'Abrir a gaveta' }).getAttribute('aria-expanded'),
    ).toBe('false')
  })

  it('o erro do jogo conta 1 em Problemas; o cartão tem "Mostrar o bloco", que pede ao editor', () => {
    const { stores, wrap } = setup()
    const run = mock(() => {})
    act(() => stores.proRun.getState().publish(runtimeError, { run, stop: () => {} }))
    render(wrap(<ClassicDock />))
    const problemas = screen.getByRole('tab', { name: /Problemas/ })
    expect(within(problemas).getByText('1')).toBeTruthy()
    fireEvent.click(problemas)
    expect(problemas.getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('Você tentou usar algo que ainda não existe.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar o bloco' }))
    expect(stores.highlight.getState().revealRequest?.target).toEqual({ kind: 'runtime' })
    fireEvent.click(screen.getByRole('button', { name: 'Rodar de novo' }))
    expect(run).toHaveBeenCalledTimes(1)
    // Apertar a aba aberta fecha a gaveta.
    fireEvent.click(problemas)
    expect(stores.ui.getState().classicDock).toBe('closed')
  })

  it('o código da Ponte que não vira blocos e os rascunhos também moram em Problemas', () => {
    const { stores, wrap } = setup()
    act(() => {
      stores.diagnostics.getState().setCodeIssue({ kind: 'syntax', message: 'Unexpected token' })
      stores.diagnostics.getState().setDraftBlockIds(['a', 'b'])
      stores.ui.getState().setClassicDock('problems')
    })
    render(wrap(<ClassicDock />))
    expect(screen.getByText('O código tem um erro de digitação')).toBeTruthy()
    expect(screen.getByText('2 pedaços estão fora das áreas e não rodam.')).toBeTruthy()
    // Rascunho não é problema vermelho: o contador conta só o código.
    expect(within(screen.getByRole('tab', { name: /Problemas/ })).getByText('1')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar o primeiro' }))
    expect(stores.highlight.getState().revealRequest?.target).toEqual({
      kind: 'block',
      blockId: 'a',
    })
  })

  it('no estreito vira a aba sempre aberta, sem Abrir/Fechar, e avisa para trazer os blocos', () => {
    const { stores, wrap } = setup(800)
    const onRevealBlock = mock(() => {})
    act(() => stores.proRun.getState().publish(runtimeError, { run: () => {}, stop: () => {} }))
    act(() => stores.ui.getState().setClassicDock('problems'))
    render(wrap(<ClassicDock variant="tab" onRevealBlock={onRevealBlock} />))
    expect(screen.queryByRole('button', { name: 'Abrir a gaveta' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Fechar a gaveta' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar o bloco' }))
    expect(onRevealBlock).toHaveBeenCalledTimes(1)
  })
})

describe('ClassicStage × o erro do jogo', () => {
  it('"Opa, o jogo parou" com a dica, "Rodar de novo" e "Mostrar o bloco"', () => {
    const { stores, wrap } = setup()
    const run = mock(() => {})
    const onShowBlock = mock(() => {})
    act(() => stores.proRun.getState().publish(runtimeError, { run, stop: () => {} }))
    render(
      wrap(
        <ClassicStage subject="game" phone={false} cards="all" onShowBlock={onShowBlock}>
          <div />
        </ClassicStage>,
      ),
    )
    const cartao = screen.getByRole('alert')
    expect(within(cartao).getByText('Opa, o jogo parou')).toBeTruthy()
    expect(within(cartao).getByText('Você tentou usar algo que ainda não existe.')).toBeTruthy()
    fireEvent.click(within(cartao).getByRole('button', { name: 'Mostrar o bloco' }))
    expect(onShowBlock).toHaveBeenCalledTimes(1)
    fireEvent.click(within(cartao).getByRole('button', { name: 'Rodar de novo' }))
    expect(run).toHaveBeenCalledTimes(1)
    // O texto técnico fica guardado em "O que o computador disse", fechado.
    expect(within(cartao).getByText('O que o computador disse').closest('details')?.open).toBe(
      false,
    )
  })

  it('sem lugar no código, o botão leva aos Problemas', () => {
    const { stores, wrap } = setup()
    const onOpenProblems = mock(() => {})
    act(() =>
      stores.proRun
        .getState()
        .publish({ ...runtimeError, errorAt: undefined }, { run: () => {}, stop: () => {} }),
    )
    render(
      wrap(
        <ClassicStage subject="game" phone={false} cards="error" onOpenProblems={onOpenProblems}>
          <div />
        </ClassicStage>,
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Ver em Problemas' }))
    expect(onOpenProblems).toHaveBeenCalledTimes(1)
  })
})

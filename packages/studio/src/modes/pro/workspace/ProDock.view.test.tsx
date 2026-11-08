import { afterEach, describe, expect, it, mock } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { createEmptyProject } from '../../../core/project'
import type { ProjectTree } from '../../../core/proProject'
import type { ProAnalysisState, ProEditorDiagnostic } from '../../../monaco/pro/session'
import { StudioStoresContext } from '../../../state/storesContext'
import { createStudioStores } from '../../../state/studioStores'
import { studioTutorSourceHash } from '../../../studio/tutorSafety'
import type { ProWorkspaceBottom } from './model'
import { ProDock } from './ProDock'

afterEach(cleanup)

const content = 'const score: number = "zero"'
const tree: ProjectTree = { 'src/main.ts': { kind: 'file', content } }
const problem: ProEditorDiagnostic = {
  path: 'src/main.ts',
  line: 1,
  column: 7,
  code: 2322,
  message: "Type 'string' is not assignable to type 'number'.",
  sourceHash: studioTutorSourceHash(content),
  severity: 'error',
}

function mount({
  python = false,
  diagnostics = [problem] as ProEditorDiagnostic[] | null,
  initial = 'closed' as ProWorkspaceBottom,
  analysis = { status: 'ready' } as ProAnalysisState,
  hideMessages = false,
} = {}) {
  const stores = createStudioStores({ persistence: 'none' })
  if (hideMessages) stores.ui.getState().setConsoleVisibilityOverride(false)
  stores.project.setState({
    project: {
      ...createEmptyProject('dock', 'Jogo'),
      kind: 'pro',
      mode: 'code',
      tree,
      ...(python ? { programmingLanguage: 'python' as const } : {}),
    } as never,
  })
  const navigate = mock((_path: string, _line: number, _column?: number) => {})
  const investigate = mock((_item: ProEditorDiagnostic) => {})
  let selected: ProWorkspaceBottom = initial
  function Harness() {
    const [bottom, setBottom] = useState<ProWorkspaceBottom>(initial)
    selected = bottom
    return (
      <ProDock
        tree={tree}
        diagnostics={diagnostics}
        analysis={analysis}
        selected={bottom}
        onSelect={setBottom}
        navigate={navigate}
        investigate={investigate}
        python={python}
      />
    )
  }
  const view = render(
    <StudioStoresContext.Provider value={stores}>
      <Harness />
    </StudioStoresContext.Provider>,
  )
  return { view, stores, navigate, investigate, selected: () => selected }
}

describe('a gaveta de baixo do Pro (redesenho de 11/2026)', () => {
  it('JavaScript: Mensagens do jogo · Problemas (com a contagem) · Terminal avançado, em abas de verdade', () => {
    const { selected } = mount()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Mensagens do jogo',
      'Problemas1',
      'Terminalavançado',
    ])
    expect(screen.getByRole('region', { name: 'Problemas e saída do jogo' })).toBeTruthy()
    // Apertar abre; apertar a aba aberta fecha.
    fireEvent.click(screen.getByRole('tab', { name: /Problemas/ }))
    expect(selected()).toBe('problems')
    expect(screen.getByRole('tab', { name: /Problemas/ }).getAttribute('aria-selected')).toBe(
      'true',
    )
    fireEvent.click(screen.getByRole('tab', { name: /Problemas/ }))
    expect(selected()).toBe('closed')
    // O botão da direita abre e fecha também.
    fireEvent.click(screen.getByRole('button', { name: 'Abrir a gaveta' }))
    expect(selected()).toBe('console')
    fireEvent.click(screen.getByRole('button', { name: 'Fechar a gaveta' }))
    expect(selected()).toBe('closed')
  })

  it('Python: Problemas · Experimentar comandos · Mensagens do programa (sem terminal)', () => {
    mount({ python: true })
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Problemas1',
      'Experimentar comandos',
      'Mensagens do programa',
    ])
  })

  it('Python: o campo "Comando Python" mora no Experimentar comandos, não nas Mensagens', () => {
    mount({ python: true, initial: 'repl' })
    expect(
      within(screen.getByRole('tabpanel')).getByRole('textbox', { name: 'Comando Python' }),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Mensagens do programa' }))
    const messages = screen.getByRole('tabpanel')
    expect(messages.getAttribute('aria-labelledby')).toContain('console')
    expect(within(messages).queryByRole('textbox', { name: 'Comando Python' })).toBeNull()
  })

  it('Python: esconder "Mensagens do programa" pelo menu ⋯ não leva o Experimentar comandos junto', () => {
    mount({ python: true, hideMessages: true })
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Problemas1',
      'Experimentar comandos',
    ])
  })

  it('cada problema vira um cartão: lugar, a dica como texto principal, ir para a linha e pedir dica', () => {
    const { navigate, investigate } = mount({ initial: 'problems' })
    const panel = screen.getByRole('tabpanel')
    const card = within(panel).getByRole('article')
    expect(card.textContent).toContain('main.ts · linha 1')
    expect(card.textContent).toContain('O valor usado aqui tem um tipo diferente do esperado')
    fireEvent.click(within(card).getByRole('button', { name: 'Ir para src/main.ts:1' }))
    expect(navigate).toHaveBeenCalledWith('src/main.ts', 1, 7)
    fireEvent.click(within(card).getByRole('button', { name: 'Pedir uma dica ao Zappy' }))
    expect(investigate).toHaveBeenCalledTimes(1)
    // A mensagem técnica fica dobrada em "O que o computador disse".
    expect(within(card).getByText('O que o computador disse')).toBeTruthy()
  })

  it('sem problemas, a aba ganha o ✓ e o texto convida a rodar o jogo', () => {
    mount({ diagnostics: [], initial: 'problems' })
    expect(screen.getByRole('tab', { name: /Problemas/ }).textContent).toContain('Nenhum problema')
    expect(screen.getByText(/Rode o jogo para ver o resultado/)).toBeTruthy()
  })

  it('sem a análise pronta (ainda analisando, ou ela falhou) não há ✓: zero problemas não é "tudo certo"', () => {
    mount({ diagnostics: [], analysis: { status: 'error', message: 'o analisador caiu' } })
    expect(screen.getByRole('tab', { name: /Problemas/ }).textContent).toBe('Problemas')
    cleanup()
    mount({ diagnostics: [], analysis: { status: 'pending' } })
    expect(screen.getByRole('tab', { name: /Problemas/ }).textContent).toBe('Problemas')
  })

  it('Mensagens: filtros Tudo · Avisos · Erros sobre o console da instância', () => {
    const { stores } = mount({ initial: 'console' })
    act(() => {
      stores.logs
        .getState()
        .push({ source: 'sz-preview', kind: 'log', parts: ['olá'], timestamp: 1 })
      stores.logs
        .getState()
        .push({ source: 'sz-preview', kind: 'warn', parts: ['cuidado'], timestamp: 2 })
    })
    const panel = screen.getByRole('tabpanel')
    expect(panel.textContent).toContain('olá')
    fireEvent.click(within(panel).getByRole('button', { name: 'Avisos' }))
    expect(panel.textContent).not.toContain('olá')
    expect(panel.textContent).toContain('cuidado')
    fireEvent.click(within(panel).getByRole('button', { name: 'Erros' }))
    expect(panel.textContent).toContain('Nada aqui com este filtro.')
    // A contagem é do que está NA TELA, não do console inteiro.
    expect(panel.textContent).toContain('0 mensagens')
    fireEvent.click(within(panel).getByRole('button', { name: 'Avisos' }))
    expect(panel.textContent).toContain('1 mensagem')
  })
})

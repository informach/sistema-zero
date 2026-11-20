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
  it('JavaScript: Mensagens do jogo · Problemas (com a contagem) · Investigar · Desempenho · Terminal avançado, em abas de verdade', () => {
    const { selected } = mount()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Mensagens do jogo',
      'Problemas1',
      'Investigar',
      'Desempenho',
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

describe('Investigar e Desempenho no Pro (proposta aprovada em 20/11/2026)', () => {
  it('Investigar: o caminho até o erro com o arquivo, a linha e "Ir para a linha"', async () => {
    const { stores, navigate } = mount({ diagnostics: [] })
    fireEvent.click(screen.getByRole('tab', { name: 'Investigar' }))
    expect(await screen.findByText(/Quando o jogo parar com um erro/)).toBeTruthy()
    act(() =>
      stores.logs.getState().push({
        source: 'sz-preview',
        kind: 'runtimeError',
        parts: ['TypeError: score is not a function'],
        error: {
          message: 'TypeError: score is not a function',
          stack: [
            'TypeError: score is not a function',
            '    at https://jogo.test/src/main.ts?t=1:1:7',
            '    at https://jogo.test/node_modules/.vite/deps/lib.js:9:1',
          ].join('\n'),
        },
        timestamp: 1,
      }),
    )
    const painel = screen.getByRole('tabpanel', { name: 'Investigar' })
    expect(within(painel).getByText('O caminho até o erro')).toBeTruthy()
    expect(within(painel).getByText('src/main.ts, linha 1')).toBeTruthy()
    // A linha do arquivo como a criança escreveu; a biblioteca fica de fora.
    expect(within(painel).getByText(content)).toBeTruthy()
    expect(within(painel).queryByText(/lib\.js/)).toBeNull()
    fireEvent.click(
      within(painel).getByRole('button', { name: 'Ir para a linha 1 de src/main.ts' }),
    )
    expect(navigate).toHaveBeenCalledWith('src/main.ts', 1, 7)
  })

  it('Desempenho: a medida liga pela aba e para quando a gaveta fecha', async () => {
    const { stores, selected } = mount()
    fireEvent.click(screen.getByRole('tab', { name: 'Desempenho' }))
    const medir = await screen.findByRole('switch', { name: 'Medir o desempenho' })
    // No Pro a medida não monta o jogo de novo.
    expect(screen.getByText(/A medida segue enquanto a gaveta estiver aberta/)).toBeTruthy()
    fireEvent.click(medir)
    expect(stores.ui.getState().measuring).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Fechar a gaveta' }))
    expect(selected()).toBe('closed')
    expect(stores.ui.getState().measuring).toBe(false)
  })

  it('Python Pro não ganha as abas (a tabela da proposta é do Pro em JavaScript)', () => {
    mount({ python: true })
    const abas = screen.getAllByRole('tab').map((tab) => tab.textContent)
    expect(abas).not.toContain('Investigar')
    expect(abas).not.toContain('Desempenho')
  })
})

describe('Meus testes no Pro (proposta aprovada em 20/11/2026)', () => {
  function mountWithServer(answer: (id: string) => { passed: boolean; detail?: string }) {
    const calls: { tests: { id: string }[]; project: unknown }[] = []
    const stores = createStudioStores({
      persistence: 'none',
      studentTestsServer: {
        async run({ project, tests }) {
          calls.push({ project, tests: [...tests] })
          return { results: tests.map((test) => ({ id: test.id, ...answer(test.id) })) }
        },
      },
    })
    const proTree: ProjectTree = {
      'src/main.js': {
        kind: 'file',
        content: 'document.body.textContent = "Editado em JavaScript"',
      },
      'src/regras.js': {
        kind: 'file',
        content: 'export function somarPontos(pontos, bonus) {\n  return pontos + bonus\n}',
      },
    }
    stores.project.setState({
      project: {
        ...createEmptyProject('dock-pro', 'Meu projeto'),
        kind: 'pro',
        mode: 'code',
        tree: proTree,
        proMeta: { templateId: 'vanilla-vite', devScript: 'dev' },
      } as never,
    })
    function Harness() {
      const [bottom, setBottom] = useState<ProWorkspaceBottom>('closed')
      return (
        <ProDock
          tree={proTree}
          diagnostics={[]}
          selected={bottom}
          onSelect={setBottom}
          navigate={() => {}}
        />
      )
    }
    render(
      <StudioStoresContext.Provider value={stores}>
        <Harness />
      </StudioStoresContext.Provider>,
    )
    return { stores, calls }
  }

  it('sem o servidor do host, a aba não aparece no Pro', () => {
    mount()
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).not.toContain('Meus testes')
  })

  it('o teste do jogo e o de uma função exportada, rodados no servidor com o resultado de cada um', async () => {
    const { stores, calls } = mountWithServer((id) =>
      id === 'errado'
        ? { passed: false, detail: 'Com (2, 3) respondeu 6; esperava 5.' }
        : { passed: true },
    )
    const abas = screen.getAllByRole('tab').map((tab) => tab.textContent)
    expect(abas).toEqual([
      'Mensagens do jogo',
      'Problemas✓Nenhum problema',
      'Investigar',
      'Desempenho',
      'Meus testes',
      'Terminalavançado',
    ])
    fireEvent.click(screen.getByRole('tab', { name: 'Meus testes' }))
    fireEvent.click(await screen.findByRole('button', { name: '+ Novo teste' }))
    expect(screen.getByRole('button', { name: 'Testar o jogo' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    // No Pro (fora dos kits), a conferência é o texto da página ou as mensagens.
    const alvo = screen.getByLabelText('O que conferir') as HTMLSelectElement
    expect([...alvo.options].map((option) => option.value)).toEqual(['text', 'console'])
    fireEvent.change(screen.getByLabelText('Nome do teste'), { target: { value: 'O recado' } })
    fireEvent.change(alvo, { target: { value: 'text' } })
    fireEvent.change(screen.getByLabelText('Como comparar'), { target: { value: 'contains' } })
    fireEvent.change(screen.getByLabelText('Valor para comparar'), { target: { value: 'Editado' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tirar o passo 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar teste' }))
    await screen.findByText(/No fim, o texto na tela tem o texto "Editado"\./)
    fireEvent.click(screen.getByRole('button', { name: '+ Novo teste' }))
    fireEvent.click(screen.getByRole('button', { name: 'Testar uma função' }))
    fireEvent.change(screen.getByLabelText('Nome do teste'), { target: { value: 'Somar' } })
    fireEvent.change(screen.getByLabelText('A função'), {
      target: { value: 'src/regras.js:somarPontos' },
    })
    fireEvent.change(screen.getByLabelText('Casos, um por linha'), {
      target: { value: '2, 3 -> 5' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar teste' }))
    await screen.findByText('somarPontos(2, 3) responde 5.')
    const project = stores.project.getState().project as { studentTests?: { rule: unknown }[] }
    expect(project.studentTests?.[1]?.rule).toEqual({
      type: 'functionReturns',
      name: 'somarPontos',
      module: 'src/regras.js',
      cases: [{ args: [2, 3], expected: 5 }],
    })
    fireEvent.click(screen.getByRole('button', { name: 'Rodar os testes' }))
    expect(await screen.findByText('2 de 2 testes passaram.')).toBeTruthy()
    expect(screen.getByText(/Rodou no servidor em 1 segundo\./)).toBeTruthy()
    expect(screen.getByText('Passou: o texto na tela tem o texto "Editado".')).toBeTruthy()
    expect(screen.getByText('Passou: a função respondeu certo.')).toBeTruthy()
    // Um lote só (até 8 testes), com o projeto inteiro.
    expect(calls).toHaveLength(1)
    expect(calls[0]?.tests).toHaveLength(2)
    expect(calls[0]?.project).toMatchObject({
      kind: 'pro',
      proMeta: { templateId: 'vanilla-vite' },
    })
  })
})

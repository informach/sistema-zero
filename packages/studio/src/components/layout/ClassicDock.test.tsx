import { afterEach, describe, expect, it, mock } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createEmptyProject } from '#core'
import type { PythonClassicProjectDocument } from '../../core/pythonProject'
import { PGZERO_EXTENSION } from '../../runtime/python/pgzero/contract'
import {
  investigationWindowFor,
  perfWindowFor,
  programTimeFor,
  setDevtoolsSender,
} from '../../state/devtools'
import { documentFixture } from '../../state/fixtures/projectDocuments'
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
  it('começa fechada: Mensagens do jogo, Problemas, Investigar, Desempenho e Meus testes, sem corpo aberto', () => {
    const { wrap } = setup()
    render(wrap(<ClassicDock />))
    const abas = screen.getAllByRole('tab').map((tab) => tab.textContent)
    expect(abas).toEqual([
      'Mensagens do jogo',
      'Problemas',
      'Investigar',
      'Desempenho',
      'Meus testes',
    ])
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

describe('a aba Desempenho (proposta aprovada em 20/11/2026)', () => {
  const fatia = {
    fps: 22,
    frameMsAvg: 45,
    frameMsMax: 120,
    sprites: 2,
    objects: null,
    draws: null,
    canvas: true,
  }

  it('no Python, as três abas: Investigar, Desempenho e Meus testes', () => {
    const { stores, wrap } = setup()
    act(() =>
      stores.project.setState({
        project: {
          ...createEmptyProject('01J0000000000000000000PYTH', 'Meu programa'),
          programmingLanguage: 'python',
        } as never,
      }),
    )
    render(wrap(<ClassicDock />))
    const abas = screen.getAllByRole('tab').map((tab) => tab.textContent)
    expect(abas).toContain('Desempenho')
    expect(abas).toContain('Investigar')
    expect(abas).toContain('Meus testes')
  })

  it('liga a medida pelo botão e mostra os números do jogo, cada um com a sua marca', async () => {
    const { stores, wrap } = setup()
    act(() =>
      stores.proRun
        .getState()
        .publish(
          { phase: 'running', canRun: true, canStop: true },
          { run: () => {}, stop: () => {} },
        ),
    )
    render(wrap(<ClassicDock />))
    fireEvent.click(screen.getByRole('tab', { name: 'Desempenho' }))
    const medir = await screen.findByRole('switch', { name: 'Medir o desempenho' })
    expect(medir.getAttribute('aria-checked')).toBe('false')
    fireEvent.click(medir)
    expect(stores.ui.getState().measuring).toBe(true)
    act(() => perfWindowFor(stores.ui).getState().push(fatia))
    const painel = screen.getByRole('tabpanel')
    expect(within(painel).getByText('22')).toBeTruthy()
    expect(within(painel).getByText('45')).toBeTruthy()
    // A memória do jogo o navegador não informa: sem leitura, marcada como indisponível.
    expect(within(painel).getAllByText('Sem leitura')).toHaveLength(1)
    expect(within(painel).getAllByText('indisponível')).toHaveLength(1)
    expect(within(painel).getAllByText('medido')).toHaveLength(3)
    expect(within(painel).getByText(/o jogo ficou lento 1 vez/)).toBeTruthy()
    expect(within(painel).getByText('O quadro mais lento levou 120 ms.')).toBeTruthy()
  })

  it('no Python que desenha, só os quadros por segundo e o tempo de cada quadro', async () => {
    const { stores, wrap } = setup()
    act(() => {
      stores.project.setState({
        project: {
          ...createEmptyProject('01J0000000000000000000PYTH', 'Tartaruga'),
          programmingLanguage: 'python',
        } as never,
      })
      programTimeFor(stores.ui).setState({ canvas: true })
      stores.proRun
        .getState()
        .publish(
          { phase: 'running', canRun: true, canStop: true },
          { run: () => {}, stop: () => {} },
        )
    })
    render(wrap(<ClassicDock />))
    fireEvent.click(screen.getByRole('tab', { name: 'Desempenho' }))
    fireEvent.click(await screen.findByRole('switch', { name: 'Medir o desempenho' }))
    act(() =>
      perfWindowFor(stores.ui)
        .getState()
        .push({ ...fatia, sprites: null, objects: null, draws: null }),
    )
    const painel = screen.getByRole('tabpanel')
    expect(within(painel).getByText('22')).toBeTruthy()
    expect(within(painel).queryByText('Coisas no jogo')).toBeNull()
    expect(within(painel).getByText(/Medir não pesa no programa/)).toBeTruthy()
  })

  it('quando o ambiente recusa a medida, a aba diz que ainda não dá para medir', async () => {
    const { stores, wrap } = setup()
    act(() => {
      stores.project.setState({
        project: {
          ...createEmptyProject('01J0000000000000000000PYTH', 'Tartaruga'),
          programmingLanguage: 'python',
        } as never,
      })
      programTimeFor(stores.ui).setState({ canvas: true })
      stores.proRun
        .getState()
        .publish(
          { phase: 'running', canRun: true, canStop: true },
          { run: () => {}, stop: () => {} },
        )
    })
    render(wrap(<ClassicDock />))
    fireEvent.click(screen.getByRole('tab', { name: 'Desempenho' }))
    fireEvent.click(await screen.findByRole('switch', { name: 'Medir o desempenho' }))
    expect(screen.getByText(/os primeiros números chegam/)).toBeTruthy()
    act(() => perfWindowFor(stores.ui).getState().refuse())
    expect(screen.getByText('Ainda não dá para medir este programa aqui.')).toBeTruthy()
  })

  it('Investigar no Python: os valores, o "Mostrar o bloco" pela linha e o caminho até o erro', async () => {
    const { stores, wrap } = setup()
    const python = {
      ...createEmptyProject('01J0000000000000000000PYTH', 'Contas'),
      programmingLanguage: 'python',
      kind: 'classic',
      python: { entrypoint: 'main.py' },
      files: {
        'main.py': ['pontos = 0', 'vidas = 3', 'print(pontos)', ''].join('\n'),
        'inimigos.py': ['def mover():', '    velocidade + 1', ''].join('\n'),
      },
    }
    act(() => {
      stores.project.setState({ project: python as never })
      stores.proRun
        .getState()
        .publish(
          { phase: 'running', canRun: true, canStop: true },
          { run: () => {}, stop: () => {} },
        )
    })
    render(wrap(<ClassicDock />))
    fireEvent.click(screen.getByRole('tab', { name: 'Investigar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Investigar o programa' }))
    expect(stores.ui.getState().investigating).toBe(true)
    act(() =>
      investigationWindowFor(stores.ui)
        .getState()
        .receive({
          frame: null,
          paused: false,
          canPause: false,
          pauseLater: false,
          values: [
            { name: 'pontos', text: '0' },
            { name: 'vidas', text: '3' },
          ],
          error: null,
        }),
    )
    const painel = screen.getByRole('tabpanel')
    expect(within(painel).getByText('O programa está rodando')).toBeTruthy()
    expect(within(painel).getByText(/O Python ainda não pausa pelo Estúdio/)).toBeTruthy()
    fireEvent.click(
      within(painel).getAllByRole('button', { name: 'Mostrar o bloco' })[1] as HTMLElement,
    )
    expect(stores.highlight.getState().revealRequest?.target).toEqual({
      kind: 'line',
      file: 'main.py',
      line: 2,
    })
    // O programa parou com erro: o caminho vem do traceback, de onde ele veio até onde parou.
    act(() => {
      stores.proRun.getState().publish(
        {
          phase: 'error',
          canRun: true,
          canStop: false,
          errorKind: 'runtime',
          errorHint: 'Você usou algo que ainda não existe.',
        },
        { run: () => {}, stop: () => {} },
      )
      investigationWindowFor(stores.ui)
        .getState()
        .receive({
          frame: null,
          paused: false,
          canPause: false,
          pauseLater: false,
          values: [{ name: 'pontos', text: '0' }],
          error: {
            lines: [],
            trace: [
              { file: 'inimigos.py', line: 2 },
              { file: 'main.py', line: 3 },
            ],
          },
        })
    })
    expect(within(painel).getByText('O programa parou')).toBeTruthy()
    expect(within(painel).getByText('print(pontos)')).toBeTruthy()
    expect(within(painel).getByText('velocidade + 1')).toBeTruthy()
    expect(within(painel).getByText('aqui o programa parou')).toBeTruthy()
  })

  it('no Python que não desenha, o tempo que o programa levou', async () => {
    const { stores, wrap } = setup()
    act(() => {
      stores.project.setState({
        project: {
          ...createEmptyProject('01J0000000000000000000PYTH', 'Contas'),
          programmingLanguage: 'python',
        } as never,
      })
      programTimeFor(stores.ui).setState({ canvas: false, startedAt: null, endedAt: null })
    })
    render(wrap(<ClassicDock />))
    fireEvent.click(screen.getByRole('tab', { name: 'Desempenho' }))
    expect(await screen.findByText('Rode o programa para ver quanto tempo ele leva.')).toBeTruthy()
    expect(screen.queryByRole('switch', { name: 'Medir o desempenho' })).toBeNull()
    act(() => programTimeFor(stores.ui).setState({ startedAt: 1000, endedAt: 2500 }))
    expect(screen.getByText('O programa levou 1,5 segundos.')).toBeTruthy()
  })

  it('num jogo 3D, mostra os objetos na cena e os desenhos por quadro no lugar dos sprites', async () => {
    const { stores, wrap } = setup()
    act(() =>
      stores.proRun
        .getState()
        .publish(
          { phase: 'running', canRun: true, canStop: true },
          { run: () => {}, stop: () => {} },
        ),
    )
    act(() => stores.ui.getState().setClassicDock('performance'))
    act(() => stores.ui.setState({ measuring: true }))
    render(wrap(<ClassicDock />))
    await screen.findByRole('switch', { name: 'Parar de medir' })
    act(() =>
      perfWindowFor(stores.ui)
        .getState()
        .push({ ...fatia, sprites: null, objects: 12, draws: 30 }),
    )
    const painel = screen.getByRole('tabpanel')
    expect(within(painel).getByText('Objetos na cena')).toBeTruthy()
    expect(within(painel).getByText('12')).toBeTruthy()
    expect(within(painel).getByText('Desenhos por quadro')).toBeTruthy()
    expect(within(painel).getByText('30')).toBeTruthy()
    expect(within(painel).queryByText('Coisas no jogo')).toBeNull()
    expect(within(painel).getAllByText('medido')).toHaveLength(4)
  })

  it('numa página sem canvas, diz que não há quadros de jogo para medir', async () => {
    const { stores, wrap } = setup()
    act(() => stores.ui.getState().setClassicDock('performance'))
    act(() => stores.ui.setState({ measuring: true }))
    render(wrap(<ClassicDock />))
    await screen.findByRole('switch', { name: 'Parar de medir' })
    act(() =>
      perfWindowFor(stores.ui)
        .getState()
        .push({ ...fatia, sprites: null, canvas: false }),
    )
    expect(await screen.findByText('Esta página não tem quadros de jogo para medir.')).toBeTruthy()
  })

  it('fechar a gaveta desliga a medida (o jogo volta ao documento de sempre)', async () => {
    const { stores, wrap } = setup()
    act(() => stores.ui.getState().setClassicDock('performance'))
    render(wrap(<ClassicDock />))
    fireEvent.click(await screen.findByRole('switch', { name: 'Medir o desempenho' }))
    expect(stores.ui.getState().measuring).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Fechar a gaveta' }))
    expect(stores.ui.getState().measuring).toBe(false)
  })
})

describe('a aba Investigar (proposta aprovada em 20/11/2026)', () => {
  const leitura = (extra: Record<string, unknown> = {}) => ({
    frame: 1284,
    paused: true,
    canPause: true,
    pauseLater: false,
    values: [
      { name: 'estado', text: '"inicio"' },
      { name: 'pontos', text: '0' },
    ],
    error: null,
    ...extra,
  })
  const rodando = (stores: ReturnType<typeof setup>['stores']) =>
    act(() =>
      stores.proRun
        .getState()
        .publish(
          { phase: 'running', canRun: true, canStop: true },
          { run: () => {}, stop: () => {} },
        ),
    )

  it('liga a investigação pelo botão (o jogo recomeça com o leitor das variáveis)', async () => {
    const { stores, wrap } = setup()
    render(wrap(<ClassicDock />))
    fireEvent.click(screen.getByRole('tab', { name: 'Investigar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Investigar o jogo' }))
    expect(stores.ui.getState().investigating).toBe(true)
  })

  it('pausado: o quadro, os valores com o que mudou, e Continuar e Avançar vão ao jogo', async () => {
    const { stores, wrap } = setup()
    rodando(stores)
    act(() => stores.ui.setState({ classicDock: 'investigate', investigating: true }))
    const enviados: string[] = []
    setDevtoolsSender(stores.ui, (cmd) => enviados.push(cmd))
    render(wrap(<ClassicDock />))
    await screen.findByRole('button', { name: 'Parar de investigar' })
    act(() => investigationWindowFor(stores.ui).getState().receive(leitura()))
    act(() =>
      investigationWindowFor(stores.ui)
        .getState()
        .receive(
          leitura({
            values: [
              { name: 'estado', text: '"jogando"' },
              { name: 'pontos', text: '0' },
            ],
          }),
        ),
    )
    const painel = screen.getByRole('tabpanel')
    expect(within(painel).getByText('O jogo está pausado')).toBeTruthy()
    expect(within(painel).getByText('Quadro 1.284')).toBeTruthy()
    expect(within(painel).getAllByText('mudou')).toHaveLength(1)
    fireEvent.click(within(painel).getByRole('button', { name: 'Avançar 1 quadro' }))
    fireEvent.click(within(painel).getByRole('button', { name: 'Continuar' }))
    expect(enviados).toEqual(['step', 'resume'])
  })

  it('rodando sem a pausa do motor, diz que este jogo ainda não pausa', async () => {
    const { stores, wrap } = setup()
    rodando(stores)
    act(() => stores.ui.setState({ classicDock: 'investigate', investigating: true }))
    render(wrap(<ClassicDock />))
    await screen.findByRole('button', { name: 'Parar de investigar' })
    act(() =>
      investigationWindowFor(stores.ui)
        .getState()
        .receive(leitura({ paused: false, canPause: false })),
    )
    expect(screen.getByText(/ainda não pausa pelo Estúdio/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Pausar' })).toBeNull()
  })

  it('rodando com a pausa do motor que ainda não vale (o Avançado no menu), diz quando dá', async () => {
    const { stores, wrap } = setup()
    rodando(stores)
    act(() => stores.ui.setState({ classicDock: 'investigate', investigating: true }))
    render(wrap(<ClassicDock />))
    await screen.findByRole('button', { name: 'Parar de investigar' })
    act(() =>
      investigationWindowFor(stores.ui)
        .getState()
        .receive(leitura({ paused: false, canPause: false, pauseLater: true })),
    )
    expect(screen.getByText('Dá para pausar quando a partida está rolando.')).toBeTruthy()
    expect(screen.queryByText(/ainda não pausa pelo Estúdio/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Pausar' })).toBeNull()
  })

  it('parado com erro: o quadro, o caminho até o erro e os valores daquele momento', async () => {
    const { stores, wrap } = setup()
    act(() => stores.proRun.getState().publish(runtimeError, { run: () => {}, stop: () => {} }))
    act(() => stores.ui.setState({ classicDock: 'investigate', investigating: true }))
    render(wrap(<ClassicDock />))
    await screen.findByRole('button', { name: 'Parar de investigar' })
    act(() =>
      investigationWindowFor(stores.ui)
        .getState()
        .receive(
          leitura({
            frame: 312,
            paused: false,
            error: { lines: [12, 7] },
            values: [{ name: 'vidas', text: 'vazio' }],
          }),
        ),
    )
    const painel = screen.getByRole('tabpanel')
    expect(within(painel).getByText('O jogo parou no quadro 312')).toBeTruthy()
    expect(within(painel).getByText('O caminho até o erro')).toBeTruthy()
    // Sem mapa de blocos, cada passo diz a linha; o último é onde o jogo parou.
    expect(within(painel).getByText('Linha 7 do código')).toBeTruthy()
    expect(within(painel).getByText('Linha 12 do código')).toBeTruthy()
    expect(within(painel).getByText('aqui o jogo parou')).toBeTruthy()
    expect(within(painel).getByText('Valores no momento do erro: vidas vazio')).toBeTruthy()
  })

  it('fechar a gaveta desliga a investigação', async () => {
    const { stores, wrap } = setup()
    act(() => stores.ui.setState({ classicDock: 'investigate', investigating: true }))
    render(wrap(<ClassicDock />))
    await screen.findByRole('button', { name: 'Parar de investigar' })
    fireEvent.click(screen.getByRole('button', { name: 'Fechar a gaveta' }))
    expect(stores.ui.getState().investigating).toBe(false)
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

describe('Meus testes no Python (proposta aprovada em 20/11/2026)', () => {
  const pythonProject = (files: Record<string, string>, game = false) =>
    ({
      ...documentFixture('python', 'classic'),
      files: { ...files, 'requirements.txt': '' },
      ...(game ? { installedExtensions: [{ ...PGZERO_EXTENSION, installedAt: 1 }] } : {}),
    }) as PythonClassicProjectDocument

  it('sem biblioteca de jogo, o teste novo testa uma função: escolhe, escreve os casos e guarda', async () => {
    const { stores, wrap } = setup()
    act(() =>
      stores.project.setState({
        project: pythonProject({ 'main.py': 'def dobro(n):\n    return n * 2\n' }),
      }),
    )
    render(wrap(<ClassicDock />))
    fireEvent.click(screen.getByRole('tab', { name: 'Meus testes' }))
    expect(
      await screen.findByText(
        'Nenhum teste ainda. Um teste chama uma função sua e confere se ela responde o que você queria.',
      ),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '+ Novo teste' }))
    // Sem biblioteca de jogo não há o que escolher: só testar uma função.
    expect(screen.queryByRole('button', { name: 'Testar o programa' })).toBeNull()
    fireEvent.change(screen.getByLabelText('Nome do teste'), { target: { value: 'O dobro' } })
    fireEvent.change(screen.getByLabelText('A função'), { target: { value: 'dobro' } })
    const casos = screen.getByLabelText('Casos, um por linha')
    fireEvent.change(casos, { target: { value: '2 4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar teste' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Um caso não deu para ler')
    fireEvent.change(casos, { target: { value: '2 -> 4\n0 -> 0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar teste' }))
    expect(await screen.findByText('dobro(2) responde 4; dobro(0) responde 0.')).toBeTruthy()
    const project = stores.project.getState().project as PythonClassicProjectDocument
    expect(project.studentTests).toEqual([
      {
        id: expect.any(String),
        name: 'O dobro',
        rule: {
          type: 'functionReturns',
          name: 'dobro',
          cases: [
            { args: [2], expected: 4 },
            { args: [0], expected: 0 },
          ],
        },
      },
    ])
  })

  it('sem função no projeto, a prancha explica como criar uma', async () => {
    const { stores, wrap } = setup()
    act(() => stores.project.setState({ project: pythonProject({ 'main.py': 'print(1)\n' }) }))
    render(wrap(<ClassicDock />))
    fireEvent.click(screen.getByRole('tab', { name: 'Meus testes' }))
    fireEvent.click(await screen.findByRole('button', { name: '+ Novo teste' }))
    expect(screen.getByText(/Ainda não tem nenhuma função para testar/)).toBeTruthy()
    expect(screen.getByText(/def somar_pontos\(pontos, bonus\):/)).toBeTruthy()
  })

  it('com Pygame Zero, testar o programa: os passos sem o clique e a conferência sem texto da tela', async () => {
    const { stores, wrap } = setup()
    act(() =>
      stores.project.setState({
        project: pythonProject({ 'main.py': 'pontos = 0\n\ndef draw():\n    pass\n' }, true),
      }),
    )
    render(wrap(<ClassicDock />))
    fireEvent.click(screen.getByRole('tab', { name: 'Meus testes' }))
    fireEvent.click(await screen.findByRole('button', { name: '+ Novo teste' }))
    const programa = screen.getByRole('button', { name: 'Testar o programa' })
    expect(programa.getAttribute('aria-pressed')).toBe('true')
    const passo = screen.getByLabelText('Passo 1') as HTMLSelectElement
    expect([...passo.options].map((option) => option.value)).toEqual(['press', 'hold', 'wait'])
    const alvo = screen.getByLabelText('O que conferir') as HTMLSelectElement
    expect([...alvo.options].map((option) => option.textContent)).toEqual([
      'a variável',
      'a posição x de',
      'a posição y de',
      'as mensagens do programa',
    ])
    fireEvent.change(screen.getByLabelText('Nome do teste'), { target: { value: 'Ponto' } })
    fireEvent.change(screen.getByLabelText('Qual variável'), { target: { value: 'pontos' } })
    fireEvent.change(screen.getByLabelText('Como comparar'), { target: { value: 'increased' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar teste' }))
    expect(
      await screen.findByText('Quando eu apertar Enter. No fim, pontos aumentou.'),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Testar uma função' }))
    expect(screen.getByLabelText('A função')).toBeTruthy()
  })
})

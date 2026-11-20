import { afterEach, describe, expect, it, mock } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createEmptyProject } from '#core'
import { investigationWindowFor, perfWindowFor, setDevtoolsSender } from '../../state/devtools'
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
  it('começa fechada: Mensagens do jogo, Problemas, Investigar e Desempenho, sem corpo aberto', () => {
    const { wrap } = setup()
    render(wrap(<ClassicDock />))
    const abas = screen.getAllByRole('tab').map((tab) => tab.textContent)
    expect(abas).toEqual(['Mensagens do jogo', 'Problemas', 'Investigar', 'Desempenho'])
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

  it('Investigar e Desempenho ainda não existem no Python (o Python ganha as abas no lote dele)', () => {
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
    expect(abas).not.toContain('Desempenho')
    expect(abas).not.toContain('Investigar')
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

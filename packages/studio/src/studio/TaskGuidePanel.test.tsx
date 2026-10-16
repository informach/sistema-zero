import { afterEach, describe, expect, mock, test } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TaskGuidePanel } from './TaskGuidePanel'
import { FRASE_DE_GRAVAR_NO_APARELHO, withSaveBeforeTaskActions } from './taskSessionSave'
import type { StudioTaskSession } from './types'

afterEach(cleanup)

function createSession(): StudioTaskSession {
  return {
    taskId: 'task-studio',
    title: 'Programar as estrelas',
    summary: 'Some um ponto ao coletar.',
    project: { id: 'plan', name: 'Bosque' },
    cycle: { id: 'cycle', number: 1, goal: null },
    guide: {
      steps: [
        { id: 'collect', text: 'Detectar a coleta', hint: 'Use o evento oficial.', required: true },
      ],
      criteria: [{ id: 'score', text: 'O placar aumenta', required: true }],
    },
    blocks: [
      {
        id: 'score_change',
        label: 'Mudar pontuação',
        category: 'Jogo',
        subcategory: 'Placar',
        area: 'events',
        extension: 'game-2d',
      },
    ],
    progress: {
      status: 'in_progress',
      completedStepIds: ['collect'],
      completedCriteriaIds: ['score'],
      startedAt: '2026-08-04T12:00:00.000Z',
      completedAt: null,
      updatedAt: '2026-08-04T12:00:00.000Z',
      outputRef: { kind: 'studio_project', projectId: 'pensa-plan' },
    },
    onProgress: mock(async () => undefined),
  }
}

describe('Guia da tarefa do Estúdio', () => {
  test('converted mission shows code instructions, keeps its test and never submits synthetic progress', async () => {
    const session = createSession()
    session.codeTransition = true
    session.blocks = []
    session.guide = {
      ...session.guide,
      contractVersion: 2,
      steps: [{ id: 'original', text: 'Arraste o bloco de movimento', required: false }],
    }
    session.renderListen = mock(() => null)
    render(<TaskGuidePanel session={session} />)
    expect(screen.queryByText('Arraste o bloco de movimento')).toBeNull()
    expect(screen.getByText('Abra a lista de arquivos e localize o script do jogo.')).toBeTruthy()
    expect(screen.getByText('O placar aumenta', { exact: false })).toBeTruthy()
    expect(session.renderListen).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Experimentei e funcionou' }))
    await waitFor(() =>
      expect(session.onProgress).toHaveBeenCalledWith({
        status: 'completed',
        completedCriteriaIds: ['score'],
      }),
    )
    expect(session.guide.steps[0]?.id).toBe('original')
  })
  test('não vira LessonActivity e conclui somente com guia e projeto vinculados', async () => {
    const session = createSession()
    render(<TaskGuidePanel session={session} />)
    expect(screen.getByRole('complementary', { name: 'Guia da tarefa' })).toBeTruthy()
    expect(screen.getByText('Mudar pontuação')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Concluir tarefa' }))
    await waitFor(() => expect(session.onProgress).toHaveBeenCalledWith({ status: 'completed' }))
  })

  test('mantém o guia visível quando a sincronização falha', async () => {
    const session = createSession()
    session.onProgress = mock(async () => {
      throw new Error('offline')
    })
    render(<TaskGuidePanel session={session} />)
    fireEvent.click(screen.getByRole('button', { name: 'Concluir tarefa' }))
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('Confira a internet'),
    )
    expect(screen.getByText('Programar as estrelas')).toBeTruthy()
  })

  /**
   * 18/09/2026 — "o painel ocupa muito espaço da tela e sobra pouco para a criação". Este era o
   * único dos três guias do Pensa que NÃO recolhia, e no celular ele é a faixa do topo.
   */
  test('a seta recolhe o guia, e o host é quem lembra', () => {
    const session = createSession()
    const onCollapsedChange = mock((_v: boolean) => undefined)
    const view = render(<TaskGuidePanel session={session} />)
    const seta = view.container.querySelector<HTMLButtonElement>('button[aria-expanded]')
    if (!seta) throw new Error('seta esperada')
    expect(seta.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('Mudar pontuação')).toBeTruthy()
    fireEvent.click(seta)
    expect(screen.queryByText('Mudar pontuação')).toBeNull()
    // ⚠ Recolhido, o corpo DESMONTA e o `aria-controls` SAI (régua do `Panel` do Pinta):
    // apontar para um id ausente é referência pendurada para o leitor de tela.
    expect(seta.getAttribute('aria-controls')).toBeNull()
    // O título e a situação da tarefa CONTINUAM na tela: recolhido não é invisível.
    expect(screen.getByText('Programar as estrelas')).toBeTruthy()
    expect(screen.getByText('Em andamento')).toBeTruthy()

    // Com o par do contrato, quem manda é o host: a seta só avisa.
    cleanup()
    const comHost = render(
      <TaskGuidePanel session={{ ...session, collapsed: true, onCollapsedChange }} />,
    )
    expect(screen.queryByText('Mudar pontuação')).toBeNull()
    const setaHost = comHost.container.querySelector<HTMLButtonElement>('button[aria-expanded]')
    if (!setaHost) throw new Error('seta esperada')
    fireEvent.click(setaHost)
    expect(onCollapsedChange).toHaveBeenCalledWith(false)
    expect(screen.queryByText('Mudar pontuação')).toBeNull()
  })

  test('o guia tem respiro embaixo até `lg`, onde ele vira coluna lateral', () => {
    const view = render(<TaskGuidePanel session={createSession()} />)
    const aside = view.container.querySelector('aside')
    // ⚠️ `mb-2` sem o `lg:mb-0` deixaria um vão no meio do editor largo, onde o guia é coluna.
    // ⚠ `classList.contains`: 'mb-20' contém 'mb-2' e 'lg:mb-0.5' contém 'lg:mb-0' — o teste
    // passaria com um respiro errado (achado do full review de 18/09/2026).
    expect(aside?.classList.contains('mb-2')).toBe(true)
    expect(aside?.classList.contains('lg:mb-0')).toBe(true)
  })

  test('o quadro veste a casca compartilhada das ferramentas', () => {
    // 19/09/2026: os três guias do Pensa (este, o do Pinta e o do Molda) passaram a vestir a
    // MESMA receita (`.sz-tool-guide` do `@sistemazero/ui/tool-chrome.css`) — antes cada um
    // tinha a própria casca, e foi isso que ela leu como "fora da identidade visual da
    // comunidade". ⚠ Este é o único dos três que vira COLUNA lateral, e por isso leva também o
    // `--aside`, que troca o fio em volta pelo fio que separa do editor.
    const view = render(<TaskGuidePanel session={createSession()} />)
    const aside = view.container.querySelector('aside')
    expect(aside?.classList.contains('sz-tool-guide')).toBe(true)
    expect(aside?.classList.contains('sz-tool-guide--aside')).toBe(true)
    // ⚠ E a casca PRÓPRIA saiu. O `lg:border-r` é o que mais importa: a receita já desenha o
    // fio do lado, então mantê-lo desenharia DOIS (achado do full review de 19/09/2026).
    for (const morta of ['border-sz-border', 'border-b', 'bg-sz-surface', 'p-3', 'lg:border-r']) {
      expect({ morta, tem: aside?.classList.contains(morta) }).toEqual({ morta, tem: false })
    }
    expect(view.container.querySelector('.sz-tool-guide__head')).toBeTruthy()
    expect(view.container.querySelector('.sz-tool-guide__body')).toBeTruthy()
    // ⚠⚠ Quem rola é o CORPO, nunca o cartão: com o teto no `<aside>`, a seta e o recado de
    // falha ficavam dentro da área rolável e nasciam abaixo da dobra.
    expect(aside?.classList.contains('overflow-auto')).toBe(false)
    expect(
      view.container.querySelector('.sz-tool-guide__body')?.classList.contains('overflow-auto'),
    ).toBe(true)
  })

  test('recolhido, um recado de falha CONTINUA na tela', async () => {
    // ⚠️ A mesma lição que o irmão do Pinta pagou com o "Voltar ao plano": recolher esconde o
    // brief, nunca um problema. Sem isso, a marcação que não subiu ficaria invisível.
    const session = createSession()
    session.onProgress = mock(async () => {
      throw new Error('offline')
    })
    const view = render(<TaskGuidePanel session={session} />)
    fireEvent.click(screen.getByRole('button', { name: 'Concluir tarefa' }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    const seta = view.container.querySelector<HTMLButtonElement>('button[aria-expanded]')
    if (!seta) throw new Error('seta esperada')
    fireEvent.click(seta)
    expect(screen.queryByText('Mudar pontuação')).toBeNull()
    expect(screen.getByRole('alert').textContent).toContain('Confira a internet')
  })
})

/**
 * O guia v2 do Pensa (14/10/2026). Ele não tem checklist: os passos orientam e a conclusão é UMA
 * confirmação ("Experimentei e funcionou") sobre um jogo salvo. Os ramos v2 do painel não tinham
 * teste nenhum.
 */
describe('Guia do Pensa v2 no Estúdio', () => {
  function v2(over: Partial<StudioTaskSession> = {}): StudioTaskSession {
    const base = createSession()
    return {
      ...base,
      guide: {
        contractVersion: 2,
        steps: [
          { id: 'a', text: 'Abra a categoria Jogo 2D', hint: 'Fica na paleta.', required: true },
          { id: 'b', text: 'Arraste o bloco de mover', required: true },
          { id: 'c', text: 'Aperte play e teste', required: true },
        ],
        criteria: [
          { id: 'anda', text: 'O dragão anda', hint: 'Use as setas.', required: true },
          { id: 'voa', text: 'O dragão voa', required: false },
        ],
      },
      progress: { ...base.progress, completedStepIds: [], completedCriteriaIds: [] },
      ...over,
    }
  }
  const concluir = () => screen.getByRole('button', { name: 'Experimentei e funcionou' })

  test('os passos aparecem um de cada vez, sem checkbox, e dá para ver todos', () => {
    render(<TaskGuidePanel session={v2()} />)
    const passos = screen.getByRole('region', { name: 'Como fazer esta missão' })
    expect(passos.classList.contains('sz-tool-guide__steps')).toBe(true)
    expect(screen.getByText('Passo 1 de 3')).toBeTruthy()
    expect(screen.getByText('Abra a categoria Jogo 2D')).toBeTruthy()
    expect(screen.queryAllByRole('checkbox')).toEqual([])
    const anterior = screen.getByRole('button', { name: 'Anterior' }) as HTMLButtonElement
    expect(anterior.disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Próximo passo' }))
    expect(screen.getByText('Passo 2 de 3')).toBeTruthy()
    expect(screen.getByText('Arraste o bloco de mover')).toBeTruthy()
    const todos = screen.getByRole('button', { name: 'Ver todos os passos' })
    expect(todos.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(todos)
    expect(todos.getAttribute('aria-expanded')).toBe('true')
    const lista = screen.getByRole('list')
    expect(lista.querySelectorAll('li')).toHaveLength(3)
    expect(lista.querySelector('[aria-current="step"]')?.textContent).toBe(
      'Arraste o bloco de mover',
    )
  })

  test('sem jogo vinculado não dá para confirmar', () => {
    const base = v2()
    render(
      <TaskGuidePanel session={{ ...base, progress: { ...base.progress, outputRef: null } }} />,
    )
    expect((concluir() as HTMLButtonElement).disabled).toBe(true)
  })

  test('confirmar manda "concluída" com TODOS os critérios, e não precisa marcar passo', async () => {
    const session = v2()
    render(<TaskGuidePanel session={session} />)
    expect((concluir() as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(concluir())
    await waitFor(() =>
      expect(session.onProgress).toHaveBeenCalledWith({
        status: 'completed',
        completedCriteriaIds: ['anda', 'voa'],
      }),
    )
  })

  test('erro com a frase da criança mostra a frase; sem ela, é rede', async () => {
    const comFrase = v2({
      onProgress: mock(async () => {
        throw Object.assign(new Error('PENSA_TASK_DEPENDENCY_PENDING raw'), {
          childMessage: 'Termine a missão anterior antes desta.',
        })
      }),
    })
    render(<TaskGuidePanel session={comFrase} />)
    fireEvent.click(concluir())
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe('Termine a missão anterior antes desta.'),
    )
    // A mensagem crua (técnica) nunca vai à tela.
    expect(screen.queryByText(/raw/)).toBeNull()

    cleanup()
    const semFrase = v2({
      onProgress: mock(async () => {
        throw new TypeError('Failed to fetch')
      }),
    })
    render(<TaskGuidePanel session={semFrase} />)
    fireEvent.click(concluir())
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('Confira a internet'),
    )
    expect(screen.queryByText(/Failed to fetch/)).toBeNull()
  })

  test('esperando a nuvem diz que está guardando, e o botão segue focável', async () => {
    let liberar: (() => void) | null = null
    const session = v2({
      onProgress: mock(
        () =>
          new Promise<void>((resolve) => {
            liberar = resolve
          }),
      ),
    })
    const view = render(<TaskGuidePanel session={session} />)
    const status = view.container.querySelector('[role="status"]')
    // A região viva monta VAZIA (uma que nasce com o texto não é anunciada).
    expect(status?.textContent).toBe('')
    const botao = concluir()
    botao.focus()
    fireEvent.click(botao)
    await waitFor(() => expect(status?.textContent).toBe('Guardando seu jogo na conta…'))
    expect(botao.getAttribute('aria-busy')).toBe('true')
    expect(botao.getAttribute('aria-disabled')).toBe('true')
    // ⚠️ `aria-disabled`, não `disabled`: desligar o botão focado mandaria o foco ao `body`.
    expect((botao as HTMLButtonElement).disabled).toBe(false)
    // Clicar de novo no meio da espera não manda outro pedido.
    fireEvent.click(botao)
    expect(session.onProgress).toHaveBeenCalledTimes(1)
    await act(async () => {
      liberar?.()
      await Bun.sleep(0)
    })
    await waitFor(() => expect(status?.textContent).toBe('Missão concluída!'))
  })

  test('concluída, o foco vai ao "Continuar" (com o destino) e não cai no body', async () => {
    const onNextMission = mock(async () => undefined)
    const session = v2({ onNextMission, nextMissionLabel: 'Continuar no Pinta' })
    const view = render(<TaskGuidePanel session={session} />)
    const botao = concluir()
    botao.focus()
    fireEvent.click(botao)
    await waitFor(() => expect(session.onProgress).toHaveBeenCalled())
    // O host guarda a conclusão e devolve o progresso novo: o botão de confirmar some.
    view.rerender(
      <TaskGuidePanel
        session={{ ...session, progress: { ...session.progress, status: 'completed' } }}
      />,
    )
    const continuar = await waitFor(() =>
      screen.getByRole('button', { name: 'Continuar no Pinta' }),
    )
    await waitFor(() => expect(document.activeElement === continuar).toBe(true))
    fireEvent.click(continuar)
    await waitFor(() => expect(onNextMission).toHaveBeenCalledTimes(1))
  })

  test('concluída sem próxima missão, o foco vai ao aviso estável', async () => {
    const session = v2()
    const view = render(<TaskGuidePanel session={session} />)
    const botao = concluir()
    botao.focus()
    fireEvent.click(botao)
    await waitFor(() => expect(session.onProgress).toHaveBeenCalled())
    view.rerender(
      <TaskGuidePanel
        session={{ ...session, progress: { ...session.progress, status: 'completed' } }}
      />,
    )
    const status = view.container.querySelector('[role="status"]') as HTMLElement
    await waitFor(() => expect(document.activeElement === status).toBe(true))
    expect(status.getAttribute('tabindex')).toBe('-1')
    expect(status.textContent).toBe('Missão concluída!')
  })

  test('sem rótulo do host o botão diz "Continuar meu caminho"; e a falha de rede', async () => {
    const base = v2()
    const onNextMission = mock(async () => {
      throw new Error('offline')
    })
    render(
      <TaskGuidePanel
        session={{
          ...base,
          onNextMission,
          progress: { ...base.progress, status: 'completed' },
        }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Continuar meu caminho' }))
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(
        'Não consegui abrir a próxima missão. Confira a internet e tente de novo.',
      ),
    )
  })

  test('"Travei aqui" chama a ajuda do host e mostra a frase da falha', async () => {
    const onNeedHelp = mock(async () => {
      throw Object.assign(new Error('x'), { childMessage: FRASE_DE_GRAVAR_NO_APARELHO })
    })
    render(<TaskGuidePanel session={v2({ onNeedHelp })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Travei aqui' }))
    await waitFor(() => expect(onNeedHelp).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(FRASE_DE_GRAVAR_NO_APARELHO),
    )
  })
})

/**
 * O EMBRULHO do `StudioCore` (14/10/2026): no guia v2 o jogo é GRAVADO antes de concluir,
 * continuar e pedir ajuda. A ordem é o que importa, por isso ela é REGISTRADA numa lista, e a
 * gravação que falha não pode chamar o host.
 */
describe('o Estúdio grava antes das ações do guia v2', () => {
  function sessaoComEventos(eventos: string[]): StudioTaskSession {
    const base = createSession()
    return {
      ...base,
      guide: { ...base.guide, contractVersion: 2 },
      onProgress: mock(async (input: Parameters<StudioTaskSession['onProgress']>[0]) => {
        eventos.push(`host:${input.status ?? 'passo'}`)
      }),
      onNextMission: mock(async () => {
        eventos.push('host:proxima')
      }),
      onNeedHelp: mock(async () => {
        eventos.push('host:ajuda')
      }),
    }
  }

  test('grava ANTES de concluir, continuar e pedir ajuda', async () => {
    const eventos: string[] = []
    const embrulhada = withSaveBeforeTaskActions(sessaoComEventos(eventos), async () => {
      await Bun.sleep(2)
      eventos.push('gravou')
    })
    await embrulhada.onProgress({ status: 'completed' })
    await embrulhada.onNextMission?.()
    await embrulhada.onNeedHelp?.()
    expect(eventos).toEqual([
      'gravou',
      'host:completed',
      'gravou',
      'host:proxima',
      'gravou',
      'host:ajuda',
    ])
    // Marcar um passo não é limite de snapshot: não grava.
    eventos.length = 0
    await embrulhada.onProgress({ completedStepIds: ['collect'] })
    expect(eventos).toEqual(['host:passo'])
  })

  test('gravação que FALHA não chama o host e rejeita com a frase da criança', async () => {
    const eventos: string[] = []
    const embrulhada = withSaveBeforeTaskActions(sessaoComEventos(eventos), async () => {
      throw new Error('QuotaExceededError')
    })
    for (const acao of [
      () => embrulhada.onProgress({ status: 'completed' }),
      () => embrulhada.onNextMission?.(),
      () => embrulhada.onNeedHelp?.(),
    ]) {
      const erro = await Promise.resolve()
        .then(acao)
        .then(
          () => null,
          (e: unknown) => e,
        )
      expect((erro as { childMessage?: string } | null)?.childMessage).toBe(
        FRASE_DE_GRAVAR_NO_APARELHO,
      )
    }
    expect(eventos).toEqual([])
  })

  test('no painel, a falha de gravar aparece como frase (nunca "Confira a internet")', async () => {
    const embrulhada = withSaveBeforeTaskActions(sessaoComEventos([]), async () => {
      throw new Error('QuotaExceededError')
    })
    render(<TaskGuidePanel session={embrulhada} />)
    fireEvent.click(screen.getByRole('button', { name: 'Experimentei e funcionou' }))
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(FRASE_DE_GRAVAR_NO_APARELHO),
    )
  })

  test('o guia antigo passa pela MESMA referência, sem gravar nada', () => {
    const antiga = createSession()
    const save = mock(async () => undefined)
    expect(withSaveBeforeTaskActions(antiga, save)).toBe(antiga)
    expect(save).not.toHaveBeenCalled()
  })
})

import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TaskGuidePanel } from './TaskGuidePanel'
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

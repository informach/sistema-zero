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
})

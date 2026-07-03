import { describe, expect, it } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getCopy } from '../../core/copy'
import type { PensaTaskView } from '../../core/types'
import { createProjectStore } from '../../state/projectStore'
import { createStageRStore, type PensaStageRStore } from '../../state/stageRStore'
import {
  createFakeTransport,
  type FakeTransport,
  makeStudioAdapter,
  makeTask,
  makeTasks,
} from '../../testing/fakeTransport'
import { PensaAppProvider } from '../appContext'
import { KanbanBoard } from './KanbanBoard'

function renderBoard(
  tasks: PensaTaskView[],
  respond: (path: string, init?: { method?: string; body?: unknown }) => unknown = () => {
    throw new Error('rota inesperada')
  },
): { transport: FakeTransport; stageStore: PensaStageRStore; opened: string[] } {
  const transport = createFakeTransport(respond)
  const stageStore = createStageRStore(transport)
  stageStore.setState({ cycleId: 'cycle-1', stageLoaded: true, hasPlan: true, tasks })
  const adapter = makeStudioAdapter(transport)
  const opened: string[] = []
  render(
    <PensaAppProvider
      value={{ adapter, copy: getCopy('kids'), store: createProjectStore(transport) }}
    >
      <KanbanBoard
        store={stageStore}
        projectId="project-1"
        onOpenMission={(taskId) => opened.push(taskId)}
      />
    </PensaAppProvider>,
  )
  return { transport, stageStore, opened }
}

describe('KanbanBoard', () => {
  it('4 colunas kids com contadores; a 1ª do backlog é a "próxima recomendada"', () => {
    const { opened } = renderBoard([
      makeTask(),
      makeTask({ id: 'task-2', title: 'Chuva de meteoros', position: 1 }),
      makeTask({ id: 'task-3', title: 'Placar de pontos', column: 'done' }),
    ])

    expect(screen.getByText('Missões')).toBeTruthy()
    expect(screen.getByText('Fazendo agora')).toBeTruthy()
    expect(screen.getByText('Hora de testar')).toBeTruthy()
    expect(screen.getByText('Prontas')).toBeTruthy()
    // Só o primeiro card do backlog leva o destaque.
    expect(screen.getAllByText('Próxima!')).toHaveLength(1)
    const recommended = screen.getByText('Próxima!').closest('[data-task-id]') as HTMLElement | null
    expect(recommended?.getAttribute('data-task-id')).toBe('task-1')
    // Card pronto vira selo (sem botão de estado).
    expect(screen.getByText('Feita!')).toBeTruthy()
    // Abrir a missão pelo título do card.
    fireEvent.click(screen.getByRole('button', { name: 'Ver a missão: Chuva de meteoros' }))
    expect(opened).toEqual(['task-2'])
  })

  it('botão de estado "Começar" move para Fazendo agora (PATCH) e vira "Já funciona? Teste!"', async () => {
    const { transport } = renderBoard(makeTasks(), (path, init) => {
      if (path === '/tasks/task-1' && init?.method === 'PATCH') {
        return { task: makeTask({ column: 'doing', position: 0 }) }
      }
      throw new Error(`rota inesperada: ${path}`)
    })

    fireEvent.click(screen.getAllByRole('button', { name: 'Começar' })[0] as HTMLElement)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Já funciona? Teste!' })).toBeTruthy()
    })
    const patch = transport.calls.find((call) => call.method === 'PATCH')
    expect(patch?.path).toBe('/tasks/task-1')
    expect(patch?.body).toEqual({ column: 'doing', position: 0 })
  })

  it('regra 1-em-doing: segundo "Começar" pergunta no Dialog e a troca demove a atual', async () => {
    const { transport } = renderBoard(
      [makeTask({ id: 'task-1', column: 'doing' }), makeTask({ id: 'task-2', title: 'Placar' })],
      (path, init) => {
        if (path === '/tasks/task-1' && init?.method === 'PATCH') {
          return { task: makeTask({ id: 'task-1', column: 'backlog', position: 1 }) }
        }
        if (path === '/tasks/task-2' && init?.method === 'PATCH') {
          return { task: makeTask({ id: 'task-2', title: 'Placar', column: 'doing' }) }
        }
        throw new Error(`rota inesperada: ${path}`)
      },
    )

    fireEvent.click(screen.getByRole('button', { name: 'Começar' }))
    // Nada de rede antes da confirmação.
    expect(transport.calls).toHaveLength(0)
    expect(screen.getByRole('dialog', { name: 'Trocar de missão?' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Sim, trocar' }))

    await waitFor(() => {
      const patches = transport.calls.filter((call) => call.method === 'PATCH')
      expect(patches.map((call) => call.path)).toEqual(['/tasks/task-1', '/tasks/task-2'])
    })
    // Cancelar também existe: reabre e desiste sem rede extra.
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar na atual' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('card em "Hora de testar" tem "Consegui!" que move direto para Prontas', async () => {
    const { transport } = renderBoard([makeTask({ column: 'review' })], (path, init) => {
      if (path === '/tasks/task-1' && init?.method === 'PATCH') {
        return { task: makeTask({ column: 'done', position: 0 }) }
      }
      throw new Error(`rota inesperada: ${path}`)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Consegui!' }))

    await waitFor(() => {
      expect(screen.getByText('Feita!')).toBeTruthy()
    })
    const patch = transport.calls.find((call) => call.method === 'PATCH')
    expect(patch?.body).toEqual({ column: 'done', position: 0 })
  })
})

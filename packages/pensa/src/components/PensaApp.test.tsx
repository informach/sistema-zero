import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type {
  PensaHostAdapter,
  PensaProjectDetailView,
  PensaStageView,
  PensaTaskView,
} from '../core/types'
import { PensaApp } from './PensaApp'

afterEach(cleanup)

const cycle = {
  id: 'cycle-1',
  number: 1,
  goal: null,
  stage: 'done' as const,
  zCompletedAt: '2026-08-04T10:00:00.000Z',
  eCompletedAt: '2026-08-04T10:10:00.000Z',
  rCompletedAt: '2026-08-04T10:20:00.000Z',
  oCompletedAt: '2026-08-04T10:30:00.000Z',
}
const task = (
  id: string,
  position: number,
  destination: 'pinta' | 'studio',
  dependencies: string[] = [],
): PensaTaskView => ({
  id,
  title: position ? 'Programar a coleta' : 'Desenhar a estrela',
  summary: 'Um cartão pequeno e claro.',
  destination,
  category: position ? 'gameplay' : 'art',
  estimatedMinutes: 20,
  position,
  dependencies,
  guide: {
    steps: [{ id: `${id}-step`, text: 'Criar', required: true }],
    criteria: [{ id: `${id}-criterion`, text: 'Funciona', required: true }],
  },
  context:
    destination === 'pinta'
      ? {
          kind: 'pinta',
          assetId: 'star',
          artKind: 'sprite',
          style: 'pixel',
          palette: [],
          appearance: 'brilhante',
          animations: [],
          states: [],
          usage: 'coletável',
          requiresStudioUse: true,
        }
      : {
          kind: 'studio',
          dimension: '2d',
          visualAssetIds: [],
          blockIds: ['collect'],
          blocks: [
            {
              id: 'collect',
              label: 'Ao coletar',
              category: 'Jogo',
              subcategory: 'Eventos',
              area: 'events',
              extension: 'game-2d',
            },
          ],
          mechanicDocumentIds: ['game-2d'],
          extensionIds: ['game-2d'],
        },
  progress: {
    status: 'planned',
    completedStepIds: [],
    completedCriteriaIds: [],
    outputRef: null,
    startedAt: null,
    completedAt: null,
    updatedAt: null,
  },
  revision: 1,
  supersedesTaskId: null,
})

describe('Pensa planejador', () => {
  test('mostra ordem, dependências, próxima tarefa e abre somente a ferramenta de destino', async () => {
    const detail: PensaProjectDetailView = {
      id: 'plan-1',
      name: 'Bosque das Estrelas',
      status: 'active',
      createdAt: '2026-08-04T09:00:00.000Z',
      updatedAt: '2026-08-04T10:30:00.000Z',
      cycles: [cycle],
      currentCycle: cycle,
      artifactsIndex: [],
    }
    const tasks = [task('art-1', 0, 'pinta'), task('code-1', 1, 'studio', ['art-1'])]
    const stage: PensaStageView = {
      stage: 'done',
      conversation: { messages: [], summary: null, messageCount: 0 },
      state: {},
      artifacts: [],
      tasks,
      nextTaskId: 'art-1',
    }
    const request = mock(async (path: string) => {
      if (path === '/projects')
        return {
          projects: [
            {
              id: detail.id,
              name: detail.name,
              status: 'active',
              cycleNumber: 1,
              stage: 'done',
              createdAt: detail.createdAt,
              updatedAt: detail.updatedAt,
            },
          ],
        }
      if (path === '/projects/plan-1') return { project: detail }
      if (path === '/cycles/cycle-1/stages/done') return stage
      throw new Error(`Unexpected request: ${path}`)
    })
    const onOpenTask = mock(() => undefined)
    const adapter: PensaHostAdapter = {
      mode: 'kids',
      capabilities: { pintaOwned: true, studioOwned: false },
      onOpenTask,
      transport: {
        request: request as PensaHostAdapter['transport']['request'],
        streamChat: () => () => {},
      },
    }
    render(<PensaApp adapter={adapter} />)
    await waitFor(() => screen.getByRole('button', { name: /Bosque das Estrelas/ }))
    fireEvent.click(screen.getByRole('button', { name: /Bosque das Estrelas/ }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Meu plano' })).toBeTruthy())
    expect(screen.getByText('PRÓXIMA')).toBeTruthy()
    expect(screen.getByText(/Depois de: Desenhar a estrela/)).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Editar cartão' })).toHaveLength(2)
    expect(
      (screen.getByRole('button', { name: 'Ferramenta não liberada' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: /Abrir no Pinta/ }))
    expect(onOpenTask).toHaveBeenCalledWith({ taskId: 'art-1', destination: 'pinta' })
    expect(document.querySelector('iframe')).toBeNull()
  })

  test('edita um cartão planejado por campos estruturados sem expor JSON ou referências oficiais', async () => {
    const planningCycle = { ...cycle, stage: 'r' as const, rCompletedAt: null, oCompletedAt: null }
    const detail: PensaProjectDetailView = {
      id: 'plan-1',
      name: 'Bosque das Estrelas',
      status: 'active',
      createdAt: '2026-08-04T09:00:00.000Z',
      updatedAt: '2026-08-04T10:20:00.000Z',
      cycles: [planningCycle],
      currentCycle: planningCycle,
      artifactsIndex: [],
    }
    const plannedTask = task('art-1', 0, 'pinta')
    const stage: PensaStageView = {
      stage: 'r',
      conversation: { messages: [], summary: null, messageCount: 0 },
      state: {},
      artifacts: [],
      tasks: [plannedTask],
      nextTaskId: 'art-1',
    }
    let patchBody: Record<string, unknown> | undefined
    const request = mock(
      async (path: string, options: { method?: string; body?: unknown } = {}) => {
        if (path === '/projects')
          return {
            projects: [
              {
                id: detail.id,
                name: detail.name,
                status: 'active',
                cycleNumber: 1,
                stage: 'r',
                createdAt: detail.createdAt,
                updatedAt: detail.updatedAt,
              },
            ],
          }
        if (path === '/projects/plan-1') return { project: detail }
        if (path === '/cycles/cycle-1/stages/r') return stage
        if (path === '/tasks/art-1' && options.method === 'PATCH') {
          patchBody = options.body as Record<string, unknown>
          return { task: plannedTask }
        }
        throw new Error(`Unexpected request: ${path}`)
      },
    )
    const adapter: PensaHostAdapter = {
      mode: 'kids',
      capabilities: { pintaOwned: true, studioOwned: true },
      onOpenTask: () => undefined,
      transport: {
        request: request as PensaHostAdapter['transport']['request'],
        streamChat: () => () => {},
      },
    }
    render(<PensaApp adapter={adapter} />)
    await waitFor(() => screen.getByRole('button', { name: /Bosque das Estrelas/ }))
    fireEvent.click(screen.getByRole('button', { name: /Bosque das Estrelas/ }))
    await waitFor(() => screen.getByRole('button', { name: 'Editar cartão' }))
    fireEvent.click(screen.getByRole('button', { name: 'Editar cartão' }))
    expect(screen.queryByLabelText('Definição completa do cartão')).toBeNull()
    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Desenhar estrela guia' },
    })
    fireEvent.change(screen.getByLabelText('Passos do guia: item 1'), {
      target: { value: 'Desenhar e salvar' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(patchBody?.title).toBe('Desenhar estrela guia'))
    expect((patchBody?.guide as PensaTaskView['guide']).steps[0]?.text).toBe('Desenhar e salvar')
    expect(patchBody).not.toHaveProperty('context')
    expect(patchBody).not.toHaveProperty('destination')
  })
})

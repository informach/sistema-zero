import { afterEach, describe, expect, it, mock } from 'bun:test'
import { act, renderHook, waitFor } from '@testing-library/react'
import { usePintaTaskHandoff } from '../src/components/kids/use-pensa-task-handoff'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

function validHandoff(taskId: string) {
  return {
    project: { id: `project-${taskId}`, name: 'Meu jogo' },
    cycle: { id: 'cycle-1', number: 1, goal: null },
    capability: { owned: true, blockedReason: null },
    task: {
      id: taskId,
      title: 'Desenhar personagem',
      summary: null,
      category: 'art',
      estimatedMinutes: 20,
      position: 1,
      dependencies: [],
      guide: { steps: [], criteria: [] },
      revision: 1,
      supersedesTaskId: null,
      destination: 'pinta',
      context: {
        kind: 'pinta',
        assetId: 'hero',
        artKind: 'sprite',
        style: 'pixel',
        palette: [],
        appearance: 'Um herói',
        animations: [],
        states: [],
        usage: 'Personagem principal',
        requiresStudioUse: true,
      },
      progress: {
        status: 'planned',
        completedStepIds: [],
        completedCriteriaIds: [],
        startedAt: null,
        completedAt: null,
        updatedAt: null,
        outputRef: null,
      },
    },
  }
}

describe('handoff de tarefa do Pensa', () => {
  it('transforma rejeição de rede em erro recuperável em vez de loading infinito', async () => {
    const rejectedFetch = mock(async () => {
      throw new TypeError('network offline')
    })
    globalThis.fetch = Object.assign(rejectedFetch, { preconnect: originalFetch.preconnect })

    const { result } = renderHook(() => usePintaTaskHandoff('task-1'))

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe('Não consegui carregar o brief desta tarefa. Tente de novo.')
    expect(result.current.retry).toBeInstanceOf(Function)
  })

  it('permite tentar novamente e sai do erro quando a rede volta', async () => {
    let attempt = 0
    const fetchWithRetry = mock(async () => {
      attempt += 1
      if (attempt === 1) throw new TypeError('network offline')
      return Response.json(validHandoff('task-1'))
    })
    globalThis.fetch = Object.assign(fetchWithRetry, { preconnect: originalFetch.preconnect })

    const { result } = renderHook(() => usePintaTaskHandoff('task-1'))
    await waitFor(() => expect(result.current.status).toBe('error'))

    act(() => result.current.retry())

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.data?.task.id).toBe('task-1')
    expect(fetchWithRetry).toHaveBeenCalledTimes(2)
  })

  it('aborta a geração anterior e não deixa resposta atrasada sobrescrever a tarefa atual', async () => {
    let resolveOld: ((response: Response) => void) | undefined
    let oldSignal: AbortSignal | undefined
    const fetchOutOfOrder = mock(
      (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
        if (String(input).includes('task-old')) {
          oldSignal = init?.signal ?? undefined
          return new Promise((resolve) => {
            resolveOld = resolve
          })
        }
        return Promise.resolve(Response.json(validHandoff('task-new')))
      },
    )
    globalThis.fetch = Object.assign(fetchOutOfOrder, { preconnect: originalFetch.preconnect })

    const { result, rerender } = renderHook(
      ({ taskId }: { taskId: string }) => usePintaTaskHandoff(taskId),
      { initialProps: { taskId: 'task-old' } },
    )
    rerender({ taskId: 'task-new' })

    await waitFor(() => expect(result.current.data?.task.id).toBe('task-new'))
    expect(oldSignal?.aborted).toBe(true)

    await act(async () => resolveOld?.(Response.json(validHandoff('task-old'))))
    expect(result.current.data?.task.id).toBe('task-new')
  })

  it('trata JSON incompatível como erro controlado', async () => {
    const malformedFetch = mock(async () => new Response('{', { status: 200 }))
    globalThis.fetch = Object.assign(malformedFetch, { preconnect: originalFetch.preconnect })

    const { result } = renderHook(() => usePintaTaskHandoff('task-1'))

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe('Esta tarefa não pertence ao Pinta.')
  })
})

import { afterEach, expect, mock, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import type { StudioTaskHandoff } from '../src/components/kids/use-pensa-task-handoff'
import { useStudioTaskSession } from '../src/components/kids/use-studio-task-session'
import type { CreationsCloud } from '../src/lib/creations-cloud'

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})
const handoff: StudioTaskHandoff = {
  project: { id: 'plan', name: 'Jogo' },
  cycle: { id: 'c', number: 1, goal: null },
  capability: { owned: true, blockedReason: null },
  task: {
    id: 'task',
    title: 'Testar',
    summary: null,
    category: 'polish',
    estimatedMinutes: 5,
    position: 1,
    dependencies: [],
    revision: 1,
    supersedesTaskId: null,
    destination: 'studio',
    guide: { contractVersion: 2, steps: [], criteria: [] },
    context: {
      kind: 'studio',
      dimension: '2d',
      visualAssetIds: [],
      blockIds: [],
      blocks: [
        {
          id: 'b',
          label: 'Mover',
          category: 'a',
          subcategory: 'b',
          area: 'events',
          extension: null,
        },
      ],
      mechanicDocumentIds: [],
      extensionIds: [],
    },
    progress: {
      status: 'in_progress',
      completedStepIds: [],
      completedCriteriaIds: [],
      startedAt: null,
      completedAt: null,
      updatedAt: 'revision-old',
      outputRef: null,
    },
  },
}

function setup(
  options: {
    pro?: boolean
    cloudFailure?: boolean
    conflict?: boolean
    owned?: boolean
    authoring?: 'blocks' | 'code'
    narration?: boolean
  } = {},
) {
  const order: string[] = []
  const requests: unknown[] = []
  const retry = mock(() => {})
  const updateProgress = mock(() => {})
  const navigate = mock((_path: string) => {})
  const cloud = {
    confirm: async (id: string) => {
      order.push(`confirm:${id}`)
      if (options.cloudFailure) throw new Error('offline')
    },
    peek: async () => ({ summary: { revision: 42 } }),
  } as unknown as CreationsCloud
  globalThis.fetch = Object.assign(
    mock(async (_url: RequestInfo | URL, init?: RequestInit) => {
      order.push('patch')
      requests.push(JSON.parse(String(init?.body)))
      return options.conflict
        ? Response.json({ error: { code: 'PENSA_TASK_PROGRESS_CONFLICT' } }, { status: 409 })
        : Response.json({ task: { progress: { ...handoff.task.progress, status: 'completed' } } })
    }),
    { preconnect: originalFetch.preconnect },
  )
  const hook = renderHook(() =>
    useStudioTaskSession({
      handoff: {
        ...handoff,
        task: {
          ...handoff.task,
          context: { ...handoff.task.context, authoring: options.authoring },
        },
        capability: { ...handoff.capability, owned: options.owned ?? true },
      },
      projectId: 'actual-pro-project',
      viewerId: 'child',
      cloud,
      retry,
      updateProgress,
      navigate,
      pro: options.pro,
      narrationEnabled: options.narration,
    }),
  )
  return { ...hook, order, requests, retry, updateProgress, navigate }
}

test('Pro keeps the mission and confirms the actual saved project before completing', async () => {
  const { result, order, requests, updateProgress } = setup({ pro: true })
  expect(result.current?.taskId).toBe('task')
  expect(result.current?.blocks).toEqual([])
  expect(result.current?.codeTransition).toBe(true)
  expect(result.current?.guide).toBe(handoff.task.guide)
  await act(async () => {
    await result.current?.onProgress({ status: 'completed' })
  })
  expect(order).toEqual(['confirm:actual-pro-project', 'patch'])
  expect(requests).toEqual([
    {
      status: 'completed',
      expectedUpdatedAt: 'revision-old',
      outputRef: { kind: 'studio_project', projectId: 'actual-pro-project', saveRevision: '42' },
    },
  ])
  expect(updateProgress).toHaveBeenCalledTimes(1)
})

test('normal mode retains block references', () => {
  expect(setup().result.current?.blocks).toEqual(handoff.task.context.blocks)
})

test('Pro narrates a code guide, but cannot narrate obsolete block instructions after conversion', () => {
  const converted = setup({ pro: true, narration: true })
  expect(converted.result.current?.codeTransition).toBe(true)
  expect(converted.result.current?.renderListen).toBeUndefined()
  converted.unmount()
  const planned = setup({ pro: true, narration: true, authoring: 'code' })
  expect(planned.result.current?.codeTransition).toBe(false)
  expect(planned.result.current?.renderListen).toBeFunction()
})

test('offline confirmation cannot complete a mission', async () => {
  const { result, requests, updateProgress } = setup({ cloudFailure: true })
  await expect(result.current!.onProgress({ status: 'completed' })).rejects.toBeDefined()
  expect(requests).toEqual([])
  expect(updateProgress).not.toHaveBeenCalled()
})

test('a concurrent progress change reloads the guide without accepting the stale update', async () => {
  const { result, retry, updateProgress } = setup({ conflict: true })
  await expect(result.current!.onProgress({ completedStepIds: ['s'] })).rejects.toBeDefined()
  expect(retry).toHaveBeenCalledTimes(1)
  expect(updateProgress).not.toHaveBeenCalled()
})

test('a blocked mission exposes no progress actions', () => {
  expect(setup({ owned: false }).result.current).toBeUndefined()
})

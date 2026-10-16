import { afterAll, afterEach, expect, mock, spyOn, test } from 'bun:test'
import type { Project, StudioEditorProps } from '@sistemazero/studio'
import { act, cleanup, render, renderHook, waitFor } from '@testing-library/react'
import { useKidsStudioTutor } from '../src/components/kids/use-studio-tutor'

const actualNavigation = await import('next/navigation')
const actualLoader = await import('../../member-shell/src/components/studio/studio-pro-loader')
// Resolve the browser bundle outside the test's interaction deadline.
await import('@sistemazero/studio')
const router = { push: mock(() => {}), refresh: mock(() => {}) }
let captured: StudioEditorProps | undefined
const project = { id: 'host-pro', name: 'Meu jogo', kind: 'pro', mode: 'code' } as Project
mock.module('next/navigation', () => ({
  ...actualNavigation,
  useRouter: () => router,
  usePathname: () => '/estudio/pro/host-pro',
}))
mock.module('../../member-shell/src/components/studio/studio-pro-loader', () => ({
  ...actualLoader,
  loadStudioProModule: async () => ({
    module: {
      canRunProMode: () => true,
      StudioEditor: (props: StudioEditorProps) => {
        captured = props
        return null
      },
    },
  }),
  loadPreparedStudioProProject: async () => project,
}))
const { StudioProClient } = await import('../src/components/kids/studio-pro-client')
const originalFetch = globalThis.fetch
afterEach(() => {
  cleanup()
  globalThis.fetch = originalFetch
  captured = undefined
})
afterAll(() => {
  mock.module('next/navigation', () => actualNavigation)
  mock.module('../../member-shell/src/components/studio/studio-pro-loader', () => actualLoader)
})

test('the actual Kids Pro host carries publishing, credits, tutor, errors and daily activity to StudioEditor', async () => {
  const calls: string[] = []
  globalThis.fetch = Object.assign(
    async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return Response.json({ ok: true })
    },
    { preconnect: originalFetch.preconnect },
  )
  const credits = {
    dayLimit: 50,
    dayRemaining: 12,
    monthLimit: 500,
    monthRemaining: 100,
    monthRenewsOn: '2026-11-01',
  }
  const view = render(
    <StudioProClient viewerId={null} projectId={project.id} zappyEnabled aiCredits={credits} />,
  )
  await waitFor(() => expect(captured).toBeDefined())
  expect(captured?.share?.publication).toBeDefined()
  expect(captured?.share?.proVerifiedCover).toBe(true)
  expect(captured?.tutor?.credits).toEqual(credits)
  expect(captured?.tutor?.adapter.loadCredits).toBeFunction()
  expect(captured?.onError).toBeFunction()
  await act(async () => {
    captured?.onChange?.(project, { reason: 'flush' })
  })
  expect(calls).toEqual([])
  await act(async () => {
    captured?.onChange?.(project, { reason: 'autosave' })
    captured?.onChange?.(project, { reason: 'autosave' })
  })
  expect(calls).toEqual(['/api/studio/activity'])
  expect(router.refresh).not.toHaveBeenCalled()
  view.unmount()
  expect(router.refresh).not.toHaveBeenCalled()
})

test('the shared tutor supplies authorized narration and voice input in either host', () => {
  const hook = renderHook(() =>
    useKidsStudioTutor({
      viewerId: 'child',
      zappyEnabled: true,
      aiCredits: null,
      narrationEnabled: true,
      voiceInputEnabled: true,
      taskId: null,
    }),
  )
  expect(hook.result.current?.renderListen).toBeFunction()
  expect(hook.result.current?.renderVoiceInput).toBeFunction()
  expect(hook.result.current?.adapter.builder).toBeDefined()
})

test('leaving a bound Pro mission returns to its Pensa plan by full navigation', async () => {
  const planId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const handoff = {
    project: { id: planId, name: 'Meu plano' },
    cycle: { id: 'cycle', number: 1, goal: null },
    capability: { owned: true, blockedReason: null },
    task: {
      id: 'task',
      title: 'Mover',
      summary: 'O personagem anda',
      category: 'gameplay',
      estimatedMinutes: 10,
      position: 0,
      dependencies: [],
      revision: 1,
      supersedesTaskId: null,
      destination: 'studio',
      guide: { contractVersion: 2, steps: [], criteria: [] },
      context: {
        kind: 'studio',
        dimension: '2d',
        blockIds: [],
        blocks: [],
        visualAssetIds: [],
        mechanicDocumentIds: [],
        extensionIds: [],
      },
      progress: {
        status: 'in_progress',
        completedStepIds: [],
        completedCriteriaIds: [],
        startedAt: null,
        completedAt: null,
        updatedAt: null,
        outputRef: { kind: 'studio_project', projectId: project.id },
      },
    },
  }
  globalThis.fetch = Object.assign(async () => Response.json(handoff), {
    preconnect: originalFetch.preconnect,
  })
  const navigation = spyOn(window.location, 'assign').mockImplementation(() => {})
  try {
    render(<StudioProClient viewerId={null} projectId={project.id} taskId="task" />)
    await waitFor(() => expect(captured?.taskSession?.taskId).toBe('task'))
    act(() => captured?.onExit?.())
    expect(navigation).toHaveBeenCalledWith(`/pensa?plano=${planId}`)
  } finally {
    navigation.mockRestore()
  }
})

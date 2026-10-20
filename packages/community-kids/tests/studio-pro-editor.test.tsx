import { afterAll, afterEach, expect, mock, spyOn, test } from 'bun:test'
import type { Project, StudioEditorProps, StudioPersistenceAdapter } from '@sistemazero/studio'
import { act, cleanup, render, renderHook, waitFor } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import { handoffFixture, projectFixture } from '../../pensa/src/components/pensa.fixture'
import {
  getPersonalAssetsNamespace,
  setPersonalAssetsNamespace,
} from '../../studio/src/asset-library/personal'
import { beginProjectOpening, isProjectOpening } from '../../studio/src/state/projectOpening'
import {
  captureProjectStorageScope,
  setProjectStorageNamespace,
} from '../../studio/src/state/projectStorageRuntime'
import { useKidsStudioTutor } from '../src/components/kids/use-studio-tutor'

const actualNavigation = await import('next/navigation')
const actualLoader = await import('../../member-shell/src/components/studio/studio-pro-loader')
// Resolve the browser bundle outside the test's interaction deadline.
await import('@sistemazero/studio')
const router = { push: mock(() => {}), refresh: mock(() => {}) }
let captured: StudioEditorProps | undefined
const project = { id: 'host-pro', name: 'Meu jogo', kind: 'pro', mode: 'code' } as Project
const openings: Array<{ projectId: string; namespace: string }> = []
let namespace = ''
function createPersistence(options: { namespace?: string } = {}): StudioPersistenceAdapter {
  const identity = options.namespace ?? namespace
  return {
    scopeIdentity: identity,
    beginOpening: (projectId, options) => {
      openings.push({ projectId, namespace: identity })
      return beginProjectOpening({ identity }, projectId, options?.signal)
    },
    load: async () => project,
    save: async () => {},
  }
}
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
      setStudioStorageNamespace: (value: string) => {
        namespace = value
      },
      createLocalPersistenceAdapter: createPersistence,
      StudioEditor: (props: StudioEditorProps) => {
        captured = props
        return null
      },
    },
  }),
}))
const { StudioProClient } = await import('../src/components/kids/studio-pro-client')
const originalFetch = globalThis.fetch
afterEach(() => {
  cleanup()
  for (const opening of openings)
    expect(isProjectOpening({ identity: opening.namespace }, opening.projectId)).toBe(false)
  openings.length = 0
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
  expect(openings).toHaveLength(1)
  expect(openings[0]?.projectId).toBe(project.id)
  expect(openings[0]?.namespace).toBe('')
  expect(isProjectOpening({ identity: '' }, project.id)).toBe(true)
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
  const viewerId = crypto.randomUUID()
  const handoff = handoffFixture()
  handoff.project.ownerProfileId = viewerId
  handoff.team.viewerProfileId = viewerId
  handoff.team.ownerProfileId = viewerId
  handoff.team.programmerProfileId = viewerId
  handoff.team.artistProfileIds = [viewerId]
  handoff.team.people = handoff.team.people.map((person) => ({ ...person, profileId: viewerId }))
  handoff.availability.eligibleProfileIds = [viewerId]
  const planId = handoff.project.id
  handoff.studioProjectId = project.id
  handoff.studioAuthoring = 'code'
  handoff.mission = projectFixture().revision!.plan.missions[1]!
  handoff.progress.missionId = handoff.mission.id
  handoff.availability.missionId = handoff.mission.id
  const requests: string[] = []
  const unexpectedRequests: string[] = []
  globalThis.fetch = Object.assign(
    async (input: RequestInfo | URL) => {
      const path = input instanceof Request ? input.url : String(input)
      requests.push(path)
      if (path === `/api/pensa/missions/${handoff.mission.id}/handoff`)
        return Response.json(handoff)
      if (path === '/api/creations/studio') return Response.json({ items: [], nextCursor: null })
      // The mission panel reads the accepted plan only to DISPLAY "missão N de M".
      if (path === `/api/pensa/projects/${planId}`) return Response.json(projectFixture())
      unexpectedRequests.push(path)
      throw new Error(`Unexpected fixture request: ${path}`)
    },
    { preconnect: originalFetch.preconnect },
  )
  const idbDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
  const previousStorageNamespace = captureProjectStorageScope().namespace
  const previousPersonalNamespace = getPersonalAssetsNamespace()
  Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory(), configurable: true })
  const navigation = spyOn(window.location, 'assign').mockImplementation(() => {})
  try {
    render(
      <StudioProClient viewerId={viewerId} projectId={project.id} taskId={handoff.mission.id} />,
    )
    await waitFor(() => expect(captured?.taskSession?.mission.id).toBe(handoff.mission.id))
    expect(openings).toHaveLength(1)
    expect(openings[0]?.projectId).toBe(project.id)
    expect(openings[0]?.namespace).toBe(viewerId)
    expect(isProjectOpening({ identity: viewerId }, project.id)).toBe(true)
    expect(requests).toContain('/api/creations/studio')
    act(() => captured?.onExit?.())
    await waitFor(() => expect(navigation).toHaveBeenCalledWith(`/pensa?plano=${planId}`))
  } finally {
    cleanup()
    navigation.mockRestore()
    setProjectStorageNamespace(previousStorageNamespace)
    setPersonalAssetsNamespace(previousPersonalNamespace)
    if (idbDescriptor) Object.defineProperty(globalThis, 'indexedDB', idbDescriptor)
    else Reflect.deleteProperty(globalThis, 'indexedDB')
  }
  expect(unexpectedRequests).toEqual([])
})

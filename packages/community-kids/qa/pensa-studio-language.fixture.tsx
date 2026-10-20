import { afterEach, expect, mock, test } from 'bun:test'
import type { StudioTier } from '@sistemazero/member-shell/lib/studio-tier'
import type { EditableStudioProject, StudioEditorProps } from '@sistemazero/studio'
import { prepareEditableStudioProject } from '@sistemazero/studio/editable-project-validation'
import { createEmptyProject } from '@sistemazero/studio/project'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { pensaStudioProjectId } from '../../member-shell/src/lib/pensa-studio-link'
import { handoffFixture, PROFILE_ID } from '../../pensa/src/components/pensa.fixture'
import { documentFixture } from '../../studio/src/state/fixtures/projectDocuments'

const actualNavigation = await import('next/navigation')
const actualLoader = await import('../../member-shell/src/components/studio/studio-pro-loader')
const actualStudio = await import('@sistemazero/studio')
const actualCloud = await import('../../member-shell/src/lib/creations-cloud')
const actualSync = await import('../../member-shell/src/lib/studio-cloud')
const actualOptions = await import('../../member-shell/src/components/studio/use-free-options')
const originalFetch = globalThis.fetch
const router = { push: mock(() => {}), refresh: mock(() => {}) }
mock.module('next/navigation', () => ({
  ...actualNavigation,
  useRouter: () => router,
  usePathname: () => '/estudio',
}))
let current: EditableStudioProject = createEmptyProject('initial', 'Inicial')
let mounted: StudioEditorProps | undefined
const saves = mock(async () => {})
mock.module('@sistemazero/studio', () => ({
  ...actualStudio,
  createLocalPersistenceAdapter: () => ({ load: async () => current, save: saves }),
  setStudioStorageNamespace: () => {},
  canRunProMode: () => true,
  prefetchStudioModes: () => {},
  ProjectList: () => <div data-testid="project-list" />,
  StudioEditor: (props: StudioEditorProps) => {
    mounted = props
    return <div data-testid="sdk-editor" />
  },
}))
const studio = await import('@sistemazero/studio')
mock.module('../../member-shell/src/lib/creations-cloud', () => ({
  ...actualCloud,
  createCreationsCloud: () => ({
    getState: () => ({ status: 'idle', pending: 0, error: null, lastSavedAt: null }),
    subscribe: () => () => {},
    flush: async () => {},
    dispose: () => {},
    peek: async () => null,
  }),
}))
mock.module('../../member-shell/src/lib/studio-cloud', () => ({
  ...actualSync,
  createStudioCloudSync: () => ({
    attach: () => () => {},
    cancelPull: () => {},
    pullMissing: async () => {},
    restoreProject: async () => false,
  }),
}))
mock.module('../../member-shell/src/components/studio/use-free-options', () => ({
  ...actualOptions,
  useFreeStudioOptions: () => ({
    loading: false,
    error: null,
    unavailable: false,
    retry: () => {},
  }),
}))
mock.module('../../member-shell/src/components/studio/studio-pro-loader', () => ({
  ...actualLoader,
  loadStudioProModule: async () => ({ module: studio }),
}))
const { StudioFullEditor } = await import(
  '../../member-shell/src/components/creator/studio-full-editor'
)
const { StudioProEditor } = await import(
  '../../member-shell/src/components/studio/studio-pro-editor'
)
const { StudioFullClient } = await import(
  '../../member-shell/src/components/creator/studio-full-client'
)
const modes: Array<'code' | 'bridge' | 'blocks'> = ['code', 'bridge', 'blocks']
const tier: StudioTier = {
  level: 'avancado-3d',
  freeStudio: true,
  hasPalette: true,
  bridge: true,
  canCreateProProject: true,
  pro: true,
  canPromoteToPro: true,
  allowedModes: modes,
  allowedExtensions: [],
  initialExtensions: [],
  allowLevelReveal: false,
}
const pensaId = pensaStudioProjectId('00000000-0000-4000-8000-000000000001')

afterEach(() => {
  cleanup()
  mounted = undefined
  saves.mockClear()
  globalThis.fetch = originalFetch
})
function open(project: EditableStudioProject) {
  current = project
  if (project.kind === 'pro')
    return render(
      <StudioProEditor
        viewerId={null}
        projectId={project.id}
        storageNamespace="qa"
        theme="light"
        onExit={() => {}}
      />,
    )
  return render(
    <StudioFullEditor
      mod={studio}
      projectId={project.id}
      viewerId={null}
      onExit={() => {}}
      share={{
        publish: async () => {
          throw new Error('No publication expected')
        },
      }}
      tutor={undefined}
      theme="light"
      tier={tier}
      showExamples={false}
      professional={false}
      taskSession={undefined}
      pintaLibrary={undefined}
      moldaLibrary={undefined}
    />,
  )
}

async function pythonProject(kind: 'classic' | 'pro', id?: string) {
  const document = { ...documentFixture('python', kind), assets: [] }
  delete document.coverAssetName
  if (id) document.id = id
  const project = await prepareEditableStudioProject(document)
  if (project?.programmingLanguage !== 'python' || project.kind !== kind)
    throw new Error('Invalid Python fixture')
  return project
}

test('a local Python Pensa mission is refused before linking or starting it', async () => {
  const handoff = handoffFixture()
  current = await pythonProject('classic', handoff.studioProjectId)
  const before = JSON.stringify(current)
  const starts: string[] = []
  globalThis.fetch = Object.assign(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') starts.push(String(input))
      return Response.json(handoff)
    },
    { preconnect: originalFetch.preconnect },
  )
  render(<StudioFullClient viewerId={PROFILE_ID} tier={tier} taskId={handoff.mission.id} />)
  await waitFor(() => expect(screen.getByText(/O Pensa usa JavaScript/)).toBeDefined())
  expect(starts).toEqual([])
  expect(mounted).toBeUndefined()
  expect(saves).not.toHaveBeenCalled()
  expect(JSON.stringify(current)).toBe(before)
})

test('the same local JavaScript mission starts and opens normally', async () => {
  const handoff = handoffFixture()
  current = createEmptyProject(handoff.studioProjectId, 'Jogo')
  const starts: string[] = []
  globalThis.fetch = Object.assign(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') starts.push(String(input))
      return Response.json({
        ...handoff,
        progress: {
          ...handoff.progress,
          status: init?.method === 'POST' ? 'in_progress' : 'planned',
        },
      })
    },
    { preconnect: originalFetch.preconnect },
  )
  render(<StudioFullClient viewerId={PROFILE_ID} tier={tier} taskId={handoff.mission.id} />)
  await waitFor(() => expect(mounted?.initialProject).toBe(current))
  expect(starts).toEqual([`/api/pensa/missions/${handoff.mission.id}/start`])
  expect(saves).not.toHaveBeenCalled()
})

test('a direct link to a local Python Pensa ID is refused without replacing it', async () => {
  current = await pythonProject('classic', pensaId)
  const before = JSON.stringify(current)
  render(<StudioFullClient viewerId={null} tier={tier} initialProjectId={pensaId} />)
  await waitFor(() => expect(screen.getByText(/O Pensa usa JavaScript/)).toBeDefined())
  expect(mounted).toBeUndefined()
  expect(saves).not.toHaveBeenCalled()
  expect(JSON.stringify(current)).toBe(before)
})

for (const kind of ['classic', 'pro'] as const) {
  test(`Pensa ${kind} refuses a stored Python document before mounting the SDK and never rewrites it`, async () => {
    const project = await pythonProject(kind, pensaId)
    const before = JSON.stringify(project)
    open(project)
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('O Pensa usa JavaScript'),
    )
    expect(screen.queryByTestId('sdk-editor')).toBeNull()
    expect(mounted).toBeUndefined()
    expect(saves).not.toHaveBeenCalled()
    expect(JSON.stringify(project)).toBe(before)
  })
  test(`free Python ${kind} still opens in the same host`, async () => {
    const project = await pythonProject(kind)
    open(project)
    await waitFor(() => expect(mounted?.initialProject).toBe(project))
    expect(screen.getByTestId('sdk-editor')).toBeDefined()
    expect(saves).not.toHaveBeenCalled()
  })
  test(`Pensa legacy JavaScript ${kind} remains available`, async () => {
    const project = createEmptyProject(pensaId, 'Jogo')
    if (kind === 'pro') {
      project.kind = 'pro'
      project.mode = 'code'
      project.tree = { 'index.html': { kind: 'file', content: '<h1>Jogo</h1>' } }
    }
    open(project)
    await waitFor(() => expect(mounted?.initialProject).toBe(project))
    expect(saves).not.toHaveBeenCalled()
  })
}

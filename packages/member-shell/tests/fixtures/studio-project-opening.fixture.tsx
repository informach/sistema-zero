import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type {
  EditableStudioProject,
  StudioEditorProps,
  StudioPersistenceAdapter,
  StudioRuntimeEnvironment,
} from '@sistemazero/studio'
import { createEmptyProject } from '../../../studio/src/core/project'
import { createStudioRuntimeAuthority } from '../../../studio/src/runtime/authority'
import { documentFixture } from '../../../studio/src/state/fixtures/projectDocuments'
import { pythonEnvironmentFixture } from '../../../studio/src/state/fixtures/pythonEnvironment'
import { beginProjectOpening, isProjectOpening } from '../../../studio/src/state/projectOpening'
import { refinePythonProjectDocument } from '../../../studio/src/state/pythonProjectValidation'
import { disallowedProjectExtensions } from '../../../studio/src/studio/project-access'
import type { StudioTier } from '../../src/lib/studio-tier'

GlobalRegistrator.register({ settings: { disableIframePageLoading: true } })
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act, useEffect, useState } = await import('react')
const { createRoot } = await import('react-dom/client')
const cleanups: Array<() => void> = []
function render(node: React.ReactNode) {
  const element = document.createElement('div')
  document.body.append(element)
  const root = createRoot(element)
  let active = true
  const unmount = () => {
    if (!active) return
    active = false
    act(() => root.unmount())
    element.remove()
  }
  cleanups.push(unmount)
  act(() => root.render(node))
  return { unmount, rerender: (next: React.ReactNode) => act(() => root.render(next)) }
}
function cleanup() {
  for (const close of cleanups.splice(0)) close()
}
async function waitFor(assertion: () => void) {
  for (let index = 0; index < 100; index++) {
    try {
      assertion()
      return
    } catch (error) {
      if (index === 99) throw error
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5))
      })
    }
  }
}
let namespace = 'host-opening'
let editorProps: StudioEditorProps | undefined
let runtimeEnvironment: StudioRuntimeEnvironment | undefined
let runtimeLoading = false
let runtimeError: string | undefined
let editorMounts = 0
let editorUnmounts = 0
const retryRuntime = mock(() => {})
const loads: Array<{
  scope: string
  id: string
  gate: ReturnType<typeof Promise.withResolvers<EditableStudioProject | null>>
}> = []
const acquired: Array<{ scope: string; id: string; release: () => void }> = []
function adapter(options: { namespace?: string } = {}): StudioPersistenceAdapter {
  const identity = options.namespace ?? namespace
  return {
    scopeIdentity: identity,
    beginOpening: (id, options) => {
      const release = beginProjectOpening({ identity }, id, options?.signal)
      acquired.push({ scope: identity, id, release })
      return release
    },
    load: async (id) => {
      const gate = Promise.withResolvers<EditableStudioProject | null>()
      loads.push({ scope: identity, id, gate })
      return gate.promise
    },
    save: async () => {},
  }
}
mock.module('@sistemazero/studio', () => ({
  createLocalPersistenceAdapter: adapter,
  setStudioStorageNamespace: (value: string) => {
    namespace = value
  },
  canRunProMode: () => true,
  StudioEditor: (props: StudioEditorProps) => {
    editorProps = props
    const [buffer, setBuffer] = useState('original')
    useEffect(() => {
      editorMounts++
      return () => {
        editorUnmounts++
      }
    }, [])
    return (
      <div data-testid="editor">
        {props.initialProject.name}
        <button type="button" onClick={() => setBuffer('unsaved edit')}>
          Edit probe buffer
        </button>
        <output>{buffer}</output>
      </div>
    )
  },
}))
mock.module('../../src/components/studio/use-free-runtime', () => ({
  useFreeStudioRuntime: () => ({
    loading: runtimeLoading,
    error: runtimeError,
    environment: runtimeEnvironment,
    retry: retryRuntime,
  }),
}))
mock.module('../../src/components/creator/focus-mode', () => ({
  useFocusMode: () => ({ setWorkspaceActive: () => {} }),
}))
mock.module('../../src/components/creator/use-studio-activity', () => ({
  useStudioActivity: () => undefined,
}))
mock.module('../../src/lib/studio-error', () => ({ reportStudioError: () => {} }))
const mod = await import('@sistemazero/studio')
const { StudioFullEditor } = await import('../../src/components/creator/studio-full-editor')
const { StudioProEditor } = await import('../../src/components/studio/studio-pro-editor')
const tier: StudioTier = {
  freeStudio: true,
  level: 'avancado-3d',
  allowedExtensions: [],
  hasPalette: true,
  initialExtensions: [],
  allowedModes: ['blocks', 'bridge', 'code'],
  allowLevelReveal: false,
  bridge: true,
  pro: true,
  canCreateProProject: true,
  canPromoteToPro: true,
}
function ui(kind: 'classic' | 'pro', id: string, prepareProject?: () => Promise<void>) {
  return kind === 'classic' ? (
    <StudioFullEditor
      mod={mod}
      projectId={id}
      viewerId="viewer"
      onExit={() => {}}
      share={{ generateDescription: async () => '', publish: async () => ({}) }}
      tutor={undefined}
      theme="light"
      tier={tier}
      showExamples={false}
      professional={false}
      taskSession={undefined}
      pintaLibrary={undefined}
      moldaLibrary={undefined}
    />
  ) : (
    <StudioProEditor
      projectId={id}
      viewerId="viewer"
      storageNamespace={namespace}
      theme="light"
      onExit={() => {}}
      prepareProject={prepareProject}
    />
  )
}
async function project(kind: 'classic' | 'pro', language: 'javascript' | 'python') {
  if (language === 'python') {
    const raw = documentFixture(language, kind)
    return refinePythonProjectDocument({
      ...raw,
      id: 'same',
      assets: [],
      coverAssetName: undefined,
    })
  }
  const value = createEmptyProject('same', 'JavaScript')
  return kind === 'classic'
    ? value
    : {
        ...value,
        kind: 'pro' as const,
        mode: 'code' as const,
        tree: {},
        proMeta: { templateId: 'blank', devScript: 'dev' },
      }
}
beforeEach(async () => {
  namespace = 'host-opening'
  editorProps = undefined
  runtimeEnvironment = (await pythonEnvironmentFixture('classic')).environment
  runtimeLoading = false
  runtimeError = undefined
  editorMounts = 0
  editorUnmounts = 0
  retryRuntime.mockClear()
  delete tier.allowBlocks
  loads.length = 0
  acquired.length = 0
})
afterEach(async () => {
  cleanup()
  await act(async () => {
    for (const item of loads) item.gate.resolve(null)
  })
  for (const owner of acquired)
    expect(isProjectOpening({ identity: owner.scope }, owner.id)).toBe(false)
})
for (const kind of ['classic', 'pro'] as const)
  for (const language of ['javascript', 'python'] as const) {
    test(`${kind}/${language}: host owns read and React handoff until the matching Core settlement`, async () => {
      const value = await project(kind, language)
      if (kind === 'classic' && language === 'javascript') tier.allowBlocks = []
      const view = render(ui(kind, value.id))
      await waitFor(() => expect(loads.length).toBe(1))
      expect(isProjectOpening({ identity: namespace }, value.id)).toBe(true)
      await act(async () => loads[0]?.gate.resolve(value))
      await waitFor(() => expect(editorProps?.initialProject.id).toBe(value.id))
      expect(isProjectOpening({ identity: namespace }, value.id)).toBe(true)
      expect(typeof editorProps?.persistence).toBe('object')
      if (kind === 'classic' && language === 'python') {
        expect(editorProps?.allowExtensions).toEqual(['python-turtle'])
        expect(editorProps?.allowBlocks).toBeUndefined()
        expect(editorProps?.grantedBlockIds).toBeUndefined()
        const fixture = await pythonEnvironmentFixture('classic')
        runtimeEnvironment = fixture.environment
        view.rerender(ui(kind, value.id))
        expect(editorProps?.allowExtensions).toEqual(['python-turtle'])
        runtimeEnvironment = {
          ...fixture.environment,
          access: (project) => ({
            ...fixture.environment.access(project),
            grantedExtensionIds: [],
          }),
        }
        view.rerender(ui(kind, value.id))
        expect(editorProps?.allowExtensions).toEqual([])
      } else if (kind === 'classic') {
        expect(editorProps?.allowExtensions).toEqual(tier.allowedExtensions)
        expect(editorProps?.allowBlocks).toBeUndefined()
        expect(editorProps?.grantedBlockIds).toEqual([])
        tier.allowBlocks = ['sz_js_if_else']
        view.rerender(ui(kind, value.id))
        expect(editorProps?.allowBlocks).toBeUndefined()
        expect(editorProps?.grantedBlockIds).toEqual(['sz_js_if_else'])
        tier.allowBlocks = ['sz_js_if_else', 'sz_val_number']
        view.rerender(ui(kind, value.id))
        expect(editorProps?.allowBlocks).toBeUndefined()
        expect(editorProps?.grantedBlockIds).toEqual(['sz_js_if_else', 'sz_val_number'])
        tier.allowBlocks = []
        view.rerender(ui(kind, value.id))
        expect(editorProps?.grantedBlockIds).toEqual([])
      }
      editorProps?.onProjectOpeningSettled?.({ projectId: value.id, status: 'ready' })
      expect(isProjectOpening({ identity: namespace }, value.id)).toBe(false)
    })
  }
for (const kind of ['classic', 'pro'] as const) {
  test(`${kind}: unmount during read and rejection release before any late editor callback`, async () => {
    const value = await project(kind, 'python')
    const view = render(ui(kind, value.id))
    await waitFor(() => expect(loads.length).toBe(1))
    view.unmount()
    expect(isProjectOpening({ identity: namespace }, value.id)).toBe(false)
    await act(async () => loads[0]?.gate.resolve(value))
    expect(editorProps).toBeUndefined()
    render(ui(kind, value.id))
    await waitFor(() => expect(loads.length).toBe(2))
    await act(async () => loads[1]?.gate.reject(new Error('trusted read failure')))
    expect(isProjectOpening({ identity: namespace }, value.id)).toBe(false)
    expect(editorProps).toBeUndefined()
  })
  test(`${kind}: an old settled callback cannot release a new owner with the same id`, async () => {
    const value = await project(kind, 'python')
    const first = render(ui(kind, value.id))
    await waitFor(() => expect(loads.length).toBe(1))
    await act(async () => loads[0]?.gate.resolve(value))
    const stale = editorProps?.onProjectOpeningSettled
    expect(stale).toBeFunction()
    first.unmount()
    render(ui(kind, value.id))
    await waitFor(() => expect(loads.length).toBe(2))
    stale?.({ projectId: value.id, status: 'ready' })
    expect(isProjectOpening({ identity: namespace }, value.id)).toBe(true)
    await act(async () => loads[1]?.gate.resolve(value))
    editorProps?.onProjectOpeningSettled?.({ projectId: value.id, status: 'blocked' })
    expect(isProjectOpening({ identity: namespace }, value.id)).toBe(false)
  })
}
test('Pro same-id prepare replacement cancels the older owner before the newer read, with no leak', async () => {
  const value = await project('pro', 'python')
  const old = Promise.withResolvers<void>(),
    next = Promise.withResolvers<void>()
  const prepareOld = () => old.promise,
    prepareNext = () => next.promise
  const view = render(ui('pro', value.id, prepareOld))
  await waitFor(() => expect(acquired.length).toBe(1))
  expect(loads.length).toBe(0)
  view.rerender(ui('pro', value.id, prepareNext))
  await waitFor(() => expect(acquired.length).toBe(2))
  await act(async () => old.resolve())
  expect(loads.length).toBe(0)
  expect(isProjectOpening({ identity: namespace }, value.id)).toBe(true)
  await act(async () => next.resolve())
  await waitFor(() => expect(loads.length).toBe(1))
  await act(async () => loads[0]?.gate.resolve(value))
  editorProps?.onProjectOpeningSettled?.({ projectId: value.id, status: 'error' })
  expect(isProjectOpening({ identity: namespace }, value.id)).toBe(false)
})
test('Pro profile replacement cancels the captured namespace without releasing the new owner', async () => {
  const value = await project('pro', 'python')
  const pending = Promise.withResolvers<void>()
  const prepare = () => pending.promise
  const view = render(ui('pro', value.id, prepare))
  await waitFor(() => expect(acquired.length).toBe(1))
  const previous = namespace
  namespace = 'host-profile-new'
  view.rerender(ui('pro', value.id))
  await waitFor(() => expect(loads.length).toBe(1))
  expect(isProjectOpening({ identity: previous }, value.id)).toBe(false)
  expect(isProjectOpening({ identity: namespace }, value.id)).toBe(true)
  await act(async () => pending.resolve())
  expect(loads.length).toBe(1)
  expect(loads[0]?.scope).toBe(namespace)
  await act(async () => loads[0]?.gate.resolve(value))
  editorProps?.onProjectOpeningSettled?.({ projectId: value.id, status: 'ready' })
  expect(isProjectOpening({ identity: namespace }, value.id)).toBe(false)
})

test('Full editor observes authority in the same environment without reopening its document', async () => {
  const fixture = await pythonEnvironmentFixture('classic')
  const initial = {
    available: true,
    pythonAuthoring: [],
    grantedExtensionIds: ['python-turtle'],
    capabilities: ['edit' as const],
    releaseStatus: 'active' as const,
    curation: null,
  }
  const authority = createStudioRuntimeAuthority(initial)
  const environment = {
    ...fixture.environment,
    authority: authority.authority,
    access: () => ({
      ...fixture.environment.access(fixture.project),
      grantedExtensionIds: [...authority.authority.getSnapshot().grantedExtensionIds],
    }),
  }
  runtimeEnvironment = environment
  render(ui('classic', fixture.project.id))
  await waitFor(() => expect(loads.length).toBe(1))
  await act(async () => loads[0]?.gate.resolve(fixture.project))
  expect(editorProps?.allowExtensions).toEqual(['python-turtle'])
  const first = editorProps
  await act(async () => authority.update({ ...initial }))
  expect(editorProps).toBe(first)
  await act(async () => authority.update({ ...initial, grantedExtensionIds: [] }))
  expect(editorProps?.allowExtensions).toEqual([])
  expect(editorProps?.initialProject).toBe(fixture.project)
  expect(editorProps?.runtimeEnvironment).toBe(environment)
  expect(loads).toHaveLength(1)
  await act(async () => authority.update(initial))
  expect(editorProps?.allowExtensions).toEqual(['python-turtle'])
  expect(editorProps?.initialProject).toBe(fixture.project)
  expect(loads).toHaveLength(1)
})

test('Python opening waits for authority and presents preparation errors without a false denial', async () => {
  const fixture = await pythonEnvironmentFixture('classic')
  fixture.project.installedExtensions = [{ id: 'python-turtle', version: '1.0.0', installedAt: 1 }]
  runtimeEnvironment = undefined
  runtimeLoading = true
  const view = render(ui('classic', fixture.project.id))
  await act(async () => loads[0]?.gate.resolve(fixture.project))
  expect(document.querySelector('[role="status"]')?.textContent).toContain('Preparando Python')
  expect(editorProps).toBeUndefined()
  expect(editorMounts).toBe(0)
  expect(isProjectOpening({ identity: namespace }, fixture.project.id)).toBe(true)

  runtimeLoading = false
  runtimeError = 'Não foi possível preparar Python.'
  view.rerender(ui('classic', fixture.project.id))
  expect(document.querySelector('[role="alert"]')?.textContent).toContain(runtimeError)
  expect(editorProps).toBeUndefined()
  const retry = [...document.querySelectorAll('button')].find(
    (button) => button.textContent === 'Tentar novamente',
  )
  expect(retry).toBeTruthy()
  act(() => retry?.click())
  expect(retryRuntime).toHaveBeenCalledTimes(1)

  runtimeError = undefined
  runtimeLoading = true
  view.rerender(ui('classic', fixture.project.id))
  expect(editorMounts).toBe(0)
  runtimeLoading = false
  runtimeEnvironment = fixture.environment
  view.rerender(ui('classic', fixture.project.id))
  expect(editorMounts).toBe(1)
  expect(editorProps?.initialProject).toBe(fixture.project)
  expect(editorProps?.allowExtensions).toEqual(['python-turtle'])
  expect(document.querySelector('[role="status"]')).toBeNull()
  expect(loads).toHaveLength(1)
})

test('Python authority loss hides and disables the retained editor; an explicit empty grant stays denied', async () => {
  const fixture = await pythonEnvironmentFixture('classic')
  fixture.project.installedExtensions = [{ id: 'python-turtle', version: '1.0.0', installedAt: 1 }]
  runtimeEnvironment = fixture.environment
  const view = render(ui('classic', fixture.project.id))
  await act(async () => loads[0]?.gate.resolve(fixture.project))
  const element = document.querySelector('[data-testid="editor"]')
  expect(element).toBeTruthy()
  act(() => element?.querySelector('button')?.click())
  expect(element?.querySelector('output')?.textContent).toBe('unsaved edit')

  const revoked = new AbortController()
  runtimeEnvironment = { ...fixture.environment, signal: revoked.signal }
  revoked.abort()
  view.rerender(ui('classic', fixture.project.id))
  expect(element?.closest('[hidden][inert]')).toBeTruthy()
  expect(editorProps?.editingAccess).toBe('observer')
  expect(editorProps?.runtimeEnvironment).toBeUndefined()
  expect(editorProps?.allowExtensions).toEqual(['python-turtle'])

  runtimeLoading = true
  runtimeEnvironment = undefined
  view.rerender(ui('classic', fixture.project.id))
  expect(element?.closest('[hidden][inert]')).toBeTruthy()
  expect(editorProps?.editingAccess).toBe('observer')
  expect(editorProps?.runtimeEnvironment).toBeUndefined()
  expect(disallowedProjectExtensions(fixture.project, editorProps?.allowExtensions)).toEqual([])
  expect(editorUnmounts).toBe(0)
  runtimeLoading = false
  runtimeError = 'O acesso ao Estúdio mudou. Seu projeto continua preservado.'
  view.rerender(ui('classic', fixture.project.id))
  expect(document.querySelector('[role="alert"]')?.textContent).toContain(runtimeError)
  expect(element?.closest('[hidden][inert]')).toBeTruthy()
  expect(editorProps?.editingAccess).toBe('observer')
  expect(editorProps?.allowExtensions).toEqual(['python-turtle'])

  runtimeError = undefined
  runtimeEnvironment = {
    ...fixture.environment,
    access: (project) => ({
      ...fixture.environment.access(project),
      grantedExtensionIds: [],
    }),
  }
  view.rerender(ui('classic', fixture.project.id))
  expect(element?.closest('[hidden]')).toBeNull()
  expect(editorProps?.allowExtensions).toEqual([])
  expect(disallowedProjectExtensions(fixture.project, editorProps?.allowExtensions)).toEqual([
    'python-turtle',
  ])
  expect(editorProps?.editingAccess).toBeUndefined()
  expect(document.querySelector('[role="status"]')).toBeNull()
  runtimeEnvironment = fixture.environment
  view.rerender(ui('classic', fixture.project.id))
  expect(editorProps?.allowExtensions).toEqual(['python-turtle'])
  expect(editorProps?.initialProject).toBe(fixture.project)
  expect(element?.querySelector('output')?.textContent).toBe('unsaved edit')
  expect(document.querySelector('[data-testid="editor"]')).toBe(element)
  expect(editorMounts).toBe(1)
  expect(editorUnmounts).toBe(0)
  expect(loads).toHaveLength(1)
})

test('JavaScript opening does not inherit Python preparation or denial state', async () => {
  runtimeEnvironment = undefined
  runtimeLoading = true
  runtimeError = 'Python indisponível'
  const value = await project('classic', 'javascript')
  render(ui('classic', value.id))
  await act(async () => loads[0]?.gate.resolve(value))
  const element = document.querySelector('[data-testid="editor"]')
  expect(element).toBeTruthy()
  expect(element?.closest('[hidden]')).toBeNull()
  expect(editorProps?.allowExtensions).toEqual(tier.allowedExtensions)
  expect(editorProps?.editingAccess).toBeUndefined()
  expect(document.querySelector('[role="alert"]')).toBeNull()
  expect(document.querySelector('[role="status"]')).toBeNull()
})

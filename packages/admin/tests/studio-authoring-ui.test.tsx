import { afterAll, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { StudioAuthoringRuntimeRequestSchema } from '@sistemazero/core/studio/runtime-authorization'
import type { EditableStudioProject, StudioHandle, StudioLessonProps } from '@sistemazero/studio'
import { authoringFixture } from '../../members/tests/fakes/studio-authoring-policy'
import { pythonEnvironmentFixture } from '../../studio/src/state/fixtures/pythonEnvironment'
import type { StudioAuthoringRuntimeScope } from '../src/components/studio/use-studio-authoring-runtime'
import { prepareStudioAuthoringOptions } from '../src/lib/studio-authoring-options'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
// ReactDOM captures DOM/input support at import time. Register the owned test
// realm before loading ReactDOM or UI modules, independently of suite order.
const { act, createRef, useEffect, useImperativeHandle, useRef, useState } = await import('react')
const { createRoot } = await import('react-dom/client')
const originalLoader = { ...(await import('../src/components/studio/studio-embed-loader')) }
const studio = await import('@sistemazero/studio')
const originalFactory = { ...(await import('../src/lib/studio-authoring-project')) }
let creationGate: { wait: Promise<void>; entered: () => void } | null = null
mock.module('../src/lib/studio-authoring-project', () => ({
  ...originalFactory,
  createStudioAuthoringProject: async (
    ...args: Parameters<typeof originalFactory.createStudioAuthoringProject>
  ) => {
    const gate = creationGate
    if (gate) {
      gate.entered()
      await gate.wait
    }
    return originalFactory.createStudioAuthoringProject(...args)
  },
}))

/** The editor engine is independently tested; here its public handle models unsaved authoring. */
const editorInputs = new Map<string, StudioLessonProps>()
function EditorProbe(props: StudioLessonProps) {
  if (props.initialProject) editorInputs.set(props.initialProject.id, props)
  const [project, setProject] = useState(props.initialProject)
  const onChange = useRef(props.onChange)
  onChange.current = props.onChange
  useEffect(() => {
    setProject(props.initialProject)
  }, [props.initialProject])
  useEffect(() => {
    if (project) onChange.current?.(project)
  }, [project])
  useImperativeHandle(
    props.ref,
    () => ({ getProject: () => project ?? null, replaceProject: setProject }) as StudioHandle,
    [project],
  )
  return (
    <output>
      {project?.programmingLanguage ?? 'javascript'} / {project?.kind ?? 'classic'}
    </output>
  )
}
mock.module('../src/components/studio/studio-embed-loader', () => ({
  loadStudioEmbedModule: async () => ({ module: { ...studio, StudioLesson: EditorProbe } }),
}))
const { StudioEmbed } = await import('../src/components/studio/studio-embed')
const { SectionProjectExamples } = await import('../src/components/editor/section-project-examples')
const { StudioConfigClipboard } = await import('../src/components/studio/studio-config-clipboard')

test('a solução Python da parte recebe autorização própria e retira o ambiente ao mudar a revisão', async () => {
  const fixture = await pythonEnvironmentFixture('classic')
  const solution = { ...fixture.project, id: crypto.randomUUID() }
  const blockId = crypto.randomUUID(),
    sectionId = crypto.randomUUID(),
    exampleId = crypto.randomUUID()
  const workspace = {
    kind: 'studio' as const,
    initialProject: fixture.project,
    pythonLevel: 3 as const,
    projectExamples: {
      version: 1,
      examples: { [exampleId]: solution },
      sections: { [sectionId]: { solutionExampleId: exampleId } },
    },
  }
  const scope: StudioAuthoringRuntimeScope = {
    userId: '11111111-1111-4111-8111-111111111111',
    context: {
      kind: 'authoring',
      lessonId: '22222222-2222-4222-8222-222222222222',
      draftRevision: '33333333-3333-4333-8333-333333333333',
      blockId,
      purpose: 'authoring',
    },
  }
  const requests: unknown[] = []
  const originalFetch = globalThis.fetch
  globalThis.fetch = Object.assign(
    async (_url: RequestInfo | URL, init?: RequestInit) => {
      const input = StudioAuthoringRuntimeRequestSchema.parse(JSON.parse(String(init?.body)))
      requests.push(input)
      const now = Date.now()
      return Response.json({
        version: 1,
        actor: { userId: scope.userId, accountId: scope.userId },
        context: input.context,
        projectId: input.subject.id,
        revision: input.revision,
        subjectSha256: await sha256Hex(canonicalJson(input.subject)),
        runtime: fixture.project.runtime,
        releaseStatus: 'active',
        operation: input.operation,
        capabilities: ['edit', 'export-source'],
        grantedExtensionIds: [],
        catalog: fixture.environment.catalog,
        blockIds: ['py_print'],
        curation: {},
        frame: {
          url: `https://runtime.test/v1/runtimes/${fixture.project.runtime.manifestSha256}/frame.html`,
          allowedOrigins: ['https://runtime.test'],
        },
        issuedAt: now,
        expiresAt: now + 30_000,
      })
    },
    { preconnect: originalFetch.preconnect },
  )
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const previousKeys = new Set(editorInputs.keys())
  let workingId: string | undefined
  const render = (runtimeScope?: StudioAuthoringRuntimeScope) =>
    act(async () =>
      root.render(
        <SectionProjectExamples
          workspace={workspace}
          blockId={blockId}
          sectionId={sectionId}
          canWrite
          runtimeScope={runtimeScope}
          onChange={() => true}
        />,
      ),
    )
  try {
    await render()
    await act(async () => click(container, 'Editar uma solução possível'))
    await settle(() => {
      workingId = [...editorInputs.keys()].find((id) => !previousKeys.has(id))
      return Boolean(workingId)
    })
    if (!workingId) throw new Error('Expected independent working editor')
    expect(requests).toHaveLength(0)
    expect(editorInputs.get(workingId)?.runtimeEnvironment).toBeUndefined()
    await render(scope)
    await settle(() => !!editorInputs.get(workingId!)?.runtimeEnvironment)
    const first = editorInputs.get(workingId)!.runtimeEnvironment!
    expect(editorInputs.get(workingId)?.pythonLevel).toBe(3)
    expect(requests).toHaveLength(1)
    expect(requests[0]).toMatchObject({ subject: { id: workingId }, context: scope.context })
    expect(workingId).not.toBe(fixture.project.id)
    expect(workingId).not.toBe(solution.id)
    await render({
      ...scope,
      context: { ...scope.context, draftRevision: '44444444-4444-4444-8444-444444444444' },
    })
    expect(first.signal?.aborted).toBe(true)
    await settle(
      () => requests.length === 2 && editorInputs.get(workingId!)?.runtimeEnvironment !== undefined,
    )
  } finally {
    await act(async () => root.unmount())
    globalThis.fetch = originalFetch
    if (workingId) editorInputs.delete(workingId)
    container.remove()
  }
})
afterAll(() => {
  mock.module('../src/components/studio/studio-embed-loader', () => originalLoader)
  mock.module('../src/lib/studio-authoring-project', () => originalFactory)
})

async function settle(predicate: () => boolean) {
  for (let attempt = 0; attempt < 80 && !predicate(); attempt++)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
  expect(predicate()).toBe(true)
}
function click(container: HTMLElement, text: string) {
  const button = [...container.querySelectorAll('button')].find(
    (node) => node.textContent?.trim() === text,
  )
  if (!button) throw new Error(`Missing button: ${text}`)
  button.click()
}

test('changing language and kind is explicit; cancellation preserves the original source and curation', async () => {
  const fixture = await authoringFixture('python', 'classic')
  const prepared = await prepareStudioAuthoringOptions({
    legacyJavaScript: true,
    catalog: fixture.configuration,
  })
  const original = studio.createEmptyProject('authorship', 'Meu jogo')
  original.files['script.js'] = 'console.log("meu trabalho")'
  const saved = JSON.stringify(original)
  const handleRef = createRef<StudioHandle>()
  let resets = 0
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  try {
    await act(async () =>
      root.render(
        <StudioEmbed
          initialProject={original}
          handleRef={handleRef}
          professionalAuthoring
          authoringOptions={prepared}
          onProjectReset={() => {
            resets++
          }}
        />,
      ),
    )
    await settle(() => !!container.querySelector('select') && !!handleRef.current)
    async function select(key: string) {
      await act(async () => {
        const element = container.querySelector<HTMLSelectElement>('select')!
        element.value = key
        element.dispatchEvent(new Event('change', { bubbles: true }))
      })
    }
    expect(container.querySelector<HTMLSelectElement>('select')!.value).toBe('javascript')
    await select(fixture.project.runtime.manifestSha256)
    expect(JSON.stringify(handleRef.current!.getProject())).toBe(saved)
    await act(async () => click(container, 'Cancelar'))
    expect(JSON.stringify(handleRef.current!.getProject())).toBe(saved)
    expect(resets).toBe(0)
    await select(fixture.project.runtime.manifestSha256)
    await act(async () => click(container, 'Trocar projeto'))
    await settle(() => handleRef.current?.getProject()?.programmingLanguage === 'python')
    expect(handleRef.current!.getProject()).toMatchObject({
      id: original.id,
      name: original.name,
      installedExtensions: [],
      files: { 'main.py': '' },
    })
    expect(resets).toBe(1)
    await act(async () => click(container, 'Projeto Pro'))
    await act(async () => click(container, 'Trocar projeto'))
    await settle(() => handleRef.current?.getProject()?.kind === 'pro')
    expect(handleRef.current!.getProject()).toMatchObject({
      programmingLanguage: 'python',
      proMeta: { templateId: 'python-blank' },
    })
    await select('javascript')
    await act(async () => click(container, 'Trocar projeto'))
    await settle(() => handleRef.current?.getProject()?.formatVersion === 2)
    expect(handleRef.current!.getProject()?.kind).toBe('pro')
    expect(resets).toBe(3)
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})

test('unavailable saved Python remains intact and the clipboard refuses foreign curation', async () => {
  const { project } = await authoringFixture('python', 'classic')
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const handleRef = createRef<StudioHandle>()
  const saved = JSON.stringify(project)
  let pasted = 0
  localStorage.setItem(
    'sz:admin:studio-block-config',
    JSON.stringify({
      level: 'iniciante-2d',
      modes: ['blocks'],
      categories: ['js'],
      allowBlocks: ['sz_js_log'],
    }),
  )
  const config = {
    environmentKey: project.runtime.manifestSha256,
    pythonLevel: 2 as const,
    level: 'iniciante-2d' as const,
    modes: ['blocks' as const],
    categories: [],
    allowReveal: false,
    allowBlocks: ['sz_py_print'],
  }
  try {
    await act(async () =>
      root.render(
        <>
          <StudioEmbed
            initialProject={project as EditableStudioProject}
            handleRef={handleRef}
            professionalAuthoring
            authoringOptions={{ options: { legacyJavaScript: true, catalog: null }, catalog: null }}
          />
          <StudioConfigClipboard
            current={config}
            onPaste={() => {
              pasted++
            }}
          />
        </>,
      ),
    )
    await settle(() => !!handleRef.current)
    expect(container.querySelector<HTMLSelectElement>('select')!.value).toBe(
      project.runtime.manifestSha256,
    )
    expect(JSON.stringify(handleRef.current!.getProject())).toBe(saved)
    const paste = () =>
      [...container.querySelectorAll('button')]
        .find((node) => node.textContent?.startsWith('Colar configuração'))!
        .click()
    await act(async () => paste())
    expect(pasted).toBe(0)
    await act(async () => click(container, 'Copiar configuração'))
    await act(async () => paste())
    expect(pasted).toBe(1)
    const copied = JSON.parse(localStorage.getItem('sz:admin:studio-block-config')!)
    expect(copied).toMatchObject({
      environmentKey: project.runtime.manifestSha256,
      pythonLevel: 2,
      allowBlocks: ['sz_py_print'],
    })
  } finally {
    await act(async () => root.unmount())
    container.remove()
    localStorage.removeItem('sz:admin:studio-block-config')
  }
})

test('revocation received while a template loads preserves the source and curation', async () => {
  const fixture = await authoringFixture('python', 'classic')
  const active = await prepareStudioAuthoringOptions({
    legacyJavaScript: true,
    catalog: fixture.configuration,
  })
  fixture.configuration.releases[0]!.status = 'revoked'
  const revoked = await prepareStudioAuthoringOptions({
    legacyJavaScript: true,
    catalog: fixture.configuration,
  })
  let release!: () => void
  let entered = false
  creationGate = {
    wait: new Promise<void>((resolve) => {
      release = resolve
    }),
    entered: () => {
      entered = true
    },
  }
  const original = studio.createEmptyProject('racing', 'Meu trabalho')
  const handleRef = createRef<StudioHandle>()
  let resets = 0
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const render = (options: typeof active) =>
    root.render(
      <StudioEmbed
        initialProject={original}
        handleRef={handleRef}
        professionalAuthoring
        authoringOptions={options}
        onProjectReset={() => {
          resets++
        }}
      />,
    )
  try {
    await act(async () => render(active))
    await settle(() => !!handleRef.current)
    await act(async () => {
      const select = container.querySelector<HTMLSelectElement>('select')!
      select.value = fixture.project.runtime.manifestSha256
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await act(async () => click(container, 'Trocar projeto'))
    expect(entered).toBe(true)
    await act(async () => render(revoked))
    await act(async () => release())
    await settle(
      () => container.textContent?.includes('não está disponível para criar projetos') === true,
    )
    expect(handleRef.current!.getProject()).toEqual(original)
    expect(resets).toBe(0)
  } finally {
    creationGate = null
    release()
    await act(async () => root.unmount())
    container.remove()
  }
})

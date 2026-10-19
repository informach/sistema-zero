import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { SectionCompletion } from '@sistemazero/core/learning'
import {
  objectiveProject,
  objectiveSectionId,
  objectiveWorkspace,
  otherObjectiveSectionId,
} from './fixtures/section-objective-examples'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { SectionCompletionEditor } = await import(
  '../src/components/editor/section-completion-editor'
)

test('Testar agora cancela a parte/revisão antiga e ignora o ACK mesmo se o transporte não aborta', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const realFetch = globalThis.fetch
  const calls: {
    body: { project: { name: string } }
    signal: AbortSignal | null | undefined
    reply: ReturnType<typeof Promise.withResolvers<Response>>
  }[] = []
  globalThis.fetch = Object.assign(
    async (_url: string | URL | Request, init?: RequestInit) => {
      const reply = Promise.withResolvers<Response>()
      calls.push({ body: JSON.parse(String(init?.body)), signal: init?.signal, reply })
      return reply.promise
    },
    { preconnect: realFetch.preconnect },
  )
  let sectionId = objectiveSectionId
  let revision = 'revision-a'
  const completion: SectionCompletion = {
    version: 1,
    blockIds: [],
    projectChecks: [
      {
        id: 'motion',
        label: 'Mova o herói',
        rule: {
          type: 'behavior',
          steps: [],
          expect: { target: { kind: 'value', path: 'x' }, compare: 'changed' },
        },
      },
    ],
  }
  const workspace = objectiveWorkspace(
    objectiveProject({ name: 'initial' }),
    objectiveProject({ name: 'solution' }),
    objectiveProject({ name: 'checkpoint' }),
  )
  const render = () =>
    root.render(
      <SectionCompletionEditor
        value={completion}
        candidates={[]}
        hasStudio
        workspace={workspace}
        sectionId={sectionId}
        workspaceBlockId="block"
        runtimeScope={{
          userId: 'author',
          context: {
            kind: 'authoring',
            lessonId: 'lesson',
            blockId: 'block',
            draftRevision: revision,
            purpose: 'authoring',
          },
        }}
        onChange={() => {}}
      />,
    )
  const click = () =>
    [...container.querySelectorAll('button')]
      .find((button) => button.textContent === 'Testar agora')!
      .click()
  const answer = (passed: boolean) => Response.json({ results: [{ id: 'motion', passed }] })
  try {
    await act(async () => render())
    await act(async () => click())
    expect(calls).toHaveLength(1)
    expect(calls[0]?.body.project.name).toBe('initial')
    await act(async () => {
      sectionId = otherObjectiveSectionId
      render()
    })
    expect(calls[0]?.signal?.aborted).toBe(true)
    await act(async () => {
      calls[0]?.reply.resolve(answer(true))
      await Promise.resolve()
    })
    expect(calls).toHaveLength(1)
    expect(container.textContent).toContain('sem gabarito')
    expect(container.textContent).not.toContain('Nenhum problema nos objetivos.')

    await act(async () => {
      sectionId = objectiveSectionId
      render()
    })
    await act(async () => click())
    expect(calls).toHaveLength(2)
    await act(async () => {
      revision = 'revision-b'
      render()
    })
    expect(calls[1]?.signal?.aborted).toBe(true)
    await act(async () => {
      calls[1]?.reply.resolve(answer(true))
      await Promise.resolve()
    })
    expect(calls).toHaveLength(2)
    expect(container.textContent).toContain('aperte Testar agora')

    await act(async () => click())
    expect(calls).toHaveLength(3)
    await act(async () => {
      calls[2]?.reply.resolve(answer(false))
      await Promise.resolve()
    })
    expect(calls).toHaveLength(4)
    expect(calls[3]?.body.project.name).toBe('checkpoint')
    await act(async () => {
      calls[3]?.reply.resolve(answer(false))
      await Promise.resolve()
    })
    expect(calls).toHaveLength(5)
    expect(calls[4]?.body.project.name).toBe('solution')
    await act(async () => {
      calls[4]?.reply.resolve(answer(true))
      await Promise.resolve()
    })
    expect(container.textContent).toContain('gabarito cumpre')
    expect(container.textContent).toContain('Nenhum problema nos objetivos.')
  } finally {
    globalThis.fetch = realFetch
    await act(async () => root.unmount())
    container.remove()
  }
})

test.each([
  'objectives',
  'workspace',
  'author',
  'block',
  'unmount',
] as const)('a execução perde seu contexto quando muda %s', async (change) => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const realFetch = globalThis.fetch
  const reply = Promise.withResolvers<Response>()
  const observed: { signal: AbortSignal | null | undefined } = { signal: undefined }
  let requests = 0
  let mounted = true
  let userId = 'author'
  let blockId = 'block'
  let workspace = objectiveWorkspace(objectiveProject(), objectiveProject())
  let value: SectionCompletion = {
    version: 1,
    blockIds: [],
    projectChecks: [
      {
        id: 'motion',
        label: 'Mova o herói',
        rule: {
          type: 'behavior',
          steps: [],
          expect: { target: { kind: 'value', path: 'x' }, compare: 'changed' },
        },
      },
    ],
  }
  globalThis.fetch = Object.assign(
    async (_url: string | URL | Request, init?: RequestInit) => {
      requests++
      observed.signal = init?.signal
      return reply.promise
    },
    { preconnect: realFetch.preconnect },
  )
  const render = () =>
    root.render(
      <SectionCompletionEditor
        value={value}
        candidates={[]}
        hasStudio
        workspace={workspace}
        sectionId={objectiveSectionId}
        workspaceBlockId={blockId}
        runtimeScope={{
          userId,
          context: {
            kind: 'authoring',
            lessonId: 'lesson',
            draftRevision: 'revision',
            blockId,
            purpose: 'authoring',
          },
        }}
        onChange={() => {}}
      />,
    )
  try {
    await act(async () => render())
    await act(async () =>
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent === 'Testar agora')!
        .click(),
    )
    expect(requests).toBe(1)
    await act(async () => {
      if (change === 'objectives')
        value = {
          ...value,
          projectChecks: [
            {
              id: 'other',
              label: 'Outro objetivo',
              rule: {
                type: 'behavior',
                steps: [],
                expect: { target: { kind: 'value', path: 'y' }, compare: 'changed' },
              },
            },
          ],
        }
      if (change === 'workspace')
        workspace = objectiveWorkspace(
          objectiveProject({ name: 'Novo inicial' }),
          objectiveProject(),
        )
      if (change === 'author') userId = 'another-author'
      if (change === 'block') blockId = 'another-block'
      if (change === 'unmount') {
        root.unmount()
        mounted = false
      } else render()
    })
    expect(observed.signal?.aborted).toBe(true)
    await act(async () => {
      reply.resolve(Response.json({ results: [{ id: 'motion', passed: true }] }))
      await Promise.resolve()
    })
    expect(requests).toBe(1)
    expect(container.textContent).not.toContain('Nenhum problema nos objetivos.')
  } finally {
    globalThis.fetch = realFetch
    if (mounted) await act(async () => root.unmount())
    container.remove()
  }
})

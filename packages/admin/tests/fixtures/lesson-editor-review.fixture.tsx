import { expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import {
  applyLessonDraftChange,
  type LessonDraftDocument,
  readStudioProjectExamples,
  sectionCompletionIssues,
} from '@sistemazero/core/learning'
import { createEmptyProject } from '@sistemazero/studio'
import { authoringFixture } from '../../../members/tests/fakes/studio-authoring-policy'
import type { EditableStudioProject } from '../../../studio/src/core/editableProject'
import { refinePythonProjectDocument } from '../../../studio/src/state/pythonProjectValidation'
import { newAuthoringSection } from '../../src/lib/lesson-authoring'
import type { LessonBlockContent } from '../../src/lib/types'

GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
mock.module('../../src/lib/lesson-draft-storage', () => ({
  readDraftRecovery: async () => null,
  writeDraftRecovery: async () => {},
}))
const { act, useState, useImperativeHandle } = await import('react')
let pendingStudioSave: (() => Promise<void>) | undefined
let latestStudioChange: ((project: EditableStudioProject) => void) | undefined
let latestStudioProject: EditableStudioProject | undefined
mock.module('../../src/components/studio/studio-embed', () => ({
  StudioEmbed: ({
    initialProject,
    handleRef,
    onChange,
  }: {
    initialProject: EditableStudioProject
    handleRef: import('react').Ref<unknown>
    onChange: (project: EditableStudioProject) => void
  }) => {
    const [project, setProject] = useState(initialProject)
    latestStudioChange = onChange
    latestStudioProject = project
    useImperativeHandle(
      handleRef,
      () => ({
        getProject: () => project,
        save: async () => {
          await pendingStudioSave?.()
        },
      }),
      [project],
    )
    return (
      <button
        type="button"
        onClick={() => {
          const next = { ...project, name: 'Projeto atualizado' }
          setProject(next)
          onChange(next)
        }}
      >
        Alterar projeto de teste
      </button>
    )
  },
}))
const { createRoot } = await import('react-dom/client')
const { LessonEditorClient } = await import(
  '../../src/app/admin/membros/cursos/[courseId]/aulas/[lessonId]/lesson-editor-client'
)

function seed(title: string): LessonDraftDocument<LessonBlockContent> {
  return {
    title,
    slug: title,
    estimatedMinutes: null,
    blocks: [
      {
        id: `${title}-zappy`,
        content: { kind: 'dialogue', text: `Fala ${title}`, pose: 'speaking' },
      },
    ],
    sections: [{ ...newAuthoringSection(`${title}-section`), blockIds: [`${title}-zappy`] }],
    attachments: [],
    plannedVideos: [],
  }
}
async function harness() {
  const originalFetch = globalThis.fetch
  const docs: Record<string, ReturnType<typeof seed>> = { a: seed('a'), b: seed('b') }
  const state = {
    revision: 1,
    conflict: false,
    beforePatch: async () => {},
    validations: [] as ReturnType<typeof seed>[],
    publishes: 0,
    published: new Set<string>(),
  }
  globalThis.fetch = Object.assign(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input)
      if (path.includes('/courses/'))
        return Response.json({ slug: 'course', audience: 'kids', modules: [] })
      const id = path.match(/lessons\/(\w+)/)?.[1] ?? 'a'
      if (path.endsWith('/validate')) {
        state.validations.push(structuredClone(docs[id]!))
        return Response.json(sectionCompletionIssues(docs[id]!.sections, docs[id]!.blocks))
      }
      if (path.endsWith('/publish')) {
        state.publishes++
        state.published.add(id)
        state.revision++
      }
      if (init?.method === 'PATCH') {
        if (state.conflict) {
          state.conflict = false
          return Response.json(
            { error: { code: 'LESSON_DRAFT_CONFLICT', message: 'Outra versão no servidor' } },
            { status: 409 },
          )
        }
        const command = JSON.parse(String(init.body))
        await state.beforePatch()
        docs[id] = applyLessonDraftChange(docs[id]!, command.change)
        return Response.json({
          revision: String(++state.revision),
          updatedAt: new Date().toISOString(),
        })
      }
      return Response.json({
        lessonId: id,
        revision: String(state.revision),
        publishedRevision: state.published.has(id) ? String(state.revision) : '0',
        isPublished: state.published.has(id),
        document: docs[id],
        updatedBy: 'author',
        updatedAt: new Date().toISOString(),
      })
    },
    { preconnect: originalFetch.preconnect },
  )
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const render = async (id = 'a') =>
    act(async () =>
      root.render(
        <LessonEditorClient
          courseId="course"
          lessonId={id}
          authorId="author"
          currentRole="admin"
        />,
      ),
    )
  const button = (label: string) =>
    [...container.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) =>
        !b.closest('[hidden]') && (b.getAttribute('aria-label') ?? b.textContent?.trim()) === label,
    )!
  const click = async (label: string) => {
    const target = button(label)
    expect(target, `Missing button: ${label}`).toBeTruthy()
    await act(async () => target.click())
  }
  const cleanup = async () => {
    await act(async () => root.unmount())
    container.remove()
    globalThis.fetch = originalFetch
  }
  return { docs, state, container, root, render, button, click, cleanup }
}

async function pythonObjectivesHarness(name: string) {
  const h = await harness()
  const project = await refinePythonProjectDocument(
    (await authoringFixture('python', 'pro')).project,
  )
  project.name = name
  h.docs.a!.blocks = [
    {
      id: 'project',
      content: {
        kind: 'studio',
        initialProject: project,
      },
    },
  ]
  h.docs.a!.sections[0]!.blockIds = ['project']
  h.docs.a!.sections[0]!.workspaceBlockId = 'project'
  h.docs.a!.sections[0]!.completion = {
    version: 1,
    blockIds: [],
    projectChecks: [
      {
        id: 'echo',
        label: 'Defina a função echo',
        programmingLanguage: 'python',
        profileId: project.runtime.profileId,
        rule: { type: 'definesFunction', name: 'echo' },
      },
    ],
  }
  const nameField = () => {
    const label = [...h.container.querySelectorAll('label')].find(
      (node) => !node.closest('[hidden]') && node.textContent?.trim() === 'Nome esperado',
    )
    return label?.querySelector('input') ?? null
  }
  return { ...h, nameField }
}

async function settle(predicate: () => boolean) {
  for (let attempt = 0; attempt < 200 && !predicate(); attempt++)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5))
    })
  expect(predicate()).toBe(true)
}

async function fill(input: HTMLInputElement | null, value: string) {
  expect(input).not.toBeNull()
  expect(input?.closest('[hidden]')).toBeNull()
  expect(input?.closest('fieldset[disabled]')).toBeNull()
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input!.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

test('invalid Python section criteria entered during draft save are preserved and refuse publication', async () => {
  const h = await pythonObjectivesHarness('Python race')
  const gate = Promise.withResolvers<void>()
  let patches = 0
  h.state.beforePatch = async () => {
    if (++patches === 1) await gate.promise
  }
  try {
    await h.render()
    await h.click('Abrir todas')
    await h.click('Editar avanço')
    await fill(h.nameField(), 'echo_edited')
    await settle(() => patches === 1)
    // Unlike the removed block activity JSON form, unfinished section rules are
    // valid drafts. A pending older PATCH cannot erase them or validate stale data.
    await fill(h.nameField(), '')
    await h.click('Revisar e publicar')
    expect(h.state.validations).toEqual([])
    await act(async () => {
      gate.resolve()
    })
    await settle(() => h.state.validations.length === 1)
    expect(patches).toBe(2)
    const completion = h.docs.a!.sections[0]!.completion
    expect(completion?.projectChecks?.[0]?.rule).toEqual({ type: 'definesFunction', name: '' })
    expect(h.state.validations[0]!.sections[0]!.completion).toEqual(completion)
    expect(h.container.textContent).toContain(
      'Preencha os objetivos Python, os nomes esperados e os caminhos de arquivo válidos.',
    )
    expect(h.button('Publicar aula').disabled).toBe(true)
    expect(h.state.publishes).toBe(0)
    await h.click('Revisar este item')
    expect(h.nameField()?.value).toBe('')
  } finally {
    gate.resolve()
    await h.cleanup()
  }
}, 10_000)

test('pending Studio save captures the latest project before returning to the section', async () => {
  const h = await pythonObjectivesHarness('Python save')
  const gate = Promise.withResolvers<void>()
  let entered = false
  pendingStudioSave = async () => {
    entered = true
    await gate.promise
  }
  try {
    await h.render()
    await h.click('Abrir todas')
    await h.click('Editar Python save')
    await h.click('Voltar ao percurso')
    expect(entered).toBe(true)
    expect(h.button('Voltar ao percurso')).toBeTruthy()
    await h.click('Alterar projeto de teste')
    await act(async () => gate.resolve())
    await settle(() => !h.button('Voltar ao percurso'))
    expect(h.docs.a!.blocks[0]!.content).toMatchObject({
      kind: 'studio',
      initialProject: { name: 'Projeto atualizado' },
    })
  } finally {
    gate.resolve()
    pendingStudioSave = undefined
    await h.cleanup()
  }
}, 10_000)

test('an old pending close cannot close a later opening of the same block', async () => {
  const h = await pythonObjectivesHarness('Python ABA')
  const gate = Promise.withResolvers<void>()
  let saves = 0
  pendingStudioSave = async () => {
    if (++saves === 1) await gate.promise
  }
  try {
    await h.render()
    await h.click('Abrir todas')
    await h.click('Editar Python ABA')
    await h.click('Voltar ao percurso')
    await h.click('Voltar ao percurso')
    expect(saves).toBe(2)
    expect(h.button('Voltar ao percurso')).toBeUndefined()
    await h.click('Editar Python ABA')
    await h.click('Alterar projeto de teste')
    await act(async () => {
      gate.resolve()
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(h.button('Voltar ao percurso')).toBeTruthy()
    await h.click('Voltar ao percurso')
    await settle(() => {
      const content = h.docs.a!.blocks[0]!.content
      return content.kind === 'studio' && content.initialProject.name === 'Projeto atualizado'
    })
    expect(h.docs.a!.blocks[0]!.content).toMatchObject({
      kind: 'studio',
      initialProject: { name: 'Projeto atualizado' },
    })
  } finally {
    gate.resolve()
    pendingStudioSave = undefined
    await h.cleanup()
  }
}, 10_000)

test('validation messages disappear when their draft is corrected', async () => {
  const h = await harness()
  try {
    await h.render()
    await h.click('Revisar e publicar')
    await h.click('Revisar este item')
    const select = [...h.container.querySelectorAll('select')].find((s) =>
      s.textContent?.includes('Personalizar o avatar'),
    )!
    await act(async () => {
      select.value = 'customize-avatar'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(h.container.textContent).not.toContain(
      'Esta parte precisa de uma checagem ou objetivo verificável.',
    )
  } finally {
    await h.cleanup()
  }
})

test('changing lesson identity closes the old block editor without copying its content', async () => {
  const h = await harness()
  try {
    await h.render()
    await h.click('Abrir todas')
    await h.click('Editar Fala a')
    await h.render('b')
    expect(h.container.querySelector('#dialogue-text') === null).toBe(true)
    expect(h.docs.b!.blocks.map((b) => b.id)).toEqual(['b-zappy'])
  } finally {
    await h.cleanup()
  }
})

test('restoring the server version dismisses stale block fields before saving again', async () => {
  const h = await harness()
  try {
    await h.render()
    await h.click('Abrir todas')
    await h.click('Editar Fala a')
    h.state.conflict = true
    await h.click('Revisar e publicar')
    await h.click('Abrir a versão salva e guardar a minha cópia')
    expect(h.container.querySelector('#dialogue-text') === null).toBe(true)
  } finally {
    await h.cleanup()
  }
})

test('a certificate added to a new lesson can explicitly use its own completion flow', async () => {
  const h = await harness()
  h.docs.a!.blocks = [{ id: 'certificate', content: { kind: 'certificate', message: 'Parabéns!' } }]
  h.docs.a!.sections[0]!.blockIds = ['certificate']
  try {
    await h.render()
    await h.click('Usar conclusão própria do certificado')
    await h.click('Usar fluxo do certificado')
    expect(sectionCompletionIssues(h.docs.a!.sections, h.docs.a!.blocks)).toEqual([])
    await h.click('Adicionar parte')
    await h.click('Revisar e publicar')
    expect(sectionCompletionIssues(h.docs.a!.sections, h.docs.a!.blocks)).toEqual([])
  } finally {
    await h.cleanup()
  }
})

test('switching a Studio to gallery delivery preserves the latest initial project', async () => {
  const h = await harness()
  h.docs.a!.blocks = [
    {
      id: 'project',
      content: {
        kind: 'studio',
        purpose: 'experiment',
        initialProject: createEmptyProject('seed', 'Projeto original'),
      },
    },
  ]
  h.docs.a!.sections[0]!.blockIds = ['project']
  h.docs.a!.sections[0]!.workspaceBlockId = 'project'
  try {
    await h.render()
    await h.click('Abrir todas')
    await h.click('Editar Projeto original')
    await h.click('Alterar projeto de teste')
    const select = h.container.querySelector<HTMLSelectElement>('#gallery-mode')!
    await act(async () => {
      select.value = 'gallery'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await h.click('Voltar ao percurso')
    expect(h.docs.a!.blocks[0]!.content).toMatchObject({
      kind: 'studio',
      gallery: { minItems: 1, maxItems: 1 },
      initialProject: { name: 'Projeto atualizado' },
    })
  } finally {
    await h.cleanup()
  }
})

test('the real section editor saves, reuses and clears private examples without changing the initial project', async () => {
  const h = await harness()
  const sectionId = '11111111-1111-4111-8111-111111111111'
  const project = createEmptyProject('22222222-2222-4222-8222-222222222222', 'Projeto inicial')
  h.docs.a!.blocks = [{ id: 'workspace', content: { kind: 'studio', initialProject: project } }]
  h.docs.a!.sections[0]!.id = sectionId
  h.docs.a!.sections[0]!.blockIds = ['workspace']
  h.docs.a!.sections[0]!.workspaceBlockId = 'workspace'
  const currentRegistry = () => {
    const content = h.docs.a!.blocks[0]!.content
    if (content.kind !== 'studio') throw new Error('Expected Studio')
    const result = readStudioProjectExamples(content.projectExamples)
    if (result.kind !== 'valid') throw new Error('Expected private examples')
    return result.value
  }
  try {
    await h.render()
    await h.click('Abrir todas')
    await h.click('Definir avanço')
    await h.click('Criar uma solução possível')
    await settle(() => Boolean(h.button('Alterar projeto de teste')))
    expect(h.container.querySelectorAll('button').length).toBeGreaterThan(0)
    expect(
      [...h.container.querySelectorAll('button')].filter(
        (button) => button.textContent === 'Alterar projeto de teste',
      ),
    ).toHaveLength(1)
    await h.click('Alterar projeto de teste')
    await h.click('Salvar e voltar aos objetivos')
    await settle(() => {
      const content = h.docs.a!.blocks[0]!.content
      return (
        content.kind === 'studio' &&
        readStudioProjectExamples(content.projectExamples).kind === 'valid'
      )
    })
    const saved = currentRegistry()
    const solutionId = saved.sections[sectionId]!.solutionExampleId!
    expect(saved.examples[solutionId]!.name).toBe('Projeto atualizado')
    expect(h.docs.a!.blocks[0]!.content).toMatchObject({
      initialProject: { name: 'Projeto inicial' },
    })
    expect(h.container.textContent).toContain('Uma solução possível: Projeto atualizado')
    const reuse = h.container.querySelector<HTMLSelectElement>(
      '[aria-label="Usar exemplo existente como entrada para ensaio"]',
    )!
    await act(async () => {
      reuse.value = solutionId
      reuse.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await settle(() => currentRegistry().sections[sectionId]!.entryExampleId === solutionId)
    await h.click('Remover uma solução possível')
    await settle(() => !currentRegistry().sections[sectionId]!.solutionExampleId)
    expect(currentRegistry().examples[solutionId]).toBeDefined()
    expect(h.docs.a!.blocks[0]!.content).not.toHaveProperty('solutionProject')
    expect(h.docs.a!.blocks[0]!.content).toMatchObject({
      initialProject: { name: 'Projeto inicial' },
    })
  } finally {
    await h.cleanup()
  }
})

test('review waits for the open part solution to flush even while the authoring controls are busy', async () => {
  const h = await harness()
  const sectionId = '33333333-3333-4333-8333-333333333333'
  const project = createEmptyProject('44444444-4444-4444-8444-444444444444', 'Entrada preservada')
  h.docs.a!.blocks = [{ id: 'workspace', content: { kind: 'studio', initialProject: project } }]
  h.docs.a!.sections[0]!.id = sectionId
  h.docs.a!.sections[0]!.blockIds = ['workspace']
  h.docs.a!.sections[0]!.workspaceBlockId = 'workspace'
  const gate = Promise.withResolvers<void>()
  let entered = false
  try {
    await h.render()
    await h.click('Abrir todas')
    await h.click('Definir avanço')
    await h.click('Criar uma solução possível')
    await settle(() => Boolean(h.button('Alterar projeto de teste')))
    const editorNode = h.button('Alterar projeto de teste')
    pendingStudioSave = async () => {
      entered = true
      await gate.promise
    }
    await h.click('Revisar e publicar')
    expect(entered).toBe(true)
    expect(h.state.validations).toHaveLength(0)
    await act(async () => gate.resolve())
    await settle(() => h.state.validations.length === 1)
    const content = h.state.validations[0]!.blocks[0]!.content
    if (content.kind !== 'studio') throw new Error('Expected Studio')
    const registry = readStudioProjectExamples(content.projectExamples)
    expect(registry.kind).toBe('valid')
    if (registry.kind !== 'valid') throw new Error('Expected captured solution')
    expect(registry.value.sections[sectionId]!.solutionExampleId).toBeDefined()
    expect(h.button('Alterar projeto de teste')).toBe(editorNode)
    expect(content.initialProject.name).toBe('Entrada preservada')
  } finally {
    gate.resolve()
    pendingStudioSave = undefined
    await h.cleanup()
  }
})

test('accepting the server version retires an open private example and its late SDK callback', async () => {
  const h = await harness()
  const sectionId = '55555555-5555-4555-8555-555555555555'
  const exampleId = '66666666-6666-4666-8666-666666666666'
  const project = createEmptyProject('77777777-7777-4777-8777-777777777777', 'Inicial preservado')
  const registry = (name: string) => ({
    version: 1,
    examples: { [exampleId]: { ...project, id: '88888888-8888-4888-8888-888888888888', name } },
    sections: { [sectionId]: { solutionExampleId: exampleId } },
  })
  h.docs.a!.blocks = [
    {
      id: 'workspace',
      content: { kind: 'studio', initialProject: project, projectExamples: registry('Servidor A') },
    },
  ]
  h.docs.a!.sections[0]!.id = sectionId
  h.docs.a!.sections[0]!.blockIds = ['workspace']
  h.docs.a!.sections[0]!.workspaceBlockId = 'workspace'
  try {
    await h.render()
    await h.click('Abrir todas')
    await h.click('Definir avanço')
    await h.click('Editar uma solução possível')
    await settle(() => Boolean(h.button('Alterar projeto de teste')))
    h.state.conflict = true
    await h.click('Alterar projeto de teste')
    await settle(() => Boolean(h.button('Abrir a versão salva e guardar a minha cópia')))
    const lateChange = latestStudioChange!
    const lateProject = { ...latestStudioProject!, name: 'A tardio sobre servidor B' }
    h.docs.a!.blocks[0] = {
      id: 'workspace',
      content: { kind: 'studio', initialProject: project, projectExamples: registry('Servidor B') },
    }
    await h.click('Abrir a versão salva e guardar a minha cópia')
    await act(async () => lateChange(lateProject))
    const content = h.docs.a!.blocks[0]!.content
    if (content.kind !== 'studio') throw new Error('Expected Studio')
    const read = readStudioProjectExamples(content.projectExamples)
    if (read.kind !== 'valid') throw new Error('Expected canonical server examples')
    const id = read.value.sections[sectionId]!.solutionExampleId!
    expect(read.value.examples[id]!.name).toBe('Servidor B')
    expect(h.button('Alterar projeto de teste')).toBeUndefined()
    expect(content.initialProject.name).toBe('Inicial preservado')
  } finally {
    await h.cleanup()
  }
})

test('publishing adopts the canonical revision without remounting an open private example', async () => {
  const h = await harness()
  const sectionId = '99999999-9999-4999-8999-999999999999'
  const project = createEmptyProject(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Inicial preservado ao publicar',
  )
  h.docs.a!.blocks = [
    {
      id: 'workspace',
      content: { kind: 'studio', purpose: 'experiment', initialProject: project },
    },
    {
      id: 'quiz',
      content: {
        kind: 'quiz',
        questions: [
          {
            id: 'question',
            prompt: 'Qual comando mostra?',
            choices: [
              { id: 'print', label: 'print' },
              { id: 'none', label: 'nenhum' },
            ],
            correctChoiceIds: ['print'],
            explanation: 'print mostra.',
          },
        ],
        passingScore: 100,
      },
    },
  ]
  h.docs.a!.sections[0]!.id = sectionId
  h.docs.a!.sections[0]!.blockIds = ['workspace', 'quiz']
  h.docs.a!.sections[0]!.workspaceBlockId = 'workspace'
  h.docs.a!.sections[0]!.completion = { version: 1, blockIds: ['quiz'] }
  try {
    await h.render()
    await h.click('Abrir todas')
    await h.click('Editar avanço')
    await h.click('Criar uma solução possível')
    await settle(() => Boolean(h.button('Alterar projeto de teste')))
    const editor = h.button('Alterar projeto de teste')!
    await h.click('Alterar projeto de teste')
    const workingId = latestStudioProject!.id
    await h.click('Revisar e publicar')
    await settle(() => Boolean(h.button('Publicar aula')))
    expect(h.button('Publicar aula').disabled, h.container.textContent ?? '').toBe(false)
    await h.click('Publicar aula')
    expect(h.state.publishes, h.container.textContent ?? '').toBe(1)
    await settle(
      () => h.state.publishes === 1 && h.container.textContent!.includes('Aula publicada'),
    )
    expect(editor.isConnected).toBe(true)
    expect(h.button('Alterar projeto de teste')).toBe(editor)
    expect(latestStudioProject!.id).toBe(workingId)
    const content = h.docs.a!.blocks[0]!.content
    if (content.kind !== 'studio') throw new Error('Expected Studio')
    const examples = readStudioProjectExamples(content.projectExamples)
    if (examples.kind !== 'valid') throw new Error('Expected saved private example')
    const example = examples.value.examples[examples.value.sections[sectionId]!.solutionExampleId!]!
    expect(example.name).toBe('Projeto atualizado')
    expect(example.id).toBe(workingId)
    expect(content.initialProject.name).toBe('Inicial preservado ao publicar')
  } finally {
    await h.cleanup()
  }
})

import { expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import {
  applyLessonDraftChange,
  type LessonDraftDocument,
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
      if (path.endsWith('/publish')) state.publishes++
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
        publishedRevision: '0',
        isPublished: false,
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
    await h.click('Revisar para publicar')
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
    await h.click('Revisar para publicar')
    await h.click('Revisar este item')
    const select = [...h.container.querySelectorAll('select')].find((s) =>
      s.textContent?.includes('Personalizar o avatar'),
    )!
    await act(async () => {
      select.value = 'customize-avatar'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(h.container.textContent).not.toContain(
      'Esta seção precisa de uma checagem ou objetivo verificável.',
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
    await h.click('Revisar para publicar')
    await h.click('Abrir versão do servidor e arquivar cópia local')
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
    await h.click('Adicionar seção')
    await h.click('Revisar para publicar')
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

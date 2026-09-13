import { expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import {
  applyLessonDraftChange,
  type LessonDraftDocument,
  sectionCompletionIssues,
} from '@sistemazero/core/learning'
import { createEmptyProject } from '@sistemazero/studio'
import { newAuthoringSection } from '../../src/lib/lesson-authoring'
import type { LessonBlockContent } from '../../src/lib/types'

GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
mock.module('../../src/lib/lesson-draft-storage', () => ({
  readDraftRecovery: async () => null,
  writeDraftRecovery: async () => {},
}))
const { act, useState, useImperativeHandle } = await import('react')
mock.module('../../src/components/studio/studio-embed', () => ({
  StudioEmbed: ({
    initialProject,
    handleRef,
    onChange,
  }: {
    initialProject: ReturnType<typeof createEmptyProject>
    handleRef: import('react').Ref<unknown>
    onChange: (project: ReturnType<typeof createEmptyProject>) => void
  }) => {
    const [project, setProject] = useState(initialProject)
    useImperativeHandle(handleRef, () => ({ getProject: () => project, save: async () => {} }), [
      project,
    ])
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
    supportBlockIds: [],
    attachments: [],
    plannedVideos: [],
  }
}
async function harness() {
  const originalFetch = globalThis.fetch
  const docs: Record<string, ReturnType<typeof seed>> = { a: seed('a'), b: seed('b') }
  const state = { revision: 1, conflict: false }
  globalThis.fetch = Object.assign(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input)
      if (path.includes('/courses/'))
        return Response.json({ slug: 'course', audience: 'kids', modules: [] })
      const id = path.match(/lessons\/(\w+)/)?.[1] ?? 'a'
      if (path.endsWith('/validate'))
        return Response.json(sectionCompletionIssues(docs[id]!.sections, docs[id]!.blocks))
      if (init?.method === 'PATCH') {
        if (state.conflict) {
          state.conflict = false
          return Response.json(
            { error: { code: 'LESSON_DRAFT_CONFLICT', message: 'Outra versão no servidor' } },
            { status: 409 },
          )
        }
        const command = JSON.parse(String(init.body))
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
  return { docs, state, container, root, render, click, cleanup }
}

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

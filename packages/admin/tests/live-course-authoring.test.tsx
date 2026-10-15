import { afterEach, describe, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import {
  applyLessonDraftChange,
  type LessonDraftDocument,
  TEACHER_NOTES_MAX,
} from '@sistemazero/core/learning'
import { newAuthoringSection, teacherNotesValue } from '../src/lib/lesson-authoring'
import { buildLessonManifest } from '../src/lib/lesson-manifest-export'
import type { LessonBlockContent } from '../src/lib/types'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { LessonSectionAuthoring } = await import('../src/components/editor/lesson-section-authoring')
const { LessonContentCatalog, catalogKinds } = await import(
  '../src/components/editor/lesson-content-catalog'
)
const { lessonEditorialWarnings } = await import(
  '../src/components/editor/lesson-editorial-warnings'
)
const { LessonManifestImport, plannedVideoCount } = await import(
  '../src/components/editor/lesson-manifest-import'
)

type Doc = LessonDraftDocument<LessonBlockContent>

let cleanup: (() => void) | null = null
const originalFetch = globalThis.fetch
afterEach(() => {
  cleanup?.()
  cleanup = null
  globalThis.fetch = originalFetch
})

async function mount(render: (root: ReturnType<typeof createRoot>) => void) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => render(root))
  cleanup = () => {
    act(() => root.unmount())
    container.remove()
  }
  return { container, root }
}
const button = (scope: ParentNode, label: string) => {
  const found = [...scope.querySelectorAll<HTMLButtonElement>('button')].find(
    (node) => node.textContent?.trim() === label,
  )
  if (!found) throw new Error(`Botão ausente: ${label}`)
  return found
}
function typeInto(field: HTMLTextAreaElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(field, value)
  field.dispatchEvent(new Event('input', { bubbles: true }))
}

const VIDEO_ID = '33333333-3333-4333-8333-333333333333'
function documentWithVideo(): Doc {
  const section = { ...newAuthoringSection('s1'), title: 'Abertura', blockIds: [VIDEO_ID] }
  return {
    title: 'Encontro 1',
    slug: 'encontro-1',
    estimatedMinutes: null,
    blocks: [{ id: VIDEO_ID, content: { kind: 'video', provider: 'vimeo', src: '' } }],
    sections: [section],
    attachments: [],
    plannedVideos: [{ blockId: VIDEO_ID, instructions: 'Gravar a abertura', videoId: null }],
  }
}

describe('aula de curso ao vivo: sem bloco de vídeo novo', () => {
  test('o catálogo de conteúdo não oferece vídeo no curso ao vivo', async () => {
    expect(catalogKinds('kids', true)).not.toContain('video')
    expect(catalogKinds('adult', true)).not.toContain('video')
    expect(catalogKinds('kids')).toContain('video')
    const { container } = await mount((root) =>
      root.render(<LessonContentCatalog audience="kids" live onSelect={() => {}} />),
    )
    const labels = [...container.querySelectorAll('button')].map((node) => node.textContent ?? '')
    expect(labels.some((label) => label.includes('Vídeo'))).toBe(false)
    expect(labels.some((label) => label.includes('Estúdio'))).toBe(true)
  })

  test('a revisão não cobra vídeo gravado nem sugere trocar texto por vídeo', () => {
    const doc = documentWithVideo()
    expect(lessonEditorialWarnings(doc).join(' ')).toContain('precisam ser gravados ou vinculados')
    const live = lessonEditorialWarnings(doc, { live: true }).join(' ')
    expect(live).not.toContain('vídeo')
    expect(live).not.toContain('gravados')
  })
})

describe('anotações da professora por parte', () => {
  test('o texto fica como digitado; vazio tira o campo', () => {
    expect(teacherNotesValue('mostrar o bloco de colisão ')).toBe('mostrar o bloco de colisão ')
    expect(teacherNotesValue('   ')).toBeUndefined()
    expect(teacherNotesValue('')).toBeUndefined()
    expect(teacherNotesValue('a'.repeat(TEACHER_NOTES_MAX + 10))).toHaveLength(TEACHER_NOTES_MAX)
  })

  test('o campo aparece na parte do curso ao vivo, grava e some no gravado', async () => {
    let data = documentWithVideo()
    let live = true
    const view = await mount((root) => {
      const render = () =>
        root.render(
          <LessonSectionAuthoring
            document={data}
            live={live}
            lesson={{
              id: 'lesson',
              title: data.title,
              slug: data.slug,
              blocks: data.blocks.map((block, sortOrder) => ({
                ...block,
                lessonId: 'lesson',
                kind: block.content.kind,
                blockRevision: block.id,
                sortOrder,
              })),
              attachments: [],
              courseId: 'course',
              moduleId: '',
              sortOrder: 0,
              isPublished: false,
              estimatedMinutes: null,
            }}
            canWrite
            authorId="teacher"
            area="sections"
            issues={[]}
            onChange={(change) => {
              data = applyLessonDraftChange(data, change)
              render()
            }}
            onAddBlock={() => {}}
            onEditBlock={() => {}}
            onRemoveBlock={() => {}}
            onCreateStructure={() => {}}
          />,
        )
      ;(globalThis as Record<string, unknown>).__rerender = render
      render()
    })
    const rerender = (globalThis as Record<string, unknown>).__rerender as () => void
    const field = () =>
      [...view.container.querySelectorAll<HTMLTextAreaElement>('textarea')].find(
        (node) => node.maxLength === TEACHER_NOTES_MAX,
      )
    // O bloco de vídeo antigo é sinalizado na aula ao vivo.
    expect(view.container.textContent).toContain('Bloco de vídeo antigo')
    await act(async () => button(view.container, 'Orientações e projeto').click())
    expect(view.container.textContent).toContain('Anotações da professora')
    expect(view.container.textContent).toContain('As crianças nunca veem.')
    await act(async () => typeInto(field()!, 'Desenhar a seta no sprite'))
    expect(data.sections[0]?.teacherNotes).toBe('Desenhar a seta no sprite')
    await act(async () => typeInto(field()!, ''))
    expect(data.sections[0]).not.toHaveProperty('teacherNotes', expect.anything())
    expect(JSON.parse(JSON.stringify(data.sections[0])).teacherNotes).toBeUndefined()
    // No curso gravado, nada disso.
    live = false
    await act(async () => rerender())
    expect(view.container.textContent).not.toContain('Bloco de vídeo antigo')
    expect(field() !== undefined).toBe(false)
  })

  test('o manifesto leva as anotações e recusa as longas demais com o nome da parte', () => {
    const doc = documentWithVideo()
    doc.sections[0] = {
      ...doc.sections[0]!,
      teacherNotes: 'Mostrar o bloco de colisão',
      completion: { version: 1, blockIds: [] },
    }
    const exported = buildLessonManifest(doc, 'farol-ao-vivo')
    expect(exported.manifest.sections[0]?.teacherNotes).toBe('Mostrar o bloco de colisão')
    doc.sections[0] = { ...doc.sections[0]!, teacherNotes: '   ' }
    expect(buildLessonManifest(doc, 'farol-ao-vivo').manifest.sections[0]).not.toHaveProperty(
      'teacherNotes',
    )
    doc.sections[0] = { ...doc.sections[0]!, teacherNotes: 'x'.repeat(TEACHER_NOTES_MAX + 1) }
    expect(() => buildLessonManifest(doc, 'farol-ao-vivo')).toThrow('Abertura')
  })
})

describe('importar o manifesto numa aula ao vivo', () => {
  test('conta os vídeos planejados do arquivo', () => {
    expect(plannedVideoCount('{"blocks":[{"key":"a","plannedVideo":"x"},{"key":"b"}]}')).toBe(1)
    expect(plannedVideoCount('não é json')).toBe(0)
    expect(plannedVideoCount('{"blocks":null}')).toBe(0)
  })

  test('avisa antes e mostra o recado do servidor quando ele recusa', async () => {
    const manifest = {
      version: 5,
      courseSlug: 'farol-ao-vivo',
      lessonSlug: 'encontro-1',
      title: 'Encontro 1',
      blocks: [{ key: 'video-1', plannedVideo: 'Gravar a abertura' }],
      sections: [
        {
          key: 'abertura',
          title: 'Abertura',
          objective: '',
          intent: 'presentation',
          blockKeys: ['video-1'],
          workspaceKey: null,
          externalTool: null,
          pendingMedia: [],
          completion: { version: 1, blockIds: [] },
        },
      ],
    }
    globalThis.fetch = (async () =>
      Response.json(
        {
          error: {
            code: 'LIVE_LESSON_NO_VIDEO',
            message: 'Numa aula de curso ao vivo o vídeo é a transmissão do encontro.',
          },
        },
        { status: 422 },
      )) as unknown as typeof fetch
    const view = await mount((root) =>
      root.render(
        <LessonManifestImport
          lessonId="lesson"
          lessonSlug="encontro-1"
          courseSlug="farol-ao-vivo"
          live
          disabled={false}
          beforeImport={async () => {}}
          onImported={async () => {}}
        />,
      ),
    )
    const textarea = view.container.querySelector<HTMLTextAreaElement>('textarea')!
    await act(async () => typeInto(textarea, JSON.stringify(manifest)))
    expect(view.container.textContent).toContain('o arquivo traz um vídeo planejado')
    await act(async () => button(view.container, 'Conferir importação').click())
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)))
    expect(view.container.querySelector('[role="alert"]')?.textContent).toBe(
      'Numa aula de curso ao vivo o vídeo é a transmissão do encontro.',
    )
  })
})

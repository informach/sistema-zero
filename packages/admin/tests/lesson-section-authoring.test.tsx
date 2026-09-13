import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { applyLessonDraftChange, type LessonDraftDocument } from '@sistemazero/core/learning'
import { newAuthoringSection } from '../src/lib/lesson-authoring'
import type { LessonBlockContent } from '../src/lib/types'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { LessonSectionAuthoring } = await import('../src/components/editor/lesson-section-authoring')
const { LessonContentCatalog } = await import('../src/components/editor/lesson-content-catalog')

test('teacher creates a section from scratch, collapses it and resumes without changing content or rules', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  let root = createRoot(container)
  let changes = 0
  const target = { id: null as string | null }
  let data: LessonDraftDocument<LessonBlockContent> = {
    title: 'Nova aula',
    slug: 'nova',
    estimatedMinutes: null,
    blocks: [],
    sections: [newAuthoringSection('existing')],
    supportBlockIds: [],
    attachments: [],
    plannedVideos: [],
  }
  const render = () =>
    root.render(
      <LessonSectionAuthoring
        document={data}
        lesson={{
          id: 'authoring-test',
          title: data.title,
          slug: data.slug,
          blocks: data.blocks.map((b, sortOrder) => ({
            ...b,
            lessonId: 'authoring-test',
            kind: b.content.kind,
            blockRevision: b.id,
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
          changes++
          data = applyLessonDraftChange(data, change)
          render()
        }}
        onAddBlock={(id) => {
          target.id = id
        }}
        onEditBlock={() => {}}
        onRemoveBlock={() => {}}
        onCreateStructure={() => {
          throw new Error('No template should be required')
        }}
      />,
    )
  const button = (label: string) =>
    [...container.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent?.trim() === label,
    )!
  try {
    await act(async () => render())
    expect(container.querySelector('[aria-expanded="true"]')).toBeNull()
    await act(async () => button('Adicionar seção').click())
    expect(data.sections).toHaveLength(2)
    const added = data.sections[1]!
    expect(container.querySelector(`#section-content-${added.id}`)?.hasAttribute('hidden')).toBe(
      false,
    )
    const contentButton = container
      .querySelector(`#section-content-${added.id}`)!
      .querySelector<HTMLButtonElement>('button')!
    await act(async () => contentButton.click())
    expect(target.id).toBe(added.id)
    const serialized = JSON.stringify(data)
    const mutations = changes
    await act(async () => button('Recolher todas').click())
    expect(container.querySelector(`#section-content-${added.id}`)?.hasAttribute('hidden')).toBe(
      true,
    )
    await act(async () => button('Abrir todas').click())
    expect(JSON.stringify(data)).toBe(serialized)
    expect(changes).toBe(mutations)
    await act(async () => root.unmount())
    root = createRoot(container)
    await act(async () => render())
    expect(container.querySelector(`#section-content-${added.id}`)?.hasAttribute('hidden')).toBe(
      false,
    )
    expect(changes).toBe(mutations)
    await act(async () => root.render(<LessonContentCatalog audience="kids" onSelect={() => {}} />))
    expect(container.textContent).toContain('Vídeo')
    expect(container.textContent).toContain('Fala do Zappy')
    expect(container.querySelectorAll('button')).toHaveLength(13)
    await act(async () => root.unmount())
  } finally {
    container.remove()
  }
})

test('the content catalog can be searched by the displayed Portuguese name without accents', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  try {
    await act(async () => root.render(<LessonContentCatalog audience="kids" onSelect={() => {}} />))
    const input = container.querySelector('input')!
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      setValue.call(input, 'estudio')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect([...container.querySelectorAll('button')].map((b) => b.textContent)).toHaveLength(1)
    expect(container.querySelector('button')?.textContent).toContain('Estúdio')
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})

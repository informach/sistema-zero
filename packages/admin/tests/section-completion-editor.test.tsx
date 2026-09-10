import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import {
  defaultLessonSection,
  type SectionCompletion,
  sectionCompletionIssues,
} from '@sistemazero/core/learning'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { SectionCompletionEditor } = await import(
  '../src/components/editor/section-completion-editor'
)

test('author selects completion evidence and configures a structural objective through the form', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let value: SectionCompletion = { version: 1, blockIds: [] }
  const render = () =>
    root.render(
      <SectionCompletionEditor
        value={value}
        candidates={[{ id: 'question', label: 'Confira a ideia' }]}
        hasStudio
        onChange={(next) => {
          value = next
          render()
        }}
      />,
    )
  try {
    await act(async () => render())
    await act(async () =>
      container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
    )
    expect(value.blockIds).toEqual(['question'])
    await act(async () =>
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent?.includes('Adicionar objetivo'))!
        .click(),
    )
    expect(value.projectChecks).toHaveLength(1)
    const section = {
      ...defaultLessonSection('section', 'Criar', []),
      workspaceBlockId: 'project',
      completion: { ...value, blockIds: [] },
    }
    expect(
      sectionCompletionIssues([section], [{ id: 'project', content: { kind: 'studio' } }]).some(
        (issue) => issue.message.includes('Preencha'),
      ),
    ).toBe(true)
    await act(async () => {
      const select = container.querySelector('select')!
      select.value = 'usesLoop'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(value.projectChecks?.[0]?.rule).toEqual({ type: 'usesLoop' })
    expect(container.querySelector('input[aria-label="Nome esperado no objetivo 1"]')).toBeNull()
    await act(async () =>
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent?.includes('Remover objetivo'))!
        .click(),
    )
    expect(value.projectChecks).toHaveLength(0)
    expect(value.blockIds).toEqual(['question'])
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})

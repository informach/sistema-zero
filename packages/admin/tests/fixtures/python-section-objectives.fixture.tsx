import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { isSectionCompletion, type SectionCompletion } from '@sistemazero/core/learning'
import { authoringFixture } from '../../../members/tests/fakes/studio-authoring-policy'

GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { SectionCompletionEditor } = await import(
  '../../src/components/editor/section-completion-editor'
)

test('Python objectives have their own rules, preserve unfinished drafts, and load no interpreter to edit criteria', async () => {
  const { project } = await authoringFixture('python', 'pro')
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  let value: SectionCompletion = { version: 1, blockIds: ['question'] }
  const originalFetch = globalThis.fetch
  let requests = 0
  globalThis.fetch = Object.assign(
    async () => {
      requests++
      throw new Error('Editing criteria must remain lazy')
    },
    { preconnect: originalFetch.preconnect },
  )
  const render = () =>
    root.render(
      <SectionCompletionEditor
        value={value}
        candidates={[]}
        hasStudio
        workspace={{ kind: 'studio', initialProject: project }}
        onChange={(next) => {
          value = next
          render()
        }}
      />,
    )
  const field = (label: string) => {
    const node = [...host.querySelectorAll('label')].find(
      (item) => item.firstElementChild?.textContent === label,
    )
    const input = node?.querySelector('input,select')
    if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement))
      throw new Error(`Missing field ${label}`)
    return input
  }
  const change = async (label: string, text: string) => {
    const input = field(label)
    await act(async () => {
      if (input instanceof HTMLSelectElement) {
        input.value = text
        input.dispatchEvent(new Event('change', { bubbles: true }))
      } else {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, text)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    })
  }
  try {
    await act(async () => render())
    await act(async () =>
      [...host.querySelectorAll('button')]
        .find((button) => button.textContent === 'Adicionar objetivo do Estúdio')!
        .click(),
    )
    expect(value.projectChecks?.[0]).toMatchObject({
      programmingLanguage: 'python',
      profileId: project.runtime.profileId,
      rule: { type: 'usesLoop' },
    })
    expect(field('Como conferir o objetivo').textContent).not.toContain('Usar um bloco')
    await change('O que o aluno precisa fazer', 'Mova a tartaruga')
    await change('Como conferir o objetivo', 'callsFunction')
    expect(isSectionCompletion(value)).toBe(true)
    await change('Nome esperado', 'turtle.forward')
    await change('Arquivo Python (opcional)', 'src/')
    expect(isSectionCompletion(value)).toBe(true)
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('caminho')
    await change('Arquivo Python (opcional)', 'src/main.py')
    expect(value.projectChecks?.[0]?.rule).toEqual({
      type: 'callsFunction',
      name: 'turtle.forward',
      file: 'src/main.py',
    })
    expect(value.blockIds).toEqual(['question'])
    await change('Como conferir o objetivo', 'behavior')
    expect(value.projectChecks?.[0]?.rule).toMatchObject({
      type: 'behavior',
      expect: { target: { kind: 'console' } },
    })
    expect(host.textContent).not.toContain('Regra em JavaScript')
    await change('Como conferir o objetivo', 'functionReturns')
    expect(value.projectChecks?.[0]?.rule).toMatchObject({
      type: 'functionReturns',
      name: 'somar',
      cases: [{ args: [2, 3], expected: 5 }],
    })
    expect(isSectionCompletion(value)).toBe(true)
    expect(requests).toBe(0)
  } finally {
    await act(async () => root.unmount())
    host.remove()
    globalThis.fetch = originalFetch
  }
})

test('changing language requires an explicit objective reset and preserves other completion evidence', async () => {
  const { project } = await authoringFixture('python', 'classic')
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  let value: SectionCompletion = {
    version: 1,
    blockIds: ['video'],
    projectChecks: [{ id: 'loop', label: 'Repita', rule: { type: 'usesLoop' } }],
  }
  const render = () =>
    root.render(
      <SectionCompletionEditor
        value={value}
        candidates={[]}
        hasStudio
        workspace={{ kind: 'studio', initialProject: project }}
        onChange={(next) => {
          value = next
          render()
        }}
      />,
    )
  try {
    await act(async () => render())
    expect(value.projectChecks?.[0]?.programmingLanguage).toBeUndefined()
    const reset = [...host.querySelectorAll('button')].find(
      (button) => button.textContent === 'Limpar objetivos de outro ambiente',
    )
    expect(reset).toBeTruthy()
    await act(async () => reset!.click())
    expect(value.projectChecks).toEqual([])
    expect(value.blockIds).toEqual(['video'])
  } finally {
    await act(async () => root.unmount())
    host.remove()
  }
})

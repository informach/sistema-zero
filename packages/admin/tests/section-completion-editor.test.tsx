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
      const select = container.querySelector<HTMLSelectElement>(
        'select[aria-label="Regra do objetivo 1"]',
      )!
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

test('"Exigir envio em dia" só aparece onde vale, e desmarcar apaga a chave', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let value: SectionCompletion = { version: 1, blockIds: [] }
  let allow = true
  const caixa = () =>
    [...container.querySelectorAll('label')]
      .find((label) => label.textContent?.includes('Exigir envio em dia'))
      ?.querySelector<HTMLInputElement>('input[type="checkbox"]') ?? null
  const render = () =>
    root.render(
      <SectionCompletionEditor
        value={value}
        candidates={[]}
        hasStudio={false}
        allowSubmissionUpToDate={allow}
        onChange={(next) => {
          value = next
          render()
        }}
      />,
    )
  try {
    await act(async () => render())
    await act(async () => caixa()!.click())
    expect(value.submissionUpToDate).toBe(true)
    // Fora de uma parte válida a caixa continua visível enquanto marcada, para dar para desmarcar.
    allow = false
    await act(async () => render())
    await act(async () => caixa()!.click())
    expect('submissionUpToDate' in value).toBe(false)
    expect(caixa()).toBeNull()
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})

test('objetivo ganha dica e desafio extra, e "Testar agora" confere inicial e gabarito', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let value: SectionCompletion = {
    version: 1,
    blockIds: [],
    projectChecks: [{ id: 'laco', label: 'Use um laço', rule: { type: 'usesLoop' } }],
  }
  const workspace = {
    kind: 'studio',
    initialProject: { ir: { js: [] } },
    solutionProject: { ir: { js: [] } },
  }
  const render = () =>
    root.render(
      <SectionCompletionEditor
        value={value}
        candidates={[]}
        hasStudio
        workspace={workspace}
        onChange={(next) => {
          value = next
          render()
        }}
      />,
    )
  const setInput = (input: HTMLInputElement, text: string) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }
  try {
    await act(async () => render())
    expect(container.textContent).toContain('Obrigatório')
    const hint = container.querySelector<HTMLInputElement>(
      'input[aria-label="Dica do objetivo 1"]',
    )!
    await act(async () => setInput(hint, 'Procure em Laços'))
    expect(value.projectChecks?.[0]?.hint).toBe('Procure em Laços')
    await act(async () => setInput(hint, ''))
    expect('hint' in (value.projectChecks?.[0] ?? {})).toBe(false)
    const extra = [...container.querySelectorAll('label')]
      .find((label) => label.textContent?.includes('Desafio extra'))!
      .querySelector<HTMLInputElement>('input[type="checkbox"]')!
    await act(async () => extra.click())
    expect(value.projectChecks?.[0]?.optional).toBe(true)
    expect(container.textContent).toContain('Desafio extra')
    await act(async () => extra.click())
    expect('optional' in (value.projectChecks?.[0] ?? {})).toBe(false)
    await act(async () =>
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent === 'Testar agora')!
        .click(),
    )
    const status = container.querySelector('[role="status"]')!
    expect(status.textContent).toContain('O gabarito não cumpre "Use um laço"')
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})

test('num Estúdio Pro o objetivo nasce como ideia de programação e "usar um bloco" fica desligado', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let value: SectionCompletion = { version: 1, blockIds: [] }
  const render = () =>
    root.render(
      <SectionCompletionEditor
        value={value}
        candidates={[]}
        hasStudio
        workspace={{ kind: 'studio', initialProject: { kind: 'pro', tree: {} } }}
        onChange={(next) => {
          value = next
          render()
        }}
      />,
    )
  try {
    await act(async () => render())
    await act(async () =>
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent?.includes('Adicionar objetivo'))!
        .click(),
    )
    expect(value.projectChecks?.[0]?.rule).toEqual({ type: 'usesLoop' })
    const option = container.querySelector<HTMLOptionElement>(
      'select[aria-label="Regra do objetivo 1"] option[value="usesBlock"]',
    )!
    expect(option.disabled).toBe(true)
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})

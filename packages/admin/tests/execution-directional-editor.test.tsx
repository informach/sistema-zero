import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { isSectionExecutionRule, type SectionExecutionRule } from '@sistemazero/core/learning'
import { describeExecutionRule, targetLabel } from '../src/lib/execution-rule'

if (typeof document === 'undefined') GlobalRegistrator.register()
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { ExecutionRuleEditor } = await import('../src/components/editor/execution-rule-editor')

const initial = (): SectionExecutionRule => ({
  type: 'behavior',
  steps: [{ action: 'press', key: 'ArrowRight', holdMs: 80 }],
  expect: { target: { kind: 'value', path: 'pontos' }, compare: 'equals', value: 123 },
})
function field<T extends HTMLElement>(container: HTMLElement, selector: string): T {
  const element = container.querySelector<T>(selector)
  if (!element) throw new Error(`Missing field: ${selector}`)
  return element
}

test('the actual editor keeps relative comparisons free from exact values and emits an explicit idle policy', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let value = initial()
  const render = () =>
    root.render(
      <ExecutionRuleEditor
        rule={value}
        index={0}
        isPro={false}
        isKit={false}
        onChange={(next) => {
          value = next
          render()
        }}
      />,
    )
  const select = async (label: string, next: string) =>
    act(async () => {
      const element = field<HTMLSelectElement>(container, `select[aria-label="${label}"]`)
      element.value = next
      element.dispatchEvent(new Event('change', { bubbles: true }))
    })
  try {
    await act(async () => render())
    const compare = field<HTMLSelectElement>(
      container,
      'select[aria-label="Comparação do objetivo 1"]',
    )
    expect([...compare.options].map((option) => option.value)).not.toContain('decreased')
    await select('O que conferir no objetivo 1', 'spritePosition')
    expect(value).toEqual({
      type: 'behavior',
      observation: { type: 'idleBeforeAction', idleMs: 80 },
      steps: [{ action: 'press', key: 'ArrowRight', holdMs: 80 }],
      expect: { target: { kind: 'spritePosition', path: '', axis: 'x' }, compare: 'increased' },
    })
    expect(isSectionExecutionRule(value)).toBe(false)
    const input = field<HTMLInputElement>(container, 'input[aria-label="Personagem do objetivo 1"]')
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      if (!setter) throw Error('Missing native input setter')
      setter.call(input, 'avatar')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await select('Eixo do objetivo 1', 'y')
    await select('Comparação do objetivo 1', 'decreased')
    await select('Tecla do passo 1', 'ArrowUp')
    expect(isSectionExecutionRule(value)).toBe(true)
    expect(
      [
        ...field<HTMLSelectElement>(container, 'select[aria-label="Comparação do objetivo 1"]')
          .options,
      ].map((option) => option.value),
    ).toEqual(['increased', 'decreased'])
    expect(container.querySelector('input[aria-label="Valor esperado do objetivo 1"]')).toBeNull()
    expect(
      [...container.querySelectorAll<HTMLButtonElement>('button')].find(
        (button) => button.textContent === 'Adicionar passo',
      )?.disabled,
    ).toBe(true)
    expect(
      field<HTMLButtonElement>(container, 'button[aria-label="Tirar o passo 1"]').disabled,
    ).toBe(true)
    expect(describeExecutionRule(value)).toContain('observar parado por 80 ms antes da tecla')
    expect(describeExecutionRule(value)).toContain('avatar.y diminuiu')
    expect(targetLabel({ kind: 'spritePosition', path: 'avatar', axis: 'x' })).toBe('avatar.x')
    await select('O que conferir no objetivo 1', 'text')
    expect(value).not.toHaveProperty('observation')
    expect(value).toMatchObject({ expect: { target: { kind: 'text' }, compare: 'changed' } })
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})

test('Pro or multiple steps cannot silently discard steps to create a directional rule', async () => {
  for (const isPro of [true, false]) {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    const value = initial()
    if (!isPro && value.type === 'behavior') value.steps.push({ action: 'wait', ms: 100 })
    let changes = 0
    try {
      await act(async () =>
        root.render(
          <ExecutionRuleEditor
            rule={value}
            index={0}
            isPro={isPro}
            isKit={false}
            onChange={() => {
              changes++
            }}
          />,
        ),
      )
      expect(field<HTMLOptionElement>(container, 'option[value="spritePosition"]').disabled).toBe(
        true,
      )
      expect(changes).toBe(0)
    } finally {
      await act(async () => root.unmount())
      container.remove()
    }
  }
})

test('an incompatible loaded comparison stays visible and is never normalized during mount', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const value: SectionExecutionRule = {
    type: 'behavior',
    steps: [],
    expect: { target: { kind: 'text' }, compare: 'increased' },
  }
  try {
    await act(async () =>
      root.render(
        <ExecutionRuleEditor
          rule={value}
          index={0}
          isPro={false}
          isKit={false}
          onChange={() => {
            throw Error('Unexpected rewrite')
          }}
        />,
      ),
    )
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'comparação compatível',
    )
    expect(
      field<HTMLSelectElement>(container, 'select[aria-label="Comparação do objetivo 1"]').value,
    ).toBe('increased')
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})

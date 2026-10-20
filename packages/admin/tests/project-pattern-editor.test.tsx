import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { ProjectBlockPattern, SectionStructureRule } from '@sistemazero/core/learning'
import { projectCheckAuthoring } from '@sistemazero/studio/server-project-checks'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { ProjectPatternEditor } = await import('../src/components/editor/project-pattern-editor')
const { ProjectRuleEditor } = await import('../src/components/editor/project-rule-editor')

for (const depth of ['top', 'nested'] as const) {
  test(`${depth} editor displays flexible criteria and preserves them when another field changes`, async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    const model = projectCheckAuthoring({})
    let value: Extract<SectionStructureRule, { type: 'usesBlock' }> = {
      type: 'usesBlock',
      blockType: 'sz_html_canvas',
      fields: { ID: 'tela' },
      fieldText: { DESCRIPTION: { nonBlank: true } },
    }
    const render = () =>
      root.render(
        depth === 'top' ? (
          <ProjectRuleEditor
            rule={value}
            onChange={(next) => {
              value = next
              render()
            }}
            workspace={{}}
          />
        ) : (
          <ProjectPatternEditor
            pattern={value}
            model={model}
            depth={1}
            onChange={(next) => {
              value = { ...value, ...next }
              render()
            }}
          />
        ),
      )
    try {
      for (const example of [
        {
          rule: {
            type: 'usesBlock' as const,
            blockType: 'sz_html_canvas',
            fields: { ID: 'tela' },
            fieldText: { DESCRIPTION: { nonBlank: true as const } },
          },
          name: 'ID',
          protectedName: 'DESCRIPTION',
          summary: 'Texto não vazio',
        },
        {
          rule: {
            type: 'usesBlock' as const,
            blockType: 'sz_css_opacity',
            fields: { SELECTOR: '#jogo' },
            fieldRanges: { VALUE: { min: 0, minExclusive: true as const, max: 1 } },
          },
          name: 'SELECTOR',
          protectedName: 'VALUE',
          summary: 'Número maior que 0 e menor ou igual a 1',
        },
      ]) {
        value = example.rule
        const before = structuredClone(value)
        await act(async () => render())
        const parameters = model.available.find(
          (entry) => entry.type === value.blockType,
        )?.parameters
        const editable = parameters?.find((parameter) => parameter.name === example.name)
        const constrained = parameters?.find(
          (parameter) => parameter.name === example.protectedName,
        )
        if (!editable || !constrained) throw new Error('Real catalog parameter missing')
        expect(container.textContent).toContain(example.summary)
        const protectedElement =
          depth === 'top'
            ? [...container.querySelectorAll('label')].find(
                (label) => label.firstChild?.textContent === constrained.label,
              )
            : [...container.querySelectorAll('span')].find(
                (span) => span.textContent === `${constrained.label} (${constrained.name})`,
              )?.parentElement
        if (!protectedElement) throw new Error('Protected real parameter missing')
        expect(protectedElement.textContent).toContain(example.summary)
        expect(Boolean(protectedElement.querySelector('input,select'))).toBe(false)
        const input = [...container.querySelectorAll('label')]
          .find((label) => label.firstChild?.textContent === editable.label)
          ?.querySelector('input')
        if (!input) throw new Error('Editable real parameter missing')
        await act(async () => {
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
          if (!setter) throw new Error('Native input setter missing')
          setter.call(input, 'personalizado')
          input.dispatchEvent(new Event('input', { bubbles: true }))
        })
        expect(value.fields?.[example.name]).toBe('personalizado')
        expect(value.fieldText).toEqual(before.fieldText)
        expect(value.fieldRanges).toEqual(before.fieldRanges)
        expect(value.fields?.[example.protectedName]).toBeUndefined()
      }
    } finally {
      await act(async () => root.unmount())
      container.remove()
    }
  })
}

test('teacher adds, edits and removes a nested piece through actual catalog controls', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const model = projectCheckAuthoring({
    initialProject: { installedExtensions: [{ id: 'game-2d' }] },
  })
  let value: ProjectBlockPattern = { blockType: 'sz_g2d_spawn_obstacle' }
  const render = () =>
    root.render(
      <ProjectPatternEditor
        model={model}
        pattern={value}
        onChange={(next) => {
          value = next
          render()
        }}
      />,
    )
  const choose = async (selector: string, option: string) =>
    act(async () => {
      const select = container.querySelector<HTMLSelectElement>(selector)!
      select.value = option
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
  try {
    await act(async () => render())
    await choose('select[aria-label="Adicionar espaço a conferir"]', 'VX')
    await choose('select[aria-label="Peça em VX"]', 'sz_math_arithmetic')
    await choose('fieldset select[aria-label="Adicionar espaço a conferir"]', 'A')
    await choose('select[aria-label="Peça em A"]', 'sz_val_variable')
    expect(value.inputBlocks?.VX?.inputBlocks?.A?.blockType).toBe('sz_val_variable')
    expect(container.textContent).toContain('Primeiro valor da conta')
    await choose('select[aria-label="Peça em A"]', '')
    expect(value.inputBlocks?.VX?.inputBlocks).toBeUndefined()
    await choose('select[aria-label="Peça em VX"]', '')
    expect(value.inputBlocks).toBeUndefined()
    value = {
      blockType: 'sz_js_if_else',
      inputBlocks: { THEN: { blockType: 'sz_g2d_apply_gravity' } },
    }
    await act(async () => render())
    await act(async () => {
      const order = [...container.querySelectorAll('label')]
        .find((label) => label.textContent?.startsWith('Antes de qual comando'))!
        .querySelector('select')!
      order.value = 'sz_g2d_control_dino'
      order.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(value.inputBlocks?.THEN?.beforeBlock).toBe('sz_g2d_control_dino')
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})

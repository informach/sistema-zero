import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { ProjectBlockPattern } from '@sistemazero/core/learning'
import { projectCheckAuthoring } from '@sistemazero/studio/server-project-checks'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { ProjectPatternEditor } = await import('../src/components/editor/project-pattern-editor')

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
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})

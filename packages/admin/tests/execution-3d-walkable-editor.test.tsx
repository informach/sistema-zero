import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { ExecutionStep } from '@sistemazero/core/learning'

if (typeof document === 'undefined') GlobalRegistrator.register()
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { StepsEditor } = await import('../src/components/editor/execution-rule-editor')

test('editing a floor boundary preserves incomplete negative input until a number is ready', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  let steps: ExecutionStep[] = [
    {
      action: 'approachObject3d',
      actorPath: 'jogador',
      targetPath: 'chave',
      timeoutMs: 4500,
      walkable: [{ minX: -10, maxX: 10, minZ: -10, maxZ: 10 }],
    },
  ]
  const render = () =>
    root.render(
      <StepsEditor
        steps={steps}
        index={0}
        onChange={(next) => {
          steps = next
          render()
        }}
      />,
    )
  const boundary = () => {
    const step = steps[0]
    if (!step || step.action !== 'approachObject3d') throw Error('Passo inesperado')
    return step.walkable![0]!.minX
  }
  try {
    await act(async () => render())
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="minX do retângulo 1"]',
    )!
    await act(async () => input.focus())
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    const edit = async (text: string) =>
      act(async () => {
        setter.call(input, text)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
    await edit('')
    expect(boundary()).toBe(-10)
    expect(input.value).toBe('')
    await edit('-')
    expect(boundary()).toBe(-10)
    expect(input.value).toBe('-')
    await edit('-2')
    await edit('-2,')
    expect(input.value).toBe('-2,')
    await edit('-2,5')
    expect(boundary()).toBe(-2.5)
    await edit('-')
    await act(async () => input.blur())
    expect(input.value).toBe('-2.5')
    expect(boundary()).toBe(-2.5)
    expect(container.textContent).toContain('Valor inválido. O valor anterior foi mantido')
    await act(async () => input.focus())
    await edit('101')
    expect(boundary()).toBe(-2.5)
    await act(async () => input.blur())
    expect(input.value).toBe('-2.5')
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})

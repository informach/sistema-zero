import { afterEach, describe, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const React = await import('react')
const { act } = React
const { createRoot } = await import('react-dom/client')
const { MoreMenu } = await import('../src/components/professor/more-menu')
const { LessonMoreMenu } = await import('../src/components/editor/lesson-more-menu')

let cleanup: (() => void) | null = null
afterEach(() => {
  cleanup?.()
  cleanup = null
})

async function mount(element: React.ReactElement) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => root.render(element))
  cleanup = () => {
    act(() => root.unmount())
    container.remove()
  }
  return container
}

/** Põe o gatilho num lugar da janela (o happy-dom não faz layout). */
function placeTrigger(element: Element, rect: { left: number; right: number; top: number }) {
  element.getBoundingClientRect = () =>
    ({ ...rect, bottom: rect.top + 44, width: rect.right - rect.left, height: 44 }) as DOMRect
}

describe('menus "Mais": ficam dentro da tela', () => {
  test('Mais das telas da Turma: gatilho na borda esquerda do celular, menu a 8px da borda', async () => {
    const container = await mount(
      React.createElement(MoreMenu, {
        items: [{ label: 'Mandar recado em grupo', href: '/admin/professor/recados' }],
      }),
    )
    const summary = container.querySelector('summary') as HTMLElement
    placeTrigger(summary, { left: 16, right: 100, top: 100 })
    await act(async () => summary.click())
    const details = container.querySelector('details') as HTMLDetailsElement
    expect(details.open).toBe(true)
    const panel = summary.nextElementSibling as HTMLElement
    expect(panel.className.split(/\s+/)).toContain('fixed')
    expect(panel.style.left).toBe('8px')
    expect(panel.style.top).toBe(`${144 + 4}px`)

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(details.open).toBe(false)
    expect(document.activeElement === summary).toBe(true)
  })

  test('Mais do editor de aula: menu fixo, preso às margens e com rolagem para tela baixa', async () => {
    const container = await mount(
      React.createElement(LessonMoreMenu, {
        items: [{ id: 'a', label: 'Tirar a aula do ar', onSelect: () => {} }],
      }),
    )
    const trigger = container.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement
    placeTrigger(trigger, { left: 10, right: 60, top: 100 })
    await act(async () => trigger.click())
    const menu = container.querySelector('[role="menu"]') as HTMLElement
    const classes = menu.className.split(/\s+/)
    expect(classes).toContain('fixed')
    expect(classes).toContain('overflow-y-auto')
    expect(classes.some((name) => name.startsWith('max-h-'))).toBe(true)
    expect(menu.style.left).toBe('8px')
    expect(menu.style.maxHeight).not.toBe('')
  })
})

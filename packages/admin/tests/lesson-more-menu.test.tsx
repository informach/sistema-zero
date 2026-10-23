import { afterEach, describe, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const React = await import('react')
const { createRoot } = await import('react-dom/client')
const { LessonMoreMenu } = await import('../src/components/editor/lesson-more-menu')

let cleanup: (() => void) | null = null
afterEach(() => {
  cleanup?.()
  cleanup = null
})

async function mount(items: Parameters<typeof LessonMoreMenu>[0]['items']) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => root.render(React.createElement(LessonMoreMenu, { items })))
  cleanup = () => {
    act(() => root.unmount())
    container.remove()
  }
  return container
}

const key = (target: Element, name: string) =>
  act(async () => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }))
  })

describe('menu "Mais" do editor de aula', () => {
  test('abre com o gatilho, percorre com as setas, pula o item desligado e fecha no Escape', async () => {
    const chosen: string[] = []
    const container = await mount([
      { id: 'a', label: 'Comparar com a versão publicada', onSelect: () => chosen.push('a') },
      {
        id: 'b',
        label: 'Desfazer a restauração',
        disabled: true,
        onSelect: () => chosen.push('b'),
      },
      { id: 'c', label: 'Tirar a aula do ar', onSelect: () => chosen.push('c') },
    ])
    const trigger = container.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement
    expect(trigger.textContent).toContain('Mais')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(container.querySelector('[role="menu"]') === null).toBe(true)

    await act(async () => trigger.click())
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    const items = [...container.querySelectorAll('[role="menuitem"]')] as HTMLButtonElement[]
    expect(items.map((item) => item.textContent)).toEqual([
      'Comparar com a versão publicada',
      'Desfazer a restauração',
      'Tirar a aula do ar',
    ])
    expect(document.activeElement === items[0]).toBe(true)

    const menu = container.querySelector('[role="menu"]') as HTMLElement
    await key(menu, 'ArrowDown')
    expect(document.activeElement === items[2]).toBe(true)
    await key(menu, 'ArrowUp')
    expect(document.activeElement === items[0]).toBe(true)

    await key(menu, 'Escape')
    expect(container.querySelector('[role="menu"]') === null).toBe(true)
    expect(document.activeElement === trigger).toBe(true)
    expect(chosen).toEqual([])
  })

  test('escolher um item fecha o menu e roda a ação', async () => {
    const chosen: string[] = []
    const container = await mount([
      { id: 'c', label: 'Tirar a aula do ar', onSelect: () => chosen.push('c') },
    ])
    const trigger = container.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement
    await act(async () => trigger.click())
    const item = container.querySelector('[role="menuitem"]') as HTMLButtonElement
    await act(async () => item.click())
    expect(chosen).toEqual(['c'])
    expect(container.querySelector('[role="menu"]') === null).toBe(true)
  })

  test('com todos os itens desligados, Escape no gatilho fecha, e Tab para fora também', async () => {
    const container = await mount([
      { id: 'a', label: 'Desfazer a restauração', disabled: true, onSelect: () => {} },
    ])
    const trigger = container.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement
    await act(async () => trigger.click())
    expect(container.querySelector('[role="menu"]') === null).toBe(false)
    await key(trigger, 'Escape')
    expect(container.querySelector('[role="menu"]') === null).toBe(true)
    expect(document.activeElement === trigger).toBe(true)

    await act(async () => trigger.click())
    expect(container.querySelector('[role="menu"]') === null).toBe(false)
    await key(trigger, 'Tab')
    expect(container.querySelector('[role="menu"]') === null).toBe(true)
  })

  test('sem item, o gatilho não aparece', async () => {
    const container = await mount([])
    expect(container.querySelector('button') === null).toBe(true)
  })
})

describe('cabeçalho do editor de aula', () => {
  test('o caminho principal é "Revisar e publicar" e o resto mora no menu "Mais"', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const editor = readFileSync(
      resolve(
        import.meta.dir,
        '../src/app/admin/membros/cursos/[courseId]/aulas/[lessonId]/lesson-editor-client.tsx',
      ),
      'utf8',
    )
    expect(editor).toContain('Revisar e publicar')
    expect(editor).not.toContain('Revisar para publicar')
    expect(editor).toContain("kids ? 'Ver como a criança vê' : 'Ver como o aluno vê'")
    expect(editor).toContain("label: 'Tirar a aula do ar'")
    expect(editor).not.toContain('Despublicar')
    expect(editor).toContain("{ id: 'sections', label: 'Partes da aula' }")
  })
})

import { describe, expect, it } from 'bun:test'
import { type ConsoleVisibilityOverride, createUIStore, resolveConsoleVisibility } from './uiStore'

describe('resolveConsoleVisibility', () => {
  it.each([
    ['blocks', false],
    ['bridge', false],
    ['code', true],
  ] as const)('usa o padrão do modo %s sem escolha manual', (mode, expected) => {
    expect(resolveConsoleVisibility(mode, null)).toBe(expected)
  })

  it.each([
    true,
    false,
  ] as const)('faz a escolha manual %s prevalecer em todos os modos', (override) => {
    for (const mode of ['blocks', 'bridge', 'code'] as const) {
      expect(resolveConsoleVisibility(mode, override)).toBe(override)
    }
  })
})

describe('createUIStore', () => {
  it('começa sem preferência manual de visibilidade do Console', () => {
    expect(createUIStore().getState().consoleVisibilityOverride).toBeNull()
  })

  it('mantém a preferência manual na mesma store e a reinicia numa nova instância', () => {
    const first = createUIStore()
    const chosen: ConsoleVisibilityOverride = false

    first.getState().setConsoleVisibilityOverride(chosen)

    expect(first.getState().consoleVisibilityOverride).toBe(false)
    expect(resolveConsoleVisibility('code', first.getState().consoleVisibilityOverride)).toBe(false)
    expect(createUIStore().getState().consoleVisibilityOverride).toBeNull()
  })
})

import { describe, expect, test } from 'bun:test'
import { resolveGamepadVisibility, toggledGamepadOverride } from '@/lib/gamepad-visibility'

describe('visibilidade manual do gamepad público', () => {
  test('sem escolha manual segue a preferência automática do aparelho', () => {
    expect(resolveGamepadVisibility(true, null)).toBe(true)
    expect(resolveGamepadVisibility(false, null)).toBe(false)
  })

  test('a escolha manual consegue esconder controles automáticos de um aparelho touch', () => {
    const visible = resolveGamepadVisibility(true, null)
    const override = toggledGamepadOverride(visible)

    expect(resolveGamepadVisibility(true, override)).toBe(false)
  })

  test('um segundo toque volta a mostrar os controles', () => {
    const hidden = resolveGamepadVisibility(true, false)
    const override = toggledGamepadOverride(hidden)

    expect(resolveGamepadVisibility(true, override)).toBe(true)
  })
})

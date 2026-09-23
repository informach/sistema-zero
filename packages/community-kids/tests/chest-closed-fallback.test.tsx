import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { render } from '@testing-library/react'
import { CHEST_CLOSED_FALLBACK_SRC, ChestClosedFallback } from '../src/components/kids/chest-icon'

describe('fallback fechado do baú da trilha', () => {
  test('usa a ilustração própria, decorativa e enquadrada para o nó', () => {
    const { container } = render(<ChestClosedFallback />)
    const chest = container.querySelector('img')
    const asset = readFileSync(new URL('../public/kids/chest-closed.svg', import.meta.url), 'utf8')

    expect(CHEST_CLOSED_FALLBACK_SRC).toBe('/kids/chest-closed.svg')
    expect(chest?.getAttribute('src')).toBe(CHEST_CLOSED_FALLBACK_SRC)
    expect(chest?.getAttribute('alt')).toBe('')
    expect(chest?.getAttribute('aria-hidden')).toBe('true')
    expect(chest?.className).toContain('size-7')
    expect(asset).toContain('viewBox="162 209 196 146"')
  })
})

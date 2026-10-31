import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { BUILTIN_ART } from '@sistemazero/edisvg/builtins'
import { render } from '@testing-library/react'
import { CHEST_CLOSED_FALLBACK_SRC, ChestClosedFallback } from '../src/components/kids/chest-icon'

describe('fallback fechado do baú da trilha', () => {
  test('usa a ilustração própria, decorativa e enquadrada para o nó', () => {
    const { container } = render(<ChestClosedFallback />)
    const chest = container.querySelector('img')
    const asset = readFileSync(
      new URL(
        `../../edisvg/assets/${BUILTIN_ART.chest.poster.url.split('/').at(-1)}`,
        import.meta.url,
      ),
    )

    expect(CHEST_CLOSED_FALLBACK_SRC).toBe(BUILTIN_ART.chest.poster.url)
    expect(chest?.getAttribute('src')).toBe(CHEST_CLOSED_FALLBACK_SRC)
    expect(chest?.getAttribute('alt')).toBe('')
    expect(chest?.getAttribute('aria-hidden')).toBe('true')
    expect(chest?.getAttribute('width')).toBe('32')
    expect(chest?.getAttribute('height')).toBe('32')
    expect(chest?.className).toContain('size-8')
    expect(createHash('sha256').update(asset).digest('hex')).toBe(BUILTIN_ART.chest.poster.sha256)
  })
})

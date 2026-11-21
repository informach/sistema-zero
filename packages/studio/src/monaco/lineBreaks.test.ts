import { describe, expect, it } from 'bun:test'
import { sameTextExceptLineBreaks } from './lineBreaks'

describe('o mesmo documento com quebras de linha diferentes', () => {
  it('quebras misturadas guardadas e a quebra única do editor são o mesmo texto', () => {
    expect(sameTextExceptLineBreaks('a\r\nb\nc\rd', 'a\nb\nc\nd')).toBe(true)
    expect(sameTextExceptLineBreaks('a\r\nb\nc', 'a\r\nb\r\nc')).toBe(true)
    expect(sameTextExceptLineBreaks('igual', 'igual')).toBe(true)
  })

  it('qualquer outra diferença continua sendo outro texto', () => {
    expect(sameTextExceptLineBreaks('a\r\nb', 'a\nbb')).toBe(false)
    expect(sameTextExceptLineBreaks('a\nb', 'a b')).toBe(false)
    expect(sameTextExceptLineBreaks('a\n\nb', 'a\nb')).toBe(false)
    expect(sameTextExceptLineBreaks('a\r\n\nb', 'a\nb')).toBe(false)
  })
})

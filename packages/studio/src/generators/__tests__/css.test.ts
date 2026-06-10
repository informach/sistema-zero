import { describe, expect, it } from 'bun:test'
import { generateCSS } from '../css'

describe('generateCSS', () => {
  it('gera regras simples', () => {
    const css = generateCSS([
      {
        selector: 'body',
        declarations: { background: '#111827', 'font-family': 'Arial, sans-serif' },
      },
    ])
    expect(css).toContain('body {')
    expect(css).toContain('background: #111827;')
    expect(css).toContain('font-family: Arial, sans-serif;')
  })

  it('preserva blocos rawCSS (modo avançado)', () => {
    const css = generateCSS([
      {
        type: 'rawCSS',
        code: '@media (max-width: 600px) { body { padding: 0; } }',
        advanced: true,
      },
    ])
    expect(css).toContain('@media (max-width: 600px)')
  })

  it('produz string vazia quando não há regras', () => {
    expect(generateCSS([])).toBe('')
  })
})

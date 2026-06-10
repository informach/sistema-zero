import { describe, expect, it } from 'bun:test'
import { parseCSS } from '../css'

describe('parseCSS', () => {
  it('extrai regra simples como CSSRule', () => {
    const ir = parseCSS('body { background: #111827; color: #fff; }')
    expect(ir).toHaveLength(1)
    expect(ir[0]).toEqual({
      selector: 'body',
      declarations: { background: '#111827', color: '#fff' },
    })
  })

  it('reconhece @media (max-width/min-width) como mediaQuery estruturado', () => {
    const ir = parseCSS('@media (max-width: 600px) { body { padding: 0; } }')
    expect(ir).toEqual([
      {
        type: 'mediaQuery',
        feature: 'max-width',
        px: 600,
        rules: [{ selector: 'body', declarations: { padding: '0' } }],
      },
    ])
  })

  it('mantém @media com condição fora do formato como rawCSS advanced', () => {
    const code = '@media (orientation: landscape) { body { color: red; } }'
    const ir = parseCSS(code)
    expect(ir).toEqual([{ type: 'rawCSS', code, advanced: true }])
  })

  it('preserva @media incompleto como rawCSS advanced', () => {
    const code = '@media (max-width: 600px) { body { padding: 0; }'
    const ir = parseCSS(code)
    expect(ir).toEqual([{ type: 'rawCSS', code, advanced: true }])
  })

  it('preserva @rules terminadas por ponto e virgula', () => {
    const ir = parseCSS('@import url("./theme.css"); body { color: red; }')
    expect(ir).toContainEqual({
      type: 'rawCSS',
      code: '@import url("./theme.css");',
      advanced: true,
    })
    expect(ir).toContainEqual({ selector: 'body', declarations: { color: 'red' } })
  })

  it('preserva a ordem entre regras comuns e @rules avançadas', () => {
    const ir = parseCSS(
      'body { color: red; } @media (max-width: 600px) { body { color: blue; } } p { color: green; }',
    )

    expect(ir).toEqual([
      { selector: 'body', declarations: { color: 'red' } },
      {
        type: 'mediaQuery',
        feature: 'max-width',
        px: 600,
        rules: [{ selector: 'body', declarations: { color: 'blue' } }],
      },
      { selector: 'p', declarations: { color: 'green' } },
    ])
  })

  it('aceita seletor com pseudo-classe como CSSRule (vira "Regra CSS")', () => {
    const ir = parseCSS('a:hover { color: red; }')
    expect(ir[0]).toEqual({ selector: 'a:hover', declarations: { color: 'red' } })
  })

  it('aceita propriedade arbitrária como CSSRule (vira "Regra CSS")', () => {
    const ir = parseCSS('body { transform: scale(2); }')
    expect(ir[0]).toEqual({ selector: 'body', declarations: { transform: 'scale(2)' } })
  })

  it('aceita seletor descendente com pseudo-classe', () => {
    const ir = parseCSS('.nav a:hover { color: #2563eb; }')
    expect(ir[0]).toEqual({ selector: '.nav a:hover', declarations: { color: '#2563eb' } })
  })
})

import { describe, expect, it } from 'bun:test'
import { normalizeSelector, offsetToLine, parseCSSWithSpans } from '../css.js'

describe('parseCSSWithSpans — posições (linhas) do CSS exibido', () => {
  it('seletor multilinha: cada declaração na sua linha absoluta', () => {
    // 1 html,
    // 2 body {
    // 3   margin: 0;
    // 4   width: 100%;
    // 5 }
    const css = 'html,\nbody {\n  margin: 0;\n  width: 100%;\n}'
    const { rules } = parseCSSWithSpans(css)
    expect(rules).toHaveLength(1)
    const rule = rules[0]
    if (!rule) throw new Error('sem regra')
    expect(rule.selectorNormalized).toBe('html, body')
    expect(rule.startLine).toBe(1)
    expect(rule.endLine).toBe(5)
    expect(rule.declarations.find((d) => d.prop === 'margin')?.line).toBe(3)
    expect(rule.declarations.find((d) => d.prop === 'width')?.line).toBe(4)
  })

  it('ignora comentários e linhas em branco ao numerar', () => {
    // 1 /* topo
    // 2    multi */
    // 3 (vazia)
    // 4 .box {
    // 5   /* c */
    // 6   color: red;
    // 7 }
    const css = '/* topo\n   multi */\n\n.box {\n  /* c */\n  color: red;\n}'
    const { rules } = parseCSSWithSpans(css)
    expect(rules).toHaveLength(1)
    expect(rules[0]?.startLine).toBe(4)
    expect(rules[0]?.declarations[0]?.prop).toBe('color')
    expect(rules[0]?.declarations[0]?.line).toBe(6)
  })

  it('pula @media sem contaminar as linhas das regras seguintes', () => {
    // 1 @media (max-width: 600px) {
    // 2   .a { color: red; }
    // 3 }
    // 4 .b {
    // 5   color: blue;
    // 6 }
    const css = '@media (max-width: 600px) {\n  .a { color: red; }\n}\n.b {\n  color: blue;\n}'
    const { rules } = parseCSSWithSpans(css)
    expect(rules.map((r) => r.selectorNormalized)).toEqual(['.b'])
    expect(rules[0]?.declarations[0]?.line).toBe(5)
  })

  it('`;` e `:` dentro de parênteses/strings não quebram a declaração', () => {
    const css = '.x {\n  background: url(data:image/png;base64,AAA);\n  content: "a;b:c";\n}'
    const decls = parseCSSWithSpans(css).rules[0]?.declarations ?? []
    expect(decls.map((d) => d.prop)).toEqual(['background', 'content'])
    expect(decls[0]?.value).toBe('url(data:image/png;base64,AAA)')
    expect(decls[0]?.line).toBe(2)
    expect(decls[1]?.line).toBe(3)
  })

  it('preserva declarações duplicadas com suas linhas', () => {
    const css = '.x {\n  width: 1px;\n  width: 2px;\n}'
    const widths = parseCSSWithSpans(css).rules[0]?.declarations.filter((d) => d.prop === 'width')
    expect(widths?.map((d) => d.line)).toEqual([2, 3])
  })

  it('CRLF conta linhas como o Monaco (só \\n)', () => {
    const css = '.x {\r\n  color: red;\r\n}'
    expect(parseCSSWithSpans(css).rules[0]?.declarations[0]?.line).toBe(2)
  })

  it('última declaração sem `;` ainda é capturada', () => {
    const css = '.x {\n  color: red\n}'
    expect(parseCSSWithSpans(css).rules[0]?.declarations[0]).toMatchObject({
      prop: 'color',
      line: 2,
    })
  })

  it('entrada vazia/sem regras → rules vazio', () => {
    expect(parseCSSWithSpans('').rules).toEqual([])
    expect(parseCSSWithSpans('   \n  ').rules).toEqual([])
  })
})

describe('normalizeSelector', () => {
  it('colapsa quebras/espaços e padroniza vírgulas', () => {
    expect(normalizeSelector('html,\nbody')).toBe('html, body')
    expect(normalizeSelector('html,body')).toBe('html, body')
    expect(normalizeSelector('a ,  b')).toBe('a, b')
    expect(normalizeSelector('  .x   .y  ')).toBe('.x .y')
  })
})

describe('offsetToLine', () => {
  it('1-indexed, conta só \\n', () => {
    const s = 'a\nbb\nccc'
    expect(offsetToLine(s, 0)).toBe(1)
    expect(offsetToLine(s, 2)).toBe(2)
    expect(offsetToLine(s, 5)).toBe(3)
  })
})

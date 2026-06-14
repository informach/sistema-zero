import { describe, expect, it } from 'bun:test'
import { generateCSS } from '../../generators/css'
import { parseCSS, parseCSSWithSpans } from '../css'

/**
 * Round-trip código→IR→código no nível do CSS (sem Blockly). Cobre os achados do
 * 5º full review: comentário no nome da prop (#2), propriedade duplicada (#3) e
 * comentários soltos / regras vazias (#10).
 */
describe('parseCSS — fidelidade do round-trip (5º review)', () => {
  it('#2: comentário antes do NOME da prop não polui a chave do IR (casa com o span)', () => {
    const css = '.box {\n  /* nota */ color: red;\n}'
    const ir = parseCSS(css)
    // A chave do IR é `color`, não `/* nota */ color`.
    expect(ir).toEqual([{ selector: '.box', declarations: { color: 'red' } }])
    // E casa EXATAMENTE com a prop do parser de posições (fonte do realce).
    const { rules } = parseCSSWithSpans(css)
    expect(rules[0]?.declarations[0]?.prop).toBe('color')
    expect(Object.keys(ir[0] && 'declarations' in ir[0] ? ir[0].declarations : {})).toEqual([
      rules[0]?.declarations[0]?.prop ?? '',
    ])
  })

  it('#3: propriedade duplicada (fallback flex→grid) sobrevive ao round-trip', () => {
    const ir = parseCSS('.box { display: flex; display: grid; }')
    // Regra com prop duplicada vira rawCSS avançado (verbatim), não Record colapsado.
    expect(ir).toHaveLength(1)
    expect(ir[0]).toMatchObject({ type: 'rawCSS', advanced: true })
    const out = generateCSS(ir)
    // Ambas as declarações continuam presentes (nada de só `display: grid`).
    expect(out).toContain('display: flex')
    expect(out).toContain('display: grid')
  })

  it('#10: comentário entre regras é preservado verbatim', () => {
    const css = '.a { color: red; }\n/* separador */\n.b { color: blue; }'
    const ir = parseCSS(css)
    const raws = ir.filter((e) => 'type' in e && e.type === 'rawCSS')
    expect(raws.some((e) => 'code' in e && e.code.includes('/* separador */'))).toBe(true)
    const out = generateCSS(ir)
    expect(out).toContain('/* separador */')
    expect(out).toContain('.a {')
    expect(out).toContain('.b {')
  })

  it('#10: regra vazia (placeholder) não some no round-trip', () => {
    const ir = parseCSS('.placeholder {}')
    expect(ir).toHaveLength(1)
    expect(generateCSS(ir)).toContain('.placeholder')
  })

  it('regra normal sem duplicata continua estruturada (não regride para rawCSS)', () => {
    const ir = parseCSS('.box { width: 200px; color: #3b82f6; }')
    expect(ir).toEqual([{ selector: '.box', declarations: { width: '200px', color: '#3b82f6' } }])
  })
})

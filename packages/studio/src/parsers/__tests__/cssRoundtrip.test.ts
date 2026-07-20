import { describe, expect, it } from 'bun:test'
import { generateCSS } from '../../generators/css'
import { parseCSS, parseCSSWithSpans } from '../css'

/**
 * Round-trip código→IR→código no nível do CSS (sem Blockly). Cobre os achados do
 * 5º full review: comentário no nome da prop (#2), propriedade duplicada (#3) e
 * comentários soltos / regras vazias (#10).
 */
describe('parseCSS — fidelidade do round-trip (5º review)', () => {
  it('#2: comentário antes do nome da propriedade sobrevive sem poluir a chave', () => {
    const css = '.box {\n  /* nota */ color: red;\n}'
    const ir = parseCSS(css)
    // Ainda não existe um bloco de comentário DENTRO da regra; o fallback
    // avançado preserva o comentário inteiro em vez de apagá-lo.
    expect(ir).toEqual([{ type: 'rawCSS', code: css, advanced: true }])
    expect(generateCSS(ir).trim()).toBe(css)
    // E casa EXATAMENTE com a prop do parser de posições (fonte do realce).
    const { rules } = parseCSSWithSpans(css)
    expect(rules[0]?.declarations[0]?.prop).toBe('color')
    expect(ir[0]).toMatchObject({ type: 'rawCSS', advanced: true })
  })

  it('#3: propriedade duplicada (fallback flex→grid) sobrevive ao round-trip', () => {
    const ir = parseCSS('.box { display: flex; display: grid; }')
    // O array ordenado mantém as duas ocorrências como blocos editáveis.
    expect(ir).toHaveLength(1)
    expect(ir[0]).toEqual({
      selector: '.box',
      declarations: [
        { property: 'display', value: 'flex' },
        { property: 'display', value: 'grid' },
      ],
    })
    const out = generateCSS(ir)
    // Ambas as declarações continuam presentes (nada de só `display: grid`).
    expect(out).toContain('display: flex')
    expect(out).toContain('display: grid')
  })

  it('#10: comentário entre regras é preservado verbatim (nó comment)', () => {
    const css = '.a { color: red; }\n/* separador */\n.b { color: blue; }'
    const ir = parseCSS(css)
    // Comentário solto vira um nó `comment` (bloco "comentário CSS") — miolo em `text`.
    const comments = ir.filter((e) => 'type' in e && e.type === 'comment')
    expect(comments.some((e) => 'text' in e && e.text.includes('separador'))).toBe(true)
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

  it.each([
    '.a { color: red; width:; }',
    '.a { color: red; width }',
    '.a { color:red; --x:; }',
  ])('preserva uma regra inteira enquanto há uma declaração incompleta: %s', (css) => {
    expect(parseCSS(css)).toEqual([{ type: 'rawCSS', code: css, advanced: true }])
    expect(generateCSS(parseCSS(css)).trim()).toBe(css)
  })

  it('preserva o keyframe inteiro quando uma declaração está incompleta', () => {
    const css = '@keyframes pulso { from { opacity: 0; width:; } to { opacity: 1; } }'
    expect(parseCSS(css)).toEqual([{ type: 'rawCSS', code: css, advanced: true }])
  })

  it('mantém uma chave entre aspas como parte legítima do seletor', () => {
    const css = '[data-x="}"] { color: red; }'
    const ir = parseCSS(css)

    expect(ir).toEqual([{ selector: '[data-x="}"]', declarations: { color: 'red' } }])
    expect(generateCSS(ir)).toContain('[data-x="}"] {')
  })

  it('não agrega comentários CSS adjacentes em um comentário estruturado ambíguo', () => {
    const css = '/* um *//* dois */'
    expect(parseCSS(css)).toEqual([{ type: 'rawCSS', code: css, advanced: true }])
    expect(generateCSS(parseCSS(css)).trim()).toBe(css)
  })

  it('reconhece o import canônico gerado pelo bloco Google Font', () => {
    const original = [{ type: 'googleFont' as const, family: 'Press Start 2P' }]
    const css = generateCSS(original)

    expect(parseCSS(css)).toEqual(original)
  })
})

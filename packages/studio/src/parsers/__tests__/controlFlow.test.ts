import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import type { JSStatement } from '#ir'
import { parseJS } from '../js'

/** Gera código a partir do IR e re-parseia — o IR deve ser estável (roundtrip). */
function roundtrip(ir: JSStatement[]): JSStatement[] {
  return parseJS(compileStatements(ir, 0))
}

describe('controle de fluxo — while/do-while/break/continue', () => {
  it('parseia while com condição e corpo', () => {
    const ir = parseJS('while (x < 10) {\n  x = x + 1;\n}')
    expect(ir).toEqual([
      {
        type: 'while',
        cond: {
          type: 'binop',
          op: '<',
          left: { type: 'var', name: 'x' },
          right: { type: 'num', value: 10 },
        },
        body: [
          {
            type: 'assign',
            name: 'x',
            value: {
              type: 'binop',
              op: '+',
              left: { type: 'var', name: 'x' },
              right: { type: 'num', value: 1 },
            },
          },
        ],
      },
    ])
  })

  it('parseia do...while', () => {
    const ir = parseJS('do {\n  passo();\n} while (ativo);')
    expect(ir[0]?.type).toBe('doWhile')
    expect((ir[0] as Extract<JSStatement, { type: 'doWhile' }>).cond).toEqual({
      type: 'var',
      name: 'ativo',
    })
  })

  it('parseia break e continue dentro de laço', () => {
    const ir = parseJS('while (true) {\n  if (pronto) {\n    break;\n  }\n  continue;\n}')
    const body = (ir[0] as Extract<JSStatement, { type: 'while' }>).body
    expect(body.at(-1)).toEqual({ type: 'continue' })
    const inner = (body[0] as Extract<JSStatement, { type: 'if' }>).then
    expect(inner).toEqual([{ type: 'break' }])
  })

  it('gera while/do-while/break/continue legíveis', () => {
    expect(
      compileStatements([{ type: 'while', cond: { type: 'bool', value: true }, body: [] }], 0),
    ).toContain('while (true) {')
    expect(
      compileStatements([{ type: 'doWhile', cond: { type: 'var', name: 'ok' }, body: [] }], 0),
    ).toContain('} while (ok);')
    expect(compileStatements([{ type: 'break' }], 0)).toBe('break;')
    expect(compileStatements([{ type: 'continue' }], 0)).toBe('continue;')
  })

  it('roundtrip estável (parse → gera → parse)', () => {
    const code =
      'while (n > 0) {\n  console.log(n);\n  n = n - 1;\n}\ndo {\n  tentar();\n} while (falhou);'
    const ir = parseJS(code)
    expect(roundtrip(ir)).toEqual(ir)
  })

  it('break com label degrada para código avançado', () => {
    const ir = parseJS('externo: while (a) {\n  break externo;\n}')
    // O while externo com label vira rawJS (o label não é representável).
    expect(ir.some((s) => s.type === 'rawJS')).toBe(true)
  })
})

describe('laços for — for-of, repeat e for clássico (forRange)', () => {
  it('parseia for-of (sem índice)', () => {
    const ir = parseJS('for (const item of lista) {\n  console.log(item);\n}')
    expect(ir[0]).toEqual({
      type: 'forOf',
      itemName: 'item',
      iterableVar: 'lista',
      body: [{ type: 'consoleLog', value: { type: 'var', name: 'item' } }],
    })
  })

  it('mantém o match EXATO do repeat (de 0, < N, i++)', () => {
    const ir = parseJS('for (let i = 0; i < 5; i++) {\n  passo();\n}')
    expect(ir[0]?.type).toBe('repeat')
  })

  it('for de início ≠ 0 ou passo ≠ 1 vira forRange', () => {
    const ir = parseJS('for (let i = 1; i < 10; i += 2) {\n  soma(i);\n}')
    expect(ir[0]).toEqual({
      type: 'forRange',
      varName: 'i',
      from: { type: 'num', value: 1 },
      to: { type: 'num', value: 10 },
      step: { type: 'num', value: 2 },
      body: [{ type: 'callFunction', name: 'soma', args: [{ type: 'var', name: 'i' }] }],
    })
  })

  it('for (i=0; i<n; i++) com limite variável também vira forRange (antes degradava)', () => {
    const ir = parseJS('for (let i = 0; i < n; i++) {\n  ler(i);\n}')
    expect(ir[0]?.type).toBe('forRange')
    expect((ir[0] as Extract<JSStatement, { type: 'forRange' }>).step).toEqual({
      type: 'num',
      value: 1,
    })
  })

  it('avalia o limite de repeat uma única vez', () => {
    const code = compileStatements(
      [
        {
          type: 'repeat',
          times: { type: 'call', name: 'calcularLimite', args: [] },
          body: [{ type: 'callFunction', name: 'marcar', args: [] }],
        },
      ],
      0,
    )
    let limitCalls = 0
    let bodyCalls = 0
    const run = new Function('calcularLimite', 'marcar', code)
    run(
      () => {
        limitCalls += 1
        return 3
      },
      () => {
        bodyCalls += 1
      },
    )
    expect(limitCalls).toBe(1)
    expect(bodyCalls).toBe(3)
  })

  it('avalia início, fim e passo uma vez e percorre intervalos decrescentes', () => {
    const code = compileStatements(
      [
        {
          type: 'forRange',
          varName: 'i',
          from: { type: 'call', name: 'inicio', args: [] },
          to: { type: 'call', name: 'fim', args: [] },
          step: { type: 'call', name: 'passo', args: [] },
          body: [{ type: 'callFunction', name: 'marcar', args: [{ type: 'var', name: 'i' }] }],
        },
      ],
      0,
    )
    const calls = { inicio: 0, fim: 0, passo: 0 }
    const visited: number[] = []
    const run = new Function('inicio', 'fim', 'passo', 'marcar', code)
    run(
      () => {
        calls.inicio += 1
        return 3
      },
      () => {
        calls.fim += 1
        return 0
      },
      () => {
        calls.passo += 1
        return -1
      },
      (value: number) => visited.push(value),
    )
    expect(calls).toEqual({ inicio: 1, fim: 1, passo: 1 })
    expect(visited).toEqual([3, 2, 1])
  })

  it('gera forRange com limites estáveis e direção definida pelo passo', () => {
    const one = compileStatements(
      [
        {
          type: 'forRange',
          varName: 'i',
          from: { type: 'num', value: 2 },
          to: { type: 'num', value: 8 },
          step: { type: 'num', value: 1 },
          body: [],
        },
      ],
      0,
    )
    expect(one).toContain('for (let i = 2,')
    expect(one).toContain('? i <')
    expect(one).toContain('? i >')
    const stepped = compileStatements(
      [
        {
          type: 'forRange',
          varName: 'i',
          from: { type: 'num', value: 0 },
          to: { type: 'num', value: 10 },
          step: { type: 'num', value: 2 },
          body: [],
        },
      ],
      0,
    )
    expect(stepped).toContain('passo = 2')
    expect(stepped).toContain('i += passo')
  })

  it('não entra no laço quando o passo é zero', () => {
    const code = compileStatements(
      [
        {
          type: 'forRange',
          varName: 'i',
          from: { type: 'num', value: 0 },
          to: { type: 'num', value: 5 },
          step: { type: 'num', value: 0 },
          body: [{ type: 'callFunction', name: 'marcar', args: [] }],
        },
      ],
      0,
    )
    expect(code).toContain(': false')
  })

  it('roundtrip estável de for-of e forRange', () => {
    const code =
      'for (const x of itens) {\n  console.log(x);\n}\nfor (let i = 3; i < 20; i += 5) {\n  marcar(i);\n}'
    const ir = parseJS(code)
    expect(roundtrip(ir)).toEqual(ir)
  })
})

describe('try/catch/finally', () => {
  it('parseia try/catch com binding de erro', () => {
    const ir = parseJS('try {\n  arriscado();\n} catch (erro) {\n  console.log(erro);\n}')
    expect(ir[0]).toEqual({
      type: 'tryCatch',
      body: [{ type: 'callFunction', name: 'arriscado', args: [] }],
      errorName: 'erro',
      handler: [{ type: 'consoleLog', value: { type: 'var', name: 'erro' } }],
    })
  })

  it('parseia try/catch/finally', () => {
    const ir = parseJS('try {\n  a();\n} catch (e) {\n  b();\n} finally {\n  c();\n}') as Extract<
      JSStatement,
      { type: 'tryCatch' }
    >[]
    expect(ir[0]?.finalizer).toEqual([{ type: 'callFunction', name: 'c', args: [] }])
  })

  it('gera try/catch/finally legível', () => {
    const code = compileStatements(
      [
        {
          type: 'tryCatch',
          body: [{ type: 'callFunction', name: 'a', args: [] }],
          errorName: 'erro',
          handler: [{ type: 'callFunction', name: 'b', args: [] }],
          finalizer: [{ type: 'callFunction', name: 'c', args: [] }],
        },
      ],
      0,
    )
    expect(code).toContain('try {')
    expect(code).toContain('} catch (erro) {')
    expect(code).toContain('} finally {')
  })

  it('catch sem binding (catch { }) roundtrip', () => {
    const ir = parseJS('try {\n  x();\n} catch {\n  y();\n}')
    expect((ir[0] as Extract<JSStatement, { type: 'tryCatch' }>).errorName).toBeUndefined()
    expect(roundtrip(ir)).toEqual(ir)
  })

  it('roundtrip estável de try/catch/finally', () => {
    const code = 'try {\n  abrir();\n} catch (e) {\n  console.log(e);\n} finally {\n  fechar();\n}'
    const ir = parseJS(code)
    expect(roundtrip(ir)).toEqual(ir)
  })
})

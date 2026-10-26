import { describe, expect, it } from 'bun:test'
import { compileStatements } from '../../../generators'
import { parseJS } from '../../../parsers/js'

describe('defineShape — integridade do callback na Ponte', () => {
  it('a forma canônica com ctx continua sendo um bloco editável', () => {
    const statements = parseJS(
      "SZGame2D.defineShape('marca', (ctx) => { SZGame2D.paintRect(ctx, 0, 0, 10, 10, '#ffffff'); });",
    )
    expect(statements[0]?.type).toBe('g2d:defineShape')
    expect(compileStatements(statements, 0)).toContain('(ctx) =>')
  })

  for (const callback of [
    "function (pincel) { SZGame2D.paintRect(pincel, 0, 0, 10, 10, '#ffffff'); }",
    'async function (ctx) { await Promise.resolve(ctx); }',
    'function* (ctx) { yield ctx; }',
    'function desenhar(ctx) { return desenhar; }',
    "() => { SZGame2D.paintRect(ctx, 0, 0, 10, 10, '#ffffff'); }",
    '(ctx, extra) => { return extra; }',
  ]) {
    it(`preserva inteira a chamada que não cabe no bloco: ${callback}`, () => {
      const call = `SZGame2D.defineShape('marca', ${callback})`
      const statements = parseJS(`${call};`)
      expect(statements).toHaveLength(1)
      expect(statements[0]).toMatchObject({ type: 'rawJS', code: call, advanced: true })
      expect(compileStatements(statements, 0).trim()).toBe(call)
    })
  }

  it('o desenho com nome próprio de contexto continua executando depois de gerar', () => {
    const source =
      "SZGame2D.defineShape('marca', function (pincel) { SZGame2D.paintRect(pincel, 0, 0, 10, 10, '#ffffff'); });"
    const code = compileStatements(parseJS(source), 0)
    const expectedContext = { marker: 'contexto real da figura' }
    let paintedContext: unknown
    const api = {
      defineShape(_name: string, draw: (context: typeof expectedContext) => void) {
        draw(expectedContext)
      },
      paintRect(context: unknown) {
        paintedContext = context
      },
    }
    new Function('SZGame2D', code)(api)
    expect(paintedContext).toBe(expectedContext)
  })
})

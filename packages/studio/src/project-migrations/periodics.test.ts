import { expect, it } from 'bun:test'
import { compileStatements } from '../generators'
import { JSStatementSchema } from '../ir/schema'
import { gameTwoDRuntime } from '../official-extensions/game-2d/runtime'
import { parseJS } from '../parsers/js'
import { migrateNestedPeriodicIR } from './nestedPeriodics'

it('conserva contagem condicional no motor atual e depois de editar na Ponte', () => {
  const loop = {
    type: 'g2d:updateEachFrame',
    body: [
      {
        type: 'if',
        cond: { type: 'var', name: 'ativo' },
        then: [
          {
            type: 'g2d:everyFrames',
            __id: 'obstaculos',
            n: { type: 'num', value: 2 },
            body: [{ type: 'consoleLog', value: { type: 'str', value: 'caiu' } }],
          },
        ],
      },
    ],
  }
  migrateNestedPeriodicIR(loop, [])
  const converted = JSStatementSchema.parse(loop)
  const code = compileStatements([converted], 0)
  const reparsed = parseJS(code)
  expect(reparsed[0]?.type).toBe('g2d:updateEachFrame')
  expect(JSON.stringify(reparsed)).not.toContain('"type":"g2d:everyFrames"')
  for (const js of [code, compileStatements(reparsed, 0)]) {
    const output: string[] = []
    const win: Record<string, unknown> = { addEventListener() {} }
    new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
    const runtime = win.SZGame2D
    if (!runtime || typeof runtime !== 'object') throw new Error('Motor não iniciou')
    let tick = () => {}
    const api = {
      ...runtime,
      gameLoop: (callback: () => void) => {
        tick = callback
      },
    }
    const setActive = new Function(
      'SZGame2D',
      'console',
      `let ativo = false;\n${js}\nreturn value => { ativo = value; };`,
    )(api, { log: (value: string) => output.push(value) })
    for (const active of [true, false, false, true, true, false, true]) {
      setActive(active)
      tick()
    }
    expect(output).toEqual(['caiu', 'caiu'])
  }
})

it('a consulta isolada continua um if; a raiz periódica conserva sua chave explícita', () => {
  const direct = parseJS('if (SZGame2D.everyFrames("compartilhada", 2)) { console.log("a"); }')
  expect(direct[0]?.type).toBe('if')
  const periodic = parseJS(
    'SZGame2D.gameLoop(function __szPeriodicLoop() { if (SZGame2D.everyFrames("compartilhada", 2)) { console.log("a"); } });',
  )
  expect(periodic[0]).toMatchObject({ type: 'g2d:everyFrames', key: 'compartilhada' })
  expect(compileStatements(periodic, 0)).toContain('everyFrames("compartilhada", 2)')
})

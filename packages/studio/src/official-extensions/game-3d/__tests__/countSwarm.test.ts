import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import { type JSExpr, JSExprSchema } from '#ir'
import { parseJS } from '../../../parsers/js'
import { gameThreeDBlocks } from '../blocks'

describe('game-3d — quantidade do enxame fim a fim', () => {
  const value: JSExpr = { type: 'g3d:countSwarm', swarmVar: 'inimigos' }

  it('possui bloco reporter e schema válido', () => {
    const definition = gameThreeDBlocks.find((block) => block.type === 'sz_g3d_count_swarm')
    expect(definition?.output).toBe('JSValue')
    expect(JSExprSchema.safeParse(value).success).toBe(true)
  })

  it('gera JavaScript e volta pela Ponte sem degradar para código cru', () => {
    const statement = { type: 'var', name: 'total', value } as const
    const code = compileStatements([statement], 0)
    expect(code).toContain('SZGame3D.countSwarm(inimigos)')
    expect(parseJS(code)).toEqual([statement])
  })
})

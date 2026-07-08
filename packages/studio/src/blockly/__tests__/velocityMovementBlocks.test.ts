import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { gameTwoDBlocks } from '../../official-extensions/game-2d/blocks'
import { gameThreeDBlocks } from '../../official-extensions/game-3d/blocks'
import { parseJS } from '../../parsers/js'
import { registerExtensionBlocks } from '../blocks'
import { buildIRFromWorkspace } from '../buildIR'
import { ensureBlocklyInitialized } from '../setup'
import { buildWorkspaceStateFromIR } from '../workspaceState'

// Getters/predicados de velocidade do Jogo 2D: (tipo IR, função do runtime).
const G2D = [
  ['g2d:spriteVx', 'spriteVx'],
  ['g2d:spriteVy', 'spriteVy'],
  ['g2d:spriteSpeed', 'spriteSpeed'],
  ['g2d:isMoving', 'isMoving'],
  ['g2d:isMovingH', 'isMovingH'],
  ['g2d:isMovingV', 'isMovingV'],
] as const

/** IR→blocos→Blockly(live)→IR: prova buildIR + workspaceState (round-trip). */
function roundtripExpr(
  extensionId: string,
  wrappingStmt: Record<string, unknown>,
): Record<string, unknown>[] {
  const ir = { html: [], css: [], js: [wrappingStmt], extensions: [{ extensionId }] }
  const state = buildWorkspaceStateFromIR(
    ir as unknown as Parameters<typeof buildWorkspaceStateFromIR>[0],
  )
  const ws = new Blockly.Workspace()
  Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
  return buildIRFromWorkspace(ws).js as unknown as Record<string, unknown>[]
}

describe('Blocos de velocidade/movimento — Jogo 2D', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
  })

  it('gerador: cada getter/predicado vira SZGame2D.<fn>(sprite)', () => {
    for (const [irType, fn] of G2D) {
      const code = compileStatements(
        [
          {
            type: 'g2d:setVelocity',
            spriteVar: 'jogador',
            vx: { type: irType, spriteVar: 'jogador' },
            vy: { type: 'num', value: 0 },
          },
        ],
        0,
      )
      expect(code).toContain(`SZGame2D.${fn}(`)
    }
  })

  it('parser (Ponte): SZGame2D.<fn>(sprite) → o tipo de IR certo (não vira rawJS)', () => {
    for (const [irType, fn] of G2D) {
      const json = JSON.stringify(parseJS(`const v = SZGame2D.${fn}(jogador);`))
      expect(json).toContain(`"${irType}"`)
    }
  })

  it('round-trip IR→blocos→IR preserva o getter dentro de "Mudar a velocidade"', () => {
    const js = roundtripExpr('game-2d', {
      type: 'g2d:setVelocity',
      spriteVar: 'jogador',
      vx: { type: 'g2d:spriteVx', spriteVar: 'jogador' },
      vy: { type: 'num', value: 0 },
    })
    expect(JSON.stringify(js)).toContain('"g2d:spriteVx"')
  })
})

describe('Blocos de velocidade/movimento — Jogo 3D', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameThreeDBlocks)
  })

  it('gerador: getVel/getSpeed/isMoving viram SZGame3D.<fn>(objeto)', () => {
    const speed = compileStatements(
      [
        {
          type: 'g3d:setVelocity',
          objVar: 'jogador',
          x: { type: 'g3d:getSpeed', objVar: 'jogador' },
          y: { type: 'num', value: 0 },
          z: { type: 'num', value: 0 },
        },
      ],
      0,
    )
    expect(speed).toContain('SZGame3D.getSpeed(')

    const vel = compileStatements(
      [
        {
          type: 'g3d:setVelocity',
          objVar: 'jogador',
          x: { type: 'g3d:getVel', objVar: 'jogador', axis: 'y' },
          y: { type: 'num', value: 0 },
          z: { type: 'num', value: 0 },
        },
      ],
      0,
    )
    expect(vel).toContain('SZGame3D.getVel(jogador, "y")')
  })

  it('parser (Ponte): SZGame3D.getVel/getSpeed/isMoving → o tipo de IR certo', () => {
    expect(JSON.stringify(parseJS('const v = SZGame3D.getVel(jogador, "y");'))).toContain(
      '"g3d:getVel"',
    )
    expect(JSON.stringify(parseJS('const v = SZGame3D.getSpeed(jogador);'))).toContain(
      '"g3d:getSpeed"',
    )
    expect(JSON.stringify(parseJS('const v = SZGame3D.isMoving(jogador);'))).toContain(
      '"g3d:isMoving"',
    )
  })

  it('round-trip IR→blocos→IR preserva o eixo do getVel', () => {
    const js = roundtripExpr('game-3d', {
      type: 'g3d:setVelocity',
      objVar: 'jogador',
      x: { type: 'g3d:getVel', objVar: 'jogador', axis: 'z' },
      y: { type: 'num', value: 0 },
      z: { type: 'num', value: 0 },
    })
    const json = JSON.stringify(js)
    expect(json).toContain('"g3d:getVel"')
    expect(json).toContain('"z"')
  })
})

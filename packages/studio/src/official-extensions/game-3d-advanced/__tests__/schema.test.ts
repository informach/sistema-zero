import { describe, expect, it } from 'bun:test'
import { G3K_STATEMENT_TYPES, type JSStatement, SZIRSchema, statementIsExtension } from '#ir'

/**
 * Drift do schema do Jogo 3D Avançado: o Set de statements bate com o prefixo,
 * `statementIsExtension` discrimina a extensão certa, e o zod aceita uma IR
 * exemplar (a validação POR BLOCO vive no blockAudit — aqui é a cola).
 */

describe('G3K_STATEMENT_TYPES', () => {
  it('tem os 59 statements do kit, todos com o prefixo g3k:', () => {
    expect(G3K_STATEMENT_TYPES.size).toBe(75)
    for (const type of G3K_STATEMENT_TYPES) {
      expect(type.startsWith('g3k:')).toBe(true)
    }
  })
})

describe('statementIsExtension', () => {
  const g3kStmt = { type: 'g3k:start' } as JSStatement
  const gkStmt = { type: 'gk:start' } as JSStatement

  it('discrimina game-3d-advanced pelo prefixo g3k:', () => {
    expect(statementIsExtension(g3kStmt, 'game-3d-advanced')).toBe(true)
    expect(statementIsExtension(g3kStmt, 'game-2d-advanced')).toBe(false)
    expect(statementIsExtension(g3kStmt, 'game-3d')).toBe(false)
    expect(statementIsExtension(gkStmt, 'game-3d-advanced')).toBe(false)
  })
})

describe('SZIRSchema — IR exemplar do kit 3D', () => {
  it('aceita um programa mínimo (setup + molde com peça + nascer nomeado + laço)', () => {
    const ir = {
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-3d-advanced' }],
      js: [
        {
          type: 'g3k:setup',
          w: { type: 'num', value: 1280 },
          h: { type: 'num', value: 720 },
          world: { type: 'num', value: 80 },
          sky: '#0b1026',
          ground: '#14532d',
        },
        {
          type: 'g3k:defineMold',
          name: 'heroi',
          health: { type: 'num', value: 100 },
          speed: { type: 'num', value: 8 },
          body: [
            {
              type: 'g3k:part',
              shape: 'box',
              material: 'normal',
              color: '#22d3ee',
              texture: '',
              w: { type: 'num', value: 1 },
              h: { type: 'num', value: 1 },
              d: { type: 'num', value: 1 },
              x: { type: 'num', value: 0 },
              y: { type: 'num', value: 0.5 },
              z: { type: 'num', value: 0 },
            },
          ],
        },
        {
          type: 'g3k:spawnNamed',
          varName: 'heroi',
          mold: 'heroi',
          x: { type: 'num', value: 0 },
          y: { type: 'num', value: 0 },
          z: { type: 'num', value: 0 },
        },
        {
          type: 'g3k:onUpdate',
          dtName: 'dt',
          body: [
            {
              type: 'g3k:moveWithKeys',
              charVar: 'heroi',
              speed: { type: 'num', value: 8 },
            },
          ],
        },
        { type: 'g3k:start' },
      ],
    }
    const parsed = SZIRSchema.safeParse(ir)
    expect(parsed.success).toBe(true)
  })

  it('rejeita um nó g3k: desconhecido', () => {
    const ir = {
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-3d-advanced' }],
      js: [{ type: 'g3k:naoExiste' }],
    }
    const parsed = SZIRSchema.safeParse(ir)
    expect(parsed.success).toBe(false)
  })
})

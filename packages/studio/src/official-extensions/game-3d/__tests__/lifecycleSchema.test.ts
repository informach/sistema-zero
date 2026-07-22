import { describe, expect, it } from 'bun:test'
import { SZIRSchema } from '#ir'

const project = (js: unknown[]) => ({
  html: [{ type: 'canvas', id: 'tela', width: 480, height: 360 }],
  css: [],
  js,
  extensions: [{ extensionId: 'game-3d' }],
})

describe('game-3d — contrato de ciclo de vida', () => {
  it('recusa criação de recursos dentro de “a cada quadro 3D”', () => {
    const parsed = SZIRSchema.safeParse(
      project([
        {
          type: 'g3d:animate',
          worldVar: 'cena',
          body: [
            {
              type: 'g3d:createBox',
              varName: 'caixa',
              worldVar: 'cena',
              size: 1,
              color: '#22d3ee',
            },
          ],
        },
      ]),
    )

    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.message.includes('fora do laço'))).toBe(true)
    }
  })

  it('recusa materiais e texturas recriados a cada quadro', () => {
    for (const statement of [
      { type: 'g3d:setMaterial', objVar: 'cubo', kind: 'metal' },
      { type: 'g3d:setTexture', objVar: 'cubo', asset: 'parede' },
    ]) {
      const result = SZIRSchema.safeParse(
        project([{ type: 'g3d:animate', worldVar: 'cena', body: [statement] }]),
      )
      expect(result.success).toBe(false)
    }
  })

  it('aceita criar cópias e tocar sons em resposta ao jogo dentro de cada quadro', () => {
    const parsed = SZIRSchema.safeParse(
      project([
        {
          type: 'g3d:animate',
          worldVar: 'cena',
          body: [
            {
              type: 'g3d:spawnInSwarm',
              swarmVar: 'enxame',
              originalVar: 'modelo',
              x: 0,
              y: 0,
              z: 0,
            },
            { type: 'g3d:playNote', freq: 440, ms: 100 },
            { type: 'g3d:playEffect', kind: 'coin' },
          ],
        },
      ]),
    )

    expect(parsed.success).toBe(true)
  })

  it('aceita criação antes do loop e movimento dentro dele', () => {
    const parsed = SZIRSchema.safeParse(
      project([
        {
          type: 'g3d:createBox',
          varName: 'caixa',
          worldVar: 'cena',
          size: 1,
          color: '#22d3ee',
        },
        {
          type: 'g3d:animate',
          worldVar: 'cena',
          body: [
            {
              type: 'g3d:rotateBy',
              objVar: 'caixa',
              axis: 'y',
              amount: { type: 'num', value: 0.03 },
            },
          ],
        },
      ]),
    )

    expect(parsed.success).toBe(true)
  })
})

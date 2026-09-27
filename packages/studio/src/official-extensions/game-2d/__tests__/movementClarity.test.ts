import { describe, expect, it } from 'bun:test'
import { gameTwoDBlocks } from '../blocks'
import { GAME_TWO_D_PALETTE } from '../palette'

describe('clareza dos blocos de velocidade do Jogo 2D', () => {
  it('explica de onde vem a velocidade usada para mover o sprite', () => {
    const definition = gameTwoDBlocks.find(({ type }) => type === 'sz_g2d_apply_velocity')

    expect(definition?.message0).toBe('Mover o sprite %1 usando vx e vy')
    expect(definition?.tooltip).toContain('Soma o vx à posição x e o vy à posição y')
    expect(definition?.tooltip).toContain('se vx e vy forem 0, ele não se move')
  })

  it('mantém definir, gravidade e mover juntos na ordem em que são usados', () => {
    const sprites = GAME_TWO_D_PALETTE.find(({ name }) => name === 'Sprites')
    const movement = GAME_TWO_D_PALETTE.find(({ name }) => name === 'Movimento')
    const spriteTypes = sprites?.sections.flatMap((section) => section.types) ?? []
    const movementTypes: readonly string[] =
      movement?.sections.flatMap((section) => section.types) ?? []

    expect(spriteTypes).not.toContain('sz_g2d_set_velocity')
    for (const type of [
      'sz_g2d_set_velocity',
      'sz_g2d_set_gravity',
      'sz_g2d_apply_gravity',
      'sz_g2d_apply_velocity',
    ]) {
      expect(movementTypes, type).toContain(type)
    }
    expect(movementTypes.indexOf('sz_g2d_set_velocity')).toBeLessThan(
      movementTypes.indexOf('sz_g2d_apply_velocity'),
    )
    expect(movementTypes.indexOf('sz_g2d_apply_gravity')).toBeLessThan(
      movementTypes.indexOf('sz_g2d_apply_velocity'),
    )
  })
})

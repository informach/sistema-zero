import { describe, expect, test } from 'bun:test'
import { BLOCK_CATALOG } from '../blockly/blockCatalog'
import { ESSENTIAL_2D_ALLOW_BLOCKS, ESSENTIAL_2D_BLOCK_TYPES } from './blockProfiles'

describe('perfil Jogo 2D Essencial', () => {
  test('contém os 48 tipos da referência (com o Kit espaço COMPLETO), sem duplicatas', () => {
    expect(ESSENTIAL_2D_BLOCK_TYPES).toHaveLength(48)
    expect(new Set(ESSENTIAL_2D_BLOCK_TYPES).size).toBe(48)
  })

  test('o 🚀 Kit espaço entra INTEIRO (variações do jogo de nave do Faísca)', () => {
    for (const type of [
      'sz_g2d_create_ship',
      'sz_g2d_spawn_asteroid',
      'sz_g2d_spawn_asteroid_edge',
      'sz_g2d_shoot_from',
      'sz_g2d_starfield',
      'sz_g2d_explode',
      'sz_g2d_play_shoot',
      'sz_g2d_play_explosion',
    ] as const) {
      expect(ESSENTIAL_2D_BLOCK_TYPES, type).toContain(type)
    }
  })

  test('todos os blocos ofertáveis existem no catálogo', () => {
    const known = new Set(BLOCK_CATALOG.map((entry) => entry.type))
    for (const type of ESSENTIAL_2D_ALLOW_BLOCKS) expect(known.has(type), type).toBe(true)
  })

  test('usa a explosão do kit espacial, não o som temático de gorilas', () => {
    expect(ESSENTIAL_2D_BLOCK_TYPES).toContain('sz_g2d_play_explosion')
    expect(ESSENTIAL_2D_BLOCK_TYPES).not.toContain('sz_g2d_play_boom')
  })
})

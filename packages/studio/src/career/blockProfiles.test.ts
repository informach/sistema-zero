import { describe, expect, test } from 'bun:test'
import { BLOCK_CATALOG } from '../blockly/blockCatalog'
import { ESSENTIAL_2D_ALLOW_BLOCKS, ESSENTIAL_2D_BLOCK_TYPES } from './blockProfiles'

describe('perfil Jogo 2D Essencial', () => {
  test('contém os 57 tipos da referência (com o Kit espaço COMPLETO), sem duplicatas', () => {
    // 48 até 13/09/2026; os dez blocos de SPRITE DE TEXTO (criar, escrever, estilo, caixa,
    // dado do sprite e os dois cliques) entraram no perfil junto com a fatia de text-sprites.
    expect(ESSENTIAL_2D_BLOCK_TYPES).toHaveLength(57)
    expect(new Set(ESSENTIAL_2D_BLOCK_TYPES).size).toBe(57)
  })

  test('o 🚀 Kit espaço entra INTEIRO (variações do jogo de nave do Faísca)', () => {
    for (const type of [
      'sz_g2d_create_ship',
      'sz_g2d_spawn_asteroid',
      'sz_g2d_spawn_asteroid_edge',
      'sz_g2d_shoot_from',
      'sz_g2d_starfield',
      'sz_g2d_explode',
      'sz_g2d_play_fx',
    ] as const) {
      expect(ESSENTIAL_2D_BLOCK_TYPES, type).toContain(type)
    }
  })

  test('todos os blocos ofertáveis existem no catálogo', () => {
    const known = new Set(BLOCK_CATALOG.map((entry) => entry.type))
    for (const type of ESSENTIAL_2D_ALLOW_BLOCKS) expect(known.has(type), type).toBe(true)
  })

  test('usa o seletor de efeitos sonoros', () => {
    expect(ESSENTIAL_2D_BLOCK_TYPES).toContain('sz_g2d_play_fx')
    expect(ESSENTIAL_2D_BLOCK_TYPES).not.toContain('sz_g2d_play_boom')
  })
})

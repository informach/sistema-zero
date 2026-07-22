import { describe, expect, test } from 'bun:test'
import { BLOCK_CATALOG } from '../blockly/blockCatalog'
import { ESSENTIAL_2D_ALLOW_BLOCKS, ESSENTIAL_2D_BLOCK_TYPES } from './blockProfiles'

describe('perfil Jogo 2D Essencial', () => {
  test('contém os 46 tipos da referência, sem duplicatas', () => {
    expect(ESSENTIAL_2D_BLOCK_TYPES).toHaveLength(46)
    expect(new Set(ESSENTIAL_2D_BLOCK_TYPES).size).toBe(46)
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

import { describe, expect, test } from 'bun:test'
import {
  drawerSnapshotsForBlocks,
  drawersForBlocks,
  extensionsForBlocks,
} from '../src/server/studio-unlocks'

/**
 * "Se tiver blocos daquela extensão que eu tô liberando, automaticamente vai estar
 * liberando aquela extensão" — a lista de blocos do curso decide as extensões, ninguém
 * declara à mão. O vínculo vem do catálogo do próprio Studio, então o teste vale contra
 * o catálogo REAL (drift no prefixo de uma extensão aparece aqui).
 */
describe('extensionsForBlocks', () => {
  test('bloco de kit traz a extensão dele', () => {
    expect(extensionsForBlocks(['sz_g2d_create_ship'])).toEqual(['game-2d'])
  })

  test('junta as extensões de blocos de kits diferentes, sem repetir', () => {
    const extensions = extensionsForBlocks([
      'sz_g2d_create_ship',
      'sz_g2d_on_key',
      'sz_g3d_create_box',
    ]).sort()
    expect(extensions).toContain('game-2d')
    expect(extensions).toContain('game-3d')
    expect(extensions.length).toBe(2)
  })

  test('bloco do NÚCLEO não liga extensão nenhuma', () => {
    expect(extensionsForBlocks(['sz_val_number', 'sz_js_if_else'])).toEqual([])
  })

  test('id desconhecido é ignorado (não inventa extensão)', () => {
    expect(extensionsForBlocks(['sz_bloco_que_nao_existe'])).toEqual([])
  })

  test('lista vazia devolve vazio', () => {
    expect(extensionsForBlocks([])).toEqual([])
  })
})

/**
 * "Minhas ferramentas" mostra GAVETAS, não ids: é o que torna a recompensa legível para
 * criança. O nome vem do caminho REAL da paleta (o que ela lê na caixa de ferramentas).
 */
describe('drawersForBlocks', () => {
  test('agrupa os blocos nas gavetas da paleta, com a contagem', () => {
    const drawers = drawersForBlocks(['sz_g2d_create_ship', 'sz_g2d_draw_sprite'])
    expect(drawers.length).toBeGreaterThan(0)
    const total = drawers.reduce((sum, d) => sum + d.count, 0)
    expect(total).toBe(2)
    for (const drawer of drawers) expect(drawer.name.length).toBeGreaterThan(0)
  })

  test('a gaveta mais cheia vem primeiro', () => {
    const drawers = drawersForBlocks([
      'sz_g2d_spawn_asteroid',
      'sz_g2d_spawn_asteroid_edge',
      'sz_g2d_shoot_from',
      'sz_g2d_draw_score',
    ])
    const counts = drawers.map((d) => d.count)
    expect([...counts].sort((a, b) => b - a)).toEqual(counts)
  })

  test('id fora do catálogo NÃO vira gaveta fantasma', () => {
    expect(drawersForBlocks(['sz_bloco_que_nao_existe'])).toEqual([])
  })

  test('sem blocos, sem gavetas (a seção some no perfil)', () => {
    expect(drawersForBlocks([])).toEqual([])
  })
})

describe('drawerSnapshotsForBlocks', () => {
  test('preserva ids estáveis por gaveta e deduplica repetições', () => {
    const snapshots = drawerSnapshotsForBlocks([
      'sz_g2d_create_ship',
      'sz_g2d_create_ship',
      'sz_g2d_draw_sprite',
    ])
    expect(snapshots.flatMap((drawer) => drawer.blockIds).sort()).toEqual([
      'sz_g2d_create_ship',
      'sz_g2d_draw_sprite',
    ])
    for (const drawer of snapshots) expect(drawer.name.length).toBeGreaterThan(0)
  })

  test('id fora do catálogo não entra no snapshot', () => {
    expect(drawerSnapshotsForBlocks(['sz_bloco_que_nao_existe'])).toEqual([])
  })
})

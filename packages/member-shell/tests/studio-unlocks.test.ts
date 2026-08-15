import { describe, expect, test } from 'bun:test'
import {
  drawerSnapshotsForBlocks,
  drawersForBlocks,
  extensionsForBlocks,
  groupDrawersByFamily,
} from '../src/server/studio-unlocks'

/**
 * Blocos REAIS do catálogo cujo nome de gaveta COLIDE entre famílias: os dois moram numa
 * `📋 Listas`, mas um é do HTML e o outro da Programação. É o par que prova a correção — antes
 * eles viravam uma gaveta só, com a contagem somada.
 */
const LISTAS_DO_HTML = 'sz_html_ul'
const LISTAS_DA_PROGRAMACAO = 'sz_js_array_push'
/** Bloco de KIT: caminho de TRÊS segmentos (`Jogo 2D Avançado › 🧙 Kit RPG › 🧙 mundo`). */
const BLOCO_DE_KIT = 'sz_gk_rpg_move_grid'

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
    for (const drawer of drawers) {
      expect(drawer.key.length).toBeGreaterThan(0)
      expect(drawer.family.length).toBeGreaterThan(0)
      expect(drawer.label.length).toBeGreaterThan(0)
    }
  })

  /**
   * 🚨 A REGRESSÃO que motivou a mudança de chave.
   *
   * Chaveando pela FOLHA do caminho, estes dois blocos viravam UMA gaveta `📋 Listas` com
   * `count: 2` — e a criança que abrisse o HTML veria a gaveta da Programação "crescer".
   * Doze nomes de folha colidem no catálogo real, cobrindo 176 blocos; `🔊 Som` chega a
   * existir em quatro famílias.
   */
  test('🚨 gavetas HOMÔNIMAS de famílias diferentes NÃO se fundem', () => {
    const drawers = drawersForBlocks([LISTAS_DO_HTML, LISTAS_DA_PROGRAMACAO])
    expect(drawers).toHaveLength(2)
    expect(drawers.every((drawer) => drawer.count === 1)).toBe(true)
    // Mesmo rótulo visível, famílias e chaves distintas.
    expect(new Set(drawers.map((drawer) => drawer.label)).size).toBe(1)
    expect(new Set(drawers.map((drawer) => drawer.family)).size).toBe(2)
    expect(new Set(drawers.map((drawer) => drawer.key)).size).toBe(2)
  })

  test('bloco de KIT preserva o segmento do meio no rótulo', () => {
    const [drawer] = drawersForBlocks([BLOCO_DE_KIT])
    expect(drawer?.family).toBe('Jogo 2D Avançado')
    // `at(-1)` sozinho jogava fora o nome do kit, que é o que dá sentido à gaveta.
    expect(drawer?.label).toContain('Kit RPG')
    expect(drawer?.key).toContain(drawer?.family ?? '')
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
    for (const drawer of snapshots) expect(drawer.key.length).toBeGreaterThan(0)
  })

  test('id fora do catálogo não entra no snapshot', () => {
    expect(drawerSnapshotsForBlocks(['sz_bloco_que_nao_existe'])).toEqual([])
  })

  test('separa as gavetas homônimas, como o `drawersForBlocks`', () => {
    const snapshots = drawerSnapshotsForBlocks([LISTAS_DO_HTML, LISTAS_DA_PROGRAMACAO])
    expect(snapshots).toHaveLength(2)
    expect(new Set(snapshots.map((drawer) => drawer.family)).size).toBe(2)
  })
})

/**
 * O agrupamento que o perfil usa. Sem ele "Minhas ferramentas" é uma fileira só de pílulas
 * que cresce para sempre (16 gavetas com UMA extensão; passa de 40 com três).
 */
describe('groupDrawersByFamily', () => {
  test('junta as gavetas por família e soma os blocos', () => {
    const groups = groupDrawersByFamily(
      drawersForBlocks([LISTAS_DO_HTML, LISTAS_DA_PROGRAMACAO, 'sz_js_array_remove']),
    )
    expect(groups).toHaveLength(2)
    expect(groups.find((group) => group.family === 'Programação')?.blockCount).toBe(2)
    expect(groups.find((group) => group.family === 'HTML')?.blockCount).toBe(1)
  })

  test('a família mais cheia vem primeiro (é a que abre por padrão no perfil)', () => {
    const groups = groupDrawersByFamily(
      drawersForBlocks([LISTAS_DO_HTML, LISTAS_DA_PROGRAMACAO, 'sz_js_array_remove']),
    )
    const counts = groups.map((group) => group.blockCount)
    expect([...counts].sort((a, b) => b - a)).toEqual(counts)
  })

  test('sem gavetas, sem famílias', () => {
    expect(groupDrawersByFamily([])).toEqual([])
  })
})

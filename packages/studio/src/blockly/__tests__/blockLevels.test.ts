import { describe, expect, it } from 'bun:test'
import { BLOCK_CATALOG } from '../blockCatalog'
import { _LEVEL_SETS, resolveBlockLevel } from '../blockLevels'

const KNOWN = new Set(BLOCK_CATALOG.map((e) => e.type))

describe('blockLevels — conformidade dos conjuntos', () => {
  it('nenhum bloco está em INTERMEDIARIO e AVANCADO ao mesmo tempo', () => {
    const dupes = [..._LEVEL_SETS.INTERMEDIARIO].filter((t) => _LEVEL_SETS.AVANCADO.has(t))
    expect(dupes).toEqual([])
  })

  it('todo tipo listado nos conjuntos é um bloco REAL do catálogo (sem typo/obsoleto)', () => {
    const unknown = [..._LEVEL_SETS.INTERMEDIARIO, ..._LEVEL_SETS.AVANCADO].filter(
      (t) => !KNOWN.has(t),
    )
    expect(unknown).toEqual([])
  })
})

describe('resolveBlockLevel — amostras representativas', () => {
  it('facilitadores + kit essencial de lógica = iniciante', () => {
    for (const t of [
      'sz_g2d_create_sprite', // facilitador do Kit 2D
      'sz_g2d_top_down', // mover em 4 direções
      'sz_html_h1', // criar título
      'sz_svg_circle', // forma pronta
      'sz_canvas_arc', // desenhar círculo
      'sz_js_if_else', // Se
      'sz_js_repeat', // repetir N vezes
      'sz_js_var_create', // criar variável
      'sz_js_const_create', // criar constante
      'sz_val_number', // número
      'sz_val_compare', // comparar
      'sz_val_variable', // valor da variável
      // Blocos do 1º jogo (Nave contra Asteroides) — todos iniciante:
      'sz_g2d_create_group',
      'sz_g2d_update_group',
      'sz_g2d_draw_group',
      'sz_g2d_prune_offscreen',
      'sz_g2d_remove_from_group',
      'sz_g2d_center_x',
      'sz_g2d_sprite_y',
      'sz_g2d_random_x',
      'sz_g2d_clear',
    ]) {
      expect(resolveBlockLevel(t)).toBe('iniciante')
    }
  })

  it('programação real guiada = intermediário', () => {
    for (const t of [
      'sz_js_while',
      'sz_js_for_range',
      'sz_math_arithmetic',
      'sz_js_function',
      'sz_g2d_sprite_vx', // getter de velocidade
      'sz_g2d_set_opacity',
      'sz_css_border',
    ]) {
      expect(resolveBlockLevel(t)).toBe('intermediario')
    }
  })

  it('baixo nível / expert = avançado', () => {
    for (const t of [
      'sz_js_class',
      'sz_val_object',
      'sz_adv_raw_js',
      'sz_g2d_apply_velocity', // física manual
      'sz_css_keyframes',
      'sz_svg_path',
      'sz_math_trig',
      'sz_g3d_get_pos', // getter 3D
    ]) {
      expect(resolveBlockLevel(t)).toBe('avancado')
    }
  })

  it('Jogo 3D NUNCA é iniciante (piso intermediário por prefixo)', () => {
    expect(resolveBlockLevel('sz_g3d_create_scene')).toBe('intermediario')
    expect(resolveBlockLevel('sz_g3d_control_keys')).toBe('intermediario')
    // e os 3D avançados sobem
    expect(resolveBlockLevel('sz_g3d_body')).toBe('avancado')
  })
})

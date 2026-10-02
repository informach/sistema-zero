import { describe, expect, it } from 'bun:test'
import { BLOCK_CATALOG } from '../blockCatalog'
import { _LEVEL_SETS, resolveBlockLevel } from '../blockLevels'
import { PROGRAMMING_VISIBLE_TYPES } from '../programmingContract'

const KNOWN = new Set(BLOCK_CATALOG.map((e) => e.type))

/**
 * Os blocos do Jogo 2D no PRIMEIRO degrau, em ordem alfabética: exatamente os do antigo Kit
 * essencial (conferido contra o `6cafe9e0^`). A lista é LITERAL de propósito: contar não basta,
 * porque trocar um bloco por outro mantém o número e muda o degrau dos dois.
 */
const INICIANTE_2D_G2D_ESPERADO = [
  'sz_g2d_add_scene_backdrop',
  'sz_g2d_arrows_x',
  'sz_g2d_center_x',
  'sz_g2d_clamp_to_screen',
  'sz_g2d_clear',
  'sz_g2d_collect_track_item',
  'sz_g2d_create_group',
  'sz_g2d_create_image_sprite',
  'sz_g2d_create_ship',
  'sz_g2d_create_sprite',
  'sz_g2d_create_sprite_track',
  'sz_g2d_create_text_sprite',
  'sz_g2d_damage_sprite',
  'sz_g2d_draw_group',
  'sz_g2d_draw_score',
  'sz_g2d_draw_sprite',
  'sz_g2d_draw_sprite_health',
  'sz_g2d_every_frames',
  'sz_g2d_explode',
  'sz_g2d_health_depleted',
  'sz_g2d_on_group_click',
  'sz_g2d_on_group_overlap',
  'sz_g2d_on_key',
  'sz_g2d_on_sprite_click',
  'sz_g2d_on_sprite_group_overlap',
  'sz_g2d_on_track_encounter',
  'sz_g2d_on_track_finish',
  'sz_g2d_play_fx',
  'sz_g2d_prune_offscreen',
  'sz_g2d_put_track_sprite',
  'sz_g2d_put_track_sprite_at',
  'sz_g2d_random_x',
  'sz_g2d_remove_from_group',
  'sz_g2d_repeat_track_sprite',
  'sz_g2d_restart',
  'sz_g2d_scale_sprite',
  'sz_g2d_scale_text_size',
  'sz_g2d_scene_animation',
  'sz_g2d_scene_backdrop_motion',
  'sz_g2d_scene_game_screens',
  'sz_g2d_scene_is',
  'sz_g2d_scene_result',
  'sz_g2d_set_health',
  'sz_g2d_set_scene',
  'sz_g2d_set_size',
  'sz_g2d_set_sprite_data',
  'sz_g2d_set_sprite_text',
  'sz_g2d_set_stage_description',
  'sz_g2d_set_text_box',
  'sz_g2d_set_text_image',
  'sz_g2d_set_text_style',
  'sz_g2d_setup_stage',
  'sz_g2d_shake',
  'sz_g2d_shoot_from',
  'sz_g2d_show_screen',
  'sz_g2d_spawn_asteroid',
  'sz_g2d_spawn_asteroid_edge',
  'sz_g2d_spawn_bullet',
  'sz_g2d_spawn_text_in_group',
  'sz_g2d_sprite_data',
  'sz_g2d_sprite_text',
  'sz_g2d_sprite_y',
  'sz_g2d_starfield',
  'sz_g2d_track_controls',
  'sz_g2d_track_hud',
  'sz_g2d_track_hurt',
  'sz_g2d_track_player',
  'sz_g2d_track_score',
  'sz_g2d_track_travel',
  'sz_g2d_update_each_frame',
  'sz_g2d_update_group',
]
const ALL_SETS = [
  ['INTERMEDIARIO_2D', _LEVEL_SETS.INTERMEDIARIO_2D],
  ['AVANCADO_2D', _LEVEL_SETS.AVANCADO_2D],
  ['AVANCADO_3D', _LEVEL_SETS.AVANCADO_3D],
] as const

describe('blockLevels — conformidade dos conjuntos', () => {
  it('nenhum bloco está em dois conjuntos ao mesmo tempo (disjunção par a par)', () => {
    for (let i = 0; i < ALL_SETS.length; i++) {
      for (let j = i + 1; j < ALL_SETS.length; j++) {
        const [nameA, setA] = ALL_SETS[i] as (typeof ALL_SETS)[number]
        const [nameB, setB] = ALL_SETS[j] as (typeof ALL_SETS)[number]
        const dupes = [...setA].filter((t) => setB.has(t)).map((t) => `${nameA}∩${nameB}:${t}`)
        expect(dupes).toEqual([])
      }
    }
  })

  it('todo tipo listado nos conjuntos é um bloco REAL do catálogo (sem typo/obsoleto)', () => {
    const unknown = ALL_SETS.flatMap(([, set]) => [...set]).filter((t) => !KNOWN.has(t))
    expect(unknown).toEqual([])
  })

  it('nenhum conjunto superior captura blocos da categoria Jogo 3D', () => {
    expect([..._LEVEL_SETS.AVANCADO_3D].filter((t) => t.startsWith('sz_g3d_'))).toEqual([])
    expect([..._LEVEL_SETS.AVANCADO_2D].filter((t) => t.startsWith('sz_g3d_'))).toEqual([])
    expect([..._LEVEL_SETS.INTERMEDIARIO_2D].filter((t) => t.startsWith('sz_g3d_'))).toEqual([])
  })

  it('nenhum conjunto superior captura blocos do Jogo 2D básico', () => {
    for (const [, set] of ALL_SETS) {
      expect([...set].filter((type) => type.startsWith('sz_g2d_'))).toEqual([])
    }
  })

  it('não duplica a progressão de Programação nos conjuntos genéricos', () => {
    for (const [name, set] of ALL_SETS) {
      expect(
        [...set].filter((type) => PROGRAMMING_VISIBLE_TYPES.has(type)),
        name,
      ).toEqual([])
    }
  })
})

describe('resolveBlockLevel — amostras representativas', () => {
  it('facilitadores + kit essencial de lógica = iniciante-2d', () => {
    for (const t of [
      'sz_g2d_create_ship', // facilitador do Kit espaço Essencial
      'sz_g2d_arrows_x', // movimento do primeiro jogo
      'sz_html_h1', // criar título (HTML essencial)
      'sz_html_p', // parágrafo (HTML essencial)
      'sz_css_text_color', // pintar o texto (CSS essencial)
      'sz_js_if_else', // Se
      'sz_js_repeat', // repetir N vezes
      'sz_js_var_create', // criar variável
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
      expect(resolveBlockLevel(t)).toBe('iniciante-2d')
    }
  })

  it('todos os blocos do Jogo 3D são iniciante-3d e podem ser filtrados pela aula', () => {
    const game3dTypes = [...KNOWN].filter((type) => type.startsWith('sz_g3d_'))
    expect(game3dTypes.length).toBeGreaterThan(100)
    for (const type of game3dTypes) expect(resolveBlockLevel(type)).toBe('iniciante-3d')
  })

  it('o primeiro degrau do Jogo 2D tem os mesmos 71 blocos de quando vinha do Kit essencial', () => {
    // O Kit essencial saiu em 02/10/2026 (a paleta do Estúdio livre vem dos cursos) e a régua
    // de NÍVEL ficou com a lista dele. Um bloco a mais ou a menos aqui muda o degrau dele nas
    // aulas curadas por nível: tem que ser decisão, não efeito colateral.
    const game2dTypes = [...KNOWN].filter((type) => type.startsWith('sz_g2d_'))
    expect(game2dTypes.length).toBeGreaterThan(180)
    const firstStep = game2dTypes
      .filter((type) => resolveBlockLevel(type) === 'iniciante-2d')
      .sort()
    expect(firstStep).toEqual(INICIANTE_2D_G2D_ESPERADO)
    for (const type of game2dTypes.filter((type) => !firstStep.includes(type))) {
      expect(resolveBlockLevel(type), type).toBe('iniciante-3d')
    }
    expect(resolveBlockLevel('sz_g2d_top_down')).toBe('iniciante-3d')
  })

  it('programação real guiada + SVG + kits prontos do Jogo 2D Avançado = intermediario-2d', () => {
    for (const t of [
      'sz_js_while',
      'sz_js_for_range',
      'sz_math_arithmetic',
      'sz_js_function',
      'sz_js_return',
      'sz_js_return_void',
      'sz_val_arg',
      'sz_js_array_push',
      'sz_val_array',
      'sz_val_array_length',
      'sz_val_array_index',
      'sz_val_array_last',
      'sz_val_join',
      'sz_js_const_create',
      'sz_js_storage_set',
      'sz_val_storage_get',
      'sz_js_on_submit',
      'sz_svg_circle', // SVG = primitivo VISUAL gentil (26/07)
      'sz_svg_path',
      'sz_gk_setup',
      'sz_gk_restart_game',
      'sz_gk_rpg_create_map',
      'sz_gk_plat_hero',
      'sz_gk_luta_match',
    ]) {
      expect(resolveBlockLevel(t)).toBe('intermediario-2d')
    }
  })

  it('mantém unidades pedagógicas no mesmo degrau', () => {
    expect(resolveBlockLevel('sz_js_storage_set')).toBe('intermediario-2d')
    expect(resolveBlockLevel('sz_val_storage_get')).toBe('intermediario-2d')
    expect(resolveBlockLevel('sz_js_on_submit')).toBe('intermediario-2d')
    expect(resolveBlockLevel('sz_js_event_method')).toBe('avancado-2d')
  })

  it('oferece cada evento junto do valor que seu texto ensina a usar', () => {
    for (const [eventType, companionType] of [
      ['sz_js_on_key', 'sz_val_event_key'],
      ['sz_js_on_click_anywhere', 'sz_val_event_pos'],
      ['sz_js_on_fullscreen_change', 'sz_val_is_fullscreen'],
    ] as const) {
      expect(resolveBlockLevel(companionType)).toBe(resolveBlockLevel(eventType))
    }
  })

  it('Mundo 3D = intermediario-3d (prefixo inteiro)', () => {
    expect(resolveBlockLevel('sz_w3d_spawn_car')).toBe('intermediario-3d')
    expect(resolveBlockLevel('sz_w3d_qualquer')).toBe('intermediario-3d')
  })

  it('Canvas 3D INTEIRO = avancado-3d (macros + técnicos; reclassificado 26/07)', () => {
    for (const type of [
      'sz_t3d_primitive',
      'sz_t3d_terrain',
      'sz_t3d_city',
      'sz_t3d_renderer_responsive',
      'sz_t3d_physics_body',
    ]) {
      expect(resolveBlockLevel(type)).toBe('avancado-3d')
    }
  })

  it('na unha em 2D (Canvas/HTML/CSS crus + expert) = avancado-2d', () => {
    for (const t of [
      'sz_js_class',
      'sz_val_object',
      'sz_adv_raw_js',
      'sz_gk_property_of', // acesso genérico ao modelo
      'sz_gk_define_mold', // pooling/data-driven
      'sz_gk_apply_gravity', // física manual do motor
      'sz_gk_board_create', // estrutura de grade genérica
      'sz_gk_pile_move_top', // manipulação de pilhas/listas
      'sz_gk_tween_property', // interpolação de propriedade arbitrária
      'sz_css_keyframes',
      'sz_canvas_arc', // Canvas 2D cru (26/07)
      'sz_canvas_begin_path',
      'sz_html_canvas', // criar a tela de desenho
      'sz_html_header', // tag semântica de layout
      'sz_html_form', // formulário
      'sz_css_display_flex', // flexbox cru
      'sz_math_trig',
    ]) {
      expect(resolveBlockLevel(t)).toBe('avancado-2d')
    }
  })

  it('Jogo 3D Avançado (g3k) = intermediario-3d (reclassificado 26/07 — abre no Arquiteto)', () => {
    expect(resolveBlockLevel('sz_g3k_fsm_state')).toBe('intermediario-3d')
  })

  it('Canvas 3D cru (three.js técnico, sz_t3d_) = avancado-3d', () => {
    expect(resolveBlockLevel('sz_t3d_new_scene')).toBe('avancado-3d')
  })
})

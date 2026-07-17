import { describe, expect, it } from 'bun:test'
import { BLOCK_CATALOG } from '../blockCatalog'
import { _LEVEL_SETS, resolveBlockLevel } from '../blockLevels'

const KNOWN = new Set(BLOCK_CATALOG.map((e) => e.type))
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

  it('o AVANCADO_3D só tem blocos 3D e o AVANCADO_2D nenhum (o split que protege o eixo)', () => {
    // Sem o split, o degrau "Avançado 2D" veria física/getters 3D — quebraria a
    // promessa do eixo. Trava a fronteira dos dois sets.
    expect([..._LEVEL_SETS.AVANCADO_3D].filter((t) => !t.startsWith('sz_g3d_'))).toEqual([])
    expect([..._LEVEL_SETS.AVANCADO_2D].filter((t) => t.startsWith('sz_g3d_'))).toEqual([])
    expect([..._LEVEL_SETS.INTERMEDIARIO_2D].filter((t) => t.startsWith('sz_g3d_'))).toEqual([])
  })
})

describe('resolveBlockLevel — amostras representativas', () => {
  it('facilitadores + kit essencial de lógica = iniciante-2d', () => {
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
      expect(resolveBlockLevel(t)).toBe('iniciante-2d')
    }
  })

  it('Jogo 3D facilitado = iniciante-3d (a porta de entrada do 3D, piso por prefixo)', () => {
    expect(resolveBlockLevel('sz_g3d_create_scene')).toBe('iniciante-3d')
    expect(resolveBlockLevel('sz_g3d_control_keys')).toBe('iniciante-3d')
  })

  it('programação real guiada + Jogo 2D Avançado = intermediario-2d', () => {
    for (const t of [
      'sz_js_while',
      'sz_js_for_range',
      'sz_math_arithmetic',
      'sz_js_function',
      'sz_g2d_sprite_vx', // getter de velocidade
      'sz_g2d_set_opacity',
      'sz_css_border',
      'sz_gk_qualquer_bloco', // prefixo gk inteiro
    ]) {
      expect(resolveBlockLevel(t)).toBe('intermediario-2d')
    }
  })

  it('Mundo 3D = intermediario-3d (prefixo inteiro)', () => {
    expect(resolveBlockLevel('sz_w3d_spawn_car')).toBe('intermediario-3d')
    expect(resolveBlockLevel('sz_w3d_qualquer')).toBe('intermediario-3d')
  })

  it('baixo nível / expert 2D = avancado-2d', () => {
    for (const t of [
      'sz_js_class',
      'sz_val_object',
      'sz_adv_raw_js',
      'sz_g2d_apply_velocity', // física manual
      'sz_css_keyframes',
      'sz_svg_path',
      'sz_math_trig',
    ]) {
      expect(resolveBlockLevel(t)).toBe('avancado-2d')
    }
  })

  it('engine 3D (getters/física g3d + g3k + three.js cru) = avancado-3d', () => {
    for (const t of ['sz_g3d_get_pos', 'sz_g3d_body', 'sz_g3k_fsm_state', 'sz_t3d_new_scene']) {
      expect(resolveBlockLevel(t)).toBe('avancado-3d')
    }
  })
})

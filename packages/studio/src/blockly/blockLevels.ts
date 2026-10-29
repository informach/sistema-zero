import type { BlockLevel } from '../core/levels'
import { HTML_ADVANCED_BLOCK_TYPES, HTML_INTERMEDIATE_BLOCK_TYPES } from '../html/catalog'
import { GAME_TWO_D_INITIAL_CORE } from '../official-extensions/game-2d/initialCore'
import { resolveProgrammingBlockLevel } from './programmingContract'

/**
 * Progressão dos blocos JavaScript. Jogo 2D pertence ao Iniciante 2D;
 * GAME_TWO_D_INITIAL_CORE é o percurso editorial de entrada (quatro exemplos,
 * Cadê Todo Mundo? e A Chave do Farol), e as aulas curam a oferta por allowBlocks.
 * Jogo 3D mantém núcleo iniciante/restante intermediário; Mundo 3D é intermediário
 * e Jogo 3D Avançado é avançado. Ferramentas de página e Canvas são a etapa direta.
 * Trocar o nível altera a oferta, nunca o registro de blocos nem os projetos salvos.
 */

const INTERMEDIARIO_2D: ReadonlySet<string> = new Set<string>([
  // ── CORE ──────────────────────────────────────────────────────────────────
  // SVG — os ELEMENTOS (círculo/retângulo/caminho/…) vêm do catálogo (level
  // `intermediario-2d`). O SVG é o único primitivo "cru" gentil: desenhar formas
  // declarando é o degrau intermediário, antes do Canvas imperativo no avançado.
  ...HTML_INTERMEDIATE_BLOCK_TYPES,
  // SVG — a 🎨 Aparência (setters por seletor que acompanham o desenho vetorial).
  'sz_css_fill',
  'sz_css_stroke',
  'sz_css_stroke_width',
  'sz_css_stroke_dasharray',
  'sz_css_stroke_linecap',
  'sz_css_text_anchor',
  // CSS puro NÃO tem degrau intermediário (26/07): ou é ESSENCIAL (iniciante-2d,
  // default) ou é PROFUNDO (avancado-2d). Canvas 2D é 100% avançado (prefixo).
  // A progressão de Programação vive integralmente em programmingContract.ts.
])

const AVANCADO_2D: ReadonlySet<string> = new Set<string>([
  // ── CORE ──────────────────────────────────────────────────────────────────
  ...HTML_ADVANCED_BLOCK_TYPES,
  // CSS PROFUNDO — todo o CSS que NÃO é essencial (26/07, "na unha por último").
  // O essencial (cor de fundo/texto, tamanho de fonte, padding/margem/borda,
  // largura/altura, centrar) fica no iniciante-2d (default). Aqui vem a mecânica
  // genérica (regra/declaração), tipografia fina, layout/flex, posicionamento e
  // os recursos avançados (variável/grid/transição/transform/3D/animação/responsivo).
  'sz_css_rule',
  'sz_css_decl',
  'sz_css_comment',
  'sz_css_gradient',
  'sz_css_shadow',
  'sz_css_max_width',
  'sz_css_width_percent',
  'sz_css_font_weight',
  'sz_css_text_align',
  'sz_css_text_transform',
  'sz_css_text_decoration',
  'sz_css_letter_spacing',
  'sz_css_google_font',
  'sz_css_use_font',
  'sz_css_position',
  'sz_css_offset',
  'sz_css_display',
  'sz_css_overflow',
  'sz_css_cursor',
  'sz_css_image_rendering',
  'sz_css_object_fit',
  'sz_css_opacity',
  'sz_css_z_index',
  'sz_css_background_image',
  'sz_css_display_flex',
  'sz_css_gap',
  'sz_css_justify',
  'sz_css_align',
  'sz_css_var',
  'sz_css_grid',
  'sz_css_grid_template',
  'sz_css_transition',
  'sz_css_hover',
  'sz_css_focus_visible',
  'sz_css_transform',
  'sz_css_perspective',
  'sz_css_keyframes',
  'sz_css_keyframes_steps',
  'sz_css_keyframe_step',
  'sz_css_apply_animation',
  'sz_css_media_query',
  'sz_css_reduce_motion',
  // Canvas 2D — TODA a categoria é avançado-2d (prefixo `sz_canvas_` na
  // resolveBlockLevel). Aqui só os blocos da categoria Canvas SEM esse prefixo:
  // criar a tela, imagem crua (new Image()/onload) e entrada bruta (teclado/mouse)
  // — o fluxo de desenhar/jogar na unha (os kits de jogo trazem os seus próprios).
  'sz_html_canvas',
  'sz_val_image',
  'sz_js_new_image',
  'sz_js_image_onload',
  'sz_js_image_onerror',
  'sz_input_key_pressed',
  'sz_input_pointer_x',
  'sz_input_pointer_y',
  'sz_input_pointer_down',
  'sz_som_tone',
  'sz_som_noise',
  // A progressão de Programação vive integralmente em programmingContract.ts.
  // Avançado — código cru
  'sz_adv_raw_html',
  'sz_adv_raw_css',
  'sz_adv_raw_js',
  // ── Jogo 2D Avançado — peças de MOTOR, não os kits prontos ───────────────
  // O caminho feliz e os kits de gênero continuam no intermediário. Este
  // recorte evita despejar pooling, estruturas e física manual junto dos
  // primeiros blocos de preparar/personagem/mapa.
  'sz_gk_property_of',
  'sz_gk_set_property',
  'sz_gk_set_hitbox',
  'sz_gk_set_hitbox_shape',
  'sz_gk_angle_of',
  'sz_gk_angle_to',
  'sz_gk_on_event',
  'sz_gk_emit',
  'sz_gk_define_mold',
  'sz_gk_spawn_from_mold',
  'sz_gk_spawn_named',
  'sz_gk_start_spawner',
  'sz_gk_stop_spawner',
  'sz_gk_for_each_active',
  'sz_gk_cull_offscreen',
  'sz_gk_recycle',
  'sz_gk_draw_active',
  'sz_gk_count_active',
  'sz_gk_nearest_active',
  'sz_gk_launch_towards',
  'sz_gk_move_by_velocity',
  'sz_gk_launch_to_point',
  'sz_gk_set_velocity_angle',
  'sz_gk_fan_shot',
  'sz_gk_tween_to',
  'sz_gk_camera_x',
  'sz_gk_camera_y',
  'sz_gk_set_tile_size',
  'sz_gk_tile_at',
  'sz_gk_set_tile_at',
  'sz_gk_break_tile_at',
  'sz_gk_create_empty_tilemap',
  'sz_gk_define_path',
  'sz_gk_path_point',
  'sz_gk_follow_path',
  'sz_gk_path_progress',
  'sz_gk_apply_gravity',
  'sz_gk_jump',
  'sz_gk_is_on_ground',
  'sz_gk_set_velocity',
  'sz_gk_velocity_of',
  'sz_gk_set_terminal_velocity',
  'sz_gk_thrust',
  'sz_gk_apply_friction',
  'sz_gk_bounce_on_edges',
  'sz_gk_paddle_bounce',
  'sz_gk_wrap_edges',
  'sz_gk_collide_tilemap',
  'sz_gk_collide_group',
  'sz_gk_overlap_groups',
  'sz_gk_board_create',
  'sz_gk_board_set',
  'sz_gk_board_get',
  'sz_gk_board_count',
  'sz_gk_board_in',
  'sz_gk_card',
  'sz_gk_pile_move_top',
  'sz_gk_pile_shuffle_from',
  'sz_gk_pile_top',
  'sz_gk_pile_size',
  'sz_gk_card_flip',
  'sz_gk_card_is_up',
  'sz_gk_card_face',
  'sz_gk_hand_draw',
  'sz_gk_card_at',
  'sz_gk_every_seconds',
  'sz_gk_cooldown_ready',
  'sz_gk_define_region',
  'sz_gk_is_inside',
  'sz_gk_overlap_percent',
  'sz_gk_chance',
  'sz_gk_distance_between',
  'sz_gk_point_in',
  'sz_gk_random_active',
  'sz_gk_pick_active',
  'sz_gk_opacity_of',
  'sz_gk_fade_to',
  'sz_gk_tween_property',
])

// O Jogo 3D tem a escada própria (`INICIANTE_3D_G3D` + prefixo), abaixo.
const AVANCADO_3D: ReadonlySet<string> = new Set<string>()

// Canvas 3D (three.js cru) é INTEIRAMENTE avançado-3d (reclassificado 26/07 —
// "na unha por último"): TODO `sz_t3d_*` cai no fallback de prefixo abaixo. Este
// conjunto ficou vazio de propósito (nenhum bloco 3D sobe só até o intermediário).
const INTERMEDIARIO_3D: ReadonlySet<string> = new Set<string>()

// Posição dos kits 3D na escada: uma extensão por degrau (review 3D, 10/2026).
// Jogo 3D = iniciante-3d só no núcleo (abaixo); o resto do `sz_g3d_*` sobe um degrau.
const G3D_LEVEL: BlockLevel = 'intermediario-3d'
const W3D_LEVEL: BlockLevel = 'intermediario-3d'
const G3K_LEVEL: BlockLevel = 'avancado-3d'
/**
 * O NÚCLEO do Jogo 3D (`iniciante-3d`): o bastante para um jogo completo de criar,
 * mover, encostar, multiplicar e terminar. Todo outro `sz_g3d_*` é `intermediario-3d`.
 * ⚠️ Mexer aqui muda o degrau do bloco nas aulas curadas por nível e no Zappy/Pensa.
 */
const INICIANTE_3D_G3D: ReadonlySet<string> = new Set<string>([
  'sz_g3d_top_down',
  'sz_g3d_walk_area',
  // A pedra e os coqueiros da Ilha (29/10/2026): o "Fazer andar com as setas" não os atravessa.
  'sz_g3d_set_solid',
  'sz_g3d_walk_animations',
  'sz_g3d_frame_scene',
  'sz_g3d_on_touch',
  // Ações diretas, como esconder um sprite e aproximá-lo de um destino no Jogo 2D.
  'sz_g3d_animation_done',
  'sz_g3d_set_visible',
  'sz_g3d_move_towards',
  'sz_g3d_create_fullscreen_scene',
  'sz_g3d_animate',
  'sz_g3d_sky_photo',
  'sz_g3d_create_box',
  'sz_g3d_create_sphere',
  'sz_g3d_create_block',
  'sz_g3d_create_model_file',
  'sz_g3d_set_position',
  'sz_g3d_set_color',
  'sz_g3d_remove_object',
  'sz_g3d_control_keys',
  'sz_g3d_jump',
  'sz_g3d_apply_gravity',
  'sz_g3d_spin',
  'sz_g3d_key_down',
  'sz_g3d_collides',
  'sz_g3d_hit_any',
  'sz_g3d_create_group',
  'sz_g3d_spawn_copy',
  'sz_g3d_update_group_no_gravity',
  'sz_g3d_prune_offscreen',
  'sz_g3d_every_seconds',
  'sz_g3d_play_effect',
  // O modelo do Molda dança: tocar a animação é núcleo (parar e "terminou?" sobem um degrau).
  'sz_g3d_play_animation',
  'sz_g3d_camera_mode',
  // Regras de jogo (game3dRules): placar, vida, telas, recomeçar, tempo, sorteio e os "Quando…".
  'sz_g3d_hud_text',
  'sz_g3d_add_score',
  'sz_g3d_score',
  'sz_g3d_set_life',
  'sz_g3d_hurt',
  'sz_g3d_on_life_over',
  'sz_g3d_set_screen_text',
  'sz_g3d_end_game',
  'sz_g3d_restart',
  'sz_g3d_after_seconds',
  // A contagem que APARECE na tela (o Pega-Estrelas conta 30 s com ela).
  'sz_g3d_start_timer',
  'sz_g3d_on_timer_end',
  'sz_g3d_time_left',
  'sz_g3d_random_between',
  'sz_g3d_on_key',
  'sz_g3d_on_click_object',
  'sz_g3d_on_canvas_click',
  'sz_g3d_on_touch_group',
  'sz_g3d_camera_shake',
])
/**
 * Degrau de um bloco pelo `type`. Regras invariantes por prefixo vêm primeiro,
 * seguidas dos sets de exceções e dos demais defaults; todo o resto
 * (facilitadores + kit essencial de lógica) é iniciante-2d.
 */
export function resolveBlockLevel(type: string): BlockLevel {
  if (type.startsWith('sz_g2d_')) {
    return 'iniciante-2d'
  }
  if (type.startsWith('sz_g3d_')) return INICIANTE_3D_G3D.has(type) ? 'iniciante-3d' : G3D_LEVEL
  const programmingLevel = resolveProgrammingBlockLevel(type)
  if (programmingLevel) return programmingLevel
  // Canvas 2D "na mão": TODA a categoria (`sz_canvas_*` — desenho imperativo,
  // traçado, transform, ajustes) é avançado-2d (26/07). Os blocos da categoria
  // Canvas sem esse prefixo (criar tela/imagem/entrada) estão no AVANCADO_2D.
  if (type.startsWith('sz_canvas_')) return 'avancado-2d'
  if (AVANCADO_3D.has(type)) return 'avancado-3d'
  if (AVANCADO_2D.has(type)) return 'avancado-2d'
  if (INTERMEDIARIO_3D.has(type)) return 'intermediario-3d'
  if (INTERMEDIARIO_2D.has(type)) return 'intermediario-2d'
  // Jogo 2D Avançado: o caminho feliz e os kits são intermediário-2d; as peças
  // internas de motor já foram separadas no AVANCADO_2D acima.
  if (type.startsWith('sz_gk_')) return 'intermediario-2d'
  // Jogo 3D Avançado: TODOS avançado-3d (review 3D, 10/2026 — uma extensão por
  // degrau, acima do Mundo 3D). Espelha o `minLevel` da extensão em
  // official-extensions/game-3d-advanced/index.ts.
  if (type.startsWith('sz_g3k_')) return G3K_LEVEL
  // Canvas 3D (three.js cru, núcleo): a categoria INTEIRA é avançado-3d — do
  // primitivo às receitas "mágicas" (reclassificado 26/07, "na unha por último").
  if (type.startsWith('sz_t3d_')) return 'avancado-3d'
  // Mundo 3D: TODOS intermediário-3d (decisão de produto — blocos "mágicos" de
  // alto nível, 1 bloco = 1 resultado; um degrau acima da entrada do 3D).
  if (type.startsWith('sz_w3d_')) return W3D_LEVEL
  return 'iniciante-2d'
}

/** Exportados só para o teste de conformidade (completude/sem sobreposição/sem typo). */
export const _LEVEL_SETS = {
  INICIANTE_3D_G3D,
  INICIANTE_2D_G2D: GAME_TWO_D_INITIAL_CORE,
  INTERMEDIARIO_2D,
  INTERMEDIARIO_3D,
  AVANCADO_2D,
  AVANCADO_3D,
} as const

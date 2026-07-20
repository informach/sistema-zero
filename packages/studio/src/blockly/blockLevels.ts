import type { BlockLevel } from '#core'
import { HTML_ADVANCED_BLOCK_TYPES, HTML_INTERMEDIATE_BLOCK_TYPES } from '../html/catalog'
import { CANVAS3D_INTERMEDIATE_BLOCK_TYPES } from '../three/canvas3dContract'
import { resolveProgrammingBlockLevel } from './programmingContract'

/**
 * Nível de dificuldade POR BLOCO (curadoria da paleta do Estúdio) — a fonte da
 * verdade da progressão. Reforma 2D/3D (07/2026): a escada virou 6 degraus
 * (dificuldade × eixo, na ordem ini-2d < ini-3d < int-2d < int-3d < av-2d <
 * av-3d — a MESMA da carreira do aluno). Filosofia (decisão da usuária):
 * - **Iniciante 2D** = TODOS os blocos do Jogo 2D (`sz_g2d_*`) + facilitadores
 *   e um kit essencial de lógica. As aulas filtram o subconjunto de Jogo 2D que
 *   aparece; o nível não esconde peças da extensão.
 * - **Iniciante 3D** = a PORTA DE ENTRADA do 3D: todos os blocos do Jogo 3D
 *   (`sz_g3d_*`) — a aula continua escolhendo quais deles revelar.
 * - **Intermediário 2D** = programação "real" guiada (variáveis avulsas, laços,
 *   funções, getters/setters, desenho manual, matemática básica) + caminho feliz
 *   e kits de gênero do Jogo 2D Avançado.
 * - **Intermediário 3D** = Mundo 3D (mundo aberto dirigível, blocos "mágicos").
 * - **Avançado 2D** = baixo nível / expert em 2D (classes/OOP, objetos, código
 *   cru, física manual, trigonometria, vetores, dados e peças internas de motor).
 * - **Avançado 3D** = Jogo 3D Avançado (`sz_g3k_*`) e as peças técnicas do
 *   Canvas 3D; seus facilitadores visuais entram no Intermediário 3D.
 *
 * É CUMULATIVO na escada (cada degrau inclui os anteriores — o gate usa
 * `isLevelWithin`; note que os degraus "2D" a partir do int-2d INCLUEM o
 * iniciante-3d abaixo deles: a escada é UMA SÓ, não duas trilhas). Só listamos
 * as EXCEÇÕES ao default iniciante-2d; a completude (todo bloco conhecido está
 * no tier certo) é travada por `blockLevels.test.ts`.
 *
 * ⚠️ Os frames (🗂️ Áreas do projeto) NÃO entram aqui — são sempre visíveis.
 * ⚠️ Adicionou um bloco? Todo `sz_g2d_*` fica no iniciante-2d. Para o core,
 * decida se entra nos conjuntos intermediário/avançado; senão os defaults por
 * prefixo decidem (g3d→ini-3d, gk→int-2d, w3d→int-3d,
 * g3k/t3d→av-3d, resto→ini-2d) — o teste de conformidade cobra.
 */

const INTERMEDIARIO_2D: ReadonlySet<string> = new Set<string>([
  // ── CORE ──────────────────────────────────────────────────────────────────
  // HTML — containers estruturais (só "aparecem" com CSS) + fragmento solto.
  // Lista/formulário ficam inteiros no iniciante; o catálogo é a fonte única.
  ...HTML_INTERMEDIATE_BLOCK_TYPES,
  // SVG — a 🎨 Aparência (setters por seletor); os elementos vêm do catálogo.
  'sz_css_fill',
  'sz_css_stroke',
  'sz_css_stroke_width',
  'sz_css_stroke_dasharray',
  'sz_css_stroke_linecap',
  'sz_css_text_anchor',
  // CSS — setters por seletor (o dia a dia do estilo)
  'sz_css_rule',
  'sz_css_decl',
  'sz_css_comment',
  'sz_css_gradient',
  'sz_css_font_weight',
  'sz_css_text_align',
  'sz_css_text_transform',
  'sz_css_text_decoration',
  'sz_css_letter_spacing',
  'sz_css_max_width',
  'sz_css_width_percent',
  'sz_css_shadow',
  'sz_css_display_flex',
  'sz_css_gap',
  'sz_css_justify',
  'sz_css_align',
  'sz_css_google_font',
  'sz_css_use_font',
  // CSS para jogos/posicionamento — útil, mas vem depois de cor, letra e caixa.
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
  // Canvas — ajustes/texto/entrada + laço de animação (desenho guiado).
  // Preparar a tela e escolher a cor ficam no iniciante: sem os dois, as formas
  // prontas daquele degrau não formavam um primeiro projeto executável.
  'sz_canvas_set_size',
  'sz_canvas_clear',
  'sz_canvas_clear_rect',
  'sz_canvas_stroke_style',
  'sz_canvas_line_width',
  'sz_canvas_global_alpha',
  'sz_canvas_font',
  'sz_canvas_text_align',
  'sz_canvas_text_baseline',
  'sz_canvas_measure_text',
  'sz_canvas_anim_loop',
  'sz_canvas_cancel_anim',
  'sz_canvas_arc_slice',
  'sz_input_key_pressed',
  'sz_input_pointer_x',
  'sz_input_pointer_y',
  // A progressão de Programação vive integralmente em programmingContract.ts.
])

const AVANCADO_2D: ReadonlySet<string> = new Set<string>([
  // ── CORE ──────────────────────────────────────────────────────────────────
  ...HTML_ADVANCED_BLOCK_TYPES,
  // CSS — recursos avançados (variável, grid, transição, transform, 3D, animação, responsivo)
  'sz_css_var',
  'sz_css_grid',
  'sz_css_grid_template',
  'sz_css_transition',
  'sz_css_hover',
  'sz_css_transform',
  'sz_css_perspective',
  'sz_css_keyframes',
  'sz_css_keyframes_steps',
  'sz_css_keyframe_step',
  'sz_css_apply_animation',
  'sz_css_media_query',
  // Canvas — traçado "na mão", transformações, imagem crua, gradiente/sombra/tracejado
  'sz_canvas_gradient',
  'sz_canvas_shadow',
  'sz_canvas_line_dash',
  'sz_canvas_begin_path',
  'sz_canvas_move_to',
  'sz_canvas_line_to',
  'sz_canvas_quadratic_curve',
  'sz_canvas_bezier_curve',
  'sz_canvas_arc_to',
  'sz_canvas_rect',
  'sz_canvas_close_path',
  'sz_canvas_stroke',
  'sz_canvas_fill',
  'sz_canvas_clip',
  'sz_canvas_point_in_path',
  'sz_canvas_point_in_stroke',
  'sz_canvas_save',
  'sz_canvas_restore',
  'sz_canvas_translate',
  'sz_canvas_rotate',
  'sz_canvas_scale',
  // Versões manuais do ciclo de animação. O bloco guiado "A cada quadro" já
  // cobre o caminho infantil; estas peças expõem a mecânica de baixo nível.
  'sz_canvas_request_frame',
  'sz_canvas_request_frame_do',
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

// Jogo 3D é inteiramente iniciante-3d. A divulgação progressiva é feita pela
// curadoria de cada aula (`allowBlocks`), portanto nenhum bloco `sz_g3d_*` sobe
// de nível só por expor ajustes finos ou física.
const AVANCADO_3D: ReadonlySet<string> = new Set<string>()

// Canvas 3D de alto nível: receitas completas e verbos visuais podem aparecer
// junto do Mundo 3D. Construtores/imports/matrizes continuam no avançado-3d.
const INTERMEDIARIO_3D: ReadonlySet<string> = new Set(CANVAS3D_INTERMEDIATE_BLOCK_TYPES)

// Posição dos kits 3D dirigíveis na escada (decisão da usuária 17/07) — parâmetros
// de 1 linha p/ ajuste fino futuro.
const G3D_FLOOR: BlockLevel = 'iniciante-3d'
const W3D_LEVEL: BlockLevel = 'intermediario-3d'

/**
 * Degrau de um bloco pelo `type`. Regras invariantes por prefixo vêm primeiro,
 * seguidas dos sets de exceções e dos demais defaults; todo o resto
 * (facilitadores + kit essencial de lógica) é iniciante-2d.
 */
export function resolveBlockLevel(type: string): BlockLevel {
  // A aula, não o nível global, escolhe quais peças do Jogo 2D básico aparecem.
  if (type.startsWith('sz_g2d_')) return 'iniciante-2d'
  if (type.startsWith('sz_g3d_')) return G3D_FLOOR
  const programmingLevel = resolveProgrammingBlockLevel(type)
  if (programmingLevel) return programmingLevel
  if (AVANCADO_3D.has(type)) return 'avancado-3d'
  if (AVANCADO_2D.has(type)) return 'avancado-2d'
  if (INTERMEDIARIO_3D.has(type)) return 'intermediario-3d'
  if (INTERMEDIARIO_2D.has(type)) return 'intermediario-2d'
  // Jogo 3D é a PORTA DE ENTRADA do 3D: piso iniciante-3d por prefixo — os
  // extensão inteira cai aqui; a aula decide o subconjunto visível.
  // Jogo 2D Avançado: o caminho feliz e os kits são intermediário-2d; as peças
  // internas de motor já foram separadas no AVANCADO_2D acima.
  if (type.startsWith('sz_gk_')) return 'intermediario-2d'
  // Jogo 3D Avançado: TODOS avançado-3d (decisão de produto — é a base de
  // engine profissional: FSM por entidade, pooling, grade espacial).
  if (type.startsWith('sz_g3k_')) return 'avancado-3d'
  // Canvas 3D (three.js cru, núcleo): o fallback guarda as peças técnicas no
  // avançado; os facilitadores visuais foram listados no intermediário 3D.
  if (type.startsWith('sz_t3d_')) return 'avancado-3d'
  // Mundo 3D: TODOS intermediário-3d (decisão de produto — blocos "mágicos" de
  // alto nível, 1 bloco = 1 resultado; um degrau acima da entrada do 3D).
  if (type.startsWith('sz_w3d_')) return W3D_LEVEL
  return 'iniciante-2d'
}

/** Exportados só para o teste de conformidade (completude/sem sobreposição/sem typo). */
export const _LEVEL_SETS = {
  INTERMEDIARIO_2D,
  INTERMEDIARIO_3D,
  AVANCADO_2D,
  AVANCADO_3D,
} as const

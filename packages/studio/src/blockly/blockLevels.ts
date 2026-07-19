import type { BlockLevel } from '#core'
import { HTML_ADVANCED_BLOCK_TYPES, HTML_INTERMEDIATE_BLOCK_TYPES } from '../html/catalog'

/**
 * Nível de dificuldade POR BLOCO (curadoria da paleta do Estúdio) — a fonte da
 * verdade da progressão. Reforma 2D/3D (07/2026): a escada virou 6 degraus
 * (dificuldade × eixo, na ordem ini-2d < ini-3d < int-2d < int-3d < av-2d <
 * av-3d — a MESMA da carreira do aluno). Filosofia (decisão da usuária):
 * - **Iniciante 2D** = FACILITADORES (blocos "de um toque" com resultado visual) +
 *   um kit essencial de lógica (Se, variáveis, repetir, comparar, valores básicos).
 *   É o DEFAULT: todo bloco NÃO listado abaixo é iniciante-2d.
 * - **Iniciante 3D** = a PORTA DE ENTRADA do 3D: todos os blocos do Jogo 3D
 *   (`sz_g3d_*`) — a aula continua escolhendo quais deles revelar.
 * - **Intermediário 2D** = programação "real" guiada (variáveis avulsas, laços,
 *   funções, getters/setters, desenho manual, matemática básica) + caminho feliz
 *   e kits de gênero do Jogo 2D Avançado.
 * - **Intermediário 3D** = Mundo 3D (mundo aberto dirigível, blocos "mágicos").
 * - **Avançado 2D** = baixo nível / expert em 2D (classes/OOP, objetos, código
 *   cru, física manual, trigonometria, vetores, dados e peças internas de motor).
 * - **Avançado 3D** = Jogo 3D Avançado (`sz_g3k_*`) e Canvas 3D three.js cru
 *   (`sz_t3d_*`).
 *
 * É CUMULATIVO na escada (cada degrau inclui os anteriores — o gate usa
 * `isLevelWithin`; note que os degraus "2D" a partir do int-2d INCLUEM o
 * iniciante-3d abaixo deles: a escada é UMA SÓ, não duas trilhas). Só listamos
 * as EXCEÇÕES ao default iniciante-2d; a completude (todo bloco conhecido está
 * no tier certo) é travada por `blockLevels.test.ts`.
 *
 * ⚠️ Os frames (🗂️ Áreas do projeto) NÃO entram aqui — são sempre visíveis.
 * ⚠️ Adicionou um bloco? Decida o degrau: core/g2d intermediário → `INTERMEDIARIO_2D`;
 * core/g2d avançado → `AVANCADO_2D`; senão os
 * defaults por prefixo decidem (g3d→ini-3d, gk→int-2d, w3d→int-3d, g3k/t3d→av-3d,
 * resto→ini-2d) — o teste de conformidade cobra.
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
  // DOM — evento por nome + busca/leitura/escrita de elementos (getters/setters)
  'sz_js_on_event_named',
  'sz_val_is_fullscreen',
  'sz_js_get_element_by_id',
  'sz_val_get_element',
  'sz_val_query_select',
  'sz_js_query_selector',
  'sz_js_set_property',
  'sz_js_set_style',
  'sz_js_set_attribute',
  'sz_js_set_property_var',
  'sz_js_get_property',
  'sz_js_get_attribute',
  'sz_js_class_op',
  'sz_js_create_element',
  'sz_js_append_child',
  // Canvas — preparo/pincel/texto/entrada + laço de animação (desenho guiado)
  'sz_canvas_setup',
  'sz_canvas_set_size',
  'sz_canvas_clear',
  'sz_canvas_clear_rect',
  'sz_canvas_fill_style',
  'sz_canvas_stroke_style',
  'sz_canvas_line_width',
  'sz_canvas_global_alpha',
  'sz_canvas_font',
  'sz_canvas_text_align',
  'sz_canvas_text_baseline',
  'sz_canvas_measure_text',
  'sz_canvas_anim_loop',
  'sz_canvas_cancel_anim',
  'sz_canvas_request_frame',
  'sz_canvas_request_frame_do',
  'sz_canvas_keyboard',
  'sz_input_key_pressed',
  'sz_input_pointer_x',
  'sz_input_pointer_y',
  // Valores — além do kit essencial iniciante
  'sz_val_color_alpha',
  'sz_val_null',
  'sz_val_ternary',
  'sz_val_window_width',
  'sz_val_window_height',
  'sz_val_canvas_width',
  'sz_val_canvas_height',
  'sz_val_random_float',
  'sz_val_date_part',
  'sz_val_event_pos',
  'sz_val_event_key',
  'sz_val_math_pi',
  'sz_val_color_hsl',
  'sz_val_this',
  // Matemática básica
  'sz_math_arithmetic',
  'sz_math_function',
  'sz_math_minmax',
  // JS — variável avulsa (let vazio) + laços "de verdade" + listas
  'sz_js_var_declare',
  'sz_js_while',
  'sz_js_do_while',
  'sz_js_break',
  'sz_js_continue',
  'sz_js_for_of',
  'sz_js_for_range',
  'sz_js_for_each',
  'sz_js_array_push',
  'sz_js_array_remove',
  'sz_js_array_splice',
  // Funções
  'sz_js_function',
  'sz_js_call_function',
  'sz_val_call_function',
  // ── EXTENSÃO Jogo 2D — getters/setters/grupos ──────────────────────────────
  // NOTA: os grupos básicos (criar/atualizar/desenhar/tirar-da-tela/tirar-do-grupo),
  // os getters de posição (posição x/y, centro x/y), o aleatório NA TELA (x/y) e o
  // "Limpar a tela" ficam no INICIANTE — são o que o 1º jogo (Nave contra Asteroides)
  // usa; sem eles o iniciante não monta um shooter simples de ponta a ponta.
  // "Mudar a posição/velocidade do sprite" também são INICIANTE (verbos básicos de
  // "fazer o boneco andar" — moram na 1ª categoria 🎮 Sprites; escondê-los deixava
  // o iniciante sem os comandos mais elementares).
  'sz_g2d_sprite_w',
  'sz_g2d_sprite_h',
  'sz_g2d_sprite_vx',
  'sz_g2d_sprite_vy',
  'sz_g2d_sprite_speed',
  'sz_g2d_is_moving',
  'sz_g2d_is_moving_h',
  'sz_g2d_is_moving_v',
  'sz_g2d_for_each_in_group',
  'sz_g2d_count_group',
  'sz_g2d_clear_group',
  'sz_g2d_bring_to_front',
  'sz_g2d_send_to_back',
  'sz_g2d_sprite_angle',
  'sz_g2d_point_sprite',
  // "Girar o sprite N graus" coabita com "Apontar para X graus" (mexer no ângulo
  // do desenho não é mais difícil que apontar; um sem o outro confundia).
  'sz_g2d_rotate_sprite',
  'sz_g2d_set_opacity',
  'sz_g2d_set_size',
  'sz_g2d_scale_sprite',
  'sz_g2d_tile_at',
  'sz_g2d_set_camera',
  'sz_g2d_camera_x',
  'sz_g2d_camera_y',
  'sz_g2d_get_health',
  // NOTA: "Carregar folha de quadros" é INICIANTE — é o ÚNICO declarador de folha,
  // e os blocos de animar (Animar/Estado/Auto-animar) já são iniciante; sem ele a
  // subcat 🎬 Animação abriria com o seletor de folha vazio no degrau iniciante.
  'sz_g2d_angle_to',
  'sz_g2d_distance',
  'sz_g2d_random_between',
  'sz_g2d_random_chance',
  // Inimigos: o ajuste fino por parâmetro é sintonia, não o caminho feliz.
  'sz_g2d_enemy_type_param',
  // ...e o dano de contato CRU é um getter (como "a vida do sprite"): o caminho
  // feliz é "Machucar o sprite com o dano", que já usa o valor por dentro.
  'sz_g2d_enemy_damage',
])

const AVANCADO_2D: ReadonlySet<string> = new Set<string>([
  // ── CORE ──────────────────────────────────────────────────────────────────
  ...HTML_ADVANCED_BLOCK_TYPES,
  // ⏳ Assíncrono — promessas/await (concorrência de verdade)
  'sz_js_await',
  'sz_val_new_promise',
  'sz_val_promise_all',
  'sz_js_set_timeout_call',
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
  // DOM — baixo nível
  'sz_js_event_method',
  'sz_js_query_selector_all',
  'sz_js_set_style_text',
  'sz_js_set_dataset',
  'sz_js_create_element_ns',
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
  'sz_val_image',
  'sz_js_new_image',
  'sz_js_image_onload',
  'sz_js_image_onerror',
  'sz_js_element_onclick',
  // Valores — dados/estruturas + baixo nível
  'sz_val_device_pixel_ratio',
  'sz_val_system_dark',
  'sz_val_perf_now',
  'sz_val_vector2d',
  'sz_val_vector3d',
  'sz_val_array',
  'sz_val_array_length',
  'sz_val_array_map',
  'sz_val_array_index',
  'sz_val_array_last',
  'sz_val_array_find',
  'sz_val_array_filter',
  'sz_val_concat_arrays',
  'sz_val_shuffle',
  'sz_val_join',
  'sz_val_dataset',
  'sz_val_storage_get',
  'sz_val_class_contains',
  // Matemática — trigonometria / vetorial
  'sz_math_trig',
  'sz_math_atan2',
  'sz_val_distance',
  'sz_math_hypot',
  'sz_math_angle_convert',
  // JS — controle de fluxo avançado + dados + web
  'sz_js_switch',
  'sz_js_case',
  'sz_js_try_catch',
  'sz_js_throw',
  'sz_js_object_assign',
  'sz_js_fetch_json',
  // Classes (OOP) — todos
  'sz_js_class',
  'sz_js_constructor',
  'sz_js_class_method',
  'sz_js_return',
  'sz_js_return_void',
  'sz_js_new_var',
  'sz_js_call_method',
  'sz_val_call_method',
  'sz_val_new',
  'sz_js_super_ctor',
  'sz_js_super_method',
  'sz_js_set_this_prop',
  'sz_js_set_prop',
  'sz_val_this_prop',
  'sz_val_get_prop',
  'sz_val_arg',
  // Objetos — todos
  'sz_val_object',
  'sz_val_object_op',
  'sz_val_index_get',
  'sz_val_member_get',
  'sz_val_member_get_optional',
  'sz_js_member_set',
  'sz_js_index_set',
  'sz_val_method_on',
  'sz_js_method_on',
  // Avançado — código cru
  'sz_adv_raw_html',
  'sz_adv_raw_css',
  'sz_adv_raw_js',
  // ── EXTENSÃO Jogo 2D — física manual / baixo nível ─────────────────────────
  'sz_g2d_apply_velocity',
  'sz_g2d_set_gravity',
  'sz_g2d_thrust',
  'sz_g2d_apply_friction',
  'sz_g2d_collides',
  'sz_g2d_circle_collides',
  'sz_g2d_draw_frame',
  'sz_g2d_prune_old',
  'sz_g2d_draw_hitbox',
  'sz_g2d_show_fps',
  'sz_g2d_play_sound',
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
const INTERMEDIARIO_3D: ReadonlySet<string> = new Set<string>([
  'sz_t3d_set_position',
  'sz_t3d_set_rotation',
  'sz_t3d_rotate_axis',
  'sz_t3d_set_scale',
  'sz_t3d_look_at',
  'sz_t3d_lerp_position',
  'sz_t3d_set_visible',
  'sz_t3d_add_to',
  'sz_t3d_set_color',
  'sz_t3d_set_background',
  'sz_t3d_set_fog',
  'sz_t3d_set_shadow',
  'sz_t3d_set_intensity',
  'sz_t3d_renderer_size',
  'sz_t3d_renderer_config',
  'sz_t3d_renderer_responsive',
  'sz_t3d_enable_shadows',
  'sz_t3d_mount_renderer',
  'sz_t3d_render',
  'sz_t3d_load_model',
  'sz_t3d_load_environment',
  'sz_t3d_load_sound',
  'sz_t3d_traverse',
  'sz_t3d_dispose_object',
  'sz_t3d_particles',
  'sz_t3d_water',
  'sz_t3d_water_wave',
  'sz_t3d_grass',
  'sz_t3d_grass_wave',
  'sz_t3d_sign',
  'sz_t3d_primitive',
  'sz_t3d_terrain',
  'sz_t3d_road',
  'sz_t3d_building',
  'sz_t3d_city',
  'sz_t3d_physics_setup',
  'sz_t3d_physics_static_box',
  'sz_t3d_physics_static_sphere',
  'sz_t3d_physics_static_object',
  'sz_t3d_physics_static_city',
  'sz_t3d_physics_body',
  'sz_t3d_physics_move',
  'sz_t3d_physics_jump',
  'sz_t3d_physics_trigger',
  'sz_t3d_physics_step',
  'sz_t3d_physics_velocity',
  'sz_t3d_physics_impulse',
  'sz_t3d_physics_teleport',
  'sz_t3d_physics_remove',
  'sz_t3d_physics_clear',
  'sz_t3d_physics_on_collision',
  'sz_t3d_physics_on_trigger',
  'sz_t3d_physics_raycast',
  'sz_t3d_physics_body_state',
  'sz_t3d_physics_stats',
])

// Posição dos kits 3D dirigíveis na escada (decisão da usuária 17/07) — parâmetros
// de 1 linha p/ ajuste fino futuro.
const G3D_FLOOR: BlockLevel = 'iniciante-3d'
const W3D_LEVEL: BlockLevel = 'intermediario-3d'

/**
 * Degrau de um bloco pelo `type`. Sets (exceções nomeadas) primeiro, depois os
 * defaults por prefixo de extensão; todo o resto (facilitadores + kit essencial
 * de lógica) é iniciante-2d.
 */
export function resolveBlockLevel(type: string): BlockLevel {
  if (type.startsWith('sz_g3d_')) return G3D_FLOOR
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
  // Canvas 3D (three.js cru, núcleo): TODOS avançado-3d — é programar a lib de
  // verdade na unha (construtores, cadeias de método, matemática de vetores).
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

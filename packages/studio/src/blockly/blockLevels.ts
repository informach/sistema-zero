import type { BlockLevel } from '#core'

/**
 * Nível de dificuldade POR BLOCO (curadoria da paleta do Estúdio) — a fonte da
 * verdade da progressão. Filosofia (decisão da usuária):
 * - **Iniciante** = FACILITADORES (blocos "de um toque" com resultado visual) +
 *   um kit essencial de lógica (Se, variáveis, repetir, comparar, valores básicos).
 *   É o DEFAULT: todo bloco NÃO listado abaixo é iniciante.
 * - **Intermediário** = programação "real" guiada (variáveis avulsas, laços,
 *   funções, getters/setters, desenho manual, matemática básica).
 * - **Avançado** = baixo nível / expert (classes/OOP, objetos, código cru, física
 *   manual, trigonometria, vetores, dados, physics 3D).
 *
 * É CUMULATIVO (intermediário inclui iniciante; avançado inclui tudo) — o gate
 * usa `isLevelWithin`. Só listamos as EXCEÇÕES ao default iniciante; a completude
 * (todo bloco conhecido está no tier certo) é travada por `blockLevels.test.ts`.
 *
 * ⚠️ Os frames (🗂️ Áreas do projeto) NÃO entram aqui — são sempre visíveis.
 * ⚠️ Jogo 3D nunca é iniciante: `resolveBlockLevel` dá piso INTERMEDIÁRIO a todo
 * `sz_g3d_*` por prefixo (os 3D AVANÇADOS listados no set sobem para avançado).
 * ⚠️ Adicionou um bloco? Decida o nível: se for avançado/intermediário, liste
 * aqui (senão vira iniciante por default) — o teste de conformidade cobra.
 */

const INTERMEDIARIO: ReadonlySet<string> = new Set<string>([
  // ── CORE ──────────────────────────────────────────────────────────────────
  // HTML — containers estruturais (só "aparecem" com CSS) + fragmento solto
  'sz_html_div',
  'sz_html_header',
  'sz_html_nav',
  'sz_html_section',
  'sz_html_main',
  'sz_html_footer',
  'sz_html_ul',
  'sz_html_form',
  'sz_html_text',
  'sz_html_comment',
  // SVG — container + reuso + a 🎨 Aparência (setters por seletor)
  'sz_html_svg',
  'sz_svg_group',
  'sz_svg_use',
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
  'sz_css_text_color',
  'sz_css_background_color',
  'sz_css_gradient',
  'sz_css_font_size',
  'sz_css_font_weight',
  'sz_css_text_align',
  'sz_css_text_transform',
  'sz_css_text_decoration',
  'sz_css_letter_spacing',
  'sz_css_width',
  'sz_css_height',
  'sz_css_max_width',
  'sz_css_width_percent',
  'sz_css_padding',
  'sz_css_margin',
  'sz_css_border',
  'sz_css_border_radius',
  'sz_css_shadow',
  'sz_css_display_flex',
  'sz_css_gap',
  'sz_css_justify',
  'sz_css_align',
  'sz_css_google_font',
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
  'sz_g2d_set_position',
  'sz_g2d_set_velocity',
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
  'sz_g2d_set_opacity',
  'sz_g2d_set_size',
  'sz_g2d_scale_sprite',
  'sz_g2d_tile_at',
  'sz_g2d_set_camera',
  'sz_g2d_camera_x',
  'sz_g2d_camera_y',
  'sz_g2d_get_health',
  'sz_g2d_load_spritesheet',
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

const AVANCADO: ReadonlySet<string> = new Set<string>([
  // ── CORE ──────────────────────────────────────────────────────────────────
  // ⏳ Assíncrono — promessas/await (concorrência de verdade)
  'sz_js_await',
  'sz_val_new_promise',
  'sz_val_promise_all',
  'sz_js_set_timeout_call',
  // SVG — caminho (sintaxe "d")
  'sz_svg_path',
  // CSS — recursos avançados (variável, grid, transição, transform, 3D, animação, responsivo)
  'sz_css_var',
  'sz_css_grid',
  'sz_css_grid_template',
  'sz_css_transition',
  'sz_css_transform',
  'sz_css_perspective',
  'sz_css_keyframes',
  'sz_css_keyframes_steps',
  'sz_css_keyframe_step',
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
  'sz_g2d_rotate_sprite',
  'sz_g2d_collides',
  'sz_g2d_circle_collides',
  'sz_g2d_draw_frame',
  'sz_g2d_prune_old',
  'sz_g2d_draw_hitbox',
  'sz_g2d_show_fps',
  'sz_g2d_play_sound',
  // ── EXTENSÃO Jogo 3D — getters/manual/física (os facilitadores 3D caem no
  // default iniciante, mas a extensão só aparece do intermediário pra cima) ────
  'sz_g3d_set_camera',
  'sz_g3d_set_position',
  'sz_g3d_set_rotation',
  'sz_g3d_set_scale',
  'sz_g3d_set_velocity',
  'sz_g3d_get_pos',
  'sz_g3d_get_rot',
  'sz_g3d_get_scale',
  'sz_g3d_get_vel',
  'sz_g3d_get_speed',
  'sz_g3d_is_moving',
  'sz_g3d_dt',
  'sz_g3d_move_by',
  'sz_g3d_rotate_by',
  'sz_g3d_move_towards',
  'sz_g3d_angle_to',
  'sz_g3d_distance_to',
  'sz_g3d_ground_height',
  'sz_g3d_set_fov',
  'sz_g3d_set_opacity',
  'sz_g3d_create_model',
  'sz_g3d_add_to_model',
  'sz_g3d_remove_object',
  'sz_g3d_body',
  'sz_g3d_step_body',
  'sz_g3d_set_solid',
  'sz_g3d_resolve_collision',
  'sz_g3d_create_swarm',
  'sz_g3d_for_each_swarm',
  'sz_g3d_remove_from_swarm',
  'sz_g3d_prune_swarm',
  'sz_g3d_play_note',
  'sz_g3d_create_group',
])

/**
 * Nível de um bloco pelo `type`. Avançado > Intermediário > (default) Iniciante.
 * Os conjuntos acima são as EXCEÇÕES; todo o resto (facilitadores + kit essencial
 * de lógica + facilitadores 3D) é iniciante.
 */
export function resolveBlockLevel(type: string): BlockLevel {
  if (AVANCADO.has(type)) return 'avancado'
  if (INTERMEDIARIO.has(type)) return 'intermediario'
  // Jogo 3D NUNCA é iniciante (3D é mais complexo que o 2D): piso intermediário —
  // os facilitadores 3D caem aqui por prefixo (os avançados já saíram acima).
  if (type.startsWith('sz_g3d_')) return 'intermediario'
  return 'iniciante'
}

/** Exportados só para o teste de conformidade (completude/sem sobreposição/sem typo). */
export const _LEVEL_SETS = { INTERMEDIARIO, AVANCADO } as const

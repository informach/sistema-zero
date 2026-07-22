/**
 * Perfil conquistado pelo Construtor após o curso-base do Iniciante 2D.
 * A lista espelha a referência oficial do Desafio do Primeiro Jogo.
 *
 * As três áreas `sz_frame_*` são sempre ofertadas pelo editor, mas permanecem
 * declaradas aqui para que o contrato pedagógico tenha uma fonte completa.
 */
export const ESSENTIAL_2D_BLOCK_TYPES = [
  'sz_frame_start',
  'sz_frame_events',
  'sz_frame_loops',
  'sz_g2d_setup_stage',
  'sz_g2d_clear',
  'sz_g2d_shake',
  'sz_g2d_create_ship',
  'sz_g2d_starfield',
  'sz_g2d_spawn_asteroid',
  'sz_g2d_explode',
  'sz_g2d_play_shoot',
  'sz_g2d_play_explosion',
  'sz_g2d_arrows_x',
  'sz_g2d_clamp_to_screen',
  'sz_g2d_draw_sprite',
  'sz_g2d_create_group',
  'sz_g2d_spawn_bullet',
  'sz_g2d_update_group',
  'sz_g2d_draw_group',
  'sz_g2d_prune_offscreen',
  'sz_g2d_remove_from_group',
  'sz_g2d_on_key',
  'sz_g2d_on_group_overlap',
  'sz_g2d_on_sprite_group_overlap',
  'sz_g2d_update_each_frame',
  'sz_g2d_every_frames',
  'sz_g2d_random_x',
  'sz_g2d_center_x',
  'sz_g2d_sprite_y',
  'sz_g2d_set_health',
  'sz_g2d_damage_sprite',
  'sz_g2d_health_depleted',
  'sz_g2d_draw_sprite_health',
  'sz_g2d_draw_score',
  'sz_g2d_set_scene',
  'sz_g2d_scene_is',
  'sz_g2d_show_screen',
  'sz_g2d_restart',
  'sz_js_var_create',
  'sz_js_const_create',
  'sz_js_var_increment',
  'sz_js_if_else',
  'sz_val_variable',
  'sz_val_number',
  'sz_val_compare',
  'sz_val_text',
] as const

export const ESSENTIAL_2D_ALLOW_BLOCKS = ESSENTIAL_2D_BLOCK_TYPES.filter(
  (type) => !type.startsWith('sz_frame_'),
)

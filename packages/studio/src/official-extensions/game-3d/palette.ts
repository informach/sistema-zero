import { type ExtensionPaletteTree, flatFamily } from '../extensionPalette'

/**
 * Ordem editorial da paleta do Jogo 3D: árvore família → seção → tipos (review 3D,
 * 10/2026). Compartilhada pelo Estúdio, busca, tutor e catálogo do professor (todos
 * leem a toolbox montada daqui). Família de uma seção só sai ACHATADA (`flatFamily`).
 *
 * Regras da árvore: grupo = a COISA do mundo da criança, na ordem de uso; cada bloco
 * em um lugar só; dentro de cada seção o "Quando…" vem primeiro; os kits de gênero
 * moram no fim, em "🧰 Kits prontos". O núcleo do degrau iniciante-3d fica em
 * `INICIANTE_3D_G3D` (`blockly/blockLevels.ts`).
 */
export const GAME_THREE_D_PALETTE: ExtensionPaletteTree = [
  {
    name: '🎬 Cena, céu e câmera',
    sections: [
      {
        name: 'Começar',
        types: ['sz_g3d_create_fullscreen_scene', 'sz_g3d_animate', 'sz_g3d_create_scene'],
      },
      {
        name: 'Céu e luz',
        types: [
          'sz_g3d_sky_photo',
          'sz_g3d_set_sky',
          'sz_g3d_set_background',
          'sz_g3d_add_ambient_light',
          'sz_g3d_add_sun_light',
          'sz_g3d_add_point_light',
          'sz_g3d_set_fog',
          'sz_g3d_set_shadows',
        ],
      },
      {
        name: 'Câmera',
        types: [
          'sz_g3d_camera_mode',
          'sz_g3d_camera_distance',
          'sz_g3d_camera_shake',
          'sz_g3d_set_camera',
          'sz_g3d_camera_look_at',
          'sz_g3d_set_fov',
        ],
      },
    ],
  },
  {
    name: '🧊 Objetos',
    sections: [
      {
        name: 'Criar',
        types: [
          'sz_g3d_create_box',
          'sz_g3d_create_sphere',
          'sz_g3d_create_block',
          'sz_g3d_create_model_file',
          'sz_g3d_create_cylinder',
          'sz_g3d_create_cone',
          'sz_g3d_create_plane',
          'sz_g3d_create_torus',
        ],
      },
      {
        name: '🎬 Animação do modelo',
        types: ['sz_g3d_play_animation', 'sz_g3d_stop_animation', 'sz_g3d_animation_done'],
      },
      { name: 'Montar um modelo', types: ['sz_g3d_create_model', 'sz_g3d_add_to_model'] },
      {
        name: 'Aparência',
        types: [
          'sz_g3d_set_color',
          'sz_g3d_set_opacity',
          'sz_g3d_set_texture',
          'sz_g3d_set_material',
          'sz_g3d_paint_pattern',
          'sz_g3d_no_shadow',
          'sz_g3d_set_visible',
          'sz_g3d_blink',
        ],
      },
      {
        name: 'Posição, giro e tamanho',
        types: [
          'sz_g3d_set_position',
          'sz_g3d_set_rotation',
          'sz_g3d_set_scale',
          'sz_g3d_get_pos',
          'sz_g3d_get_rot',
          'sz_g3d_get_scale',
        ],
      },
      { name: 'Dados do objeto', types: ['sz_g3d_set_object_value', 'sz_g3d_object_value'] },
      { name: 'Sumir', types: ['sz_g3d_remove_object'] },
    ],
  },
  {
    name: '🏃 Movimento',
    sections: [
      {
        name: 'Andar com o teclado',
        types: ['sz_g3d_control_keys', 'sz_g3d_jump', 'sz_g3d_apply_gravity'],
      },
      {
        name: 'Movimentos prontos',
        types: ['sz_g3d_spin', 'sz_g3d_slide_between', 'sz_g3d_move_in_circle', 'sz_g3d_fall'],
      },
      {
        name: 'Velocidade',
        types: ['sz_g3d_set_velocity', 'sz_g3d_get_vel', 'sz_g3d_get_speed', 'sz_g3d_is_moving'],
      },
      {
        name: 'De uma vez',
        types: ['sz_g3d_move_by', 'sz_g3d_rotate_by', 'sz_g3d_move_towards', 'sz_g3d_move_forward'],
      },
      {
        name: 'Olhar e apontar',
        types: [
          'sz_g3d_look_at_object',
          'sz_g3d_look_at_point',
          'sz_g3d_face_velocity',
          'sz_g3d_angle_to',
          'sz_g3d_distance_to',
        ],
      },
      {
        name: 'Andar em grade',
        types: ['sz_g3d_grid_position', 'sz_g3d_grid_step', 'sz_g3d_grid_move'],
      },
      { name: '1ª pessoa', types: ['sz_g3d_fps_controls'] },
    ],
  },
  flatFamily('🎮 Controles', [
    'sz_g3d_on_key',
    'sz_g3d_on_click_object',
    'sz_g3d_on_canvas_click',
    'sz_g3d_key_down',
    'sz_g3d_key_pressed',
    'sz_g3d_pick_at_mouse',
    'sz_g3d_pointer_over',
    'sz_g3d_aim_ahead',
  ]),
  {
    name: '💥 Encostar',
    sections: [
      {
        name: 'Encostar',
        types: ['sz_g3d_on_touch_group', 'sz_g3d_collides', 'sz_g3d_hit_any', 'sz_g3d_is_near'],
      },
      {
        name: 'Física de plataforma',
        types: [
          'sz_g3d_body',
          'sz_g3d_step_body',
          'sz_g3d_set_solid',
          'sz_g3d_resolve_collision',
          'sz_g3d_for_each_hit',
          'sz_g3d_hit_is',
          'sz_g3d_carry_riders',
          'sz_g3d_pass_under',
          'sz_g3d_on_ground',
          'sz_g3d_ground_height',
          'sz_g3d_platformer_controls',
          'sz_g3d_classic_platformer',
        ],
      },
    ],
  },
  // Grupos absorveram os antigos enxames: as cópias de um molde moram num grupo comum.
  flatFamily('📦 Grupos', [
    'sz_g3d_create_group',
    'sz_g3d_spawn_copy',
    'sz_g3d_update_group_no_gravity',
    'sz_g3d_update_group',
    'sz_g3d_prune_offscreen',
    'sz_g3d_prune_area',
    'sz_g3d_for_each_in_group',
    'sz_g3d_count_group',
    'sz_g3d_remove_from_group',
    'sz_g3d_clear_group',
    'sz_g3d_move_across',
  ]),
  // As regras de jogo vêm da fábrica compartilhada das extensões 3D (`game3dRules/`).
  {
    name: '🏆 Placar, vida e telas',
    sections: [
      { name: 'Na tela', types: ['sz_g3d_hud_text'] },
      { name: 'Pontos', types: ['sz_g3d_add_score', 'sz_g3d_score'] },
      {
        name: 'Vida',
        types: [
          'sz_g3d_on_life_over',
          'sz_g3d_set_life',
          'sz_g3d_hurt',
          'sz_g3d_heal',
          'sz_g3d_life_of',
        ],
      },
      {
        name: 'Telas e fim',
        types: ['sz_g3d_set_screen_text', 'sz_g3d_end_game', 'sz_g3d_restart'],
      },
    ],
  },
  {
    name: '⏱️ Tempo e sorteio',
    sections: [
      { name: 'Tempo', types: ['sz_g3d_every_seconds', 'sz_g3d_after_seconds', 'sz_g3d_dt'] },
      {
        name: 'Contagem',
        types: [
          'sz_g3d_on_timer_end',
          'sz_g3d_start_timer',
          'sz_g3d_time_left',
          'sz_g3d_stop_timer',
        ],
      },
      { name: 'Sorteio', types: ['sz_g3d_random_between', 'sz_g3d_random_chance'] },
    ],
  },
  flatFamily('🔊 Som', [
    'sz_g3d_play_effect',
    'sz_g3d_play_note',
    'sz_g3d_load_sound',
    'sz_g3d_play_sound',
    'sz_g3d_stop_sound',
    'sz_g3d_play_music',
    'sz_g3d_stop_music',
    'sz_g3d_set_volume',
  ]),
  {
    name: '🧰 Kits prontos',
    sections: [
      { name: 'Tela do jogo', types: ['sz_g3d_create_fullscreen_kit'] },
      { name: '👾 Desvie', types: ['sz_g3d_spawn_enemy'] },
      {
        name: '🐔 Travessia',
        types: [
          'sz_g3d_create_crossing_scene',
          'sz_g3d_create_crosser',
          'sz_g3d_crosser_move',
          'sz_g3d_crosser_step',
          'sz_g3d_crosser_reset',
          'sz_g3d_add_row',
          'sz_g3d_generate_rows',
          'sz_g3d_move_traffic',
          'sz_g3d_crosser_hit',
          'sz_g3d_crosser_row',
        ],
      },
      {
        name: '🏎️ Corrida',
        types: [
          'sz_g3d_create_race_scene',
          'sz_g3d_create_race_track',
          'sz_g3d_create_race_car',
          'sz_g3d_race_step',
          'sz_g3d_race_control',
          'sz_g3d_run_rivals',
          'sz_g3d_race_reset',
          'sz_g3d_race_hit',
          'sz_g3d_race_laps',
        ],
      },
      {
        name: '📦 Empilhar',
        types: [
          'sz_g3d_create_stack_scene',
          'sz_g3d_create_stack_tower',
          'sz_g3d_stack_drop',
          'sz_g3d_stack_step',
          'sz_g3d_stack_reset',
          'sz_g3d_stack_score',
          'sz_g3d_stack_game_over',
        ],
      },
      {
        name: '🍄 Plataforma',
        types: [
          'sz_g3d_on_stage_event',
          'sz_g3d_create_platform_scene',
          'sz_g3d_create_hero',
          'sz_g3d_stage_theme',
          'sz_g3d_load_stage',
          'sz_g3d_stage_step',
          'sz_g3d_side_camera',
          'sz_g3d_shoot_fire',
          'sz_g3d_stage_number',
          'sz_g3d_stage_reset',
          'sz_g3d_clear_stage',
          'sz_g3d_stage_value',
          'sz_g3d_stage_is',
          'sz_g3d_hero_is',
        ],
      },
    ],
  },
]

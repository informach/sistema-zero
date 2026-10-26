import { type ExtensionPaletteTree, flatFamily } from '../extensionPalette'

/**
 * Ordem editorial da paleta do Jogo 3D Avançado: árvore família → seção → tipos (review 3D,
 * lote 11: as 24 abas planas viraram 11 famílias). Compartilhada pelo Estúdio, busca, tutor e
 * catálogo do professor (todos leem a toolbox montada daqui). Família de uma seção só sai
 * ACHATADA (`flatFamily`).
 *
 * Regras da árvore: a ordem segue o fluxo do jogo (o mundo → o que as coisas SÃO → nascer →
 * mexer → controlar → encostar → o cérebro → placar → câmera → luz → tempo e som); cada bloco
 * num lugar só; dentro de cada seção o "Quando…" vem primeiro. As seções do manual
 * (`manifest.ts`) seguem a MESMA ordem (o docDrift confere).
 */
export const GAME_KIT_THREE_D_PALETTE: ExtensionPaletteTree = [
  {
    name: '🌍 Mundo, telas e estados',
    sections: [
      {
        name: 'Preparar',
        types: [
          'sz_g3k_setup',
          'sz_g3k_world_size',
          'sz_g3k_scatter_decor',
          'sz_g3k_set_effects',
          'sz_g3k_set_pause_key',
          // Legado oculto (o boot é automático); a toolbox o filtra.
          'sz_g3k_start',
        ],
      },
      {
        name: 'Telas',
        types: [
          'sz_g3k_set_screen_text',
          'sz_g3k_create_screen',
          'sz_g3k_add_button',
          'sz_g3k_show_screen',
          'sz_g3k_hide_screens',
        ],
      },
      {
        name: 'Estados',
        types: [
          'sz_g3k_on_enter_state',
          'sz_g3k_set_state',
          'sz_g3k_state_is',
          'sz_g3k_game_state',
          'sz_g3k_return_to_menu',
          'sz_g3k_end_game',
        ],
      },
      {
        name: 'Fases',
        types: ['sz_g3k_on_level_start', 'sz_g3k_next_level', 'sz_g3k_level'],
      },
      { name: 'Guardar o progresso', types: ['sz_g3k_save_value', 'sz_g3k_saved_value'] },
      { name: 'Avisos', types: ['sz_g3k_on_event', 'sz_g3k_emit'] },
    ],
  },
  {
    name: '🧩 Moldes',
    sections: [
      { name: 'Desenhar o molde', types: ['sz_g3k_define_mold', 'sz_g3k_part'] },
      {
        // O atalho ("é uma bola") vem antes dos ajustes finos de colisão, quique e atrito.
        name: 'Corpo do molde',
        types: [
          'sz_g3k_set_physics',
          'sz_g3k_set_collider',
          'sz_g3k_make_solid',
          'sz_g3k_make_trigger',
          'sz_g3k_set_bounce',
          'sz_g3k_set_friction',
        ],
      },
      {
        name: 'Animação do modelo',
        types: [
          'sz_g3k_on_anim_end',
          'sz_g3k_state_anim',
          'sz_g3k_play_anim',
          'sz_g3k_anim_speed',
          'sz_g3k_stop_anim',
        ],
      },
    ],
  },
  {
    name: '👾 Nascer e sumir',
    sections: [
      {
        name: 'Nascer',
        types: [
          'sz_g3k_spawn',
          'sz_g3k_spawn_named',
          'sz_g3k_spawn_from',
          'sz_g3k_spawn_ring',
          'sz_g3k_start_spawner',
          'sz_g3k_stop_spawner',
        ],
      },
      {
        name: 'Quem está no jogo',
        types: ['sz_g3k_for_each_alive', 'sz_g3k_count_alive', 'sz_g3k_exists', 'sz_g3k_is_mold'],
      },
      { name: 'Sumir', types: ['sz_g3k_recycle', 'sz_g3k_recycle_all', 'sz_g3k_cull_far'] },
    ],
  },
  {
    name: '🏃 Movimento',
    sections: [
      {
        name: 'Teclado',
        types: ['sz_g3k_move_with_keys', 'sz_g3k_platformer_keys', 'sz_g3k_move_fps'],
      },
      {
        name: 'Posição e direção',
        types: [
          'sz_g3k_place',
          'sz_g3k_set_yaw',
          'sz_g3k_look_at',
          'sz_g3k_face_velocity',
          'sz_g3k_pos_of',
          'sz_g3k_distance_between',
        ],
      },
      {
        name: 'Velocidade e freio',
        types: [
          'sz_g3k_set_velocity',
          'sz_g3k_set_drag',
          'sz_g3k_move_forward',
          'sz_g3k_velocity_of',
        ],
      },
      {
        name: 'Pular e cair',
        types: ['sz_g3k_fall', 'sz_g3k_jump', 'sz_g3k_on_ground', 'sz_g3k_pass_through'],
      },
      {
        name: 'Perseguir e mirar',
        types: [
          'sz_g3k_seek',
          'sz_g3k_seek_point',
          'sz_g3k_patrol',
          'sz_g3k_aim_at',
          'sz_g3k_is_aiming_at',
        ],
      },
    ],
  },
  flatFamily('🎮 Controles', [
    'sz_g3k_key_down',
    'sz_g3k_key_pressed',
    'sz_g3k_mouse_pressed',
    'sz_g3k_mouse_down',
    'sz_g3k_pick',
    'sz_g3k_pointer_over',
    'sz_g3k_ground_point',
  ]),
  flatFamily('💥 Encostar', [
    'sz_g3k_on_overlap',
    'sz_g3k_touches',
    'sz_g3k_for_each_near',
    'sz_g3k_store_nearest',
  ]),
  {
    name: '🧠 Comportamento',
    sections: [
      {
        name: 'Estados de cada um',
        types: [
          'sz_g3k_on_enter_entity_state',
          'sz_g3k_on_entity_state_update',
          'sz_g3k_on_exit_entity_state',
          'sz_g3k_set_entity_state',
          'sz_g3k_entity_state_is',
          'sz_g3k_state_timer',
          'sz_g3k_state_time',
          'sz_g3k_state_of',
        ],
      },
      {
        name: 'Dados de cada um',
        types: ['sz_g3k_set_entity_value', 'sz_g3k_entity_value'],
      },
    ],
  },
  {
    name: '🏆 Placar, vida e telas',
    sections: [
      {
        name: 'Vida',
        types: [
          'sz_g3k_on_hurt',
          'sz_g3k_on_entity_death',
          'sz_g3k_hurt',
          'sz_g3k_heal',
          'sz_g3k_health_of',
          'sz_g3k_max_health_of',
          'sz_g3k_show_health_bar',
        ],
      },
      {
        name: 'Placar e falas',
        types: [
          'sz_g3k_hud_text',
          'sz_g3k_add_score',
          'sz_g3k_score',
          'sz_g3k_say',
          'sz_g3k_hide_say',
        ],
      },
      {
        name: 'Mochila 🎒',
        types: [
          'sz_g3k_bag_give',
          'sz_g3k_bag_take',
          'sz_g3k_bag_count',
          'sz_g3k_bag_has',
          'sz_g3k_bag_clear',
        ],
      },
    ],
  },
  flatFamily('🎥 Câmera', [
    // Os modos primeiro (escolher a câmera), depois os ajustes (mexer nela).
    'sz_g3k_camera_follow',
    'sz_g3k_camera_orbit',
    'sz_g3k_camera_top',
    'sz_g3k_camera_fps',
    'sz_g3k_camera_angle',
    'sz_g3k_camera_distance',
    'sz_g3k_camera_look_at',
    'sz_g3k_camera_look_at_point',
    'sz_g3k_camera_lens',
    'sz_g3k_camera_smooth',
    'sz_g3k_camera_shake',
  ]),
  {
    name: '✨ Luz, céu e faíscas',
    sections: [
      {
        name: 'Luz e céu',
        types: [
          'sz_g3k_add_light',
          'sz_g3k_set_ambient',
          'sz_g3k_set_fog',
          'sz_g3k_set_sky',
          'sz_g3k_set_sky_photo',
        ],
      },
      { name: 'Faíscas', types: ['sz_g3k_define_effect', 'sz_g3k_burst_at', 'sz_g3k_burst_on'] },
      {
        name: 'Jorro de faíscas',
        types: [
          'sz_g3k_define_emitter',
          'sz_g3k_start_emitter',
          'sz_g3k_emitter_on',
          'sz_g3k_stop_emitter',
          'sz_g3k_add_attractor',
        ],
      },
    ],
  },
  {
    name: '⏱️ Tempo, sorteio e som',
    sections: [
      {
        name: 'Tempo e sorteio',
        types: [
          'sz_g3k_on_update',
          'sz_g3k_on_timer_end',
          'sz_g3k_start_timer',
          'sz_g3k_time_left',
          'sz_g3k_stop_timer',
          'sz_g3k_random_between',
          'sz_g3k_random_chance',
          'sz_g3k_set_seed',
        ],
      },
      {
        name: 'Som',
        types: [
          'sz_g3k_load_sound',
          'sz_g3k_play_music',
          'sz_g3k_stop_music',
          'sz_g3k_play_sound',
          'sz_g3k_play_effect',
          'sz_g3k_play_tone',
        ],
      },
    ],
  },
]

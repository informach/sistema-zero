import { type ExtensionPaletteTree, flatFamily } from '../extensionPalette'

/**
 * Ordem editorial da paleta do Mundo 3D: árvore família → seção → tipos (review 3D, 10/2026).
 * Compartilhada pelo Estúdio, busca, tutor e catálogo do professor (todos leem a toolbox montada
 * daqui). Família de uma seção só sai ACHATADA (`flatFamily`).
 *
 * Regras da árvore: grupo = a COISA do mundo da criança, na ordem em que ela monta o passeio
 * (chão → quem anda → o que enfeita → céu → lugares → gente → pontos → placar → brincadeiras →
 * câmera → controles); cada bloco em um lugar só; dentro de cada seção o "Quando…" vem
 * primeiro. As seções do manual (`manifest.ts`) seguem a MESMA ordem (o docDrift confere).
 */
export const WORLD_THREE_D_PALETTE: ExtensionPaletteTree = [
  {
    name: '🌍 Mundo',
    sections: [
      {
        name: 'Criar e moldar o chão',
        types: [
          'sz_w3d_setup',
          'sz_w3d_terrain',
          'sz_w3d_flatten',
          'sz_w3d_path',
          'sz_w3d_clear_area',
          'sz_w3d_water',
          'sz_w3d_islands',
          // Legado oculto (o boot é automático); a toolbox o filtra.
          'sz_w3d_start',
        ],
      },
      { name: 'Medidas', types: ['sz_w3d_world_size', 'sz_w3d_ground_height'] },
    ],
  },
  {
    name: '🧍 Jogador',
    sections: [
      {
        name: 'A pé',
        types: [
          'sz_w3d_person',
          'sz_w3d_person_stats',
          'sz_w3d_person_place',
          'sz_w3d_person_accessory',
          'sz_w3d_person_emote',
          'sz_w3d_person_model',
          'sz_w3d_model_anim',
        ],
      },
      {
        name: 'Carrinho',
        types: [
          'sz_w3d_on_horn',
          'sz_w3d_on_crash',
          'sz_w3d_car',
          'sz_w3d_car_stats',
          'sz_w3d_car_boost',
          'sz_w3d_car_place',
          'sz_w3d_car_paint',
          'sz_w3d_car_lights',
          'sz_w3d_horn',
          'sz_w3d_tire_marks',
          'sz_w3d_engine_sound',
          'sz_w3d_car_model',
          'sz_w3d_car_speed',
        ],
      },
      { name: 'Barco', types: ['sz_w3d_boat'] },
      {
        name: 'Trocar e onde está',
        types: ['sz_w3d_on_vehicle', 'sz_w3d_is_driving', 'sz_w3d_player_pos'],
      },
    ],
  },
  flatFamily('🌿 Natureza e enfeites', [
    'sz_w3d_grass',
    'sz_w3d_scatter',
    'sz_w3d_scatter_model',
    'sz_w3d_place_thing',
    'sz_w3d_place_model',
    'sz_w3d_waterfall',
    'sz_w3d_lamp',
    'sz_w3d_fireflies',
    'sz_w3d_campfire',
    'sz_w3d_bridge',
    'sz_w3d_lighthouse',
    'sz_w3d_string_lights',
  ]),
  flatFamily('🌦️ Céu e clima', [
    'sz_w3d_on_daynight',
    'sz_w3d_sky_photo',
    'sz_w3d_daynight',
    'sz_w3d_set_time',
    'sz_w3d_time_of_day',
    'sz_w3d_weather',
    'sz_w3d_season',
    'sz_w3d_clouds',
    'sz_w3d_wind',
    'sz_w3d_tornado',
  ]),
  {
    name: '🏘️ Lugares prontos',
    sections: [
      {
        name: 'Cidade',
        types: [
          'sz_w3d_city',
          'sz_w3d_district',
          'sz_w3d_road_grid',
          'sz_w3d_house_row',
          'sz_w3d_traffic',
          'sz_w3d_door',
        ],
      },
      {
        name: 'Fazenda',
        types: ['sz_w3d_crops', 'sz_w3d_barn', 'sz_w3d_windmill', 'sz_w3d_fence', 'sz_w3d_animals'],
      },
      { name: 'Lua', types: ['sz_w3d_crater', 'sz_w3d_flag', 'sz_w3d_rocket'] },
      {
        name: 'Galeria',
        types: ['sz_w3d_gallery_create', 'sz_w3d_gallery_add', 'sz_w3d_totem_image'],
      },
    ],
  },
  {
    name: '🧑‍🤝‍🧑 Amigos e missões',
    sections: [
      {
        name: 'Amigos',
        types: [
          'sz_w3d_npc_talk',
          'sz_w3d_npc',
          'sz_w3d_npc_wander',
          'sz_w3d_npc_say',
          'sz_w3d_npc_ask',
          'sz_w3d_npc_emote',
          'sz_w3d_npc_model',
        ],
      },
      {
        name: 'Missões',
        types: [
          'sz_w3d_on_quest_done',
          'sz_w3d_quest',
          'sz_w3d_quest_done',
          'sz_w3d_marker',
          'sz_w3d_guide_arrow',
        ],
      },
      {
        name: 'Conquistas',
        types: ['sz_w3d_on_achievement', 'sz_w3d_achievement', 'sz_w3d_has_achievement'],
      },
    ],
  },
  flatFamily('📍 Pontos e áreas', [
    'sz_w3d_on_point',
    'sz_w3d_on_zone',
    'sz_w3d_point',
    'sz_w3d_zone',
    'sz_w3d_totem_text',
    'sz_w3d_flame_note',
    'sz_w3d_whisper_corner',
    'sz_w3d_remove_named',
  ]),
  {
    name: '🏆 Placar, vida e telas',
    sections: [
      {
        name: 'Moedas e coletáveis',
        types: [
          'sz_w3d_on_collect',
          'sz_w3d_on_collect_item',
          'sz_w3d_coins_scatter',
          'sz_w3d_coins_ring',
          'sz_w3d_coins_line',
          'sz_w3d_collectible',
          'sz_w3d_coin_count',
        ],
      },
      // Pontos, vida, cronômetro e telas: as regras de jogo COMPARTILHADAS (`game3dRules/`).
      { name: 'Pontos', types: ['sz_w3d_add_score', 'sz_w3d_score'] },
      {
        name: 'Vida e fim',
        types: [
          'sz_w3d_on_life_over',
          'sz_w3d_set_life',
          'sz_w3d_hurt',
          'sz_w3d_heal',
          'sz_w3d_life_of',
          'sz_w3d_end_game',
          'sz_w3d_restart',
        ],
      },
      {
        name: 'Cronômetro',
        types: [
          'sz_w3d_on_timer_end',
          'sz_w3d_start_timer',
          'sz_w3d_stop_timer',
          'sz_w3d_time_left',
        ],
      },
      {
        name: 'Na tela',
        types: ['sz_w3d_set_screen_text', 'sz_w3d_hud_text', 'sz_w3d_say', 'sz_w3d_minimap'],
      },
      {
        name: 'Mochila 🎒',
        types: [
          'sz_w3d_inventory_give',
          'sz_w3d_inventory_remove',
          'sz_w3d_inventory_clear',
          'sz_w3d_inventory_count',
          'sz_w3d_inventory_has',
        ],
      },
    ],
  },
  {
    name: '🎳 Brincadeiras e corrida',
    sections: [
      {
        name: 'Empurrar e derrubar',
        types: [
          'sz_w3d_on_explosion',
          'sz_w3d_push_place',
          'sz_w3d_push_scatter',
          'sz_w3d_letters',
          'sz_w3d_stack',
          'sz_w3d_knocked_count',
          'sz_w3d_explosive',
        ],
      },
      {
        name: 'Boliche',
        types: [
          'sz_w3d_bowling_on_strike',
          'sz_w3d_bowling_create',
          'sz_w3d_bowling_reset',
          'sz_w3d_pins_down',
        ],
      },
      {
        name: 'Corrida',
        types: [
          'sz_w3d_race_on_start',
          'sz_w3d_race_on_checkpoint',
          'sz_w3d_race_on_finish',
          'sz_w3d_race_create',
          'sz_w3d_race_checkpoint',
          'sz_w3d_race_time',
          'sz_w3d_race_best',
          'sz_w3d_race_podium',
        ],
      },
    ],
  },
  flatFamily('🎥 Câmera e efeitos', [
    'sz_w3d_camera_mode',
    'sz_w3d_camera_shake',
    'sz_w3d_effects',
    'sz_w3d_confetti',
    'sz_w3d_fireworks',
    'sz_w3d_quality',
  ]),
  {
    name: '🎮 Controles, tempo e som',
    sections: [
      {
        name: 'Controles',
        types: ['sz_w3d_on_update', 'sz_w3d_key_down', 'sz_w3d_key_pressed'],
      },
      {
        name: 'Tempo e sorteio',
        types: ['sz_w3d_after_seconds', 'sz_w3d_random_between', 'sz_w3d_random_chance'],
      },
      {
        name: 'Som',
        types: [
          'sz_w3d_load_sound',
          'sz_w3d_play_sound',
          'sz_w3d_play_music',
          'sz_w3d_stop_music',
          'sz_w3d_ambience',
        ],
      },
    ],
  },
]

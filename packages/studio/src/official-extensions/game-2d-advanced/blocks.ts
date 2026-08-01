import type { ExtensionToolboxCategory } from '#extensions'
import type { BlockDefinition } from '../../blockly/blocks/types'
import { categoryShades } from '../../blockly/colorShades'
import { gameKitBlockDefinitions01 } from './blocks/definitions01'
import { gameKitBlockDefinitions02 } from './blocks/definitions02'
import { gameKitBlockDefinitions03 } from './blocks/definitions03'
import { gameKitBlockDefinitions04 } from './blocks/definitions04'
import { gameKitBlockDefinitions05 } from './blocks/definitions05'
import { gameKitBlockDefinitions06 } from './blocks/definitions06'
// Jogo 2D Avançado = UMA cor da categoria: TEAL (verde-água). As sub-categorias
// são TONS dela (derivados por categoryShades mais abaixo). É o furo que restava
// no arco-íris das categorias (rosa = Jogo 2D, amarelo = Jogo 3D).
import { GAME_KIT_COLOUR as C } from './blocks/shared'

export const gameKitBlocks: BlockDefinition[] = [
  ...gameKitBlockDefinitions01,
  ...gameKitBlockDefinitions02,
  ...gameKitBlockDefinitions03,
  ...gameKitBlockDefinitions04,
  ...gameKitBlockDefinitions05,
  ...gameKitBlockDefinitions06,
]

/**
 * Sub-categorias da paleta (a cor de cada uma é um TOM do teal, derivado abaixo).
 *
 * REGRA de organização: o motor GERAL (faz qualquer jogo, inclusive um RPG na
 * unha) vem PRIMEIRO; o 🧙 Kit RPG (o atalho facilitado, SÓ para RPG — acoplado
 * ao mundo `rpg.*`) vem por ÚLTIMO, com todas as suas categorias prefixadas
 * "Kit RPG:". O que é genérico (tiles/profundidade, ação em tempo real) fica FORA
 * do Kit RPG. A ordem geral segue o fluxo mental: preparar/carregar → telas →
 * estados → laço → personagens → entrada (teclas/mouse) → arquitetura (avisos/
 * moldes/aparência/comportamentos/animação/câmera/mundo) → combate/ação → HUD →
 * faíscas → som.
 */
// `kit` agrupa a sub-categoria dentro de um chip-PAI na toolbox (R23): o 1º
// nível fica com as gerais + 5 pais de kit, em vez de 44 chips planos.
const SUBCATS: { name: string; colour: string; types: string[]; kit?: string }[] = [
  {
    // "Carregar" (só load_image) foi fundido aqui: preparar + carregar imagens.
    name: '🧰 O jogo',
    colour: C,
    types: [
      'sz_gk_setup',
      'sz_gk_setup_full',
      'sz_gk_stage_border',
      'sz_gk_start',
      'sz_gk_load_image',
      'sz_gk_game_width',
      'sz_gk_game_height',
    ],
  },
  {
    // Era a única categoria inchada (14). Ficou com o CICLO DE VIDA do
    // personagem: criar, mover, posicionar, desenhar — e o renascer, que veio do
    // Kit Plataforma (o runtime dele não tem NADA de plataforma: é "guardar um
    // ponto" + teleporte, e vale em RPG, top-down, corrida, bullet hell).
    name: '🧍 Personagens',
    colour: C,
    types: [
      'sz_gk_create_character',
      'sz_gk_move_with_keys',
      'sz_gk_keep_on_screen',
      'sz_gk_draw_character',
      'sz_gk_place_character',
      'sz_gk_reset_character',
      'sz_gk_set_speed_multiplier',
      'sz_gk_characters_touch',
      'sz_gk_plat_checkpoint',
      'sz_gk_plat_respawn',
    ],
  },
  {
    // A "chave-mestra": ler/escrever qualquer coisa do personagem. Saiu de 🧍
    // porque é outro assunto (a doc já tratava como seção separada) e porque é o
    // que a criança procura quando o bloco pronto não existe.
    name: '🔧 Propriedades & direção',
    colour: C,
    types: [
      'sz_gk_char_x',
      'sz_gk_char_y',
      'sz_gk_property_of',
      'sz_gk_set_property',
      'sz_gk_set_facing',
      'sz_gk_facing_of',
      'sz_gk_set_hitbox',
      'sz_gk_set_hitbox_shape',
      'sz_gk_show_hitboxes',
      'sz_gk_angle_of',
      'sz_gk_angle_to',
    ],
  },
  {
    // Teclado e mouse são a MESMA ideia (a entrada do jogador) — viviam
    // separados em 3+4 blocos.
    name: '🎮 Controles',
    colour: C,
    types: [
      'sz_gk_key_down',
      'sz_gk_key_pressed',
      'sz_gk_set_pause_key',
      'sz_gk_on_game_click',
      'sz_gk_mouse_x',
      'sz_gk_mouse_y',
      'sz_gk_mouse_screen_x',
      'sz_gk_mouse_screen_y',
      'sz_gk_mouse_down',
      'sz_gk_move_with_custom_keys',
    ],
  },
  {
    name: '🖼️ Telas',
    colour: C,
    types: [
      'sz_gk_set_screen_text',
      'sz_gk_create_screen',
      'sz_gk_add_button',
      'sz_gk_set_screen_bg',
      'sz_gk_show_screen',
      'sz_gk_hide_screens',
    ],
  },
  {
    name: '🚦 Estados',
    colour: C,
    types: [
      'sz_gk_set_state',
      'sz_gk_restart_game',
      'sz_gk_on_game_start',
      'sz_gk_on_enter_state',
      'sz_gk_game_state',
      'sz_gk_state_is',
      'sz_gk_pause',
      'sz_gk_resume',
      'sz_gk_return_to_menu',
      'sz_gk_end_game',
    ],
  },
  {
    name: '🔁 A cada quadro',
    colour: C,
    types: [
      'sz_gk_on_update',
      'sz_gk_on_draw',
      'sz_gk_on_draw_hud',
      'sz_gk_draw_background',
      'sz_gk_scroll_image',
      'sz_gk_parallax_layer',
    ],
  },
  {
    // GERAL, apesar do prefixo `rpg` nos types (renomear type quebra projeto
    // salvo): o motor desenha a fala e o menu no canvas e navega neles em
    // QUALQUER jogo — o stepUiInput roda no stepSystems, fora do Kit RPG.
    // R24: mudou de 3º p/ cá — diálogo DEPOIS de existir personagem e controle.
    name: '🗨️ Fala & escolhas',
    colour: C,
    types: ['sz_gk_rpg_say', 'sz_gk_rpg_menu', 'sz_gk_rpg_option'],
  },
  {
    name: '📢 Avisos',
    colour: C,
    types: ['sz_gk_on_event', 'sz_gk_emit'],
  },
  {
    name: '🐛 Moldes & enxames',
    colour: C,
    types: [
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
    ],
  },
  {
    // "Aparência" (não "Desenho"): o visual VETORIAL + a folha de quadros. As
    // duas respondem "com o que esse personagem se parece" (viviam em 2+3).
    name: '🎨 Aparência',
    colour: C,
    types: [
      'sz_gk_define_look',
      'sz_gk_draw_look',
      'sz_gk_set_sheet',
      'sz_gk_set_walk_sheet',
      'sz_gk_lean_on_move',
    ],
  },
  {
    // ⭐ Categoria NOVA (R18). A animação era um apêndice da aparência com 5
    // blocos; com a TRAVA por estado ela virou assunto próprio (e iria a 12 num
    // chip só, acima do teto de 10).
    //
    // ⚠️ A trava é o que faltava nos TRÊS sistemas de animação da extensão (folha
    // manual · folha de andar · quadros por física): sem ela a criança manda
    // golpear e a animação de andar apaga o golpe no quadro seguinte.
    name: '📽️ Animação',
    colour: C,
    types: [
      'sz_gk_play_anim',
      'sz_gk_play_anim_once',
      'sz_gk_anim_ended',
      'sz_gk_state_anim',
      'sz_gk_state_look',
      'sz_gk_auto_animate',
      'sz_gk_set_entity_state',
      'sz_gk_entity_state',
    ],
  },
  {
    name: '🎯 Comportamentos',
    colour: C,
    types: [
      'sz_gk_seek',
      'sz_gk_drift',
      'sz_gk_face',
      'sz_gk_launch_towards',
      'sz_gk_move_by_velocity',
      'sz_gk_set_angle',
      'sz_gk_launch_to_point',
      'sz_gk_set_velocity_angle',
      'sz_gk_fan_shot',
      'sz_gk_tween_to',
    ],
  },
  {
    name: '🎥 Câmera',
    colour: C,
    types: [
      'sz_gk_camera_follow',
      'sz_gk_camera_follow_map', // 🌍 mundo = tamanho do mapa de tiles
      'sz_gk_camera_stop',
      'sz_gk_camera_shake',
      'sz_gk_camera_x',
      'sz_gk_camera_y',
    ],
  },
  {
    // GERAIS: carregar/desenhar o mapa, profundidade, sombra e as peças por
    // célula valem em qualquer jogo. (O "deixar sólidas as peças" alimenta a
    // GRADE do RPG — por isso vive no Kit RPG; fora dele a colisão é a do 🧱.)
    name: '🗺️ Mundo & profundidade',
    colour: C,
    types: [
      'sz_gk_load_tilemap',
      'sz_gk_draw_tilemap',
      'sz_gk_draw_shadow',
      'sz_gk_draw_by_depth',
      'sz_gk_set_tile_size',
      'sz_gk_tile_at',
      'sz_gk_set_tile_at',
      'sz_gk_break_tile_at',
      'sz_gk_create_empty_tilemap',
    ],
  },
  {
    // 🛤️ R25 — caminho é polilinha nomeada (irmão da 🧭 Região, que é retângulo
    // nomeado). GERAL: serve TD, corrida, patrulha e cutscene em trilho. R29: desceu
    // de perto do topo (era niche demais para a 5ª posição) p/ junto do mundo/mapa.
    name: '🛤️ Caminhos',
    colour: C,
    types: ['sz_gk_define_path', 'sz_gk_path_point', 'sz_gk_follow_path', 'sz_gk_path_progress'],
  },
  {
    // 🎲 GERAL (R30): as peças de JOGO DE TABULEIRO — a criança monta o Ludo/Jogo
    // da Vida. Ordem de turno (anel) + a trilha de CASAS (estende 🛤️ Caminhos:
    // cada "ponto" vira uma casa). O dado mora na 🎲 Sorte & medida.
    name: '🏁 Jogo de tabuleiro',
    colour: C,
    types: [
      'sz_gk_players_setup',
      'sz_gk_current_player',
      'sz_gk_next_player',
      'sz_gk_on_turn_change',
      'sz_gk_move_along_track',
      'sz_gk_space_of',
      'sz_gk_on_land_space',
    ],
  },
  {
    // ⚙️ GERAL: a física que faz plataforma/corrida/flappy/breakout existirem.
    // A receita é sempre: gravidade → mover pela velocidade → colidir.
    name: '⚙️ Física',
    colour: C,
    types: [
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
    ],
  },
  {
    name: '🧱 Colisão sólida',
    colour: C,
    types: ['sz_gk_collide_tilemap', 'sz_gk_collide_group', 'sz_gk_overlap_groups'],
  },
  {
    // 🧩 GERAL: uma grade nomeada de células (a criança varre com "repita" +
    // ler/pôr). Destrava Snake, Match-3, Sokoban, campo-minado, puzzles de grade.
    name: '🧩 Grade',
    colour: C,
    types: [
      'sz_gk_board_create',
      'sz_gk_board_set',
      'sz_gk_board_get',
      'sz_gk_board_count',
      'sz_gk_board_in',
    ],
  },
  {
    // 🃏 GERAL (R30): a pilha É uma LISTA do núcleo; a criança MONTA memória, Uno,
    // deck-battler com listas + estes verbos + a carta de 2 faces + a mão clicável.
    name: '🎴 Cartas',
    colour: C,
    types: [
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
    ],
  },
  {
    name: '⏱️ Tempo',
    colour: C,
    types: ['sz_gk_every_seconds', 'sz_gk_wait', 'sz_gk_cooldown_ready'],
  },
  {
    // Combate ANTES de Ação: a ação em tempo real usa hurt/i-frames/knockback.
    name: '🗡️ Combate',
    colour: C,
    types: [
      'sz_gk_hurt',
      'sz_gk_knockback',
      'sz_gk_draw_health_bar',
      'sz_gk_touching_circle',
      'sz_gk_is_dead',
      'sz_gk_is_invincible',
      'sz_gk_health_of',
    ],
  },
  {
    // GERAL (não Kit RPG): golpe/hitbox/patrulha valem em qualquer jogo de ação.
    name: '🥷 Ação em tempo real',
    colour: C,
    types: [
      'sz_gk_attack_facing',
      'sz_gk_swing_window',
      'sz_gk_did_hit',
      'sz_gk_patrol_around',
      // ⭐ HONRAR A REGRA: o "virar na parede" não tem NADA de plataforma — não lê
      // onGround, nem gravidade, nem plat.*: lê "meu vx zerou depois de eu andar =
      // bati". Funciona igual num dungeon de topo ou num Frogger, e o irmão
      // "patrulhar em volta" já era geral. Kit = o atalho de UM gênero; isto é de
      // todos.
      'sz_gk_plat_patrol_wall',
    ],
  },
  {
    // Os 3 jeitos de mostrar a vida moram JUNTOS aqui (a barra automática em
    // cima do personagem fica no ❤️ Combate, que é onde a vida muda).
    name: '🖥️ HUD & Missão',
    colour: C,
    types: [
      'sz_gk_set_mission',
      'sz_gk_mission_kill',
      'sz_gk_draw_timer',
      'sz_gk_draw_bar',
      'sz_gk_draw_hearts',
      'sz_gk_float_text',
      'sz_gk_time_survived',
      'sz_gk_kills',
    ],
  },
  {
    name: '✨ Faíscas',
    colour: C,
    types: [
      'sz_gk_define_effect',
      'sz_gk_burst',
      'sz_gk_draw_effects',
      'sz_gk_trail_on',
      'sz_gk_trail_off',
      'sz_gk_shockwave',
      'sz_gk_sheet_burst',
    ],
  },
  {
    name: '🔊 Som',
    colour: C,
    types: [
      'sz_gk_load_sound',
      'sz_gk_play_sound',
      'sz_gk_play_music',
      'sz_gk_stop_sound',
      'sz_gk_set_volume',
      'sz_gk_play_effect',
      'sz_gk_play_tone',
    ],
  },
  {
    // Um retângulo com nome no mundo. É o gatilho de TODO gênero (grama alta,
    // porta, zona de dano, área segura) — e o "quanto está dentro" é a joia que
    // faz o encontro na grama parecer justo.
    name: '🧭 Regiões',
    colour: C,
    types: ['sz_gk_define_region', 'sz_gk_is_inside', 'sz_gk_overlap_percent'],
  },
  {
    name: '🎲 Sorte & medida',
    colour: C,
    types: [
      'sz_gk_chance',
      'sz_gk_roll_dice',
      'sz_gk_distance_between',
      'sz_gk_point_in',
      'sz_gk_random_active',
      'sz_gk_pick_active',
    ],
  },
  {
    name: '🌫️ Sumir & transição',
    colour: C,
    types: [
      'sz_gk_set_opacity',
      'sz_gk_opacity_of',
      'sz_gk_fade_to',
      'sz_gk_tween_property',
      'sz_gk_fade_screen',
      'sz_gk_flash_screen',
    ],
  },
  {
    // ⭐ HONRAR A REGRA (o R18 decidiu que itens são GERAIS; o R20 trouxe a
    // categoria para cá): dar/ter/contar itens é de QUALQUER jogo — coleta,
    // loja, crafting. Só o nome dos types segue "rpg_*" (renomear quebraria
    // projeto salvo). Vive colada na 💾 Memória: inventário e persistência
    // andam juntos.
    name: '🎁 Itens',
    colour: C,
    types: [
      'sz_gk_rpg_give_item',
      'sz_gk_rpg_has_item',
      'sz_gk_count_item',
      'sz_gk_rpg_remove_item',
      'sz_gk_rpg_draw_inventory',
    ],
  },
  {
    name: '🧠 Memória',
    colour: C,
    types: [
      'sz_gk_save_value',
      'sz_gk_saved_value',
      // ⭐ HONRAR A REGRA: uma flag de história é um BOOLEANO COM NOME ("já viu a
      // intro", "destravou a fase 2"). Não tem grade, NPC nem parede: nada de RPG.
      // Ficam coladas aqui, e o contraste vive no tooltip — a flag morre com a
      // partida; o "valor guardado" sobrevive a fechar o jogo. Criança nenhuma
      // adivinha essa diferença sozinha.
      'sz_gk_rpg_add_flag',
      'sz_gk_rpg_has_flag',
    ],
  },
  // ---- 🏃 KIT PLATAFORMA (o atalho do gênero) ----
  // Pela REGRA: só o ESPECÍFICO de plataforma mora aqui. Gravidade, colidir,
  // pular, tiles e o renascer são GERAIS e vivem lá em cima.
  {
    name: '🏃 herói',
    kit: '🏃 Kit Plataforma',
    colour: C,
    types: [
      'sz_gk_plat_hero',
      'sz_gk_plat_jump_feel',
      'sz_gk_plat_double_jump',
      'sz_gk_plat_wall_slide',
      'sz_gk_plat_wall_jump',
      'sz_gk_plat_ladder',
      'sz_gk_plat_state_frames',
      'sz_gk_plat_anim',
    ],
  },
  {
    name: '🧗 mundo',
    kit: '🏃 Kit Plataforma',
    colour: C,
    types: [
      'sz_gk_plat_one_way',
      'sz_gk_plat_drop_through',
      'sz_gk_plat_moving',
      'sz_gk_plat_ride_on',
      // Os inimigos eram uma categoria de 2 — nome próprio custa mais navegação
      // do que economiza.
      'sz_gk_plat_stomp',
    ],
  },
  // ---- 🥊 KIT LUTA (o atalho do gênero) ----
  {
    // ⭐ O Kit Luta. Pela REGRA: só o que é ESPECÍFICO de luta mora aqui. Gravidade,
    // pulo (o "Regular o pulo" regula o coyote e a gravidade da luta de graça;
    // a força do impulso é fixa do kit), caixa de golpe, recuo,
    // dano, empurrão, invencibilidade, trava de animação, telas de fim, tremor e
    // faíscas são do motor GERAL — o kit CHAMA, não copia.
    //
    // ⚠️ O chão também é geral: "Criar o molde" + "Nascer" + "Colidir com o
    // enxame". Um bloco "Chão da luta em y N" seria exatamente o position.y = 330
    // hard-coded da base, e chão não é de luta — é de todo jogo de lado. O Kit
    // Plataforma também não tem chão próprio.
    name: '🥊 a partida',
    kit: '🥊 Kit Luta',
    colour: C,
    types: [
      'sz_gk_luta_match',
      'sz_gk_luta_draw_hud',
      'sz_gk_luta_winner',
      'sz_gk_luta_round',
      'sz_gk_luta_wins_of',
    ],
  },
  {
    name: '🥊 os lutadores',
    kit: '🥊 Kit Luta',
    colour: C,
    types: ['sz_gk_luta_fighter', 'sz_gk_luta_ai', 'sz_gk_luta_is_guarding'],
  },
  {
    // ⭐ O COMBO não é bloco: é consequência da tabela de tempos que a palavra
    // (rápido/médio/pesado) escolhe. Um "pesado" trava o outro por mais tempo do
    // que leva para você se recuperar — sobra uma frestinha, e a criança DESCOBRE
    // que chute→soco encaixa. E o agarrão é um checkbox ("atravessa a defesa"):
    // o que o agarrão FAZ no jogo é uma coisa só — vencer quem só defende.
    name: '🥊 golpes & combo',
    kit: '🥊 Kit Luta',
    colour: C,
    types: [
      'sz_gk_luta_move',
      'sz_gk_luta_move_anim',
      'sz_gk_luta_attack',
      'sz_gk_luta_combo',
      'sz_gk_luta_special',
    ],
  },
  // ---- 🧙 KIT RPG (o kit facilitado, SÓ para montar um RPG) ----
  // Tudo aqui é acoplado ao mundo `rpg.*` (grade/NPCs/mapas/batalha) — por isso
  // as categorias levam o prefixo "Kit RPG:". A FALA e o MENU saíram para o
  // geral (💬 Fala & escolhas), e os ITENS para 🎒 Itens (gerais): o motor os
  // serve em qualquer jogo.
  {
    name: '🧙 mundo',
    kit: '🧙 Kit RPG',
    colour: C,
    types: [
      'sz_gk_rpg_set_start_map',
      'sz_gk_rpg_create_map',
      'sz_gk_rpg_on_enter_map',
      'sz_gk_rpg_go_map',
      'sz_gk_rpg_create_door',
      // 🌍 Mundo aberto: bordas ligadas (estilo Zelda)
      'sz_gk_rpg_connect_edge',
      'sz_gk_rpg_current_map',
      'sz_gk_rpg_move_grid',
      'sz_gk_rpg_block_cell',
      // Alimenta a GRADE do RPG (rpg.walls) — só o "Mover pela grade" lê isso,
      // por isso é RPG e não geral. O type mantém o nome antigo (renomear
      // quebraria projeto salvo); só a categoria mudou.
      'sz_gk_tilemap_solid',
      'sz_gk_rpg_cell',
    ],
  },
  {
    name: '💬 NPCs',
    kit: '🧙 Kit RPG',
    colour: C,
    types: ['sz_gk_rpg_create_npc', 'sz_gk_rpg_draw_npcs', 'sz_gk_rpg_on_talk'],
  },
  {
    name: '🎬 cenas',
    kit: '🧙 Kit RPG',
    colour: C,
    types: [
      'sz_gk_rpg_cutscene',
      'sz_gk_rpg_wait',
      'sz_gk_rpg_npc_walk_to',
      'sz_gk_rpg_face',
      'sz_gk_rpg_npc_wander',
      'sz_gk_rpg_on_step',
    ],
  },
  {
    // Só o SALVAR fica no kit: ele serializa o estado do RPG (flags/itens/mapa/
    // atributos). O menu de escolha saiu p/ o geral (💬 Fala & escolhas).
    name: '💾 salvar',
    kit: '🧙 Kit RPG',
    colour: C,
    types: ['sz_gk_rpg_save', 'sz_gk_rpg_load', 'sz_gk_rpg_has_save'],
  },
  {
    // A batalha fecha o cluster do RPG DE PROPÓSITO: o Kit Monstrinhos (logo
    // abaixo) é "um jogo do Kit RPG com OUTRA batalha" — a vizinhança conta a
    // história. (Ela morava órfã no FIM do array, depois do Monstrinhos inteiro.)
    name: '⚔️ batalha',
    kit: '🧙 Kit RPG',
    colour: C,
    types: [
      'sz_gk_rpg_battle_stats',
      'sz_gk_rpg_battle_start',
      'sz_gk_rpg_add_ally',
      'sz_gk_rpg_add_foe',
      'sz_gk_rpg_define_battler',
      'sz_gk_rpg_add_foe_named',
      'sz_gk_rpg_battle_named',
      'sz_gk_rpg_teach_move',
      'sz_gk_rpg_teach_heal',
      'sz_gk_rpg_set_special',
      'sz_gk_rpg_give_potion',
      'sz_gk_rpg_heal_hero',
      'sz_gk_rpg_battle_reward',
      'sz_gk_rpg_inflict',
      'sz_gk_rpg_on_battle_end',
      'sz_gk_rpg_battle_won',
      'sz_gk_rpg_level',
      'sz_gk_rpg_xp',
      'sz_gk_rpg_add_boss',
      'sz_gk_battler_life',
      'sz_gk_battler_max_life',
      'sz_gk_rpg_on_foe_turn',
      'sz_gk_rpg_foe_use',
      'sz_gk_rpg_foe_hit_all',
    ],
  },
  // ---- 👾 KIT MONSTRINHOS (o atalho do gênero "pegue e treine bichinhos") ----
  // ⭐ É um jogo do Kit RPG com OUTRA batalha: o mundo (grade/NPC/fala/mapa/
  // flags/salvar) vem de lá. Aqui só o que é do gênero.
  {
    name: '🐾 criaturas',
    kit: '👾 Kit Monstrinhos',
    colour: C,
    types: [
      'sz_gk_pkm_creature',
      'sz_gk_pkm_move',
      'sz_gk_pkm_type_chart',
      'sz_gk_pkm_evolve',
      'sz_gk_pkm_catch_difficulty',
      'sz_gk_pkm_level_of',
    ],
  },
  {
    name: '🎒 meu time',
    kit: '👾 Kit Monstrinhos',
    colour: C,
    types: [
      'sz_gk_pkm_give',
      'sz_gk_pkm_give_ball',
      'sz_gk_pkm_heal_team',
      'sz_gk_pkm_has',
      'sz_gk_pkm_team_size',
      'sz_gk_pkm_ball_count',
      'sz_gk_pkm_draw_team',
    ],
  },
  {
    name: '🌿 encontros & batalha',
    kit: '👾 Kit Monstrinhos',
    colour: C,
    types: [
      'sz_gk_pkm_grass_cells',
      'sz_gk_pkm_grass_tiles',
      'sz_gk_pkm_wild',
      'sz_gk_pkm_encounter_rate',
      'sz_gk_pkm_battle_wild',
      'sz_gk_pkm_battle_trainer',
      'sz_gk_pkm_trainer_creature',
      'sz_gk_pkm_caught',
    ],
  },
  // ---- 🚀 KIT NAVE (o atalho do gênero) ----
  // A formação que marcha em bloco é o coração intransferível do Space Invaders;
  // tiro do jogador/colisão/placar/som são GERAIS — o kit chama, não copia.
  {
    name: '🚀 a nave',
    kit: '🚀 Kit Nave',
    colour: C,
    types: ['sz_gk_nave_ship', 'sz_gk_nave_powerup', 'sz_gk_nave_power_of'],
  },
  {
    name: '🛸 a invasão',
    kit: '🚀 Kit Nave',
    colour: C,
    types: ['sz_gk_nave_wave', 'sz_gk_nave_wave_shooter', 'sz_gk_nave_invasion_line'],
  },
  {
    name: '🌌 o espaço',
    kit: '🚀 Kit Nave',
    colour: C,
    types: ['sz_gk_nave_starfield', 'sz_gk_nave_bomb'],
  },
  // 🏰 R26 — Kit Defesa de Torre. As torres (lugares/compra/alcance) e a invasão
  // & as moedas (onda pelo caminho + carteira). O tiro, a barra de vida, os
  // corações e a explosão saem de blocos GERAIS (receita nas docs).
  {
    name: '🏰 as torres',
    kit: '🏰 Kit Defesa de Torre',
    colour: C,
    types: [
      'sz_gk_td_slot',
      'sz_gk_td_draw_slots',
      'sz_gk_td_on_buy',
      'sz_gk_td_free_slot',
      'sz_gk_td_draw_range',
    ],
  },
  {
    name: '👹 a invasão & as moedas',
    kit: '🏰 Kit Defesa de Torre',
    colour: C,
    types: ['sz_gk_td_wave', 'sz_gk_td_set_coins', 'sz_gk_td_add_coins', 'sz_gk_td_coins'],
  },
  // ---- 🃏 KIT CARTAS (o RPG de cartas / deck-battler) — R30 ----
  {
    name: '🃏 a batalha',
    kit: '🃏 Kit Cartas',
    colour: C,
    types: [
      'sz_gk_cards_start',
      'sz_gk_cards_energy_per_turn',
      'sz_gk_cards_energy',
      'sz_gk_cards_spend',
      'sz_gk_cards_on_turn',
      'sz_gk_cards_end_turn',
      'sz_gk_cards_draw_hud',
    ],
  },
  {
    name: '❤️ vida & escudo',
    kit: '🃏 Kit Cartas',
    colour: C,
    types: [
      'sz_gk_cards_hero_life',
      'sz_gk_cards_enemy_life',
      'sz_gk_cards_hurt_enemy',
      'sz_gk_cards_hurt_me',
      'sz_gk_cards_gain_block',
    ],
  },
  {
    name: '👿 o inimigo',
    kit: '🃏 Kit Cartas',
    colour: C,
    types: [
      'sz_gk_cards_enemy_intent',
      'sz_gk_cards_intent_action',
      'sz_gk_cards_intent_value',
      'sz_gk_cards_on_enemy_turn',
    ],
  },
]

// Cores por GRUPO (R24). Antes era um gradiente único de 44 tons do teal —
// vizinhos quase iguais e os kits-pai espremidos na ponta escura, todos
// parecidos. Agora: as GERAIS ganham o gradiente com o passo dobrado (28 tons)
// e cada KIT ganha um tom-base PRÓPRIO bem espaçado do MESMO teal (a identidade
// da categoria de topo continua teal — deslocar o matiz brigaria com o
// arco-íris das categorias), com as filhas em sombras suaves do tom do pai.
const gerais = SUBCATS.filter((sc) => !sc.kit)
const GERAL_SHADES = categoryShades(C, gerais.length)
gerais.forEach((sc, i) => {
  sc.colour = GERAL_SHADES[i] ?? C
})
const kitNames = [...new Set(SUBCATS.flatMap((sc) => (sc.kit ? [sc.kit] : [])))]
const KIT_BASE_SHADES = categoryShades(C, kitNames.length)
const KIT_BASES = new Map(kitNames.map((k, i) => [k, KIT_BASE_SHADES[i] ?? C]))
for (const kitName of kitNames) {
  const filhas = SUBCATS.filter((sc) => sc.kit === kitName)
  // Rampa curta (8 passos, fatiada pelas filhas): sombras do tom do pai que
  // não descem ao preto mesmo no kit de 5 filhas.
  const tons = categoryShades(KIT_BASES.get(kitName) ?? C, 8)
  filhas.forEach((sc, i) => {
    sc.colour = tons[i] ?? KIT_BASES.get(kitName) ?? C
  })
}
// Cor = navegação: pinta cada bloco com a cor do seu grupo.
const COLOUR_BY_TYPE = new Map<string, string>(
  SUBCATS.flatMap((sc) => sc.types.map((t) => [t, sc.colour] as const)),
)
for (const b of gameKitBlocks) {
  const colour = COLOUR_BY_TYPE.get(b.type)
  if (colour) b.colour = colour
}

// Rede de segurança: bloco fora de qualquer sub-categoria cai num grupo "Mais".
const CATEGORIZED = new Set(SUBCATS.flatMap((sc) => sc.types))
const VISIBLE_BLOCK_TYPES = new Set(
  gameKitBlocks.filter((block) => !block.hidden).map((b) => b.type),
)
const leftover = gameKitBlocks
  .filter((block) => !block.hidden)
  .map((block) => block.type)
  .filter((type) => !CATEGORIZED.has(type))

// Sombras pré-preenchidas dos soquetes de VALOR que aparecem na paleta.
const txtShadow = (text: string) => ({ shadow: { type: 'sz_val_text', fields: { TEXT: text } } })
const numShadow = (value: number) => ({ shadow: { type: 'sz_val_number', fields: { NUM: value } } })
export const GK_SOCKET_SHADOWS: Record<string, Record<string, unknown>> = {
  sz_gk_setup: { W: numShadow(1280), H: numShadow(720) },
  sz_gk_stage_border: { WIDTH: numShadow(4) },
  sz_gk_card: { FRONT: txtShadow('🍎'), BACK: txtShadow('?') },
  sz_gk_card_flip: { CARD: numShadow(0) },
  sz_gk_card_is_up: { CARD: numShadow(0) },
  sz_gk_card_face: { CARD: numShadow(0) },
  sz_gk_hand_draw: { X: numShadow(60), Y: numShadow(420) },
  sz_gk_card_at: { X: numShadow(0), Y: numShadow(0) },
  sz_gk_cards_start: { HERO_HP: numShadow(30), ENEMY_HP: numShadow(40) },
  sz_gk_cards_energy_per_turn: { N: numShadow(3) },
  sz_gk_cards_spend: { N: numShadow(1) },
  sz_gk_cards_hurt_enemy: { N: numShadow(6) },
  sz_gk_cards_hurt_me: { N: numShadow(6) },
  sz_gk_cards_gain_block: { N: numShadow(5) },
  sz_gk_cards_enemy_intent: { VALUE: numShadow(6) },
  sz_gk_board_create: { COLS: numShadow(10), ROWS: numShadow(10), EMPTY: numShadow(0) },
  sz_gk_board_set: { VALUE: numShadow(1), COL: numShadow(0), ROW: numShadow(0) },
  sz_gk_board_get: { COL: numShadow(0), ROW: numShadow(0) },
  sz_gk_board_count: { VALUE: numShadow(1) },
  sz_gk_board_in: { COL: numShadow(0), ROW: numShadow(0) },
  sz_gk_set_screen_text: {
    TITLE: txtShadow('Meu Jogo'),
    TEXT: txtShadow('WASD ou setas para andar'),
    BTN: txtShadow('Jogar'),
  },
  sz_gk_create_screen: {
    TITLE: txtShadow('Minha loja'),
    TEXT: txtShadow('Bem-vindo!'),
  },
  sz_gk_add_button: { LABEL: txtShadow('Jogar de novo') },
  sz_gk_create_character: { W: numShadow(64), H: numShadow(64), SPEED: numShadow(300) },
  sz_gk_place_character: { X: numShadow(100), Y: numShadow(100) },
  sz_gk_set_speed_multiplier: { FACTOR: numShadow(2) },
  // P24
  sz_gk_define_mold: {
    W: numShadow(40),
    H: numShadow(40),
    HEALTH: numShadow(20),
    SPEED: numShadow(120),
    DAMAGE: numShadow(10),
  },
  sz_gk_spawn_from_mold: { X: numShadow(100), Y: numShadow(100) },
  sz_gk_spawn_named: { X: numShadow(100), Y: numShadow(100) },
  sz_gk_start_spawner: { SEC: numShadow(1.5) },
  // 200 = o despawn do P24 (2× a margem de spawn de 100 — quem nasce na borda
  // não é recolhido no quadro seguinte).
  sz_gk_cull_offscreen: { MARGIN: numShadow(200) },
  sz_gk_define_look: { W: numShadow(40), H: numShadow(40) },
  sz_gk_draw_look: { X: numShadow(100), Y: numShadow(100), W: numShadow(40), H: numShadow(40) },
  sz_gk_hurt: { AMOUNT: numShadow(10), IFRAMES: numShadow(1) },
  sz_gk_knockback: { FORCE: numShadow(400) },
  // R2
  sz_gk_set_sheet: { FW: numShadow(32), FH: numShadow(32) },
  sz_gk_play_anim: { FROM: numShadow(0), TO: numShadow(3), FPS: numShadow(8) },
  sz_gk_camera_follow: { W: numShadow(1920), H: numShadow(1080) },
  sz_gk_launch_towards: { V: numShadow(400) },
  sz_gk_set_angle: { DEG: numShadow(0) },
  sz_gk_draw_bar: {
    CUR: numShadow(50),
    MAX: numShadow(100),
    X: numShadow(20),
    Y: numShadow(20),
    W: numShadow(200),
    H: numShadow(16),
  },
  // 0 = automático (usa a vida máxima do personagem — o runtime resolve).
  sz_gk_draw_health_bar: { MAX: numShadow(0) },
  sz_gk_set_mission: { SEC: numShadow(30), KILLS: numShadow(10) },
  sz_gk_draw_timer: { X: numShadow(20), Y: numShadow(40) },
  sz_gk_define_effect: {
    COUNT: numShadow(16),
    SIZE: numShadow(4),
    LIFE: numShadow(0.6),
    SPEED: numShadow(200),
    GRAVITY: numShadow(300),
  },
  sz_gk_burst: { X: numShadow(100), Y: numShadow(100) },
  sz_gk_play_tone: { FREQ: numShadow(440), MS: numShadow(200) },
  // 🧙 Kit RPG
  sz_gk_rpg_move_grid: { CELL: numShadow(64) },
  sz_gk_rpg_block_cell: { CX: numShadow(0), CY: numShadow(0) },
  sz_gk_rpg_cell: { N: numShadow(3) },
  sz_gk_rpg_create_npc: { CX: numShadow(3), CY: numShadow(3) },
  sz_gk_rpg_say: { TEXT: txtShadow('Olá, viajante!'), NAME: txtShadow('Ferreiro') },
  sz_gk_rpg_draw_inventory: { X: numShadow(20), Y: numShadow(20) },
  sz_gk_rpg_create_door: { CX: numShadow(5), CY: numShadow(5) },
  // 🌍 Mundo aberto
  sz_gk_rpg_create_map: { COLS: numShadow(15), ROWS: numShadow(10) },
  sz_gk_rpg_battle_stats: { HP: numShadow(30), STR: numShadow(7), DEF: numShadow(3) },
  sz_gk_rpg_battle_start: { HP: numShadow(20), STR: numShadow(5), DEF: numShadow(2) },
  sz_gk_rpg_add_ally: { HP: numShadow(24), STR: numShadow(6), DEF: numShadow(1) },
  sz_gk_rpg_add_foe: { HP: numShadow(20), STR: numShadow(5), DEF: numShadow(0) },
  sz_gk_rpg_add_boss: { HP: numShadow(120), STR: numShadow(9), DEF: numShadow(2) },
  sz_gk_rpg_define_battler: { HP: numShadow(120), STR: numShadow(9), DEF: numShadow(2) },
  sz_gk_rpg_foe_hit_all: { DMG: numShadow(15) },
  sz_gk_rpg_teach_move: { DMG: numShadow(12), COST: numShadow(3) },
  sz_gk_rpg_teach_heal: { AMOUNT: numShadow(12), COST: numShadow(3) },
  sz_gk_rpg_set_special: { DMG: numShadow(14), COST: numShadow(4) },
  sz_gk_rpg_give_potion: { HEAL: numShadow(20) },
  sz_gk_rpg_battle_reward: { XP: numShadow(20) },
  sz_gk_rpg_inflict: { TURNS: numShadow(3) },
  // 🎬 V6 — cenas & NPCs vivos
  sz_gk_set_walk_sheet: { FW: numShadow(16), FH: numShadow(16) },
  sz_gk_rpg_wait: { SECONDS: numShadow(1) },
  sz_gk_rpg_npc_walk_to: { CX: numShadow(5), CY: numShadow(5) },
  sz_gk_rpg_on_step: { CX: numShadow(5), CY: numShadow(5) },
  sz_gk_rpg_menu: { TITLE: txtShadow('O que fazer?') },
  sz_gk_rpg_option: { LABEL: txtShadow('Sim') },
  // 🗺️ V9 — mundo de tiles & profundidade
  sz_gk_camera_shake: { INT: numShadow(8), SEC: numShadow(0.3) },
  // ⚙️ R11 — física geral
  sz_gk_apply_gravity: { G: numShadow(2160) },
  sz_gk_jump: { FORCE: numShadow(660) },
  sz_gk_set_velocity: { VX: numShadow(0), VY: numShadow(0) },
  sz_gk_set_terminal_velocity: { MAX: numShadow(900) },
  sz_gk_every_seconds: { SECS: numShadow(1) },
  sz_gk_cooldown_ready: { SECS: numShadow(0.5) },
  sz_gk_tile_at: { X: numShadow(0), Y: numShadow(0) },
  sz_gk_set_tile_at: { X: numShadow(0), Y: numShadow(0), INDEX: numShadow(0) },
  sz_gk_set_tile_size: { PX: numShadow(64) },
  sz_gk_set_property: { VALUE: numShadow(0) },
  sz_gk_tween_to: { X: numShadow(100), Y: numShadow(100), SECS: numShadow(0.5) },
  // 👾 R16 — Kit Monstrinhos
  sz_gk_pkm_creature: {
    HP: numShadow(30),
    STR: numShadow(8),
    DEF: numShadow(4),
    SPD: numShadow(5),
  },
  sz_gk_pkm_move: { DMG: numShadow(20), ACC: numShadow(100) },
  sz_gk_pkm_type_chart: { MULT: numShadow(2) },
  sz_gk_pkm_evolve: { LEVEL: numShadow(8) },
  sz_gk_pkm_give: { LEVEL: numShadow(5) },
  sz_gk_pkm_give_ball: { COUNT: numShadow(5), POWER: numShadow(60) },
  sz_gk_pkm_draw_team: { X: numShadow(10), Y: numShadow(10) },
  sz_gk_pkm_grass_cells: {
    X1: numShadow(5),
    Y1: numShadow(6),
    X2: numShadow(13),
    Y2: numShadow(10),
  },
  sz_gk_pkm_grass_tiles: { INDEX: numShadow(3) },
  sz_gk_pkm_wild: { MIN: numShadow(3), MAX: numShadow(6) },
  sz_gk_pkm_encounter_rate: { PCT: numShadow(20) },
  sz_gk_pkm_battle_wild: { LEVEL: numShadow(5) },
  sz_gk_pkm_trainer_creature: { LEVEL: numShadow(5) },
  // 🧭 R15 — primitivos gerais
  sz_gk_define_region: {
    X: numShadow(100),
    Y: numShadow(100),
    W: numShadow(200),
    H: numShadow(200),
  },
  sz_gk_chance: { PCT: numShadow(50) },
  sz_gk_point_in: { X: numShadow(0), Y: numShadow(0) },
  sz_gk_launch_to_point: { X: numShadow(0), Y: numShadow(0), SPEED: numShadow(400) },
  sz_gk_set_velocity_angle: { DEG: numShadow(0), FORCE: numShadow(200) },
  sz_gk_set_opacity: { PCT: numShadow(100) },
  sz_gk_fade_to: { PCT: numShadow(0), SECS: numShadow(0.5) },
  sz_gk_tween_property: { TO: numShadow(100), SECS: numShadow(0.5) },
  sz_gk_set_hitbox: { OX: numShadow(0), OY: numShadow(0), W: numShadow(0), H: numShadow(0) },
  sz_gk_set_hitbox_shape: { RADIUS: numShadow(0) },
  sz_gk_swing_window: { START: numShadow(0.08), ACTIVE: numShadow(0.08) },
  sz_gk_luta_match: { ROUNDS: numShadow(3), SECS: numShadow(60) },
  sz_gk_luta_move: { DMG: numShadow(10), RANGE: numShadow(50) },
  sz_gk_luta_move_anim: { FROM: numShadow(0), TO: numShadow(3) },
  sz_gk_play_anim_once: { FROM: numShadow(0), TO: numShadow(3), FPS: numShadow(10) },
  sz_gk_set_entity_state: { SECS: numShadow(0.3) },
  sz_gk_state_anim: { FROM: numShadow(0), TO: numShadow(3), FPS: numShadow(8) },
  sz_gk_thrust: { DEG: numShadow(0), FORCE: numShadow(6000) },
  sz_gk_apply_friction: { FACTOR: numShadow(0.9) },
  sz_gk_wait: { SECS: numShadow(1) },
  sz_gk_nearest_active: { X: numShadow(0), Y: numShadow(0) },
  // 🛤️ R25 — caminhos + paralaxe + explosão por folha
  sz_gk_path_point: { X: numShadow(100), Y: numShadow(100) },
  sz_gk_follow_path: { SPEED: numShadow(120) },
  sz_gk_roll_dice: { FACES: numShadow(6) },
  sz_gk_players_setup: { N: numShadow(2) },
  sz_gk_move_along_track: { SPACES: numShadow(1) },
  sz_gk_parallax_layer: { FX: numShadow(0.3), FY: numShadow(1) },
  sz_gk_sheet_burst: {
    FRAMES: numShadow(4),
    FPS: numShadow(12),
    X: numShadow(100),
    Y: numShadow(100),
    SIZE: numShadow(64),
  },
  // 🏰 R26 — Kit Defesa de Torre
  sz_gk_td_slot: { X: numShadow(100), Y: numShadow(100), SIZE: numShadow(64) },
  sz_gk_td_on_buy: { COST: numShadow(50) },
  sz_gk_td_free_slot: { X: numShadow(100), Y: numShadow(100) },
  sz_gk_td_draw_range: { RADIUS: numShadow(220) },
  sz_gk_td_wave: { COUNT: numShadow(3), GAP: numShadow(150), SPEED: numShadow(90) },
  sz_gk_td_set_coins: { N: numShadow(100) },
  sz_gk_td_add_coins: { N: numShadow(25) },
  // R21 — primitivos gerais
  sz_gk_float_text: {
    TEXT: txtShadow('+100'),
    X: numShadow(100),
    Y: numShadow(100),
    SIZE: numShadow(24),
  },
  sz_gk_trail_on: { SIZE: numShadow(3), RATE: numShadow(30), LIFE: numShadow(0.4) },
  sz_gk_shockwave: {
    X: numShadow(100),
    Y: numShadow(100),
    RADIUS: numShadow(200),
    SECS: numShadow(0.4),
  },
  sz_gk_scroll_image: { VX: numShadow(0), VY: numShadow(20) },
  sz_gk_lean_on_move: { DEG: numShadow(10) },
  sz_gk_fan_shot: {
    COUNT: numShadow(3),
    ARC: numShadow(30),
    DEG: numShadow(-90),
    SPEED: numShadow(600),
  },
  // 🚀 R22 — Kit Nave
  sz_gk_nave_ship: { SPEED: numShadow(420), LEAN: numShadow(10) },
  sz_gk_nave_powerup: { SECS: numShadow(5) },
  sz_gk_nave_wave: {
    COLS: numShadow(8),
    ROWS: numShadow(3),
    GAP: numShadow(60),
    SPEED: numShadow(150),
    DROP: numShadow(30),
    ACCEL: numShadow(15),
  },
  sz_gk_nave_wave_shooter: { SECS: numShadow(1.5), SPEED: numShadow(300) },
  sz_gk_nave_invasion_line: { Y: numShadow(0) },
  sz_gk_nave_starfield: { COUNT: numShadow(100), SPEED: numShadow(20) },
  sz_gk_nave_bomb: { RADIUS: numShadow(200) },
  sz_gk_fade_screen: { SECS: numShadow(0.4) },
  sz_gk_flash_screen: { TIMES: numShadow(3) },
  sz_gk_save_value: { VALUE: numShadow(0) },
  sz_gk_set_volume: { LEVEL: numShadow(1) },
  sz_gk_create_empty_tilemap: { COLS: numShadow(20), ROWS: numShadow(15), FILL: numShadow(-1) },
  // 🏃 R12 — Kit Plataforma
  sz_gk_plat_hero: { SPEED: numShadow(240), JUMP: numShadow(660) },
  sz_gk_plat_jump_feel: {
    COYOTE: numShadow(0.1),
    BUFFER: numShadow(0.1),
    HOLD: numShadow(0.3),
    GRAVITY: numShadow(2160),
  },
  sz_gk_plat_double_jump: { FORCE: numShadow(600), TIMES: numShadow(1) },
  sz_gk_plat_wall_slide: { SPEED: numShadow(90) },
  sz_gk_plat_wall_jump: { FX: numShadow(300), FY: numShadow(660) },
  sz_gk_plat_ladder: { TILE: numShadow(2), SPEED: numShadow(160) },
  sz_gk_plat_moving: {
    X1: numShadow(100),
    Y1: numShadow(300),
    X2: numShadow(400),
    Y2: numShadow(300),
    SECS: numShadow(2),
  },
  sz_gk_plat_stomp: { BOUNCE: numShadow(400) },
  sz_gk_plat_patrol_wall: { SPEED: numShadow(60) },
  sz_gk_plat_checkpoint: { X: numShadow(100), Y: numShadow(100) },
  sz_gk_plat_state_frames: { FROM: numShadow(0), TO: numShadow(3), FPS: numShadow(8) },
  // 🥷 V10 — ação em tempo real
  sz_gk_attack_facing: { RANGE: numShadow(40), DUR: numShadow(0.3) },
  sz_gk_patrol_around: { OX: numShadow(400), OY: numShadow(300), RADIUS: numShadow(80) },
  sz_gk_draw_hearts: { CUR: numShadow(3), MAX: numShadow(3), X: numShadow(20), Y: numShadow(20) },
}

/**
 * (só p/ teste de drift) Tipo do literal de SOMBRA por soquete da paleta — todo
 * soquete daqui precisa constar em `LEGACY_VALUE_FIELDS` com o kind casado
 * (restaura a shadow-ness na reconstrução IR→blocos).
 */
export const GK_SOCKET_SHADOW_TYPES: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(GK_SOCKET_SHADOWS).map(([type, slots]) => [
    type,
    Object.fromEntries(
      Object.entries(slots).map(([slot, wrapper]) => [
        slot,
        String((wrapper as { shadow?: { type?: string } }).shadow?.type ?? ''),
      ]),
    ),
  ]),
)

const toolboxBlock = (type: string) => {
  const inputs = GK_SOCKET_SHADOWS[type]
  return inputs ? { kind: 'block' as const, type, inputs } : { kind: 'block' as const, type }
}

// R23: os kits viram chips-PAI — o 1º nível fica com as ~29 gerais + 6 kits
// (🏃 🥊 🧙 👾 🚀 🏰) em vez de 44 chips planos; as sub-categorias abrem DENTRO
// do pai (a toolbox é recursiva; filtros/poda/testes já recursam). Os NOMES
// das filhas mantêm o prefixo "Kit X:" — a doc os cita e o docDrift os casa.
// R24: o pai tem tom-base PRÓPRIO (KIT_BASES); as filhas são sombras dele.
const topLevelCats: ExtensionToolboxCategory[] = []
const kitParents = new Map<string, ExtensionToolboxCategory>()
for (const sc of SUBCATS) {
  const child: ExtensionToolboxCategory = {
    kind: 'category',
    name: sc.name,
    colour: sc.colour,
    contents: sc.types.filter((type) => VISIBLE_BLOCK_TYPES.has(type)).map(toolboxBlock),
  }
  if (!sc.kit) {
    topLevelCats.push(child)
    continue
  }
  let parent = kitParents.get(sc.kit)
  if (!parent) {
    parent = {
      kind: 'category',
      name: sc.kit,
      colour: KIT_BASES.get(sc.kit) ?? sc.colour,
      contents: [],
    }
    kitParents.set(sc.kit, parent)
    topLevelCats.push(parent)
  }
  parent.contents.push(child)
}

export const gameKitToolboxCategory: ExtensionToolboxCategory = {
  kind: 'category',
  name: 'Jogo 2D Avançado',
  colour: C,
  contents: [
    ...topLevelCats,
    ...(leftover.length > 0
      ? [
          {
            kind: 'category' as const,
            name: 'Mais',
            colour: C,
            contents: leftover.map(toolboxBlock),
          },
        ]
      : []),
  ],
}

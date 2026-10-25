import type { BlockDefinition } from '../../blockly/blocks/types'
import type { ExtensionToolboxCategory } from '../../extensions/toolboxTypes'
import { buildExtensionPalette } from '../extensionPalette'
import { sceneBlocks, sceneShadows } from '../scene-2d/blocks'
import { gameKitBlockDefinitions01 } from './blocks/definitions01'
import { gameKitBlockDefinitions02 } from './blocks/definitions02'
import { gameKitBlockDefinitions03 } from './blocks/definitions03'
import { gameKitBlockDefinitions04 } from './blocks/definitions04'
import { gameKitBlockDefinitions05 } from './blocks/definitions05'
import { gameKitBlockDefinitions06 } from './blocks/definitions06'
import { gameKitBlockDefinitions07 } from './blocks/definitions07'
import { GAME_KIT_COLOUR as C } from './blocks/shared'
import { GAME_KIT_DRAWING_SHADOWS, gameKitDrawingBlocks } from './drawingBlocks'
import { GAME_KIT_PALETTE } from './palette'

const gameKitBlockDefinitions: BlockDefinition[] = [
  ...sceneBlocks('gk'),
  ...gameKitBlockDefinitions01,
  ...gameKitBlockDefinitions02,
  ...gameKitBlockDefinitions03,
  ...gameKitBlockDefinitions04,
  ...gameKitBlockDefinitions05,
  ...gameKitBlockDefinitions06,
  ...gameKitBlockDefinitions07,
  ...gameKitDrawingBlocks,
]

// Sombras pré-preenchidas dos soquetes de VALOR que aparecem na paleta.
const txtShadow = (text: string) => ({ shadow: { type: 'sz_val_text', fields: { TEXT: text } } })
const numShadow = (value: number) => ({ shadow: { type: 'sz_val_number', fields: { NUM: value } } })
export const GK_SOCKET_SHADOWS: Record<string, Record<string, unknown>> = {
  ...GAME_KIT_DRAWING_SHADOWS,
  ...sceneShadows('gk'),
  sz_gk_setup: { W: numShadow(1280), H: numShadow(720) },
  sz_gk_fixed_setup: { SEED: numShadow(2026) },
  sz_gk_define_campaign: {
    VERSION: numShadow(1),
    PLAYERS: numShadow(1),
    SEED: numShadow(2026),
    REQUIRED_GEMS: numShadow(0),
  },
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
  sz_gk_draw_counter: {
    LABEL: txtShadow('Pontos'),
    VALUE: numShadow(0),
    X: numShadow(24),
    Y: numShadow(24),
  },
  sz_gk_set_health: { LIVES: numShadow(3) },
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

const palette = buildExtensionPalette({
  name: 'Jogo 2D Avançado',
  colour: C,
  tree: GAME_KIT_PALETTE,
  blocks: gameKitBlockDefinitions,
  shadows: GK_SOCKET_SHADOWS,
  order: 'source',
})

export const gameKitBlocks: BlockDefinition[] = palette.blocks

export const gameKitToolboxCategory: ExtensionToolboxCategory = palette.toolbox

import { categoryShades } from '../../blockly/colorShades'
import type { ExtensionToolboxCategory } from '../../extensions/toolboxTypes'
import { gameTwoDBlocks as canonicalGameTwoDBlocks } from './blockCatalog'
import { GAME_TWO_D_PALETTE } from './palette'

const C = '#ec4899'

const FAMILY_SHADES = categoryShades(C, GAME_TWO_D_PALETTE.length)
const COLOUR_BY_TYPE = new Map<string, string>(
  GAME_TWO_D_PALETTE.flatMap((family, index) =>
    family.sections.flatMap((section) =>
      section.types.map((type) => [type, FAMILY_SHADES[index] ?? C] as const),
    ),
  ),
)
const ORDER_BY_TYPE = new Map([...COLOUR_BY_TYPE.keys()].map((type, index) => [type, index]))
export const gameTwoDBlocks = canonicalGameTwoDBlocks
  .map((block) => ({
    ...block,
    colour: COLOUR_BY_TYPE.get(block.type) ?? block.colour,
  }))
  .sort(
    (a, b) =>
      (ORDER_BY_TYPE.get(a.type) ?? Number.MAX_SAFE_INTEGER) -
      (ORDER_BY_TYPE.get(b.type) ?? Number.MAX_SAFE_INTEGER),
  )
const VISIBLE_BLOCK_TYPES = new Set(
  gameTwoDBlocks.filter((block) => !block.hidden).map((block) => block.type),
)

// Sombras pré-preenchidas dos slots de VALOR que aparecem na paleta: o aluno pode
// digitar o texto direto (UX igual à de antes) E ainda trocar por uma variável,
// "juntar texto" ou o resultado de uma função.
const txtShadow = (text: string) => ({ shadow: { type: 'sz_val_text', fields: { TEXT: text } } })
const numShadow = (value: number) => ({ shadow: { type: 'sz_val_number', fields: { NUM: value } } })
// Cor com OPACIDADE (0% = invisível, 100% = sólida). Opacidade 0 é o jeito de a
// paleta oferecer o SELETOR de cor sem estrear o bloco com um retângulo que ninguém
// pediu: a criança escolhe a cor e sobe o número para ela aparecer.
const colShadow = (color: string, alpha: number) => ({
  shadow: { type: 'sz_val_color_alpha', fields: { COLOR: color, ALPHA: alpha } },
})
const G2D_SOCKET_SHADOWS: Record<string, Record<string, unknown>> = {
  sz_g2d_with_cooldown: { FRAMES: numShadow(30) },
  sz_g2d_create_text_sprite: { TEXT: txtShadow('Olá!'), X: numShadow(100), Y: numShadow(100) },
  sz_g2d_spawn_text_in_group: { TEXT: numShadow(1), X: numShadow(100), Y: numShadow(100) },
  sz_g2d_set_sprite_text: { TEXT: txtShadow('Olá!') },
  sz_g2d_set_text_style: { SIZE: numShadow(32) },
  sz_g2d_set_text_box: {
    WIDTH: numShadow(240),
    PADDING: numShadow(12),
    BACKGROUND: colShadow('#000000', 0),
  },
  sz_g2d_set_sprite_data: { VALUE: numShadow(0) },
  sz_g2d_sprite_data: { FALLBACK: numShadow(0) },
  sz_g2d_show_screen: {
    TITLE: txtShadow('Nave contra Asteroides'),
    SUBTITLE: txtShadow('Destrua os asteroides!'),
    HINT: txtShadow('Aperte Enter para começar'),
  },
  sz_g2d_create_sprite: {
    X: numShadow(100),
    Y: numShadow(100),
    W: numShadow(40),
    H: numShadow(40),
  },
  sz_g2d_create_image_sprite: {
    X: numShadow(100),
    Y: numShadow(100),
    W: numShadow(40),
    H: numShadow(40),
  },
  sz_g2d_create_ship: { X: numShadow(180), Y: numShadow(250), W: numShadow(54), H: numShadow(62) },
  sz_g2d_create_dino: { X: numShadow(120), Y: numShadow(150), SIZE: numShadow(64) },
  sz_g2d_set_position: { X: numShadow(0), Y: numShadow(0) },
  sz_g2d_set_velocity: { VX: numShadow(0), VY: numShadow(0) },
  sz_g2d_set_size: { W: numShadow(40), H: numShadow(40) },
  sz_g2d_scale_sprite: { FACTOR: numShadow(1.5) },
  sz_g2d_scale_text_size: { FACTOR: numShadow(1.5) },

  sz_g2d_game_over: { TEXT: txtShadow('Fim de jogo') },
  sz_g2d_set_health: { AMOUNT: numShadow(3) },
  sz_g2d_change_health: { DELTA: numShadow(-1) },
  sz_g2d_damage_sprite: { AMOUNT: numShadow(1), FRAMES: numShadow(45) },
  sz_g2d_top_down: { SPEED: numShadow(3) },
  sz_g2d_fly_free: { SPEED: numShadow(3) },
  sz_g2d_flap: { FORCE: numShadow(8) },
  sz_g2d_swim: { SPEED: numShadow(2) },
  sz_g2d_follow_pointer: { SPEED: numShadow(3) },
  sz_g2d_arrows_x: { SPEED: numShadow(6) },
  sz_g2d_arrows_y: { SPEED: numShadow(5) },
  sz_g2d_paddle_bounce: { BOOST: numShadow(5) },
  sz_g2d_rotate_sprite: { DEG: numShadow(15) },
  sz_g2d_point_sprite: { DEG: numShadow(0) },
  sz_g2d_thrust: { FORCE: numShadow(0.1) },
  sz_g2d_apply_friction: { FACTOR: numShadow(0.97) },
  sz_g2d_move_toward: { SPEED: numShadow(2) },
  sz_g2d_platformer: { SPEED: numShadow(4), JUMP: numShadow(11) },
  sz_g2d_platformer_terrain: { SPEED: numShadow(4), JUMP: numShadow(11) },
  sz_g2d_classic_platformer: { SPEED: numShadow(2.5), JUMP: numShadow(7) },
  sz_g2d_jump_on_ground: { JUMP: numShadow(14) },
  sz_g2d_jump_terrain: { JUMP: numShadow(14) },
  sz_g2d_control_dino: { JUMP: numShadow(15) },
  sz_g2d_steer_thrust: { SPEED: numShadow(3), TURN: numShadow(3) },
  sz_g2d_shoot_from: { SPEED: numShadow(6) },
  sz_g2d_set_gravity: { VALUE: numShadow(0.5) },
  sz_g2d_set_opacity: { PERCENT: numShadow(50) },
  sz_g2d_starfield: { SPEED: numShadow(1) },
  sz_g2d_blink: { FRAMES: numShadow(60) },
  sz_g2d_forest: { SPEED: numShadow(4) },

  sz_g2d_show_fps: { X: numShadow(8), Y: numShadow(20) },
  sz_g2d_stage_border: { WIDTH: numShadow(4) },
  sz_g2d_shake: { INTENSITY: numShadow(8) },
  sz_g2d_emit_particles: { COUNT: numShadow(14), X: numShadow(150), Y: numShadow(100) },
  sz_g2d_draw_score: {
    VALUE: numShadow(0),
    X: numShadow(12),
    Y: numShadow(30),
    SIZE: numShadow(24),
  },
  sz_g2d_draw_label: {
    TEXT: txtShadow('Nave contra Asteroides'),
    X: numShadow(12),
    Y: numShadow(30),
    SIZE: numShadow(20),
  },
  sz_g2d_draw_pixel_text: { X: numShadow(8), Y: numShadow(8), SIZE: numShadow(2) },
  sz_g2d_draw_pixel_score: {
    VALUE: numShadow(0),
    X: numShadow(8),
    Y: numShadow(8),
    SIZE: numShadow(2),
  },
  sz_g2d_draw_fade: { PERCENT: numShadow(0) },

  sz_g2d_draw_sprite_health: { X: numShadow(12), Y: numShadow(48), SIZE: numShadow(22) },
  sz_g2d_draw_bar: {
    VALUE: numShadow(0),
    MAX: numShadow(100),
    X: numShadow(12),
    Y: numShadow(48),
    W: numShadow(160),
    H: numShadow(14),
  },
  sz_g2d_stickhero_sprite: { W: numShadow(18), H: numShadow(36) },
  sz_g2d_stickpath_grow: { SPEED: numShadow(1) },
  sz_g2d_stickpath_walk: { SPEED: numShadow(1) },
  sz_g2d_balloon_sprite: {
    X: numShadow(110),
    Y: numShadow(195),
    W: numShadow(70),
    H: numShadow(100),
  },
  sz_g2d_balloon_fire: { FORCE: numShadow(1) },
  sz_g2d_balloonpath_scroll: { SPEED: numShadow(1) },
  sz_g2d_play_sound: { FREQ: numShadow(440), MS: numShadow(200) },
  sz_g2d_play_note: { MS: numShadow(300) },
  sz_g2d_set_volume: { LEVEL: numShadow(8) },
  sz_g2d_setup_stage: { W: numShadow(800), H: numShadow(480) },
  sz_g2d_fit_screen: { PERCENT: numShadow(100) },
  sz_g2d_load_spritesheet: { FW: numShadow(32), FH: numShadow(32) },
  sz_g2d_animate_sprite: { FROM: numShadow(0), TO: numShadow(3), FPS: numShadow(8) },
  sz_g2d_animate_once: { FROM: numShadow(0), TO: numShadow(3), FPS: numShadow(8) },
  sz_g2d_set_state_anim: { FROM: numShadow(0), TO: numShadow(3), FPS: numShadow(8) },
  sz_g2d_create_shape_sprite: {
    X: numShadow(100),
    Y: numShadow(100),
    W: numShadow(32),
    H: numShadow(32),
  },
  sz_g2d_paint_rect: { X: numShadow(0), Y: numShadow(0), W: numShadow(20), H: numShadow(20) },
  sz_g2d_paint_circle: { X: numShadow(16), Y: numShadow(16), R: numShadow(10) },
  sz_g2d_paint_ellipse: { X: numShadow(0), Y: numShadow(0), W: numShadow(24), H: numShadow(16) },
  sz_g2d_paint_triangle: {
    X1: numShadow(16),
    Y1: numShadow(0),
    X2: numShadow(0),
    Y2: numShadow(28),
    X3: numShadow(32),
    Y3: numShadow(28),
  },
  sz_g2d_paint_line: {
    X1: numShadow(0),
    Y1: numShadow(0),
    X2: numShadow(24),
    Y2: numShadow(24),
    WIDTH: numShadow(2),
  },
  sz_g2d_define_enemy_smart: {
    HP: numShadow(3),
    SPEED: numShadow(2),
    DMG: numShadow(1),
    W: numShadow(32),
    H: numShadow(32),
  },
  sz_g2d_define_enemy_type: {
    HP: numShadow(3),
    SPEED: numShadow(2),
    DMG: numShadow(1),
    W: numShadow(32),
    H: numShadow(32),
  },
  sz_g2d_enemy_state_anim: { FROM: numShadow(0), TO: numShadow(3), FPS: numShadow(8) },
  sz_g2d_enemy_type_param: { VALUE: numShadow(10) },
  sz_g2d_spawn_enemy: { X: numShadow(100), Y: numShadow(100) },
  sz_g2d_stomp_enemy: { BOUNCE: numShadow(8) },
  sz_g2d_create_vector_tileset: { SIZE: numShadow(16) },
  sz_g2d_load_vector_campaign_level: {
    INDEX: numShadow(1),
    SIZE: numShadow(16),
    X: numShadow(32),
    Y: numShadow(32),
    JOURNEY: numShadow(1),
  },
  sz_g2d_campaign_value: { FALLBACK: numShadow(0) },
  sz_g2d_define_vector_tile: { INDEX: numShadow(0) },
  sz_g2d_set_tile_at_contact: { INDEX: numShadow(-1) },
  sz_g2d_draw_frame: {
    INDEX: numShadow(0),
    X: numShadow(100),
    Y: numShadow(100),
    W: numShadow(40),
    H: numShadow(40),
  },
  sz_g2d_set_tile: { INDEX: numShadow(1) },
  sz_g2d_create_tilemap: { TILE: numShadow(32) },

  sz_g2d_place_tilemap: { X: numShadow(0), Y: numShadow(0), SIZE: numShadow(32) },
  sz_g2d_create_world: { W: numShadow(800), H: numShadow(512) },
  sz_g2d_create_world_from_tilemap: { SIZE: numShadow(32) },
  sz_g2d_world_camera: { DEAD_X: numShadow(160), DEAD_Y: numShadow(96) },
  sz_g2d_create_level: { X: numShadow(32), Y: numShadow(32) },
  // Todos os soquetes de VALOR nascem preenchidos: soquete vazio compila para
  // `undefined` → o sprite nasce em posição/velocidade inválida (NaN) sem pista.
  sz_g2d_spawn_in_group: {
    X: numShadow(100),
    Y: numShadow(100),
    W: numShadow(24),
    H: numShadow(24),
    VX: numShadow(0),
    VY: numShadow(0),
  },
  sz_g2d_spawn_image_in_group: {
    X: numShadow(100),
    Y: numShadow(100),
    W: numShadow(32),
    H: numShadow(32),
    VX: numShadow(0),
    VY: numShadow(0),
  },
  sz_g2d_spawn_bullet: {
    X: numShadow(100),
    Y: numShadow(100),
    R: numShadow(5),
    VX: numShadow(0),
    VY: numShadow(-4),
  },
  sz_g2d_spawn_asteroid: {
    X: numShadow(100),
    Y: numShadow(100),
    SIZE: numShadow(40),
    VX: numShadow(0),
    VY: numShadow(2),
  },
  sz_g2d_spawn_asteroid_edge: { SIZE: numShadow(40), SPEED: numShadow(1.5) },
  sz_g2d_spawn_obstacle: { X: numShadow(400), SIZE: numShadow(44), VX: numShadow(-3) },
  sz_g2d_spawn_egg: { X: numShadow(400), Y: numShadow(100), VX: numShadow(-3) },
  sz_g2d_prune_old: { SECONDS: numShadow(2) },
  sz_g2d_every_frames: { N: numShadow(30) },
  sz_g2d_every_seconds: { SECS: numShadow(2) },
  sz_g2d_after_seconds: { SECS: numShadow(3) },
  sz_g2d_set_hitbox_scale: { PERCENT: numShadow(80) },
  sz_g2d_random_between: { MIN: numShadow(1), MAX: numShadow(6) },
  sz_g2d_random_chance: { PERCENT: numShadow(30) },
  sz_g2d_cooldown_ready: { FRAMES: numShadow(20) },
}

/** Tipos das sombras atuais para verificar preenchimentos na passagem pela Ponte. */
export const G2D_SOCKET_SHADOW_TYPES: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(G2D_SOCKET_SHADOWS).map(([type, slots]) => [
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
  const inputs = G2D_SOCKET_SHADOWS[type]
  return inputs ? { kind: 'block' as const, type, inputs } : { kind: 'block' as const, type }
}

export const gameTwoDToolboxCategory: ExtensionToolboxCategory = {
  kind: 'category',
  name: 'Jogo 2D',
  colour: C,
  contents: GAME_TWO_D_PALETTE.map((family, index) => ({
    kind: 'category',
    name: family.name,
    colour: FAMILY_SHADES[index] ?? C,
    contents: family.sections.map((section) => ({
      kind: 'category',
      name: section.name,
      colour: FAMILY_SHADES[index] ?? C,
      contents: section.types.filter((type) => VISIBLE_BLOCK_TYPES.has(type)).map(toolboxBlock),
    })),
  })),
}

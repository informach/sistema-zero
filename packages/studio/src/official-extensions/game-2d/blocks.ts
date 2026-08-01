import type { ExtensionToolboxCategory } from '#extensions'
import { categoryShades } from '../../blockly/colorShades'
import { gameTwoDBlocks } from './blockCatalog'

const C = '#ec4899'

/**
 * Sub-categorias do Jogo 2D (à la Scratch/MakeCode), na ordem do fluxo mental: o
 * que aparece → como mexe → quando algo acontece → perguntas → enfeites → cenário.
 * ⚠️ A `colour` de cada entrada abaixo é só um PLACEHOLDER: logo após o array,
 * `SUBCAT_SHADES` reescreve TODAS para tons do rosa da categoria (o Jogo 2D é uma
 * cor só no arco-íris da paleta; a distinção entre grupos é pelo NOME/emoji, não
 * pela cor). Mudar o literal aqui não muda nada — ajuste `categoryShades(C, …)`.
 */
const SUBCATS: { name: string; colour: string; types: string[] }[] = [
  {
    name: '🎮 Sprites',
    colour: '#4c97ff',
    types: [
      'sz_g2d_create_sprite',
      'sz_g2d_create_image_sprite',
      'sz_g2d_draw_sprite',
      'sz_g2d_set_image',
      'sz_g2d_set_position',
      'sz_g2d_set_velocity',
    ],
  },
  {
    name: '📐 Posição & tamanho',
    colour: '#4c97ff',
    types: [
      'sz_g2d_sprite_x',
      'sz_g2d_sprite_y',
      'sz_g2d_sprite_w',
      'sz_g2d_sprite_h',
      'sz_g2d_center_x',
      'sz_g2d_center_y',
    ],
  },
  {
    name: '💨 Velocidade',
    colour: '#4c97ff',
    types: [
      'sz_g2d_sprite_vx',
      'sz_g2d_sprite_vy',
      'sz_g2d_sprite_speed',
      'sz_g2d_is_moving',
      'sz_g2d_is_moving_h',
      'sz_g2d_is_moving_v',
    ],
  },
  {
    name: '📦 Muitos',
    colour: '#3373cc',
    types: [
      'sz_g2d_create_group',
      'sz_g2d_spawn_in_group',
      'sz_g2d_spawn_image_in_group',
      'sz_g2d_spawn_bullet',
      'sz_g2d_update_group',
      'sz_g2d_update_group_no_gravity',
      'sz_g2d_draw_group',
      'sz_g2d_draw_group_by_y',
      'sz_g2d_for_each_in_group',
      'sz_g2d_count_group',
      'sz_g2d_clear_group',
      'sz_g2d_prune_offscreen',
      'sz_g2d_remove_from_group',
      'sz_g2d_bring_to_front',
      'sz_g2d_send_to_back',
    ],
  },
  {
    name: '😈 Inimigos',
    colour: '#8a55d7',
    types: [
      'sz_g2d_define_enemy_type',
      'sz_g2d_spawn_enemy',
      'sz_g2d_update_enemy_type',
      'sz_g2d_draw_enemy_type',
      'sz_g2d_enemy_state_anim',
      'sz_g2d_enemy_type_param',
      'sz_g2d_on_enemy_defeated',
      'sz_g2d_on_enemy_shot_hit',
      'sz_g2d_hurt_by_enemy',
      'sz_g2d_enemy_damage',
    ],
  },
  {
    name: '🕹️ Movimento',
    colour: '#4cbfe6',
    types: [
      'sz_g2d_platformer',
      'sz_g2d_top_down',
      'sz_g2d_fly_free',
      'sz_g2d_flap',
      'sz_g2d_swim',
      'sz_g2d_arrows_x',
      'sz_g2d_follow_pointer',
      'sz_g2d_clamp_to_screen',
      'sz_g2d_apply_velocity',
      'sz_g2d_set_gravity',
      'sz_g2d_bounce_edges',
      'sz_g2d_drag_x',
      'sz_g2d_jump_on_ground',
      'sz_g2d_steer_thrust',
      'sz_g2d_rotate_sprite',
      'sz_g2d_point_sprite',
      'sz_g2d_thrust',
      'sz_g2d_apply_friction',
      'sz_g2d_sprite_angle',
      'sz_g2d_wrap_edges',
    ],
  },
  {
    name: '🎛️ Controles',
    colour: '#ffbf00',
    types: ['sz_g2d_on_key', 'sz_g2d_on_pointer', 'sz_g2d_key_down', 'sz_g2d_pointer_down'],
  },
  {
    name: '💥 Colisões',
    colour: '#ff8c1a',
    types: [
      'sz_g2d_on_overlap',
      'sz_g2d_touches',
      'sz_g2d_collides',
      'sz_g2d_circle_collides',
      'sz_g2d_set_hitbox_scale',
      'sz_g2d_collide_group',
      'sz_g2d_collide_sprite',
      'sz_g2d_on_group_overlap',
      'sz_g2d_on_sprite_group_overlap',
    ],
  },
  {
    name: '⏱️ Tempo e repetição',
    colour: '#ffbf00',
    types: [
      'sz_g2d_update_each_frame',
      'sz_g2d_every_frames',
      'sz_g2d_every_seconds',
      'sz_g2d_after_seconds',
      'sz_g2d_cooldown_ready',
      'sz_g2d_prune_old',
    ],
  },
  {
    name: '🎯 Mira e contas',
    colour: '#48b8d0',
    types: [
      'sz_g2d_aim_at',
      'sz_g2d_move_toward',
      'sz_g2d_angle_to',
      'sz_g2d_distance',
      'sz_g2d_random_between',
      'sz_g2d_random_chance',
      'sz_g2d_random_x',
      'sz_g2d_random_y',
    ],
  },
  {
    name: '❤️ Vida',
    colour: '#ff5c8d',
    types: [
      'sz_g2d_set_health',
      'sz_g2d_change_health',
      'sz_g2d_damage_sprite',
      'sz_g2d_get_health',
      'sz_g2d_get_max_health',
      'sz_g2d_has_health',
      'sz_g2d_health_depleted',
      'sz_g2d_is_invincible',
      'sz_g2d_draw_sprite_health',
    ],
  },
  {
    name: '✨ Aparência',
    colour: '#9966ff',
    types: [
      'sz_g2d_clear',
      'sz_g2d_setup_stage',
      'sz_g2d_setup_full',
      'sz_g2d_fit_screen',
      'sz_g2d_blink',
      'sz_g2d_flash',
      'sz_g2d_shake',
      'sz_g2d_emit_particles',
      'sz_g2d_draw_particles',
      'sz_g2d_flip_sprite',
      'sz_g2d_set_opacity',
      'sz_g2d_set_size',
      'sz_g2d_scale_sprite',
      'sz_g2d_draw_hitbox',
      'sz_g2d_show_fps',
      'sz_g2d_stage_border',
    ],
  },
  {
    name: '🎬 Animação',
    colour: '#cf63cf',
    types: [
      'sz_g2d_load_spritesheet',
      'sz_g2d_animate_sprite',
      'sz_g2d_set_state_anim',
      'sz_g2d_auto_animate',
      'sz_g2d_draw_frame',
    ],
  },
  {
    name: '🎨 Desenho',
    colour: '#d15fa8',
    types: [
      'sz_g2d_define_shape',
      'sz_g2d_create_shape_sprite',
      'sz_g2d_set_shape',
      'sz_g2d_paint_rect',
      'sz_g2d_paint_circle',
      'sz_g2d_paint_ellipse',
      'sz_g2d_paint_triangle',
      'sz_g2d_paint_line',
      'sz_g2d_shape_w',
      'sz_g2d_shape_h',
    ],
  },
  {
    name: '🔊 Som',
    colour: '#d65cd6',
    types: [
      'sz_g2d_play_fx',
      'sz_g2d_play_sound',
      'sz_g2d_play_note',
      'sz_g2d_play_music',
      'sz_g2d_stop_music',
    ],
  },
  {
    name: '🏆 Placar e HUD',
    colour: '#ff6680',
    types: [
      'sz_g2d_score',
      'sz_g2d_draw_score',
      'sz_g2d_draw_label',
      'sz_g2d_draw_hearts',
      'sz_g2d_draw_bar',
    ],
  },
  {
    name: '📺 Telas e cenas',
    colour: '#1098ad',
    types: [
      'sz_g2d_set_stage_description',
      'sz_g2d_set_scene',
      'sz_g2d_scene_is',
      'sz_g2d_show_screen',
      'sz_g2d_game_over',
      'sz_g2d_pause',
      'sz_g2d_resume',
      'sz_g2d_is_paused',
      'sz_g2d_restart',
    ],
  },
  {
    name: '🗺️ Mapa',
    colour: '#59c059',
    types: [
      'sz_g2d_create_tilemap_from_asset',
      'sz_g2d_create_tilemap',
      'sz_g2d_draw_tilemap',
      'sz_g2d_tilemap_collide',
      'sz_g2d_break_tile_at',
      'sz_g2d_set_tile',
      'sz_g2d_tile_at',
    ],
  },
  {
    name: '🎥 Câmera',
    colour: '#0ea5b7',
    types: ['sz_g2d_camera_follow', 'sz_g2d_set_camera', 'sz_g2d_camera_x', 'sz_g2d_camera_y'],
  },
  // KITS POR TEMA: blocos prontos e NÃO genéricos, feitos para um tipo de jogo
  // específico (desenhos/efeitos/sons daquele tema). Os blocos genéricos seguem
  // nas categorias acima; aqui ficam só os "atalhos temáticos". O 1º kit é o de
  // jogo de nave espacial — dá para ir somando outros kits (corrida, fazenda…).
  {
    name: '🚀 Kit espaço',
    colour: '#7950f2',
    types: [
      'sz_g2d_create_ship',
      'sz_g2d_spawn_asteroid',
      'sz_g2d_spawn_asteroid_edge',
      'sz_g2d_shoot_from',
      'sz_g2d_starfield',
      'sz_g2d_explode',
      'sz_g2d_play_shoot',
      'sz_g2d_play_explosion',
    ],
  },
  {
    name: '🦕 Kit dino',
    colour: '#5fa844',
    types: [
      'sz_g2d_create_dino',
      'sz_g2d_control_dino',
      'sz_g2d_spawn_obstacle',
      'sz_g2d_spawn_egg',
      'sz_g2d_forest',
      'sz_g2d_play_jump',
      'sz_g2d_play_dino_hurt',
      'sz_g2d_play_collect',
    ],
  },
  {
    name: '🦍 Kit gorilas',
    colour: '#a8632e',
    types: [
      'sz_g2d_create_city',
      'sz_g2d_draw_city',
      'sz_g2d_place_thrower',
      'sz_g2d_new_wind',
      'sz_g2d_draw_wind',
      'sz_g2d_aim_drag',
      'sz_g2d_aim_released',
      'sz_g2d_throw_banana',
      'sz_g2d_update_banana',
      'sz_g2d_draw_banana',
      'sz_g2d_banana_hit_thrower',
      'sz_g2d_banana_hit_city',
      'sz_g2d_play_whistle',
      'sz_g2d_play_boom',
      'sz_g2d_computer_turn',
      'sz_g2d_draw_aim_readout',
    ],
  },
  {
    name: '🤸 Kit equilibrista',
    colour: '#0ea5a0',
    types: [
      'sz_g2d_stickhero_sprite',
      'sz_g2d_stickpath_create',
      'sz_g2d_stickpath_scenery',
      'sz_g2d_stickpath_grow',
      'sz_g2d_stickpath_drop',
      'sz_g2d_stickpath_walk',
      'sz_g2d_stickpath_draw',
      'sz_g2d_stickpath_on_cross',
      'sz_g2d_stickpath_on_perfect',
      'sz_g2d_stickpath_fell',
    ],
  },
  {
    name: '🎈 Kit balão',
    colour: '#d6455d',
    types: [
      'sz_g2d_balloon_sprite',
      'sz_g2d_balloonpath_create',
      'sz_g2d_balloonpath_scenery',
      'sz_g2d_balloon_fire',
      'sz_g2d_balloon_fly',
      'sz_g2d_balloonpath_scroll',
      'sz_g2d_balloonpath_on_tree',
      'sz_g2d_balloonpath_meters',
      'sz_g2d_balloon_fuel_left',
      'sz_g2d_balloon_landed_out',
    ],
  },
]

// Cada sub-categoria recebe um TOM do rosa da categoria (claro→escuro),
// derivado da cor base por categoryShades — sobrepõe os literais de SUBCATS.
const SUBCAT_SHADES = categoryShades(C, SUBCATS.length)
SUBCATS.forEach((sc, i) => {
  sc.colour = SUBCAT_SHADES[i] ?? C
})
// Cor = navegação: pinta cada bloco com a cor do seu grupo (sobrepõe o C/EVENT_C
// usado na definição). Mantém os dois em sincronia automaticamente.
const COLOUR_BY_TYPE = new Map<string, string>(
  SUBCATS.flatMap((sc) => sc.types.map((t) => [t, sc.colour] as const)),
)
for (const b of gameTwoDBlocks) {
  const colour = COLOUR_BY_TYPE.get(b.type)
  if (colour) b.colour = colour
}

// Rede de segurança: qualquer bloco que não esteja em nenhuma sub-categoria entra
// num grupo "Mais" — nada some da paleta se um bloco novo esquecer de ser mapeado.
const CATEGORIZED = new Set(SUBCATS.flatMap((sc) => sc.types))
const VISIBLE_BLOCK_TYPES = new Set(
  gameTwoDBlocks.filter((block) => !block.hidden).map((b) => b.type),
)
const leftover = gameTwoDBlocks
  .filter((block) => !block.hidden)
  .map((block) => block.type)
  .filter((type) => !CATEGORIZED.has(type))

// Sombras pré-preenchidas dos slots de VALOR que aparecem na paleta: o aluno pode
// digitar o texto direto (UX igual à de antes) E ainda trocar por uma variável,
// "juntar texto" ou o resultado de uma função.
const txtShadow = (text: string) => ({ shadow: { type: 'sz_val_text', fields: { TEXT: text } } })
const numShadow = (value: number) => ({ shadow: { type: 'sz_val_number', fields: { NUM: value } } })
const G2D_SOCKET_SHADOWS: Record<string, Record<string, unknown>> = {
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
  sz_g2d_score: { INITIAL: numShadow(0) },
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
  sz_g2d_rotate_sprite: { DEG: numShadow(15) },
  sz_g2d_point_sprite: { DEG: numShadow(0) },
  sz_g2d_thrust: { FORCE: numShadow(0.1) },
  sz_g2d_apply_friction: { FACTOR: numShadow(0.97) },
  sz_g2d_move_toward: { SPEED: numShadow(2) },
  sz_g2d_platformer: { SPEED: numShadow(4), JUMP: numShadow(11) },
  sz_g2d_jump_on_ground: { JUMP: numShadow(14) },
  sz_g2d_control_dino: { JUMP: numShadow(15) },
  sz_g2d_steer_thrust: { SPEED: numShadow(3), TURN: numShadow(3) },
  sz_g2d_shoot_from: { SPEED: numShadow(6) },
  sz_g2d_set_gravity: { VALUE: numShadow(0.5) },
  sz_g2d_set_opacity: { PERCENT: numShadow(50) },
  sz_g2d_starfield: { SPEED: numShadow(1) },
  sz_g2d_blink: { FRAMES: numShadow(60) },
  sz_g2d_forest: { SPEED: numShadow(4) },
  sz_g2d_camera_follow: { WORLDW: numShadow(800), WORLDH: numShadow(600) },
  sz_g2d_set_camera: { X: numShadow(0), Y: numShadow(0) },
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
  sz_g2d_draw_label: { X: numShadow(12), Y: numShadow(30), SIZE: numShadow(20) },
  sz_g2d_draw_hearts: {
    COUNT: numShadow(3),
    X: numShadow(12),
    Y: numShadow(48),
    SIZE: numShadow(22),
  },
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
  sz_g2d_setup_stage: { W: numShadow(800), H: numShadow(480) },
  sz_g2d_fit_screen: { PERCENT: numShadow(100) },
  sz_g2d_load_spritesheet: { FW: numShadow(32), FH: numShadow(32) },
  sz_g2d_animate_sprite: { FROM: numShadow(0), TO: numShadow(3), FPS: numShadow(8) },
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
  sz_g2d_draw_frame: {
    INDEX: numShadow(0),
    X: numShadow(100),
    Y: numShadow(100),
    W: numShadow(40),
    H: numShadow(40),
  },
  sz_g2d_set_tile: { INDEX: numShadow(1) },
  sz_g2d_create_tilemap: { TILE: numShadow(32) },
  sz_g2d_draw_tilemap: { X: numShadow(0), Y: numShadow(0), SIZE: numShadow(0) },
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

/**
 * (só p/ teste de drift) Tipo do literal de SOMBRA por soquete da paleta.
 * Todo soquete daqui precisa constar em `LEGACY_VALUE_FIELDS` com o kind
 * casado — é o mapa que restaura a shadow-ness na reconstrução IR→blocos
 * (`shouldEmitAsShadow`/`restoreShadowLiterals`); faltar = os preenchimentos
 * automáticos morrem em silêncio depois de uma passada pela Ponte.
 */
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
  contents: [
    ...SUBCATS.map((sc) => ({
      kind: 'category' as const,
      name: sc.name,
      colour: sc.colour,
      contents: sc.types.filter((type) => VISIBLE_BLOCK_TYPES.has(type)).map(toolboxBlock),
    })),
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

export { gameTwoDBlocks } from './blockCatalog'

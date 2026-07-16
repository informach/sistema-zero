/**
 * MIGRAÇÃO de campos que viraram soquetes de valor (`field_*` → `input_value`).
 *
 * Quando um campo de bloco deixa de ser um "quadradinho" (`field_number`/`field_input`)
 * e passa a ser um soquete oval (`input_value`, que aceita variável/conta/função), os
 * projetos JÁ SALVOS guardam o valor antigo em `fields.X`. Ao carregar, o Blockly
 * descartaria esse `field` órfão (o bloco não tem mais esse campo) e o valor da criança
 * se PERDERIA (cairia no default — sprite na posição errada, placar zerado).
 *
 * Esta migração roda no carregamento (dentro de `normalizeBlocksStateToFrames`), ANTES
 * do `Blockly.serialization.workspaces.load`, e converte `fields.X` em
 * `inputs.X = { shadow: { type: 'sz_val_*', ... } }`, **preservando o valor salvo**.
 *
 * O mapa cresce a cada bloco convertido — deve listar SÓ blocos cujo campo já virou
 * `input_value` (senão criaria um input que o bloco não tem).
 */

/** Para cada tipo de bloco: quais campos viraram soquete e o tipo da sombra. */
export const LEGACY_VALUE_FIELDS: Record<string, Record<string, 'number' | 'text' | 'color'>> = {
  // ⚠️ O mapa também é a fonte de "este soquete carrega um literal-sombra" p/ o
  // round-trip IR→blocos (`shouldEmitAsShadow`) e a cura no load
  // (`restoreShadowLiterals`). Soquetes nascidos JÁ como input_value (nunca foram
  // field) podem — e devem — constar aqui: a migração só dispara se houver um
  // `fields.X` legado no estado salvo, então a entrada é inerte no caminho de
  // migração e ativa a restauração de sombra. Drift guardado por
  // `restoreShadowLiterals.test.ts` contra os presets da paleta das extensões.
  sz_g2d_show_screen: { TITLE: 'text', SUBTITLE: 'text', HINT: 'text' },
  sz_g2d_create_sprite: { X: 'number', Y: 'number', W: 'number', H: 'number' },
  sz_g2d_create_image_sprite: { X: 'number', Y: 'number', W: 'number', H: 'number' },
  sz_g2d_create_ship: { X: 'number', Y: 'number', W: 'number', H: 'number' },
  sz_g2d_create_dino: { X: 'number', Y: 'number', SIZE: 'number' },
  sz_g2d_set_position: { X: 'number', Y: 'number' },
  sz_g2d_set_velocity: { VX: 'number', VY: 'number' },
  sz_g2d_set_size: { W: 'number', H: 'number' },
  sz_g2d_scale_sprite: { FACTOR: 'number' },
  sz_g2d_score: { INITIAL: 'number' },
  sz_g2d_game_over: { TEXT: 'text' },
  sz_g2d_set_health: { AMOUNT: 'number' },
  sz_g2d_change_health: { DELTA: 'number' },
  sz_g2d_top_down: { SPEED: 'number' },
  sz_g2d_follow_pointer: { SPEED: 'number' },
  sz_g2d_arrows_x: { SPEED: 'number' },
  sz_g2d_rotate_sprite: { DEG: 'number' },
  sz_g2d_point_sprite: { DEG: 'number' },
  sz_g2d_thrust: { FORCE: 'number' },
  sz_g2d_apply_friction: { FACTOR: 'number' },
  sz_g2d_move_toward: { SPEED: 'number' },
  sz_g2d_platformer: { SPEED: 'number', JUMP: 'number' },
  sz_g2d_jump_on_ground: { JUMP: 'number' },
  sz_g2d_control_dino: { JUMP: 'number' },
  sz_g2d_steer_thrust: { SPEED: 'number', TURN: 'number' },
  sz_g2d_shoot_from: { SPEED: 'number' },
  sz_g2d_set_gravity: { VALUE: 'number' },
  sz_g2d_set_opacity: { PERCENT: 'number' },
  sz_g2d_starfield: { SPEED: 'number' },
  sz_g2d_blink: { FRAMES: 'number' },
  sz_g2d_forest: { SPEED: 'number' },
  sz_g2d_camera_follow: { WORLDW: 'number', WORLDH: 'number' },
  sz_g2d_set_camera: { X: 'number', Y: 'number' },
  sz_g2d_show_fps: { X: 'number', Y: 'number' },
  sz_g2d_shake: { INTENSITY: 'number' },
  sz_g2d_emit_particles: { COUNT: 'number', X: 'number', Y: 'number' },
  sz_g2d_draw_score: { X: 'number', Y: 'number', SIZE: 'number' },
  sz_g2d_draw_label: { X: 'number', Y: 'number', SIZE: 'number' },
  sz_g2d_draw_hearts: { X: 'number', Y: 'number', SIZE: 'number' },
  sz_g2d_draw_bar: { X: 'number', Y: 'number', W: 'number', H: 'number' },
  sz_g2d_play_sound: { FREQ: 'number', MS: 'number' },
  sz_g2d_play_note: { MS: 'number' },
  sz_g2d_setup_stage: { W: 'number', H: 'number' },
  sz_g2d_fit_screen: { PERCENT: 'number' },
  sz_g2d_load_spritesheet: { FW: 'number', FH: 'number' },
  sz_g2d_animate_sprite: { FROM: 'number', TO: 'number', FPS: 'number' },
  sz_g2d_set_state_anim: { FROM: 'number', TO: 'number', FPS: 'number' },
  sz_g2d_create_shape_sprite: { X: 'number', Y: 'number', W: 'number', H: 'number' },
  sz_g2d_paint_rect: { X: 'number', Y: 'number', W: 'number', H: 'number' },
  sz_g2d_paint_circle: { X: 'number', Y: 'number', R: 'number' },
  sz_g2d_paint_ellipse: { X: 'number', Y: 'number', W: 'number', H: 'number' },
  sz_g2d_paint_triangle: {
    X1: 'number',
    Y1: 'number',
    X2: 'number',
    Y2: 'number',
    X3: 'number',
    Y3: 'number',
  },
  sz_g2d_paint_line: { X1: 'number', Y1: 'number', X2: 'number', Y2: 'number', WIDTH: 'number' },
  sz_g2d_define_enemy_type: {
    HP: 'number',
    SPEED: 'number',
    DMG: 'number',
    W: 'number',
    H: 'number',
  },
  sz_g2d_enemy_state_anim: { FROM: 'number', TO: 'number', FPS: 'number' },
  sz_g2d_enemy_type_param: { VALUE: 'number' },
  sz_g2d_spawn_enemy: { X: 'number', Y: 'number' },
  sz_g2d_draw_frame: { INDEX: 'number', X: 'number', Y: 'number', W: 'number', H: 'number' },
  sz_g2d_set_tile: { INDEX: 'number' },
  sz_g2d_create_tilemap: { TILE: 'number' },
  sz_g2d_draw_tilemap: { X: 'number', Y: 'number', SIZE: 'number' },
  sz_g2d_spawn_in_group: { W: 'number', H: 'number' },
  sz_g2d_spawn_image_in_group: { W: 'number', H: 'number' },
  sz_g2d_spawn_bullet: { R: 'number' },
  sz_g2d_spawn_asteroid: { SIZE: 'number' },
  sz_g2d_spawn_asteroid_edge: { SIZE: 'number', SPEED: 'number' },
  sz_g2d_spawn_obstacle: { SIZE: 'number' },
  sz_g2d_prune_old: { SECONDS: 'number' },
  sz_g2d_every_seconds: { SECS: 'number' },
  sz_g2d_random_between: { MIN: 'number', MAX: 'number' },
  sz_g2d_random_chance: { PERCENT: 'number' },
  sz_g2d_cooldown_ready: { FRAMES: 'number' },
  sz_canvas_rotate: { ANGLE: 'number' },
  sz_canvas_scale: { SX: 'number', SY: 'number' },
  sz_canvas_gradient: { X0: 'number', Y0: 'number', X1: 'number', Y1: 'number' },
  sz_canvas_fill_text: { TEXT: 'text' },
  sz_js_repeat: { TIMES: 'number' },
  sz_g3d_create_box: { SIZE: 'number' },
  sz_g3d_create_sphere: { RADIUS: 'number' },
  sz_g3d_create_block: { W: 'number', H: 'number', D: 'number' },
  sz_g3d_create_cylinder: { RADIUS: 'number', HEIGHT: 'number' },
  sz_g3d_create_cone: { RADIUS: 'number', HEIGHT: 'number' },
  sz_g3d_create_plane: { W: 'number', D: 'number' },
  sz_g3d_create_torus: { RADIUS: 'number', TUBE: 'number' },
  sz_g3d_control_keys: { SPEED: 'number' },
  sz_g3d_move_in_circle: { RADIUS: 'number', SPEED: 'number' },
  sz_g3d_slide_between: { MIN: 'number', MAX: 'number', SPEED: 'number' },
  sz_g3d_spin: { SPEED: 'number' },
  sz_g3d_move_towards: { X: 'number', Y: 'number', Z: 'number', FACTOR: 'number' },
  sz_g3d_body: { GRAVITY: 'number' },
  sz_g3d_platformer_controls: { SPEED: 'number', JUMP: 'number' },
  sz_g3d_fps_controls: { SPEED: 'number' },
  sz_g3d_third_person_camera: { DIST: 'number', HEIGHT: 'number' },
  sz_g3d_set_fov: { DEG: 'number' },
  sz_g3d_set_opacity: { OPACITY: 'number' },
  sz_g3d_add_ambient_light: { INTENSITY: 'number' },
  sz_g3d_add_sun_light: { INTENSITY: 'number' },
  sz_g3d_add_point_light: { INTENSITY: 'number', X: 'number', Y: 'number', Z: 'number' },
  sz_g3d_set_fog: { NEAR: 'number', FAR: 'number' },
  sz_g3d_run_enemies: { EVERY: 'number', SPEED: 'number' },
  sz_g3d_add_row: { ROW: 'number', SPEED: 'number' },
  sz_g3d_generate_rows: { COUNT: 'number' },
  sz_g3d_move_across: { SPEED: 'number', MIN: 'number', MAX: 'number' },
  sz_g3d_spawn_in_swarm: { X: 'number', Y: 'number', Z: 'number' },
  sz_g3d_prune_swarm: { MIN: 'number', MAX: 'number' },
  sz_g3d_play_note: { FREQ: 'number', MS: 'number' },
  sz_g3d_is_near: { DIST: 'number' },
  sz_g3d_aim_ahead: { DIST: 'number' },
  // Jogo 2D Avançado (soquetes nascidos input_value — entradas inertes na
  // migração, ativas na restauração de sombra).
  sz_gk_setup: { W: 'number', H: 'number' },
  sz_gk_set_screen_text: { TITLE: 'text', TEXT: 'text', BTN: 'text' },
  sz_gk_create_screen: { TITLE: 'text', TEXT: 'text' },
  sz_gk_add_button: { LABEL: 'text' },
  sz_gk_create_character: { W: 'number', H: 'number', SPEED: 'number' },
  sz_gk_place_character: { X: 'number', Y: 'number' },
  sz_gk_set_speed_multiplier: { FACTOR: 'number' },
  sz_gk_define_mold: {
    W: 'number',
    H: 'number',
    HEALTH: 'number',
    SPEED: 'number',
    DAMAGE: 'number',
  },
  sz_gk_spawn_from_mold: { X: 'number', Y: 'number' },
  sz_gk_spawn_named: { X: 'number', Y: 'number' },
  sz_gk_start_spawner: { SEC: 'number' },
  sz_gk_cull_offscreen: { MARGIN: 'number' },
  sz_gk_define_look: { W: 'number', H: 'number' },
  sz_gk_draw_look: { X: 'number', Y: 'number', W: 'number', H: 'number' },
  sz_gk_hurt: { AMOUNT: 'number', IFRAMES: 'number' },
  sz_gk_knockback: { FORCE: 'number' },
  sz_gk_set_sheet: { FW: 'number', FH: 'number' },
  sz_gk_play_anim: { FROM: 'number', TO: 'number', FPS: 'number' },
  sz_gk_camera_follow: { W: 'number', H: 'number' },
  sz_gk_launch_towards: { V: 'number' },
  sz_gk_set_angle: { DEG: 'number' },
  sz_gk_draw_bar: {
    CUR: 'number',
    MAX: 'number',
    X: 'number',
    Y: 'number',
    W: 'number',
    H: 'number',
  },
  sz_gk_rpg_move_grid: { CELL: 'number' },
  sz_gk_rpg_block_cell: { CX: 'number', CY: 'number' },
  sz_gk_rpg_cell: { N: 'number' },
  sz_gk_rpg_create_npc: { CX: 'number', CY: 'number' },
  sz_gk_rpg_say: { TEXT: 'text', NAME: 'text' },
  sz_gk_rpg_draw_inventory: { X: 'number', Y: 'number' },
  sz_gk_rpg_create_door: { CX: 'number', CY: 'number' },
  sz_gk_rpg_battle_stats: { HP: 'number', STR: 'number', DEF: 'number' },
  sz_gk_rpg_battle_start: { HP: 'number', STR: 'number', DEF: 'number' },
  sz_gk_set_walk_sheet: { FW: 'number', FH: 'number' },
  sz_gk_rpg_wait: { SECONDS: 'number' },
  sz_gk_rpg_npc_walk_to: { CX: 'number', CY: 'number' },
  sz_gk_rpg_on_step: { CX: 'number', CY: 'number' },
  sz_gk_rpg_menu: { TITLE: 'text' },
  sz_gk_rpg_option: { LABEL: 'text' },
  sz_gk_rpg_set_special: { DMG: 'number', COST: 'number' },
  sz_gk_rpg_give_potion: { HEAL: 'number' },
  sz_gk_rpg_battle_reward: { XP: 'number' },
  sz_gk_rpg_inflict: { TURNS: 'number' },
  sz_gk_camera_shake: { INT: 'number', SEC: 'number' },
  sz_gk_apply_gravity: { G: 'number' },
  sz_gk_jump: { FORCE: 'number' },
  sz_gk_set_velocity: { VX: 'number', VY: 'number' },
  sz_gk_set_terminal_velocity: { MAX: 'number' },
  sz_gk_every_seconds: { SECS: 'number' },
  sz_gk_cooldown_ready: { SECS: 'number' },
  sz_gk_set_tile_size: { PX: 'number' },
  sz_gk_tile_at: { X: 'number', Y: 'number' },
  sz_gk_set_tile_at: { X: 'number', Y: 'number', INDEX: 'number' },
  sz_gk_set_property: { VALUE: 'number' },
  sz_gk_tween_to: { X: 'number', Y: 'number', SECS: 'number' },
  // 👾 R16 — Kit Monstrinhos
  sz_gk_pkm_creature: { HP: 'number', STR: 'number', DEF: 'number', SPD: 'number' },
  sz_gk_pkm_move: { DMG: 'number', ACC: 'number' },
  sz_gk_pkm_type_chart: { MULT: 'number' },
  sz_gk_pkm_evolve: { LEVEL: 'number' },
  sz_gk_pkm_give: { LEVEL: 'number' },
  sz_gk_pkm_give_ball: { COUNT: 'number', POWER: 'number' },
  sz_gk_pkm_draw_team: { X: 'number', Y: 'number' },
  sz_gk_pkm_grass_cells: { X1: 'number', Y1: 'number', X2: 'number', Y2: 'number' },
  sz_gk_pkm_grass_tiles: { INDEX: 'number' },
  sz_gk_pkm_wild: { MIN: 'number', MAX: 'number' },
  sz_gk_pkm_encounter_rate: { PCT: 'number' },
  sz_gk_pkm_battle_wild: { LEVEL: 'number' },
  sz_gk_pkm_trainer_creature: { LEVEL: 'number' },
  // 🧭 R15 — primitivos gerais
  sz_gk_define_region: { X: 'number', Y: 'number', W: 'number', H: 'number' },
  sz_gk_chance: { PCT: 'number' },
  sz_gk_point_in: { X: 'number', Y: 'number' },
  sz_gk_launch_to_point: { X: 'number', Y: 'number', SPEED: 'number' },
  sz_gk_set_velocity_angle: { DEG: 'number', FORCE: 'number' },
  sz_gk_set_opacity: { PCT: 'number' },
  sz_gk_fade_to: { PCT: 'number', SECS: 'number' },
  sz_gk_tween_property: { TO: 'number', SECS: 'number' },
  sz_gk_set_hitbox: { OX: 'number', OY: 'number', W: 'number', H: 'number' },
  sz_gk_swing_window: { START: 'number', ACTIVE: 'number' },
  sz_gk_luta_match: { ROUNDS: 'number', SECS: 'number' },
  sz_gk_luta_move: { DMG: 'number', RANGE: 'number' },
  sz_gk_luta_move_anim: { FROM: 'number', TO: 'number' },
  sz_gk_play_anim_once: { FROM: 'number', TO: 'number', FPS: 'number' },
  sz_gk_set_entity_state: { SECS: 'number' },
  sz_gk_state_anim: { FROM: 'number', TO: 'number', FPS: 'number' },
  sz_gk_thrust: { DEG: 'number', FORCE: 'number' },
  sz_gk_apply_friction: { FACTOR: 'number' },
  sz_gk_wait: { SECS: 'number' },
  sz_gk_nearest_active: { X: 'number', Y: 'number' },
  // R21 — primitivos gerais
  sz_gk_float_text: { TEXT: 'text', X: 'number', Y: 'number', SIZE: 'number' },
  sz_gk_trail_on: { SIZE: 'number', RATE: 'number', LIFE: 'number' },
  sz_gk_shockwave: { X: 'number', Y: 'number', RADIUS: 'number', SECS: 'number' },
  sz_gk_scroll_image: { VX: 'number', VY: 'number' },
  sz_gk_lean_on_move: { DEG: 'number' },
  sz_gk_fan_shot: { COUNT: 'number', ARC: 'number', DEG: 'number', SPEED: 'number' },
  // 🚀 R22 — Kit Nave
  sz_gk_nave_ship: { SPEED: 'number', LEAN: 'number' },
  sz_gk_nave_powerup: { SECS: 'number' },
  sz_gk_nave_wave: {
    COLS: 'number',
    ROWS: 'number',
    GAP: 'number',
    SPEED: 'number',
    DROP: 'number',
    ACCEL: 'number',
  },
  sz_gk_nave_wave_shooter: { SECS: 'number', SPEED: 'number' },
  sz_gk_nave_invasion_line: { Y: 'number' },
  sz_gk_nave_starfield: { COUNT: 'number', SPEED: 'number' },
  sz_gk_nave_bomb: { RADIUS: 'number' },
  // 🛤️ R25 — caminhos + paralaxe + explosão por folha
  sz_gk_path_point: { X: 'number', Y: 'number' },
  sz_gk_follow_path: { SPEED: 'number' },
  sz_gk_parallax_layer: { FX: 'number', FY: 'number' },
  sz_gk_sheet_burst: {
    FRAMES: 'number',
    FPS: 'number',
    X: 'number',
    Y: 'number',
    SIZE: 'number',
  },
  // 🏰 R26 — Kit Defesa de Torre
  sz_gk_td_wave: { COUNT: 'number', GAP: 'number', SPEED: 'number' },
  sz_gk_td_slot: { X: 'number', Y: 'number', SIZE: 'number' },
  sz_gk_td_on_buy: { COST: 'number' },
  sz_gk_td_free_slot: { X: 'number', Y: 'number' },
  sz_gk_td_draw_range: { RADIUS: 'number' },
  sz_gk_td_set_coins: { N: 'number' },
  sz_gk_td_add_coins: { N: 'number' },
  sz_gk_fade_screen: { SECS: 'number' },
  sz_gk_flash_screen: { TIMES: 'number' },
  sz_gk_save_value: { VALUE: 'number' },
  sz_gk_set_volume: { LEVEL: 'number' },
  sz_gk_create_empty_tilemap: { COLS: 'number', ROWS: 'number', FILL: 'number' },
  // 🏃 Kit Plataforma
  sz_gk_plat_hero: { SPEED: 'number', JUMP: 'number' },
  sz_gk_plat_jump_feel: {
    COYOTE: 'number',
    BUFFER: 'number',
    HOLD: 'number',
    GRAVITY: 'number',
  },
  sz_gk_plat_double_jump: { FORCE: 'number', TIMES: 'number' },
  sz_gk_plat_wall_slide: { SPEED: 'number' },
  sz_gk_plat_wall_jump: { FX: 'number', FY: 'number' },
  sz_gk_plat_ladder: { TILE: 'number', SPEED: 'number' },
  sz_gk_plat_moving: {
    X1: 'number',
    Y1: 'number',
    X2: 'number',
    Y2: 'number',
    SECS: 'number',
  },
  sz_gk_plat_stomp: { BOUNCE: 'number' },
  sz_gk_plat_patrol_wall: { SPEED: 'number' },
  sz_gk_plat_checkpoint: { X: 'number', Y: 'number' },
  sz_gk_plat_state_frames: { FROM: 'number', TO: 'number', FPS: 'number' },
  sz_gk_attack_facing: { RANGE: 'number', DUR: 'number' },
  sz_gk_patrol_around: { OX: 'number', OY: 'number', RADIUS: 'number' },
  sz_gk_draw_hearts: { CUR: 'number', MAX: 'number', X: 'number', Y: 'number' },
  sz_gk_draw_health_bar: { MAX: 'number' },
  sz_gk_set_mission: { SEC: 'number', KILLS: 'number' },
  sz_gk_draw_timer: { X: 'number', Y: 'number' },
  sz_gk_define_effect: {
    COUNT: 'number',
    SIZE: 'number',
    LIFE: 'number',
    SPEED: 'number',
    GRAVITY: 'number',
  },
  sz_gk_burst: { X: 'number', Y: 'number' },
  sz_gk_play_tone: { FREQ: 'number', MS: 'number' },
  // Jogo 3D Avançado (soquetes nascidos input_value — entradas inertes na
  // migração, ativas na restauração de sombra).
  sz_g3k_setup: { W: 'number', H: 'number', SIZE: 'number' },
  sz_g3k_set_effects: { STRENGTH: 'number' },
  sz_g3k_set_seed: { SEED: 'number' },
  sz_g3k_scatter_decor: { COUNT: 'number' },
  sz_g3k_define_mold: { HEALTH: 'number', SPEED: 'number' },
  sz_g3k_part: {
    W: 'number',
    H: 'number',
    D: 'number',
    X: 'number',
    Y: 'number',
    Z: 'number',
  },
  sz_g3k_spawn: { X: 'number', Y: 'number', Z: 'number' },
  sz_g3k_spawn_named: { X: 'number', Y: 'number', Z: 'number' },
  sz_g3k_start_spawner: { SEC: 'number' },
  sz_g3k_cull_far: { DIST: 'number' },
  sz_g3k_move_with_keys: { SPEED: 'number' },
  sz_g3k_camera_follow: { DIST: 'number', HEIGHT: 'number' },
  sz_g3k_camera_orbit: { DIST: 'number' },
  sz_g3k_camera_top: { HEIGHT: 'number' },
  sz_g3k_camera_angle: { AZ: 'number', EL: 'number' },
  sz_g3k_camera_distance: { DIST: 'number' },
  sz_g3k_camera_shake: { STRENGTH: 'number', SECONDS: 'number' },
  sz_g3k_camera_lens: { FOV: 'number' },
  sz_g3k_camera_look_at_point: { X: 'number', Y: 'number', Z: 'number' },
  sz_g3k_camera_smooth: { LAMBDA: 'number' },
  sz_g3k_random_between: { FROM: 'number', TO: 'number' },
  sz_g3k_random_chance: { PERCENT: 'number' },
  sz_g3k_start_timer: { SECONDS: 'number' },
  sz_g3k_say: { TEXT: 'text', SECONDS: 'number' },
  sz_g3k_place: { X: 'number', Y: 'number', Z: 'number' },
  sz_g3k_set_yaw: { DEG: 'number' },
  sz_g3k_set_velocity: { X: 'number', Y: 'number', Z: 'number' },
  sz_g3k_set_drag: { DRAG: 'number' },
  sz_g3k_set_entity_value: { VALUE: 'number' },
  sz_g3k_move_forward: { SPEED: 'number' },
  sz_g3k_fall: { G: 'number' },
  sz_g3k_jump: { FORCE: 'number' },
  sz_g3k_platformer_keys: { SPEED: 'number', JUMP: 'number' },
  sz_g3k_set_bounce: { AMOUNT: 'number' },
  sz_g3k_set_friction: { AMOUNT: 'number' },
  sz_g3k_add_light: { X: 'number', Y: 'number', Z: 'number', INTENSITY: 'number' },
  sz_g3k_set_ambient: { INTENSITY: 'number' },
  sz_g3k_set_fog: { NEAR: 'number', FAR: 'number' },
  sz_g3k_move_fps: { SPEED: 'number' },
  sz_g3k_state_timer: { SEC: 'number' },
  sz_g3k_seek_point: { X: 'number', Z: 'number' },
  sz_g3k_aim_at: { SMOOTH: 'number' },
  sz_g3k_for_each_near: { RADIUS: 'number' },
  sz_g3k_touches: { DIST: 'number' },
  sz_g3k_hurt: { AMOUNT: 'number' },
  sz_g3k_define_effect: {
    COUNT: 'number',
    SPREAD: 'number',
    S1: 'number',
    S2: 'number',
    LIFE: 'number',
    GRAVITY: 'number',
  },
  sz_g3k_burst_at: { X: 'number', Y: 'number', Z: 'number' },
  sz_g3k_define_emitter: {
    S1: 'number',
    S2: 'number',
    RATE: 'number',
    SPEED: 'number',
    CONE: 'number',
    GRAVITY: 'number',
  },
  sz_g3k_start_emitter: { X: 'number', Y: 'number', Z: 'number' },
  sz_g3k_add_attractor: {
    X: 'number',
    Y: 'number',
    Z: 'number',
    INT: 'number',
    RAD: 'number',
  },
  sz_g3k_set_screen_text: { TITLE: 'text', TEXT: 'text', BTN: 'text' },
  sz_g3k_create_screen: { TITLE: 'text', TEXT: 'text' },
  sz_g3k_add_button: { LABEL: 'text' },
  sz_g3k_hud_text: { TEXT: 'text' },
  sz_g3k_play_tone: { FREQ: 'number', MS: 'number' },
  // Canvas 3D — facilitadores do three.js (soquetes nascidos input_value: entradas
  // inertes na migração, ativas na restauração de sombra + shouldEmitAsShadow).
  sz_t3d_set_position: { X: 'number', Y: 'number', Z: 'number' },
  sz_t3d_set_rotation: { X: 'number', Y: 'number', Z: 'number' },
  sz_t3d_rotate_axis: { DELTA: 'number' },
  sz_t3d_set_scale: { X: 'number', Y: 'number', Z: 'number' },
  sz_t3d_look_at: { X: 'number', Y: 'number', Z: 'number' },
  sz_t3d_lerp_position: { ALPHA: 'number' },
  sz_t3d_set_color: { COLOR: 'color' },
  sz_t3d_set_background: { COLOR: 'color' },
  sz_t3d_set_fog: { COLOR: 'color', NEAR: 'number', FAR: 'number' },
  sz_t3d_set_intensity: { N: 'number' },
  sz_t3d_set_matrix_at: { I: 'number' },
  sz_t3d_renderer_size: { W: 'number', H: 'number' },
  sz_t3d_bloom_setup: { STRENGTH: 'number', RADIUS: 'number', THRESHOLD: 'number' },
  sz_t3d_particles: { COUNT: 'number', SIZE: 'number', SPREAD: 'number', COLOR: 'color' },
  sz_t3d_water: { SIZE: 'number', COLOR: 'color' },
  sz_t3d_grass: { COUNT: 'number', SIZE: 'number', SPREAD: 'number', COLOR: 'color' },
  // Mundo 3D (world-3d) — soquetes nascidos input_value (inertes na migração,
  // ativos na restauração de sombra + shouldEmitAsShadow).
  sz_w3d_setup: { WORLD: 'number' },
  sz_w3d_terrain: { H: 'number', S: 'number' },
  sz_w3d_ground_height: { X: 'number', Z: 'number' },
  sz_w3d_car_stats: { SPEED: 'number', TURN: 'number', JUMP: 'number' },
  sz_w3d_car_place: { X: 'number', Z: 'number', DEG: 'number' },
  sz_w3d_scatter: { N: 'number' },
  sz_w3d_scatter_model: { N: 'number', S: 'number' },
  sz_w3d_place_thing: { X: 'number', Z: 'number', S: 'number' },
  sz_w3d_place_model: { X: 'number', Z: 'number', S: 'number', DEG: 'number' },
  sz_w3d_clear_area: { X: 'number', Z: 'number', R: 'number' },
  sz_w3d_effects: { STRENGTH: 'number' },
  sz_w3d_daynight: { MIN: 'number' },
  sz_w3d_wind: { F: 'number' },
  sz_w3d_flatten: { X: 'number', Z: 'number', R: 'number' },
  sz_w3d_path: { X1: 'number', Z1: 'number', X2: 'number', Z2: 'number', W: 'number' },
  sz_w3d_water: { Y: 'number' },
  sz_w3d_car_boost: { FORCE: 'number' },
  sz_w3d_hud: { TEXT: 'text' },
  sz_w3d_say: { TEXT: 'text', SECS: 'number' },
  sz_w3d_point: { X: 'number', Z: 'number' },
  sz_w3d_zone: { X: 'number', Z: 'number', R: 'number' },
  sz_w3d_totem_text: { X: 'number', Z: 'number' },
  sz_w3d_totem_image: { X: 'number', Z: 'number', W: 'number' },
  sz_w3d_gallery_create: { X: 'number', Z: 'number' },
  sz_w3d_race_create: { X: 'number', Z: 'number', DEG: 'number', LAPS: 'number' },
  sz_w3d_race_checkpoint: { X: 'number', Z: 'number', DEG: 'number' },
  sz_w3d_bowling_create: { X: 'number', Z: 'number', DEG: 'number' },
  sz_w3d_stack: { N: 'number', X: 'number', Z: 'number' },
  sz_w3d_camera_shake: { FORCE: 'number', SECS: 'number' },
}

interface BlockNode {
  type?: string
  fields?: Record<string, unknown>
  inputs?: Record<string, { block?: BlockNode; shadow?: BlockNode }>
  next?: { block?: BlockNode; shadow?: BlockNode }
  [k: string]: unknown
}

function shadowFor(kind: 'number' | 'text' | 'color', value: unknown): { shadow: BlockNode } {
  if (kind === 'number') {
    const num = typeof value === 'number' ? value : Number(value)
    return { shadow: { type: 'sz_val_number', fields: { NUM: Number.isFinite(num) ? num : 0 } } }
  }
  if (kind === 'color') {
    return { shadow: { type: 'sz_val_color', fields: { COLOR: String(value ?? '#000000') } } }
  }
  return { shadow: { type: 'sz_val_text', fields: { TEXT: String(value ?? '') } } }
}

/** O `sz_js_for_each` legado guardava a lista no campo de texto `NAME`; hoje é o
 * soquete de valor `ARRAY` (aceita variável/`Object.keys`/expressão). */
function forEachNeedsMigration(block: BlockNode): boolean {
  return block.type === 'sz_js_for_each' && !!block.fields && 'NAME' in (block.fields as object)
}

/** O bloco (ou algum descendente) tem campo legado a migrar? (read-only, barato) */
function blockNeedsMigration(block: BlockNode): boolean {
  if (forEachNeedsMigration(block)) return true
  const map = LEGACY_VALUE_FIELDS[block.type ?? '']
  if (map && block.fields && Object.keys(map).some((f) => f in (block.fields as object))) {
    return true
  }
  if (block.inputs) {
    for (const input of Object.values(block.inputs)) {
      if (input.block && blockNeedsMigration(input.block)) return true
      if (input.shadow && blockNeedsMigration(input.shadow)) return true
    }
  }
  if (block.next?.block && blockNeedsMigration(block.next.block)) return true
  if (block.next?.shadow && blockNeedsMigration(block.next.shadow)) return true
  return false
}

/** Muta o bloco (já clonado) movendo `fields.X` legados para `inputs.X = { shadow }`. */
function migrateBlock(block: BlockNode): void {
  // `sz_js_for_each`: campo `NAME` (nome da lista) → soquete `ARRAY` com um bloco de
  // variável (senão o Blockly dropava o campo órfão e a lista virava a default "lista").
  if (forEachNeedsMigration(block) && block.fields) {
    const name = String(block.fields.NAME ?? 'lista')
    delete block.fields.NAME
    block.inputs = block.inputs ?? {}
    if (!block.inputs.ARRAY) {
      block.inputs.ARRAY = { block: { type: 'sz_val_variable', fields: { NAME: name } } }
    }
  }
  const map = LEGACY_VALUE_FIELDS[block.type ?? '']
  if (map && block.fields) {
    for (const [field, kind] of Object.entries(map)) {
      if (!(field in block.fields)) continue
      const value = block.fields[field]
      delete block.fields[field]
      block.inputs = block.inputs ?? {}
      // Não sobrescrever um valor que a criança já encaixou nesse slot.
      if (!block.inputs[field]) block.inputs[field] = shadowFor(kind, value)
    }
    if (Object.keys(block.fields).length === 0) delete block.fields
  }
  if (block.inputs) {
    for (const input of Object.values(block.inputs)) {
      if (input.block) migrateBlock(input.block)
      if (input.shadow) migrateBlock(input.shadow)
    }
  }
  if (block.next?.block) migrateBlock(block.next.block)
  if (block.next?.shadow) migrateBlock(block.next.shadow)
}

/**
 * Converte campos legados em soquetes de valor em TODO o `blocksState`, preservando os
 * valores salvos. Devolve o ESTADO ORIGINAL (mesma referência) quando não há nada a
 * migrar — assim chamadores que comparam por identidade não pagam um clone à toa.
 */
export function migrateLegacyValueFields(state: unknown): unknown {
  if (!state || typeof state !== 'object') return state
  const top = (state as { blocks?: { blocks?: BlockNode[] } }).blocks?.blocks
  if (!Array.isArray(top)) return state
  if (!top.some((b) => b && blockNeedsMigration(b))) return state
  // Clona (o blocksState é JSON puro) para não mutar o estado do store.
  const cloned = JSON.parse(JSON.stringify(state)) as { blocks?: { blocks?: BlockNode[] } }
  for (const block of cloned.blocks?.blocks ?? []) {
    if (block) migrateBlock(block)
  }
  return cloned
}

// ---------------------------------------------------------------------------
// Restauração de SHADOW-ness (cura de estados poluídos pela reconstrução IR→blocos)
// ---------------------------------------------------------------------------

/** Tipo do bloco literal correspondente a cada kind de sombra. */
const SHADOW_LITERAL_TYPES: Record<'number' | 'text' | 'color', string> = {
  number: 'sz_val_number',
  text: 'sz_val_text',
  color: 'sz_val_color',
}

/**
 * Literal PURO do kind esperado: exatamente o bloco `sz_val_*`, sem filhos e sem
 * cadeia. Getter de variável/expressão que a criança encaixou NUNCA é convertido.
 */
function isPureLiteralOfKind(node: BlockNode | undefined, kind: 'number' | 'text' | 'color') {
  if (!node || node.type !== SHADOW_LITERAL_TYPES[kind]) return false
  if (node.inputs && Object.keys(node.inputs).length > 0) return false
  if (node.next) return false
  return true
}

/** O bloco (ou descendente) tem literal-em-soquete-de-preset para virar sombra? */
function blockNeedsShadowRestore(block: BlockNode): boolean {
  const map = LEGACY_VALUE_FIELDS[block.type ?? '']
  if (map && block.inputs) {
    for (const [slot, kind] of Object.entries(map)) {
      const input = block.inputs[slot]
      if (input && !input.shadow && isPureLiteralOfKind(input.block, kind)) return true
    }
  }
  if (block.inputs) {
    for (const input of Object.values(block.inputs)) {
      if (input.block && blockNeedsShadowRestore(input.block)) return true
      if (input.shadow && blockNeedsShadowRestore(input.shadow)) return true
    }
  }
  if (block.next?.block && blockNeedsShadowRestore(block.next.block)) return true
  if (block.next?.shadow && blockNeedsShadowRestore(block.next.shadow)) return true
  return false
}

/** Muta o bloco (já clonado) promovendo `{block: literal}` a `{shadow: literal}`. */
function restoreShadowsInBlock(block: BlockNode): void {
  const map = LEGACY_VALUE_FIELDS[block.type ?? '']
  if (map && block.inputs) {
    for (const [slot, kind] of Object.entries(map)) {
      const input = block.inputs[slot]
      // Se já existe sombra por baixo, o encaixe real é escolha da criança —
      // não mexe. Só promove o literal puro que está SOZINHO no soquete.
      if (!input || input.shadow || !isPureLiteralOfKind(input.block, kind)) continue
      input.shadow = input.block
      delete input.block
    }
  }
  if (block.inputs) {
    for (const input of Object.values(block.inputs)) {
      if (input.block) restoreShadowsInBlock(input.block)
      if (input.shadow) restoreShadowsInBlock(input.shadow)
    }
  }
  if (block.next?.block) restoreShadowsInBlock(block.next.block)
  if (block.next?.shadow) restoreShadowsInBlock(block.next.shadow)
}

/**
 * Restaura a natureza de SOMBRA dos literais nos soquetes com preset (o mapa
 * `LEGACY_VALUE_FIELDS` é a fonte de "este soquete carrega um literal default").
 *
 * Por que existe: a reconstrução IR→blocos emitia TODO valor como `{block:…}`;
 * depois de UMA passada pela Ponte, FROM/TO/FPS (etc.) viravam blocos reais e os
 * preenchimentos automáticos (`fillFrames` do seletor de animação,
 * `applySuggestedSize` do seletor de imagem) — que só escrevem em `isShadow()` —
 * viravam no-op silencioso. Roda no carregamento (via
 * `normalizeBlocksStateToFrames`), então também CURA projetos já salvos com o
 * estado poluído. Idempotente; mesma referência quando não há nada a promover.
 */
export function restoreShadowLiterals(state: unknown): unknown {
  if (!state || typeof state !== 'object') return state
  const top = (state as { blocks?: { blocks?: BlockNode[] } }).blocks?.blocks
  if (!Array.isArray(top)) return state
  if (!top.some((b) => b && blockNeedsShadowRestore(b))) return state
  const cloned = JSON.parse(JSON.stringify(state)) as { blocks?: { blocks?: BlockNode[] } }
  for (const block of cloned.blocks?.blocks ?? []) {
    if (block) restoreShadowsInBlock(block)
  }
  return cloned
}

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

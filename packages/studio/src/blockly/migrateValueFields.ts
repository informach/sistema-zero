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

/** O bloco (ou algum descendente) tem campo legado a migrar? (read-only, barato) */
function blockNeedsMigration(block: BlockNode): boolean {
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

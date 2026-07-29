import type * as Blockly from 'blockly/core'
import type {
  CSSDeclaration,
  CSSDeclarations,
  CSSEntry,
  HTMLNode,
  JSExpr,
  JSStatement,
  SZIR,
  SZIRV2,
} from '#ir'
import { splitLegacyBehavior } from '#ir'
import { programmingRegistrationForBlockType } from '../codecs/programming/registry'
import { canvasExpressionBlockToIR, canvasStatementBlockToIR } from '../codecs/web/canvasBlockToIR'
import { cssBlockToIR } from '../codecs/web/cssBlockToIR'
import { htmlBlockToIR } from '../codecs/web/htmlBlockToIR'
import { webCodecForBlockType } from '../codecs/web/registry'
import { resolveCanvas3DAddonImports } from '../three/canvas3dAddons'
import {
  FRAME_APPEARANCE,
  FRAME_BEHAVIOR_LEGACY,
  FRAME_EVENTS,
  FRAME_LOOPS,
  FRAME_START,
  FRAME_STRUCTURE,
} from './blockContracts'
import { getSuperName } from './blocks/extendsMutator'
import { getParamNames } from './blocks/paramsMutator'

export { SHADOW_PRESETS } from '../codecs/web/cssBlockToIR'
/** Tipos das cinco Áreas do projeto e da moldura legada de migração. */
export {
  FRAME_APPEARANCE,
  FRAME_BEHAVIOR_LEGACY as FRAME_BEHAVIOR,
  FRAME_EVENTS,
  FRAME_LOOPS,
  FRAME_START,
  FRAME_STRUCTURE,
}

function resolveCanvas3DAddonStatements(statements: JSStatement[]): JSStatement[] {
  return statements.flatMap<JSStatement>((statement) => {
    if (statement.type !== 'importNamed') {
      return [statement]
    }
    const resolved = resolveCanvas3DAddonImports(statement.names, statement.module)
    if (!resolved) return [statement]
    return resolved.map((addonImport, index) => ({
      ...statement,
      ...addonImport,
      ...(index === 0 ? {} : { __id: undefined }),
    }))
  })
}

/**
 * Percorre o workspace e devolve a SZ-IR V2. Só gera o que está dentro de
 * Estrutura, Aparência, Ao iniciar, Quando acontecer ou Enquanto
 * estiver rodando — Loops. **Bloco solto é
 * rascunho** e fica fora da geração.
 * A inclusão é por CONTÊINER, não por posição/ordem no canvas.
 *
 * Defensivo: se um estado importado contiver áreas duplicadas, usa a primeira de
 * cada tipo. A interface preserva o conteúdo das demais como rascunho.
 *
 * Blocos não-reconhecidos DENTRO de um frame viram "modo avançado" (nada se perde).
 */
export function buildIRFromWorkspace(workspace: Blockly.Workspace): SZIRV2 {
  const ir: SZIRV2 = {
    version: 2,
    html: [],
    css: [],
    behavior: { start: [], events: [], loops: [] },
    extensions: [],
  }
  const seen = new Set<string>()
  const tops = workspace.getTopBlocks(true).filter((b) => !b.isInsertionMarker())
  const firstOf = (type: string): Blockly.Block | null => tops.find((b) => b.type === type) ?? null

  const structure = firstOf(FRAME_STRUCTURE)
  if (structure) ir.html.push(...getHtmlChildren(structure, 'CHILDREN', seen))
  const appearance = firstOf(FRAME_APPEARANCE)
  if (appearance) ir.css.push(...getCssEntryChildren(appearance, 'CHILDREN', seen))
  const legacyBehavior = firstOf(FRAME_BEHAVIOR_LEGACY)
  if (legacyBehavior) {
    const migrated = splitLegacyBehavior(getStatementChildren(legacyBehavior, 'CHILDREN', seen))
    ir.behavior.start.push(...migrated.start)
    ir.behavior.events.push(...migrated.events)
    ir.behavior.loops.push(...migrated.loops)
  }
  const start = firstOf(FRAME_START)
  if (start) ir.behavior.start.push(...getStatementChildren(start, 'CHILDREN', seen))
  const events = firstOf(FRAME_EVENTS)
  if (events) ir.behavior.events.push(...getStatementChildren(events, 'CHILDREN', seen))
  const loops = firstOf(FRAME_LOOPS)
  if (loops) ir.behavior.loops.push(...getStatementChildren(loops, 'CHILDREN', seen))

  ir.behavior.start = resolveCanvas3DAddonStatements(ir.behavior.start)
  ir.behavior.events = resolveCanvas3DAddonStatements(ir.behavior.events)
  ir.behavior.loops = resolveCanvas3DAddonStatements(ir.behavior.loops)

  ir.extensions = Array.from(seen).map((id) => ({ extensionId: id }))
  return ir
}

/**
 * Coleta PLANA (modelo ANTIGO, pré-frames): anda TODOS os blocos top-level em
 * ordem de leitura e roteia por tipo (HTML/CSS/JS). Usada SÓ pela MIGRAÇÃO
 * (`normalizeBlocksStateToFrames`) para reproduzir a saída de projetos legados
 * (sem frames) antes de re-emiti-los já framados — preserva o programa da criança.
 */
export function collectFlatFromWorkspace(workspace: Blockly.Workspace): SZIR {
  const ir: SZIR = { html: [], css: [], js: [], extensions: [] }
  const seen = new Set<string>()
  for (const top of sortTopBlocksReadingOrder(workspace.getTopBlocks(true))) {
    if (top.isInsertionMarker()) continue
    visitStack(top, ir, seen)
  }
  ir.js = resolveCanvas3DAddonStatements(ir.js)
  ir.extensions = Array.from(seen).map((id) => ({ extensionId: id }))
  return ir
}

/** Distância máxima em X (px de workspace) para duas pilhas contarem como a mesma coluna. */
const COLUMN_TOLERANCE = 150

/**
 * Ordena os blocos top-level em ORDEM DE LEITURA (coluna→linha): a coluna mais à
 * esquerda primeiro e, dentro de cada coluna, de cima para baixo. Isso torna o
 * código gerado previsível quando o aluno tem VÁRIAS pilhas do mesmo tipo (estilo
 * Scratch/MakeCode) — em JS a ordem define a execução.
 *
 * As colunas são inferidas agrupando o X por proximidade ({@link COLUMN_TOLERANCE}).
 * Em workspace headless (testes), os blocos não têm geometria — então devolvemos
 * a ordem original do `getTopBlocks` (fallback estável).
 *
 * Exportada para teste unitário (o end-to-end roda headless, sem posição).
 */
export function sortTopBlocksReadingOrder(tops: Blockly.Block[]): Blockly.Block[] {
  const positions: { x: number; y: number }[] = []
  for (const block of tops) {
    const svg = block as Blockly.BlockSvg
    if (typeof svg.getRelativeToSurfaceXY !== 'function') return tops
    const xy = svg.getRelativeToSurfaceXY()
    positions.push({ x: xy.x, y: xy.y })
  }
  return readingOrderIndices(positions)
    .map((i) => tops[i])
    .filter((b): b is Blockly.Block => Boolean(b))
}

/**
 * Ordem de leitura (coluna→linha) para um conjunto de posições. Agrupa o X em
 * colunas por proximidade ({@link COLUMN_TOLERANCE}) e ordena por (coluna, Y).
 * Compartilhado entre o sort de blocos vivos e a derivação de layout a partir do
 * `blocksState` serializado, para que os índices batam. Comparador transitivo.
 */
export function readingOrderIndices(positions: { x: number; y: number }[]): number[] {
  const indices = positions.map((_, i) => i)
  if (positions.length <= 1) return indices
  const byX = [...indices].sort((a, b) => (positions[a]?.x ?? 0) - (positions[b]?.x ?? 0))
  const columnOf = new Map<number, number>()
  let column = 0
  let prevX = positions[byX[0] ?? 0]?.x ?? 0
  for (const i of byX) {
    const x = positions[i]?.x ?? 0
    if (x - prevX > COLUMN_TOLERANCE) column += 1
    columnOf.set(i, column)
    prevX = x
  }
  return indices.sort((a, b) => {
    const colA = columnOf.get(a) ?? 0
    const colB = columnOf.get(b) ?? 0
    if (colA !== colB) return colA - colB
    return (positions[a]?.y ?? 0) - (positions[b]?.y ?? 0)
  })
}

function visitStack(block: Blockly.Block, ir: SZIR, seen: Set<string>): void {
  let cur: Blockly.Block | null = block
  while (cur) {
    if (cur.isInsertionMarker()) {
      cur = cur.getNextBlock()
      continue
    }
    const node = blockToIR(cur, seen)
    if (node) {
      attachBlockId(node, cur.id)
      if (node.kind === 'html') {
        mergeClassField(cur, node.value)
        mergeBlockData(cur, node.value)
      }
      routeNode(node, ir)
    }
    cur = cur.getNextBlock()
  }
}

/**
 * Re-mescla na IR os atributos que ficaram guardados no `data` do bloco
 * (ex.: `class`) — contraparte de `extraData` em workspaceState. Garante que
 * atributos não modelados por campos sobrevivam ao round-trip blocos→código.
 */
function readBlockData(block: Blockly.Block): Record<string, string> {
  const raw = (block as unknown as { data?: string | null }).data
  if (!raw) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
  return Object.fromEntries(
    Object.entries(parsed).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  )
}

function mergeBlockData(block: Blockly.Block, node: HTMLNode): void {
  if (node.type !== 'element') return
  const extra = readBlockData(block)
  const { id, ...rest } = extra
  if (id && !node.id) node.id = id
  if (Object.keys(rest).length > 0) {
    node.attrs = { ...rest, ...(node.attrs ?? {}) }
  }
}

/**
 * Mescla o campo `CLASS` do bloco no `attrs.class` da IR. Contraparte de
 * `htmlNodeToBlock` em workspaceState, que preenche o campo a partir de
 * `attrs.class`. Campo vazio é ignorado (round-trip estável).
 */
function mergeClassField(block: Blockly.Block, node: HTMLNode): void {
  if (node.type !== 'element') return
  const raw = block.getFieldValue('CLASS')
  const cls = raw ? String(raw).trim() : ''
  if (!cls) return
  node.attrs = { ...(node.attrs ?? {}), class: cls }
}

/**
 * Atribui o id do bloco Blockly ao campo `__id` do nó IR correspondente. Isso
 * permite construir source maps cruzados (bloco ↔ linha de código).
 */
function attachBlockId(node: RoutedNode, blockId: string): void {
  // `__id` é opcional em todas as variants — atribuição direta é segura.
  const value = node.value as { __id?: string }
  value.__id ??= blockId
}

type RoutedNode =
  | { kind: 'html'; value: HTMLNode }
  | { kind: 'css'; value: CSSEntry }
  | { kind: 'js'; value: JSStatement }

function routeNode(node: RoutedNode, ir: SZIR): void {
  if (node.kind === 'html') ir.html.push(node.value)
  else if (node.kind === 'css') ir.css.push(node.value)
  else ir.js.push(node.value)
}

function f(block: Blockly.Block, name: string): string {
  return String(block.getFieldValue(name) ?? '')
}

function constructorReference(rawReference: string): { namespace?: string; className: string } {
  const reference = rawReference.trim()
  const dot = reference.lastIndexOf('.')
  return dot > 0
    ? { namespace: reference.slice(0, dot), className: reference.slice(dot + 1) }
    : { className: reference }
}

function fieldChoice<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return allowed.find((option) => option === value) ?? fallback
}
function fn(block: Blockly.Block, name: string, fallback = 0): number {
  const v = block.getFieldValue(name)
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

/**
 * Lê o campo TARGET_KIND ('id' | 'var') de um bloco que age sobre um elemento.
 * Só devolve `{ targetKind: 'var' }` quando é variável — caso id, omite o campo
 * (mantém a IR enxuta e idêntica à forma só-id usada historicamente).
 */
function targetKindField(block: Blockly.Block): { targetKind?: 'var' } {
  return f(block, 'TARGET_KIND') === 'var' ? { targetKind: 'var' } : {}
}

function eventTargetFields(
  block: Blockly.Block,
  fallback: 'document' | 'window',
): { target: string; targetKind: 'id' | 'var' | 'document' | 'window' } {
  const fieldKind = f(block, 'TARGET_KIND')
  const kind =
    fieldKind === 'id' || fieldKind === 'var' || fieldKind === 'document' || fieldKind === 'window'
      ? fieldKind
      : fallback
  if (kind === 'document' || kind === 'window') return { target: kind, targetKind: kind }
  return { target: f(block, 'TARGET'), targetKind: kind }
}

/** Como `targetKindField`, mas inclui 'this' — para blocos de classList (classOp/contains). */
function classTargetKind(block: Blockly.Block): { targetKind?: 'var' | 'this' } {
  const k = f(block, 'TARGET_KIND')
  if (k === 'var') return { targetKind: 'var' }
  if (k === 'this') return { targetKind: 'this' }
  return {}
}

function getStatementChildren(
  block: Blockly.Block,
  name: string,
  seen: Set<string>,
): JSStatement[] {
  const input = block.getInputTargetBlock(name)
  if (!input) return []
  const out: JSStatement[] = []
  let cur: Blockly.Block | null = input
  while (cur) {
    if (cur.isInsertionMarker()) {
      cur = cur.getNextBlock()
      continue
    }
    const node = blockToIR(cur, seen)
    if (node && node.kind === 'js') {
      ;(node.value as { __id?: string }).__id = cur.id
      out.push(node.value)
    }
    cur = cur.getNextBlock()
  }
  return out
}

/** Coleta os blocos `sz_js_case` de um input → casos do switch (valor + corpo). */
function getSwitchCases(
  block: Blockly.Block,
  name: string,
  seen: Set<string>,
): Array<{ __id?: string; match: JSExpr; body: JSStatement[] }> {
  const out: Array<{ __id?: string; match: JSExpr; body: JSStatement[] }> = []
  let cur: Blockly.Block | null = block.getInputTargetBlock(name)
  while (cur) {
    if (cur.isInsertionMarker()) {
      cur = cur.getNextBlock()
      continue
    }
    if (cur.type === 'sz_js_case') {
      out.push({
        __id: cur.id,
        match: exprInput(cur, 'MATCH', { type: 'str', value: '' }),
        body: getStatementChildren(cur, 'DO', seen),
      })
    }
    cur = cur.getNextBlock()
  }
  return out
}

/**
 * Coleta os filhos HTML de um `input_statement` (containers como section/div).
 * Espelha `getStatementChildren`, mas filtra nós `kind === 'html'`.
 */
function getHtmlChildren(block: Blockly.Block, name: string, seen: Set<string>): HTMLNode[] {
  const input = block.getInputTargetBlock(name)
  if (!input) return []
  const out: HTMLNode[] = []
  let cur: Blockly.Block | null = input
  while (cur) {
    if (cur.isInsertionMarker()) {
      cur = cur.getNextBlock()
      continue
    }
    const node = blockToIR(cur, seen)
    if (node && node.kind === 'html') {
      ;(node.value as { __id?: string }).__id = cur.id
      mergeClassField(cur, node.value)
      mergeBlockData(cur, node.value)
      out.push(node.value)
    }
    cur = cur.getNextBlock()
  }
  return out
}

/**
 * Converte um bloco de VALOR (`sz_val_*`, `output: 'JSValue'`) na expressão IR
 * correspondente. Devolve `null` para blocos que não são de valor.
 *
 * Anexa o id do bloco no `__id` da expressão para alimentar o source map cruzado
 * (bloco ↔ trecho de código). Como `exprInput` chama `blockToExpr`, as
 * subexpressões aninhadas (ex.: operandos de uma conta) também ganham id.
 */
function blockToExpr(block: Blockly.Block | null): JSExpr | null {
  if (!block) return null
  if (block.isInsertionMarker()) return null
  const expr = blockToExprInner(block)
  if (expr) (expr as { __id?: string }).__id = block.id
  return expr
}

function blockToExprInner(block: Blockly.Block): JSExpr | null {
  const webCodec = webCodecForBlockType(block.type)
  if (webCodec?.category === 'canvas' && webCodec.irKind === 'expression') {
    return canvasExpressionBlockToIR(block, { field: f, expression: exprInput })
  }
  switch (block.type) {
    case 'sz_val_number':
      return { type: 'num', value: fn(block, 'NUM') }
    case 'sz_val_text':
      return { type: 'str', value: f(block, 'TEXT') }
    case 'sz_val_color':
      return { type: 'color', value: f(block, 'COLOR') }
    case 'sz_val_color_alpha':
      return { type: 'colorAlpha', hex: f(block, 'COLOR'), alpha: fn(block, 'ALPHA') / 100 }
    case 'sz_val_variable':
      return { type: 'var', name: f(block, 'NAME') }
    case 'sz_val_bool':
      return { type: 'bool', value: f(block, 'VALUE') === 'true' }
    case 'sz_val_null':
      return { type: 'null' }
    case 'sz_g2d_key_down':
      return { type: 'g2d:keyDown', key: f(block, 'KEY') || 'ArrowRight' }
    case 'sz_g2d_touches':
      return { type: 'g2d:touches', aVar: f(block, 'A'), bVar: f(block, 'B') }
    case 'sz_g2d_count_group':
      return { type: 'g2d:countGroup', groupVar: f(block, 'GROUP') }
    case 'sz_g2d_sprite_angle':
      return { type: 'g2d:spriteAngle', spriteVar: f(block, 'SPRITE') }
    case 'sz_g2d_distance':
      return { type: 'g2d:distance', aVar: f(block, 'A'), bVar: f(block, 'B') }
    case 'sz_g2d_angle_to':
      return { type: 'g2d:angleTo', aVar: f(block, 'A'), bVar: f(block, 'B') }
    case 'sz_g2d_get_health':
      return { type: 'g2d:getHealth', spriteVar: f(block, 'SPRITE') }
    case 'sz_g2d_get_max_health':
      return { type: 'g2d:getMaxHealth', spriteVar: f(block, 'SPRITE') }
    case 'sz_g2d_enemy_damage':
      return { type: 'g2d:enemyDamage', spriteVar: f(block, 'SPRITE') }
    case 'sz_g2d_sprite_x':
      return { type: 'g2d:spriteX', spriteVar: f(block, 'SPRITE') }
    case 'sz_g2d_sprite_y':
      return { type: 'g2d:spriteY', spriteVar: f(block, 'SPRITE') }
    case 'sz_g2d_sprite_w':
      return { type: 'g2d:spriteW', spriteVar: f(block, 'SPRITE') }
    case 'sz_g2d_sprite_h':
      return { type: 'g2d:spriteH', spriteVar: f(block, 'SPRITE') }
    case 'sz_g2d_center_x':
      return { type: 'g2d:centerX', spriteVar: f(block, 'SPRITE') }
    case 'sz_g2d_center_y':
      return { type: 'g2d:centerY', spriteVar: f(block, 'SPRITE') }
    case 'sz_g2d_shape_w':
      return { type: 'g2d:shapeW' }
    case 'sz_g2d_shape_h':
      return { type: 'g2d:shapeH' }
    case 'sz_g2d_sprite_vx':
      return { type: 'g2d:spriteVx', spriteVar: f(block, 'SPRITE') }
    case 'sz_g2d_sprite_vy':
      return { type: 'g2d:spriteVy', spriteVar: f(block, 'SPRITE') }
    case 'sz_g2d_sprite_speed':
      return { type: 'g2d:spriteSpeed', spriteVar: f(block, 'SPRITE') }
    case 'sz_g2d_is_moving':
      return { type: 'g2d:isMoving', spriteVar: f(block, 'SPRITE') }
    case 'sz_g2d_is_moving_h':
      return { type: 'g2d:isMovingH', spriteVar: f(block, 'SPRITE') }
    case 'sz_g2d_is_moving_v':
      return { type: 'g2d:isMovingV', spriteVar: f(block, 'SPRITE') }
    case 'sz_g2d_random_between':
      return {
        type: 'g2d:randomBetween',
        min: exprInput(block, 'MIN', { type: 'num', value: 1 }),
        max: exprInput(block, 'MAX', { type: 'num', value: 6 }),
      }
    case 'sz_g2d_random_chance':
      return {
        type: 'g2d:randomChance',
        percent: exprInput(block, 'PERCENT', { type: 'num', value: 30 }),
      }
    case 'sz_g2d_has_health':
      return { type: 'g2d:hasHealth', spriteVar: f(block, 'SPRITE') }
    case 'sz_g2d_health_depleted':
      return { type: 'g2d:healthDepleted', spriteVar: f(block, 'SPRITE') }
    case 'sz_g2d_is_invincible':
      return { type: 'g2d:isInvincible', spriteVar: f(block, 'SPRITE') }
    case 'sz_g2d_cooldown_ready':
      return {
        type: 'g2d:cooldownReady',
        spriteVar: f(block, 'SPRITE'),
        frames: exprInput(block, 'FRAMES', { type: 'num', value: 20 }),
      }
    case 'sz_g2d_is_paused':
      return { type: 'g2d:isPaused' }
    case 'sz_g2d_camera_x':
      return { type: 'g2d:cameraX' }
    case 'sz_g2d_camera_y':
      return { type: 'g2d:cameraY' }
    case 'sz_g2d_random_x':
      return { type: 'g2d:randomX' }
    case 'sz_g2d_random_y':
      return { type: 'g2d:randomY' }
    case 'sz_g2d_tile_at':
      return { type: 'g2d:tileAtSprite', mapVar: f(block, 'MAP'), spriteVar: f(block, 'SPRITE') }
    case 'sz_g2d_scene_is':
      return { type: 'g2d:sceneIs', name: f(block, 'SCENE') || 'inicio' }
    case 'sz_g2d_stickpath_fell':
      return { type: 'g2d:stickPathFell', pathVar: f(block, 'PATH') }
    case 'sz_g2d_balloonpath_meters':
      return { type: 'g2d:balloonPathMeters', pathVar: f(block, 'PATH') }
    case 'sz_g2d_balloon_fuel_left':
      return { type: 'g2d:balloonFuel', spriteVar: f(block, 'SPRITE') }
    case 'sz_g2d_balloon_landed_out':
      return { type: 'g2d:balloonLandedOut', spriteVar: f(block, 'SPRITE') }
    case 'sz_g2d_pointer_down':
      return { type: 'g2d:pointerDown' }
    case 'sz_g2d_aim_released':
      return { type: 'g2d:aimReleased', throwerVar: f(block, 'THROWER') }
    case 'sz_g2d_banana_hit_thrower':
      return {
        type: 'g2d:bananaHitThrower',
        cityVar: f(block, 'CITY'),
        throwerVar: f(block, 'THROWER'),
      }
    case 'sz_g2d_banana_hit_city':
      return { type: 'g2d:bananaHitCity', cityVar: f(block, 'CITY') }
    case 'sz_g3d_key_down':
      return { type: 'g3d:keyDown', key: f(block, 'KEY') || 'KeyW' }
    case 'sz_g3d_collides':
      return { type: 'g3d:collides', aVar: f(block, 'A'), bVar: f(block, 'B') }
    case 'sz_g3d_hit_any':
      return { type: 'g3d:hitAny', objVar: f(block, 'OBJ'), groupVar: f(block, 'GROUP') }
    case 'sz_g3d_crosser_hit':
      return { type: 'g3d:crosserHit', objVar: f(block, 'OBJ'), worldVar: f(block, 'WORLD') }
    case 'sz_g3d_crosser_row':
      return { type: 'g3d:crosserRow', objVar: f(block, 'OBJ') }
    case 'sz_g3d_touches_box':
      return { type: 'g3d:touchesBox', objVar: f(block, 'OBJ'), groupVar: f(block, 'GROUP') }
    case 'sz_g3d_distance_to':
      return { type: 'g3d:distanceTo', aVar: f(block, 'A'), bVar: f(block, 'B') }
    case 'sz_g3d_count_swarm':
      return { type: 'g3d:countSwarm', swarmVar: f(block, 'SWARM') }
    case 'sz_g3d_count_group':
      return { type: 'g3d:countGroup', groupVar: f(block, 'GROUP') }
    case 'sz_g3d_is_near':
      return {
        type: 'g3d:isNear',
        aVar: f(block, 'A'),
        bVar: f(block, 'B'),
        dist: exprInput(block, 'DIST', { type: 'num', value: 2 }),
      }
    case 'sz_g3d_race_hit':
      return { type: 'g3d:raceHit', objVar: f(block, 'OBJ'), worldVar: f(block, 'WORLD') }
    case 'sz_g3d_race_laps':
      return { type: 'g3d:raceLaps', objVar: f(block, 'OBJ') }
    case 'sz_g3d_stack_score':
      return { type: 'g3d:stackScore', worldVar: f(block, 'WORLD') }
    case 'sz_g3d_stack_game_over':
      return { type: 'g3d:stackGameOver', worldVar: f(block, 'WORLD') }
    case 'sz_g3d_get_pos':
      return { type: 'g3d:getPos', objVar: f(block, 'OBJ'), axis: f(block, 'AXIS') || 'x' }
    case 'sz_g3d_get_vel':
      return { type: 'g3d:getVel', objVar: f(block, 'OBJ'), axis: f(block, 'AXIS') || 'x' }
    case 'sz_g3d_get_speed':
      return { type: 'g3d:getSpeed', objVar: f(block, 'OBJ') }
    case 'sz_g3d_is_moving':
      return { type: 'g3d:isMoving', objVar: f(block, 'OBJ') }
    case 'sz_g3d_get_rot':
      return { type: 'g3d:getRot', objVar: f(block, 'OBJ'), axis: f(block, 'AXIS') || 'x' }
    case 'sz_g3d_get_scale':
      return { type: 'g3d:getScale', objVar: f(block, 'OBJ') }
    case 'sz_g3d_dt':
      return { type: 'g3d:dt', worldVar: f(block, 'WORLD') }
    case 'sz_g3d_angle_to':
      return { type: 'g3d:angleTo', aVar: f(block, 'A'), bVar: f(block, 'B') }
    case 'sz_g3d_pick_at_mouse':
      return { type: 'g3d:pickAtMouse', worldVar: f(block, 'WORLD') }
    case 'sz_g3d_pointer_over':
      return { type: 'g3d:pointerOver', worldVar: f(block, 'WORLD'), objVar: f(block, 'OBJ') }
    case 'sz_g3d_aim_ahead':
      return {
        type: 'g3d:aimAhead',
        worldVar: f(block, 'WORLD'),
        objVar: f(block, 'OBJ'),
        dist: exprInput(block, 'DIST', { type: 'num', value: 100 }),
      }
    case 'sz_g3d_on_ground':
      return { type: 'g3d:onGround', worldVar: f(block, 'WORLD'), objVar: f(block, 'OBJ') }
    case 'sz_g3d_ground_height':
      return { type: 'g3d:groundHeight', worldVar: f(block, 'WORLD'), objVar: f(block, 'OBJ') }
    // ----- game-2d-advanced (kit profissional) -----
    case 'sz_gk_game_width':
      return { type: 'gk:gameWidth' }
    case 'sz_gk_game_height':
      return { type: 'gk:gameHeight' }
    case 'sz_gk_game_state':
      return { type: 'gk:gameState' }
    case 'sz_gk_state_is':
      return { type: 'gk:stateIs', name: f(block, 'STATE') || 'jogando' }
    case 'sz_gk_characters_touch':
      return { type: 'gk:charactersTouch', aVar: f(block, 'A'), bVar: f(block, 'B') }
    case 'sz_gk_char_x':
      return { type: 'gk:charX', charVar: f(block, 'CHAR') }
    case 'sz_gk_char_y':
      return { type: 'gk:charY', charVar: f(block, 'CHAR') }
    case 'sz_gk_key_down':
      return { type: 'gk:keyDown', key: f(block, 'KEY') || 'w' }
    case 'sz_gk_key_pressed':
      return { type: 'gk:keyPressed', key: f(block, 'KEY') || 'j' }
    case 'sz_gk_count_active':
      return { type: 'gk:countActive', mold: f(block, 'MOLD') }
    case 'sz_gk_touching_circle':
      return { type: 'gk:touchCircle', aVar: f(block, 'A'), bVar: f(block, 'B') }
    case 'sz_gk_did_hit':
      return { type: 'gk:didHit', aVar: f(block, 'WHO'), bVar: f(block, 'TARGET') }
    case 'sz_gk_is_on_ground':
      return { type: 'gk:isOnGround', charVar: f(block, 'WHO') }
    // 👾 R16 — Kit Monstrinhos
    case 'sz_gk_pkm_level_of':
      return { type: 'gk:pkmLevelOf', creature: f(block, 'CREATURE') }
    case 'sz_gk_pkm_has':
      return { type: 'gk:pkmHas', creature: f(block, 'CREATURE') }
    case 'sz_gk_pkm_team_size':
      return { type: 'gk:pkmTeamSize' }
    case 'sz_gk_pkm_ball_count':
      return { type: 'gk:pkmBallCount' }
    case 'sz_gk_pkm_caught':
      return { type: 'gk:pkmCaught' }
    // 🧭 R15 — primitivos gerais
    case 'sz_gk_is_inside':
      return { type: 'gk:isInside', charVar: f(block, 'WHO'), region: f(block, 'REGION') }
    case 'sz_gk_overlap_percent':
      return { type: 'gk:overlapPercent', charVar: f(block, 'WHO'), region: f(block, 'REGION') }
    case 'sz_gk_chance':
      return { type: 'gk:chance', percent: exprInput(block, 'PCT', { type: 'num', value: 50 }) }
    case 'sz_gk_distance_between':
      return { type: 'gk:distanceBetween', a: f(block, 'A'), b: f(block, 'B') }
    case 'sz_gk_point_in':
      return {
        type: 'gk:pointIn',
        x: exprInput(block, 'X', { type: 'num', value: 0 }),
        y: exprInput(block, 'Y', { type: 'num', value: 0 }),
        charVar: f(block, 'WHO'),
      }
    case 'sz_gk_opacity_of':
      return { type: 'gk:opacityOf', charVar: f(block, 'WHO') }
    case 'sz_gk_saved_value':
      return { type: 'gk:savedValue', name: f(block, 'NAME') }
    case 'sz_gk_velocity_of':
      return { type: 'gk:velocityOf', charVar: f(block, 'WHO'), axis: f(block, 'AXIS') }
    case 'sz_gk_property_of':
      return { type: 'gk:propertyOf', charVar: f(block, 'WHO'), prop: f(block, 'PROP') }
    case 'sz_gk_facing_of':
      return { type: 'gk:facingOf', charVar: f(block, 'WHO') }
    case 'sz_gk_cooldown_ready':
      return {
        type: 'gk:cooldownReady',
        charVar: f(block, 'WHO'),
        seconds: exprInput(block, 'SECS', { type: 'num', value: 0.5 }),
      }
    case 'sz_gk_tile_at':
      return {
        type: 'gk:tileAt',
        map: f(block, 'MAP'),
        x: exprInput(block, 'X', { type: 'num', value: 0 }),
        y: exprInput(block, 'Y', { type: 'num', value: 0 }),
      }
    case 'sz_gk_is_dead':
      return { type: 'gk:isDead', charVar: f(block, 'CHAR') }
    case 'sz_gk_is_invincible':
      return { type: 'gk:isInvincible', charVar: f(block, 'CHAR') }
    case 'sz_gk_luta_winner':
      return { type: 'gk:lutaWinner' }
    case 'sz_gk_luta_round':
      return { type: 'gk:lutaRound' }
    case 'sz_gk_luta_wins_of':
      return { type: 'gk:lutaWinsOf', charVar: f(block, 'WHO') }
    case 'sz_gk_luta_combo':
      return { type: 'gk:lutaCombo', charVar: f(block, 'WHO') }
    case 'sz_gk_luta_special':
      return { type: 'gk:lutaSpecial', charVar: f(block, 'WHO') }
    case 'sz_gk_luta_is_guarding':
      return { type: 'gk:lutaIsGuarding', charVar: f(block, 'WHO') }
    case 'sz_gk_anim_ended':
      return { type: 'gk:animEnded', charVar: f(block, 'WHO') }
    case 'sz_gk_entity_state':
      return { type: 'gk:entityState', charVar: f(block, 'WHO') }
    case 'sz_gk_angle_of':
      return { type: 'gk:angleOf', charVar: f(block, 'WHO') }
    case 'sz_gk_angle_to':
      return { type: 'gk:angleTo', charVar: f(block, 'WHO'), targetVar: f(block, 'TARGET') }
    case 'sz_gk_nearest_active':
      return {
        type: 'gk:nearestActive',
        mold: f(block, 'MOLD'),
        x: exprInput(block, 'X', { type: 'num', value: 0 }),
        y: exprInput(block, 'Y', { type: 'num', value: 0 }),
      }
    case 'sz_gk_random_active':
      return { type: 'gk:randomActive', mold: f(block, 'MOLD') }
    case 'sz_gk_nave_power_of':
      return { type: 'gk:navePowerOf', charVar: f(block, 'WHO') }
    case 'sz_gk_path_progress':
      return { type: 'gk:pathProgress', charVar: f(block, 'WHO') }
    case 'sz_gk_roll_dice':
      return { type: 'gk:rollDice', faces: exprInput(block, 'FACES', { type: 'num', value: 6 }) }
    case 'sz_gk_current_player':
      return { type: 'gk:currentPlayer' }
    case 'sz_gk_space_of':
      return { type: 'gk:spaceOf', who: f(block, 'WHO') }
    case 'sz_gk_pile_top':
      return { type: 'gk:pileTop', pileVar: f(block, 'PILE') }
    case 'sz_gk_pile_size':
      return { type: 'gk:pileSize', pileVar: f(block, 'PILE') }
    case 'sz_gk_card':
      return {
        type: 'gk:card',
        front: exprInput(block, 'FRONT', { type: 'str', value: '🍎' }),
        back: exprInput(block, 'BACK', { type: 'str', value: '?' }),
      }
    case 'sz_gk_card_is_up':
      return { type: 'gk:cardIsUp', card: exprInput(block, 'CARD', { type: 'num', value: 0 }) }
    case 'sz_gk_card_face':
      return { type: 'gk:cardFace', card: exprInput(block, 'CARD', { type: 'num', value: 0 }) }
    case 'sz_gk_card_at':
      return {
        type: 'gk:cardAt',
        x: exprInput(block, 'X', { type: 'num', value: 0 }),
        y: exprInput(block, 'Y', { type: 'num', value: 0 }),
        pileVar: f(block, 'PILE'),
      }
    case 'sz_gk_cards_energy':
      return { type: 'gk:cardsEnergy' }
    case 'sz_gk_cards_hero_life':
      return { type: 'gk:cardsHeroLife' }
    case 'sz_gk_cards_enemy_life':
      return { type: 'gk:cardsEnemyLife' }
    case 'sz_gk_cards_intent_action':
      return { type: 'gk:cardsIntentAction' }
    case 'sz_gk_cards_intent_value':
      return { type: 'gk:cardsIntentValue' }
    case 'sz_gk_pick_active':
      return {
        type: 'gk:pickActive',
        mold: f(block, 'MOLD'),
        mode: f(block, 'MODE') || 'maior',
        prop: f(block, 'PROP') || 'x',
      }
    case 'sz_gk_td_coins':
      return { type: 'gk:tdCoins' }
    case 'sz_gk_count_item':
      return { type: 'gk:countItem', name: f(block, 'NAME') }
    case 'sz_gk_health_of':
      return { type: 'gk:healthOf', charVar: f(block, 'CHAR') }
    case 'sz_gk_time_survived':
      return { type: 'gk:timeSurvived' }
    case 'sz_gk_kills':
      return { type: 'gk:kills' }
    case 'sz_gk_camera_x':
      return { type: 'gk:cameraX' }
    case 'sz_gk_camera_y':
      return { type: 'gk:cameraY' }
    case 'sz_gk_mouse_x':
      return { type: 'gk:mouseX' }
    case 'sz_gk_mouse_y':
      return { type: 'gk:mouseY' }
    case 'sz_gk_mouse_screen_x':
      return { type: 'gk:mouseScreenX' }
    case 'sz_gk_mouse_screen_y':
      return { type: 'gk:mouseScreenY' }
    case 'sz_gk_mouse_down':
      return { type: 'gk:mouseDown' }
    case 'sz_gk_rpg_cell':
      return { type: 'gk:rpgCell', n: exprInput(block, 'N', { type: 'num', value: 3 }) }
    case 'sz_gk_rpg_has_flag':
      return { type: 'gk:rpgHasFlag', flag: f(block, 'FLAG') }
    case 'sz_gk_rpg_has_item':
      return { type: 'gk:rpgHasItem', item: f(block, 'NAME') }
    case 'sz_gk_rpg_battle_won':
      return { type: 'gk:rpgBattleWon' }
    case 'sz_gk_rpg_has_save':
      return { type: 'gk:rpgHasSave' }
    case 'sz_gk_rpg_level':
      return { type: 'gk:rpgLevel' }
    case 'sz_gk_rpg_xp':
      return { type: 'gk:rpgXp' }
    case 'sz_gk_battler_life':
      return { type: 'gk:battlerLife', name: f(block, 'NAME') }
    case 'sz_gk_battler_max_life':
      return { type: 'gk:battlerMaxLife', name: f(block, 'NAME') }
    case 'sz_gk_rpg_current_map':
      return { type: 'gk:rpgCurrentMap' }
    case 'sz_gk_board_get':
      return {
        type: 'gk:boardGet',
        name: f(block, 'NAME'),
        col: exprInput(block, 'COL', { type: 'num', value: 0 }),
        row: exprInput(block, 'ROW', { type: 'num', value: 0 }),
      }
    case 'sz_gk_board_count':
      return {
        type: 'gk:boardCount',
        name: f(block, 'NAME'),
        value: exprInput(block, 'VALUE', { type: 'num', value: 1 }),
      }
    case 'sz_gk_board_in':
      return {
        type: 'gk:boardIn',
        name: f(block, 'NAME'),
        col: exprInput(block, 'COL', { type: 'num', value: 0 }),
        row: exprInput(block, 'ROW', { type: 'num', value: 0 }),
      }
    case 'sz_g3k_world_size':
      return { type: 'g3k:worldSize' }
    case 'sz_g3k_count_alive':
      return { type: 'g3k:countAlive', mold: f(block, 'MOLD') }
    case 'sz_g3k_key_down':
      return { type: 'g3k:keyDown', key: f(block, 'KEY') || 'w' }
    case 'sz_g3k_key_pressed':
      return { type: 'g3k:keyPressed', key: f(block, 'KEY') || 'j' }
    case 'sz_g3k_mouse_down':
      return { type: 'g3k:mouseDown' }
    case 'sz_g3k_mouse_pressed':
      return { type: 'g3k:mousePressed' }
    case 'sz_g3k_pos_of':
      return { type: 'g3k:posOf', axis: f(block, 'AXIS') || 'x', charVar: f(block, 'CHAR') }
    case 'sz_g3k_exists':
      return { type: 'g3k:exists', charVar: f(block, 'CHAR') }
    case 'sz_g3k_is_mold':
      return { type: 'g3k:isMold', charVar: f(block, 'CHAR'), mold: f(block, 'MOLD') }
    case 'sz_g3k_on_ground':
      return { type: 'g3k:onGround', charVar: f(block, 'CHAR') }
    case 'sz_g3k_velocity_of':
      return {
        type: 'g3k:velocityOf',
        charVar: f(block, 'CHAR'),
        axis: (f(block, 'AXIS') || 'x') as 'x' | 'y' | 'z',
      }
    case 'sz_g3k_distance_between':
      return { type: 'g3k:distanceBetween', aVar: f(block, 'A'), bVar: f(block, 'B') }
    case 'sz_g3k_random_between':
      return {
        type: 'g3k:randomBetween',
        from: exprInput(block, 'FROM', { type: 'num', value: 1 }),
        to: exprInput(block, 'TO', { type: 'num', value: 10 }),
      }
    case 'sz_g3k_random_chance':
      return {
        type: 'g3k:randomChance',
        percent: exprInput(block, 'PERCENT', { type: 'num', value: 50 }),
      }
    case 'sz_g3k_time_left':
      return { type: 'g3k:timeLeft' }
    case 'sz_g3k_max_health_of':
      return { type: 'g3k:maxHealthOf', charVar: f(block, 'CHAR') }
    case 'sz_g3k_state_of':
      return { type: 'g3k:stateOf', charVar: f(block, 'CHAR') }
    case 'sz_g3k_pointer_over':
      return { type: 'g3k:pointerOver', charVar: f(block, 'CHAR') }
    case 'sz_g3k_ground_point':
      return { type: 'g3k:groundPoint', axis: (f(block, 'AXIS') || 'x') as 'x' | 'y' | 'z' }
    // ---- Mundo 3D (world-3d) — valores ----
    case 'sz_w3d_world_size':
      return { type: 'w3d:worldSize' }
    case 'sz_w3d_ground_height':
      return {
        type: 'w3d:groundHeight',
        x: exprInput(block, 'X', { type: 'num', value: 0 }),
        z: exprInput(block, 'Z', { type: 'num', value: 0 }),
      }
    case 'sz_w3d_car_pos':
      return { type: 'w3d:carPos', axis: (f(block, 'AXIS') || 'x') as 'x' | 'y' | 'z' }
    case 'sz_w3d_car_speed':
      return { type: 'w3d:carSpeed' }
    case 'sz_w3d_person_pos':
      return { type: 'w3d:personPos', axis: (f(block, 'AXIS') || 'x') as 'x' | 'y' | 'z' }
    case 'sz_w3d_is_driving':
      return { type: 'w3d:isDriving' }
    case 'sz_w3d_coin_count':
      return { type: 'w3d:coinCount' }
    case 'sz_w3d_has_achievement':
      return { type: 'w3d:hasAchievement', name: f(block, 'NAME') || 'conquista' }
    case 'sz_w3d_inventory_count':
      return { type: 'w3d:inventoryCount', item: f(block, 'ITEM') || 'item' }
    case 'sz_w3d_inventory_has':
      return {
        type: 'w3d:inventoryHas',
        item: f(block, 'ITEM') || 'item',
        n: exprInput(block, 'N', { type: 'num', value: 1 }),
      }
    case 'sz_w3d_key_down':
      return { type: 'w3d:keyDown', key: f(block, 'KEY') || 'e' }
    case 'sz_w3d_key_pressed':
      return { type: 'w3d:keyPressed', key: f(block, 'KEY') || 'e' }
    case 'sz_w3d_time_of_day':
      return { type: 'w3d:timeOfDay' }
    case 'sz_w3d_race_time':
      return { type: 'w3d:raceTime' }
    case 'sz_w3d_race_best':
      return { type: 'w3d:raceBest' }
    case 'sz_w3d_pins_down':
      return { type: 'w3d:pinsDown' }
    case 'sz_w3d_knocked_count':
      return { type: 'w3d:knockedCount' }
    case 'sz_g3k_entity_value':
      return { type: 'g3k:entityValue', key: f(block, 'KEY'), charVar: f(block, 'CHAR') }
    case 'sz_g3k_state_time':
      return { type: 'g3k:stateTime', charVar: f(block, 'CHAR') }
    case 'sz_g3k_entity_state_is':
      return {
        type: 'g3k:entityStateIs',
        charVar: f(block, 'CHAR'),
        state: f(block, 'STATE') || 'parado',
      }
    case 'sz_g3k_is_aiming_at':
      return { type: 'g3k:isAimingAt', aVar: f(block, 'A'), bVar: f(block, 'B') }
    case 'sz_g3k_touches':
      return {
        type: 'g3k:touches',
        aVar: f(block, 'A'),
        bVar: f(block, 'B'),
        dist: exprInput(block, 'DIST', { type: 'num', value: 1.5 }),
      }
    case 'sz_g3k_health_of':
      return { type: 'g3k:healthOf', charVar: f(block, 'CHAR') }
    case 'sz_g3k_state_is':
      return { type: 'g3k:stateIs', name: f(block, 'STATE') || 'jogando' }
    case 'sz_g3k_game_state':
      return { type: 'g3k:gameState' }
    case 'sz_val_is_fullscreen':
      return { type: 'isFullscreen' }
    case 'sz_val_device_pixel_ratio':
      return { type: 'global', kind: 'devicePixelRatio' }
    case 'sz_val_system_dark':
      return { type: 'systemDark' }
    case 'sz_val_perf_now':
      return { type: 'perfNow' }
    case 'sz_val_date_part':
      return {
        type: 'dateGet',
        part: f(block, 'PART') as
          | 'year'
          | 'month'
          | 'dayOfMonth'
          | 'weekday'
          | 'hours'
          | 'minutes'
          | 'seconds'
          | 'ms',
      }
    case 'sz_val_window_width':
      return { type: 'global', kind: 'innerWidth' }
    case 'sz_val_window_height':
      return { type: 'global', kind: 'innerHeight' }
    case 'sz_val_canvas_width':
      return { type: 'canvasDim', ctxVar: f(block, 'CTX'), dim: 'width' }
    case 'sz_val_canvas_height':
      return { type: 'canvasDim', ctxVar: f(block, 'CTX'), dim: 'height' }
    case 'sz_val_random':
      return {
        type: 'random',
        min: exprInput(block, 'MIN', { type: 'num', value: 0 }),
        max: exprInput(block, 'MAX', { type: 'num', value: 100 }),
      }
    case 'sz_val_color_hsl':
      return {
        type: 'hslColor',
        h: exprInput(block, 'H', { type: 'num', value: 0 }),
        s: exprInput(block, 'S', { type: 'num', value: 50 }),
        l: exprInput(block, 'L', { type: 'num', value: 50 }),
      }
    case 'sz_val_random_float':
      return { type: 'randomFloat' }
    case 'sz_math_arithmetic':
      return {
        type: 'binop',
        op: f(block, 'OP') as '+' | '-' | '*' | '/' | '%' | '**',
        left: exprInput(block, 'A', { type: 'num', value: 0 }),
        right: exprInput(block, 'B', { type: 'num', value: 0 }),
      }
    case 'sz_val_compare':
      return {
        type: 'binop',
        op: f(block, 'OP') as '>' | '<' | '>=' | '<=' | '==' | '!=' | '===' | '!==',
        left: exprInput(block, 'LEFT', { type: 'num', value: 0 }),
        right: exprInput(block, 'RIGHT', { type: 'num', value: 0 }),
      }
    case 'sz_val_logic':
      return {
        type: 'logical',
        op: f(block, 'OP') as '&&' | '||',
        left: exprInput(block, 'LEFT', { type: 'bool', value: true }),
        right: exprInput(block, 'RIGHT', { type: 'bool', value: true }),
      }
    case 'sz_val_not':
      return {
        type: 'logicalNot',
        value: exprInput(block, 'VALUE', { type: 'bool', value: true }),
      }
    case 'sz_val_ternary':
      return {
        type: 'ternary',
        condition: exprInput(block, 'COND', { type: 'bool', value: true }),
        whenTrue: exprInput(block, 'TRUE_VAL', { type: 'num', value: 0 }),
        whenFalse: exprInput(block, 'FALSE_VAL', { type: 'num', value: 0 }),
      }
    case 'sz_math_function':
      return {
        type: 'mathUnary',
        fn: f(block, 'FN') as 'round' | 'floor' | 'ceil' | 'abs' | 'sqrt' | 'sign',
        arg: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
      }
    case 'sz_val_array_map':
      return {
        type: 'arrayMap',
        arrayVar: f(block, 'ARR'),
        itemName: f(block, 'ITEM') || 'item',
        transform: exprInput(block, 'TRANSFORM', { type: 'num', value: 0 }),
      }
    case 'sz_math_trig':
      return {
        type: 'mathUnary',
        fn: f(block, 'FN') as 'sin' | 'cos' | 'tan' | 'asin' | 'acos' | 'atan',
        arg: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
      }
    case 'sz_math_minmax':
      return {
        type: 'mathBinary',
        fn: f(block, 'FN') as 'min' | 'max',
        a: exprInput(block, 'A', { type: 'num', value: 0 }),
        b: exprInput(block, 'B', { type: 'num', value: 0 }),
      }
    case 'sz_math_atan2':
      return {
        type: 'mathBinary',
        fn: 'atan2',
        a: exprInput(block, 'A', { type: 'num', value: 0 }),
        b: exprInput(block, 'B', { type: 'num', value: 0 }),
      }
    case 'sz_math_hypot':
      return {
        type: 'mathBinary',
        fn: 'hypot',
        a: exprInput(block, 'A', { type: 'num', value: 0 }),
        b: exprInput(block, 'B', { type: 'num', value: 0 }),
      }
    case 'sz_val_distance':
      return {
        type: 'distance',
        a: exprInput(block, 'OBJ1', { type: 'var', name: 'player' }),
        b: exprInput(block, 'OBJ2', { type: 'var', name: 'enemy' }),
      }
    case 'sz_math_angle_convert':
      return {
        type: 'angleConvert',
        dir: f(block, 'DIR') as 'degToRad' | 'radToDeg',
        arg: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
      }
    case 'sz_val_math_pi':
      return { type: 'mathConst', name: 'PI' }
    case 'sz_val_event_pos':
      return { type: 'eventProp', prop: f(block, 'AXIS') as 'clientX' | 'clientY' }
    case 'sz_val_event_key':
      return { type: 'eventProp', prop: f(block, 'PROP') as 'key' | 'code' }
    case 'sz_val_vector2d':
      return {
        type: 'vec2',
        x: exprInput(block, 'X', { type: 'num', value: 0 }),
        y: exprInput(block, 'Y', { type: 'num', value: 0 }),
      }
    case 'sz_val_vector3d':
      return {
        type: 'vec3',
        x: exprInput(block, 'X', { type: 'num', value: 0 }),
        y: exprInput(block, 'Y', { type: 'num', value: 0 }),
        z: exprInput(block, 'Z', { type: 'num', value: 0 }),
      }
    case 'sz_val_array':
      return { type: 'array', items: getArrayItems(block) }
    case 'sz_val_array_length':
      return { type: 'arrayLength', arrayVar: f(block, 'NAME') }
    case 'sz_val_this_prop':
      return { type: 'thisProp', name: f(block, 'NAME') }
    case 'sz_val_get_prop':
      return { type: 'propAccess', objectVar: f(block, 'OBJ'), name: f(block, 'NAME') }
    case 'sz_val_call_method':
      return {
        type: 'callMethodExpr',
        objectVar: f(block, 'OBJ'),
        method: f(block, 'METHOD'),
        args: getArgs(block),
      }
    case 'sz_val_object':
      return { type: 'objectLiteral', entries: getObjectEntries(block) }
    case 'sz_val_member_get':
      return {
        type: 'memberGet',
        object: exprInput(block, 'OBJ', { type: 'var', name: 'objeto' }),
        name: f(block, 'NAME'),
      }
    case 'sz_val_member_get_optional':
      return {
        type: 'memberGet',
        object: exprInput(block, 'OBJ', { type: 'var', name: 'objeto' }),
        name: f(block, 'NAME'),
        optional: true,
      }
    case 'sz_val_method_on':
      return {
        type: 'memberCallExpr',
        object: exprInput(block, 'OBJ', { type: 'var', name: 'objeto' }),
        method: f(block, 'METHOD'),
        args: getArgs(block),
      }
    case 'sz_val_new': {
      const reference = constructorReference(f(block, 'CLASS'))
      return {
        type: 'newExpr',
        ...reference,
        args: getArgs(block),
      }
    }
    case 'sz_t3d_new': {
      // CLASS = referência completa: `THREE.Vector3` (namespace THREE) ou `GLTFLoader`
      // (bare, sem namespace). Quebra no 1º ponto.
      const reference = constructorReference(f(block, 'CLASS'))
      return {
        type: 'newExpr',
        ...reference,
        args: getArgs(block),
      }
    }
    case 'sz_t3d_object_count':
      // `cena.children.length` — quantos filhos diretos o objeto tem.
      return {
        type: 'memberGet',
        object: {
          type: 'memberGet',
          object: { type: 'var', name: f(block, 'TARGET') },
          name: 'children',
        },
        name: 'length',
      }
    case 'sz_val_object_op':
      return {
        type: 'objectOp',
        op: (f(block, 'OP') || 'keys') as 'keys' | 'values' | 'entries',
        object: exprInput(block, 'OBJ', { type: 'var', name: 'objeto' }),
      }
    case 'sz_val_index_get':
      return {
        type: 'indexGet',
        object: exprInput(block, 'OBJ', { type: 'var', name: 'lista' }),
        index: exprInput(block, 'INDEX', { type: 'num', value: 0 }),
      }
    case 'sz_val_call_function':
      return { type: 'call', name: f(block, 'NAME'), args: getArgs(block) }
    case 'sz_val_join':
      return { type: 'concat', parts: getArrayItems(block) }
    case 'sz_val_array_index':
      return {
        type: 'index',
        arrayVar: f(block, 'NAME'),
        index: exprInput(block, 'INDEX', { type: 'num', value: 0 }),
      }
    case 'sz_val_array_last':
      return { type: 'arrayLast', arrayVar: f(block, 'NAME') }
    case 'sz_val_array_find':
      return {
        type: 'arrayFind',
        arrayVar: f(block, 'NAME'),
        itemName: f(block, 'ITEM'),
        cond: exprInput(block, 'COND', { type: 'bool', value: true }),
      }
    case 'sz_val_array_filter':
      return {
        type: 'arrayFilter',
        array: exprInput(block, 'ARRAY', { type: 'var', name: 'lista' }),
        itemName: f(block, 'ITEM'),
        cond: exprInput(block, 'COND', { type: 'bool', value: true }),
      }
    case 'sz_val_concat_arrays':
      return { type: 'concatArrays', parts: getArrayItems(block) }
    case 'sz_val_shuffle':
      return { type: 'shuffle', arrayVar: f(block, 'NAME') }
    case 'sz_val_dataset':
      return { type: 'datasetGet', objectVar: f(block, 'OBJ'), key: f(block, 'KEY') }
    case 'sz_val_get_element':
      return { type: 'getElement', id: f(block, 'ID') }
    case 'sz_val_query_select':
      return {
        type: 'querySelectorValue',
        selector: f(block, 'SELECTOR'),
        all: f(block, 'MODE') !== 'one',
      }
    case 'sz_val_promise_all':
      return { type: 'promiseAll', list: exprInput(block, 'LIST', { type: 'array', items: [] }) }
    case 'sz_val_new_promise':
      return {
        type: 'newPromise',
        param: f(block, 'PARAM'),
        body: getStatementChildren(block, 'DO', new Set()),
      }
    case 'sz_val_storage_get':
      return {
        type: 'storageGet',
        store: f(block, 'STORE') === 'session' ? 'session' : 'local',
        key: { type: 'str', value: f(block, 'KEY') },
      }
    case 'sz_val_class_contains':
      return {
        type: 'classContains',
        targetId: f(block, 'TARGET'),
        ...classTargetKind(block),
        className: f(block, 'CLASS'),
      }
    case 'sz_val_this':
      return { type: 'thisRef' }
    case 'sz_val_arg':
      // Relator de parâmetro: no IR é apenas uma variável (mesmo identificador).
      return { type: 'var', name: f(block, 'NAME') }
    default:
      return null
  }
}

/**
 * Lê argumentos variádicos de um bloco com o mutator `sz_args_mutator`:
 * percorre as tomadas `ARG0..ARG{n-1}`. Slots vazios viram `num 0`.
 */
function getArgs(block: Blockly.Block): JSExpr[] {
  const out: JSExpr[] = []
  for (let i = 0; block.getInput(`ARG${i}`); i += 1) {
    out.push(exprInput(block, `ARG${i}`, { type: 'num', value: 0 }))
  }
  return out
}

/** Itens de um bloco de array (`sz_val_array`): tomadas de valor `ITEM0..ITEM{n-1}`. */
function getArrayItems(block: Blockly.Block): JSExpr[] {
  const out: JSExpr[] = []
  for (let i = 0; block.getInput(`ITEM${i}`); i += 1) {
    out.push(exprInput(block, `ITEM${i}`, { type: 'num', value: 0 }))
  }
  return out
}

/** Pares de um objeto literal (`sz_val_object`): campo `KEY{i}` + tomada `ITEM{i}`. */
function getObjectEntries(block: Blockly.Block): Array<{ key: string; value: JSExpr }> {
  const out: Array<{ key: string; value: JSExpr }> = []
  for (let i = 0; block.getInput(`ITEM${i}`); i += 1) {
    out.push({
      key: f(block, `KEY${i}`),
      value: exprInput(block, `ITEM${i}`, { type: 'num', value: 0 }),
    })
  }
  return out
}

/**
 * Lê uma "tomada de valor" (`input_value`): devolve a expressão do bloco
 * encaixado (ou seu shadow) ou o `fallback` se o slot estiver vazio.
 */
function exprInput(block: Blockly.Block, name: string, fallback: JSExpr): JSExpr {
  return blockToExpr(block.getInputTargetBlock(name)) ?? fallback
}

interface ClassMembers {
  ctorParams: string[]
  /**
   * `block.id` do `sz_js_constructor`, preservado p/ o sourcemap ter uma entrada
   * apontando para a faixa `constructor(...) { … }` no JS gerado (necessário p/
   * o realce bloco↔código no modo Ponte).
   */
  ctorId?: string
  ctorBody: JSStatement[]
  methods: Array<{ __id?: string; name: string; params: string[]; body: JSStatement[] }>
}

/**
 * Lê os membros encaixados no input MEMBERS: o `sz_js_constructor` (parâmetros +
 * corpo) e os `sz_js_class_method`. Estados legados com mais de um construtor
 * falham explicitamente: escolher um deles descartaria código do aluno.
 */
function getClassMembers(block: Blockly.Block, seen: Set<string>): ClassMembers {
  const out: ClassMembers = { ctorParams: [], ctorBody: [], methods: [] }
  let cur: Blockly.Block | null = block.getInputTargetBlock('MEMBERS')
  while (cur) {
    if (cur.isInsertionMarker()) {
      cur = cur.getNextBlock()
      continue
    }
    if (cur.type === 'sz_js_constructor') {
      if (out.ctorId) {
        throw new Error(
          `A classe “${f(block, 'NAME')}” tem mais de um construtor. Mantenha apenas um antes de gerar o projeto.`,
        )
      }
      out.ctorParams = getParamNames(cur)
      out.ctorBody = getStatementChildren(cur, 'BODY', seen)
      out.ctorId = cur.id
    } else if (cur.type === 'sz_js_class_method') {
      out.methods.push({
        __id: cur.id,
        name: f(cur, 'NAME'),
        params: getParamNames(cur),
        body: getStatementChildren(cur, 'BODY', seen),
        ...(f(cur, 'ASYNC') === 'TRUE' ? { async: true } : {}),
      })
    }
    cur = cur.getNextBlock()
  }
  return out
}

/**
 * Coleta, em ordem, as declarações `propriedade: valor` dos blocos `sz_css_decl`
 * encaixados no input CHILDREN de uma "Regra CSS". Declarações com propriedade
 * vazia são ignoradas. Devolve também um mapa `propriedade → block.id` para
 * alimentar o sourcemap por declaração (realce do bloco da declaração e não só
 * da regra-pai).
 */
function getCssDeclarations(
  block: Blockly.Block,
  name: string,
): {
  declarations: CSSDeclarations
  declIds: Record<string, string>
} {
  const entries: CSSDeclaration[] = []
  const declarations: Record<string, string> = {}
  const declIds: Record<string, string> = {}
  let hasDuplicate = false
  let cur: Blockly.Block | null = block.getInputTargetBlock(name)
  while (cur) {
    if (cur.isInsertionMarker()) {
      cur = cur.getNextBlock()
      continue
    }
    if (cur.type === 'sz_css_decl') {
      const prop = f(cur, 'PROP').trim()
      if (prop) {
        const value = f(cur, 'VALUE').trim()
        if (Object.hasOwn(declarations, prop)) hasDuplicate = true
        declarations[prop] = value
        declIds[prop] = cur.id
        entries.push({ property: prop, value, __id: cur.id })
      }
    }
    cur = cur.getNextBlock()
  }
  return { declarations: hasDuplicate ? entries : declarations, declIds }
}

/** Coleta os blocos `sz_css_keyframe_step` de um input → passos da animação. */
function getKeyframeSteps(
  block: Blockly.Block,
  name: string,
): Array<{ at: string; declarations: CSSDeclarations }> {
  const out: Array<{ at: string; declarations: CSSDeclarations }> = []
  let cur: Blockly.Block | null = block.getInputTargetBlock(name)
  while (cur) {
    if (cur.isInsertionMarker()) {
      cur = cur.getNextBlock()
      continue
    }
    if (cur.type === 'sz_css_keyframe_step') {
      const at = f(cur, 'AT').trim() || '0%'
      const { declarations } = getCssDeclarations(cur, 'DECLS')
      out.push({ at, declarations })
    }
    cur = cur.getNextBlock()
  }
  return out
}

/**
 * Coleta os filhos CSS encaixados num `input_statement` (ex.: as regras dentro
 * de uma media query). Espelha {@link getStatementChildren}, mas filtra nós
 * `kind === 'css'` e anexa o `__id` de cada bloco para o source map cruzado.
 */
function getCssEntryChildren(block: Blockly.Block, name: string, seen: Set<string>): CSSEntry[] {
  const input = block.getInputTargetBlock(name)
  if (!input) return []
  const out: CSSEntry[] = []
  let cur: Blockly.Block | null = input
  while (cur) {
    if (cur.isInsertionMarker()) {
      cur = cur.getNextBlock()
      continue
    }
    const node = blockToIR(cur, seen)
    if (node && node.kind === 'css') {
      ;(node.value as { __id?: string }).__id = cur.id
      out.push(node.value)
    }
    cur = cur.getNextBlock()
  }
  return out
}

function blockToIR(block: Blockly.Block, seen: Set<string>): RoutedNode | null {
  const webCodec = webCodecForBlockType(block.type)
  if (webCodec?.irKind === 'html') {
    const webHTML = htmlBlockToIR(block, seen, { children: getHtmlChildren })
    if (webHTML) return { kind: 'html', value: webHTML }
  }
  if (webCodec?.irKind === 'css') {
    return cssBlockToIR(block, seen, {
      field: f,
      numberField: fn,
      declarations: getCssDeclarations,
      entries: getCssEntryChildren,
      keyframeSteps: getKeyframeSteps,
    })
  }
  if (webCodec?.category === 'canvas' && webCodec.irKind === 'statement') {
    return canvasStatementBlockToIR(block, seen, {
      field: f,
      numberField: fn,
      expression: exprInput,
      statements: getStatementChildren,
    })
  }
  switch (block.type) {
    case 'sz_legacy_nested_start':
    case 'sz_legacy_nested_event':
    case 'sz_legacy_nested_loop': {
      const [statement] = getStatementChildren(block, 'CHILD', seen)
      return statement ? { kind: 'js', value: statement } : null
    }
    case 'sz_adv_raw_html':
      return { kind: 'html', value: { type: 'rawHTML', html: f(block, 'CODE'), advanced: true } }

    case 'sz_adv_raw_css':
      return { kind: 'css', value: { type: 'rawCSS', code: f(block, 'CODE'), advanced: true } }

    // ---- JS ----
    case 'sz_js_on_click':
      return {
        kind: 'js',
        value: {
          type: 'event',
          target: f(block, 'TARGET'),
          ...targetKindField(block),
          event: 'click',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_click_anywhere':
      return {
        kind: 'js',
        value: {
          type: 'event',
          target: 'document',
          targetKind: 'document',
          event: 'click',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_key':
      return {
        kind: 'js',
        value: {
          type: 'event',
          ...eventTargetFields(block, 'document'),
          event: f(block, 'WHEN') as 'keydown' | 'keyup',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_mousemove':
      return {
        kind: 'js',
        value: {
          type: 'event',
          ...eventTargetFields(block, 'document'),
          event: 'pointermove',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_pointer_down':
      return {
        kind: 'js',
        value: {
          type: 'event',
          ...eventTargetFields(block, 'window'),
          event: 'pointerdown',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_pointer_up':
      return {
        kind: 'js',
        value: {
          type: 'event',
          ...eventTargetFields(block, 'window'),
          event: 'pointerup',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_load':
      return {
        kind: 'js',
        value: {
          type: 'event',
          target: 'window',
          targetKind: 'window',
          event: 'load',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_resize':
      return {
        kind: 'js',
        value: {
          type: 'event',
          target: 'window',
          targetKind: 'window',
          event: 'resize',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_context_menu':
      return {
        kind: 'js',
        value: {
          type: 'event',
          target: 'window',
          targetKind: 'window',
          event: 'contextmenu',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_blur':
      return {
        kind: 'js',
        value: {
          type: 'event',
          target: 'window',
          targetKind: 'window',
          event: 'blur',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_fullscreen_change':
      return {
        kind: 'js',
        value: {
          type: 'event',
          target: 'document',
          targetKind: 'document',
          event: 'fullscreenchange',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_request_fullscreen':
      return { kind: 'js', value: { type: 'requestFullscreen' } }
    case 'sz_js_exit_fullscreen':
      return { kind: 'js', value: { type: 'exitFullscreen' } }
    case 'sz_js_toggle_fullscreen':
      return { kind: 'js', value: { type: 'toggleFullscreen' } }
    case 'sz_js_array_push':
      return {
        kind: 'js',
        value: {
          type: 'arrayPush',
          arrayVar: f(block, 'NAME'),
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_js_array_remove':
      return {
        kind: 'js',
        value: {
          type: 'arrayRemove',
          arrayVar: f(block, 'NAME'),
          end: f(block, 'END') as 'pop' | 'shift',
        },
      }
    case 'sz_js_array_splice':
      return {
        kind: 'js',
        value: {
          type: 'arraySplice',
          arrayVar: f(block, 'NAME'),
          start: exprInput(block, 'START', { type: 'num', value: 0 }),
          count: exprInput(block, 'COUNT', { type: 'num', value: 1 }),
        },
      }
    case 'sz_js_console_log_text':
      return {
        kind: 'js',
        value: { type: 'consoleLog', value: { type: 'str', value: f(block, 'VALUE') } },
      }
    case 'sz_js_console_log_var':
      return {
        kind: 'js',
        value: { type: 'consoleLog', value: { type: 'var', name: f(block, 'NAME') } },
      }
    case 'sz_js_console_log_value':
      return {
        kind: 'js',
        value: { type: 'consoleLog', value: exprInput(block, 'VALUE', { type: 'str', value: '' }) },
      }
    case 'sz_js_alert_text':
      return {
        kind: 'js',
        value: { type: 'alert', value: { type: 'str', value: f(block, 'VALUE') } },
      }
    case 'sz_js_alert_var':
      return {
        kind: 'js',
        value: { type: 'alert', value: { type: 'var', name: f(block, 'NAME') } },
      }
    case 'sz_js_get_property':
      return {
        kind: 'js',
        value: {
          type: 'getProperty',
          targetId: f(block, 'TARGET'),
          ...targetKindField(block),
          property: f(block, 'PROP') as 'textContent' | 'value',
          varName: f(block, 'NAME'),
        },
      }
    case 'sz_js_set_property_text':
      return {
        kind: 'js',
        value: {
          type: 'setProperty',
          targetId: f(block, 'TARGET'),
          ...targetKindField(block),
          property: f(block, 'PROP') as 'textContent' | 'value',
          value: { type: 'str', value: f(block, 'VALUE') },
        },
      }
    case 'sz_js_set_property_var':
      return {
        kind: 'js',
        value: {
          type: 'setProperty',
          targetId: f(block, 'TARGET'),
          ...targetKindField(block),
          property: f(block, 'PROP') as 'textContent' | 'value',
          value: { type: 'var', name: f(block, 'NAME') },
        },
      }
    case 'sz_js_set_property_calc':
      return {
        kind: 'js',
        value: {
          type: 'setProperty',
          targetId: f(block, 'TARGET'),
          ...targetKindField(block),
          property: f(block, 'PROP') as 'textContent' | 'value',
          value: { type: 'now', kind: f(block, 'CALC') as 'year' | 'date' | 'time' },
        },
      }
    case 'sz_js_set_property':
      return {
        kind: 'js',
        value: {
          type: 'setProperty',
          targetId: f(block, 'TARGET'),
          ...targetKindField(block),
          property: f(block, 'PROP') as 'textContent' | 'value' | 'innerHTML',
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_js_set_style': {
      const custom = f(block, 'CUSTOM').trim()
      return {
        kind: 'js',
        value: {
          type: 'setStyle',
          targetId: f(block, 'TARGET'),
          ...targetKindField(block),
          property: custom || f(block, 'PROP') || 'left',
          value: exprInput(block, 'VALUE', { type: 'str', value: '' }),
        },
      }
    }
    case 'sz_js_set_style_text':
      return {
        kind: 'js',
        value: {
          type: 'setStyle',
          targetId: f(block, 'TARGET'),
          ...targetKindField(block),
          property: 'cssText',
          value: exprInput(block, 'VALUE', { type: 'str', value: '' }),
        },
      }
    case 'sz_js_set_attribute':
      return {
        kind: 'js',
        value: {
          type: 'setAttribute',
          targetId: f(block, 'TARGET'),
          ...targetKindField(block),
          name: f(block, 'NAME') || 'stroke',
          value: exprInput(block, 'VALUE', { type: 'str', value: '' }),
        },
      }
    case 'sz_js_set_text':
      return {
        kind: 'js',
        value: {
          type: 'setProperty',
          targetId: f(block, 'TARGET'),
          targetKind: 'id',
          property: 'textContent',
          value: { type: 'str', value: f(block, 'VALUE') },
        },
      }
    case 'sz_js_var_declare':
      return {
        kind: 'js',
        value: { type: 'declareVar', name: f(block, 'NAME') },
      }
    case 'sz_js_var_create':
      return {
        kind: 'js',
        value: {
          type: 'var',
          name: f(block, 'NAME'),
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_js_const_create':
      return {
        kind: 'js',
        value: {
          type: 'var',
          kind: 'const',
          name: f(block, 'NAME'),
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_js_var_assign':
      return {
        kind: 'js',
        value: {
          type: 'assign',
          name: f(block, 'NAME'),
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_js_var_increment': {
      // DELTA negativo relê como `x = x - |n|` (não `x = x + -n`): é a forma
      // canônica que o gerador emite p/ `x -= n`/`x = x - n`, então o
      // round-trip de blocos fica byte-estável com o caminho textual.
      const delta = fn(block, 'DELTA', 1)
      const name = f(block, 'NAME')
      return {
        kind: 'js',
        value: {
          type: 'assign',
          name,
          value: {
            type: 'binop',
            op: delta < 0 ? '-' : '+',
            left: { type: 'var', name },
            right: { type: 'num', value: delta < 0 ? -delta : delta },
          },
        },
      }
    }
    case 'sz_js_if_else': {
      // Ramos "senão se" dinâmicos do mutator: lê ELSEIF_COND{i}/ELSEIF_THEN{i}
      // enquanto existirem; o "senão" (ELSE) só entra se o input existir.
      const elseif: Array<{ cond: JSExpr; then: JSStatement[] }> = []
      for (let i = 0; block.getInput(`ELSEIF_COND${i}`); i += 1) {
        elseif.push({
          cond: exprInput(block, `ELSEIF_COND${i}`, { type: 'bool', value: true }),
          then: getStatementChildren(block, `ELSEIF_THEN${i}`, seen),
        })
      }
      const hasElse = Boolean(block.getInput('ELSE'))
      return {
        kind: 'js',
        value: {
          type: 'if',
          cond: exprInput(block, 'COND', { type: 'bool', value: true }),
          then: getStatementChildren(block, 'THEN', seen),
          ...(elseif.length > 0 ? { elseif } : {}),
          ...(hasElse ? { else: getStatementChildren(block, 'ELSE', seen) } : {}),
        },
      }
    }
    case 'sz_js_repeat':
      return {
        kind: 'js',
        value: {
          type: 'repeat',
          times: exprInput(block, 'TIMES', { type: 'num', value: 5 }),
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_while':
      return {
        kind: 'js',
        value: {
          type: 'while',
          cond: exprInput(block, 'COND', { type: 'bool', value: true }),
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_do_while':
      return {
        kind: 'js',
        value: {
          type: 'doWhile',
          cond: exprInput(block, 'COND', { type: 'bool', value: true }),
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_break':
      return { kind: 'js', value: { type: 'break' } }
    case 'sz_js_continue':
      return { kind: 'js', value: { type: 'continue' } }
    case 'sz_js_for_of':
      return {
        kind: 'js',
        value: {
          type: 'forOf',
          itemName: f(block, 'ITEM') || 'item',
          iterableVar: f(block, 'NAME'),
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_for_range':
      return {
        kind: 'js',
        value: {
          type: 'forRange',
          varName: f(block, 'VAR') || 'i',
          from: exprInput(block, 'FROM', { type: 'num', value: 0 }),
          to: exprInput(block, 'TO', { type: 'num', value: 10 }),
          step: exprInput(block, 'STEP', { type: 'num', value: 1 }),
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_try_catch': {
      const errorName = f(block, 'ERR').trim()
      const finalizer = getStatementChildren(block, 'FINALLY', seen)
      return {
        kind: 'js',
        value: {
          type: 'tryCatch',
          body: getStatementChildren(block, 'BODY', seen),
          ...(errorName ? { errorName } : {}),
          handler: getStatementChildren(block, 'HANDLER', seen),
          ...(finalizer.length ? { finalizer } : {}),
        },
      }
    }
    case 'sz_js_for_each': {
      const indexName = f(block, 'INDEX').trim()
      return {
        kind: 'js',
        value: {
          type: 'forEach',
          arrayExpr: exprInput(block, 'ARRAY', { type: 'var', name: 'lista' }),
          itemName: f(block, 'ITEM'),
          ...(indexName ? { indexName } : {}),
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    }
    case 'sz_js_set_timeout':
      return {
        kind: 'js',
        value: {
          type: 'setTimeout',
          delay: exprInput(block, 'MS', { type: 'num', value: 1000 }),
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_set_interval':
      return {
        kind: 'js',
        value: {
          type: 'setInterval',
          delay: exprInput(block, 'MS', { type: 'num', value: 1000 }),
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_set_timeout_seconds':
      return {
        kind: 'js',
        value: {
          type: 'setTimeoutSeconds',
          delay: exprInput(block, 'S', { type: 'num', value: 1 }),
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_set_interval_seconds':
      return {
        kind: 'js',
        value: {
          type: 'setIntervalSeconds',
          delay: exprInput(block, 'S', { type: 'num', value: 1 }),
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_mouseover':
      return {
        kind: 'js',
        value: {
          type: 'event',
          target: f(block, 'TARGET'),
          ...targetKindField(block),
          event: 'mouseover',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_submit':
      return {
        kind: 'js',
        value: {
          type: 'event',
          target: f(block, 'TARGET'),
          ...targetKindField(block),
          event: 'submit',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_input':
      return {
        kind: 'js',
        value: {
          type: 'event',
          target: f(block, 'TARGET'),
          ...targetKindField(block),
          event: 'input',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_query_selector':
      return {
        kind: 'js',
        value: {
          type: 'querySelector',
          selector: f(block, 'SELECTOR'),
          varName: f(block, 'NAME'),
        },
      }
    case 'sz_js_query_selector_all':
      return {
        kind: 'js',
        value: {
          type: 'querySelectorAll',
          selector: f(block, 'SELECTOR'),
          varName: f(block, 'NAME'),
        },
      }
    case 'sz_js_storage_set':
      return {
        kind: 'js',
        value: {
          type: 'storageSet',
          store: f(block, 'STORE') === 'session' ? 'session' : 'local',
          key: { type: 'str', value: f(block, 'KEY') },
          value: exprInput(block, 'VALUE', { type: 'str', value: '' }),
        },
      }
    case 'sz_js_event_method':
      return {
        kind: 'js',
        value: {
          type: 'eventMethod',
          method: f(block, 'METHOD') === 'stopPropagation' ? 'stopPropagation' : 'preventDefault',
        },
      }
    case 'sz_js_fetch_json': {
      const catchBody = getStatementChildren(block, 'CATCH', seen)
      const catchName = f(block, 'ERR').trim()
      return {
        kind: 'js',
        value: {
          type: 'fetchJson',
          url: { type: 'str', value: f(block, 'URL') },
          okName: f(block, 'OK') || 'dados',
          body: getStatementChildren(block, 'BODY', seen),
          ...(catchBody.length ? { catchName: catchName || 'erro', catchBody } : {}),
        },
      }
    }
    case 'sz_js_get_element_by_id':
      return {
        kind: 'js',
        value: {
          type: 'getElementById',
          id: f(block, 'ID'),
          varName: f(block, 'NAME'),
        },
      }
    case 'sz_js_class_op':
      return {
        kind: 'js',
        value: {
          type: 'classOp',
          targetId: f(block, 'TARGET'),
          ...classTargetKind(block),
          op: f(block, 'OP') as 'add' | 'remove' | 'toggle',
          className: f(block, 'CLASS'),
        },
      }
    case 'sz_js_on_event_named':
      return {
        kind: 'js',
        value: {
          type: 'eventHandler',
          target: f(block, 'TARGET'),
          ...targetKindField(block),
          event: f(block, 'EVENT') as
            | 'click'
            | 'keydown'
            | 'keyup'
            | 'mouseover'
            | 'mouseout'
            | 'pointerdown'
            | 'pointerup'
            | 'submit'
            | 'input'
            | 'change',
          handlerName: f(block, 'HANDLER'),
        },
      }
    case 'sz_js_create_element':
      return {
        kind: 'js',
        value: { type: 'createElement', tag: f(block, 'TAG'), varName: f(block, 'NAME') },
      }
    case 'sz_js_create_element_ns':
      return {
        kind: 'js',
        value: {
          type: 'createElementNS',
          tag: f(block, 'TAG') || 'circle',
          varName: f(block, 'NAME'),
        },
      }
    case 'sz_js_get_attribute':
      return {
        kind: 'js',
        value: {
          type: 'getAttribute',
          targetId: f(block, 'TARGET'),
          ...targetKindField(block),
          name: f(block, 'ATTR') || 'cx',
          varName: f(block, 'NAME'),
        },
      }
    case 'sz_js_append_child':
      return {
        kind: 'js',
        value: { type: 'appendChild', parentVar: f(block, 'PARENT'), childVar: f(block, 'CHILD') },
      }
    case 'sz_js_throw':
      return {
        kind: 'js',
        value: {
          type: 'throwError',
          message: exprInput(block, 'MESSAGE', { type: 'str', value: 'Erro' }),
        },
      }
    case 'sz_js_object_assign':
      return {
        kind: 'js',
        value: {
          type: 'objectAssign',
          targetVar: f(block, 'TARGET'),
          sourceVar: f(block, 'SOURCE'),
        },
      }
    case 'sz_js_switch': {
      const def = getStatementChildren(block, 'DEFAULT', seen)
      return {
        kind: 'js',
        value: {
          type: 'switch',
          subject: exprInput(block, 'SUBJECT', { type: 'num', value: 0 }),
          cases: getSwitchCases(block, 'CASES', seen),
          ...(def.length > 0 ? { default: def } : {}),
        },
      }
    }
    case 'sz_js_case':
      // Só faz sentido dentro de "escolha" (coletado por getSwitchCases).
      return null
    case 'sz_js_set_dataset':
      return {
        kind: 'js',
        value: {
          type: 'setDataset',
          targetId: f(block, 'TARGET'),
          ...targetKindField(block),
          key: f(block, 'KEY'),
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
        },
      }

    // ---- Canvas ----

    case 'sz_js_class': {
      const members = getClassMembers(block, seen)
      const superClass = getSuperName(block)
      return {
        kind: 'js',
        value: {
          type: 'classDecl',
          name: f(block, 'NAME'),
          ...(superClass ? { superClass } : {}),
          ctorParams: members.ctorParams,
          ...(members.ctorId ? { ctorId: members.ctorId } : {}),
          ctorBody: members.ctorBody,
          methods: members.methods,
        },
      }
    }
    case 'sz_js_new_var': {
      const reference = constructorReference(f(block, 'CLASS'))
      return {
        kind: 'js',
        value: {
          type: 'newInstance',
          varName: f(block, 'VARNAME'),
          ...reference,
          args: getArgs(block),
        },
      }
    }
    // Canvas 3D (three.js cru): import + new com NAMESPACE (`new THREE.Classe()`).
    case 'sz_t3d_import':
      return {
        kind: 'js',
        value: { type: 'importStar', name: f(block, 'NAME') || 'THREE', module: 'three' },
      }
    case 'sz_t3d_import_named': {
      const names = f(block, 'NAMES')
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
      const selectedModule = f(block, 'MODULE')
      return {
        kind: 'js',
        value: {
          type: 'importNamed',
          names,
          module: selectedModule,
        },
      }
    }
    case 'sz_t3d_new_var': {
      // CLASS = referência completa: `THREE.Scene` (namespace THREE) ou `GLTFLoader`
      // (bare, addon sem namespace). Quebra no 1º ponto.
      const reference = constructorReference(f(block, 'CLASS'))
      return {
        kind: 'js',
        value: {
          type: 'newInstance',
          varName: f(block, 'VARNAME'),
          ...reference,
          args: getArgs(block),
        },
      }
    }
    // ───── Canvas 3D: FACILITADORES → IR genérica (memberCall/memberSet/newExpr).
    // Cada um gera o MESMO código que o bloco manual; o reverso (bloco amigável)
    // vive no workspaceState.ts. Sem schema/parser novos.
    case 'sz_t3d_set_position':
    case 'sz_t3d_set_rotation':
    case 'sz_t3d_set_scale': {
      // `obj.<prop>.set(x, y, z)` — prop pela família do bloco.
      const prop =
        block.type === 'sz_t3d_set_position'
          ? 'position'
          : block.type === 'sz_t3d_set_rotation'
            ? 'rotation'
            : 'scale'
      const fallback = block.type === 'sz_t3d_set_scale' ? 1 : 0
      return {
        kind: 'js',
        value: {
          type: 'memberCall',
          object: {
            type: 'memberGet',
            object: { type: 'var', name: f(block, 'OBJ') },
            name: prop,
          },
          method: 'set',
          args: [
            exprInput(block, 'X', { type: 'num', value: fallback }),
            exprInput(block, 'Y', { type: 'num', value: fallback }),
            exprInput(block, 'Z', { type: 'num', value: fallback }),
          ],
        },
      }
    }
    case 'sz_t3d_rotate_axis': {
      // `obj.rotation.<axis> += delta` → memberSet com `obj.rotation.<axis> + delta`.
      const obj = f(block, 'OBJ')
      const axis = f(block, 'AXIS')
      const rot = (): JSExpr => ({
        type: 'memberGet',
        object: { type: 'var', name: obj },
        name: 'rotation',
      })
      return {
        kind: 'js',
        value: {
          type: 'memberSet',
          object: rot(),
          name: axis,
          value: {
            type: 'binop',
            op: '+',
            left: { type: 'memberGet', object: rot(), name: axis },
            right: exprInput(block, 'DELTA', { type: 'num', value: 0.01 }),
          },
        },
      }
    }
    case 'sz_t3d_look_at':
      // `obj.lookAt(x, y, z)`
      return {
        kind: 'js',
        value: {
          type: 'memberCall',
          object: { type: 'var', name: f(block, 'OBJ') },
          method: 'lookAt',
          args: [
            exprInput(block, 'X', { type: 'num', value: 0 }),
            exprInput(block, 'Y', { type: 'num', value: 0 }),
            exprInput(block, 'Z', { type: 'num', value: 0 }),
          ],
        },
      }
    case 'sz_t3d_set_visible':
      // `obj.visible = true/false`
      return {
        kind: 'js',
        value: {
          type: 'memberSet',
          object: { type: 'var', name: f(block, 'OBJ') },
          name: 'visible',
          value: { type: 'bool', value: f(block, 'VAL') === 'true' },
        },
      }
    case 'sz_t3d_add_to':
      // `alvo.add(objeto)` — pôr um objeto na cena/grupo.
      return {
        kind: 'js',
        value: {
          type: 'memberCall',
          object: { type: 'var', name: f(block, 'TARGET') },
          method: 'add',
          args: [exprInput(block, 'OBJ', { type: 'var', name: 'objeto' })],
        },
      }
    case 'sz_t3d_debug_grid':
      // `alvo.add(new THREE.GridHelper(tam, div))` — chão quadriculado de referência.
      return {
        kind: 'js',
        value: {
          type: 'memberCall',
          object: { type: 'var', name: f(block, 'TARGET') },
          method: 'add',
          args: [
            {
              type: 'newExpr',
              className: 'GridHelper',
              namespace: 'THREE',
              args: [
                exprInput(block, 'SIZE', { type: 'num', value: 10 }),
                exprInput(block, 'DIV', { type: 'num', value: 10 }),
              ],
            },
          ],
        },
      }
    case 'sz_t3d_debug_axes':
      // `alvo.add(new THREE.AxesHelper(tam))` — setas dos eixos X/Y/Z.
      return {
        kind: 'js',
        value: {
          type: 'memberCall',
          object: { type: 'var', name: f(block, 'TARGET') },
          method: 'add',
          args: [
            {
              type: 'newExpr',
              className: 'AxesHelper',
              namespace: 'THREE',
              args: [exprInput(block, 'SIZE', { type: 'num', value: 5 })],
            },
          ],
        },
      }
    case 'sz_t3d_set_wireframe':
      // `material.wireframe = true/false`
      return {
        kind: 'js',
        value: {
          type: 'memberSet',
          object: { type: 'var', name: f(block, 'OBJ') },
          name: 'wireframe',
          value: { type: 'bool', value: f(block, 'VAL') === 'true' },
        },
      }
    case 'sz_t3d_set_color':
      // `material.color.set(cor)`
      return {
        kind: 'js',
        value: {
          type: 'memberCall',
          object: {
            type: 'memberGet',
            object: { type: 'var', name: f(block, 'OBJ') },
            name: 'color',
          },
          method: 'set',
          args: [exprInput(block, 'COLOR', { type: 'color', value: '#ff8844' })],
        },
      }
    case 'sz_t3d_set_background':
      // `cena.background = new THREE.Color(cor)`
      return {
        kind: 'js',
        value: {
          type: 'memberSet',
          object: { type: 'var', name: f(block, 'SCENE') },
          name: 'background',
          value: {
            type: 'newExpr',
            className: 'Color',
            namespace: 'THREE',
            args: [exprInput(block, 'COLOR', { type: 'color', value: '#101830' })],
          },
        },
      }
    case 'sz_t3d_set_fog':
      // `cena.fog = new THREE.Fog(cor, perto, longe)`
      return {
        kind: 'js',
        value: {
          type: 'memberSet',
          object: { type: 'var', name: f(block, 'SCENE') },
          name: 'fog',
          value: {
            type: 'newExpr',
            className: 'Fog',
            namespace: 'THREE',
            args: [
              exprInput(block, 'COLOR', { type: 'color', value: '#aabbcc' }),
              exprInput(block, 'NEAR', { type: 'num', value: 10 }),
              exprInput(block, 'FAR', { type: 'num', value: 100 }),
            ],
          },
        },
      }
    case 'sz_t3d_lerp_position':
      return {
        kind: 'js',
        value: {
          type: 'lerpPosition',
          object: f(block, 'OBJ'),
          target: exprInput(block, 'TARGET', { type: 'var', name: 'alvo' }),
          alpha: exprInput(block, 'ALPHA', { type: 'num', value: 0.1 }),
          dt: exprInput(block, 'DT', { type: 'num', value: 1 / 60 }),
        },
      }
    case 'sz_t3d_set_matrix_at':
      // `copias.setMatrixAt(i, molde.matrix)`
      return {
        kind: 'js',
        value: {
          type: 'memberCall',
          object: { type: 'var', name: f(block, 'MESH') },
          method: 'setMatrixAt',
          args: [
            exprInput(block, 'I', { type: 'num', value: 0 }),
            {
              type: 'memberGet',
              object: { type: 'var', name: f(block, 'DUMMY') },
              name: 'matrix',
            },
          ],
        },
      }
    case 'sz_t3d_instances_dirty':
      // `copias.instanceMatrix.needsUpdate = true`
      return {
        kind: 'js',
        value: {
          type: 'memberSet',
          object: {
            type: 'memberGet',
            object: { type: 'var', name: f(block, 'MESH') },
            name: 'instanceMatrix',
          },
          name: 'needsUpdate',
          value: { type: 'bool', value: true },
        },
      }
    case 'sz_t3d_set_shadow':
      // `obj.castShadow = bool` / `obj.receiveShadow = bool`
      return {
        kind: 'js',
        value: {
          type: 'memberSet',
          object: { type: 'var', name: f(block, 'OBJ') },
          name: f(block, 'KIND') === 'receive' ? 'receiveShadow' : 'castShadow',
          value: { type: 'bool', value: f(block, 'VAL') === 'true' },
        },
      }
    case 'sz_t3d_set_intensity':
      // `luz.intensity = n`
      return {
        kind: 'js',
        value: {
          type: 'memberSet',
          object: { type: 'var', name: f(block, 'OBJ') },
          name: 'intensity',
          value: exprInput(block, 'N', { type: 'num', value: 1 }),
        },
      }
    case 'sz_t3d_renderer_size':
      // `renderizador.setSize(w, h)`
      return {
        kind: 'js',
        value: {
          type: 'memberCall',
          object: { type: 'var', name: f(block, 'R') },
          method: 'setSize',
          args: [
            exprInput(block, 'W', { type: 'num', value: 800 }),
            exprInput(block, 'H', { type: 'num', value: 600 }),
          ],
        },
      }
    case 'sz_t3d_enable_shadows':
      // `renderizador.shadowMap.enabled = true`
      return {
        kind: 'js',
        value: {
          type: 'memberSet',
          object: {
            type: 'memberGet',
            object: { type: 'var', name: f(block, 'R') },
            name: 'shadowMap',
          },
          name: 'enabled',
          value: { type: 'bool', value: true },
        },
      }
    case 'sz_t3d_render':
      // `renderizador.render(cena, camera)`
      return {
        kind: 'js',
        value: {
          type: 'memberCall',
          object: { type: 'var', name: f(block, 'R') },
          method: 'render',
          args: [
            { type: 'var', name: f(block, 'SCENE') },
            { type: 'var', name: f(block, 'CAMERA') },
          ],
        },
      }
    case 'sz_t3d_mount_renderer':
      // `document.body.appendChild(renderizador.domElement)` — nó dedicado
      // (document.body é denylistado no parser genérico).
      return { kind: 'js', value: { type: 'mountRenderer', renderer: f(block, 'R') } }
    case 'sz_t3d_load_model':
      // `carregador.load('nome', (modelo) => { … })` — carregamento async (GLTF/HDR).
      // URL é o NOME do asset 3D (campo seletor), vira string literal.
      return {
        kind: 'js',
        value: {
          type: 'loaderLoad',
          resourceKind: 'model',
          loaderVar: f(block, 'LOADER'),
          url: { type: 'str', value: f(block, 'URL') },
          param: f(block, 'PARAM') || 'modelo',
          body: getStatementChildren(block, 'DO', seen),
          errorParam: f(block, 'ERROR_PARAM') || 'erro',
          errorBody: getStatementChildren(block, 'DO_ERROR', seen),
        },
      }
    case 'sz_t3d_load_sound':
      // Irmão do load_model p/ ÁUDIO (AudioLoader). O papel explícito mantém a
      // validação e o seletor alinhados mesmo antes do round-trip pelo código.
      return {
        kind: 'js',
        value: {
          type: 'loaderLoad',
          resourceKind: 'audio',
          loaderVar: f(block, 'LOADER'),
          url: { type: 'str', value: f(block, 'URL') },
          param: f(block, 'PARAM') || 'buffer',
          body: getStatementChildren(block, 'DO', seen),
          errorParam: f(block, 'ERROR_PARAM') || 'erro',
          errorBody: getStatementChildren(block, 'DO_ERROR', seen),
        },
      }
    case 'sz_t3d_traverse':
      // `objeto.traverse((parte) => { … })` — percorrer cada parte de um objeto/modelo.
      return {
        kind: 'js',
        value: {
          type: 'traverseEach',
          object: exprInput(block, 'OBJ', { type: 'var', name: 'objeto' }),
          param: f(block, 'PARAM') || 'parte',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_t3d_scene_create':
      return {
        kind: 'js',
        value: { type: 'threeSceneSetup', scene: f(block, 'SCENE') || 'cena' },
      }
    case 'sz_t3d_renderer_create':
      return {
        kind: 'js',
        value: {
          type: 'threeRendererSetup',
          renderer: f(block, 'RENDERER') || 'renderizador',
          canvas: f(block, 'CANVAS') || 'jogo',
        },
      }
    case 'sz_t3d_camera_create':
      return {
        kind: 'js',
        value: {
          type: 'threeCameraSetup',
          camera: f(block, 'CAMERA') || 'camera',
          canvas: f(block, 'CANVAS') || 'jogo',
          fov: exprInput(block, 'FOV', { type: 'num', value: 60 }),
          near: exprInput(block, 'NEAR', { type: 'num', value: 0.1 }),
          far: exprInput(block, 'FAR', { type: 'num', value: 1000 }),
        },
      }
    case 'sz_t3d_light_create':
      return {
        kind: 'js',
        value: {
          type: 'threeLightSetup',
          light: f(block, 'LIGHT') || 'luz',
          scene: f(block, 'SCENE') || 'cena',
          kind: fieldChoice(f(block, 'KIND'), ['ambient', 'directional'] as const, 'ambient'),
          color: exprInput(block, 'COLOR', { type: 'color', value: '#ffffff' }),
          intensity: exprInput(block, 'INTENSITY', { type: 'num', value: 1 }),
        },
      }
    case 'sz_t3d_renderer_config': {
      // Modernização do renderizador (forward-only) — os dropdowns viram a grafia atual.
      return {
        kind: 'js',
        value: {
          type: 'rendererConfig',
          renderer: f(block, 'R'),
          pixels: fieldChoice(f(block, 'PIXELS'), ['device', 'off'] as const, 'off'),
          shadows: fieldChoice(f(block, 'SHADOWS'), ['soft', 'hard', 'off'] as const, 'off'),
          colorSpace: fieldChoice(f(block, 'COLORSPACE'), ['srgb', 'off'] as const, 'off'),
          toneMapping: fieldChoice(f(block, 'TONE'), ['aces', 'off'] as const, 'off'),
        },
      }
    }
    case 'sz_t3d_renderer_responsive':
      return {
        kind: 'js',
        value: {
          type: 'rendererResponsive',
          renderer: f(block, 'R'),
          camera: f(block, 'CAMERA'),
          ...(f(block, 'COMPOSER').trim() ? { composer: f(block, 'COMPOSER').trim() } : {}),
          cleanup: f(block, 'CLEANUP') || 'pararResponsivo',
        },
      }
    case 'sz_t3d_load_environment':
      return {
        kind: 'js',
        value: {
          type: 'environmentLoad',
          scene: f(block, 'SCENE'),
          url: f(block, 'URL'),
          texture: f(block, 'TEXTURE') || 'ceuHDR',
          background: f(block, 'BACKGROUND') !== 'false',
        },
      }
    case 'sz_t3d_dispose_object':
      return {
        kind: 'js',
        value: { type: 'disposeObject', object: f(block, 'OBJECT') },
      }
    case 'sz_t3d_bloom_setup':
      // Macro do Brilho (bloom): 1 bloco → esteira EffectComposer/RenderPass/
      // UnrealBloomPass/OutputPass (o gerador expande + traz os imports).
      return {
        kind: 'js',
        value: {
          type: 'bloomSetup',
          composer: f(block, 'COMPOSER') || 'composer',
          renderer: f(block, 'R'),
          scene: f(block, 'SCENE'),
          camera: f(block, 'CAMERA'),
          strength: exprInput(block, 'STRENGTH', { type: 'num', value: 1.5 }),
          radius: exprInput(block, 'RADIUS', { type: 'num', value: 0.4 }),
          threshold: exprInput(block, 'THRESHOLD', { type: 'num', value: 0.85 }),
        },
      }
    case 'sz_t3d_render_effects':
      // `composer.render()` — desenhar passando pela esteira de efeitos. Facilitador
      // → memberCall genérico (reconhecido de volta no workspaceState).
      return {
        kind: 'js',
        value: {
          type: 'memberCall',
          object: { type: 'var', name: f(block, 'COMPOSER') },
          method: 'render',
          args: [],
        },
      }
    case 'sz_t3d_particles':
      // Macro Partículas: 1 bloco → sistema de Points (o gerador expande a receita).
      return {
        kind: 'js',
        value: {
          type: 'particlesSetup',
          particles: f(block, 'PARTICLES') || 'particulas',
          scene: f(block, 'SCENE'),
          count: exprInput(block, 'COUNT', { type: 'num', value: 500 }),
          size: exprInput(block, 'SIZE', { type: 'num', value: 0.1 }),
          spread: exprInput(block, 'SPREAD', { type: 'num', value: 20 }),
          color: exprInput(block, 'COLOR', { type: 'color', value: '#ffffff' }),
        },
      }
    case 'sz_t3d_water':
      // Macro Água: 1 bloco → plano Water + normal map procedural (gerador expande).
      return {
        kind: 'js',
        value: {
          type: 'waterSetup',
          water: f(block, 'WATER') || 'agua',
          scene: f(block, 'SCENE'),
          size: exprInput(block, 'SIZE', { type: 'num', value: 2000 }),
          color: exprInput(block, 'COLOR', { type: 'color', value: '#0a3d5c' }),
        },
      }
    case 'sz_t3d_water_wave':
      return {
        kind: 'js',
        value: {
          type: 'waterTime',
          water: f(block, 'WATER'),
          dt: exprInput(block, 'DT', { type: 'num', value: 1 / 60 }),
        },
      }
    case 'sz_t3d_grass':
      // Macro Grama: 1 bloco → campo instanciado + shader de vento (gerador expande).
      return {
        kind: 'js',
        value: {
          type: 'grassSetup',
          grass: f(block, 'GRASS') || 'grama',
          scene: f(block, 'SCENE'),
          count: exprInput(block, 'COUNT', { type: 'num', value: 5000 }),
          size: exprInput(block, 'SIZE', { type: 'num', value: 1 }),
          spread: exprInput(block, 'SPREAD', { type: 'num', value: 50 }),
          color: exprInput(block, 'COLOR', { type: 'color', value: '#4a7c2a' }),
        },
      }
    case 'sz_t3d_grass_wave':
      return {
        kind: 'js',
        value: {
          type: 'grassTime',
          grass: f(block, 'GRASS'),
          dt: exprInput(block, 'DT', { type: 'num', value: 1 / 60 }),
        },
      }
    case 'sz_t3d_sign':
      // Macro Letreiro 3D: 1 bloco → canvas oculto + CanvasTexture + plano
      // transparente (gerador expande; TEXT é campo — letreiro é estático).
      return {
        kind: 'js',
        value: {
          type: 'signSetup',
          sign: f(block, 'SIGN') || 'placa',
          scene: f(block, 'SCENE'),
          text: f(block, 'TEXT') || 'Oi!',
          size: exprInput(block, 'SIZE', { type: 'num', value: 4 }),
          color: exprInput(block, 'COLOR', { type: 'color', value: '#ffffff' }),
        },
      }
    case 'sz_t3d_primitive':
      return {
        kind: 'js',
        value: {
          type: 'primitiveSetup',
          mesh: f(block, 'MESH') || 'objeto',
          scene: f(block, 'SCENE'),
          shape: fieldChoice(
            f(block, 'SHAPE'),
            ['box', 'sphere', 'cylinder', 'cone', 'capsule'] as const,
            'box',
          ),
          width: exprInput(block, 'W', { type: 'num', value: 1 }),
          height: exprInput(block, 'H', { type: 'num', value: 1 }),
          depth: exprInput(block, 'D', { type: 'num', value: 1 }),
          color: exprInput(block, 'COLOR', { type: 'color', value: '#38bdf8' }),
        },
      }
    case 'sz_t3d_terrain':
      return {
        kind: 'js',
        value: {
          type: 'terrainSetup',
          terrain: f(block, 'TERRAIN') || 'terreno',
          scene: f(block, 'SCENE'),
          heightFunction: f(block, 'HEIGHT_FN') || 'alturaChao',
          size: exprInput(block, 'SIZE', { type: 'num', value: 160 }),
          segments: exprInput(block, 'SEGMENTS', { type: 'num', value: 48 }),
          hills: exprInput(block, 'HILLS', { type: 'num', value: 4 }),
          smooth: exprInput(block, 'SMOOTH', { type: 'num', value: 18 }),
          color: exprInput(block, 'COLOR', { type: 'color', value: '#65a30d' }),
        },
      }
    case 'sz_t3d_road': {
      const heightFunction = f(block, 'HEIGHT_FN').trim()
      return {
        kind: 'js',
        value: {
          type: 'roadSetup',
          road: f(block, 'ROAD') || 'estrada',
          scene: f(block, 'SCENE'),
          x1: exprInput(block, 'X1', { type: 'num', value: -20 }),
          z1: exprInput(block, 'Z1', { type: 'num', value: 0 }),
          x2: exprInput(block, 'X2', { type: 'num', value: 20 }),
          z2: exprInput(block, 'Z2', { type: 'num', value: 0 }),
          width: exprInput(block, 'WIDTH', { type: 'num', value: 6 }),
          segments: exprInput(block, 'SEGMENTS', { type: 'num', value: 24 }),
          color: exprInput(block, 'COLOR', { type: 'color', value: '#334155' }),
          ...(heightFunction ? { heightFunction } : {}),
        },
      }
    }
    case 'sz_t3d_building': {
      const heightFunction = f(block, 'HEIGHT_FN').trim()
      return {
        kind: 'js',
        value: {
          type: 'buildingSetup',
          building: f(block, 'BUILDING') || 'predio',
          scene: f(block, 'SCENE'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
          width: exprInput(block, 'W', { type: 'num', value: 8 }),
          height: exprInput(block, 'H', { type: 'num', value: 10 }),
          depth: exprInput(block, 'D', { type: 'num', value: 8 }),
          color: exprInput(block, 'COLOR', { type: 'color', value: '#f59e0b' }),
          roofColor: exprInput(block, 'ROOF', { type: 'color', value: '#b91c1c' }),
          ...(heightFunction ? { heightFunction } : {}),
        },
      }
    }
    case 'sz_t3d_city':
      return {
        kind: 'js',
        value: {
          type: 'citySetup',
          city: f(block, 'CITY') || 'cidade',
          scene: f(block, 'SCENE'),
          heightFunction: f(block, 'HEIGHT_FN') || 'alturaChao',
          blocksX: exprInput(block, 'BLOCKS_X', { type: 'num', value: 8 }),
          blocksZ: exprInput(block, 'BLOCKS_Z', { type: 'num', value: 8 }),
          spacing: exprInput(block, 'SPACING', { type: 'num', value: 14 }),
          roadWidth: exprInput(block, 'ROAD_WIDTH', { type: 'num', value: 5 }),
          minHeight: exprInput(block, 'MIN_HEIGHT', { type: 'num', value: 5 }),
          maxHeight: exprInput(block, 'MAX_HEIGHT', { type: 'num', value: 24 }),
          seed: exprInput(block, 'SEED', { type: 'num', value: 42 }),
          color: exprInput(block, 'COLOR', { type: 'color', value: '#94a3b8' }),
          roofColor: exprInput(block, 'ROOF', { type: 'color', value: '#334155' }),
        },
      }
    case 'sz_t3d_physics_setup':
      return {
        kind: 'js',
        value: {
          type: 'physicsLiteSetup',
          world: f(block, 'WORLD') || 'fisica',
          heightFunction: f(block, 'HEIGHT_FN') || 'alturaChao',
          gravity: exprInput(block, 'GRAVITY', { type: 'num', value: -22 }),
          maxSubSteps: exprInput(block, 'SUBSTEPS', { type: 'num', value: 3 }),
        },
      }
    case 'sz_t3d_physics_static_box':
      return {
        kind: 'js',
        value: {
          type: 'physicsLiteStaticBox',
          world: f(block, 'WORLD'),
          id: f(block, 'ID') || 'parede',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 1 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
          width: exprInput(block, 'W', { type: 'num', value: 2 }),
          height: exprInput(block, 'H', { type: 'num', value: 2 }),
          depth: exprInput(block, 'D', { type: 'num', value: 2 }),
        },
      }
    case 'sz_t3d_physics_static_sphere':
      return {
        kind: 'js',
        value: {
          type: 'physicsLiteStaticSphere',
          world: f(block, 'WORLD'),
          id: f(block, 'ID') || 'rocha',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 1 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
          radius: exprInput(block, 'RADIUS', { type: 'num', value: 1 }),
        },
      }
    case 'sz_t3d_physics_static_object':
      return {
        kind: 'js',
        value: {
          type: 'physicsLiteStaticObject',
          world: f(block, 'WORLD'),
          object: f(block, 'OBJECT'),
          id: f(block, 'ID') || 'objetoSolido',
        },
      }
    case 'sz_t3d_physics_static_city':
      return {
        kind: 'js',
        value: {
          type: 'physicsLiteStaticCity',
          world: f(block, 'WORLD'),
          city: f(block, 'CITY'),
          prefix: f(block, 'PREFIX') || 'cidade',
        },
      }
    case 'sz_t3d_physics_body':
      return {
        kind: 'js',
        value: {
          type: 'physicsLiteBody',
          world: f(block, 'WORLD'),
          object: f(block, 'OBJECT'),
          id: f(block, 'ID') || 'jogador',
          kind: fieldChoice(f(block, 'KIND'), ['character', 'dynamic'] as const, 'character'),
          width: exprInput(block, 'W', { type: 'num', value: 1 }),
          height: exprInput(block, 'H', { type: 'num', value: 2 }),
          depth: exprInput(block, 'D', { type: 'num', value: 1 }),
          friction: exprInput(block, 'FRICTION', { type: 'num', value: 0.82 }),
          bounce: exprInput(block, 'BOUNCE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_t3d_physics_move':
      return {
        kind: 'js',
        value: {
          type: 'physicsLiteMove',
          world: f(block, 'WORLD'),
          id: f(block, 'ID') || 'jogador',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 6 }),
        },
      }
    case 'sz_t3d_physics_jump':
      return {
        kind: 'js',
        value: {
          type: 'physicsLiteJump',
          world: f(block, 'WORLD'),
          id: f(block, 'ID') || 'jogador',
          speed: exprInput(block, 'SPEED', { type: 'num', value: 7 }),
        },
      }
    case 'sz_t3d_physics_trigger':
      return {
        kind: 'js',
        value: {
          type: 'physicsLiteTrigger',
          world: f(block, 'WORLD'),
          id: f(block, 'ID') || 'praca',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 1 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
          width: exprInput(block, 'W', { type: 'num', value: 6 }),
          height: exprInput(block, 'H', { type: 'num', value: 2 }),
          depth: exprInput(block, 'D', { type: 'num', value: 6 }),
        },
      }
    case 'sz_t3d_physics_step':
      return {
        kind: 'js',
        value: {
          type: 'physicsLiteStep',
          world: f(block, 'WORLD'),
          dt: exprInput(block, 'DT', { type: 'num', value: 1 / 60 }),
        },
      }
    case 'sz_t3d_physics_velocity':
    case 'sz_t3d_physics_impulse':
    case 'sz_t3d_physics_teleport': {
      const type =
        block.type === 'sz_t3d_physics_velocity'
          ? 'physicsLiteVelocity'
          : block.type === 'sz_t3d_physics_impulse'
            ? 'physicsLiteImpulse'
            : 'physicsLiteTeleport'
      return {
        kind: 'js',
        value: {
          type,
          world: f(block, 'WORLD'),
          id: f(block, 'ID') || 'corpo',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
        },
      }
    }
    case 'sz_t3d_physics_remove':
      return {
        kind: 'js',
        value: {
          type: 'physicsLiteRemove',
          world: f(block, 'WORLD'),
          id: f(block, 'ID') || 'objeto',
        },
      }
    case 'sz_t3d_physics_clear':
      return { kind: 'js', value: { type: 'physicsLiteClear', world: f(block, 'WORLD') } }
    case 'sz_t3d_physics_on_collision':
      return {
        kind: 'js',
        value: {
          type: 'physicsLiteCollisionEvent',
          world: f(block, 'WORLD'),
          bodyParam: f(block, 'BODY_PARAM') || 'corpoId',
          colliderParam: f(block, 'COLLIDER_PARAM') || 'obstaculoId',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_t3d_physics_on_trigger':
      return {
        kind: 'js',
        value: {
          type: 'physicsLiteTriggerEvent',
          world: f(block, 'WORLD'),
          bodyParam: f(block, 'BODY_PARAM') || 'corpoId',
          triggerParam: f(block, 'TRIGGER_PARAM') || 'areaId',
          enteringParam: f(block, 'ENTERING_PARAM') || 'entrou',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_t3d_physics_raycast':
      return {
        kind: 'js',
        value: {
          type: 'physicsLiteRaycast',
          world: f(block, 'WORLD'),
          result: f(block, 'RESULT') || 'acerto',
          ox: exprInput(block, 'OX', { type: 'num', value: 0 }),
          oy: exprInput(block, 'OY', { type: 'num', value: 2 }),
          oz: exprInput(block, 'OZ', { type: 'num', value: 0 }),
          dx: exprInput(block, 'DX', { type: 'num', value: 0 }),
          dy: exprInput(block, 'DY', { type: 'num', value: -1 }),
          dz: exprInput(block, 'DZ', { type: 'num', value: 0 }),
          maxDistance: exprInput(block, 'MAX', { type: 'num', value: 100 }),
        },
      }
    case 'sz_t3d_physics_body_state':
      return {
        kind: 'js',
        value: {
          type: 'physicsLiteBodyState',
          world: f(block, 'WORLD'),
          id: f(block, 'ID') || 'jogador',
          result: f(block, 'RESULT') || 'estadoCorpo',
        },
      }
    case 'sz_t3d_physics_stats':
      return {
        kind: 'js',
        value: {
          type: 'physicsLiteStats',
          world: f(block, 'WORLD'),
          result: f(block, 'RESULT') || 'estadoFisica',
        },
      }
    case 'sz_js_call_method':
      return {
        kind: 'js',
        value: {
          type: 'callMethod',
          objectVar: f(block, 'OBJ'),
          method: f(block, 'METHOD'),
          args: getArgs(block),
        },
      }
    case 'sz_js_set_this_prop':
      return {
        kind: 'js',
        value: {
          type: 'setThisProp',
          name: f(block, 'NAME'),
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_js_set_prop':
      return {
        kind: 'js',
        value: {
          type: 'setProp',
          objectVar: f(block, 'OBJ'),
          name: f(block, 'NAME'),
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_js_member_set':
      return {
        kind: 'js',
        value: {
          type: 'memberSet',
          object: exprInput(block, 'OBJ', { type: 'var', name: 'objeto' }),
          name: f(block, 'NAME'),
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_js_element_onclick':
      return {
        kind: 'js',
        value: {
          type: 'onClickAssign',
          target: exprInput(block, 'TARGET', { type: 'getElement', id: 'botao' }),
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_await':
      return {
        kind: 'js',
        value: { type: 'awaitStmt', value: exprInput(block, 'VALUE', { type: 'null' }) },
      }
    case 'sz_js_set_timeout_call':
      return {
        kind: 'js',
        value: {
          type: 'setTimeoutCall',
          fn: f(block, 'FN'),
          delay: exprInput(block, 'MS', { type: 'num', value: 1000 }),
        },
      }
    case 'sz_js_index_set':
      return {
        kind: 'js',
        value: {
          type: 'indexSet',
          object: exprInput(block, 'OBJ', { type: 'var', name: 'objeto' }),
          index: exprInput(block, 'INDEX', { type: 'str', value: 'chave' }),
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_js_method_on':
      return {
        kind: 'js',
        value: {
          type: 'memberCall',
          object: exprInput(block, 'OBJ', { type: 'var', name: 'objeto' }),
          method: f(block, 'METHOD'),
          args: getArgs(block),
        },
      }
    case 'sz_js_super_ctor':
      return { kind: 'js', value: { type: 'superCall', args: getArgs(block) } }
    case 'sz_js_super_method':
      return {
        kind: 'js',
        value: { type: 'superMethodCall', method: f(block, 'METHOD'), args: getArgs(block) },
      }
    case 'sz_js_expr_statement':
      return {
        kind: 'js',
        value: {
          type: 'exprStatement',
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_js_return':
      return {
        kind: 'js',
        value: {
          type: 'return',
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_js_return_void':
      return { kind: 'js', value: { type: 'return' } }
    case 'sz_js_function':
      return {
        kind: 'js',
        value: {
          type: 'funcDecl',
          name: f(block, 'NAME'),
          params: getParamNames(block),
          ...(f(block, 'ASYNC') === 'TRUE' ? { async: true } : {}),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_js_call_function':
      return {
        kind: 'js',
        value: { type: 'callFunction', name: f(block, 'NAME'), args: getArgs(block) },
      }

    case 'sz_adv_raw_js':
      return { kind: 'js', value: { type: 'rawJS', code: f(block, 'CODE'), advanced: true } }

    // ---- Game 2D (extension blocks) ----
    case 'sz_g2d_create_sprite':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:createSprite',
          varName: f(block, 'NAME'),
          x: exprInput(block, 'X', { type: 'num', value: 100 }),
          y: exprInput(block, 'Y', { type: 'num', value: 100 }),
          w: exprInput(block, 'W', { type: 'num', value: 40 }),
          h: exprInput(block, 'H', { type: 'num', value: 40 }),
          color: f(block, 'COLOR'),
        },
      }
    case 'sz_g2d_draw_sprite':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: { type: 'g2d:drawSprite', spriteVar: f(block, 'SPRITE'), ctxVar: 'ctx' },
      }
    case 'sz_g2d_set_position':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:setPosition',
          spriteVar: f(block, 'SPRITE'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g2d_set_velocity':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:setVelocity',
          spriteVar: f(block, 'SPRITE'),
          vx: exprInput(block, 'VX', { type: 'num', value: 0 }),
          vy: exprInput(block, 'VY', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g2d_collides':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:collides',
          aVar: f(block, 'A'),
          bVar: f(block, 'B'),
          varName: f(block, 'NAME'),
        },
      }
    case 'sz_g2d_score':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:score',
          varName: f(block, 'NAME'),
          initial: exprInput(block, 'INITIAL', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g2d_game_over':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:gameOver',
          ctxVar: 'ctx',
          text: exprInput(block, 'TEXT', { type: 'str', value: 'Fim de jogo' }),
        },
      }
    case 'sz_g2d_clear':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:clear' } }
    case 'sz_g2d_on_start':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:onStart',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g2d_update_each_frame':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:updateEachFrame',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g2d_set_gravity':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:setGravity',
          value: exprInput(block, 'VALUE', { type: 'num', value: 0.5 }),
        },
      }
    case 'sz_g2d_apply_velocity':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:applyVelocity', spriteVar: f(block, 'SPRITE') } }
    case 'sz_g2d_bounce_edges':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:bounceOnEdges',
          spriteVar: f(block, 'SPRITE'),
          ctxVar: 'ctx',
        },
      }
    case 'sz_g2d_circle_collides':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:circleCollides',
          varName: f(block, 'NAME'),
          aVar: f(block, 'A'),
          bVar: f(block, 'B'),
        },
      }
    case 'sz_g2d_play_sound':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:playSound',
          freq: exprInput(block, 'FREQ', { type: 'num', value: 440 }),
          durationMs: exprInput(block, 'MS', { type: 'num', value: 200 }),
        },
      }
    case 'sz_g2d_play_fx':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:playFx', fx: f(block, 'FX') } }
    case 'sz_g2d_play_music':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:playMusic', tune: f(block, 'MUSIC') } }
    case 'sz_g2d_stop_music':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:stopMusic' } }
    case 'sz_g2d_play_note':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:playNote',
          note: f(block, 'NOTE'),
          ms: exprInput(block, 'MS', { type: 'num', value: 300 }),
        },
      }
    case 'sz_g2d_aim_at':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: { type: 'g2d:aimAt', spriteVar: f(block, 'SPRITE'), targetVar: f(block, 'TARGET') },
      }
    case 'sz_g2d_move_toward':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:moveToward',
          spriteVar: f(block, 'SPRITE'),
          targetVar: f(block, 'TARGET'),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 2 }),
        },
      }
    case 'sz_g2d_set_health':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:setHealth',
          spriteVar: f(block, 'SPRITE'),
          amount: exprInput(block, 'AMOUNT', { type: 'num', value: 3 }),
        },
      }
    case 'sz_g2d_change_health':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:changeHealth',
          spriteVar: f(block, 'SPRITE'),
          delta: exprInput(block, 'DELTA', { type: 'num', value: -1 }),
        },
      }
    case 'sz_g2d_damage_sprite':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:damageSprite',
          spriteVar: f(block, 'SPRITE'),
          amount: exprInput(block, 'AMOUNT', { type: 'num', value: 1 }),
          invincibilityFrames: exprInput(block, 'FRAMES', { type: 'num', value: 45 }),
        },
      }
    case 'sz_g2d_flip_sprite':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: { type: 'g2d:flipSprite', spriteVar: f(block, 'SPRITE'), dir: f(block, 'DIR') },
      }
    case 'sz_g2d_set_opacity':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:setOpacity',
          spriteVar: f(block, 'SPRITE'),
          percent: exprInput(block, 'PERCENT', { type: 'num', value: 50 }),
        },
      }
    case 'sz_g2d_set_size':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:setSize',
          spriteVar: f(block, 'SPRITE'),
          w: exprInput(block, 'W', { type: 'num', value: 40 }),
          h: exprInput(block, 'H', { type: 'num', value: 40 }),
        },
      }
    case 'sz_g2d_scale_sprite':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:scaleSprite',
          spriteVar: f(block, 'SPRITE'),
          factor: exprInput(block, 'FACTOR', { type: 'num', value: 1.5 }),
        },
      }
    case 'sz_g2d_wrap_edges':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:wrapEdges', spriteVar: f(block, 'SPRITE') } }
    case 'sz_g2d_prune_old':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:pruneOld',
          groupVar: f(block, 'GROUP'),
          seconds: exprInput(block, 'SECONDS', { type: 'num', value: 2 }),
        },
      }
    case 'sz_g2d_pause':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:pauseGame' } }
    case 'sz_g2d_resume':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:resumeGame' } }
    case 'sz_g2d_camera_follow':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:cameraFollow',
          spriteVar: f(block, 'SPRITE'),
          worldW: exprInput(block, 'WORLDW', { type: 'num', value: 800 }),
          worldH: exprInput(block, 'WORLDH', { type: 'num', value: 600 }),
        },
      }
    case 'sz_g2d_set_camera':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:setCamera',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g2d_break_tile_at':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: { type: 'g2d:breakTile', mapVar: f(block, 'MAP'), spriteVar: f(block, 'SPRITE') },
      }
    case 'sz_g2d_set_tile':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:setTile',
          mapVar: f(block, 'MAP'),
          index: exprInput(block, 'INDEX', { type: 'num', value: 1 }),
          spriteVar: f(block, 'SPRITE'),
        },
      }
    case 'sz_g2d_bring_to_front':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:bringToFront',
          spriteVar: f(block, 'SPRITE'),
          groupVar: f(block, 'GROUP'),
        },
      }
    case 'sz_g2d_send_to_back':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:sendToBack',
          spriteVar: f(block, 'SPRITE'),
          groupVar: f(block, 'GROUP'),
        },
      }
    case 'sz_g2d_draw_hitbox':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:drawHitbox', spriteVar: f(block, 'SPRITE') } }
    case 'sz_g2d_show_fps':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:showFps',
          x: exprInput(block, 'X', { type: 'num', value: 8 }),
          y: exprInput(block, 'Y', { type: 'num', value: 20 }),
        },
      }
    case 'sz_g2d_on_pointer':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:onPointer',
          xName: f(block, 'PX') || 'px',
          yName: f(block, 'PY') || 'py',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g2d_on_key':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:onKey',
          key: f(block, 'KEY') || 'ArrowRight',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g2d_on_overlap':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:onOverlap',
          aVar: f(block, 'A'),
          bVar: f(block, 'B'),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g2d_create_image_sprite':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:createImageSprite',
          varName: f(block, 'NAME'),
          x: exprInput(block, 'X', { type: 'num', value: 100 }),
          y: exprInput(block, 'Y', { type: 'num', value: 100 }),
          w: exprInput(block, 'W', { type: 'num', value: 40 }),
          h: exprInput(block, 'H', { type: 'num', value: 40 }),
          image: f(block, 'IMAGE'),
        },
      }
    case 'sz_g2d_set_image':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: { type: 'g2d:setImage', spriteVar: f(block, 'SPRITE'), image: f(block, 'IMAGE') },
      }
    case 'sz_g2d_define_shape':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:defineShape',
          shapeName: f(block, 'NAME'),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g2d_create_shape_sprite':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:createShapeSprite',
          varName: f(block, 'SPRITE'),
          shapeName: f(block, 'SHAPE'),
          x: exprInput(block, 'X', { type: 'num', value: 100 }),
          y: exprInput(block, 'Y', { type: 'num', value: 100 }),
          w: exprInput(block, 'W', { type: 'num', value: 32 }),
          h: exprInput(block, 'H', { type: 'num', value: 32 }),
        },
      }
    case 'sz_g2d_set_shape':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:setShape',
          spriteVar: f(block, 'SPRITE'),
          shapeName: f(block, 'SHAPE'),
        },
      }
    // paint_*: ctxVar FIXO 'ctx' (o parâmetro da figura) — sem campo visível.
    case 'sz_g2d_paint_rect':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:paintRect',
          ctxVar: 'ctx',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          w: exprInput(block, 'W', { type: 'num', value: 20 }),
          h: exprInput(block, 'H', { type: 'num', value: 20 }),
          color: f(block, 'COLOR'),
        },
      }
    case 'sz_g2d_paint_circle':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:paintCircle',
          ctxVar: 'ctx',
          x: exprInput(block, 'X', { type: 'num', value: 16 }),
          y: exprInput(block, 'Y', { type: 'num', value: 16 }),
          r: exprInput(block, 'R', { type: 'num', value: 10 }),
          color: f(block, 'COLOR'),
        },
      }
    case 'sz_g2d_paint_ellipse':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:paintEllipse',
          ctxVar: 'ctx',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          w: exprInput(block, 'W', { type: 'num', value: 24 }),
          h: exprInput(block, 'H', { type: 'num', value: 16 }),
          color: f(block, 'COLOR'),
        },
      }
    case 'sz_g2d_paint_triangle':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:paintTriangle',
          ctxVar: 'ctx',
          x1: exprInput(block, 'X1', { type: 'num', value: 16 }),
          y1: exprInput(block, 'Y1', { type: 'num', value: 0 }),
          x2: exprInput(block, 'X2', { type: 'num', value: 0 }),
          y2: exprInput(block, 'Y2', { type: 'num', value: 28 }),
          x3: exprInput(block, 'X3', { type: 'num', value: 32 }),
          y3: exprInput(block, 'Y3', { type: 'num', value: 28 }),
          color: f(block, 'COLOR'),
        },
      }
    case 'sz_g2d_paint_line':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:paintLine',
          ctxVar: 'ctx',
          x1: exprInput(block, 'X1', { type: 'num', value: 0 }),
          y1: exprInput(block, 'Y1', { type: 'num', value: 0 }),
          x2: exprInput(block, 'X2', { type: 'num', value: 24 }),
          y2: exprInput(block, 'Y2', { type: 'num', value: 24 }),
          color: f(block, 'COLOR'),
          width: exprInput(block, 'WIDTH', { type: 'num', value: 2 }),
        },
      }
    case 'sz_g2d_load_spritesheet':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:loadSpritesheet',
          varName: f(block, 'NAME'),
          image: f(block, 'IMAGE'),
          frameW: exprInput(block, 'FW', { type: 'num', value: 32 }),
          frameH: exprInput(block, 'FH', { type: 'num', value: 32 }),
        },
      }
    case 'sz_g2d_animate_sprite':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:animateSprite',
          spriteVar: f(block, 'SPRITE'),
          sheetVar: f(block, 'SHEET'),
          from: exprInput(block, 'FROM', { type: 'num', value: 0 }),
          to: exprInput(block, 'TO', { type: 'num', value: 0 }),
          fps: exprInput(block, 'FPS', { type: 'num', value: 8 }),
        },
      }
    case 'sz_g2d_set_state_anim':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:setStateAnim',
          spriteVar: f(block, 'SPRITE'),
          state: f(block, 'STATE'),
          sheetVar: f(block, 'SHEET'),
          from: exprInput(block, 'FROM', { type: 'num', value: 0 }),
          to: exprInput(block, 'TO', { type: 'num', value: 3 }),
          fps: exprInput(block, 'FPS', { type: 'num', value: 8 }),
        },
      }
    case 'sz_g2d_auto_animate':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: { type: 'g2d:autoAnimate', spriteVar: f(block, 'SPRITE') },
      }
    case 'sz_g2d_define_enemy_type': {
      seen.add('game-2d')
      // Figura opcional: chave OMITIDA quando vazia (round-trip byte-estável de
      // projetos antigos, que não têm o campo na IR).
      const enemyShape = f(block, 'SHAPE').trim()
      return {
        kind: 'js',
        value: {
          type: 'g2d:defineEnemyType',
          varName: f(block, 'NAME'),
          behavior: f(block, 'BEHAVIOR'),
          color: f(block, 'COLOR'),
          image: f(block, 'IMAGE'),
          ...(enemyShape ? { shape: enemyShape } : {}),
          hp: exprInput(block, 'HP', { type: 'num', value: 3 }),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 2 }),
          dmg: exprInput(block, 'DMG', { type: 'num', value: 1 }),
          w: exprInput(block, 'W', { type: 'num', value: 32 }),
          h: exprInput(block, 'H', { type: 'num', value: 32 }),
        },
      }
    }
    case 'sz_g2d_enemy_state_anim':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:enemyStateAnim',
          typeVar: f(block, 'TYPE'),
          state: f(block, 'STATE'),
          sheetVar: f(block, 'SHEET'),
          from: exprInput(block, 'FROM', { type: 'num', value: 0 }),
          to: exprInput(block, 'TO', { type: 'num', value: 3 }),
          fps: exprInput(block, 'FPS', { type: 'num', value: 8 }),
        },
      }
    case 'sz_g2d_enemy_type_param':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:setEnemyTypeParam',
          typeVar: f(block, 'TYPE'),
          param: f(block, 'PARAM'),
          value: exprInput(block, 'VALUE', { type: 'num', value: 10 }),
        },
      }
    case 'sz_g2d_spawn_enemy':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:spawnEnemy',
          typeVar: f(block, 'TYPE'),
          x: exprInput(block, 'X', { type: 'num', value: 100 }),
          y: exprInput(block, 'Y', { type: 'num', value: 100 }),
        },
      }
    case 'sz_g2d_update_enemy_type':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:updateEnemyType',
          typeVar: f(block, 'TYPE'),
          ctxVar: 'ctx',
          targetVar: f(block, 'TARGET'),
        },
      }
    case 'sz_g2d_draw_enemy_type':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: { type: 'g2d:drawEnemyType', ctxVar: 'ctx', typeVar: f(block, 'TYPE') },
      }
    case 'sz_g2d_on_enemy_defeated':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:onEnemyDefeated',
          typeVar: f(block, 'TYPE'),
          itemName: f(block, 'ANAME') || 'inimigo',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g2d_on_enemy_shot_hit':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:onEnemyShotHit',
          spriteVar: f(block, 'SPRITE'),
          typeVar: f(block, 'TYPE'),
          itemName: f(block, 'ANAME') || 'tiro',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g2d_hurt_by_enemy':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:hurtByEnemy',
          spriteVar: f(block, 'SPRITE'),
          enemyVar: f(block, 'ENEMY'),
        },
      }
    case 'sz_g2d_draw_frame':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:drawFrame',
          sheetVar: f(block, 'SHEET'),
          ctxVar: 'ctx',
          index: exprInput(block, 'INDEX', { type: 'num', value: 0 }),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          w: exprInput(block, 'W', { type: 'num', value: 0 }),
          h: exprInput(block, 'H', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g2d_platformer':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:platformer',
          spriteVar: f(block, 'SPRITE'),
          ctxVar: 'ctx',
          speed: exprInput(block, 'SPEED', { type: 'num', value: 4 }),
          jump: exprInput(block, 'JUMP', { type: 'num', value: 11 }),
        },
      }
    case 'sz_g2d_top_down':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:topDown',
          spriteVar: f(block, 'SPRITE'),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 3 }),
        },
      }
    case 'sz_g2d_follow_pointer':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:followPointer',
          spriteVar: f(block, 'SPRITE'),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 3 }),
        },
      }
    case 'sz_g2d_clamp_to_screen':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:clampToScreen',
          spriteVar: f(block, 'SPRITE'),
          ctxVar: 'ctx',
        },
      }
    case 'sz_g2d_flash':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: { type: 'g2d:flash', color: f(block, 'COLOR'), ctxVar: 'ctx' },
      }
    case 'sz_g2d_shake':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:shake',
          ctxVar: 'ctx',
          intensity: exprInput(block, 'INTENSITY', { type: 'num', value: 8 }),
        },
      }
    case 'sz_g2d_emit_particles':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:emitParticles',
          count: exprInput(block, 'COUNT', { type: 'num', value: 14 }),
          color: f(block, 'COLOR'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g2d_draw_particles':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:drawParticles', ctxVar: 'ctx' } }

    case 'sz_g2d_create_tilemap': {
      seen.add('game-2d')
      const platform = f(block, 'PLATFORM')
      return {
        kind: 'js',
        value: {
          type: 'g2d:createTileMap',
          varName: f(block, 'NAME'),
          image: f(block, 'IMAGE'),
          tile: exprInput(block, 'TILE', { type: 'num', value: 32 }),
          solid: f(block, 'SOLID'),
          // Omite a chave quando vazio → IR/JS de mapas sem plataforma ficam
          // byte-idênticos aos de antes (retrocompat dos fixtures).
          ...(platform ? { platform } : {}),
          grid: f(block, 'GRID'),
        },
      }
    }
    case 'sz_g2d_create_tilemap_from_asset':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:createTileMapFromAsset',
          varName: f(block, 'NAME'),
          image: f(block, 'IMAGE'),
        },
      }
    case 'sz_g2d_draw_tilemap':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:drawTileMap',
          mapVar: f(block, 'MAP'),
          ctxVar: 'ctx',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          size: exprInput(block, 'SIZE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g2d_tilemap_collide':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:tileMapCollide',
          spriteVar: f(block, 'SPRITE'),
          mapVar: f(block, 'MAP'),
        },
      }
    case 'sz_g2d_collide_group':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:collideGroup',
          spriteVar: f(block, 'SPRITE'),
          groupVar: f(block, 'GROUP'),
        },
      }
    case 'sz_g2d_collide_sprite':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:collideSprite',
          spriteVar: f(block, 'SPRITE'),
          otherVar: f(block, 'OTHER'),
        },
      }

    // ---- Grupos de sprites + temporizadores (v0.6.0) ----
    case 'sz_g2d_create_group':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:createGroup', varName: f(block, 'NAME') } }
    case 'sz_g2d_spawn_in_group':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:spawnInGroup',
          groupVar: f(block, 'GROUP'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          w: exprInput(block, 'W', { type: 'num', value: 20 }),
          h: exprInput(block, 'H', { type: 'num', value: 20 }),
          color: f(block, 'COLOR'),
          vx: exprInput(block, 'VX', { type: 'num', value: 0 }),
          vy: exprInput(block, 'VY', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g2d_spawn_image_in_group':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:spawnImageInGroup',
          groupVar: f(block, 'GROUP'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          w: exprInput(block, 'W', { type: 'num', value: 20 }),
          h: exprInput(block, 'H', { type: 'num', value: 20 }),
          image: f(block, 'IMAGE'),
          vx: exprInput(block, 'VX', { type: 'num', value: 0 }),
          vy: exprInput(block, 'VY', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g2d_update_group':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:updateGroup', groupVar: f(block, 'GROUP') } }
    case 'sz_g2d_update_group_no_gravity':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: { type: 'g2d:updateGroupNoGravity', groupVar: f(block, 'GROUP') },
      }
    case 'sz_g2d_draw_group':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: { type: 'g2d:drawGroup', groupVar: f(block, 'GROUP'), ctxVar: 'ctx' },
      }
    case 'sz_g2d_draw_group_by_y':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: { type: 'g2d:drawGroupByY', groupVar: f(block, 'GROUP'), ctxVar: 'ctx' },
      }
    case 'sz_g2d_for_each_in_group':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:forEachInGroup',
          itemName: f(block, 'ITEM') || 'sprite',
          groupVar: f(block, 'GROUP'),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g2d_clear_group':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:clearGroup', groupVar: f(block, 'GROUP') } }
    case 'sz_g2d_prune_offscreen':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:pruneOffscreen',
          groupVar: f(block, 'GROUP'),
          ctxVar: 'ctx',
          itemName: f(block, 'ITEM') || 'sprite',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g2d_on_group_overlap':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:onGroupOverlap',
          aGroup: f(block, 'A'),
          aName: f(block, 'ANAME') || 'a',
          bGroup: f(block, 'B'),
          bName: f(block, 'BNAME') || 'b',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g2d_remove_from_group':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:removeFromGroup',
          spriteVar: f(block, 'SPRITE'),
          groupVar: f(block, 'GROUP'),
        },
      }
    case 'sz_g2d_every_frames':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:everyFrames',
          n: exprInput(block, 'N', { type: 'num', value: 30 }),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g2d_every_seconds':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:everySeconds',
          seconds: exprInput(block, 'SECS', { type: 'num', value: 2 }),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g2d_after_seconds':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:afterSeconds',
          seconds: exprInput(block, 'SECS', { type: 'num', value: 3 }),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g2d_set_hitbox_scale':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:setHitboxScale',
          spriteVar: f(block, 'SPRITE'),
          percent: exprInput(block, 'PERCENT', { type: 'num', value: 80 }),
        },
      }

    // ---- HUD no canvas + estado/telas (v0.6.0) ----
    case 'sz_g2d_draw_score':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:drawScore',
          ctxVar: 'ctx',
          label: f(block, 'LABEL'),
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
          x: exprInput(block, 'X', { type: 'num', value: 10 }),
          y: exprInput(block, 'Y', { type: 'num', value: 30 }),
          color: f(block, 'COLOR'),
          size: exprInput(block, 'SIZE', { type: 'num', value: 24 }),
        },
      }
    case 'sz_g2d_draw_label':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:drawLabel',
          ctxVar: 'ctx',
          text: f(block, 'TEXT'),
          x: exprInput(block, 'X', { type: 'num', value: 10 }),
          y: exprInput(block, 'Y', { type: 'num', value: 30 }),
          color: f(block, 'COLOR'),
          size: exprInput(block, 'SIZE', { type: 'num', value: 20 }),
          align: (f(block, 'ALIGN') || 'left') as 'left' | 'center' | 'right',
        },
      }
    case 'sz_g2d_draw_hearts':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:drawHearts',
          ctxVar: 'ctx',
          count: exprInput(block, 'COUNT', { type: 'num', value: 3 }),
          x: exprInput(block, 'X', { type: 'num', value: 10 }),
          y: exprInput(block, 'Y', { type: 'num', value: 10 }),
          size: exprInput(block, 'SIZE', { type: 'num', value: 22 }),
          color: f(block, 'COLOR'),
        },
      }
    case 'sz_g2d_draw_sprite_health':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:drawSpriteHealth',
          ctxVar: 'ctx',
          spriteVar: f(block, 'SPRITE'),
          style: (f(block, 'STYLE') || 'hearts') as 'hearts' | 'bar',
          x: exprInput(block, 'X', { type: 'num', value: 12 }),
          y: exprInput(block, 'Y', { type: 'num', value: 48 }),
          size: exprInput(block, 'SIZE', { type: 'num', value: 22 }),
          color: f(block, 'COLOR'),
        },
      }
    case 'sz_g2d_draw_bar':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:drawBar',
          ctxVar: 'ctx',
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
          max: exprInput(block, 'MAX', { type: 'num', value: 100 }),
          x: exprInput(block, 'X', { type: 'num', value: 10 }),
          y: exprInput(block, 'Y', { type: 'num', value: 10 }),
          w: exprInput(block, 'W', { type: 'num', value: 120 }),
          h: exprInput(block, 'H', { type: 'num', value: 14 }),
          color: f(block, 'COLOR'),
        },
      }
    case 'sz_g2d_set_stage_description':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:setStageDescription',
          description: f(block, 'DESCRIPTION'),
        },
      }
    case 'sz_g2d_set_scene':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:setScene', name: f(block, 'SCENE') || 'inicio' } }
    case 'sz_g2d_show_screen':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:showScreen',
          ctxVar: 'ctx',
          title: exprInput(block, 'TITLE', { type: 'str', value: 'Tela' }),
          subtitle: exprInput(block, 'SUBTITLE', { type: 'str', value: '' }),
          hint: exprInput(block, 'HINT', { type: 'str', value: '' }),
          bg: f(block, 'BG'),
        },
      }
    case 'sz_g2d_restart':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:restart' } }
    case 'sz_g2d_starfield':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:starfield',
          ctxVar: 'ctx',
          speed: exprInput(block, 'SPEED', { type: 'num', value: 1 }),
        },
      }
    case 'sz_g2d_drag_x':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:dragX', spriteVar: f(block, 'SPRITE') } }
    case 'sz_g2d_fit_screen':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:fitScreen',
          percent: exprInput(block, 'PERCENT', { type: 'num', value: 100 }),
        },
      }
    case 'sz_g2d_setup_stage':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:setupStage',
          width: exprInput(block, 'W', { type: 'num', value: 800 }),
          height: exprInput(block, 'H', { type: 'num', value: 480 }),
          bg: f(block, 'BG'),
        },
      }
    case 'sz_g2d_setup_full':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:setupFull',
          bg: f(block, 'BG'),
        },
      }

    // ---- Kit Nave & Asteroides (v0.7.0) ----
    case 'sz_g2d_spawn_bullet':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:spawnBullet',
          groupVar: f(block, 'GROUP'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          radius: exprInput(block, 'R', { type: 'num', value: 5 }),
          color: f(block, 'COLOR'),
          vx: exprInput(block, 'VX', { type: 'num', value: 0 }),
          vy: exprInput(block, 'VY', { type: 'num', value: -7 }),
        },
      }
    case 'sz_g2d_arrows_x':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:arrowsX',
          spriteVar: f(block, 'SPRITE'),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 6 }),
        },
      }
    case 'sz_g2d_blink':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:blinkSprite',
          spriteVar: f(block, 'SPRITE'),
          frames: exprInput(block, 'FRAMES', { type: 'num', value: 60 }),
        },
      }
    case 'sz_g2d_create_ship':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:createShip',
          varName: f(block, 'NAME'),
          x: exprInput(block, 'X', { type: 'num', value: 100 }),
          y: exprInput(block, 'Y', { type: 'num', value: 250 }),
          w: exprInput(block, 'W', { type: 'num', value: 54 }),
          h: exprInput(block, 'H', { type: 'num', value: 62 }),
          bodyColor: f(block, 'BODY'),
          wingColor: f(block, 'WINGS'),
        },
      }
    case 'sz_g2d_spawn_asteroid':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:spawnAsteroid',
          groupVar: f(block, 'GROUP'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          size: exprInput(block, 'SIZE', { type: 'num', value: 36 }),
          color: f(block, 'COLOR'),
          vx: exprInput(block, 'VX', { type: 'num', value: 0 }),
          vy: exprInput(block, 'VY', { type: 'num', value: 3 }),
        },
      }
    case 'sz_g2d_explode':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: { type: 'g2d:explode', spriteVar: f(block, 'SPRITE'), color: f(block, 'COLOR') },
      }
    case 'sz_g2d_play_shoot':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:playShoot' } }
    case 'sz_g2d_play_explosion':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:playExplosion' } }
    case 'sz_g2d_on_sprite_group_overlap':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:onSpriteGroupOverlap',
          spriteVar: f(block, 'SPRITE'),
          groupVar: f(block, 'GROUP'),
          itemName: f(block, 'ANAME') || 'inimigo',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }

    // ---- Nave clássica: girar + impulsionar na direção apontada (v0.10.0) ----
    case 'sz_g2d_steer_thrust':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:steerThrust',
          spriteVar: f(block, 'SPRITE'),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 3 }),
          turn: exprInput(block, 'TURN', { type: 'num', value: 3 }),
        },
      }
    case 'sz_g2d_rotate_sprite':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:rotateSprite',
          spriteVar: f(block, 'SPRITE'),
          deg: exprInput(block, 'DEG', { type: 'num', value: 15 }),
        },
      }
    case 'sz_g2d_point_sprite':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:pointSprite',
          spriteVar: f(block, 'SPRITE'),
          deg: exprInput(block, 'DEG', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g2d_thrust':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:thrust',
          spriteVar: f(block, 'SPRITE'),
          force: exprInput(block, 'FORCE', { type: 'num', value: 0.1 }),
        },
      }
    case 'sz_g2d_apply_friction':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:applyFriction',
          spriteVar: f(block, 'SPRITE'),
          factor: exprInput(block, 'FACTOR', { type: 'num', value: 0.97 }),
        },
      }
    case 'sz_g2d_shoot_from':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:shootFrom',
          spriteVar: f(block, 'SPRITE'),
          groupVar: f(block, 'GROUP'),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 6 }),
          color: f(block, 'COLOR'),
        },
      }
    case 'sz_g2d_spawn_asteroid_edge':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:spawnAsteroidEdge',
          groupVar: f(block, 'GROUP'),
          size: exprInput(block, 'SIZE', { type: 'num', value: 40 }),
          color: f(block, 'COLOR'),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 1.5 }),
        },
      }

    // ---- Pulo genérico + Kit dino (v0.9.0) ----
    case 'sz_g2d_jump_on_ground':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:jumpOnGround',
          spriteVar: f(block, 'SPRITE'),
          ctxVar: 'ctx',
          jump: exprInput(block, 'JUMP', { type: 'num', value: 14 }),
        },
      }
    case 'sz_g2d_stickhero_sprite':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:createStickHero',
          varName: f(block, 'NAME'),
          w: exprInput(block, 'W', { type: 'num', value: 18 }),
          h: exprInput(block, 'H', { type: 'num', value: 36 }),
          color: f(block, 'COLOR'),
        },
      }
    case 'sz_g2d_stickpath_create':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:createStickPath',
          varName: f(block, 'NAME'),
          ctxVar: 'ctx',
          platformColor: f(block, 'PLATFORM_COLOR'),
          stickColor: f(block, 'STICK_COLOR'),
        },
      }
    case 'sz_g2d_stickpath_scenery':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:stickPathScenery', pathVar: f(block, 'PATH') } }
    case 'sz_g2d_stickpath_grow':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:stickPathGrow',
          pathVar: f(block, 'PATH'),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 1 }),
        },
      }
    case 'sz_g2d_stickpath_drop':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:stickPathDrop', pathVar: f(block, 'PATH') } }
    case 'sz_g2d_stickpath_walk':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:stickPathWalk',
          spriteVar: f(block, 'SPRITE'),
          pathVar: f(block, 'PATH'),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 1 }),
        },
      }
    case 'sz_g2d_stickpath_draw':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:stickPathDraw', pathVar: f(block, 'PATH') } }
    case 'sz_g2d_stickpath_on_cross':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:onStickPathCross',
          pathVar: f(block, 'PATH'),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g2d_stickpath_on_perfect':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:onStickPathPerfect',
          pathVar: f(block, 'PATH'),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g2d_balloon_sprite':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:createBalloon',
          varName: f(block, 'NAME'),
          x: exprInput(block, 'X', { type: 'num', value: 110 }),
          y: exprInput(block, 'Y', { type: 'num', value: 195 }),
          w: exprInput(block, 'W', { type: 'num', value: 70 }),
          h: exprInput(block, 'H', { type: 'num', value: 100 }),
          color: f(block, 'BODY'),
          basketColor: f(block, 'BASKET'),
        },
      }
    case 'sz_g2d_balloonpath_create':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: { type: 'g2d:createBalloonPath', varName: f(block, 'NAME'), ctxVar: 'ctx' },
      }
    case 'sz_g2d_balloonpath_scenery':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:balloonPathScenery', pathVar: f(block, 'PATH') } }
    case 'sz_g2d_balloon_fire':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:balloonFire',
          spriteVar: f(block, 'SPRITE'),
          force: exprInput(block, 'FORCE', { type: 'num', value: 1 }),
        },
      }
    case 'sz_g2d_balloon_fly':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:balloonFly', spriteVar: f(block, 'SPRITE') } }
    case 'sz_g2d_balloonpath_scroll':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:balloonPathScroll',
          pathVar: f(block, 'PATH'),
          spriteVar: f(block, 'SPRITE'),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 1 }),
        },
      }
    case 'sz_g2d_balloonpath_on_tree':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:onBalloonPathTreeHit',
          pathVar: f(block, 'PATH'),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g2d_create_dino':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:createDino',
          varName: f(block, 'NAME'),
          x: exprInput(block, 'X', { type: 'num', value: 120 }),
          y: exprInput(block, 'Y', { type: 'num', value: 150 }),
          size: exprInput(block, 'SIZE', { type: 'num', value: 64 }),
          color: f(block, 'COLOR'),
        },
      }
    case 'sz_g2d_control_dino':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:controlDino',
          spriteVar: f(block, 'SPRITE'),
          ctxVar: 'ctx',
          jump: exprInput(block, 'JUMP', { type: 'num', value: 15 }),
        },
      }
    case 'sz_g2d_spawn_obstacle':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:spawnObstacle',
          groupVar: f(block, 'GROUP'),
          ctxVar: 'ctx',
          shape: f(block, 'SHAPE') || 'cactus',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          size: exprInput(block, 'SIZE', { type: 'num', value: 44 }),
          vx: exprInput(block, 'VX', { type: 'num', value: -6 }),
        },
      }
    case 'sz_g2d_spawn_egg':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:spawnEgg',
          groupVar: f(block, 'GROUP'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          vx: exprInput(block, 'VX', { type: 'num', value: -6 }),
        },
      }
    case 'sz_g2d_forest':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:forest',
          ctxVar: 'ctx',
          speed: exprInput(block, 'SPEED', { type: 'num', value: 4 }),
        },
      }
    case 'sz_g2d_play_jump':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:playJump' } }
    case 'sz_g2d_play_dino_hurt':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:playDinoHurt' } }
    case 'sz_g2d_play_collect':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:playCollect' } }

    // ---- Kit gorilas: batalha de bananas ----
    case 'sz_g2d_create_city':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:createCity', varName: f(block, 'NAME') } }
    case 'sz_g2d_draw_city':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: { type: 'g2d:drawCity', cityVar: f(block, 'CITY'), ctxVar: 'ctx' },
      }
    case 'sz_g2d_place_thrower':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:placeThrower',
          varName: f(block, 'NAME'),
          cityVar: f(block, 'CITY'),
          side: f(block, 'SIDE') === 'right' ? 'right' : 'left',
          color: f(block, 'COLOR'),
        },
      }
    case 'sz_g2d_new_wind':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:newWind', cityVar: f(block, 'CITY') } }
    case 'sz_g2d_draw_wind':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: { type: 'g2d:drawWind', cityVar: f(block, 'CITY'), ctxVar: 'ctx' },
      }
    case 'sz_g2d_aim_drag':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: { type: 'g2d:aimDrag', throwerVar: f(block, 'THROWER'), ctxVar: 'ctx' },
      }
    case 'sz_g2d_throw_banana':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:throwBanana',
          throwerVar: f(block, 'THROWER'),
          cityVar: f(block, 'CITY'),
        },
      }
    case 'sz_g2d_update_banana':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:updateBanana', cityVar: f(block, 'CITY') } }
    case 'sz_g2d_draw_banana':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: { type: 'g2d:drawBanana', cityVar: f(block, 'CITY'), ctxVar: 'ctx' },
      }
    case 'sz_g2d_play_whistle':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:playWhistle' } }
    case 'sz_g2d_play_boom':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:playBoom' } }
    case 'sz_g2d_computer_turn':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:computerTurn',
          throwerVar: f(block, 'THROWER'),
          cityVar: f(block, 'CITY'),
          enemyVar: f(block, 'ENEMY'),
        },
      }
    case 'sz_g2d_draw_aim_readout':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:drawAimReadout', ctxVar: 'ctx' } }

    // ---- Game 3D (extension blocks) ----
    case 'sz_g3d_create_scene':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: { type: 'g3d:createScene', canvasId: f(block, 'CANVAS'), varName: f(block, 'NAME') },
      }
    case 'sz_g3d_create_fullscreen_scene':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: { type: 'g3d:createFullscreenScene', varName: f(block, 'NAME'), bg: f(block, 'BG') },
      }
    case 'sz_g3d_set_background':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: { type: 'g3d:setBackground', worldVar: f(block, 'WORLD'), color: f(block, 'COLOR') },
      }
    case 'sz_g3d_set_camera':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:setCameraPosition',
          worldVar: f(block, 'WORLD'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 5 }),
        },
      }
    case 'sz_g3d_create_box':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:createBox',
          varName: f(block, 'NAME'),
          worldVar: f(block, 'WORLD'),
          size: exprInput(block, 'SIZE', { type: 'num', value: 1 }),
          color: f(block, 'COLOR'),
        },
      }
    case 'sz_g3d_create_sphere':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:createSphere',
          varName: f(block, 'NAME'),
          worldVar: f(block, 'WORLD'),
          radius: exprInput(block, 'RADIUS', { type: 'num', value: 0.5 }),
          color: f(block, 'COLOR'),
        },
      }
    case 'sz_g3d_set_position':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:setPosition',
          objVar: f(block, 'OBJ'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g3d_set_rotation':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:setRotation',
          objVar: f(block, 'OBJ'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g3d_animate':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:animate',
          worldVar: f(block, 'WORLD'),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g3d_create_block':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:createBlock',
          varName: f(block, 'NAME'),
          worldVar: f(block, 'WORLD'),
          width: exprInput(block, 'W', { type: 'num', value: 10 }),
          height: exprInput(block, 'H', { type: 'num', value: 0.5 }),
          depth: exprInput(block, 'D', { type: 'num', value: 50 }),
          color: f(block, 'COLOR'),
        },
      }
    case 'sz_g3d_set_velocity':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:setVelocity',
          objVar: f(block, 'OBJ'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g3d_jump':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:jump',
          objVar: f(block, 'OBJ'),
          force: exprInput(block, 'FORCE', { type: 'num', value: 0.08 }),
        },
      }
    case 'sz_g3d_apply_gravity':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: { type: 'g3d:applyGravity', objVar: f(block, 'OBJ'), groundVar: f(block, 'GROUND') },
      }
    case 'sz_g3d_control_keys':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:controlWithKeys',
          objVar: f(block, 'OBJ'),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 0.05 }),
        },
      }
    case 'sz_g3d_set_scale':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:setScale',
          objVar: f(block, 'OBJ'),
          factor: exprInput(block, 'FACTOR', { type: 'num', value: 1 }),
        },
      }
    case 'sz_g3d_camera_follow':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: { type: 'g3d:cameraFollow', worldVar: f(block, 'WORLD'), objVar: f(block, 'OBJ') },
      }
    case 'sz_g3d_create_group':
      seen.add('game-3d')
      return { kind: 'js', value: { type: 'g3d:createGroup', varName: f(block, 'NAME') } }
    case 'sz_g3d_spawn_enemy':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:spawnEnemy',
          worldVar: f(block, 'WORLD'),
          groupVar: f(block, 'GROUP'),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 0.1 }),
        },
      }
    case 'sz_g3d_update_group':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:updateGroup',
          groupVar: f(block, 'GROUP'),
          groundVar: f(block, 'GROUND'),
        },
      }
    case 'sz_g3d_update_group_no_gravity':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: { type: 'g3d:updateGroupNoGravity', groupVar: f(block, 'GROUP') },
      }
    case 'sz_g3d_prune_offscreen':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:pruneOffscreen',
          worldVar: f(block, 'WORLD'),
          groupVar: f(block, 'GROUP'),
          itemName: f(block, 'ITEM'),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g3d_for_each_in_group':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:forEachInGroup',
          groupVar: f(block, 'GROUP'),
          itemName: f(block, 'ITEM'),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g3d_remove_from_group':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:removeFromGroup',
          groupVar: f(block, 'GROUP'),
          objVar: f(block, 'OBJ'),
        },
      }
    case 'sz_g3d_clear_group':
      seen.add('game-3d')
      return { kind: 'js', value: { type: 'g3d:clearGroup', groupVar: f(block, 'GROUP') } }
    case 'sz_g3d_every_frames':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:everyFrames',
          n: exprInput(block, 'N', { type: 'num', value: 30 }),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g3d_every_seconds':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:everySeconds',
          secs: exprInput(block, 'SECS', { type: 'num', value: 2 }),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g3d_stop':
      seen.add('game-3d')
      return { kind: 'js', value: { type: 'g3d:stop', worldVar: f(block, 'WORLD') } }
    // ---- Travessia: cena/personagem/mapa/tráfego (kit) + grade/iso/esteira (genéricos) ----
    case 'sz_g3d_create_crossing_scene':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:createCrossingScene',
          canvasId: f(block, 'CANVAS'),
          varName: f(block, 'NAME'),
        },
      }
    case 'sz_g3d_create_crosser':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:createCrosser',
          varName: f(block, 'NAME'),
          worldVar: f(block, 'WORLD'),
          color: f(block, 'COLOR'),
        },
      }
    case 'sz_g3d_crosser_move':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:crosserMove',
          objVar: f(block, 'OBJ'),
          direction: f(block, 'DIR') || 'forward',
        },
      }
    case 'sz_g3d_crosser_step':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: { type: 'g3d:crosserStep', objVar: f(block, 'OBJ'), worldVar: f(block, 'WORLD') },
      }
    case 'sz_g3d_crosser_reset':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: { type: 'g3d:crosserReset', objVar: f(block, 'OBJ'), worldVar: f(block, 'WORLD') },
      }
    case 'sz_g3d_add_row':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:addRow',
          worldVar: f(block, 'WORLD'),
          rowIndex: exprInput(block, 'ROW', { type: 'num', value: 1 }),
          kind: f(block, 'KIND') || 'car',
          direction: f(block, 'DIR') || 'right',
          speed: exprInput(block, 'SPEED', { type: 'num', value: 150 }),
        },
      }
    case 'sz_g3d_generate_rows':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:generateRows',
          worldVar: f(block, 'WORLD'),
          count: exprInput(block, 'COUNT', { type: 'num', value: 20 }),
        },
      }
    case 'sz_g3d_move_traffic':
      seen.add('game-3d')
      return { kind: 'js', value: { type: 'g3d:moveTraffic', worldVar: f(block, 'WORLD') } }
    case 'sz_g3d_isometric_camera':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:isometricCamera',
          worldVar: f(block, 'WORLD'),
          followVar: f(block, 'FOLLOW'),
        },
      }
    case 'sz_g3d_grid_step':
      seen.add('game-3d')
      return { kind: 'js', value: { type: 'g3d:gridStep', objVar: f(block, 'OBJ') } }
    case 'sz_g3d_grid_move':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:gridMove',
          objVar: f(block, 'OBJ'),
          direction: f(block, 'DIR') || 'forward',
        },
      }
    case 'sz_g3d_move_across':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:moveAcross',
          groupVar: f(block, 'GROUP'),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 0.1 }),
          min: exprInput(block, 'MIN', { type: 'num', value: -10 }),
          max: exprInput(block, 'MAX', { type: 'num', value: 10 }),
        },
      }
    case 'sz_g3d_grid_position':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:gridPosition',
          objVar: f(block, 'OBJ'),
          row: exprInput(block, 'ROW', { type: 'num', value: 0 }),
          col: exprInput(block, 'COL', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g3d_top_camera':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:topCamera',
          worldVar: f(block, 'WORLD'),
          followVar: f(block, 'FOLLOW'),
        },
      }
    case 'sz_g3d_move_in_circle':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:moveInCircle',
          objVar: f(block, 'OBJ'),
          radius: exprInput(block, 'RADIUS', { type: 'num', value: 7 }),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 0.02 }),
        },
      }
    case 'sz_g3d_create_race_scene':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:createRaceScene',
          canvasId: f(block, 'CANVAS'),
          varName: f(block, 'NAME'),
        },
      }
    case 'sz_g3d_create_race_track':
      seen.add('game-3d')
      return { kind: 'js', value: { type: 'g3d:createRaceTrack', worldVar: f(block, 'WORLD') } }
    case 'sz_g3d_create_race_car':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:createRaceCar',
          varName: f(block, 'NAME'),
          worldVar: f(block, 'WORLD'),
          color: f(block, 'COLOR'),
        },
      }
    case 'sz_g3d_race_step':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: { type: 'g3d:raceStep', objVar: f(block, 'OBJ'), worldVar: f(block, 'WORLD') },
      }
    case 'sz_g3d_race_control':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:raceControl',
          objVar: f(block, 'OBJ'),
          mode: f(block, 'MODE') || 'normal',
        },
      }
    case 'sz_g3d_run_rivals':
      seen.add('game-3d')
      return { kind: 'js', value: { type: 'g3d:runRivals', worldVar: f(block, 'WORLD') } }
    case 'sz_g3d_race_reset':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: { type: 'g3d:raceReset', objVar: f(block, 'OBJ'), worldVar: f(block, 'WORLD') },
      }
    case 'sz_g3d_fall':
      seen.add('game-3d')
      return { kind: 'js', value: { type: 'g3d:fall', objVar: f(block, 'OBJ') } }
    case 'sz_g3d_slide_between':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:slideBetween',
          objVar: f(block, 'OBJ'),
          axis: f(block, 'AXIS') || 'x',
          min: exprInput(block, 'MIN', { type: 'num', value: -5 }),
          max: exprInput(block, 'MAX', { type: 'num', value: 5 }),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 0.05 }),
        },
      }
    case 'sz_g3d_spin':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:spin',
          objVar: f(block, 'OBJ'),
          axis: f(block, 'AXIS') || 'y',
          speed: exprInput(block, 'SPEED', { type: 'num', value: 0.03 }),
        },
      }
    case 'sz_g3d_create_stack_scene':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:createStackScene',
          canvasId: f(block, 'CANVAS'),
          varName: f(block, 'NAME'),
        },
      }
    case 'sz_g3d_create_stack_tower':
      seen.add('game-3d')
      return { kind: 'js', value: { type: 'g3d:createStackTower', worldVar: f(block, 'WORLD') } }
    case 'sz_g3d_stack_drop':
      seen.add('game-3d')
      return { kind: 'js', value: { type: 'g3d:stackDrop', worldVar: f(block, 'WORLD') } }
    case 'sz_g3d_stack_step':
      seen.add('game-3d')
      return { kind: 'js', value: { type: 'g3d:stackStep', worldVar: f(block, 'WORLD') } }
    case 'sz_g3d_stack_reset':
      seen.add('game-3d')
      return { kind: 'js', value: { type: 'g3d:stackReset', worldVar: f(block, 'WORLD') } }
    case 'sz_g3d_move_by':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:moveBy',
          objVar: f(block, 'OBJ'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g3d_rotate_by':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:rotateBy',
          objVar: f(block, 'OBJ'),
          axis: f(block, 'AXIS') || 'y',
          amount: exprInput(block, 'AMOUNT', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g3d_move_towards':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:moveTowards',
          objVar: f(block, 'OBJ'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
          factor: exprInput(block, 'FACTOR', { type: 'num', value: 0.1 }),
        },
      }
    case 'sz_g3d_look_at_object':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: { type: 'g3d:lookAtObject', aVar: f(block, 'A'), bVar: f(block, 'B') },
      }
    case 'sz_g3d_look_at_point':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:lookAtPoint',
          objVar: f(block, 'OBJ'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g3d_move_forward':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:moveForward',
          objVar: f(block, 'OBJ'),
          dist: exprInput(block, 'DIST', { type: 'num', value: 0.1 }),
        },
      }
    case 'sz_g3d_face_velocity':
      seen.add('game-3d')
      return { kind: 'js', value: { type: 'g3d:faceVelocity', objVar: f(block, 'OBJ') } }
    case 'sz_g3d_body':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:body',
          objVar: f(block, 'OBJ'),
          gravity: exprInput(block, 'GRAVITY', { type: 'num', value: -0.01 }),
        },
      }
    case 'sz_g3d_step_body':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: { type: 'g3d:stepBody', objVar: f(block, 'OBJ'), worldVar: f(block, 'WORLD') },
      }
    case 'sz_g3d_set_solid':
      seen.add('game-3d')
      return { kind: 'js', value: { type: 'g3d:setSolid', objVar: f(block, 'OBJ') } }
    case 'sz_g3d_platformer_controls':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:platformerControls',
          objVar: f(block, 'OBJ'),
          worldVar: f(block, 'WORLD'),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 0.08 }),
          jump: exprInput(block, 'JUMP', { type: 'num', value: 0.18 }),
        },
      }
    case 'sz_g3d_fps_controls':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:fpsControls',
          objVar: f(block, 'OBJ'),
          worldVar: f(block, 'WORLD'),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 0.08 }),
        },
      }
    case 'sz_g3d_resolve_collision':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: { type: 'g3d:resolveCollision', aVar: f(block, 'A'), bVar: f(block, 'B') },
      }
    case 'sz_g3d_fps_camera':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: { type: 'g3d:fpsCamera', worldVar: f(block, 'WORLD'), objVar: f(block, 'OBJ') },
      }
    case 'sz_g3d_orbit_camera':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: { type: 'g3d:orbitCamera', worldVar: f(block, 'WORLD'), objVar: f(block, 'OBJ') },
      }
    case 'sz_g3d_third_person_camera':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:thirdPersonCamera',
          worldVar: f(block, 'WORLD'),
          objVar: f(block, 'OBJ'),
          dist: exprInput(block, 'DIST', { type: 'num', value: 6 }),
          height: exprInput(block, 'HEIGHT', { type: 'num', value: 3 }),
        },
      }
    case 'sz_g3d_camera_look_at':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: { type: 'g3d:cameraLookAt', worldVar: f(block, 'WORLD'), objVar: f(block, 'OBJ') },
      }
    case 'sz_g3d_set_fov':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:setFOV',
          worldVar: f(block, 'WORLD'),
          deg: exprInput(block, 'DEG', { type: 'num', value: 60 }),
        },
      }
    case 'sz_g3d_create_cylinder':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:createCylinder',
          varName: f(block, 'NAME'),
          worldVar: f(block, 'WORLD'),
          radius: exprInput(block, 'RADIUS', { type: 'num', value: 0.5 }),
          height: exprInput(block, 'HEIGHT', { type: 'num', value: 1 }),
          color: f(block, 'COLOR'),
        },
      }
    case 'sz_g3d_create_cone':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:createCone',
          varName: f(block, 'NAME'),
          worldVar: f(block, 'WORLD'),
          radius: exprInput(block, 'RADIUS', { type: 'num', value: 0.5 }),
          height: exprInput(block, 'HEIGHT', { type: 'num', value: 1 }),
          color: f(block, 'COLOR'),
        },
      }
    case 'sz_g3d_create_plane':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:createPlane',
          varName: f(block, 'NAME'),
          worldVar: f(block, 'WORLD'),
          width: exprInput(block, 'W', { type: 'num', value: 10 }),
          depth: exprInput(block, 'D', { type: 'num', value: 10 }),
          color: f(block, 'COLOR'),
        },
      }
    case 'sz_g3d_create_torus':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:createTorus',
          varName: f(block, 'NAME'),
          worldVar: f(block, 'WORLD'),
          radius: exprInput(block, 'RADIUS', { type: 'num', value: 0.5 }),
          tube: exprInput(block, 'TUBE', { type: 'num', value: 0.2 }),
          color: f(block, 'COLOR'),
        },
      }
    case 'sz_g3d_create_model':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: { type: 'g3d:createModel', varName: f(block, 'NAME'), worldVar: f(block, 'WORLD') },
      }
    case 'sz_g3d_set_color':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: { type: 'g3d:setColor', objVar: f(block, 'OBJ'), color: f(block, 'COLOR') },
      }
    case 'sz_g3d_set_opacity':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:setOpacity',
          objVar: f(block, 'OBJ'),
          opacity: exprInput(block, 'OPACITY', { type: 'num', value: 1 }),
        },
      }
    case 'sz_g3d_set_material':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:setMaterial',
          objVar: f(block, 'OBJ'),
          kind: f(block, 'KIND') || 'normal',
        },
      }
    case 'sz_g3d_set_texture':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: { type: 'g3d:setTexture', objVar: f(block, 'OBJ'), asset: f(block, 'ASSET') },
      }
    case 'sz_g3d_set_visible':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:setVisible',
          objVar: f(block, 'OBJ'),
          mode: f(block, 'MODE') || 'show',
        },
      }
    case 'sz_g3d_remove_object':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: { type: 'g3d:removeObject', worldVar: f(block, 'WORLD'), objVar: f(block, 'OBJ') },
      }
    case 'sz_g3d_add_to_model':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: { type: 'g3d:addToModel', modelVar: f(block, 'MODEL'), partVar: f(block, 'PART') },
      }
    case 'sz_g3d_add_ambient_light':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:addAmbientLight',
          worldVar: f(block, 'WORLD'),
          color: f(block, 'COLOR'),
          intensity: exprInput(block, 'INTENSITY', { type: 'num', value: 0.6 }),
        },
      }
    case 'sz_g3d_add_sun_light':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:addSunLight',
          worldVar: f(block, 'WORLD'),
          color: f(block, 'COLOR'),
          intensity: exprInput(block, 'INTENSITY', { type: 'num', value: 0.9 }),
        },
      }
    case 'sz_g3d_add_point_light':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:addPointLight',
          worldVar: f(block, 'WORLD'),
          color: f(block, 'COLOR'),
          intensity: exprInput(block, 'INTENSITY', { type: 'num', value: 1 }),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 2 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g3d_set_fog':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:setFog',
          worldVar: f(block, 'WORLD'),
          color: f(block, 'COLOR'),
          near: exprInput(block, 'NEAR', { type: 'num', value: 1 }),
          far: exprInput(block, 'FAR', { type: 'num', value: 30 }),
        },
      }
    case 'sz_g3d_set_sky':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:setSky',
          worldVar: f(block, 'WORLD'),
          top: f(block, 'TOP'),
          bottom: f(block, 'BOTTOM'),
        },
      }
    case 'sz_g3d_set_shadows':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:setShadows',
          worldVar: f(block, 'WORLD'),
          mode: f(block, 'MODE') || 'on',
        },
      }
    case 'sz_g3d_create_swarm':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: { type: 'g3d:createSwarm', varName: f(block, 'NAME'), worldVar: f(block, 'WORLD') },
      }
    case 'sz_g3d_spawn_in_swarm':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:spawnInSwarm',
          swarmVar: f(block, 'SWARM'),
          originalVar: f(block, 'ORIGINAL'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g3d_for_each_swarm':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:forEachInSwarm',
          swarmVar: f(block, 'SWARM'),
          itemName: f(block, 'ITEM'),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g3d_remove_from_swarm':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:removeFromSwarm',
          swarmVar: f(block, 'SWARM'),
          itemVar: f(block, 'ITEM'),
        },
      }
    case 'sz_g3d_prune_swarm':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:pruneSwarm',
          swarmVar: f(block, 'SWARM'),
          axis: f(block, 'AXIS') || 'y',
          min: exprInput(block, 'MIN', { type: 'num', value: -20 }),
          max: exprInput(block, 'MAX', { type: 'num', value: 20 }),
        },
      }
    case 'sz_g3d_play_note':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:playNote',
          freq: exprInput(block, 'FREQ', { type: 'num', value: 440 }),
          ms: exprInput(block, 'MS', { type: 'num', value: 200 }),
        },
      }
    case 'sz_g3d_play_effect':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: { type: 'g3d:playEffect', kind: f(block, 'KIND') || 'coin' },
      }

    // ----- game-2d-advanced (kit profissional) -----
    case 'sz_gk_setup':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:setup',
          w: exprInput(block, 'W', { type: 'num', value: 1280 }),
          h: exprInput(block, 'H', { type: 'num', value: 720 }),
          bg: f(block, 'BG') || '#1a1a2e',
          accent: f(block, 'ACCENT') || '#4a9eff',
        },
      }
    case 'sz_gk_setup_full':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:setupFull',
          bg: f(block, 'BG') || '#1a1a2e',
          accent: f(block, 'ACCENT') || '#4a9eff',
        },
      }
    case 'sz_gk_start':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:start' } }
    case 'sz_gk_load_image':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:loadImage', name: f(block, 'NAME'), asset: f(block, 'ASSET') },
      }
    case 'sz_gk_set_screen_text':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:setScreenText',
          screen: f(block, 'SCREEN') || 'menu',
          title: exprInput(block, 'TITLE', { type: 'str', value: '' }),
          text: exprInput(block, 'TEXT', { type: 'str', value: '' }),
          button: exprInput(block, 'BTN', { type: 'str', value: '' }),
        },
      }
    case 'sz_gk_create_screen':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:createScreen',
          name: f(block, 'NAME'),
          title: exprInput(block, 'TITLE', { type: 'str', value: '' }),
          text: exprInput(block, 'TEXT', { type: 'str', value: '' }),
        },
      }
    case 'sz_gk_add_button':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:addButton',
          screen: f(block, 'SCREEN'),
          label: exprInput(block, 'LABEL', { type: 'str', value: 'Botão' }),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_gk_set_screen_bg':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:setScreenBg',
          screen: f(block, 'SCREEN'),
          color: f(block, 'COLOR') || '#1a1e33',
          image: f(block, 'IMAGE'),
        },
      }
    case 'sz_gk_show_screen':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:showScreen', name: f(block, 'SCREEN') } }
    case 'sz_gk_hide_screens':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:hideScreens' } }
    case 'sz_gk_set_state':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:setState', name: f(block, 'STATE') || 'jogando' } }
    case 'sz_gk_restart_game':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:restartGame' } }
    case 'sz_gk_on_game_start':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:onGameStart', body: getStatementChildren(block, 'BODY', seen) },
      }
    case 'sz_gk_on_enter_state':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:onEnterState',
          name: f(block, 'STATE') || 'jogando',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_gk_pause':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:pause' } }
    case 'sz_gk_resume':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:resume' } }
    case 'sz_gk_return_to_menu':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:returnToMenu' } }
    case 'sz_gk_end_game':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:endGame' } }
    case 'sz_gk_on_update':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:onUpdate',
          dtName: f(block, 'DT') || 'dt',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_gk_on_draw':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:onDraw',
          ctxName: f(block, 'PARAM') || 'ctx',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_gk_on_draw_hud':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:onDrawHud',
          ctxName: f(block, 'PARAM') || 'ctx',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_gk_on_game_click':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:onGameClick',
          xName: f(block, 'PX') || 'px',
          yName: f(block, 'PY') || 'py',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_gk_set_sheet':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:setSheet',
          charVar: f(block, 'CHAR'),
          image: f(block, 'IMAGE'),
          fw: exprInput(block, 'FW', { type: 'num', value: 32 }),
          fh: exprInput(block, 'FH', { type: 'num', value: 32 }),
        },
      }
    case 'sz_gk_play_anim':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:playAnim',
          charVar: f(block, 'CHAR'),
          from: exprInput(block, 'FROM', { type: 'num', value: 0 }),
          to: exprInput(block, 'TO', { type: 'num', value: 3 }),
          fps: exprInput(block, 'FPS', { type: 'num', value: 8 }),
        },
      }
    case 'sz_gk_camera_follow':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:cameraFollow',
          charVar: f(block, 'CHAR'),
          w: exprInput(block, 'W', { type: 'num', value: 1920 }),
          h: exprInput(block, 'H', { type: 'num', value: 1080 }),
        },
      }
    case 'sz_gk_camera_follow_map':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:cameraFollowMap', charVar: f(block, 'CHAR'), map: f(block, 'MAP') },
      }
    case 'sz_gk_camera_stop':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:cameraStop' } }
    case 'sz_gk_launch_towards':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:launchTowards',
          charVar: f(block, 'WHO'),
          targetVar: f(block, 'TARGET'),
          speed: exprInput(block, 'V', { type: 'num', value: 400 }),
        },
      }
    case 'sz_gk_move_by_velocity':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:moveByVelocity', charVar: f(block, 'WHO'), dtVar: f(block, 'DT') },
      }
    case 'sz_gk_set_angle':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:setAngle',
          charVar: f(block, 'WHO'),
          degrees: exprInput(block, 'DEG', { type: 'num', value: 0 }),
        },
      }
    case 'sz_gk_draw_bar':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:drawBar',
          current: exprInput(block, 'CUR', { type: 'num', value: 50 }),
          max: exprInput(block, 'MAX', { type: 'num', value: 100 }),
          x: exprInput(block, 'X', { type: 'num', value: 20 }),
          y: exprInput(block, 'Y', { type: 'num', value: 20 }),
          w: exprInput(block, 'W', { type: 'num', value: 200 }),
          h: exprInput(block, 'H', { type: 'num', value: 16 }),
          color: f(block, 'COLOR') || '#4a9eff',
        },
      }
    case 'sz_gk_rpg_move_grid':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgMoveGrid',
          charVar: f(block, 'CHAR'),
          cell: exprInput(block, 'CELL', { type: 'num', value: 64 }),
          dtVar: f(block, 'DT'),
        },
      }
    case 'sz_gk_rpg_block_cell':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgBlockCell',
          cx: exprInput(block, 'CX', { type: 'num', value: 0 }),
          cy: exprInput(block, 'CY', { type: 'num', value: 0 }),
        },
      }
    case 'sz_gk_rpg_create_npc':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgCreateNpc',
          name: f(block, 'NAME'),
          cx: exprInput(block, 'CX', { type: 'num', value: 3 }),
          cy: exprInput(block, 'CY', { type: 'num', value: 3 }),
          image: f(block, 'IMAGE'),
          look: f(block, 'LOOK'),
        },
      }
    case 'sz_gk_rpg_draw_npcs':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:rpgDrawNpcs' } }
    case 'sz_gk_rpg_on_talk':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgOnTalk',
          npc: f(block, 'NPC'),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_gk_rpg_say':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgSay',
          text: exprInput(block, 'TEXT', { type: 'str', value: 'Olá!' }),
          speaker: exprInput(block, 'NAME', { type: 'str', value: '' }),
        },
      }
    case 'sz_gk_rpg_add_flag':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:rpgAddFlag', flag: f(block, 'FLAG') } }
    case 'sz_gk_rpg_give_item':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:rpgGiveItem', item: f(block, 'NAME'), image: f(block, 'IMAGE') },
      }
    case 'sz_gk_rpg_remove_item':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:rpgRemoveItem', item: f(block, 'NAME') } }
    case 'sz_gk_rpg_draw_inventory':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgDrawInventory',
          x: exprInput(block, 'X', { type: 'num', value: 20 }),
          y: exprInput(block, 'Y', { type: 'num', value: 20 }),
        },
      }
    case 'sz_gk_rpg_go_map':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:rpgGoMap', map: f(block, 'MAP') } }
    case 'sz_gk_rpg_set_start_map':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:rpgSetStartMap', map: f(block, 'MAP') } }
    case 'sz_gk_rpg_create_map':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgCreateMap',
          map: f(block, 'MAP'),
          cols: exprInput(block, 'COLS', { type: 'num', value: 15 }),
          rows: exprInput(block, 'ROWS', { type: 'num', value: 10 }),
          ctxName: f(block, 'PARAM') || 'ctx',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_gk_rpg_on_enter_map':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgOnEnterMap',
          map: f(block, 'MAP'),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_gk_rpg_create_door':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgCreateDoor',
          cx: exprInput(block, 'CX', { type: 'num', value: 5 }),
          cy: exprInput(block, 'CY', { type: 'num', value: 5 }),
          map: f(block, 'MAP'),
        },
      }
    // 🌍 Mundo aberto: bordas ligadas; o tamanho pertence ao mapa criado.
    case 'sz_gk_rpg_connect_edge':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgConnectEdge',
          side: f(block, 'SIDE') || 'leste',
          map: f(block, 'MAP'),
        },
      }
    case 'sz_gk_rpg_battle_stats':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgBattleStats',
          hp: exprInput(block, 'HP', { type: 'num', value: 30 }),
          str: exprInput(block, 'STR', { type: 'num', value: 7 }),
          def: exprInput(block, 'DEF', { type: 'num', value: 0 }),
        },
      }
    case 'sz_gk_rpg_battle_start':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgBattleStart',
          name: f(block, 'NAME'),
          hp: exprInput(block, 'HP', { type: 'num', value: 20 }),
          str: exprInput(block, 'STR', { type: 'num', value: 5 }),
          def: exprInput(block, 'DEF', { type: 'num', value: 0 }),
          // 🖼️ imagem OPCIONAL: só entra na IR quando preenchida (jogo antigo sem
          // imagem round-trippa byte-idêntico).
          ...(f(block, 'IMAGE') ? { image: f(block, 'IMAGE') } : {}),
        },
      }
    case 'sz_gk_rpg_set_special':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgSetSpecial',
          name: f(block, 'NAME'),
          dmg: exprInput(block, 'DMG', { type: 'num', value: 12 }),
          cost: exprInput(block, 'COST', { type: 'num', value: 4 }),
        },
      }
    case 'sz_gk_rpg_give_potion':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgGivePotion',
          name: f(block, 'NAME'),
          heal: exprInput(block, 'HEAL', { type: 'num', value: 20 }),
        },
      }
    case 'sz_gk_rpg_heal_hero':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:rpgHealHero' } }
    case 'sz_gk_rpg_battle_reward':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgBattleReward',
          xp: exprInput(block, 'XP', { type: 'num', value: 20 }),
        },
      }
    case 'sz_gk_rpg_inflict':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgInflict',
          who: f(block, 'WHO'),
          status: f(block, 'STATUS') || 'veneno', // R25: veneno|regenera|atrapalha
          turns: exprInput(block, 'TURNS', { type: 'num', value: 3 }),
        },
      }
    case 'sz_gk_rpg_add_ally':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgAddAlly',
          name: f(block, 'NAME'),
          hp: exprInput(block, 'HP', { type: 'num', value: 24 }),
          str: exprInput(block, 'STR', { type: 'num', value: 6 }),
          def: exprInput(block, 'DEF', { type: 'num', value: 1 }),
          color: f(block, 'COLOR') || '#4ade80',
          ...(f(block, 'IMAGE') ? { image: f(block, 'IMAGE') } : {}),
        },
      }
    case 'sz_gk_rpg_add_foe':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgAddFoe',
          name: f(block, 'NAME'),
          hp: exprInput(block, 'HP', { type: 'num', value: 20 }),
          str: exprInput(block, 'STR', { type: 'num', value: 5 }),
          def: exprInput(block, 'DEF', { type: 'num', value: 0 }),
          color: f(block, 'COLOR') || '#e05a5a',
          ...(f(block, 'IMAGE') ? { image: f(block, 'IMAGE') } : {}),
        },
      }
    case 'sz_gk_rpg_teach_move':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgTeachMove',
          who: f(block, 'WHO'),
          move: f(block, 'MOVE'),
          dmg: exprInput(block, 'DMG', { type: 'num', value: 12 }),
          cost: exprInput(block, 'COST', { type: 'num', value: 3 }),
        },
      }
    case 'sz_gk_rpg_teach_heal':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgTeachHeal',
          who: f(block, 'WHO'),
          move: f(block, 'MOVE'),
          amount: exprInput(block, 'AMOUNT', { type: 'num', value: 12 }),
          cost: exprInput(block, 'COST', { type: 'num', value: 3 }),
        },
      }
    case 'sz_gk_rpg_add_boss':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgAddBoss',
          name: f(block, 'NAME'),
          hp: exprInput(block, 'HP', { type: 'num', value: 120 }),
          str: exprInput(block, 'STR', { type: 'num', value: 9 }),
          def: exprInput(block, 'DEF', { type: 'num', value: 2 }),
          ...(f(block, 'IMAGE') ? { image: f(block, 'IMAGE') } : {}),
        },
      }
    case 'sz_gk_rpg_define_battler':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgDefineBattler',
          name: f(block, 'NAME'),
          hp: exprInput(block, 'HP', { type: 'num', value: 120 }),
          str: exprInput(block, 'STR', { type: 'num', value: 9 }),
          def: exprInput(block, 'DEF', { type: 'num', value: 2 }),
          image: f(block, 'IMAGE'),
          color: f(block, 'COLOR') || '#e05a5a',
          boss: f(block, 'BOSS') === 'TRUE',
        },
      }
    case 'sz_gk_rpg_battle_named':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:rpgBattleNamed', name: f(block, 'NAME') } }
    case 'sz_gk_rpg_add_foe_named':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:rpgAddFoeNamed', name: f(block, 'NAME') } }
    case 'sz_gk_rpg_on_foe_turn':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgOnFoeTurn',
          name: f(block, 'NAME'),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_gk_rpg_foe_use':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:rpgFoeUse', name: f(block, 'NAME'), move: f(block, 'MOVE') },
      }
    case 'sz_gk_rpg_foe_hit_all':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgFoeHitAll',
          name: f(block, 'NAME'),
          dmg: exprInput(block, 'DMG', { type: 'num', value: 15 }),
        },
      }
    case 'sz_gk_rpg_on_battle_end':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:rpgOnBattleEnd', body: getStatementChildren(block, 'BODY', seen) },
      }
    case 'sz_gk_set_walk_sheet':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:setWalkSheet',
          charVar: f(block, 'CHAR'),
          image: f(block, 'IMAGE'),
          fw: exprInput(block, 'FW', { type: 'num', value: 16 }),
          fh: exprInput(block, 'FH', { type: 'num', value: 16 }),
        },
      }
    case 'sz_gk_rpg_cutscene':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:rpgCutscene', body: getStatementChildren(block, 'BODY', seen) },
      }
    case 'sz_gk_rpg_wait':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgWait',
          seconds: exprInput(block, 'SECONDS', { type: 'num', value: 1 }),
        },
      }
    case 'sz_gk_rpg_face':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:rpgFace', npc: f(block, 'NPC'), dir: f(block, 'DIR') },
      }
    case 'sz_gk_rpg_npc_walk_to':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgNpcWalkTo',
          npc: f(block, 'NPC'),
          cx: exprInput(block, 'CX', { type: 'num', value: 0 }),
          cy: exprInput(block, 'CY', { type: 'num', value: 0 }),
        },
      }
    case 'sz_gk_rpg_npc_wander':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:rpgNpcWander', npc: f(block, 'NPC') } }
    case 'sz_gk_rpg_on_step':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgOnStep',
          cx: exprInput(block, 'CX', { type: 'num', value: 0 }),
          cy: exprInput(block, 'CY', { type: 'num', value: 0 }),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_gk_rpg_menu':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgMenu',
          title: exprInput(block, 'TITLE', { type: 'str', value: 'O que fazer?' }),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_gk_rpg_option':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:rpgOption',
          label: exprInput(block, 'LABEL', { type: 'str', value: 'Opção' }),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_gk_rpg_save':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:rpgSave' } }
    case 'sz_gk_rpg_load':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:rpgLoad' } }
    case 'sz_gk_load_tilemap':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:loadTilemap', name: f(block, 'NAME'), asset: f(block, 'IMAGE') },
      }
    case 'sz_gk_draw_tilemap':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:drawTilemap', name: f(block, 'MAP'), layer: f(block, 'LAYER') },
      }
    case 'sz_gk_tilemap_solid':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:tilemapSolid', name: f(block, 'MAP') } }
    case 'sz_gk_draw_shadow':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:drawShadow', charVar: f(block, 'CHAR') } }
    case 'sz_gk_draw_by_depth':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:drawByDepth', charVar: f(block, 'CHAR') } }
    case 'sz_gk_camera_shake':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:cameraShake',
          intensity: exprInput(block, 'INT', { type: 'num', value: 8 }),
          seconds: exprInput(block, 'SEC', { type: 'num', value: 0.3 }),
        },
      }
    case 'sz_gk_apply_gravity':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:applyGravity',
          charVar: f(block, 'WHO'),
          g: exprInput(block, 'G', { type: 'num', value: 2160 }),
          dtVar: f(block, 'DT'),
        },
      }
    case 'sz_gk_jump':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:jump',
          charVar: f(block, 'WHO'),
          force: exprInput(block, 'FORCE', { type: 'num', value: 660 }),
        },
      }
    case 'sz_gk_set_velocity':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:setVelocity',
          charVar: f(block, 'WHO'),
          vx: exprInput(block, 'VX', { type: 'num', value: 0 }),
          vy: exprInput(block, 'VY', { type: 'num', value: 0 }),
        },
      }
    case 'sz_gk_set_terminal_velocity':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:setTerminalVelocity',
          charVar: f(block, 'WHO'),
          max: exprInput(block, 'MAX', { type: 'num', value: 900 }),
        },
      }
    case 'sz_gk_bounce_on_edges':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:bounceOnEdges', charVar: f(block, 'WHO') } }
    case 'sz_gk_paddle_bounce':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:paddleBounce',
          ballVar: f(block, 'BALL'),
          paddleVar: f(block, 'PADDLE'),
        },
      }
    case 'sz_gk_board_create':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:boardCreate',
          name: f(block, 'NAME'),
          cols: exprInput(block, 'COLS', { type: 'num', value: 10 }),
          rows: exprInput(block, 'ROWS', { type: 'num', value: 10 }),
          empty: exprInput(block, 'EMPTY', { type: 'num', value: 0 }),
        },
      }
    case 'sz_gk_board_set':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:boardSet',
          name: f(block, 'NAME'),
          value: exprInput(block, 'VALUE', { type: 'num', value: 1 }),
          col: exprInput(block, 'COL', { type: 'num', value: 0 }),
          row: exprInput(block, 'ROW', { type: 'num', value: 0 }),
        },
      }
    case 'sz_gk_players_setup':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:playersSetup', n: exprInput(block, 'N', { type: 'num', value: 2 }) },
      }
    case 'sz_gk_next_player':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:nextPlayer' } }
    case 'sz_gk_on_turn_change':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:onTurnChange', body: getStatementChildren(block, 'BODY', seen) },
      }
    case 'sz_gk_move_along_track':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:moveAlongTrack',
          who: f(block, 'WHO'),
          spaces: exprInput(block, 'SPACES', { type: 'num', value: 1 }),
          path: f(block, 'PATH'),
        },
      }
    case 'sz_gk_on_land_space':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:onLandSpace', body: getStatementChildren(block, 'BODY', seen) },
      }
    case 'sz_gk_pile_move_top':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:pileMoveTop', fromVar: f(block, 'FROM'), toVar: f(block, 'TO') },
      }
    case 'sz_gk_pile_shuffle_from':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:pileShuffleFrom',
          deckVar: f(block, 'DECK'),
          discardVar: f(block, 'DISCARD'),
        },
      }
    case 'sz_gk_card_flip':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:cardFlip', card: exprInput(block, 'CARD', { type: 'num', value: 0 }) },
      }
    case 'sz_gk_hand_draw':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:handDraw',
          pileVar: f(block, 'PILE'),
          x: exprInput(block, 'X', { type: 'num', value: 60 }),
          y: exprInput(block, 'Y', { type: 'num', value: 420 }),
          fan: f(block, 'FAN') === 'TRUE',
        },
      }
    case 'sz_gk_cards_start':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:cardsStart',
          heroHp: exprInput(block, 'HERO_HP', { type: 'num', value: 30 }),
          enemyHp: exprInput(block, 'ENEMY_HP', { type: 'num', value: 40 }),
        },
      }
    case 'sz_gk_cards_energy_per_turn':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:cardsEnergyPerTurn',
          n: exprInput(block, 'N', { type: 'num', value: 3 }),
        },
      }
    case 'sz_gk_cards_spend':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:cardsSpend', n: exprInput(block, 'N', { type: 'num', value: 1 }) },
      }
    case 'sz_gk_cards_on_turn':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:cardsOnTurn', body: getStatementChildren(block, 'BODY', seen) },
      }
    case 'sz_gk_cards_end_turn':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:cardsEndTurn' } }
    case 'sz_gk_cards_draw_hud':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:cardsDrawHud' } }
    case 'sz_gk_cards_hurt_enemy':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:cardsHurtEnemy', n: exprInput(block, 'N', { type: 'num', value: 6 }) },
      }
    case 'sz_gk_cards_hurt_me':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:cardsHurtMe', n: exprInput(block, 'N', { type: 'num', value: 6 }) },
      }
    case 'sz_gk_cards_gain_block':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:cardsGainBlock', n: exprInput(block, 'N', { type: 'num', value: 5 }) },
      }
    case 'sz_gk_cards_enemy_intent':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:cardsEnemyIntent',
          action: f(block, 'ACTION'),
          value: exprInput(block, 'VALUE', { type: 'num', value: 6 }),
        },
      }
    case 'sz_gk_cards_on_enemy_turn':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:cardsOnEnemyTurn', body: getStatementChildren(block, 'BODY', seen) },
      }
    case 'sz_gk_wrap_edges':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:wrapEdges', charVar: f(block, 'WHO') } }
    case 'sz_gk_collide_tilemap':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:collideTilemap', charVar: f(block, 'WHO'), map: f(block, 'MAP') },
      }
    case 'sz_gk_collide_group':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:collideGroup', charVar: f(block, 'WHO'), mold: f(block, 'MOLD') },
      }
    case 'sz_gk_overlap_groups':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:overlapGroups',
          aName: f(block, 'A_NAME'),
          moldA: f(block, 'MOLD_A'),
          bName: f(block, 'B_NAME'),
          moldB: f(block, 'MOLD_B'),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_gk_every_seconds':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:everySeconds',
          seconds: exprInput(block, 'SECS', { type: 'num', value: 1 }),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_gk_set_tile_size':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:setTileSize', px: exprInput(block, 'PX', { type: 'num', value: 64 }) },
      }
    case 'sz_gk_set_tile_at':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:setTileAt',
          map: f(block, 'MAP'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          index: exprInput(block, 'INDEX', { type: 'num', value: 0 }),
        },
      }
    case 'sz_gk_break_tile_at':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:breakTileAt', map: f(block, 'MAP'), charVar: f(block, 'WHO') },
      }
    case 'sz_gk_set_property':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:setProperty',
          charVar: f(block, 'WHO'),
          prop: f(block, 'PROP'),
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_gk_set_facing':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:setFacingDir', charVar: f(block, 'WHO'), dir: f(block, 'DIR') },
      }
    // 🏃 Kit Plataforma
    case 'sz_gk_plat_hero':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:platformerHero',
          charVar: f(block, 'WHO'),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 240 }),
          force: exprInput(block, 'JUMP', { type: 'num', value: 660 }),
          dtVar: f(block, 'DT'),
        },
      }
    case 'sz_gk_plat_jump_feel':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:setJumpFeel',
          coyote: exprInput(block, 'COYOTE', { type: 'num', value: 0.1 }),
          buffer: exprInput(block, 'BUFFER', { type: 'num', value: 0.1 }),
          hold: exprInput(block, 'HOLD', { type: 'num', value: 0.3 }),
          gravity: exprInput(block, 'GRAVITY', { type: 'num', value: 2160 }),
        },
      }
    case 'sz_gk_plat_double_jump':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:doubleJump',
          charVar: f(block, 'WHO'),
          force: exprInput(block, 'FORCE', { type: 'num', value: 600 }),
          times: exprInput(block, 'TIMES', { type: 'num', value: 1 }),
        },
      }
    case 'sz_gk_plat_wall_slide':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:wallSlide',
          charVar: f(block, 'WHO'),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 90 }),
        },
      }
    case 'sz_gk_plat_wall_jump':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:wallJump',
          charVar: f(block, 'WHO'),
          forceX: exprInput(block, 'FX', { type: 'num', value: 300 }),
          forceY: exprInput(block, 'FY', { type: 'num', value: 660 }),
        },
      }
    case 'sz_gk_plat_ladder':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:climbLadder',
          charVar: f(block, 'WHO'),
          map: f(block, 'MAP'),
          tile: exprInput(block, 'TILE', { type: 'num', value: 2 }),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 160 }),
        },
      }
    case 'sz_gk_plat_one_way':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:oneWayPlatform',
          charVar: f(block, 'WHO'),
          mold: f(block, 'MOLD'),
          dtVar: f(block, 'DT'),
        },
      }
    case 'sz_gk_plat_drop_through':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:dropThrough', charVar: f(block, 'WHO') } }
    case 'sz_gk_plat_moving':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:movingPlatform',
          charVar: f(block, 'WHO'),
          x1: exprInput(block, 'X1', { type: 'num', value: 100 }),
          y1: exprInput(block, 'Y1', { type: 'num', value: 300 }),
          x2: exprInput(block, 'X2', { type: 'num', value: 400 }),
          y2: exprInput(block, 'Y2', { type: 'num', value: 300 }),
          seconds: exprInput(block, 'SECS', { type: 'num', value: 2 }),
          dtVar: f(block, 'DT'),
        },
      }
    case 'sz_gk_plat_ride_on':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:rideOn', charVar: f(block, 'WHO'), mold: f(block, 'MOLD') },
      }
    case 'sz_gk_plat_stomp':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:stompKill',
          charVar: f(block, 'WHO'),
          mold: f(block, 'MOLD'),
          bounce: exprInput(block, 'BOUNCE', { type: 'num', value: 400 }),
        },
      }
    case 'sz_gk_plat_patrol_wall':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:patrolTurnAtWall',
          charVar: f(block, 'WHO'),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 60 }),
        },
      }
    case 'sz_gk_plat_checkpoint':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:setCheckpoint',
          x: exprInput(block, 'X', { type: 'num', value: 100 }),
          y: exprInput(block, 'Y', { type: 'num', value: 100 }),
        },
      }
    case 'sz_gk_plat_respawn':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:respawn', charVar: f(block, 'WHO') } }
    case 'sz_gk_plat_state_frames':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:platStateFrames',
          charVar: f(block, 'WHO'),
          state: f(block, 'STATE'),
          from: exprInput(block, 'FROM', { type: 'num', value: 0 }),
          to: exprInput(block, 'TO', { type: 'num', value: 3 }),
          fps: exprInput(block, 'FPS', { type: 'num', value: 8 }),
        },
      }
    case 'sz_gk_plat_anim':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:platformerAnim', charVar: f(block, 'WHO') } }
    // 👾 R16 — Kit Monstrinhos
    case 'sz_gk_pkm_creature':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:pkmCreature',
          name: f(block, 'NAME'),
          creatureType: f(block, 'TYPE'),
          hp: exprInput(block, 'HP', { type: 'num', value: 30 }),
          str: exprInput(block, 'STR', { type: 'num', value: 8 }),
          def: exprInput(block, 'DEF', { type: 'num', value: 4 }),
          spd: exprInput(block, 'SPD', { type: 'num', value: 5 }),
          image: f(block, 'IMAGE'),
          look: f(block, 'LOOK'),
        },
      }
    case 'sz_gk_pkm_move':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:pkmMove',
          move: f(block, 'MOVE'),
          creature: f(block, 'CREATURE'),
          moveType: f(block, 'TYPE'),
          dmg: exprInput(block, 'DMG', { type: 'num', value: 20 }),
          acc: exprInput(block, 'ACC', { type: 'num', value: 100 }),
          fx: f(block, 'FX'),
          color: f(block, 'COLOR'),
        },
      }
    case 'sz_gk_pkm_type_chart':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:pkmTypeChart',
          atk: f(block, 'A'),
          def: f(block, 'B'),
          mult: exprInput(block, 'MULT', { type: 'num', value: 2 }),
        },
      }
    case 'sz_gk_pkm_evolve':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:pkmEvolve',
          from: f(block, 'FROM'),
          to: f(block, 'TO'),
          level: exprInput(block, 'LEVEL', { type: 'num', value: 8 }),
        },
      }
    case 'sz_gk_pkm_catch_difficulty':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:pkmCatchDifficulty',
          creature: f(block, 'NAME'),
          level: f(block, 'LEVEL'),
        },
      }
    case 'sz_gk_pkm_give':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:pkmGive',
          creature: f(block, 'CREATURE'),
          level: exprInput(block, 'LEVEL', { type: 'num', value: 5 }),
        },
      }
    case 'sz_gk_pkm_give_ball':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:pkmGiveBall',
          count: exprInput(block, 'COUNT', { type: 'num', value: 5 }),
          power: exprInput(block, 'POWER', { type: 'num', value: 60 }),
        },
      }
    case 'sz_gk_pkm_heal_team':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:pkmHealTeam' } }
    case 'sz_gk_pkm_draw_team':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:pkmDrawTeam',
          x: exprInput(block, 'X', { type: 'num', value: 10 }),
          y: exprInput(block, 'Y', { type: 'num', value: 10 }),
        },
      }
    case 'sz_gk_pkm_grass_cells':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:pkmGrassCells',
          x1: exprInput(block, 'X1', { type: 'num', value: 5 }),
          y1: exprInput(block, 'Y1', { type: 'num', value: 6 }),
          x2: exprInput(block, 'X2', { type: 'num', value: 13 }),
          y2: exprInput(block, 'Y2', { type: 'num', value: 10 }),
        },
      }
    case 'sz_gk_pkm_grass_tiles':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:pkmGrassTiles',
          index: exprInput(block, 'INDEX', { type: 'num', value: 3 }),
          map: f(block, 'MAP'),
        },
      }
    case 'sz_gk_pkm_wild':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:pkmWild',
          creature: f(block, 'CREATURE'),
          min: exprInput(block, 'MIN', { type: 'num', value: 3 }),
          max: exprInput(block, 'MAX', { type: 'num', value: 6 }),
        },
      }
    case 'sz_gk_pkm_encounter_rate':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:pkmEncounterRate',
          percent: exprInput(block, 'PCT', { type: 'num', value: 20 }),
        },
      }
    case 'sz_gk_pkm_battle_wild':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:pkmBattleWild',
          creature: f(block, 'CREATURE'),
          level: exprInput(block, 'LEVEL', { type: 'num', value: 5 }),
        },
      }
    case 'sz_gk_pkm_battle_trainer':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:pkmBattleTrainer',
          name: f(block, 'NAME'),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_gk_pkm_trainer_creature':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:pkmTrainerCreature',
          creature: f(block, 'CREATURE'),
          level: exprInput(block, 'LEVEL', { type: 'num', value: 5 }),
        },
      }
    // 🧭 R15 — primitivos gerais
    case 'sz_gk_define_region':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:defineRegion',
          name: f(block, 'NAME'),
          x: exprInput(block, 'X', { type: 'num', value: 100 }),
          y: exprInput(block, 'Y', { type: 'num', value: 100 }),
          w: exprInput(block, 'W', { type: 'num', value: 200 }),
          h: exprInput(block, 'H', { type: 'num', value: 200 }),
        },
      }
    case 'sz_gk_launch_to_point':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:launchToPoint',
          charVar: f(block, 'WHO'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 400 }),
        },
      }
    case 'sz_gk_set_velocity_angle':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:setVelocityAngle',
          charVar: f(block, 'WHO'),
          degrees: exprInput(block, 'DEG', { type: 'num', value: 0 }),
          force: exprInput(block, 'FORCE', { type: 'num', value: 200 }),
        },
      }
    // R21 — primitivos gerais
    case 'sz_gk_float_text':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:floatText',
          text: exprInput(block, 'TEXT', { type: 'str', value: '+100' }),
          x: exprInput(block, 'X', { type: 'num', value: 100 }),
          y: exprInput(block, 'Y', { type: 'num', value: 100 }),
          color: f(block, 'COLOR') || '#ffffff',
          size: exprInput(block, 'SIZE', { type: 'num', value: 24 }),
        },
      }
    case 'sz_gk_trail_on':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:trailOn',
          charVar: f(block, 'WHO'),
          color: f(block, 'COLOR') || '#ffffff',
          size: exprInput(block, 'SIZE', { type: 'num', value: 3 }),
          rate: exprInput(block, 'RATE', { type: 'num', value: 30 }),
          life: exprInput(block, 'LIFE', { type: 'num', value: 0.4 }),
        },
      }
    case 'sz_gk_trail_off':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:trailOff', charVar: f(block, 'WHO') } }
    case 'sz_gk_shockwave':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:shockwave',
          x: exprInput(block, 'X', { type: 'num', value: 100 }),
          y: exprInput(block, 'Y', { type: 'num', value: 100 }),
          radius: exprInput(block, 'RADIUS', { type: 'num', value: 200 }),
          seconds: exprInput(block, 'SECS', { type: 'num', value: 0.4 }),
          color: f(block, 'COLOR') || '#ffffff',
        },
      }
    case 'sz_gk_scroll_image':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:scrollImage',
          image: f(block, 'IMAGE'),
          vx: exprInput(block, 'VX', { type: 'num', value: 0 }),
          vy: exprInput(block, 'VY', { type: 'num', value: 20 }),
        },
      }
    case 'sz_gk_lean_on_move':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:leanOnMove',
          charVar: f(block, 'WHO'),
          degrees: exprInput(block, 'DEG', { type: 'num', value: 10 }),
        },
      }
    case 'sz_gk_fan_shot':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:fanShot',
          charVar: f(block, 'WHO'),
          mold: f(block, 'MOLD'),
          count: exprInput(block, 'COUNT', { type: 'num', value: 3 }),
          arc: exprInput(block, 'ARC', { type: 'num', value: 30 }),
          degrees: exprInput(block, 'DEG', { type: 'num', value: -90 }),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 600 }),
        },
      }
    // 🚀 R22 — Kit Nave
    case 'sz_gk_nave_ship':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:naveShip',
          charVar: f(block, 'WHO'),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 420 }),
          lean: exprInput(block, 'LEAN', { type: 'num', value: 10 }),
          dtVar: f(block, 'DT') || 'dt',
        },
      }
    case 'sz_gk_nave_powerup':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:navePowerup',
          charVar: f(block, 'WHO'),
          power: f(block, 'POWER') || 'metralhadora',
          seconds: exprInput(block, 'SECS', { type: 'num', value: 5 }),
        },
      }
    case 'sz_gk_nave_wave':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:naveWave',
          mold: f(block, 'MOLD'),
          cols: exprInput(block, 'COLS', { type: 'num', value: 8 }),
          rows: exprInput(block, 'ROWS', { type: 'num', value: 3 }),
          gap: exprInput(block, 'GAP', { type: 'num', value: 60 }),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 150 }),
          drop: exprInput(block, 'DROP', { type: 'num', value: 30 }),
          accel: exprInput(block, 'ACCEL', { type: 'num', value: 15 }),
        },
      }
    case 'sz_gk_nave_wave_shooter':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:naveWaveShooter',
          mold: f(block, 'MOLD'),
          seconds: exprInput(block, 'SECS', { type: 'num', value: 1.5 }),
          bullet: f(block, 'BULLET'),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 300 }),
        },
      }
    case 'sz_gk_nave_invasion_line':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:naveInvasionLine',
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
        },
      }
    case 'sz_gk_nave_starfield':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:naveStarfield',
          count: exprInput(block, 'COUNT', { type: 'num', value: 100 }),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 20 }),
        },
      }
    case 'sz_gk_nave_bomb':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:naveBomb',
          mold: f(block, 'MOLD'),
          radius: exprInput(block, 'RADIUS', { type: 'num', value: 200 }),
          target: f(block, 'TARGET'),
        },
      }
    // 🛤️ R25 — caminhos + paralaxe + explosão por folha
    case 'sz_gk_define_path':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:definePath',
          name: f(block, 'NAME'),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_gk_path_point':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:pathPoint',
          x: exprInput(block, 'X', { type: 'num', value: 100 }),
          y: exprInput(block, 'Y', { type: 'num', value: 100 }),
        },
      }
    case 'sz_gk_follow_path':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:followPath',
          charVar: f(block, 'WHO'),
          path: f(block, 'PATH'),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 120 }),
          dtVar: f(block, 'DT') || 'dt',
        },
      }
    case 'sz_gk_parallax_layer':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:parallaxLayer',
          image: f(block, 'IMAGE'),
          fx: exprInput(block, 'FX', { type: 'num', value: 0.3 }),
          fy: exprInput(block, 'FY', { type: 'num', value: 1 }),
        },
      }
    case 'sz_gk_sheet_burst':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:sheetBurst',
          image: f(block, 'IMAGE'),
          frames: exprInput(block, 'FRAMES', { type: 'num', value: 4 }),
          fps: exprInput(block, 'FPS', { type: 'num', value: 12 }),
          x: exprInput(block, 'X', { type: 'num', value: 100 }),
          y: exprInput(block, 'Y', { type: 'num', value: 100 }),
          size: exprInput(block, 'SIZE', { type: 'num', value: 64 }),
        },
      }
    // 🏰 R26 — Kit Defesa de Torre
    case 'sz_gk_td_wave':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:tdWave',
          path: f(block, 'PATH'),
          count: exprInput(block, 'COUNT', { type: 'num', value: 3 }),
          mold: f(block, 'MOLD'),
          gap: exprInput(block, 'GAP', { type: 'num', value: 150 }),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 90 }),
        },
      }
    case 'sz_gk_td_slot':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:tdSlot',
          x: exprInput(block, 'X', { type: 'num', value: 100 }),
          y: exprInput(block, 'Y', { type: 'num', value: 100 }),
          size: exprInput(block, 'SIZE', { type: 'num', value: 64 }),
        },
      }
    case 'sz_gk_td_draw_slots':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:tdDrawSlots' } }
    case 'sz_gk_td_on_buy':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:tdOnBuy',
          cost: exprInput(block, 'COST', { type: 'num', value: 50 }),
          xName: f(block, 'PX') || 'lugarX',
          yName: f(block, 'PY') || 'lugarY',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_gk_td_free_slot':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:tdFreeSlot',
          x: exprInput(block, 'X', { type: 'num', value: 100 }),
          y: exprInput(block, 'Y', { type: 'num', value: 100 }),
        },
      }
    case 'sz_gk_td_draw_range':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:tdDrawRange',
          charVar: f(block, 'WHO'),
          radius: exprInput(block, 'RADIUS', { type: 'num', value: 220 }),
        },
      }
    case 'sz_gk_td_set_coins':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:tdSetCoins', n: exprInput(block, 'N', { type: 'num', value: 100 }) },
      }
    case 'sz_gk_td_add_coins':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:tdAddCoins', n: exprInput(block, 'N', { type: 'num', value: 25 }) },
      }
    case 'sz_gk_set_opacity':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:setOpacity',
          charVar: f(block, 'WHO'),
          percent: exprInput(block, 'PCT', { type: 'num', value: 100 }),
        },
      }
    case 'sz_gk_fade_to':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:fadeTo',
          charVar: f(block, 'WHO'),
          percent: exprInput(block, 'PCT', { type: 'num', value: 0 }),
          seconds: exprInput(block, 'SECS', { type: 'num', value: 0.5 }),
        },
      }
    case 'sz_gk_tween_property':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:tweenProperty',
          charVar: f(block, 'WHO'),
          prop: f(block, 'PROP'),
          to: exprInput(block, 'TO', { type: 'num', value: 100 }),
          seconds: exprInput(block, 'SECS', { type: 'num', value: 0.5 }),
        },
      }
    case 'sz_gk_luta_match':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:lutaMatch',
          p1Var: f(block, 'P1'),
          p2Var: f(block, 'P2'),
          rounds: exprInput(block, 'ROUNDS', { type: 'num', value: 3 }),
          seconds: exprInput(block, 'SECS', { type: 'num', value: 60 }),
        },
      }
    case 'sz_gk_luta_draw_hud':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:lutaDrawHud' } }
    case 'sz_gk_luta_fighter':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:lutaFighter',
          charVar: f(block, 'WHO'),
          left: f(block, 'LEFT'),
          right: f(block, 'RIGHT'),
          jump: f(block, 'JUMP'),
          crouch: f(block, 'CROUCH'),
          guard: f(block, 'GUARD'),
          dtVar: f(block, 'DT'),
        },
      }
    case 'sz_gk_luta_ai':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:lutaAI', charVar: f(block, 'WHO'), level: f(block, 'LEVEL') },
      }
    case 'sz_gk_luta_move':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:lutaMove',
          name: f(block, 'NAME'),
          charVar: f(block, 'WHO'),
          speed: f(block, 'SPEED'),
          damage: exprInput(block, 'DMG', { type: 'num', value: 10 }),
          range: exprInput(block, 'RANGE', { type: 'num', value: 50 }),
          pierce: f(block, 'PIERCE') === 'TRUE',
          special: f(block, 'SPECIAL') === 'TRUE',
        },
      }
    case 'sz_gk_luta_move_anim':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:lutaMoveAnim',
          name: f(block, 'NAME'),
          charVar: f(block, 'WHO'),
          from: exprInput(block, 'FROM', { type: 'num', value: 0 }),
          to: exprInput(block, 'TO', { type: 'num', value: 3 }),
        },
      }
    case 'sz_gk_luta_attack':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:lutaAttack', charVar: f(block, 'WHO'), move: f(block, 'MOVE') },
      }
    case 'sz_gk_swing_window':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:setSwingWindow',
          charVar: f(block, 'WHO'),
          start: exprInput(block, 'START', { type: 'num', value: 0 }),
          active: exprInput(block, 'ACTIVE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_gk_play_anim_once':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:playAnimOnce',
          charVar: f(block, 'WHO'),
          from: exprInput(block, 'FROM', { type: 'num', value: 0 }),
          to: exprInput(block, 'TO', { type: 'num', value: 3 }),
          fps: exprInput(block, 'FPS', { type: 'num', value: 10 }),
        },
      }
    case 'sz_gk_set_entity_state':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:setEntityState',
          charVar: f(block, 'WHO'),
          state: f(block, 'STATE'),
          seconds: exprInput(block, 'SECS', { type: 'num', value: 0.3 }),
        },
      }
    case 'sz_gk_state_anim':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:stateAnim',
          charVar: f(block, 'WHO'),
          state: f(block, 'STATE'),
          from: exprInput(block, 'FROM', { type: 'num', value: 0 }),
          to: exprInput(block, 'TO', { type: 'num', value: 3 }),
          fps: exprInput(block, 'FPS', { type: 'num', value: 8 }),
          once: f(block, 'ONCE') === 'TRUE',
        },
      }
    case 'sz_gk_state_look':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:stateLook',
          charVar: f(block, 'WHO'),
          state: f(block, 'STATE'),
          look: f(block, 'LOOK'),
        },
      }
    case 'sz_gk_auto_animate':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:autoAnimate', charVar: f(block, 'WHO') } }
    case 'sz_gk_thrust':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:thrust',
          charVar: f(block, 'WHO'),
          degrees: exprInput(block, 'DEG', { type: 'num', value: 0 }),
          force: exprInput(block, 'FORCE', { type: 'num', value: 6000 }),
        },
      }
    case 'sz_gk_apply_friction':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:applyFriction',
          charVar: f(block, 'WHO'),
          factor: exprInput(block, 'FACTOR', { type: 'num', value: 0.9 }),
          dtVar: f(block, 'DT'),
        },
      }
    case 'sz_gk_wait':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:waitThen',
          seconds: exprInput(block, 'SECS', { type: 'num', value: 1 }),
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_gk_set_hitbox':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:setHitbox',
          charVar: f(block, 'WHO'),
          ox: exprInput(block, 'OX', { type: 'num', value: 0 }),
          oy: exprInput(block, 'OY', { type: 'num', value: 0 }),
          w: exprInput(block, 'W', { type: 'num', value: 0 }),
          h: exprInput(block, 'H', { type: 'num', value: 0 }),
        },
      }
    case 'sz_gk_fade_screen':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:fadeScreen',
          color: f(block, 'COLOR'),
          seconds: exprInput(block, 'SECS', { type: 'num', value: 0.4 }),
          toDark: f(block, 'DIR') === 'escurecer',
        },
      }
    case 'sz_gk_flash_screen':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:flashScreen',
          color: f(block, 'COLOR'),
          times: exprInput(block, 'TIMES', { type: 'num', value: 3 }),
        },
      }
    case 'sz_gk_save_value':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:saveValue',
          name: f(block, 'NAME'),
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_gk_play_music':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:playMusic', sound: f(block, 'SOUND') } }
    case 'sz_gk_stop_sound':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:stopSound', sound: f(block, 'SOUND') } }
    case 'sz_gk_set_volume':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:setVolume',
          sound: f(block, 'SOUND'),
          level: exprInput(block, 'LEVEL', { type: 'num', value: 1 }),
        },
      }
    case 'sz_gk_create_empty_tilemap':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:createEmptyTilemap',
          name: f(block, 'NAME'),
          cols: exprInput(block, 'COLS', { type: 'num', value: 20 }),
          rows: exprInput(block, 'ROWS', { type: 'num', value: 15 }),
          fill: exprInput(block, 'FILL', { type: 'num', value: -1 }),
          asset: f(block, 'ASSET'),
        },
      }
    case 'sz_gk_move_with_custom_keys':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:moveWithCustomKeys',
          charVar: f(block, 'WHO'),
          up: f(block, 'UP'),
          down: f(block, 'DOWN'),
          left: f(block, 'LEFT'),
          right: f(block, 'RIGHT'),
          dtVar: f(block, 'DT'),
        },
      }
    case 'sz_gk_tween_to':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:tweenTo',
          charVar: f(block, 'WHO'),
          x: exprInput(block, 'X', { type: 'num', value: 100 }),
          y: exprInput(block, 'Y', { type: 'num', value: 100 }),
          seconds: exprInput(block, 'SECS', { type: 'num', value: 0.5 }),
        },
      }
    case 'sz_gk_attack_facing':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:attackFacing',
          charVar: f(block, 'WHO'),
          range: exprInput(block, 'RANGE', { type: 'num', value: 40 }),
          duration: exprInput(block, 'DUR', { type: 'num', value: 0.3 }),
        },
      }
    case 'sz_gk_patrol_around':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:patrolAround',
          charVar: f(block, 'WHO'),
          ox: exprInput(block, 'OX', { type: 'num', value: 400 }),
          oy: exprInput(block, 'OY', { type: 'num', value: 300 }),
          radius: exprInput(block, 'RADIUS', { type: 'num', value: 80 }),
        },
      }
    case 'sz_gk_draw_hearts':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:drawHearts',
          current: exprInput(block, 'CUR', { type: 'num', value: 3 }),
          max: exprInput(block, 'MAX', { type: 'num', value: 3 }),
          x: exprInput(block, 'X', { type: 'num', value: 20 }),
          y: exprInput(block, 'Y', { type: 'num', value: 20 }),
        },
      }
    case 'sz_gk_draw_background':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:drawBackground',
          color: f(block, 'COLOR') || '#0f3460',
          grid: f(block, 'GRID') === 'TRUE',
        },
      }
    case 'sz_gk_create_character':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:createCharacter',
          varName: f(block, 'NAME'),
          image: f(block, 'IMAGE'),
          w: exprInput(block, 'W', { type: 'num', value: 64 }),
          h: exprInput(block, 'H', { type: 'num', value: 64 }),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 300 }),
          color: f(block, 'COLOR') || '#4a9eff',
        },
      }
    case 'sz_gk_move_with_keys':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:moveWithKeys',
          charVar: f(block, 'CHAR'),
          dtVar: f(block, 'DT') || 'dt',
        },
      }
    case 'sz_gk_keep_on_screen':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:keepOnScreen', charVar: f(block, 'CHAR') } }
    case 'sz_gk_draw_character':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:drawCharacter', charVar: f(block, 'CHAR') } }
    case 'sz_gk_place_character':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:placeCharacter',
          charVar: f(block, 'CHAR'),
          x: exprInput(block, 'X', { type: 'num', value: 100 }),
          y: exprInput(block, 'Y', { type: 'num', value: 100 }),
        },
      }
    case 'sz_gk_reset_character':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:resetCharacter', charVar: f(block, 'CHAR') } }
    case 'sz_gk_set_speed_multiplier':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:setSpeedMultiplier',
          charVar: f(block, 'CHAR'),
          factor: exprInput(block, 'FACTOR', { type: 'num', value: 2 }),
        },
      }
    case 'sz_gk_set_pause_key':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:setPauseKey', key: f(block, 'KEY') || 'Escape' } }
    // ----- game-2d-advanced P24 -----
    case 'sz_gk_on_event':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:onEvent',
          event: f(block, 'NAME'),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_gk_emit':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:emit', event: f(block, 'NAME') } }
    case 'sz_gk_define_mold':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:defineMold',
          name: f(block, 'NAME'),
          w: exprInput(block, 'W', { type: 'num', value: 40 }),
          h: exprInput(block, 'H', { type: 'num', value: 40 }),
          health: exprInput(block, 'HEALTH', { type: 'num', value: 20 }),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 120 }),
          damage: exprInput(block, 'DAMAGE', { type: 'num', value: 10 }),
          color: f(block, 'COLOR') || '#e94f4f',
          image: f(block, 'IMAGE'),
          look: f(block, 'LOOK'),
        },
      }
    case 'sz_gk_spawn_from_mold':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:spawnFromMold',
          mold: f(block, 'MOLD'),
          x: exprInput(block, 'X', { type: 'num', value: 100 }),
          y: exprInput(block, 'Y', { type: 'num', value: 100 }),
        },
      }
    case 'sz_gk_start_spawner':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:startSpawner',
          mold: f(block, 'MOLD'),
          seconds: exprInput(block, 'SEC', { type: 'num', value: 1.5 }),
        },
      }
    case 'sz_gk_stop_spawner':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:stopSpawner', mold: f(block, 'MOLD') } }
    case 'sz_gk_spawn_named':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:spawnNamed',
          varName: f(block, 'NAME'),
          mold: f(block, 'MOLD'),
          x: exprInput(block, 'X', { type: 'num', value: 100 }),
          y: exprInput(block, 'Y', { type: 'num', value: 100 }),
        },
      }
    case 'sz_gk_for_each_active':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:forEachActive',
          mold: f(block, 'MOLD'),
          itemName: f(block, 'ITEM') || 'item',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_gk_cull_offscreen':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:cullOffscreen',
          mold: f(block, 'MOLD'),
          margin: exprInput(block, 'MARGIN', { type: 'num', value: 120 }),
        },
      }
    case 'sz_gk_recycle':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:recycle', charVar: f(block, 'WHO') } }
    case 'sz_gk_draw_active':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:drawActive', mold: f(block, 'MOLD') } }
    case 'sz_gk_define_look':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:defineLook',
          name: f(block, 'NAME'),
          ctxName: f(block, 'CTX') || 'ctx',
          baseW: exprInput(block, 'W', { type: 'num', value: 40 }),
          baseH: exprInput(block, 'H', { type: 'num', value: 40 }),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_gk_draw_look':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:drawLook',
          look: f(block, 'LOOK'),
          x: exprInput(block, 'X', { type: 'num', value: 100 }),
          y: exprInput(block, 'Y', { type: 'num', value: 100 }),
          w: exprInput(block, 'W', { type: 'num', value: 40 }),
          h: exprInput(block, 'H', { type: 'num', value: 40 }),
        },
      }
    case 'sz_gk_seek':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:seek',
          charVar: f(block, 'WHO'),
          targetVar: f(block, 'TARGET'),
          dtVar: f(block, 'DT') || 'dt',
        },
      }
    case 'sz_gk_drift':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:drift', charVar: f(block, 'WHO'), dtVar: f(block, 'DT') || 'dt' },
      }
    case 'sz_gk_face':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:face', charVar: f(block, 'WHO'), targetVar: f(block, 'TARGET') },
      }
    case 'sz_gk_hurt':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:hurt',
          charVar: f(block, 'WHO'),
          amount: exprInput(block, 'AMOUNT', { type: 'num', value: 10 }),
          iframes: exprInput(block, 'IFRAMES', { type: 'num', value: 1 }),
        },
      }
    case 'sz_gk_knockback':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:knockback',
          charVar: f(block, 'WHO'),
          fromVar: f(block, 'FROM'),
          force: exprInput(block, 'FORCE', { type: 'num', value: 400 }),
        },
      }
    case 'sz_gk_draw_health_bar':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:drawHealthBar',
          charVar: f(block, 'WHO'),
          max: exprInput(block, 'MAX', { type: 'num', value: 100 }),
        },
      }
    case 'sz_gk_set_mission':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:setMission',
          seconds: exprInput(block, 'SEC', { type: 'num', value: 30 }),
          killCount: exprInput(block, 'KILLS', { type: 'num', value: 10 }),
        },
      }
    case 'sz_gk_mission_kill':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:missionKill' } }
    case 'sz_gk_draw_timer':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:drawTimer',
          x: exprInput(block, 'X', { type: 'num', value: 20 }),
          y: exprInput(block, 'Y', { type: 'num', value: 40 }),
        },
      }
    case 'sz_gk_define_effect':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:defineEffect',
          name: f(block, 'NAME'),
          count: exprInput(block, 'COUNT', { type: 'num', value: 16 }),
          color: f(block, 'COLOR') || '#ffd166',
          size: exprInput(block, 'SIZE', { type: 'num', value: 4 }),
          life: exprInput(block, 'LIFE', { type: 'num', value: 0.6 }),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 200 }),
          gravity: exprInput(block, 'GRAVITY', { type: 'num', value: 300 }),
        },
      }
    case 'sz_gk_burst':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:burst',
          effect: f(block, 'EFFECT'),
          x: exprInput(block, 'X', { type: 'num', value: 100 }),
          y: exprInput(block, 'Y', { type: 'num', value: 100 }),
        },
      }
    case 'sz_gk_draw_effects':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:drawEffects' } }
    case 'sz_gk_load_sound':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: { type: 'gk:loadSound', name: f(block, 'NAME'), asset: f(block, 'SOUND') },
      }
    case 'sz_gk_play_sound':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:playSound', name: f(block, 'NAME') } }
    case 'sz_gk_play_effect':
      seen.add('game-2d-advanced')
      return { kind: 'js', value: { type: 'gk:playEffect', fx: f(block, 'FX') || 'hit' } }
    case 'sz_gk_play_tone':
      seen.add('game-2d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'gk:playTone',
          freq: exprInput(block, 'FREQ', { type: 'num', value: 440 }),
          ms: exprInput(block, 'MS', { type: 'num', value: 200 }),
        },
      }

    // ---- Jogo 3D Avançado (game-3d-advanced) ----
    case 'sz_g3k_setup':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:setup',
          w: exprInput(block, 'W', { type: 'num', value: 1280 }),
          h: exprInput(block, 'H', { type: 'num', value: 720 }),
          world: exprInput(block, 'SIZE', { type: 'num', value: 80 }),
          sky: f(block, 'SKY') || '#0b1026',
          ground: f(block, 'GROUND') || '#14532d',
        },
      }
    case 'sz_g3k_set_effects':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:setEffects',
          shadows: f(block, 'SHADOWS') === 'TRUE',
          bloom: f(block, 'BLOOM') === 'TRUE',
          strength: exprInput(block, 'STRENGTH', { type: 'num', value: 1.2 }),
          vignette: f(block, 'VIGNETTE') === 'TRUE',
        },
      }
    case 'sz_g3k_scatter_decor':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:scatterDecor',
          count: exprInput(block, 'COUNT', { type: 'num', value: 16 }),
        },
      }
    case 'sz_g3k_start':
      seen.add('game-3d-advanced')
      return { kind: 'js', value: { type: 'g3k:start' } }
    case 'sz_g3k_define_mold':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:defineMold',
          name: f(block, 'NAME'),
          health: exprInput(block, 'HEALTH', { type: 'num', value: 30 }),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 3 }),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g3k_part':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:part',
          shape: f(block, 'SHAPE') || 'box',
          material: f(block, 'MATERIAL') || 'normal',
          color: f(block, 'COLOR') || '#22d3ee',
          texture: f(block, 'TEXTURE') || '',
          model: f(block, 'MODEL') || '',
          w: exprInput(block, 'W', { type: 'num', value: 1 }),
          h: exprInput(block, 'H', { type: 'num', value: 1 }),
          d: exprInput(block, 'D', { type: 'num', value: 1 }),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0.5 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g3k_spawn':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:spawn',
          mold: f(block, 'MOLD'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g3k_spawn_named':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:spawnNamed',
          varName: f(block, 'NAME'),
          mold: f(block, 'MOLD'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g3k_spawn_from':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: { type: 'g3k:spawnFrom', mold: f(block, 'MOLD'), fromVar: f(block, 'FROM') },
      }
    case 'sz_g3k_spawn_ring':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:spawnRing',
          mold: f(block, 'MOLD'),
          count: exprInput(block, 'COUNT', { type: 'num', value: 8 }),
          fromVar: f(block, 'FROM') || 'ela',
          speed: exprInput(block, 'SPEED', { type: 'num', value: 6 }),
        },
      }
    case 'sz_g3k_start_spawner':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:startSpawner',
          mold: f(block, 'MOLD'),
          seconds: exprInput(block, 'SEC', { type: 'num', value: 2 }),
          where: f(block, 'WHERE') || 'edge',
        },
      }
    case 'sz_g3k_stop_spawner':
      seen.add('game-3d-advanced')
      return { kind: 'js', value: { type: 'g3k:stopSpawner', mold: f(block, 'MOLD') } }
    case 'sz_g3k_for_each_alive':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:forEachAlive',
          mold: f(block, 'MOLD'),
          itemName: f(block, 'ITEM') || 'item',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g3k_recycle':
      seen.add('game-3d-advanced')
      return { kind: 'js', value: { type: 'g3k:recycle', charVar: f(block, 'WHO') } }
    case 'sz_g3k_recycle_all':
      seen.add('game-3d-advanced')
      return { kind: 'js', value: { type: 'g3k:recycleAll', mold: f(block, 'MOLD') } }
    case 'sz_g3k_cull_far':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:cullFar',
          mold: f(block, 'MOLD'),
          dist: exprInput(block, 'DIST', { type: 'num', value: 60 }),
        },
      }
    case 'sz_g3k_on_update':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:onUpdate',
          dtName: f(block, 'DT') || 'dt',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g3k_move_with_keys':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:moveWithKeys',
          charVar: f(block, 'CHAR'),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 8 }),
        },
      }
    case 'sz_g3k_set_pause_key':
      seen.add('game-3d-advanced')
      return { kind: 'js', value: { type: 'g3k:setPauseKey', key: f(block, 'KEY') || 'Escape' } }
    case 'sz_g3k_camera_follow':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:cameraFollow',
          charVar: f(block, 'CHAR'),
          dist: exprInput(block, 'DIST', { type: 'num', value: 8 }),
          height: exprInput(block, 'HEIGHT', { type: 'num', value: 4 }),
        },
      }
    case 'sz_g3k_camera_orbit':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:cameraOrbit',
          dist: exprInput(block, 'DIST', { type: 'num', value: 25 }),
        },
      }
    case 'sz_g3k_camera_top':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:cameraTop',
          height: exprInput(block, 'HEIGHT', { type: 'num', value: 40 }),
        },
      }
    case 'sz_g3k_camera_angle':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:cameraAngle',
          az: exprInput(block, 'AZ', { type: 'num', value: 40 }),
          el: exprInput(block, 'EL', { type: 'num', value: 28 }),
        },
      }
    case 'sz_g3k_camera_distance':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:cameraDistance',
          dist: exprInput(block, 'DIST', { type: 'num', value: 25 }),
        },
      }
    case 'sz_g3k_camera_shake':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:cameraShake',
          strength: exprInput(block, 'STRENGTH', { type: 'num', value: 0.5 }),
          seconds: exprInput(block, 'SECONDS', { type: 'num', value: 0.3 }),
        },
      }
    case 'sz_g3k_camera_lens':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: { type: 'g3k:cameraLens', fov: exprInput(block, 'FOV', { type: 'num', value: 60 }) },
      }
    case 'sz_g3k_camera_look_at':
      seen.add('game-3d-advanced')
      return { kind: 'js', value: { type: 'g3k:cameraLookAt', charVar: f(block, 'CHAR') } }
    case 'sz_g3k_camera_look_at_point':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:cameraLookAtPoint',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g3k_camera_smooth':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:cameraSmooth',
          lambda: exprInput(block, 'LAMBDA', { type: 'num', value: 3 }),
        },
      }
    case 'sz_g3k_place':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:place',
          charVar: f(block, 'CHAR'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g3k_set_yaw':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:setYaw',
          charVar: f(block, 'CHAR'),
          degrees: exprInput(block, 'DEG', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g3k_set_velocity':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:setVelocity',
          charVar: f(block, 'CHAR'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g3k_set_drag':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:setDrag',
          charVar: f(block, 'CHAR'),
          drag: exprInput(block, 'DRAG', { type: 'num', value: 3 }),
        },
      }
    case 'sz_g3k_set_entity_value':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:setEntityValue',
          charVar: f(block, 'CHAR'),
          key: f(block, 'KEY'),
          value: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g3k_look_at':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: { type: 'g3k:lookAt', charVar: f(block, 'WHO'), targetVar: f(block, 'TARGET') },
      }
    case 'sz_g3k_move_forward':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:moveForward',
          charVar: f(block, 'WHO'),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 6 }),
        },
      }
    case 'sz_g3k_fall':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:fall',
          charVar: f(block, 'CHAR'),
          g: exprInput(block, 'G', { type: 'num', value: 20 }),
        },
      }
    case 'sz_g3k_jump':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:jump',
          charVar: f(block, 'CHAR'),
          force: exprInput(block, 'FORCE', { type: 'num', value: 9 }),
        },
      }
    case 'sz_g3k_make_solid':
      seen.add('game-3d-advanced')
      return { kind: 'js', value: { type: 'g3k:makeSolid', mold: f(block, 'MOLD') } }
    case 'sz_g3k_platformer_keys':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:platformerKeys',
          charVar: f(block, 'CHAR'),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 8 }),
          jump: exprInput(block, 'JUMP', { type: 'num', value: 9 }),
        },
      }
    case 'sz_g3k_set_collider':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:setCollider',
          mold: f(block, 'MOLD'),
          shape: f(block, 'SHAPE') || 'box',
        },
      }
    case 'sz_g3k_set_physics':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:setPhysics',
          mold: f(block, 'MOLD'),
          kind: f(block, 'KIND') || 'caixa',
        },
      }
    case 'sz_g3k_play_anim':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:playAnim',
          charVar: f(block, 'CHAR'),
          clip: f(block, 'CLIP'),
          loop: f(block, 'LOOP') !== 'ONCE',
        },
      }
    case 'sz_g3k_stop_anim':
      seen.add('game-3d-advanced')
      return { kind: 'js', value: { type: 'g3k:stopAnim', charVar: f(block, 'CHAR') } }
    case 'sz_g3k_state_anim':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:setStateAnim',
          mold: f(block, 'MOLD'),
          state: f(block, 'STATE'),
          clip: f(block, 'CLIP'),
        },
      }
    case 'sz_g3k_play_music':
      seen.add('game-3d-advanced')
      return { kind: 'js', value: { type: 'g3k:playMusic', name: f(block, 'NAME') } }
    case 'sz_g3k_stop_music':
      seen.add('game-3d-advanced')
      return { kind: 'js', value: { type: 'g3k:stopMusic' } }
    case 'sz_g3k_start_timer':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:startTimer',
          seconds: exprInput(block, 'SECONDS', { type: 'num', value: 30 }),
        },
      }
    case 'sz_g3k_stop_timer':
      seen.add('game-3d-advanced')
      return { kind: 'js', value: { type: 'g3k:stopTimer' } }
    case 'sz_g3k_on_timer_end':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: { type: 'g3k:onTimerEnd', body: getStatementChildren(block, 'BODY', seen) },
      }
    case 'sz_g3k_say':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:say',
          charVar: f(block, 'CHAR'),
          text: exprInput(block, 'TEXT', { type: 'str', value: 'Oi!' }),
          seconds: exprInput(block, 'SECONDS', { type: 'num', value: 2 }),
        },
      }
    case 'sz_g3k_hide_say':
      seen.add('game-3d-advanced')
      return { kind: 'js', value: { type: 'g3k:hideSay', charVar: f(block, 'CHAR') } }
    case 'sz_g3k_show_health_bar':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:showHealthBar',
          mold: f(block, 'MOLD'),
          on: f(block, 'ON') === 'TRUE',
        },
      }
    case 'sz_g3k_pass_through':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:passThrough',
          charVar: f(block, 'CHAR'),
          ghost: f(block, 'GHOST') === 'TRUE',
        },
      }
    case 'sz_g3k_set_seed':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: { type: 'g3k:setSeed', seed: exprInput(block, 'SEED', { type: 'num', value: 42 }) },
      }
    case 'sz_g3k_make_trigger':
      seen.add('game-3d-advanced')
      return { kind: 'js', value: { type: 'g3k:makeTrigger', mold: f(block, 'MOLD') } }
    case 'sz_g3k_on_overlap':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:onOverlap',
          mold: f(block, 'MOLD'),
          zoneName: f(block, 'ZONE') || 'zona',
          whoName: f(block, 'WHO') || 'quem',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g3k_set_bounce':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:setBounce',
          mold: f(block, 'MOLD'),
          amount: exprInput(block, 'AMOUNT', { type: 'num', value: 0.5 }),
        },
      }
    case 'sz_g3k_set_friction':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:setFriction',
          mold: f(block, 'MOLD'),
          amount: exprInput(block, 'AMOUNT', { type: 'num', value: 0.5 }),
        },
      }
    case 'sz_g3k_add_light':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:addLight',
          color: f(block, 'COLOR') || '#fff1b8',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 6 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
          intensity: exprInput(block, 'INTENSITY', { type: 'num', value: 1 }),
        },
      }
    case 'sz_g3k_set_ambient':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:setAmbient',
          intensity: exprInput(block, 'INTENSITY', { type: 'num', value: 0.4 }),
        },
      }
    case 'sz_g3k_set_fog':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:setFog',
          color: f(block, 'COLOR') || '#9ca3af',
          near: exprInput(block, 'NEAR', { type: 'num', value: 8 }),
          far: exprInput(block, 'FAR', { type: 'num', value: 60 }),
        },
      }
    case 'sz_g3k_set_sky':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:setSky',
          top: f(block, 'TOP') || '#0b1026',
          bottom: f(block, 'BOTTOM') || '#93c5fd',
        },
      }
    case 'sz_g3k_set_sky_photo':
      seen.add('game-3d-advanced')
      return { kind: 'js', value: { type: 'g3k:setSkyPhoto', photo: f(block, 'PHOTO') } }
    case 'sz_g3k_pick':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: { type: 'g3k:pick', varName: f(block, 'NAME'), mold: f(block, 'MOLD') },
      }
    case 'sz_g3k_camera_fps':
      seen.add('game-3d-advanced')
      return { kind: 'js', value: { type: 'g3k:cameraFps', charVar: f(block, 'CHAR') } }
    case 'sz_g3k_move_fps':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:moveFps',
          charVar: f(block, 'CHAR'),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 6 }),
        },
      }
    case 'sz_g3k_on_enter_entity_state':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:onEnterEntityState',
          mold: f(block, 'MOLD'),
          state: f(block, 'STATE') || 'parado',
          itemName: f(block, 'ITEM') || 'ela',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g3k_on_entity_state_update':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:onEntityStateUpdate',
          mold: f(block, 'MOLD'),
          state: f(block, 'STATE') || 'parado',
          itemName: f(block, 'ITEM') || 'ela',
          dtName: f(block, 'DT') || 'dt',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g3k_on_exit_entity_state':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:onExitEntityState',
          mold: f(block, 'MOLD'),
          state: f(block, 'STATE') || 'parado',
          itemName: f(block, 'ITEM') || 'ela',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g3k_set_entity_state':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:setEntityState',
          charVar: f(block, 'CHAR'),
          state: f(block, 'STATE') || 'parado',
        },
      }
    case 'sz_g3k_state_timer':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:stateTimer',
          mold: f(block, 'MOLD'),
          state: f(block, 'STATE') || 'recarregar',
          sec: exprInput(block, 'SEC', { type: 'num', value: 1.5 }),
          next: f(block, 'NEXT') || 'parado',
        },
      }
    case 'sz_g3k_seek':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: { type: 'g3k:seek', charVar: f(block, 'WHO'), targetVar: f(block, 'TARGET') },
      }
    case 'sz_g3k_seek_point':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:seekPoint',
          charVar: f(block, 'WHO'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g3k_aim_at':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:aimAt',
          charVar: f(block, 'WHO'),
          targetVar: f(block, 'TARGET'),
          smooth: exprInput(block, 'SMOOTH', { type: 'num', value: 5 }),
        },
      }
    case 'sz_g3k_face_velocity':
      seen.add('game-3d-advanced')
      return { kind: 'js', value: { type: 'g3k:faceVelocity', charVar: f(block, 'WHO') } }
    case 'sz_g3k_for_each_near':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:forEachNear',
          charVar: f(block, 'CHAR'),
          mold: f(block, 'MOLD'),
          radius: exprInput(block, 'RADIUS', { type: 'num', value: 10 }),
          itemName: f(block, 'ITEM') || 'vizinho',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g3k_store_nearest':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:storeNearest',
          varName: f(block, 'NAME'),
          mold: f(block, 'MOLD'),
          charVar: f(block, 'CHAR'),
        },
      }
    case 'sz_g3k_hurt':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:hurt',
          charVar: f(block, 'WHO'),
          amount: exprInput(block, 'AMOUNT', { type: 'num', value: 10 }),
        },
      }
    case 'sz_g3k_heal':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:heal',
          charVar: f(block, 'WHO'),
          amount: exprInput(block, 'AMOUNT', { type: 'num', value: 20 }),
        },
      }
    case 'sz_g3k_on_entity_death':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:onEntityDeath',
          mold: f(block, 'MOLD'),
          itemName: f(block, 'ITEM') || 'ela',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g3k_on_hurt':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:onHurt',
          mold: f(block, 'MOLD'),
          itemName: f(block, 'ITEM') || 'ela',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g3k_define_effect':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:defineEffect',
          name: f(block, 'NAME'),
          count: exprInput(block, 'COUNT', { type: 'num', value: 24 }),
          colorFrom: f(block, 'C1') || '#fb923c',
          colorTo: f(block, 'C2') || '#451a03',
          spread: exprInput(block, 'SPREAD', { type: 'num', value: 6 }),
          sizeFrom: exprInput(block, 'S1', { type: 'num', value: 0.5 }),
          sizeTo: exprInput(block, 'S2', { type: 'num', value: 0 }),
          life: exprInput(block, 'LIFE', { type: 'num', value: 0.8 }),
          gravity: exprInput(block, 'GRAVITY', { type: 'num', value: -9 }),
        },
      }
    case 'sz_g3k_burst_at':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:burstAt',
          effect: f(block, 'EFFECT'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 1 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g3k_burst_on':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: { type: 'g3k:burstOn', effect: f(block, 'EFFECT'), charVar: f(block, 'WHO') },
      }
    case 'sz_g3k_define_emitter':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:defineEmitter',
          name: f(block, 'NAME'),
          colorFrom: f(block, 'C1') || '#fde047',
          colorTo: f(block, 'C2') || '#7f1d1d',
          sizeFrom: exprInput(block, 'S1', { type: 'num', value: 0.5 }),
          sizeTo: exprInput(block, 'S2', { type: 'num', value: 0 }),
          rate: exprInput(block, 'RATE', { type: 'num', value: 30 }),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 3 }),
          cone: exprInput(block, 'CONE', { type: 'num', value: 20 }),
          gravity: exprInput(block, 'GRAVITY', { type: 'num', value: 2 }),
          glow: f(block, 'GLOW') === 'TRUE',
          curve: f(block, 'CURVE') || 'suave',
        },
      }
    case 'sz_g3k_start_emitter':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:startEmitter',
          effect: f(block, 'EFFECT'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 1 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
        },
      }
    case 'sz_g3k_emitter_on':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: { type: 'g3k:emitterOn', effect: f(block, 'EFFECT'), charVar: f(block, 'WHO') },
      }
    case 'sz_g3k_stop_emitter':
      seen.add('game-3d-advanced')
      return { kind: 'js', value: { type: 'g3k:stopEmitter', effect: f(block, 'EFFECT') } }
    case 'sz_g3k_add_attractor':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:addAttractor',
          effect: f(block, 'EFFECT'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 3 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
          intensity: exprInput(block, 'INT', { type: 'num', value: 20 }),
          radius: exprInput(block, 'RAD', { type: 'num', value: 5 }),
        },
      }
    case 'sz_g3k_set_screen_text':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:setScreenText',
          screen: f(block, 'SCREEN') || 'menu',
          title: exprInput(block, 'TITLE', { type: 'str', value: '' }),
          text: exprInput(block, 'TEXT', { type: 'str', value: '' }),
          button: exprInput(block, 'BTN', { type: 'str', value: '' }),
        },
      }
    case 'sz_g3k_create_screen':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:createScreen',
          name: f(block, 'NAME'),
          title: exprInput(block, 'TITLE', { type: 'str', value: '' }),
          text: exprInput(block, 'TEXT', { type: 'str', value: '' }),
        },
      }
    case 'sz_g3k_add_button':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:addButton',
          screen: f(block, 'SCREEN'),
          label: exprInput(block, 'LABEL', { type: 'str', value: 'Botão' }),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g3k_show_screen':
      seen.add('game-3d-advanced')
      return { kind: 'js', value: { type: 'g3k:showScreen', name: f(block, 'SCREEN') } }
    case 'sz_g3k_hide_screens':
      seen.add('game-3d-advanced')
      return { kind: 'js', value: { type: 'g3k:hideScreens' } }
    case 'sz_g3k_hud_text':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:hudText',
          slot: f(block, 'SLOT') || 'top-left',
          text: exprInput(block, 'TEXT', { type: 'str', value: '' }),
        },
      }
    case 'sz_g3k_set_state':
      seen.add('game-3d-advanced')
      return { kind: 'js', value: { type: 'g3k:setState', name: f(block, 'STATE') || 'jogando' } }
    case 'sz_g3k_on_enter_state':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:onEnterState',
          name: f(block, 'STATE') || 'jogando',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g3k_return_to_menu':
      seen.add('game-3d-advanced')
      return { kind: 'js', value: { type: 'g3k:returnToMenu' } }
    case 'sz_g3k_end_game':
      seen.add('game-3d-advanced')
      return { kind: 'js', value: { type: 'g3k:endGame' } }
    case 'sz_g3k_on_event':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:onEvent',
          event: f(block, 'NAME'),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_g3k_emit':
      seen.add('game-3d-advanced')
      return { kind: 'js', value: { type: 'g3k:emit', event: f(block, 'NAME') } }
    case 'sz_g3k_load_sound':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: { type: 'g3k:loadSound', name: f(block, 'NAME'), asset: f(block, 'SOUND') },
      }
    case 'sz_g3k_play_sound':
      seen.add('game-3d-advanced')
      return { kind: 'js', value: { type: 'g3k:playSound', name: f(block, 'NAME') } }
    case 'sz_g3k_play_effect':
      seen.add('game-3d-advanced')
      return { kind: 'js', value: { type: 'g3k:playEffect', fx: f(block, 'FX') || 'hit' } }
    case 'sz_g3k_play_tone':
      seen.add('game-3d-advanced')
      return {
        kind: 'js',
        value: {
          type: 'g3k:playTone',
          freq: exprInput(block, 'FREQ', { type: 'num', value: 440 }),
          ms: exprInput(block, 'MS', { type: 'num', value: 200 }),
        },
      }

    // ---- Mundo 3D (world-3d): mundo aberto dirigível ----
    case 'sz_w3d_setup':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:setup',
          style: f(block, 'STYLE') || 'floresta',
          world: exprInput(block, 'WORLD', { type: 'num', value: 160 }),
        },
      }
    case 'sz_w3d_terrain':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:terrain',
          h: exprInput(block, 'H', { type: 'num', value: 4 }),
          s: exprInput(block, 'S', { type: 'num', value: 5 }),
        },
      }
    case 'sz_w3d_flatten':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:flatten',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
          r: exprInput(block, 'R', { type: 'num', value: 15 }),
        },
      }
    case 'sz_w3d_path':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:path',
          x1: exprInput(block, 'X1', { type: 'num', value: 0 }),
          z1: exprInput(block, 'Z1', { type: 'num', value: 0 }),
          x2: exprInput(block, 'X2', { type: 'num', value: 0 }),
          z2: exprInput(block, 'Z2', { type: 'num', value: 30 }),
          w: exprInput(block, 'W', { type: 'num', value: 6 }),
        },
      }
    case 'sz_w3d_water':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:water',
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          color: f(block, 'COLOR') || '#2b6cb0',
        },
      }
    case 'sz_w3d_sky_photo':
      seen.add('world-3d')
      return { kind: 'js', value: { type: 'w3d:skyPhoto', asset: f(block, 'ASSET') } }
    case 'sz_w3d_start':
      seen.add('world-3d')
      return { kind: 'js', value: { type: 'w3d:start' } }
    case 'sz_w3d_car':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:car',
          style: f(block, 'STYLE') || 'passeio',
          color: f(block, 'COLOR') || '#ef4444',
        },
      }
    case 'sz_w3d_car_stats':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:carStats',
          speed: exprInput(block, 'SPEED', { type: 'num', value: 24 }),
          turn: exprInput(block, 'TURN', { type: 'num', value: 110 }),
          jump: exprInput(block, 'JUMP', { type: 'num', value: 7 }),
        },
      }
    case 'sz_w3d_car_place':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:carPlace',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
          deg: exprInput(block, 'DEG', { type: 'num', value: 0 }),
        },
      }
    case 'sz_w3d_car_boost':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:carBoost',
          force: exprInput(block, 'FORCE', { type: 'num', value: 1 }),
        },
      }
    case 'sz_w3d_engine_sound':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: { type: 'w3d:engineSound', on: (f(block, 'ON') || 'ligado') !== 'desligado' },
      }
    case 'sz_w3d_load_sound':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: { type: 'w3d:loadSound', name: f(block, 'NAME'), asset: f(block, 'ASSET') },
      }
    case 'sz_w3d_play_sound':
      seen.add('world-3d')
      return { kind: 'js', value: { type: 'w3d:playSound', name: f(block, 'NAME') } }
    case 'sz_w3d_play_music':
      seen.add('world-3d')
      return { kind: 'js', value: { type: 'w3d:playMusic', name: f(block, 'NAME') } }
    case 'sz_w3d_stop_music':
      seen.add('world-3d')
      return { kind: 'js', value: { type: 'w3d:stopMusic' } }
    case 'sz_w3d_hud':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:hud',
          text: exprInput(block, 'TEXT', { type: 'str', value: 'Pontos: 0' }),
          corner: f(block, 'CORNER') || 'topo-esquerda',
        },
      }
    case 'sz_w3d_say':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:say',
          text: exprInput(block, 'TEXT', { type: 'str', value: 'Oi!' }),
          secs: exprInput(block, 'SECS', { type: 'num', value: 2 }),
        },
      }
    case 'sz_w3d_point':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:point',
          name: f(block, 'NAME'),
          x: exprInput(block, 'X', { type: 'num', value: 10 }),
          z: exprInput(block, 'Z', { type: 'num', value: 10 }),
        },
      }
    case 'sz_w3d_on_point':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:onPoint',
          name: f(block, 'NAME'),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_w3d_zone':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:zone',
          name: f(block, 'NAME'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 30 }),
          r: exprInput(block, 'R', { type: 'num', value: 8 }),
        },
      }
    case 'sz_w3d_on_zone':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:onZone',
          name: f(block, 'NAME'),
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_w3d_totem_text':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:totemText',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 8 }),
          title: f(block, 'TITLE'),
          body: f(block, 'BODY'),
        },
      }
    case 'sz_w3d_totem_image':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:totemImage',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 8 }),
          image: f(block, 'IMAGE'),
          w: exprInput(block, 'W', { type: 'num', value: 3 }),
        },
      }
    case 'sz_w3d_gallery_create':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:galleryCreate',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: -30 }),
          title: f(block, 'TITLE'),
        },
      }
    case 'sz_w3d_gallery_add':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:galleryAdd',
          image: f(block, 'IMAGE'),
          caption: f(block, 'CAPTION'),
        },
      }
    case 'sz_w3d_race_create':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:raceCreate',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
          deg: exprInput(block, 'DEG', { type: 'num', value: 0 }),
          laps: exprInput(block, 'LAPS', { type: 'num', value: 1 }),
        },
      }
    case 'sz_w3d_race_checkpoint':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:raceCheckpoint',
          x: exprInput(block, 'X', { type: 'num', value: 20 }),
          z: exprInput(block, 'Z', { type: 'num', value: 20 }),
          deg: exprInput(block, 'DEG', { type: 'num', value: 0 }),
        },
      }
    case 'sz_w3d_race_on_start':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: { type: 'w3d:raceOnStart', body: getStatementChildren(block, 'BODY', seen) },
      }
    case 'sz_w3d_race_on_checkpoint':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: { type: 'w3d:raceOnCheckpoint', body: getStatementChildren(block, 'BODY', seen) },
      }
    case 'sz_w3d_race_on_finish':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: { type: 'w3d:raceOnFinish', body: getStatementChildren(block, 'BODY', seen) },
      }
    case 'sz_w3d_bowling_create':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:bowlingCreate',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 25 }),
          deg: exprInput(block, 'DEG', { type: 'num', value: 0 }),
        },
      }
    case 'sz_w3d_bowling_reset':
      seen.add('world-3d')
      return { kind: 'js', value: { type: 'w3d:bowlingReset' } }
    case 'sz_w3d_bowling_on_strike':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: { type: 'w3d:bowlingOnStrike', body: getStatementChildren(block, 'BODY', seen) },
      }
    case 'sz_w3d_stack':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:stack',
          n: exprInput(block, 'N', { type: 'num', value: 5 }),
          thing: f(block, 'THING') || 'caixas',
          x: exprInput(block, 'X', { type: 'num', value: 15 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
        },
      }
    case 'sz_w3d_camera_mode':
      seen.add('world-3d')
      return { kind: 'js', value: { type: 'w3d:cameraMode', mode: f(block, 'MODE') || 'seguir' } }
    case 'sz_w3d_camera_shake':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:cameraShake',
          force: exprInput(block, 'FORCE', { type: 'num', value: 0.5 }),
          secs: exprInput(block, 'SECS', { type: 'num', value: 0.3 }),
        },
      }
    case 'sz_w3d_grass':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: { type: 'w3d:grass', amount: f(block, 'AMOUNT') || 'media' },
      }
    case 'sz_w3d_scatter':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:scatter',
          n: exprInput(block, 'N', { type: 'num', value: 300 }),
          thing: f(block, 'THING') || 'arvores',
        },
      }
    case 'sz_w3d_scatter_model':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:scatterModel',
          n: exprInput(block, 'N', { type: 'num', value: 30 }),
          model: f(block, 'MODEL'),
          s: exprInput(block, 'S', { type: 'num', value: 1 }),
        },
      }
    case 'sz_w3d_place_thing':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:placeThing',
          thing: f(block, 'THING') || 'arvores',
          x: exprInput(block, 'X', { type: 'num', value: 10 }),
          z: exprInput(block, 'Z', { type: 'num', value: 10 }),
          s: exprInput(block, 'S', { type: 'num', value: 1 }),
        },
      }
    case 'sz_w3d_place_model':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:placeModel',
          model: f(block, 'MODEL'),
          x: exprInput(block, 'X', { type: 'num', value: 10 }),
          z: exprInput(block, 'Z', { type: 'num', value: 10 }),
          s: exprInput(block, 'S', { type: 'num', value: 1 }),
          deg: exprInput(block, 'DEG', { type: 'num', value: 0 }),
        },
      }
    case 'sz_w3d_clear_area':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:clearArea',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
          r: exprInput(block, 'R', { type: 'num', value: 15 }),
        },
      }
    case 'sz_w3d_on_crash':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: { type: 'w3d:onCrash', body: getStatementChildren(block, 'BODY', seen) },
      }
    case 'sz_w3d_horn':
      return { kind: 'js', value: { type: 'w3d:horn' } }
    case 'sz_w3d_on_horn':
      return {
        kind: 'js',
        value: { type: 'w3d:onHorn', body: getStatementChildren(block, 'BODY', seen) },
      }
    case 'sz_w3d_car_lights':
      return { kind: 'js', value: { type: 'w3d:carLights' } }
    case 'sz_w3d_tire_marks':
      return { kind: 'js', value: { type: 'w3d:tireMarks', on: f(block, 'ON') !== 'desligadas' } }
    case 'sz_w3d_achievement':
      return {
        kind: 'js',
        value: { type: 'w3d:achievement', name: f(block, 'NAME') || 'conquista' },
      }
    case 'sz_w3d_on_achievement':
      return {
        kind: 'js',
        value: {
          type: 'w3d:onAchievement',
          name: f(block, 'NAME') || 'conquista',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_w3d_minimap':
      return { kind: 'js', value: { type: 'w3d:minimap', mode: f(block, 'MODE') || 'ver' } }
    case 'sz_w3d_race_podium':
      return { kind: 'js', value: { type: 'w3d:racePodium' } }
    case 'sz_w3d_whisper_corner':
      return {
        kind: 'js',
        value: {
          type: 'w3d:whisperCorner',
          x: exprInput(block, 'X', { type: 'num', value: -10 }),
          z: exprInput(block, 'Z', { type: 'num', value: 10 }),
        },
      }
    case 'sz_w3d_flame_note':
      return {
        kind: 'js',
        value: {
          type: 'w3d:flameNote',
          x: exprInput(block, 'X', { type: 'num', value: 5 }),
          z: exprInput(block, 'Z', { type: 'num', value: 12 }),
          text: f(block, 'TEXT') || '...',
        },
      }
    case 'sz_w3d_coins_scatter':
      return {
        kind: 'js',
        value: { type: 'w3d:coinsScatter', n: exprInput(block, 'N', { type: 'num', value: 20 }) },
      }
    case 'sz_w3d_coins_ring':
      return {
        kind: 'js',
        value: {
          type: 'w3d:coinsRing',
          n: exprInput(block, 'N', { type: 'num', value: 8 }),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 20 }),
          r: exprInput(block, 'R', { type: 'num', value: 6 }),
        },
      }
    case 'sz_w3d_coins_line':
      return {
        kind: 'js',
        value: {
          type: 'w3d:coinsLine',
          n: exprInput(block, 'N', { type: 'num', value: 10 }),
          x1: exprInput(block, 'X1', { type: 'num', value: 0 }),
          z1: exprInput(block, 'Z1', { type: 'num', value: 10 }),
          x2: exprInput(block, 'X2', { type: 'num', value: 0 }),
          z2: exprInput(block, 'Z2', { type: 'num', value: 40 }),
        },
      }
    case 'sz_w3d_on_collect':
      return {
        kind: 'js',
        value: { type: 'w3d:onCollect', body: getStatementChildren(block, 'BODY', seen) },
      }
    case 'sz_w3d_quest':
      return {
        kind: 'js',
        value: {
          type: 'w3d:quest',
          name: f(block, 'NAME') || 'missao',
          desc: f(block, 'DESC') || 'Complete a missão',
        },
      }
    case 'sz_w3d_quest_done':
      return { kind: 'js', value: { type: 'w3d:questDone', name: f(block, 'NAME') || 'missao' } }
    case 'sz_w3d_on_quest_done':
      return {
        kind: 'js',
        value: {
          type: 'w3d:onQuestDone',
          name: f(block, 'NAME') || 'missao',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_w3d_marker':
      return {
        kind: 'js',
        value: {
          type: 'w3d:marker',
          icon: f(block, 'ICON') || 'estrela',
          x: exprInput(block, 'X', { type: 'num', value: 20 }),
          z: exprInput(block, 'Z', { type: 'num', value: 20 }),
        },
      }
    case 'sz_w3d_guide_arrow':
      return {
        kind: 'js',
        value: {
          type: 'w3d:guideArrow',
          x: exprInput(block, 'X', { type: 'num', value: 20 }),
          z: exprInput(block, 'Z', { type: 'num', value: 20 }),
          on: f(block, 'ON') !== 'desligada',
        },
      }
    case 'sz_w3d_npc':
      return {
        kind: 'js',
        value: {
          type: 'w3d:npc',
          name: f(block, 'NAME') || 'amigo',
          x: exprInput(block, 'X', { type: 'num', value: 8 }),
          z: exprInput(block, 'Z', { type: 'num', value: 8 }),
          color: f(block, 'COLOR') || '#f97316',
          hat: f(block, 'HAT') || 'nenhum',
        },
      }
    case 'sz_w3d_npc_wander':
      return {
        kind: 'js',
        value: {
          type: 'w3d:npcWander',
          name: f(block, 'NAME') || 'amigo',
          r: exprInput(block, 'R', { type: 'num', value: 10 }),
        },
      }
    case 'sz_w3d_npc_talk':
      return {
        kind: 'js',
        value: {
          type: 'w3d:npcTalk',
          name: f(block, 'NAME') || 'amigo',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_w3d_npc_say':
      return {
        kind: 'js',
        value: {
          type: 'w3d:npcSay',
          name: f(block, 'NAME') || 'amigo',
          text: f(block, 'TEXT') || '...',
        },
      }
    case 'sz_w3d_npc_emote':
      return {
        kind: 'js',
        value: {
          type: 'w3d:npcEmote',
          name: f(block, 'NAME') || 'amigo',
          emote: f(block, 'EMOTE') || 'acenar',
        },
      }
    case 'sz_w3d_islands':
      return {
        kind: 'js',
        value: {
          type: 'w3d:islands',
          n: exprInput(block, 'N', { type: 'num', value: 4 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
        },
      }
    case 'sz_w3d_boat':
      return { kind: 'js', value: { type: 'w3d:boat', color: f(block, 'COLOR') || '#f8fafc' } }
    case 'sz_w3d_bridge':
      return {
        kind: 'js',
        value: {
          type: 'w3d:bridge',
          x1: exprInput(block, 'X1', { type: 'num', value: 0 }),
          z1: exprInput(block, 'Z1', { type: 'num', value: 20 }),
          x2: exprInput(block, 'X2', { type: 'num', value: 0 }),
          z2: exprInput(block, 'Z2', { type: 'num', value: 50 }),
          w: exprInput(block, 'W', { type: 'num', value: 4 }),
        },
      }
    case 'sz_w3d_lighthouse':
      return {
        kind: 'js',
        value: {
          type: 'w3d:lighthouse',
          x: exprInput(block, 'X', { type: 'num', value: 50 }),
          z: exprInput(block, 'Z', { type: 'num', value: -40 }),
        },
      }
    case 'sz_w3d_ambience':
      return { kind: 'js', value: { type: 'w3d:ambience', kind: f(block, 'KIND') || 'desligado' } }
    case 'sz_w3d_person':
      return {
        kind: 'js',
        value: {
          type: 'w3d:person',
          color: f(block, 'COLOR') || '#3b82f6',
          hat: f(block, 'HAT') || 'nenhum',
        },
      }
    case 'sz_w3d_person_stats':
      return {
        kind: 'js',
        value: {
          type: 'w3d:personStats',
          walk: exprInput(block, 'WALK', { type: 'num', value: 4 }),
          run: exprInput(block, 'RUN', { type: 'num', value: 8 }),
          jump: exprInput(block, 'JUMP', { type: 'num', value: 7 }),
        },
      }
    case 'sz_w3d_person_place':
      return {
        kind: 'js',
        value: {
          type: 'w3d:personPlace',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
          deg: exprInput(block, 'DEG', { type: 'num', value: 0 }),
        },
      }
    case 'sz_w3d_person_accessory':
      return {
        kind: 'js',
        value: { type: 'w3d:personAccessory', acc: f(block, 'ACC') || 'nenhum' },
      }
    case 'sz_w3d_person_emote':
      return {
        kind: 'js',
        value: { type: 'w3d:personEmote', emote: f(block, 'EMOTE') || 'acenar' },
      }
    case 'sz_w3d_on_vehicle':
      return {
        kind: 'js',
        value: {
          type: 'w3d:onVehicle',
          when: f(block, 'WHEN') || 'entrar',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_w3d_waterfall':
      return {
        kind: 'js',
        value: {
          type: 'w3d:waterfall',
          x: exprInput(block, 'X', { type: 'num', value: 40 }),
          z: exprInput(block, 'Z', { type: 'num', value: -30 }),
          h: exprInput(block, 'H', { type: 'num', value: 8 }),
          deg: exprInput(block, 'DEG', { type: 'num', value: 0 }),
        },
      }
    case 'sz_w3d_city':
      return {
        kind: 'js',
        value: {
          type: 'w3d:city',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
          size: f(block, 'SIZE') || 'media',
          mode: f(block, 'MODE') || 'dia',
        },
      }
    case 'sz_w3d_district':
      return {
        kind: 'js',
        value: {
          type: 'w3d:district',
          kind: f(block, 'KIND') || 'residencial',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
          size: exprInput(block, 'SIZE', { type: 'num', value: 48 }),
        },
      }
    case 'sz_w3d_road_grid':
      return {
        kind: 'js',
        value: {
          type: 'w3d:roadGrid',
          layout: f(block, 'LAYOUT') || 'grade',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 0 }),
          size: exprInput(block, 'SIZE', { type: 'num', value: 80 }),
          width: exprInput(block, 'WIDTH', { type: 'num', value: 6 }),
        },
      }
    case 'sz_w3d_house_row':
      return {
        kind: 'js',
        value: {
          type: 'w3d:houseRow',
          n: exprInput(block, 'N', { type: 'num', value: 8 }),
          x1: exprInput(block, 'X1', { type: 'num', value: -30 }),
          z1: exprInput(block, 'Z1', { type: 'num', value: 15 }),
          x2: exprInput(block, 'X2', { type: 'num', value: 30 }),
          z2: exprInput(block, 'Z2', { type: 'num', value: 15 }),
          style: f(block, 'STYLE') || 'coloridas',
        },
      }
    case 'sz_w3d_quality':
      return {
        kind: 'js',
        value: { type: 'w3d:quality', mode: f(block, 'MODE') || 'automatica' },
      }
    case 'sz_w3d_inventory_give':
      return {
        kind: 'js',
        value: {
          type: 'w3d:inventoryGive',
          item: f(block, 'ITEM') || 'item',
          n: exprInput(block, 'N', { type: 'num', value: 1 }),
        },
      }
    case 'sz_w3d_inventory_remove':
      return {
        kind: 'js',
        value: {
          type: 'w3d:inventoryRemove',
          item: f(block, 'ITEM') || 'item',
          n: exprInput(block, 'N', { type: 'num', value: 1 }),
        },
      }
    case 'sz_w3d_traffic':
      return {
        kind: 'js',
        value: {
          type: 'w3d:traffic',
          n: exprInput(block, 'N', { type: 'num', value: 6 }),
          sem: f(block, 'SEM') || 'semaforos',
        },
      }
    case 'sz_w3d_door':
      return {
        kind: 'js',
        value: {
          type: 'w3d:door',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 8 }),
          deg: exprInput(block, 'DEG', { type: 'num', value: 0 }),
          title: f(block, 'TITLE') || '',
          body: f(block, 'TEXT') || '',
          image: f(block, 'IMAGE') || '',
        },
      }
    case 'sz_w3d_npc_ask':
      return {
        kind: 'js',
        value: {
          type: 'w3d:npcAsk',
          name: f(block, 'NAME') || 'amigo',
          question: f(block, 'QUESTION') || '...',
          optA: f(block, 'OPT_A') || 'Sim',
          bodyA: getStatementChildren(block, 'BODY_A', seen),
          optB: f(block, 'OPT_B') || 'Não',
          bodyB: getStatementChildren(block, 'BODY_B', seen),
        },
      }
    case 'sz_w3d_crops':
      return {
        kind: 'js',
        value: {
          type: 'w3d:crops',
          n: exprInput(block, 'N', { type: 'num', value: 4 }),
          kind: f(block, 'KIND') || 'milho',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 20 }),
        },
      }
    case 'sz_w3d_barn':
      return {
        kind: 'js',
        value: {
          type: 'w3d:barn',
          x: exprInput(block, 'X', { type: 'num', value: -15 }),
          z: exprInput(block, 'Z', { type: 'num', value: 15 }),
          deg: exprInput(block, 'DEG', { type: 'num', value: 0 }),
        },
      }
    case 'sz_w3d_windmill':
      return {
        kind: 'js',
        value: {
          type: 'w3d:windmill',
          x: exprInput(block, 'X', { type: 'num', value: 15 }),
          z: exprInput(block, 'Z', { type: 'num', value: 25 }),
        },
      }
    case 'sz_w3d_fence':
      return {
        kind: 'js',
        value: {
          type: 'w3d:fence',
          x1: exprInput(block, 'X1', { type: 'num', value: -8 }),
          z1: exprInput(block, 'Z1', { type: 'num', value: 10 }),
          x2: exprInput(block, 'X2', { type: 'num', value: 8 }),
          z2: exprInput(block, 'Z2', { type: 'num', value: 10 }),
        },
      }
    case 'sz_w3d_animals':
      return {
        kind: 'js',
        value: {
          type: 'w3d:animals',
          n: exprInput(block, 'N', { type: 'num', value: 4 }),
          kind: f(block, 'KIND') || 'galinhas',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 15 }),
          r: exprInput(block, 'R', { type: 'num', value: 8 }),
        },
      }
    case 'sz_w3d_crater':
      return {
        kind: 'js',
        value: {
          type: 'w3d:crater',
          x: exprInput(block, 'X', { type: 'num', value: 10 }),
          z: exprInput(block, 'Z', { type: 'num', value: 10 }),
          r: exprInput(block, 'R', { type: 'num', value: 6 }),
        },
      }
    case 'sz_w3d_flag':
      return {
        kind: 'js',
        value: {
          type: 'w3d:flag',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: -10 }),
          color: f(block, 'COLOR') || '#ef4444',
        },
      }
    case 'sz_w3d_rocket':
      return {
        kind: 'js',
        value: {
          type: 'w3d:rocket',
          x: exprInput(block, 'X', { type: 'num', value: 8 }),
          z: exprInput(block, 'Z', { type: 'num', value: -10 }),
        },
      }
    case 'sz_w3d_string_lights':
      return {
        kind: 'js',
        value: {
          type: 'w3d:stringLights',
          x1: exprInput(block, 'X1', { type: 'num', value: -8 }),
          z1: exprInput(block, 'Z1', { type: 'num', value: 0 }),
          x2: exprInput(block, 'X2', { type: 'num', value: 8 }),
          z2: exprInput(block, 'Z2', { type: 'num', value: 0 }),
        },
      }
    case 'sz_w3d_lamp':
      return {
        kind: 'js',
        value: {
          type: 'w3d:lamp',
          x: exprInput(block, 'X', { type: 'num', value: 6 }),
          z: exprInput(block, 'Z', { type: 'num', value: 6 }),
        },
      }
    case 'sz_w3d_fireflies':
      return {
        kind: 'js',
        value: { type: 'w3d:fireflies', amount: f(block, 'AMOUNT') || 'media' },
      }
    case 'sz_w3d_campfire':
      return {
        kind: 'js',
        value: {
          type: 'w3d:campfire',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 8 }),
        },
      }
    case 'sz_w3d_push_place':
      return {
        kind: 'js',
        value: {
          type: 'w3d:pushPlace',
          thing: f(block, 'THING') || 'tijolo',
          x: exprInput(block, 'X', { type: 'num', value: 10 }),
          z: exprInput(block, 'Z', { type: 'num', value: 10 }),
        },
      }
    case 'sz_w3d_push_scatter':
      return {
        kind: 'js',
        value: {
          type: 'w3d:pushScatter',
          n: exprInput(block, 'N', { type: 'num', value: 12 }),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 20 }),
          r: exprInput(block, 'R', { type: 'num', value: 10 }),
        },
      }
    case 'sz_w3d_letters':
      return {
        kind: 'js',
        value: {
          type: 'w3d:letters',
          word: f(block, 'WORD') || 'OI',
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          z: exprInput(block, 'Z', { type: 'num', value: 12 }),
          s: exprInput(block, 'S', { type: 'num', value: 1 }),
        },
      }
    case 'sz_w3d_explosive':
      return {
        kind: 'js',
        value: {
          type: 'w3d:explosive',
          x: exprInput(block, 'X', { type: 'num', value: 15 }),
          z: exprInput(block, 'Z', { type: 'num', value: 15 }),
        },
      }
    case 'sz_w3d_on_explosion':
      return {
        kind: 'js',
        value: { type: 'w3d:onExplosion', body: getStatementChildren(block, 'BODY', seen) },
      }
    case 'sz_w3d_confetti':
      return { kind: 'js', value: { type: 'w3d:confetti' } }
    case 'sz_w3d_fireworks':
      return { kind: 'js', value: { type: 'w3d:fireworks' } }
    case 'sz_w3d_tornado':
      return {
        kind: 'js',
        value: { type: 'w3d:tornado', secs: exprInput(block, 'SECS', { type: 'num', value: 15 }) },
      }
    case 'sz_w3d_season':
      return { kind: 'js', value: { type: 'w3d:season', season: f(block, 'SEASON') || 'verao' } }
    case 'sz_w3d_clouds':
      return { kind: 'js', value: { type: 'w3d:clouds', amount: f(block, 'AMOUNT') || 'nenhuma' } }
    case 'sz_w3d_car_paint':
      return {
        kind: 'js',
        value: { type: 'w3d:carPaint', paint: f(block, 'PAINT') || 'lisa' },
      }
    case 'sz_w3d_effects':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:effects',
          on: (f(block, 'ON') || 'ligados') !== 'desligados',
          strength: exprInput(block, 'STRENGTH', { type: 'num', value: 1 }),
        },
      }
    case 'sz_w3d_daynight':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:dayNight',
          minutes: exprInput(block, 'MIN', { type: 'num', value: 4 }),
        },
      }
    case 'sz_w3d_set_time':
      seen.add('world-3d')
      return { kind: 'js', value: { type: 'w3d:setTime', time: f(block, 'TIME') || 'meiodia' } }
    case 'sz_w3d_weather':
      seen.add('world-3d')
      return { kind: 'js', value: { type: 'w3d:weather', kind: f(block, 'W') || 'limpo' } }
    case 'sz_w3d_wind':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: { type: 'w3d:wind', force: exprInput(block, 'F', { type: 'num', value: 1 }) },
      }
    case 'sz_w3d_on_daynight':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:onDayNight',
          when: f(block, 'WHEN') || 'noite',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }
    case 'sz_w3d_on_update':
      seen.add('world-3d')
      return {
        kind: 'js',
        value: {
          type: 'w3d:onUpdate',
          dtName: f(block, 'DT') || 'dt',
          body: getStatementChildren(block, 'BODY', seen),
        },
      }

    default: {
      // Um bloco ofertado por Programação sem implementação é violação do contrato e
      // nunca pode virar perda silenciosa de trabalho. Extensões desconhecidas
      // continuam toleradas para compatibilidade com estados externos.
      const programmingRegistration = programmingRegistrationForBlockType(block.type)
      if (programmingRegistration) {
        throw new Error(`Bloco de Programação sem implementação de IR: ${block.type}`)
      }
      console.warn('Bloco desconhecido ignorado:', block.type)
      return null
    }
  }
}

import type * as Blockly from 'blockly/core'
import type { CSSEntry, HTMLNode, HTMLTag, JSExpr, JSStatement, SZIR } from '#ir'
import { getSuperName } from './blocks/extendsMutator'
import { getParamNames } from './blocks/paramsMutator'

/** Tipos dos 3 blocos-frame (containers estilo MakeCode). */
export const FRAME_STRUCTURE = 'sz_frame_structure'
export const FRAME_APPEARANCE = 'sz_frame_appearance'
export const FRAME_BEHAVIOR = 'sz_frame_behavior'

/**
 * Percorre o workspace e devolve a SZ-IR — modelo CONTAINER (estilo MakeCode `on
 * start`): SÓ o que está DENTRO de um frame gera. Pega os filhos da 🧱 Estrutura
 * (→ ir.html), da 🎨 Aparência (→ ir.css) e do ⚙️ Comportamento (→ ir.js, na ORDEM
 * da pilha). **Bloco solto fora dos frames é RASCUNHO** (ignorado pela geração).
 * A inclusão é por CONTÊINER, não por posição/ordem no canvas.
 *
 * Defensivo: se houver frames duplicados (a trava de "1 por projeto" é da Fase 3),
 * usa o PRIMEIRO de cada tipo, de forma determinística.
 *
 * Blocos não-reconhecidos DENTRO de um frame viram "modo avançado" (nada se perde).
 */
export function buildIRFromWorkspace(workspace: Blockly.Workspace): SZIR {
  const ir: SZIR = { html: [], css: [], js: [], extensions: [] }
  const seen = new Set<string>()
  const tops = workspace.getTopBlocks(true).filter((b) => !b.isInsertionMarker())
  const firstOf = (type: string): Blockly.Block | null => tops.find((b) => b.type === type) ?? null

  const structure = firstOf(FRAME_STRUCTURE)
  if (structure) ir.html.push(...getHtmlChildren(structure, 'CHILDREN', seen))
  const appearance = firstOf(FRAME_APPEARANCE)
  if (appearance) ir.css.push(...getCssEntryChildren(appearance, 'CHILDREN', seen))
  const behavior = firstOf(FRAME_BEHAVIOR)
  if (behavior) ir.js.push(...getStatementChildren(behavior, 'CHILDREN', seen))

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
function mergeBlockData(block: Blockly.Block, node: HTMLNode): void {
  if (node.type !== 'element') return
  const raw = (block as unknown as { data?: string | null }).data
  if (!raw) return
  let extra: Record<string, string>
  try {
    extra = JSON.parse(raw) as Record<string, string>
  } catch {
    return
  }
  if (typeof extra !== 'object' || extra === null) return
  const { id, ...rest } = extra
  if (id && !node.id) node.id = id
  if (Object.keys(rest).length > 0) {
    node.attrs = { ...rest, ...(node.attrs ?? {}) }
  }
}

/**
 * Recupera `width`/`height` guardados no `data` JSON do bloco `sz_html_canvas`
 * (contraparte do stash em `htmlNodeToBlockInner` de workspaceState). Só devolve
 * valores numéricos finitos; `data` ausente/inválido vira `{}`.
 */
function parseCanvasData(raw: string | null | undefined): { width?: number; height?: number } {
  if (!raw) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (typeof parsed !== 'object' || parsed === null) return {}
  const { width, height } = parsed as { width?: unknown; height?: unknown }
  const out: { width?: number; height?: number } = {}
  if (typeof width === 'number' && Number.isFinite(width)) out.width = width
  if (typeof height === 'number' && Number.isFinite(height)) out.height = height
  return out
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
  ;(node.value as { __id?: string }).__id = blockId
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
): Array<{ match: JSExpr; body: JSStatement[] }> {
  const out: Array<{ match: JSExpr; body: JSStatement[] }> = []
  let cur: Blockly.Block | null = block.getInputTargetBlock(name)
  while (cur) {
    if (cur.isInsertionMarker()) {
      cur = cur.getNextBlock()
      continue
    }
    if (cur.type === 'sz_js_case') {
      out.push({
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
    case 'sz_g2d_stickhero_score':
      return { type: 'g2d:stickHeroScore', gameVar: f(block, 'GAME') }
    case 'sz_g2d_stickhero_over':
      return { type: 'g2d:stickHeroOver', gameVar: f(block, 'GAME') }
    case 'sz_g2d_balloon_score':
      return { type: 'g2d:balloonScore', gameVar: f(block, 'GAME') }
    case 'sz_g2d_balloon_fuel':
      return { type: 'g2d:balloonFuel', gameVar: f(block, 'GAME') }
    case 'sz_g2d_balloon_over':
      return { type: 'g2d:balloonOver', gameVar: f(block, 'GAME') }
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
    case 'sz_input_key_pressed':
      return { type: 'inputKeyPressed', key: f(block, 'KEY') || 'ArrowRight' }
    case 'sz_input_pointer_x':
      return { type: 'inputPointer', axis: 'x' }
    case 'sz_input_pointer_y':
      return { type: 'inputPointer', axis: 'y' }
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
    case 'sz_canvas_measure_text':
      return {
        type: 'canvasMeasureText',
        ctxVar: f(block, 'CTX'),
        text: exprInput(block, 'TEXT', { type: 'str', value: '' }),
      }
    case 'sz_canvas_point_in_path':
      return {
        type: 'canvasIsPointInPath',
        ctxVar: f(block, 'CTX'),
        x: exprInput(block, 'X', { type: 'num', value: 0 }),
        y: exprInput(block, 'Y', { type: 'num', value: 0 }),
      }
    case 'sz_canvas_point_in_stroke':
      return {
        type: 'canvasIsPointInStroke',
        ctxVar: f(block, 'CTX'),
        x: exprInput(block, 'X', { type: 'num', value: 0 }),
        y: exprInput(block, 'Y', { type: 'num', value: 0 }),
      }
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
    case 'sz_val_method_on':
      return {
        type: 'memberCallExpr',
        object: exprInput(block, 'OBJ', { type: 'var', name: 'objeto' }),
        method: f(block, 'METHOD'),
        args: getArgs(block),
      }
    case 'sz_val_new':
      return {
        type: 'newExpr',
        className: f(block, 'CLASS'),
        args: getArgs(block),
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
    case 'sz_val_image':
      return { type: 'assetImage', name: f(block, 'ASSET') }
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
    case 'sz_val_concat_arrays':
      return { type: 'concatArrays', parts: getArrayItems(block) }
    case 'sz_val_shuffle':
      return { type: 'shuffle', arrayVar: f(block, 'NAME') }
    case 'sz_val_dataset':
      return { type: 'datasetGet', objectVar: f(block, 'OBJ'), key: f(block, 'KEY') }
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
 * corpo) e os `sz_js_class_method`. Se houver mais de um construtor, o último vence.
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
      out.ctorParams = getParamNames(cur)
      out.ctorBody = getStatementChildren(cur, 'BODY', seen)
      out.ctorId = cur.id
    } else if (cur.type === 'sz_js_class_method') {
      out.methods.push({
        __id: cur.id,
        name: f(cur, 'NAME'),
        params: getParamNames(cur),
        body: getStatementChildren(cur, 'BODY', seen),
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
): { declarations: Record<string, string>; declIds: Record<string, string> } {
  const declarations: Record<string, string> = {}
  const declIds: Record<string, string> = {}
  let cur: Blockly.Block | null = block.getInputTargetBlock(name)
  while (cur) {
    if (cur.isInsertionMarker()) {
      cur = cur.getNextBlock()
      continue
    }
    if (cur.type === 'sz_css_decl') {
      const prop = f(cur, 'PROP').trim()
      if (prop) {
        declarations[prop] = f(cur, 'VALUE').trim()
        declIds[prop] = cur.id
      }
    }
    cur = cur.getNextBlock()
  }
  return { declarations, declIds }
}

/** Coleta os blocos `sz_css_keyframe_step` de um input → passos da animação. */
function getKeyframeSteps(
  block: Blockly.Block,
  name: string,
): Array<{ at: string; declarations: Record<string, string> }> {
  const out: Array<{ at: string; declarations: Record<string, string> }> = []
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

function htmlContainer(tag: HTMLTag, block: Blockly.Block, seen: Set<string>): RoutedNode {
  const id = f(block, 'ID')
  return {
    kind: 'html',
    value: {
      type: 'element',
      tag,
      ...(id ? { id } : {}),
      children: getHtmlChildren(block, 'CHILDREN', seen),
    },
  }
}

/**
 * Elemento de texto que também pode conter filhos inline (h1..h3, p, span,
 * strong, em, li, label). Usa o campo TEXT quando é só texto e o input CHILDREN
 * quando há filhos aninhados.
 */
function htmlText(tag: HTMLTag, block: Blockly.Block, seen: Set<string>): RoutedNode {
  const text = f(block, 'TEXT')
  const children = getHtmlChildren(block, 'CHILDREN', seen)
  return {
    kind: 'html',
    value: {
      type: 'element',
      tag,
      ...(text ? { text } : {}),
      ...(children.length > 0 ? { children } : {}),
    },
  }
}

/** Presets de `box-shadow` por intensidade. Compartilhado com o round-trip. */
export const SHADOW_PRESETS = {
  sm: '0 1px 3px rgba(0,0,0,0.2)',
  md: '0 4px 12px rgba(0,0,0,0.25)',
  lg: '0 10px 30px rgba(0,0,0,0.35)',
} as const

function blockToIR(block: Blockly.Block, seen: Set<string>): RoutedNode | null {
  switch (block.type) {
    // ---- HTML ----
    case 'sz_html_h1':
      return htmlText('h1', block, seen)
    case 'sz_html_p':
      return htmlText('p', block, seen)
    case 'sz_html_button': {
      const id = f(block, 'ID')
      return {
        kind: 'html',
        value: { type: 'element', tag: 'button', ...(id ? { id } : {}), text: f(block, 'TEXT') },
      }
    }
    case 'sz_html_div':
      return htmlContainer('div', block, seen)
    case 'sz_html_header':
      return htmlContainer('header', block, seen)
    case 'sz_html_nav':
      return htmlContainer('nav', block, seen)
    case 'sz_html_section':
      return htmlContainer('section', block, seen)
    case 'sz_html_main':
      return htmlContainer('main', block, seen)
    case 'sz_html_footer':
      return htmlContainer('footer', block, seen)
    case 'sz_html_ul':
      return htmlContainer('ul', block, seen)
    case 'sz_html_form':
      return htmlContainer('form', block, seen)
    case 'sz_html_h2':
      return htmlText('h2', block, seen)
    case 'sz_html_h3':
      return htmlText('h3', block, seen)
    case 'sz_html_span':
      return htmlText('span', block, seen)
    case 'sz_html_strong':
      return htmlText('strong', block, seen)
    case 'sz_html_em':
      return htmlText('em', block, seen)
    case 'sz_html_li':
      return htmlText('li', block, seen)
    case 'sz_html_label':
      return htmlText('label', block, seen)
    case 'sz_html_link':
      return {
        kind: 'html',
        value: {
          type: 'element',
          tag: 'a',
          text: f(block, 'TEXT'),
          attrs: { href: f(block, 'HREF') },
        },
      }
    case 'sz_html_image':
      return {
        kind: 'html',
        value: {
          type: 'element',
          tag: 'img',
          attrs: { src: f(block, 'SRC'), alt: f(block, 'ALT') },
        },
      }
    case 'sz_html_input': {
      const id = f(block, 'ID')
      return {
        kind: 'html',
        value: {
          type: 'element',
          tag: 'input',
          ...(id ? { id } : {}),
          attrs: { type: f(block, 'TYPE'), placeholder: f(block, 'PLACEHOLDER') },
        },
      }
    }
    case 'sz_html_textarea': {
      const id = f(block, 'ID')
      return {
        kind: 'html',
        value: {
          type: 'element',
          tag: 'textarea',
          ...(id ? { id } : {}),
          attrs: { placeholder: f(block, 'PLACEHOLDER') },
        },
      }
    }
    case 'sz_html_canvas': {
      // Largura/altura saíram do bloco HTML — o tamanho costuma ser definido nos
      // blocos de Canvas (JS). Quando o canvas veio do HTML com width/height
      // (ex.: `<canvas width=200 height=100>`), o workspaceState os guardou no
      // `data` do bloco; recuperamos daqui para o round-trip não os perder.
      const node: Extract<HTMLNode, { type: 'canvas' }> = { type: 'canvas', id: f(block, 'ID') }
      const cls = f(block, 'CLASS')
      if (cls) node.class = cls
      const dims = parseCanvasData((block as unknown as { data?: string | null }).data)
      if (dims.width != null) node.width = dims.width
      if (dims.height != null) node.height = dims.height
      return { kind: 'html', value: node }
    }
    case 'sz_html_text':
      return { kind: 'html', value: { type: 'text', text: f(block, 'TEXT') } }
    case 'sz_html_svg': {
      const id = f(block, 'ID')
      const attrs: Record<string, string> = {}
      for (const [k, field] of [
        ['width', 'WIDTH'],
        ['height', 'HEIGHT'],
        ['viewBox', 'VIEWBOX'],
      ] as const) {
        const v = f(block, field)
        if (v) attrs[k] = v
      }
      return {
        kind: 'html',
        value: {
          type: 'element',
          tag: 'svg',
          ...(id ? { id } : {}),
          ...(Object.keys(attrs).length ? { attrs } : {}),
          children: getHtmlChildren(block, 'CHILDREN', seen),
        },
      }
    }
    case 'sz_svg_group': {
      const id = f(block, 'ID')
      const tr = f(block, 'TRANSFORM')
      return {
        kind: 'html',
        value: {
          type: 'element',
          tag: 'g',
          ...(id ? { id } : {}),
          ...(tr ? { attrs: { transform: tr } } : {}),
          children: getHtmlChildren(block, 'CHILDREN', seen),
        },
      }
    }
    case 'sz_svg_path': {
      const id = f(block, 'ID')
      const attrs: Record<string, string> = {}
      for (const [k, field] of [
        ['d', 'D'],
        ['fill', 'FILL'],
        ['stroke', 'STROKE'],
        ['transform', 'TRANSFORM'],
      ] as const) {
        const v = f(block, field)
        if (v) attrs[k] = v
      }
      return {
        kind: 'html',
        value: { type: 'element', tag: 'path', ...(id ? { id } : {}), attrs },
      }
    }
    case 'sz_svg_circle': {
      const attrs: Record<string, string> = {}
      for (const [k, field] of [
        ['cx', 'CX'],
        ['cy', 'CY'],
        ['r', 'R'],
        ['fill', 'FILL'],
      ] as const) {
        const v = f(block, field)
        if (v) attrs[k] = v
      }
      return { kind: 'html', value: { type: 'element', tag: 'circle', attrs } }
    }
    case 'sz_svg_rect': {
      const attrs: Record<string, string> = {}
      for (const [k, field] of [
        ['x', 'X'],
        ['y', 'Y'],
        ['width', 'WIDTH'],
        ['height', 'HEIGHT'],
        ['fill', 'FILL'],
      ] as const) {
        const v = f(block, field)
        if (v) attrs[k] = v
      }
      return { kind: 'html', value: { type: 'element', tag: 'rect', attrs } }
    }
    case 'sz_svg_line': {
      const attrs: Record<string, string> = {}
      for (const [k, field] of [
        ['x1', 'X1'],
        ['y1', 'Y1'],
        ['x2', 'X2'],
        ['y2', 'Y2'],
        ['stroke', 'STROKE'],
      ] as const) {
        const v = f(block, field)
        if (v) attrs[k] = v
      }
      return { kind: 'html', value: { type: 'element', tag: 'line', attrs } }
    }
    case 'sz_svg_use': {
      const attrs: Record<string, string> = {}
      const href = f(block, 'HREF')
      if (href) attrs.href = href
      const tr = f(block, 'TRANSFORM')
      if (tr) attrs.transform = tr
      return { kind: 'html', value: { type: 'element', tag: 'use', attrs } }
    }
    case 'sz_svg_ellipse': {
      const attrs: Record<string, string> = {}
      for (const [k, field] of [
        ['cx', 'CX'],
        ['cy', 'CY'],
        ['rx', 'RX'],
        ['ry', 'RY'],
        ['fill', 'FILL'],
      ] as const) {
        const v = f(block, field)
        if (v) attrs[k] = v
      }
      return { kind: 'html', value: { type: 'element', tag: 'ellipse', attrs } }
    }
    case 'sz_svg_polyline': {
      const attrs: Record<string, string> = {}
      for (const [k, field] of [
        ['points', 'POINTS'],
        ['fill', 'FILL'],
        ['stroke', 'STROKE'],
      ] as const) {
        const v = f(block, field)
        if (v) attrs[k] = v
      }
      return { kind: 'html', value: { type: 'element', tag: 'polyline', attrs } }
    }
    case 'sz_svg_polygon': {
      const attrs: Record<string, string> = {}
      for (const [k, field] of [
        ['points', 'POINTS'],
        ['fill', 'FILL'],
        ['stroke', 'STROKE'],
      ] as const) {
        const v = f(block, field)
        if (v) attrs[k] = v
      }
      return { kind: 'html', value: { type: 'element', tag: 'polygon', attrs } }
    }
    case 'sz_svg_text': {
      const id = f(block, 'ID')
      const attrs: Record<string, string> = {}
      for (const [k, field] of [
        ['x', 'X'],
        ['y', 'Y'],
        ['fill', 'FILL'],
      ] as const) {
        const v = f(block, field)
        if (v) attrs[k] = v
      }
      const text = f(block, 'TEXT')
      return {
        kind: 'html',
        value: {
          type: 'element',
          tag: 'text',
          ...(id ? { id } : {}),
          ...(text ? { text } : {}),
          ...(Object.keys(attrs).length ? { attrs } : {}),
        },
      }
    }
    case 'sz_adv_raw_html':
      return { kind: 'html', value: { type: 'rawHTML', html: f(block, 'CODE'), advanced: true } }

    // ---- CSS ----
    case 'sz_css_body_background':
      return {
        kind: 'css',
        value: { selector: 'body', declarations: { background: f(block, 'COLOR') } },
      }
    case 'sz_css_body_text_color':
      return {
        kind: 'css',
        value: { selector: 'body', declarations: { color: f(block, 'COLOR') } },
      }
    case 'sz_css_body_center':
      return {
        kind: 'css',
        value: {
          selector: 'body',
          declarations: {
            display: 'flex',
            'flex-direction': 'column',
            'align-items': 'center',
            'justify-content': 'center',
            'min-height': '100vh',
            margin: '0',
          },
        },
      }
    case 'sz_css_width':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { width: `${fn(block, 'VALUE')}px` },
        },
      }
    case 'sz_css_height':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { height: `${fn(block, 'VALUE')}px` },
        },
      }
    case 'sz_css_fill':
      return {
        kind: 'css',
        value: { selector: f(block, 'SELECTOR'), declarations: { fill: f(block, 'VALUE') } },
      }
    case 'sz_css_stroke':
      return {
        kind: 'css',
        value: { selector: f(block, 'SELECTOR'), declarations: { stroke: f(block, 'VALUE') } },
      }
    case 'sz_css_stroke_width':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'stroke-width': `${fn(block, 'VALUE')}` },
        },
      }
    case 'sz_css_stroke_dasharray':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'stroke-dasharray': f(block, 'VALUE') },
        },
      }
    case 'sz_css_stroke_linecap':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'stroke-linecap': f(block, 'VALUE') },
        },
      }
    case 'sz_css_text_anchor':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'text-anchor': f(block, 'VALUE') },
        },
      }
    case 'sz_css_border':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { border: `${fn(block, 'WIDTH')}px solid ${f(block, 'COLOR')}` },
        },
      }
    case 'sz_css_padding':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { padding: `${fn(block, 'VALUE')}px` },
        },
      }
    case 'sz_css_margin':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { margin: `${fn(block, 'VALUE')}px` },
        },
      }
    case 'sz_css_display_flex':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { display: 'flex', 'flex-direction': f(block, 'DIR') },
        },
      }
    case 'sz_css_gap':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { gap: `${fn(block, 'VALUE')}px` },
        },
      }
    case 'sz_css_justify':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'justify-content': f(block, 'VALUE') },
        },
      }
    case 'sz_css_align':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'align-items': f(block, 'VALUE') },
        },
      }
    case 'sz_css_font_size':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'font-size': `${fn(block, 'VALUE')}px` },
        },
      }
    case 'sz_css_font_weight':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'font-weight': f(block, 'VALUE') },
        },
      }
    case 'sz_css_text_align':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'text-align': f(block, 'VALUE') },
        },
      }
    case 'sz_css_text_color':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { color: f(block, 'COLOR') },
        },
      }
    case 'sz_css_text_transform':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'text-transform': f(block, 'VALUE') },
        },
      }
    case 'sz_css_text_decoration':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'text-decoration': f(block, 'VALUE') },
        },
      }
    case 'sz_css_letter_spacing':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'letter-spacing': `${fn(block, 'VALUE')}px` },
        },
      }
    case 'sz_css_background_color':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'background-color': f(block, 'COLOR') },
        },
      }
    case 'sz_css_gradient':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: {
            background: `linear-gradient(135deg, ${f(block, 'C1')}, ${f(block, 'C2')})`,
          },
        },
      }
    case 'sz_css_border_radius':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'border-radius': `${fn(block, 'VALUE')}px` },
        },
      }
    case 'sz_css_shadow':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: {
            'box-shadow':
              SHADOW_PRESETS[f(block, 'LEVEL') as keyof typeof SHADOW_PRESETS] ?? SHADOW_PRESETS.md,
          },
        },
      }
    case 'sz_css_max_width':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { 'max-width': `${fn(block, 'VALUE')}px` },
        },
      }
    case 'sz_css_width_percent':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { width: `${fn(block, 'VALUE')}%` },
        },
      }
    case 'sz_css_rule': {
      const { declarations, declIds } = getCssDeclarations(block, 'CHILDREN')
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations,
          ...(Object.keys(declIds).length > 0 ? { __declIds: declIds } : {}),
        },
      }
    }
    case 'sz_css_google_font':
      return { kind: 'css', value: { type: 'googleFont', family: f(block, 'FONT') || 'Roboto' } }
    case 'sz_css_media_query':
      return {
        kind: 'css',
        value: {
          type: 'mediaQuery',
          feature:
            f(block, 'DIR') === 'min-width' ||
            f(block, 'DIR') === 'max-height' ||
            f(block, 'DIR') === 'min-height'
              ? (f(block, 'DIR') as 'min-width' | 'max-height' | 'min-height')
              : 'max-width',
          px: fn(block, 'PX', 768),
          rules: getCssEntryChildren(block, 'RULES', seen),
        },
      }
    case 'sz_css_transition':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { transition: `all ${fn(block, 'MS', 300)}ms ease` },
        },
      }
    case 'sz_css_grid':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: {
            display: 'grid',
            'grid-template-columns': `repeat(${fn(block, 'COLS', 3)}, 1fr)`,
            gap: `${fn(block, 'GAP', 16)}px`,
          },
        },
      }
    case 'sz_css_keyframes': {
      const from = getCssDeclarations(block, 'FROM').declarations
      const to = getCssDeclarations(block, 'TO').declarations
      const steps: Array<{ at: string; declarations: Record<string, string> }> = []
      if (Object.keys(from).length > 0) steps.push({ at: 'from', declarations: from })
      if (Object.keys(to).length > 0) steps.push({ at: 'to', declarations: to })
      return {
        kind: 'css',
        value: { type: 'keyframes', name: f(block, 'NAME') || 'animacao', steps },
      }
    }
    case 'sz_css_keyframes_steps':
      return {
        kind: 'css',
        value: {
          type: 'keyframes',
          name: f(block, 'NAME') || 'animacao',
          steps: getKeyframeSteps(block, 'STEPS'),
        },
      }
    case 'sz_css_keyframe_step':
      // Só faz sentido dentro de "animação (vários passos)" (coletado por getKeyframeSteps).
      return null
    case 'sz_css_var':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR') || ':root',
          declarations: {
            [`--${f(block, 'VARNAME').replace(/^-+/, '') || 'cor'}`]: f(block, 'VALUE'),
          },
        },
      }
    case 'sz_css_transform':
      return {
        kind: 'css',
        value: { selector: f(block, 'SELECTOR'), declarations: { transform: f(block, 'VALUE') } },
      }
    case 'sz_css_perspective':
      return {
        kind: 'css',
        value: {
          selector: f(block, 'SELECTOR'),
          declarations: { perspective: `${fn(block, 'VALUE')}px` },
        },
      }
    case 'sz_css_grid_template': {
      const cols = f(block, 'COLS')
      const rows = f(block, 'ROWS')
      const declarations: Record<string, string> = { display: 'grid' }
      if (cols) declarations['grid-template-columns'] = cols
      if (rows) declarations['grid-template-rows'] = rows
      return { kind: 'css', value: { selector: f(block, 'SELECTOR'), declarations } }
    }
    case 'sz_css_decl':
      // Só faz sentido como filho de uma "Regra CSS" (coletado por
      // getCssDeclarations); solto no topo é ignorado.
      return null
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
          target: 'document',
          targetKind: 'document',
          event: f(block, 'WHEN') as 'keydown' | 'keyup',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_mousemove':
      return {
        kind: 'js',
        value: {
          type: 'event',
          target: 'document',
          targetKind: 'document',
          event: 'mousemove',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_pointer_down':
      return {
        kind: 'js',
        value: {
          type: 'event',
          target: 'window',
          targetKind: 'window',
          event: 'mousedown',
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_on_pointer_up':
      return {
        kind: 'js',
        value: {
          type: 'event',
          target: 'window',
          targetKind: 'window',
          event: 'mouseup',
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
          type: 'setText',
          targetId: f(block, 'TARGET'),
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
    case 'sz_js_var_increment':
      return {
        kind: 'js',
        value: {
          type: 'assign',
          name: f(block, 'NAME'),
          value: {
            type: 'binop',
            op: '+',
            left: { type: 'var', name: f(block, 'NAME') },
            right: { type: 'num', value: fn(block, 'DELTA', 1) },
          },
        },
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
    case 'sz_canvas_setup':
      return {
        kind: 'js',
        value: { type: 'canvasSetup', canvasId: f(block, 'CANVAS_ID'), varName: f(block, 'CTX') },
      }
    case 'sz_canvas_set_size':
      return {
        kind: 'js',
        value: {
          type: 'canvasSetSize',
          ctxVar: f(block, 'CTX'),
          w: exprInput(block, 'W', { type: 'num', value: 400 }),
          h: exprInput(block, 'H', { type: 'num', value: 300 }),
        },
      }
    case 'sz_canvas_clear': {
      const ctx = f(block, 'CTX')
      return { kind: 'js', value: { type: 'canvasClear', ctxVar: ctx, canvasVar: ctx } }
    }
    case 'sz_canvas_fill_style':
      return {
        kind: 'js',
        value: {
          type: 'canvasFillStyle',
          ctxVar: f(block, 'CTX'),
          color: exprInput(block, 'COLOR', { type: 'color', value: '#22d3ee' }),
        },
      }
    case 'sz_canvas_fill_rect':
      return {
        kind: 'js',
        value: {
          type: 'canvasFillRect',
          ctxVar: f(block, 'CTX'),
          x: exprInput(block, 'X', { type: 'num', value: 10 }),
          y: exprInput(block, 'Y', { type: 'num', value: 10 }),
          w: exprInput(block, 'W', { type: 'num', value: 50 }),
          h: exprInput(block, 'H', { type: 'num', value: 50 }),
        },
      }
    case 'sz_canvas_arc':
      return {
        kind: 'js',
        value: {
          type: 'canvasArc',
          ctxVar: f(block, 'CTX'),
          x: exprInput(block, 'X', { type: 'num', value: 100 }),
          y: exprInput(block, 'Y', { type: 'num', value: 100 }),
          r: exprInput(block, 'R', { type: 'num', value: 20 }),
        },
      }
    case 'sz_canvas_stroke_rect':
      return {
        kind: 'js',
        value: {
          type: 'canvasStrokeRect',
          ctxVar: f(block, 'CTX'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          w: exprInput(block, 'W', { type: 'num', value: 0 }),
          h: exprInput(block, 'H', { type: 'num', value: 0 }),
        },
      }
    case 'sz_canvas_clear_rect':
      return {
        kind: 'js',
        value: {
          type: 'canvasClearRect',
          ctxVar: f(block, 'CTX'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          w: exprInput(block, 'W', { type: 'num', value: 0 }),
          h: exprInput(block, 'H', { type: 'num', value: 0 }),
        },
      }
    case 'sz_canvas_round_rect':
      return {
        kind: 'js',
        value: {
          type: 'canvasRoundRect',
          ctxVar: f(block, 'CTX'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          w: exprInput(block, 'W', { type: 'num', value: 0 }),
          h: exprInput(block, 'H', { type: 'num', value: 0 }),
          r: exprInput(block, 'R', { type: 'num', value: 0 }),
        },
      }
    case 'sz_canvas_ellipse':
      return {
        kind: 'js',
        value: {
          type: 'canvasEllipse',
          ctxVar: f(block, 'CTX'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          rx: exprInput(block, 'RX', { type: 'num', value: 0 }),
          ry: exprInput(block, 'RY', { type: 'num', value: 0 }),
        },
      }
    case 'sz_canvas_arc_slice':
      return {
        kind: 'js',
        value: {
          type: 'canvasArcSlice',
          ctxVar: f(block, 'CTX'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          r: exprInput(block, 'R', { type: 'num', value: 0 }),
          start: exprInput(block, 'START', { type: 'num', value: 0 }),
          end: exprInput(block, 'END', { type: 'num', value: 0 }),
        },
      }
    case 'sz_canvas_quadratic_curve':
      return {
        kind: 'js',
        value: {
          type: 'canvasQuadraticCurve',
          ctxVar: f(block, 'CTX'),
          cpx: exprInput(block, 'CPX', { type: 'num', value: 0 }),
          cpy: exprInput(block, 'CPY', { type: 'num', value: 0 }),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
        },
      }
    case 'sz_canvas_arc_to':
      return {
        kind: 'js',
        value: {
          type: 'canvasArcTo',
          ctxVar: f(block, 'CTX'),
          x1: exprInput(block, 'X1', { type: 'num', value: 0 }),
          y1: exprInput(block, 'Y1', { type: 'num', value: 0 }),
          x2: exprInput(block, 'X2', { type: 'num', value: 0 }),
          y2: exprInput(block, 'Y2', { type: 'num', value: 0 }),
          r: exprInput(block, 'R', { type: 'num', value: 10 }),
        },
      }
    case 'sz_canvas_bezier_curve':
      return {
        kind: 'js',
        value: {
          type: 'canvasBezierCurve',
          ctxVar: f(block, 'CTX'),
          cp1x: exprInput(block, 'CP1X', { type: 'num', value: 0 }),
          cp1y: exprInput(block, 'CP1Y', { type: 'num', value: 0 }),
          cp2x: exprInput(block, 'CP2X', { type: 'num', value: 0 }),
          cp2y: exprInput(block, 'CP2Y', { type: 'num', value: 0 }),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
        },
      }
    case 'sz_canvas_shadow':
      return {
        kind: 'js',
        value: {
          type: 'canvasShadow',
          ctxVar: f(block, 'CTX'),
          color: exprInput(block, 'COLOR', { type: 'color', value: '#000000' }),
          blur: exprInput(block, 'BLUR', { type: 'num', value: 0 }),
        },
      }
    case 'sz_canvas_stroke_text':
      return {
        kind: 'js',
        value: {
          type: 'canvasStrokeText',
          ctxVar: f(block, 'CTX'),
          text: exprInput(block, 'TEXT', { type: 'str', value: '' }),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
        },
      }
    case 'sz_canvas_line_dash':
      return {
        kind: 'js',
        value: {
          type: 'canvasLineDash',
          ctxVar: f(block, 'CTX'),
          segment: exprInput(block, 'SEGMENT', { type: 'num', value: 8 }),
        },
      }

    case 'sz_canvas_fill_text':
      return {
        kind: 'js',
        value: {
          type: 'canvasFillText',
          ctxVar: f(block, 'CTX'),
          text: exprInput(block, 'TEXT', { type: 'str', value: 'Olá' }),
          x: exprInput(block, 'X', { type: 'num', value: 10 }),
          y: exprInput(block, 'Y', { type: 'num', value: 30 }),
        },
      }
    case 'sz_canvas_anim_loop': {
      // Os campos HANDLE / TIME_VAR / DELTA_VAR só existem quando o mutator
      // revelou o respectivo slot (botões +). Ausentes/vazios → loop padrão.
      const handle = f(block, 'HANDLE').trim()
      const timeVar = f(block, 'TIME_VAR').trim()
      const deltaVar = f(block, 'DELTA_VAR').trim()
      return {
        kind: 'js',
        value: {
          type: 'animationLoop',
          body: getStatementChildren(block, 'BODY', seen),
          ...(handle ? { handle } : {}),
          ...(timeVar ? { timeVar } : {}),
          ...(deltaVar ? { deltaVar } : {}),
        },
      }
    }
    case 'sz_canvas_cancel_anim':
      return {
        kind: 'js',
        value: {
          type: 'cancelAnimationFrame',
          handle: exprInput(block, 'HANDLE', { type: 'var', name: 'animId' }),
        },
      }
    case 'sz_canvas_keyboard':
      return { kind: 'js', value: { type: 'keyboardSimple', varName: f(block, 'NAME') } }
    case 'sz_canvas_draw_image':
      return {
        kind: 'js',
        value: {
          type: 'canvasDrawImage',
          ctxVar: f(block, 'CTX'),
          src: f(block, 'SRC'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          w: exprInput(block, 'W', { type: 'num', value: 100 }),
          h: exprInput(block, 'H', { type: 'num', value: 100 }),
        },
      }
    case 'sz_canvas_save':
      return { kind: 'js', value: { type: 'canvasSave', ctxVar: f(block, 'CTX') } }
    case 'sz_canvas_restore':
      return { kind: 'js', value: { type: 'canvasRestore', ctxVar: f(block, 'CTX') } }
    case 'sz_canvas_translate':
      return {
        kind: 'js',
        value: {
          type: 'canvasTranslate',
          ctxVar: f(block, 'CTX'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
        },
      }
    case 'sz_canvas_rotate':
      return {
        kind: 'js',
        value: {
          type: 'canvasRotate',
          ctxVar: f(block, 'CTX'),
          angle: exprInput(block, 'ANGLE', { type: 'num', value: 0 }),
        },
      }
    case 'sz_canvas_scale':
      return {
        kind: 'js',
        value: {
          type: 'canvasScale',
          ctxVar: f(block, 'CTX'),
          sx: exprInput(block, 'SX', { type: 'num', value: 1 }),
          sy: exprInput(block, 'SY', { type: 'num', value: 1 }),
        },
      }
    case 'sz_canvas_gradient':
      return {
        kind: 'js',
        value: {
          type: 'canvasGradient',
          ctxVar: f(block, 'CTX'),
          varName: f(block, 'NAME'),
          x0: exprInput(block, 'X0', { type: 'num', value: 0 }),
          y0: exprInput(block, 'Y0', { type: 'num', value: 0 }),
          x1: exprInput(block, 'X1', { type: 'num', value: 200 }),
          y1: exprInput(block, 'Y1', { type: 'num', value: 0 }),
          stops: [
            { offset: 0, color: f(block, 'C0') },
            { offset: 1, color: f(block, 'C1') },
          ],
        },
      }

    // ---- Canvas: traçado/contorno, fonte e transparência (caminho "na mão") ----
    case 'sz_canvas_begin_path':
      return { kind: 'js', value: { type: 'canvasBeginPath', ctxVar: f(block, 'CTX') } }
    case 'sz_canvas_close_path':
      return { kind: 'js', value: { type: 'canvasClosePath', ctxVar: f(block, 'CTX') } }
    case 'sz_canvas_stroke':
      return { kind: 'js', value: { type: 'canvasStroke', ctxVar: f(block, 'CTX') } }
    case 'sz_canvas_fill':
      return { kind: 'js', value: { type: 'canvasFill', ctxVar: f(block, 'CTX') } }
    case 'sz_canvas_rect':
      return {
        kind: 'js',
        value: {
          type: 'canvasRect',
          ctxVar: f(block, 'CTX'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
          w: exprInput(block, 'W', { type: 'num', value: 100 }),
          h: exprInput(block, 'H', { type: 'num', value: 100 }),
        },
      }
    case 'sz_canvas_clip':
      return { kind: 'js', value: { type: 'canvasClip', ctxVar: f(block, 'CTX') } }
    case 'sz_canvas_move_to':
      return {
        kind: 'js',
        value: {
          type: 'canvasMoveTo',
          ctxVar: f(block, 'CTX'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
        },
      }
    case 'sz_canvas_line_to':
      return {
        kind: 'js',
        value: {
          type: 'canvasLineTo',
          ctxVar: f(block, 'CTX'),
          x: exprInput(block, 'X', { type: 'num', value: 0 }),
          y: exprInput(block, 'Y', { type: 'num', value: 0 }),
        },
      }
    case 'sz_canvas_stroke_style':
      return {
        kind: 'js',
        value: {
          type: 'canvasStrokeStyle',
          ctxVar: f(block, 'CTX'),
          color: exprInput(block, 'COLOR', { type: 'color', value: '#000000' }),
        },
      }
    case 'sz_canvas_line_width':
      return {
        kind: 'js',
        value: {
          type: 'canvasLineWidth',
          ctxVar: f(block, 'CTX'),
          width: exprInput(block, 'WIDTH', { type: 'num', value: 1 }),
        },
      }
    case 'sz_canvas_global_alpha':
      return {
        kind: 'js',
        value: {
          type: 'canvasGlobalAlpha',
          ctxVar: f(block, 'CTX'),
          alpha: exprInput(block, 'ALPHA', { type: 'num', value: 1 }),
        },
      }
    case 'sz_canvas_font': {
      const weight = f(block, 'WEIGHT')
      return {
        kind: 'js',
        value: {
          type: 'canvasFont',
          ctxVar: f(block, 'CTX'),
          size: fn(block, 'SIZE', 20),
          family: f(block, 'FAMILY') || 'sans-serif',
          ...(weight ? { weight: weight as 'bold' | 'italic' | 'italic bold' } : {}),
        },
      }
    }
    case 'sz_canvas_text_align':
      return {
        kind: 'js',
        value: {
          type: 'canvasTextAlign',
          ctxVar: f(block, 'CTX'),
          align: (f(block, 'ALIGN') || 'left') as 'left' | 'center' | 'right',
        },
      }
    case 'sz_canvas_text_baseline':
      return {
        kind: 'js',
        value: {
          type: 'canvasTextBaseline',
          ctxVar: f(block, 'CTX'),
          baseline: (f(block, 'BASELINE') || 'alphabetic') as
            | 'top'
            | 'middle'
            | 'bottom'
            | 'alphabetic',
        },
      }

    // ---- Orientação a objetos ----
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
    case 'sz_js_new_var':
      return {
        kind: 'js',
        value: {
          type: 'newInstance',
          varName: f(block, 'VARNAME'),
          className: f(block, 'CLASS'),
          args: getArgs(block),
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
    case 'sz_js_new_image':
      return {
        kind: 'js',
        value: {
          type: 'newImage',
          varName: f(block, 'VAR'),
          src: exprInput(block, 'SRC', { type: 'str', value: '' }),
        },
      }
    case 'sz_js_image_onload':
      return {
        kind: 'js',
        value: {
          type: 'imageOnLoad',
          target: exprInput(block, 'TARGET', { type: 'var', name: 'img' }),
          body: getStatementChildren(block, 'DO', seen),
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

    case 'sz_g2d_create_tilemap':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:createTileMap',
          varName: f(block, 'NAME'),
          image: f(block, 'IMAGE'),
          tile: exprInput(block, 'TILE', { type: 'num', value: 32 }),
          solid: f(block, 'SOLID'),
          grid: f(block, 'GRID'),
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
    case 'sz_g2d_draw_group':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: { type: 'g2d:drawGroup', groupVar: f(block, 'GROUP'), ctxVar: 'ctx' },
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
    case 'sz_g2d_create_stickhero':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: { type: 'g2d:createStickHero', varName: f(block, 'NAME'), ctxVar: f(block, 'CTX') },
      }
    case 'sz_g2d_update_stickhero':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:updateStickHero', gameVar: f(block, 'GAME') } }
    case 'sz_g2d_restart_stickhero':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:restartStickHero', gameVar: f(block, 'GAME') } }
    case 'sz_g2d_create_balloon':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: { type: 'g2d:createBalloon', varName: f(block, 'NAME'), ctxVar: f(block, 'CTX') },
      }
    case 'sz_g2d_update_balloon':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:updateBalloon', gameVar: f(block, 'GAME') } }
    case 'sz_g2d_restart_balloon':
      seen.add('game-2d')
      return { kind: 'js', value: { type: 'g2d:restartBalloon', gameVar: f(block, 'GAME') } }
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
    case 'sz_g3d_run_enemies':
      seen.add('game-3d')
      return {
        kind: 'js',
        value: {
          type: 'g3d:runEnemies',
          worldVar: f(block, 'WORLD'),
          groupVar: f(block, 'GROUP'),
          groundVar: f(block, 'GROUND'),
          every: exprInput(block, 'EVERY', { type: 'num', value: 200 }),
          speed: exprInput(block, 'SPEED', { type: 'num', value: 0.02 }),
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

    default:
      // Bloco desconhecido — não devemos chegar aqui em uso normal. Loga e ignora.
      console.warn('Bloco desconhecido ignorado:', block.type)
      return null
  }
}

import type * as Blockly from 'blockly/core'
import type { CSSEntry, HTMLNode, HTMLTag, JSExpr, JSStatement, SZIR } from '#ir'
import { getSuperName } from './blocks/extendsMutator'
import { getParamNames } from './blocks/paramsMutator'

/**
 * Percorre o workspace e devolve a SZ-IR. Mantém os blocos top-level em ordem
 * de empilhamento vertical, e dentro de cada pilha caminha pela cadeia
 * `getNextBlock`.
 *
 * Blocos não-reconhecidos viram entradas de "modo avançado" para que nada se
 * perca durante a edição.
 */
export function buildIRFromWorkspace(workspace: Blockly.Workspace): SZIR {
  const ir: SZIR = { html: [], css: [], js: [], extensions: [] }
  const tops = sortTopBlocksReadingOrder(workspace.getTopBlocks(true))
  const seenExtensions = new Set<string>()

  for (const top of tops) {
    if (top.isInsertionMarker()) continue
    visitStack(top, ir, seenExtensions)
  }

  ir.extensions = Array.from(seenExtensions).map((id) => ({ extensionId: id }))
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
        fn: f(block, 'FN') as 'round' | 'floor' | 'ceil' | 'abs' | 'sqrt',
        arg: exprInput(block, 'VALUE', { type: 'num', value: 0 }),
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
    case 'sz_val_concat_arrays':
      return { type: 'concatArrays', parts: getArrayItems(block) }
    case 'sz_val_shuffle':
      return { type: 'shuffle', arrayVar: f(block, 'NAME') }
    case 'sz_val_dataset':
      return { type: 'datasetGet', objectVar: f(block, 'OBJ'), key: f(block, 'KEY') }
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
    case 'sz_html_button':
      return {
        kind: 'html',
        value: { type: 'element', tag: 'button', id: f(block, 'ID'), text: f(block, 'TEXT') },
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
      // Largura/altura saíram do bloco HTML — o tamanho é definido nos blocos
      // de Canvas (JS). Lê campos W/H legados se um projeto antigo os tiver.
      const node: Extract<HTMLNode, { type: 'canvas' }> = { type: 'canvas', id: f(block, 'ID') }
      const w = block.getFieldValue('W')
      const h = block.getFieldValue('H')
      if (w != null && Number.isFinite(Number(w))) node.width = Number(w)
      if (h != null && Number.isFinite(Number(h))) node.height = Number(h)
      return { kind: 'html', value: node }
    }
    case 'sz_html_text':
      return { kind: 'html', value: { type: 'text', text: f(block, 'TEXT') } }
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
    case 'sz_css_media_query':
      return {
        kind: 'css',
        value: {
          type: 'mediaQuery',
          feature: f(block, 'DIR') === 'min-width' ? 'min-width' : 'max-width',
          px: fn(block, 'PX', 768),
          rules: getCssEntryChildren(block, 'RULES', seen),
        },
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
    case 'sz_js_if_else':
      return {
        kind: 'js',
        value: {
          type: 'if',
          cond: exprInput(block, 'COND', { type: 'bool', value: true }),
          then: getStatementChildren(block, 'THEN', seen),
          else: getStatementChildren(block, 'ELSE', seen),
        },
      }
    case 'sz_js_repeat':
      return {
        kind: 'js',
        value: {
          type: 'repeat',
          times: { type: 'num', value: fn(block, 'TIMES', 1) },
          body: getStatementChildren(block, 'DO', seen),
        },
      }
    case 'sz_js_for_each': {
      const indexName = f(block, 'INDEX').trim()
      return {
        kind: 'js',
        value: {
          type: 'forEach',
          arrayVar: f(block, 'NAME'),
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
    case 'sz_js_append_child':
      return {
        kind: 'js',
        value: { type: 'appendChild', parentVar: f(block, 'PARENT'), childVar: f(block, 'CHILD') },
      }
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
    case 'sz_canvas_fill_text':
      return {
        kind: 'js',
        value: {
          type: 'canvasFillText',
          ctxVar: f(block, 'CTX'),
          text: { type: 'str', value: f(block, 'TEXT') },
          x: exprInput(block, 'X', { type: 'num', value: 10 }),
          y: exprInput(block, 'Y', { type: 'num', value: 30 }),
        },
      }
    case 'sz_canvas_anim_loop': {
      // O campo HANDLE só existe quando o mutator revelou "guardar id em [var]"
      // (botão +). Ausente/vazio → loop sem id (comportamento padrão).
      const handle = f(block, 'HANDLE').trim()
      return {
        kind: 'js',
        value: {
          type: 'animationLoop',
          body: getStatementChildren(block, 'BODY', seen),
          ...(handle ? { handle } : {}),
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
          angle: { type: 'num', value: fn(block, 'ANGLE') },
        },
      }
    case 'sz_canvas_scale':
      return {
        kind: 'js',
        value: {
          type: 'canvasScale',
          ctxVar: f(block, 'CTX'),
          sx: { type: 'num', value: fn(block, 'SX', 1) },
          sy: { type: 'num', value: fn(block, 'SY', 1) },
        },
      }
    case 'sz_canvas_gradient':
      return {
        kind: 'js',
        value: {
          type: 'canvasGradient',
          ctxVar: f(block, 'CTX'),
          varName: f(block, 'NAME'),
          x0: { type: 'num', value: fn(block, 'X0') },
          y0: { type: 'num', value: fn(block, 'Y0') },
          x1: { type: 'num', value: fn(block, 'X1') },
          y1: { type: 'num', value: fn(block, 'Y1') },
          stops: [
            { offset: 0, color: f(block, 'C0') },
            { offset: 1, color: f(block, 'C1') },
          ],
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
          x: fn(block, 'X'),
          y: fn(block, 'Y'),
          w: fn(block, 'W'),
          h: fn(block, 'H'),
          color: f(block, 'COLOR'),
        },
      }
    case 'sz_g2d_draw_sprite':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: { type: 'g2d:drawSprite', spriteVar: f(block, 'SPRITE'), ctxVar: f(block, 'CTX') },
      }
    case 'sz_g2d_move_by_keys':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:moveByKeys',
          spriteVar: f(block, 'SPRITE'),
          speed: fn(block, 'SPEED', 3),
        },
      }
    case 'sz_g2d_set_position':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:setPosition',
          spriteVar: f(block, 'SPRITE'),
          x: { type: 'num', value: fn(block, 'X') },
          y: { type: 'num', value: fn(block, 'Y') },
        },
      }
    case 'sz_g2d_set_velocity':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: {
          type: 'g2d:setVelocity',
          spriteVar: f(block, 'SPRITE'),
          vx: { type: 'num', value: fn(block, 'VX') },
          vy: { type: 'num', value: fn(block, 'VY') },
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
        value: { type: 'g2d:score', varName: f(block, 'NAME'), initial: fn(block, 'INITIAL') },
      }
    case 'sz_g2d_game_over':
      seen.add('game-2d')
      return {
        kind: 'js',
        value: { type: 'g2d:gameOver', ctxVar: f(block, 'CTX'), text: f(block, 'TEXT') },
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

    default:
      // Bloco desconhecido — não devemos chegar aqui em uso normal. Loga e ignora.
      console.warn('Bloco desconhecido ignorado:', block.type)
      return null
  }
}

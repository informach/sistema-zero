import { compileStatements, renderNodes } from '#generators'
import type { EventKind, JSExpr, JSStatement, SZIR, SZIRInput } from '#ir'
import { normalizeSZIR, resolveEventTargetKind, screenTextToExpr, valueToExpr } from '#ir'
import { canvasExpressionIRToBlock, canvasStatementIRToBlock } from '../codecs/web/canvasIRToBlock'
import { createCSSIRToBlocks } from '../codecs/web/cssIRToBlocks'
import { htmlIRToBlock } from '../codecs/web/htmlIRToBlock'
import { htmlElementForTag, isSupportedHTMLImageLoading } from '../html/catalog'
import { CANVAS3D_ADDON_CLASSES } from '../three/canvas3dAddons'
import { statementUsesCanvas3D } from '../three/canvas3dContract'
import {
  FRAME_APPEARANCE,
  FRAME_EVENTS,
  FRAME_LOOPS,
  FRAME_START,
  FRAME_STRUCTURE,
  getBlockContract,
} from './blockContracts'
import { isGuidedDomAttributeName, isGuidedDomProperty } from './domSafety'
import { LEGACY_VALUE_FIELDS } from './migrateValueFields'

const ELEMENT_EVENT_BLOCK_TYPES: Partial<Record<EventKind, string>> = {
  click: 'sz_js_on_click',
  mouseover: 'sz_js_on_mouseover',
  submit: 'sz_js_on_submit',
  input: 'sz_js_on_input',
}

const WINDOW_EVENT_BLOCK_TYPES: Partial<Record<EventKind, string>> = {
  resize: 'sz_js_on_resize',
  contextmenu: 'sz_js_on_context_menu',
  blur: 'sz_js_on_blur',
}

const NAMED_ELEMENT_EVENT_KINDS: ReadonlySet<EventKind> = new Set([
  'click',
  'mouseover',
  'mouseout',
  'pointerdown',
  'pointerup',
  'submit',
  'input',
  'change',
  'keydown',
  'keyup',
])

export interface SerializedBlocklyBlock {
  type: string
  id?: string
  x?: number
  y?: number
  fields?: Record<string, string | number>
  /** Soquete: bloco real (`block`) e/ou SOMBRA (`shadow` — literal default que os
   * preenchimentos automáticos podem sobrescrever; ver `restoreShadowLiterals`). */
  inputs?: Record<string, { block?: SerializedBlocklyBlock; shadow?: SerializedBlocklyBlock }>
  next?: { block: SerializedBlocklyBlock }
  /** Estado extra de mutators (ex.: contagem de argumentos do `sz_args_mutator`). */
  extraState?: unknown
  /**
   * Atributos do elemento que nenhum campo do bloco representa (ex.: `class`).
   * Guardados como JSON no `data` do bloco Blockly para preservar o round-trip
   * sem poluir o bloco com campos — ver `extraData`/`mergeBlockData`.
   */
  data?: string
}

/** Tags cujo bloco tem um campo ID (logo, `id` não precisa ir para `data`). */
const ID_FIELD_TAGS = new Set([
  'div',
  'section',
  'header',
  'nav',
  'footer',
  'main',
  'ul',
  'form',
  'button',
  'input',
  'textarea',
  'img',
  'svg',
  'g',
  'defs',
  'symbol',
  'path',
  'circle',
  'ellipse',
  'line',
  'rect',
  'polyline',
  'polygon',
  'use',
  'text',
])

/**
 * Serializa, como JSON, os atributos do elemento que nenhum campo do bloco
 * representa (ex.: `class`, `role`, `data-*`), além do `id` quando o bloco não
 * tem campo de id. Esse JSON vai para o `data` do bloco e é re-mesclado em
 * `buildIRFromWorkspace`, garantindo round-trip sem perda.
 */
function extraData(node: Extract<SZIR['html'][number], { type: 'element' }>): string | undefined {
  const extra: Record<string, string> = {}
  if (node.id && !ID_FIELD_TAGS.has(node.tag)) extra.id = node.id
  const fieldKeys = htmlElementForTag(node.tag)?.modeledAttributes ?? []
  for (const [k, v] of Object.entries(node.attrs ?? {})) {
    // `class` é representado pelo campo CLASS do bloco — não vai para `data`.
    if (k === 'class') continue
    const representedByField =
      fieldKeys.includes(k) &&
      !(node.tag === 'img' && k === 'loading' && !isSupportedHTMLImageLoading(v))
    if (!representedByField) extra[k] = v
  }
  return Object.keys(extra).length > 0 ? JSON.stringify(extra) : undefined
}

export interface SerializedBlocklyWorkspace {
  blocks: {
    languageVersion: 0
    blocks: SerializedBlocklyBlock[]
  }
}

export interface BuildWorkspaceStateOptions {
  startX?: number
  startY?: number
  /** Distância horizontal entre as colunas das Áreas do projeto. */
  colGap?: number
  /**
   * Compatibilidade de chamada. Áreas vazias são sempre omitidas: a Bridge não
   * ressuscita áreas que a criança não criou e projetos novos nascem vazios.
   */
  omitEmptyAuxFrames?: boolean
}

export function buildWorkspaceStateFromIR(
  ir: SZIRInput,
  options: BuildWorkspaceStateOptions = {},
): SerializedBlocklyWorkspace {
  const normalized = normalizeSZIR(ir)
  const startX = options.startX ?? 32
  const startY = options.startY ?? 32
  // Cada categoria vira uma Área do projeto: Estrutura, Aparência, Ao iniciar,
  // Quando acontecer ou Enquanto estiver rodando. É o inverso
  // exato de buildIRFromWorkspace.
  const colGap = options.colGap ?? 420

  const htmlChildren = normalized.html.map(htmlNodeToBlock).filter(isBlock)
  const cssChildren = normalized.css.flatMap(cssEntryToBlocks)
  const allStatements = [
    ...normalized.behavior.start,
    ...normalized.behavior.events,
    ...normalized.behavior.loops,
  ]
  // Gate dos facilitadores do Canvas 3D: só reconhece as formas canônicas do
  // three.js (scene.add, obj.position.set, obj.visible=…) como bloco amigável
  // quando o projeto REALMENTE usa three — senão `Set.add`/`Map.set`/`x.visible`
  // de um projeto 2D viraria bloco 3D (teal, categoria errada). O sinal é o
  // import da lib (o bloco-raiz) ou um `new THREE.…` de topo.
  recognizeThree = allStatements.some(statementUsesCanvas3D)
  audioLoaderVars = collectAudioLoaderVars(allStatements)
  const startChildren = statementsToBlocks(normalized.behavior.start, true)
  const eventChildren = statementsToBlocks(normalized.behavior.events, true)
  const loopChildren = statementsToBlocks(normalized.behavior.loops, true)
  recognizeThree = false
  audioLoaderVars = new Set()

  // Uma área por categoria, somente quando tem conteúdo. A disposição canônica
  // usa duas linhas: HTML/CSS acima e lifecycle abaixo.
  const frameSpecs: Array<[string, SerializedBlocklyBlock[], number, number]> = [
    [FRAME_STRUCTURE, htmlChildren, 0, 0],
    [FRAME_APPEARANCE, cssChildren, 1, 0],
    [FRAME_START, startChildren, 0, 1],
    [FRAME_EVENTS, eventChildren, 1, 1],
    [FRAME_LOOPS, loopChildren, 2, 1],
  ]
  const blocks: SerializedBlocklyBlock[] = []
  const rowGap = 360
  for (const [frameType, children, col, row] of frameSpecs) {
    if (children.length === 0) continue
    blocks.push(
      position(
        block(frameType, {}, { CHILDREN: children }),
        startX + colGap * col,
        startY + rowGap * row,
      ),
    )
  }

  return { blocks: { languageVersion: 0, blocks } }
}

/**
 * Estado Blockly vazio para projeto novo. Nenhuma Área do projeto é criada
 * automaticamente; a criança escolhe as áreas necessárias na paleta.
 */
export function emptyFramesBlocksState(): SerializedBlocklyWorkspace {
  return { blocks: { languageVersion: 0, blocks: [] } }
}

// Implementação num módulo PURO (sem imports) para o PersistenceService poder
// usá-la sem arrastar Blockly ao chunk do núcleo; re-exportada aqui para os
// consumidores existentes do barrel `#blockly`.
export { isBlocksStateEmpty } from './blocksStateShape'

function htmlNodeToBlock(node: SZIR['html'][number]): SerializedBlocklyBlock {
  const built = htmlNodeToBlockInner(node)
  if (node.type === 'element' && built.type !== 'sz_adv_raw_html') {
    // Blocos SVG novos têm classes úteis como default. Ao reconstruir código,
    // o campo vazio precisa ser explícito para o default de criação não alterar
    // o programa importado. Nos demais blocos, mantemos a escrita só quando há classe.
    if (built.type === 'sz_html_svg' || built.type.startsWith('sz_svg_')) {
      built.fields = { ...(built.fields ?? {}), CLASS: node.attrs?.class ?? '' }
    } else if (node.attrs?.class) {
      built.fields = { ...(built.fields ?? {}), CLASS: node.attrs.class }
    }
    const data = extraData(node)
    if (data) built.data = data
  }
  return built
}

function htmlNodeToBlockInner(node: SZIR['html'][number]): SerializedBlocklyBlock {
  if (node.type === 'rawHTML') {
    return block('sz_adv_raw_html', { CODE: node.html }, {}, node.__id)
  }
  const webBlock = htmlIRToBlock(node, {
    block,
    nodeToBlock: htmlNodeToBlock,
    renderNodes,
    renderElementFallback,
  })
  if (webBlock) return webBlock
  return block('sz_adv_raw_html', { CODE: renderNodes([node]) }, {}, node.__id)
}

const cssEntryToBlocks = createCSSIRToBlocks({ block })

function statementsToBlocks(
  statements: JSStatement[],
  lifecycleRootsAllowed = false,
): SerializedBlocklyBlock[] {
  return statements
    .map(statementToBlock)
    .filter(isBlock)
    .map((serialized) => {
      if (lifecycleRootsAllowed) return serialized
      const placement = getBlockContract(serialized.type)?.placement
      if (!placement || placement.root.length === 0 || placement.nested.length > 0) {
        return serialized
      }
      const area = placement.root[0]
      const wrapperType =
        area === 'events'
          ? 'sz_legacy_nested_event'
          : area === 'loops'
            ? 'sz_legacy_nested_loop'
            : 'sz_legacy_nested_start'
      return block(wrapperType, {}, { CHILD: [serialized] })
    })
}

// Propriedades de estilo com opção no dropdown do bloco `sz_js_set_style`; uma
// fora desta lista vai para o campo livre CUSTOM (ex.: animationDuration).
const STYLE_PROP_VALUES: ReadonlySet<string> = new Set([
  'left',
  'top',
  'right',
  'bottom',
  'width',
  'height',
  'opacity',
  'visibility',
  'display',
  'cursor',
  'transform',
  'background',
  'color',
  'zIndex',
])

// ─────────────────────────────────────────────────────────────────────────────
// Canvas 3D — RECONHECIMENTO das formas canônicas do three.js (IR genérica →
// bloco FACILITADOR amigável). É o inverso EXATO do buildIR dos `sz_t3d_*`
// facilitadores: o que aquele compila para memberCall/memberSet, estes
// reconhecem de volta, para o bloco amigável sobreviver a um round-trip pela
// Ponte. Gated por `recognizeThree` (setado em buildWorkspaceStateFromIR) — sem
// isso, `Set.add`/`Map.set`/`x.visible` de um projeto 2D viraria bloco 3D à toa.
// Devolvem null → o statement cai no bloco genérico (chamar método / definir
// propriedade). Registro-espelho: allowlist, valueSockets, LEGACY_VALUE_FIELDS.
// ─────────────────────────────────────────────────────────────────────────────
let recognizeThree = false

// Latch-irmão do `recognizeThree`, para DISCRIMINAR o bloco do nó `loaderLoad`:
// variáveis declaradas como AudioLoader (`new THREE.AudioLoader()` ou
// `const x = new AudioLoader()`) fazem `x.load('nome', …)` voltar como o bloco
// "carregar o som" (sz_t3d_load_sound) em vez de "carregar o modelo". Sem
// AudioLoader declarado, decai para o load_model (o valor sobrevive; só o rótulo
// fica genérico). Setado/zerado junto do recognizeThree.
let audioLoaderVars: ReadonlySet<string> = new Set()

/** Anda o IR (recursão por corpos/valores) coletando nomes de AudioLoader. */
function collectAudioLoaderVars(stmts: readonly JSStatement[]): Set<string> {
  const out = new Set<string>()
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) visit(item)
      return
    }
    const rec = node as Record<string, unknown>
    if (
      rec.type === 'newInstance' &&
      rec.className === 'AudioLoader' &&
      typeof rec.varName === 'string'
    ) {
      out.add(rec.varName)
    }
    if (rec.type === 'var' && typeof rec.name === 'string') {
      const v = rec.value as Record<string, unknown> | null | undefined
      if (v && typeof v === 'object' && v.type === 'newExpr' && v.className === 'AudioLoader') {
        out.add(rec.name)
      }
    }
    for (const val of Object.values(rec)) visit(val)
  }
  visit(stmts)
  return out
}

type VarExpr = Extract<JSExpr, { type: 'var' }>

function asVar(e: JSExpr | undefined): VarExpr | null {
  return e && e.type === 'var' ? e : null
}
function asMemberGet(
  e: JSExpr | undefined,
  name?: string,
): Extract<JSExpr, { type: 'memberGet' }> | null {
  if (e?.type !== 'memberGet') return null
  return name === undefined || e.name === name ? e : null
}
/** Sockets de valor de um facilitador; null se algum arg não vira bloco de valor. */
function valueSocketsOf(
  entries: Array<[string, JSExpr]>,
): Record<string, SerializedBlocklyBlock> | null {
  const out: Record<string, SerializedBlocklyBlock> = {}
  for (const [slot, expr] of entries) {
    const vb = exprToValueBlock(expr)
    if (!vb) return null
    out[slot] = vb
  }
  return out
}

function recognizeT3dCall(
  stmt: Extract<JSStatement, { type: 'memberCall' }>,
): SerializedBlocklyBlock | null {
  if (!recognizeThree) return null
  const { object, method, args } = stmt
  // obj.<prop>.set(x, y, z) — posição / rotação / escala
  const setProp = asMemberGet(object)
  const setBase = setProp && asVar(setProp.object)
  if (method === 'set' && args.length === 3 && setProp && setBase) {
    const type =
      setProp.name === 'position'
        ? 'sz_t3d_set_position'
        : setProp.name === 'rotation'
          ? 'sz_t3d_set_rotation'
          : setProp.name === 'scale'
            ? 'sz_t3d_set_scale'
            : null
    if (type) {
      const vs = valueSocketsOf([
        ['X', args[0] as JSExpr],
        ['Y', args[1] as JSExpr],
        ['Z', args[2] as JSExpr],
      ])
      if (vs) return block(type, { OBJ: setBase.name }, {}, stmt.__id, vs)
    }
  }
  // material.color.set(cor)
  if (method === 'set' && args.length === 1) {
    const colorProp = asMemberGet(object, 'color')
    const owner = colorProp && asVar(colorProp.object)
    if (owner) {
      const vs = valueSocketsOf([['COLOR', args[0] as JSExpr]])
      if (vs) return block('sz_t3d_set_color', { OBJ: owner.name }, {}, stmt.__id, vs)
    }
  }
  const objVar = asVar(object)
  // copias.setMatrixAt(i, molde.matrix)
  if (method === 'setMatrixAt' && args.length === 2) {
    const mesh = asVar(object)
    const matProp = asMemberGet(args[1] as JSExpr, 'matrix')
    const dummy = matProp && asVar(matProp.object)
    if (mesh && dummy) {
      const vs = valueSocketsOf([['I', args[0] as JSExpr]])
      if (vs) {
        return block(
          'sz_t3d_set_matrix_at',
          { DUMMY: dummy.name, MESH: mesh.name },
          {},
          stmt.__id,
          vs,
        )
      }
    }
  }
  // camera.lookAt(x, y, z)
  if (method === 'lookAt' && args.length === 3 && objVar) {
    const vs = valueSocketsOf([
      ['X', args[0] as JSExpr],
      ['Y', args[1] as JSExpr],
      ['Z', args[2] as JSExpr],
    ])
    if (vs) return block('sz_t3d_look_at', { OBJ: objVar.name }, {}, stmt.__id, vs)
  }
  // cena.add(objeto)
  if (method === 'add' && args.length === 1 && objVar) {
    const vs = valueSocketsOf([['OBJ', args[0] as JSExpr]])
    if (vs) return block('sz_t3d_add_to', { TARGET: objVar.name }, {}, stmt.__id, vs)
  }
  // renderizador.setSize(w, h)
  if (method === 'setSize' && args.length === 2 && objVar) {
    const vs = valueSocketsOf([
      ['W', args[0] as JSExpr],
      ['H', args[1] as JSExpr],
    ])
    if (vs) return block('sz_t3d_renderer_size', { R: objVar.name }, {}, stmt.__id, vs)
  }
  // renderizador.render(cena, camera)
  if (method === 'render' && args.length === 2 && objVar) {
    const scene = asVar(args[0] as JSExpr)
    const cam = asVar(args[1] as JSExpr)
    if (scene && cam) {
      return block(
        'sz_t3d_render',
        { SCENE: scene.name, CAMERA: cam.name, R: objVar.name },
        {},
        stmt.__id,
      )
    }
  }
  // composer.render() — desenhar passando pela esteira de efeitos (0 args).
  if (method === 'render' && args.length === 0 && objVar) {
    return block('sz_t3d_render_effects', { COMPOSER: objVar.name }, {}, stmt.__id)
  }
  return null
}

function recognizeT3dSet(
  stmt: Extract<JSStatement, { type: 'memberSet' }>,
): SerializedBlocklyBlock | null {
  if (!recognizeThree) return null
  const { object, name, value } = stmt
  const objVar = asVar(object)
  // cena.background = new THREE.Color(cor)
  if (
    name === 'background' &&
    objVar &&
    value.type === 'newExpr' &&
    value.namespace === 'THREE' &&
    value.className === 'Color' &&
    value.args.length === 1
  ) {
    const vs = valueSocketsOf([['COLOR', value.args[0] as JSExpr]])
    if (vs) return block('sz_t3d_set_background', { SCENE: objVar.name }, {}, stmt.__id, vs)
  }
  // cena.fog = new THREE.Fog(cor, perto, longe)
  if (
    name === 'fog' &&
    objVar &&
    value.type === 'newExpr' &&
    value.namespace === 'THREE' &&
    value.className === 'Fog' &&
    value.args.length === 3
  ) {
    const vs = valueSocketsOf([
      ['COLOR', value.args[0] as JSExpr],
      ['NEAR', value.args[1] as JSExpr],
      ['FAR', value.args[2] as JSExpr],
    ])
    if (vs) return block('sz_t3d_set_fog', { SCENE: objVar.name }, {}, stmt.__id, vs)
  }
  // copias.instanceMatrix.needsUpdate = true
  const instProp = asMemberGet(object, 'instanceMatrix')
  const instOwner = instProp && asVar(instProp.object)
  if (name === 'needsUpdate' && instOwner && value.type === 'bool' && value.value === true) {
    return block('sz_t3d_instances_dirty', { MESH: instOwner.name }, {}, stmt.__id)
  }
  // obj.rotation.<axis> += delta → obj.rotation.<axis> = obj.rotation.<axis> + delta
  const rotProp = asMemberGet(object, 'rotation')
  const rotOwner = rotProp && asVar(rotProp.object)
  if (
    rotOwner &&
    (name === 'x' || name === 'y' || name === 'z') &&
    value.type === 'binop' &&
    value.op === '+'
  ) {
    const leftProp = asMemberGet(value.left)
    const leftRot = leftProp && asMemberGet(leftProp.object, 'rotation')
    const leftBase = leftRot && asVar(leftRot.object)
    if (leftProp && leftProp.name === name && leftBase && leftBase.name === rotOwner.name) {
      const vs = valueSocketsOf([['DELTA', value.right]])
      if (vs) {
        return block('sz_t3d_rotate_axis', { OBJ: rotOwner.name, AXIS: name }, {}, stmt.__id, vs)
      }
    }
  }
  // obj.visible = true/false
  if (name === 'visible' && objVar && value.type === 'bool') {
    return block(
      'sz_t3d_set_visible',
      { OBJ: objVar.name, VAL: value.value ? 'true' : 'false' },
      {},
      stmt.__id,
    )
  }
  // obj.castShadow / obj.receiveShadow = true/false
  if ((name === 'castShadow' || name === 'receiveShadow') && objVar && value.type === 'bool') {
    return block(
      'sz_t3d_set_shadow',
      {
        OBJ: objVar.name,
        KIND: name === 'receiveShadow' ? 'receive' : 'cast',
        VAL: value.value ? 'true' : 'false',
      },
      {},
      stmt.__id,
    )
  }
  // renderizador.shadowMap.enabled = true
  const shadowMap = asMemberGet(object, 'shadowMap')
  const shadowOwner = shadowMap && asVar(shadowMap.object)
  if (name === 'enabled' && shadowOwner && value.type === 'bool' && value.value === true) {
    return block('sz_t3d_enable_shadows', { R: shadowOwner.name }, {}, stmt.__id)
  }
  // luz.intensity = n
  if (name === 'intensity' && objVar) {
    const vs = valueSocketsOf([['N', value]])
    if (vs) return block('sz_t3d_set_intensity', { OBJ: objVar.name }, {}, stmt.__id, vs)
  }
  return null
}

function statementToBlock(stmt: JSStatement): SerializedBlocklyBlock | null {
  const canvasBlock = canvasStatementIRToBlock(stmt, {
    block,
    expressionToBlock: exprToValueBlock,
    rawStatement: rawJSBlock,
    statementsToBlocks,
    valueBlocks,
  })
  if (canvasBlock !== undefined) return canvasBlock
  switch (stmt.type) {
    case 'event': {
      const targetKind = resolveEventTargetKind(stmt.target, stmt.targetKind)
      const targetFields = { TARGET: stmt.target, TARGET_KIND: targetKind }
      if (stmt.event === 'keydown' || stmt.event === 'keyup') {
        return block(
          'sz_js_on_key',
          { ...targetFields, WHEN: stmt.event },
          { DO: statementsToBlocks(stmt.body) },
          stmt.__id,
        )
      }
      if (stmt.event === 'pointermove' || stmt.event === 'mousemove') {
        return block(
          'sz_js_on_mousemove',
          targetFields,
          { DO: statementsToBlocks(stmt.body) },
          stmt.__id,
        )
      }
      if (stmt.event === 'pointerdown' || stmt.event === 'mousedown') {
        return block(
          'sz_js_on_pointer_down',
          targetFields,
          { DO: statementsToBlocks(stmt.body) },
          stmt.__id,
        )
      }
      if (stmt.event === 'pointerup' || stmt.event === 'mouseup') {
        return block(
          'sz_js_on_pointer_up',
          targetFields,
          { DO: statementsToBlocks(stmt.body) },
          stmt.__id,
        )
      }
      if (targetKind === 'document') {
        if (stmt.event === 'click') {
          return block(
            'sz_js_on_click_anywhere',
            {},
            { DO: statementsToBlocks(stmt.body) },
            stmt.__id,
          )
        }
        if (stmt.event === 'fullscreenchange') {
          return block(
            'sz_js_on_fullscreen_change',
            {},
            { DO: statementsToBlocks(stmt.body) },
            stmt.__id,
          )
        }
        return rawJSBlock(stmt)
      }
      if (targetKind === 'window') {
        const blockType = WINDOW_EVENT_BLOCK_TYPES[stmt.event]
        return blockType
          ? block(blockType, {}, { DO: statementsToBlocks(stmt.body) }, stmt.__id)
          : rawJSBlock(stmt)
      }
      const blockType = ELEMENT_EVENT_BLOCK_TYPES[stmt.event]
      if (!blockType) return rawJSBlock(stmt)
      return block(
        blockType,
        { TARGET: stmt.target, TARGET_KIND: targetKind },
        { DO: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    }
    case 'requestFullscreen':
      return block('sz_js_request_fullscreen', {}, {}, stmt.__id)
    case 'exitFullscreen':
      return block('sz_js_exit_fullscreen', {}, {}, stmt.__id)
    case 'toggleFullscreen':
      return block('sz_js_toggle_fullscreen', {}, {}, stmt.__id)
    case 'consoleLog': {
      const text = stringExpr(stmt.value)
      if (text !== null) return block('sz_js_console_log_text', { VALUE: text }, {}, stmt.__id)
      const name = varExpr(stmt.value)
      if (name) return block('sz_js_console_log_var', { NAME: name }, {}, stmt.__id)
      // Qualquer outro valor (juntar texto, objeto, conta…) vai no soquete.
      const value = exprToValueBlock(stmt.value)
      if (value) return block('sz_js_console_log_value', {}, {}, stmt.__id, { VALUE: value })
      return rawJSBlock(stmt)
    }
    case 'alert': {
      const text = stringExpr(stmt.value)
      if (text !== null) return block('sz_js_alert_text', { VALUE: text }, {}, stmt.__id)
      const name = varExpr(stmt.value)
      if (name) return block('sz_js_alert_var', { NAME: name }, {}, stmt.__id)
      return rawJSBlock(stmt)
    }
    case 'getProperty':
      if (!isGuidedDomProperty(stmt.property)) return rawJSBlock(stmt)
      return block(
        'sz_js_get_property',
        {
          PROP: stmt.property,
          TARGET_KIND: stmt.targetKind ?? 'id',
          TARGET: stmt.targetId,
          NAME: stmt.varName,
        },
        {},
        stmt.__id,
      )
    case 'getAttribute':
      return block(
        'sz_js_get_attribute',
        {
          ATTR: stmt.name,
          TARGET_KIND: stmt.targetKind ?? 'id',
          TARGET: stmt.targetId,
          NAME: stmt.varName,
        },
        {},
        stmt.__id,
      )
    case 'setProperty': {
      const kind = stmt.targetKind ?? 'id'
      if (!isGuidedDomProperty(stmt.property)) return rawJSBlock(stmt)
      if (stmt.value.type === 'now')
        return block(
          'sz_js_set_property_calc',
          { PROP: stmt.property, TARGET_KIND: kind, TARGET: stmt.targetId, CALC: stmt.value.kind },
          {},
          stmt.__id,
        )
      const text = stringExpr(stmt.value)
      if (text !== null)
        return block(
          'sz_js_set_property_text',
          { PROP: stmt.property, TARGET_KIND: kind, TARGET: stmt.targetId, VALUE: text },
          {},
          stmt.__id,
        )
      const name = varExpr(stmt.value)
      if (name)
        return block(
          'sz_js_set_property_var',
          { PROP: stmt.property, TARGET_KIND: kind, TARGET: stmt.targetId, NAME: name },
          {},
          stmt.__id,
        )
      // Valor calculado (texto montado, conta, etc.) → bloco com tomada de valor.
      const valueBlock = exprToValueBlock(stmt.value)
      if (valueBlock)
        return block(
          'sz_js_set_property',
          { PROP: stmt.property, TARGET_KIND: kind, TARGET: stmt.targetId },
          {},
          stmt.__id,
          { VALUE: valueBlock },
        )
      return rawJSBlock(stmt)
    }
    case 'setStyle': {
      // 'this' não tem opção no dropdown → mantém como código avançado.
      if (stmt.targetKind === 'this') return rawJSBlock(stmt)
      const valueBlock = exprToValueBlock(stmt.value)
      if (!valueBlock) return rawJSBlock(stmt)
      const known = STYLE_PROP_VALUES.has(stmt.property)
      return block(
        'sz_js_set_style',
        {
          PROP: known ? stmt.property : 'left',
          CUSTOM: known ? '' : stmt.property,
          TARGET_KIND: stmt.targetKind ?? 'id',
          TARGET: stmt.targetId,
        },
        {},
        stmt.__id,
        { VALUE: valueBlock },
      )
    }
    case 'setAttribute': {
      if (stmt.targetKind === 'this' || !isGuidedDomAttributeName(stmt.name)) {
        return rawJSBlock(stmt)
      }
      const valueBlock = exprToValueBlock(stmt.value)
      if (!valueBlock) return rawJSBlock(stmt)
      return block(
        'sz_js_set_attribute',
        { NAME: stmt.name, TARGET_KIND: stmt.targetKind ?? 'id', TARGET: stmt.targetId },
        {},
        stmt.__id,
        { VALUE: valueBlock },
      )
    }
    case 'setText': {
      return statementToBlock({
        ...stmt,
        type: 'setProperty',
        targetKind: 'id',
        property: 'textContent',
      })
    }
    case 'var': {
      const value = exprToValueBlock(stmt.value)
      if (!value) return rawJSBlock(stmt)
      const type = stmt.kind === 'const' ? 'sz_js_const_create' : 'sz_js_var_create'
      return block(type, { NAME: stmt.name }, {}, stmt.__id, { VALUE: value })
    }
    case 'declareVar':
      return block('sz_js_var_declare', { NAME: stmt.name }, {}, stmt.__id)
    case 'assign': {
      const inc = incrementExpr(stmt.name, stmt.value)
      if (inc !== null)
        return block('sz_js_var_increment', { NAME: stmt.name, DELTA: inc }, {}, stmt.__id)
      const value = exprToValueBlock(stmt.value)
      if (!value) return rawJSBlock(stmt)
      return block('sz_js_var_assign', { NAME: stmt.name }, {}, stmt.__id, { VALUE: value })
    }
    case 'if': {
      const cond = exprToValueBlock(stmt.cond)
      if (!cond) return rawJSBlock(stmt)
      const elseif = stmt.elseif ?? []
      const valueInputs: Record<string, SerializedBlocklyBlock> = { COND: cond }
      const stmtInputs: Record<string, SerializedBlocklyBlock[]> = {
        THEN: statementsToBlocks(stmt.then),
      }
      // Condição de algum "senão se" não representável por bloco (ex.: chamada) →
      // o "Se" inteiro cai em código avançado, igual à condição principal.
      for (const [i, clause] of elseif.entries()) {
        const c = exprToValueBlock(clause.cond)
        if (!c) return rawJSBlock(stmt)
        valueInputs[`ELSEIF_COND${i}`] = c
        stmtInputs[`ELSEIF_THEN${i}`] = statementsToBlocks(clause.then)
      }
      const hasElse = stmt.else !== undefined
      if (hasElse) stmtInputs.ELSE = statementsToBlocks(stmt.else ?? [])
      const b = block('sz_js_if_else', {}, stmtInputs, stmt.__id, valueInputs)
      if (elseif.length > 0 || hasElse) {
        b.extraState = {
          ...(elseif.length > 0 ? { elseIf: elseif.length } : {}),
          ...(hasElse ? { hasElse: true } : {}),
        }
      }
      return b
    }
    case 'repeat': {
      const times = exprToValueBlock(stmt.times)
      return times === null
        ? rawJSBlock(stmt)
        : block('sz_js_repeat', {}, { DO: statementsToBlocks(stmt.body) }, stmt.__id, {
            TIMES: times,
          })
    }
    case 'while': {
      const cond = exprToValueBlock(stmt.cond)
      if (!cond) return rawJSBlock(stmt)
      return block('sz_js_while', {}, { DO: statementsToBlocks(stmt.body) }, stmt.__id, {
        COND: cond,
      })
    }
    case 'doWhile': {
      const cond = exprToValueBlock(stmt.cond)
      if (!cond) return rawJSBlock(stmt)
      return block('sz_js_do_while', {}, { DO: statementsToBlocks(stmt.body) }, stmt.__id, {
        COND: cond,
      })
    }
    case 'break':
      return block('sz_js_break', {}, {}, stmt.__id)
    case 'continue':
      return block('sz_js_continue', {}, {}, stmt.__id)
    case 'forOf':
      return block(
        'sz_js_for_of',
        { ITEM: stmt.itemName, NAME: stmt.iterableVar },
        { DO: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'forRange': {
      const from = exprToValueBlock(stmt.from)
      const to = exprToValueBlock(stmt.to)
      const step = exprToValueBlock(stmt.step)
      if (!from || !to || !step) return rawJSBlock(stmt)
      return block(
        'sz_js_for_range',
        { VAR: stmt.varName },
        { DO: statementsToBlocks(stmt.body) },
        stmt.__id,
        {
          FROM: from,
          TO: to,
          STEP: step,
        },
      )
    }
    case 'tryCatch':
      return block(
        'sz_js_try_catch',
        { ERR: stmt.errorName ?? 'erro' },
        {
          BODY: statementsToBlocks(stmt.body),
          HANDLER: statementsToBlocks(stmt.handler),
          FINALLY: statementsToBlocks(stmt.finalizer ?? []),
        },
        stmt.__id,
      )
    case 'forEach': {
      const array = exprToValueBlock(stmt.arrayExpr)
      if (!array) return rawJSBlock(stmt)
      return block(
        'sz_js_for_each',
        { ITEM: stmt.itemName, INDEX: stmt.indexName ?? '' },
        { DO: statementsToBlocks(stmt.body) },
        stmt.__id,
        { ARRAY: array },
      )
    }
    case 'setTimeout': {
      const vs = valueBlocks({ MS: stmt.delay })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_js_set_timeout', {}, { DO: statementsToBlocks(stmt.body) }, stmt.__id, vs)
    }
    case 'setInterval': {
      const vs = valueBlocks({ MS: stmt.delay })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_js_set_interval', {}, { DO: statementsToBlocks(stmt.body) }, stmt.__id, vs)
    }
    case 'setTimeoutSeconds': {
      const vs = valueBlocks({ S: stmt.delay })
      return vs === null
        ? rawJSBlock(stmt)
        : block(
            'sz_js_set_timeout_seconds',
            {},
            { DO: statementsToBlocks(stmt.body) },
            stmt.__id,
            vs,
          )
    }
    case 'setIntervalSeconds': {
      const vs = valueBlocks({ S: stmt.delay })
      return vs === null
        ? rawJSBlock(stmt)
        : block(
            'sz_js_set_interval_seconds',
            {},
            { DO: statementsToBlocks(stmt.body) },
            stmt.__id,
            vs,
          )
    }

    case 'querySelector':
      return block(
        'sz_js_query_selector',
        { SELECTOR: stmt.selector, NAME: stmt.varName },
        {},
        stmt.__id,
      )
    case 'querySelectorAll':
      return block(
        'sz_js_query_selector_all',
        { SELECTOR: stmt.selector, NAME: stmt.varName },
        {},
        stmt.__id,
      )
    case 'storageSet': {
      // O bloco guarda a chave num campo de texto: só representável se for literal.
      if (stmt.key.type !== 'str') return rawJSBlock(stmt)
      const value = exprToValueBlock(stmt.value)
      if (!value) return rawJSBlock(stmt)
      return block('sz_js_storage_set', { STORE: stmt.store, KEY: stmt.key.value }, {}, stmt.__id, {
        VALUE: value,
      })
    }
    case 'eventMethod':
      return block('sz_js_event_method', { METHOD: stmt.method }, {}, stmt.__id)
    case 'fetchJson': {
      // A URL vai num campo de texto: só representável como bloco se for literal.
      if (stmt.url.type !== 'str') return rawJSBlock(stmt)
      return block(
        'sz_js_fetch_json',
        { URL: stmt.url.value, OK: stmt.okName, ERR: stmt.catchName ?? 'erro' },
        {
          BODY: statementsToBlocks(stmt.body),
          CATCH: statementsToBlocks(stmt.catchBody ?? []),
        },
        stmt.__id,
      )
    }
    case 'getElementById':
      return block('sz_js_get_element_by_id', { ID: stmt.id, NAME: stmt.varName }, {}, stmt.__id)
    case 'classOp':
      return block(
        'sz_js_class_op',
        {
          TARGET_KIND: stmt.targetKind ?? 'id',
          TARGET: stmt.targetId,
          OP: stmt.op,
          CLASS: stmt.className,
        },
        {},
        stmt.__id,
      )
    case 'createElement':
      return block('sz_js_create_element', { TAG: stmt.tag, NAME: stmt.varName }, {}, stmt.__id)
    case 'createElementNS':
      return block('sz_js_create_element_ns', { TAG: stmt.tag, NAME: stmt.varName }, {}, stmt.__id)
    case 'appendChild':
      return block(
        'sz_js_append_child',
        { PARENT: stmt.parentVar, CHILD: stmt.childVar },
        {},
        stmt.__id,
      )
    case 'throwError': {
      const msg = exprToValueBlock(stmt.message)
      if (!msg) return rawJSBlock(stmt)
      return block('sz_js_throw', {}, {}, stmt.__id, { MESSAGE: msg })
    }
    case 'objectAssign':
      return block(
        'sz_js_object_assign',
        { SOURCE: stmt.sourceVar, TARGET: stmt.targetVar },
        {},
        stmt.__id,
      )
    case 'switch': {
      const subject = exprToValueBlock(stmt.subject)
      if (!subject) return rawJSBlock(stmt)
      const caseBlocks: SerializedBlocklyBlock[] = []
      for (const c of stmt.cases) {
        const match = exprToValueBlock(c.match)
        if (!match) return rawJSBlock(stmt)
        caseBlocks.push(
          block('sz_js_case', {}, { DO: statementsToBlocks(c.body) }, c.__id, { MATCH: match }),
        )
      }
      return block(
        'sz_js_switch',
        {},
        { CASES: caseBlocks, DEFAULT: statementsToBlocks(stmt.default ?? []) },
        stmt.__id,
        { SUBJECT: subject },
      )
    }
    case 'setDataset': {
      const value = exprToValueBlock(stmt.value)
      if (!value) return rawJSBlock(stmt)
      return block(
        'sz_js_set_dataset',
        { TARGET_KIND: stmt.targetKind ?? 'id', TARGET: stmt.targetId, KEY: stmt.key },
        {},
        stmt.__id,
        { VALUE: value },
      )
    }
    case 'g2d:createSprite': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const w = exprToValueBlock(valueToExpr(stmt.w))
      const h = exprToValueBlock(valueToExpr(stmt.h))
      return x === null || y === null || w === null || h === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_create_sprite', { NAME: stmt.varName, COLOR: stmt.color }, {}, stmt.__id, {
            X: x,
            Y: y,
            W: w,
            H: h,
          })
    }
    case 'g2d:drawSprite':
      return block('sz_g2d_draw_sprite', { SPRITE: stmt.spriteVar }, {}, stmt.__id)
    case 'g2d:setPosition': {
      const x = exprToValueBlock(stmt.x)
      const y = exprToValueBlock(stmt.y)
      return x === null || y === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_set_position', { SPRITE: stmt.spriteVar }, {}, stmt.__id, { X: x, Y: y })
    }
    case 'g2d:setVelocity': {
      const vx = exprToValueBlock(stmt.vx)
      const vy = exprToValueBlock(stmt.vy)
      return vx === null || vy === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_set_velocity', { SPRITE: stmt.spriteVar }, {}, stmt.__id, {
            VX: vx,
            VY: vy,
          })
    }
    case 'g2d:collides':
      return block(
        'sz_g2d_collides',
        { NAME: stmt.varName, A: stmt.aVar, B: stmt.bVar },
        {},
        stmt.__id,
      )
    case 'g2d:score': {
      const initial = exprToValueBlock(valueToExpr(stmt.initial))
      return initial === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_score', { NAME: stmt.varName }, {}, stmt.__id, { INITIAL: initial })
    }
    case 'g2d:gameOver': {
      const text = exprToValueBlock(valueToExpr(stmt.text))
      return text === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_game_over', {}, {}, stmt.__id, { TEXT: text })
    }
    case 'g2d:clear':
      return block('sz_g2d_clear', {}, {}, stmt.__id)
    case 'g2d:onStart':
      return block('sz_g2d_on_start', {}, { BODY: statementsToBlocks(stmt.body) }, stmt.__id)
    case 'g2d:updateEachFrame':
      return block(
        'sz_g2d_update_each_frame',
        {},
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'g2d:setGravity': {
      const value = exprToValueBlock(valueToExpr(stmt.value))
      return value === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_set_gravity', {}, {}, stmt.__id, { VALUE: value })
    }
    case 'g2d:applyVelocity':
      return block('sz_g2d_apply_velocity', { SPRITE: stmt.spriteVar }, {}, stmt.__id)
    case 'g2d:bounceOnEdges':
      return block('sz_g2d_bounce_edges', { SPRITE: stmt.spriteVar }, {}, stmt.__id)
    case 'g2d:circleCollides':
      return block(
        'sz_g2d_circle_collides',
        { NAME: stmt.varName, A: stmt.aVar, B: stmt.bVar },
        {},
        stmt.__id,
      )
    case 'g2d:playSound': {
      const freq = exprToValueBlock(valueToExpr(stmt.freq))
      const ms = exprToValueBlock(valueToExpr(stmt.durationMs))
      return freq === null || ms === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_play_sound', {}, {}, stmt.__id, { FREQ: freq, MS: ms })
    }
    case 'g2d:playFx':
      return block('sz_g2d_play_fx', { FX: stmt.fx }, {}, stmt.__id)
    case 'g2d:playMusic':
      return block('sz_g2d_play_music', { MUSIC: stmt.tune }, {}, stmt.__id)
    case 'g2d:stopMusic':
      return block('sz_g2d_stop_music', {}, {}, stmt.__id)
    case 'g2d:playNote': {
      const ms = exprToValueBlock(valueToExpr(stmt.ms))
      return ms === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_play_note', { NOTE: stmt.note }, {}, stmt.__id, { MS: ms })
    }
    case 'g2d:aimAt':
      return block(
        'sz_g2d_aim_at',
        { SPRITE: stmt.spriteVar, TARGET: stmt.targetVar },
        {},
        stmt.__id,
      )
    case 'g2d:moveToward': {
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      return speed === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g2d_move_toward',
            { SPRITE: stmt.spriteVar, TARGET: stmt.targetVar },
            {},
            stmt.__id,
            { SPEED: speed },
          )
    }
    case 'g2d:setHealth': {
      const amount = exprToValueBlock(valueToExpr(stmt.amount))
      return amount === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_set_health', { SPRITE: stmt.spriteVar }, {}, stmt.__id, { AMOUNT: amount })
    }
    case 'g2d:changeHealth': {
      const delta = exprToValueBlock(valueToExpr(stmt.delta))
      return delta === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_change_health', { SPRITE: stmt.spriteVar }, {}, stmt.__id, { DELTA: delta })
    }
    case 'g2d:damageSprite': {
      const amount = exprToValueBlock(valueToExpr(stmt.amount))
      const frames = exprToValueBlock(valueToExpr(stmt.invincibilityFrames))
      return amount === null || frames === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_damage_sprite', { SPRITE: stmt.spriteVar }, {}, stmt.__id, {
            AMOUNT: amount,
            FRAMES: frames,
          })
    }
    case 'g2d:flipSprite':
      return block('sz_g2d_flip_sprite', { SPRITE: stmt.spriteVar, DIR: stmt.dir }, {}, stmt.__id)
    case 'g2d:setOpacity': {
      const percent = exprToValueBlock(valueToExpr(stmt.percent))
      return percent === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_set_opacity', { SPRITE: stmt.spriteVar }, {}, stmt.__id, {
            PERCENT: percent,
          })
    }
    case 'g2d:setSize': {
      const w = exprToValueBlock(valueToExpr(stmt.w))
      const h = exprToValueBlock(valueToExpr(stmt.h))
      return w === null || h === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_set_size', { SPRITE: stmt.spriteVar }, {}, stmt.__id, { W: w, H: h })
    }
    case 'g2d:scaleSprite': {
      const factor = exprToValueBlock(valueToExpr(stmt.factor))
      return factor === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_scale_sprite', { SPRITE: stmt.spriteVar }, {}, stmt.__id, {
            FACTOR: factor,
          })
    }
    case 'g2d:wrapEdges':
      return block('sz_g2d_wrap_edges', { SPRITE: stmt.spriteVar }, {}, stmt.__id)
    case 'g2d:pruneOld': {
      const seconds = exprToValueBlock(valueToExpr(stmt.seconds))
      return seconds === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_prune_old', { GROUP: stmt.groupVar }, {}, stmt.__id, { SECONDS: seconds })
    }
    case 'g2d:pauseGame':
      return block('sz_g2d_pause', {}, {}, stmt.__id)
    case 'g2d:resumeGame':
      return block('sz_g2d_resume', {}, {}, stmt.__id)
    case 'g2d:cameraFollow': {
      const worldW = exprToValueBlock(valueToExpr(stmt.worldW))
      const worldH = exprToValueBlock(valueToExpr(stmt.worldH))
      return worldW === null || worldH === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_camera_follow', { SPRITE: stmt.spriteVar }, {}, stmt.__id, {
            WORLDW: worldW,
            WORLDH: worldH,
          })
    }
    case 'g2d:setCamera': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      return x === null || y === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_set_camera', {}, {}, stmt.__id, { X: x, Y: y })
    }
    case 'g2d:breakTile':
      return block(
        'sz_g2d_break_tile_at',
        { MAP: stmt.mapVar, SPRITE: stmt.spriteVar },
        {},
        stmt.__id,
      )
    case 'g2d:setTile': {
      const index = exprToValueBlock(valueToExpr(stmt.index))
      return index === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_set_tile', { MAP: stmt.mapVar, SPRITE: stmt.spriteVar }, {}, stmt.__id, {
            INDEX: index,
          })
    }
    case 'g2d:bringToFront':
      return block(
        'sz_g2d_bring_to_front',
        { SPRITE: stmt.spriteVar, GROUP: stmt.groupVar },
        {},
        stmt.__id,
      )
    case 'g2d:sendToBack':
      return block(
        'sz_g2d_send_to_back',
        { SPRITE: stmt.spriteVar, GROUP: stmt.groupVar },
        {},
        stmt.__id,
      )
    case 'g2d:drawHitbox':
      return block('sz_g2d_draw_hitbox', { SPRITE: stmt.spriteVar }, {}, stmt.__id)
    case 'g2d:showFps': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      return x === null || y === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_show_fps', {}, {}, stmt.__id, { X: x, Y: y })
    }
    case 'g2d:onPointer':
      return block(
        'sz_g2d_on_pointer',
        { PX: stmt.xName, PY: stmt.yName },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'g2d:onKey':
      return block(
        'sz_g2d_on_key',
        { KEY: stmt.key },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'g2d:onOverlap':
      return block(
        'sz_g2d_on_overlap',
        { A: stmt.aVar, B: stmt.bVar },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'g2d:createImageSprite': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const w = exprToValueBlock(valueToExpr(stmt.w))
      const h = exprToValueBlock(valueToExpr(stmt.h))
      return x === null || y === null || w === null || h === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g2d_create_image_sprite',
            { NAME: stmt.varName, IMAGE: stmt.image },
            {},
            stmt.__id,
            { X: x, Y: y, W: w, H: h },
          )
    }
    case 'g2d:setImage':
      return block('sz_g2d_set_image', { SPRITE: stmt.spriteVar, IMAGE: stmt.image }, {}, stmt.__id)
    case 'g2d:defineShape':
      return block(
        'sz_g2d_define_shape',
        { NAME: stmt.shapeName },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'g2d:createShapeSprite': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const w = exprToValueBlock(valueToExpr(stmt.w))
      const h = exprToValueBlock(valueToExpr(stmt.h))
      return x === null || y === null || w === null || h === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g2d_create_shape_sprite',
            { SPRITE: stmt.varName, SHAPE: stmt.shapeName },
            {},
            stmt.__id,
            { X: x, Y: y, W: w, H: h },
          )
    }
    case 'g2d:setShape':
      return block(
        'sz_g2d_set_shape',
        { SPRITE: stmt.spriteVar, SHAPE: stmt.shapeName },
        {},
        stmt.__id,
      )
    case 'g2d:paintRect': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const w = exprToValueBlock(valueToExpr(stmt.w))
      const h = exprToValueBlock(valueToExpr(stmt.h))
      return x === null || y === null || w === null || h === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_paint_rect', { COLOR: stmt.color }, {}, stmt.__id, {
            X: x,
            Y: y,
            W: w,
            H: h,
          })
    }
    case 'g2d:paintCircle': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const r = exprToValueBlock(valueToExpr(stmt.r))
      return x === null || y === null || r === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_paint_circle', { COLOR: stmt.color }, {}, stmt.__id, { X: x, Y: y, R: r })
    }
    case 'g2d:paintEllipse': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const w = exprToValueBlock(valueToExpr(stmt.w))
      const h = exprToValueBlock(valueToExpr(stmt.h))
      return x === null || y === null || w === null || h === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_paint_ellipse', { COLOR: stmt.color }, {}, stmt.__id, {
            X: x,
            Y: y,
            W: w,
            H: h,
          })
    }
    case 'g2d:paintTriangle': {
      const x1 = exprToValueBlock(valueToExpr(stmt.x1))
      const y1 = exprToValueBlock(valueToExpr(stmt.y1))
      const x2 = exprToValueBlock(valueToExpr(stmt.x2))
      const y2 = exprToValueBlock(valueToExpr(stmt.y2))
      const x3 = exprToValueBlock(valueToExpr(stmt.x3))
      const y3 = exprToValueBlock(valueToExpr(stmt.y3))
      return x1 === null || y1 === null || x2 === null || y2 === null || x3 === null || y3 === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_paint_triangle', { COLOR: stmt.color }, {}, stmt.__id, {
            X1: x1,
            Y1: y1,
            X2: x2,
            Y2: y2,
            X3: x3,
            Y3: y3,
          })
    }
    case 'g2d:paintLine': {
      const x1 = exprToValueBlock(valueToExpr(stmt.x1))
      const y1 = exprToValueBlock(valueToExpr(stmt.y1))
      const x2 = exprToValueBlock(valueToExpr(stmt.x2))
      const y2 = exprToValueBlock(valueToExpr(stmt.y2))
      const width = exprToValueBlock(valueToExpr(stmt.width))
      return x1 === null || y1 === null || x2 === null || y2 === null || width === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_paint_line', { COLOR: stmt.color }, {}, stmt.__id, {
            X1: x1,
            Y1: y1,
            X2: x2,
            Y2: y2,
            WIDTH: width,
          })
    }
    case 'g2d:loadSpritesheet': {
      const fw = exprToValueBlock(valueToExpr(stmt.frameW))
      const fh = exprToValueBlock(valueToExpr(stmt.frameH))
      return fw === null || fh === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g2d_load_spritesheet',
            { NAME: stmt.varName, IMAGE: stmt.image },
            {},
            stmt.__id,
            { FW: fw, FH: fh },
          )
    }
    case 'g2d:animateSprite': {
      const from = exprToValueBlock(valueToExpr(stmt.from))
      const to = exprToValueBlock(valueToExpr(stmt.to))
      const fps = exprToValueBlock(valueToExpr(stmt.fps))
      return from === null || to === null || fps === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g2d_animate_sprite',
            { SPRITE: stmt.spriteVar, SHEET: stmt.sheetVar },
            {},
            stmt.__id,
            { FROM: from, TO: to, FPS: fps },
          )
    }
    case 'g2d:setStateAnim': {
      const from = exprToValueBlock(valueToExpr(stmt.from))
      const to = exprToValueBlock(valueToExpr(stmt.to))
      const fps = exprToValueBlock(valueToExpr(stmt.fps))
      return from === null || to === null || fps === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g2d_set_state_anim',
            { SPRITE: stmt.spriteVar, STATE: stmt.state, SHEET: stmt.sheetVar },
            {},
            stmt.__id,
            { FROM: from, TO: to, FPS: fps },
          )
    }
    case 'g2d:autoAnimate':
      return block('sz_g2d_auto_animate', { SPRITE: stmt.spriteVar }, {}, stmt.__id)
    case 'g2d:defineEnemyType': {
      const hp = exprToValueBlock(valueToExpr(stmt.hp))
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      const dmg = exprToValueBlock(valueToExpr(stmt.dmg))
      const w = exprToValueBlock(valueToExpr(stmt.w))
      const h = exprToValueBlock(valueToExpr(stmt.h))
      return hp === null || speed === null || dmg === null || w === null || h === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g2d_define_enemy_type',
            {
              NAME: stmt.varName,
              BEHAVIOR: stmt.behavior,
              COLOR: stmt.color,
              IMAGE: stmt.image,
            },
            {},
            stmt.__id,
            { HP: hp, SPEED: speed, DMG: dmg, W: w, H: h },
          )
    }
    case 'g2d:enemyStateAnim': {
      const from = exprToValueBlock(valueToExpr(stmt.from))
      const to = exprToValueBlock(valueToExpr(stmt.to))
      const fps = exprToValueBlock(valueToExpr(stmt.fps))
      return from === null || to === null || fps === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g2d_enemy_state_anim',
            { TYPE: stmt.typeVar, STATE: stmt.state, SHEET: stmt.sheetVar },
            {},
            stmt.__id,
            { FROM: from, TO: to, FPS: fps },
          )
    }
    case 'g2d:setEnemyTypeParam': {
      const value = exprToValueBlock(valueToExpr(stmt.value))
      return value === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g2d_enemy_type_param',
            { TYPE: stmt.typeVar, PARAM: stmt.param },
            {},
            stmt.__id,
            { VALUE: value },
          )
    }
    case 'g2d:spawnEnemy': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      return x === null || y === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_spawn_enemy', { TYPE: stmt.typeVar }, {}, stmt.__id, { X: x, Y: y })
    }
    case 'g2d:updateEnemyType':
      return block(
        'sz_g2d_update_enemy_type',
        { TYPE: stmt.typeVar, TARGET: stmt.targetVar },
        {},
        stmt.__id,
      )
    case 'g2d:drawEnemyType':
      return block('sz_g2d_draw_enemy_type', { TYPE: stmt.typeVar }, {}, stmt.__id)
    case 'g2d:onEnemyDefeated':
      return block(
        'sz_g2d_on_enemy_defeated',
        { TYPE: stmt.typeVar, ANAME: stmt.itemName },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'g2d:onEnemyShotHit':
      return block(
        'sz_g2d_on_enemy_shot_hit',
        { TYPE: stmt.typeVar, SPRITE: stmt.spriteVar, ANAME: stmt.itemName },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'g2d:hurtByEnemy':
      return block(
        'sz_g2d_hurt_by_enemy',
        { SPRITE: stmt.spriteVar, ENEMY: stmt.enemyVar },
        {},
        stmt.__id,
      )
    case 'g2d:drawFrame': {
      const index = exprToValueBlock(valueToExpr(stmt.index))
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const w = exprToValueBlock(valueToExpr(stmt.w))
      const h = exprToValueBlock(valueToExpr(stmt.h))
      return index === null || x === null || y === null || w === null || h === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_draw_frame', { SHEET: stmt.sheetVar }, {}, stmt.__id, {
            INDEX: index,
            X: x,
            Y: y,
            W: w,
            H: h,
          })
    }
    case 'g2d:platformer': {
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      const jump = exprToValueBlock(valueToExpr(stmt.jump))
      return speed === null || jump === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_platformer', { SPRITE: stmt.spriteVar }, {}, stmt.__id, {
            SPEED: speed,
            JUMP: jump,
          })
    }
    case 'g2d:topDown': {
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      return speed === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_top_down', { SPRITE: stmt.spriteVar }, {}, stmt.__id, { SPEED: speed })
    }
    case 'g2d:followPointer': {
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      return speed === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_follow_pointer', { SPRITE: stmt.spriteVar }, {}, stmt.__id, {
            SPEED: speed,
          })
    }
    case 'g2d:clampToScreen':
      return block('sz_g2d_clamp_to_screen', { SPRITE: stmt.spriteVar }, {}, stmt.__id)
    case 'g2d:flash':
      return block('sz_g2d_flash', { COLOR: stmt.color }, {}, stmt.__id)
    case 'g2d:shake': {
      const intensity = exprToValueBlock(valueToExpr(stmt.intensity))
      return intensity === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_shake', {}, {}, stmt.__id, { INTENSITY: intensity })
    }
    case 'g2d:emitParticles': {
      const count = exprToValueBlock(valueToExpr(stmt.count))
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      return count === null || x === null || y === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_emit_particles', { COLOR: stmt.color }, {}, stmt.__id, {
            COUNT: count,
            X: x,
            Y: y,
          })
    }
    case 'g2d:drawParticles':
      return block('sz_g2d_draw_particles', {}, {}, stmt.__id)
    case 'g2d:createTileMap': {
      const tile = exprToValueBlock(valueToExpr(stmt.tile))
      return tile === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g2d_create_tilemap',
            {
              NAME: stmt.varName,
              IMAGE: stmt.image,
              SOLID: stmt.solid,
              PLATFORM: stmt.platform ?? '',
              GRID: stmt.grid,
            },
            {},
            stmt.__id,
            { TILE: tile },
          )
    }
    case 'g2d:createTileMapFromAsset':
      return block(
        'sz_g2d_create_tilemap_from_asset',
        { NAME: stmt.varName, IMAGE: stmt.image },
        {},
        stmt.__id,
      )
    case 'g2d:drawTileMap': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      // IR antigo não tem "size": vira 0 = encaixar sozinho (comportamento de sempre).
      const size = exprToValueBlock(valueToExpr(stmt.size ?? 0))
      return x === null || y === null || size === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_draw_tilemap', { MAP: stmt.mapVar }, {}, stmt.__id, {
            X: x,
            Y: y,
            SIZE: size,
          })
    }
    case 'g2d:tileMapCollide':
      return block(
        'sz_g2d_tilemap_collide',
        { SPRITE: stmt.spriteVar, MAP: stmt.mapVar },
        {},
        stmt.__id,
      )
    case 'g2d:collideGroup':
      return block(
        'sz_g2d_collide_group',
        { SPRITE: stmt.spriteVar, GROUP: stmt.groupVar },
        {},
        stmt.__id,
      )
    case 'g2d:collideSprite':
      return block(
        'sz_g2d_collide_sprite',
        { SPRITE: stmt.spriteVar, OTHER: stmt.otherVar },
        {},
        stmt.__id,
      )
    case 'g2d:createGroup':
      return block('sz_g2d_create_group', { NAME: stmt.varName }, {}, stmt.__id)
    case 'g2d:spawnInGroup': {
      const x = exprToValueBlock(stmt.x)
      const y = exprToValueBlock(stmt.y)
      const vx = exprToValueBlock(stmt.vx)
      const vy = exprToValueBlock(stmt.vy)
      const w = exprToValueBlock(valueToExpr(stmt.w))
      const h = exprToValueBlock(valueToExpr(stmt.h))
      if (!x || !y || !vx || !vy || !w || !h) return rawJSBlock(stmt)
      return block(
        'sz_g2d_spawn_in_group',
        { GROUP: stmt.groupVar, COLOR: stmt.color },
        {},
        stmt.__id,
        { X: x, Y: y, VX: vx, VY: vy, W: w, H: h },
      )
    }
    case 'g2d:spawnImageInGroup': {
      const x = exprToValueBlock(stmt.x)
      const y = exprToValueBlock(stmt.y)
      const vx = exprToValueBlock(stmt.vx)
      const vy = exprToValueBlock(stmt.vy)
      const w = exprToValueBlock(valueToExpr(stmt.w))
      const h = exprToValueBlock(valueToExpr(stmt.h))
      if (!x || !y || !vx || !vy || !w || !h) return rawJSBlock(stmt)
      return block(
        'sz_g2d_spawn_image_in_group',
        { GROUP: stmt.groupVar, IMAGE: stmt.image },
        {},
        stmt.__id,
        { X: x, Y: y, VX: vx, VY: vy, W: w, H: h },
      )
    }
    case 'g2d:updateGroup':
      return block('sz_g2d_update_group', { GROUP: stmt.groupVar }, {}, stmt.__id)
    case 'g2d:updateGroupNoGravity':
      return block('sz_g2d_update_group_no_gravity', { GROUP: stmt.groupVar }, {}, stmt.__id)
    case 'g2d:drawGroup':
      return block('sz_g2d_draw_group', { GROUP: stmt.groupVar }, {}, stmt.__id)
    case 'g2d:forEachInGroup':
      return block(
        'sz_g2d_for_each_in_group',
        { ITEM: stmt.itemName, GROUP: stmt.groupVar },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'g2d:clearGroup':
      return block('sz_g2d_clear_group', { GROUP: stmt.groupVar }, {}, stmt.__id)
    case 'g2d:pruneOffscreen':
      return block(
        'sz_g2d_prune_offscreen',
        { GROUP: stmt.groupVar, ITEM: stmt.itemName },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'g2d:onGroupOverlap':
      return block(
        'sz_g2d_on_group_overlap',
        { A: stmt.aGroup, ANAME: stmt.aName, B: stmt.bGroup, BNAME: stmt.bName },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'g2d:removeFromGroup':
      return block(
        'sz_g2d_remove_from_group',
        { SPRITE: stmt.spriteVar, GROUP: stmt.groupVar },
        {},
        stmt.__id,
      )
    case 'g2d:everyFrames': {
      const n = exprToValueBlock(stmt.n)
      if (!n) return rawJSBlock(stmt)
      return block('sz_g2d_every_frames', {}, { BODY: statementsToBlocks(stmt.body) }, stmt.__id, {
        N: n,
      })
    }
    case 'g2d:everySeconds': {
      const secs = exprToValueBlock(valueToExpr(stmt.seconds))
      return secs === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_every_seconds', {}, { BODY: statementsToBlocks(stmt.body) }, stmt.__id, {
            SECS: secs,
          })
    }
    case 'g2d:drawScore': {
      const value = exprToValueBlock(stmt.value)
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const size = exprToValueBlock(valueToExpr(stmt.size))
      if (!value || !x || !y || !size) return rawJSBlock(stmt)
      return block('sz_g2d_draw_score', { LABEL: stmt.label, COLOR: stmt.color }, {}, stmt.__id, {
        VALUE: value,
        X: x,
        Y: y,
        SIZE: size,
      })
    }
    case 'g2d:drawLabel': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const size = exprToValueBlock(valueToExpr(stmt.size))
      if (!x || !y || !size) return rawJSBlock(stmt)
      return block(
        'sz_g2d_draw_label',
        { TEXT: stmt.text, COLOR: stmt.color, ALIGN: stmt.align },
        {},
        stmt.__id,
        { X: x, Y: y, SIZE: size },
      )
    }
    case 'g2d:drawHearts': {
      const count = exprToValueBlock(stmt.count)
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const size = exprToValueBlock(valueToExpr(stmt.size))
      if (!count || !x || !y || !size) return rawJSBlock(stmt)
      return block('sz_g2d_draw_hearts', { COLOR: stmt.color }, {}, stmt.__id, {
        COUNT: count,
        X: x,
        Y: y,
        SIZE: size,
      })
    }
    case 'g2d:drawSpriteHealth': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const size = exprToValueBlock(valueToExpr(stmt.size))
      if (!x || !y || !size) return rawJSBlock(stmt)
      return block(
        'sz_g2d_draw_sprite_health',
        { SPRITE: stmt.spriteVar, STYLE: stmt.style, COLOR: stmt.color },
        {},
        stmt.__id,
        { X: x, Y: y, SIZE: size },
      )
    }
    case 'g2d:drawBar': {
      const value = exprToValueBlock(stmt.value)
      const max = exprToValueBlock(stmt.max)
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const w = exprToValueBlock(valueToExpr(stmt.w))
      const h = exprToValueBlock(valueToExpr(stmt.h))
      if (!value || !max || !x || !y || !w || !h) return rawJSBlock(stmt)
      return block('sz_g2d_draw_bar', { COLOR: stmt.color }, {}, stmt.__id, {
        VALUE: value,
        MAX: max,
        X: x,
        Y: y,
        W: w,
        H: h,
      })
    }
    case 'g2d:setStageDescription':
      return block('sz_g2d_set_stage_description', { DESCRIPTION: stmt.description }, {}, stmt.__id)
    case 'g2d:setScene':
      return block('sz_g2d_set_scene', { SCENE: stmt.name }, {}, stmt.__id)
    case 'g2d:showScreen': {
      const title = exprToValueBlock(screenTextToExpr(stmt.title))
      const subtitle = exprToValueBlock(screenTextToExpr(stmt.subtitle))
      const hint = exprToValueBlock(screenTextToExpr(stmt.hint))
      if (!title || !subtitle || !hint) return rawJSBlock(stmt)
      return block('sz_g2d_show_screen', { BG: stmt.bg }, {}, stmt.__id, {
        TITLE: title,
        SUBTITLE: subtitle,
        HINT: hint,
      })
    }
    case 'g2d:restart':
      return block('sz_g2d_restart', {}, {}, stmt.__id)
    case 'g2d:starfield': {
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      return speed === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_starfield', {}, {}, stmt.__id, { SPEED: speed })
    }
    case 'g2d:dragX':
      return block('sz_g2d_drag_x', { SPRITE: stmt.spriteVar }, {}, stmt.__id)
    case 'g2d:fitScreen': {
      const percent = exprToValueBlock(valueToExpr(stmt.percent))
      return percent === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_fit_screen', {}, {}, stmt.__id, { PERCENT: percent })
    }
    case 'g2d:setupStage': {
      const w = exprToValueBlock(valueToExpr(stmt.width))
      const h = exprToValueBlock(valueToExpr(stmt.height))
      return w === null || h === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_setup_stage', { BG: stmt.bg }, {}, stmt.__id, { W: w, H: h })
    }
    case 'g2d:setupFull':
      return block('sz_g2d_setup_full', { BG: stmt.bg }, {}, stmt.__id)
    case 'g2d:spawnBullet': {
      const x = exprToValueBlock(stmt.x)
      const y = exprToValueBlock(stmt.y)
      const vx = exprToValueBlock(stmt.vx)
      const vy = exprToValueBlock(stmt.vy)
      const r = exprToValueBlock(valueToExpr(stmt.radius))
      if (!x || !y || !vx || !vy || !r) return rawJSBlock(stmt)
      return block(
        'sz_g2d_spawn_bullet',
        { GROUP: stmt.groupVar, COLOR: stmt.color },
        {},
        stmt.__id,
        { X: x, Y: y, VX: vx, VY: vy, R: r },
      )
    }
    case 'g2d:arrowsX': {
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      return speed === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_arrows_x', { SPRITE: stmt.spriteVar }, {}, stmt.__id, { SPEED: speed })
    }
    case 'g2d:blinkSprite': {
      const frames = exprToValueBlock(valueToExpr(stmt.frames))
      return frames === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_blink', { SPRITE: stmt.spriteVar }, {}, stmt.__id, { FRAMES: frames })
    }
    case 'g2d:createShip': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const w = exprToValueBlock(valueToExpr(stmt.w))
      const h = exprToValueBlock(valueToExpr(stmt.h))
      return x === null || y === null || w === null || h === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g2d_create_ship',
            { NAME: stmt.varName, BODY: stmt.bodyColor, WINGS: stmt.wingColor },
            {},
            stmt.__id,
            { X: x, Y: y, W: w, H: h },
          )
    }
    case 'g2d:spawnAsteroid': {
      const x = exprToValueBlock(stmt.x)
      const y = exprToValueBlock(stmt.y)
      const vx = exprToValueBlock(stmt.vx)
      const vy = exprToValueBlock(stmt.vy)
      const size = exprToValueBlock(valueToExpr(stmt.size))
      if (!x || !y || !vx || !vy || !size) return rawJSBlock(stmt)
      return block(
        'sz_g2d_spawn_asteroid',
        { GROUP: stmt.groupVar, COLOR: stmt.color },
        {},
        stmt.__id,
        { X: x, Y: y, VX: vx, VY: vy, SIZE: size },
      )
    }
    case 'g2d:explode':
      return block('sz_g2d_explode', { SPRITE: stmt.spriteVar, COLOR: stmt.color }, {}, stmt.__id)
    case 'g2d:playShoot':
      return block('sz_g2d_play_shoot', {}, {}, stmt.__id)
    case 'g2d:playExplosion':
      return block('sz_g2d_play_explosion', {}, {}, stmt.__id)
    case 'g2d:onSpriteGroupOverlap':
      return block(
        'sz_g2d_on_sprite_group_overlap',
        { SPRITE: stmt.spriteVar, GROUP: stmt.groupVar, ANAME: stmt.itemName },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'g2d:steerThrust': {
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      const turn = exprToValueBlock(valueToExpr(stmt.turn))
      return speed === null || turn === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_steer_thrust', { SPRITE: stmt.spriteVar }, {}, stmt.__id, {
            SPEED: speed,
            TURN: turn,
          })
    }
    case 'g2d:rotateSprite': {
      const deg = exprToValueBlock(valueToExpr(stmt.deg))
      return deg === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_rotate_sprite', { SPRITE: stmt.spriteVar }, {}, stmt.__id, { DEG: deg })
    }
    case 'g2d:pointSprite': {
      const deg = exprToValueBlock(valueToExpr(stmt.deg))
      return deg === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_point_sprite', { SPRITE: stmt.spriteVar }, {}, stmt.__id, { DEG: deg })
    }
    case 'g2d:thrust': {
      const force = exprToValueBlock(valueToExpr(stmt.force))
      return force === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_thrust', { SPRITE: stmt.spriteVar }, {}, stmt.__id, { FORCE: force })
    }
    case 'g2d:applyFriction': {
      const factor = exprToValueBlock(valueToExpr(stmt.factor))
      return factor === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_apply_friction', { SPRITE: stmt.spriteVar }, {}, stmt.__id, {
            FACTOR: factor,
          })
    }
    case 'g2d:shootFrom': {
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      return speed === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g2d_shoot_from',
            { SPRITE: stmt.spriteVar, GROUP: stmt.groupVar, COLOR: stmt.color },
            {},
            stmt.__id,
            { SPEED: speed },
          )
    }
    case 'g2d:spawnAsteroidEdge': {
      const size = exprToValueBlock(valueToExpr(stmt.size))
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      return size === null || speed === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g2d_spawn_asteroid_edge',
            { GROUP: stmt.groupVar, COLOR: stmt.color },
            {},
            stmt.__id,
            { SIZE: size, SPEED: speed },
          )
    }
    case 'g2d:jumpOnGround': {
      const jump = exprToValueBlock(valueToExpr(stmt.jump))
      return jump === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_jump_on_ground', { SPRITE: stmt.spriteVar }, {}, stmt.__id, { JUMP: jump })
    }
    case 'g2d:createDino': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const size = exprToValueBlock(valueToExpr(stmt.size))
      return x === null || y === null || size === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_create_dino', { NAME: stmt.varName, COLOR: stmt.color }, {}, stmt.__id, {
            X: x,
            Y: y,
            SIZE: size,
          })
    }
    case 'g2d:createStickHero':
      // O ctx é o PADRÃO do palco (não é mais um campo do bloco — B7); a IR mantém
      // ctxVar, mas o bloco só mostra o NOME do jogo.
      return block('sz_g2d_create_stickhero', { NAME: stmt.varName }, {}, stmt.__id)
    case 'g2d:updateStickHero':
      return block('sz_g2d_update_stickhero', { GAME: stmt.gameVar }, {}, stmt.__id)
    case 'g2d:restartStickHero':
      return block('sz_g2d_restart_stickhero', { GAME: stmt.gameVar }, {}, stmt.__id)
    case 'g2d:createBalloon':
      return block('sz_g2d_create_balloon', { NAME: stmt.varName }, {}, stmt.__id)
    case 'g2d:updateBalloon':
      return block('sz_g2d_update_balloon', { GAME: stmt.gameVar }, {}, stmt.__id)
    case 'g2d:restartBalloon':
      return block('sz_g2d_restart_balloon', { GAME: stmt.gameVar }, {}, stmt.__id)
    case 'g2d:controlDino': {
      const jump = exprToValueBlock(valueToExpr(stmt.jump))
      return jump === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_control_dino', { SPRITE: stmt.spriteVar }, {}, stmt.__id, { JUMP: jump })
    }
    case 'g2d:spawnObstacle': {
      const x = exprToValueBlock(stmt.x)
      const vx = exprToValueBlock(stmt.vx)
      const size = exprToValueBlock(valueToExpr(stmt.size))
      if (!x || !vx || !size) return rawJSBlock(stmt)
      return block(
        'sz_g2d_spawn_obstacle',
        { GROUP: stmt.groupVar, SHAPE: stmt.shape },
        {},
        stmt.__id,
        { X: x, VX: vx, SIZE: size },
      )
    }
    case 'g2d:spawnEgg': {
      const x = exprToValueBlock(stmt.x)
      const y = exprToValueBlock(stmt.y)
      const vx = exprToValueBlock(stmt.vx)
      if (!x || !y || !vx) return rawJSBlock(stmt)
      return block('sz_g2d_spawn_egg', { GROUP: stmt.groupVar }, {}, stmt.__id, {
        X: x,
        Y: y,
        VX: vx,
      })
    }
    case 'g2d:forest': {
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      return speed === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_forest', {}, {}, stmt.__id, { SPEED: speed })
    }
    case 'g2d:playJump':
      return block('sz_g2d_play_jump', {}, {}, stmt.__id)
    case 'g2d:playDinoHurt':
      return block('sz_g2d_play_dino_hurt', {}, {}, stmt.__id)
    case 'g2d:playCollect':
      return block('sz_g2d_play_collect', {}, {}, stmt.__id)
    case 'g2d:createCity':
      return block('sz_g2d_create_city', { NAME: stmt.varName }, {}, stmt.__id)
    case 'g2d:drawCity':
      return block('sz_g2d_draw_city', { CITY: stmt.cityVar }, {}, stmt.__id)
    case 'g2d:placeThrower':
      return block(
        'sz_g2d_place_thrower',
        { NAME: stmt.varName, CITY: stmt.cityVar, SIDE: stmt.side, COLOR: stmt.color },
        {},
        stmt.__id,
      )
    case 'g2d:newWind':
      return block('sz_g2d_new_wind', { CITY: stmt.cityVar }, {}, stmt.__id)
    case 'g2d:drawWind':
      return block('sz_g2d_draw_wind', { CITY: stmt.cityVar }, {}, stmt.__id)
    case 'g2d:aimDrag':
      return block('sz_g2d_aim_drag', { THROWER: stmt.throwerVar }, {}, stmt.__id)
    case 'g2d:throwBanana':
      return block(
        'sz_g2d_throw_banana',
        { THROWER: stmt.throwerVar, CITY: stmt.cityVar },
        {},
        stmt.__id,
      )
    case 'g2d:updateBanana':
      return block('sz_g2d_update_banana', { CITY: stmt.cityVar }, {}, stmt.__id)
    case 'g2d:drawBanana':
      return block('sz_g2d_draw_banana', { CITY: stmt.cityVar }, {}, stmt.__id)
    case 'g2d:playWhistle':
      return block('sz_g2d_play_whistle', {}, {}, stmt.__id)
    case 'g2d:playBoom':
      return block('sz_g2d_play_boom', {}, {}, stmt.__id)
    case 'g2d:computerTurn':
      return block(
        'sz_g2d_computer_turn',
        { THROWER: stmt.throwerVar, CITY: stmt.cityVar, ENEMY: stmt.enemyVar },
        {},
        stmt.__id,
      )
    case 'g2d:drawAimReadout':
      return block('sz_g2d_draw_aim_readout', {}, {}, stmt.__id)
    case 'g3d:createScene':
      return block(
        'sz_g3d_create_scene',
        { CANVAS: stmt.canvasId, NAME: stmt.varName },
        {},
        stmt.__id,
      )
    case 'g3d:createFullscreenScene':
      return block(
        'sz_g3d_create_fullscreen_scene',
        { NAME: stmt.varName, BG: stmt.bg },
        {},
        stmt.__id,
      )
    case 'g3d:setBackground':
      return block(
        'sz_g3d_set_background',
        { WORLD: stmt.worldVar, COLOR: stmt.color },
        {},
        stmt.__id,
      )
    case 'g3d:setCameraPosition': {
      const x = exprToValueBlock(stmt.x)
      const y = exprToValueBlock(stmt.y)
      const z = exprToValueBlock(stmt.z)
      if (!x || !y || !z) return rawJSBlock(stmt)
      return block('sz_g3d_set_camera', { WORLD: stmt.worldVar }, {}, stmt.__id, {
        X: x,
        Y: y,
        Z: z,
      })
    }
    case 'g3d:createBox': {
      const size = exprToValueBlock(valueToExpr(stmt.size))
      return size === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g3d_create_box',
            { NAME: stmt.varName, WORLD: stmt.worldVar, COLOR: stmt.color },
            {},
            stmt.__id,
            { SIZE: size },
          )
    }
    case 'g3d:createSphere': {
      const radius = exprToValueBlock(valueToExpr(stmt.radius))
      return radius === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g3d_create_sphere',
            { NAME: stmt.varName, WORLD: stmt.worldVar, COLOR: stmt.color },
            {},
            stmt.__id,
            { RADIUS: radius },
          )
    }
    case 'g3d:setPosition': {
      const x = exprToValueBlock(stmt.x)
      const y = exprToValueBlock(stmt.y)
      const z = exprToValueBlock(stmt.z)
      if (!x || !y || !z) return rawJSBlock(stmt)
      return block('sz_g3d_set_position', { OBJ: stmt.objVar }, {}, stmt.__id, { X: x, Y: y, Z: z })
    }
    case 'g3d:setRotation': {
      const x = exprToValueBlock(stmt.x)
      const y = exprToValueBlock(stmt.y)
      const z = exprToValueBlock(stmt.z)
      if (!x || !y || !z) return rawJSBlock(stmt)
      return block('sz_g3d_set_rotation', { OBJ: stmt.objVar }, {}, stmt.__id, { X: x, Y: y, Z: z })
    }
    case 'g3d:animate':
      return block(
        'sz_g3d_animate',
        { WORLD: stmt.worldVar },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'g3d:createBlock': {
      const w = exprToValueBlock(valueToExpr(stmt.width))
      const h = exprToValueBlock(valueToExpr(stmt.height))
      const d = exprToValueBlock(valueToExpr(stmt.depth))
      return w === null || h === null || d === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g3d_create_block',
            { NAME: stmt.varName, WORLD: stmt.worldVar, COLOR: stmt.color },
            {},
            stmt.__id,
            { W: w, H: h, D: d },
          )
    }
    case 'g3d:setVelocity': {
      const x = exprToValueBlock(stmt.x)
      const y = exprToValueBlock(stmt.y)
      const z = exprToValueBlock(stmt.z)
      if (!x || !y || !z) return rawJSBlock(stmt)
      return block('sz_g3d_set_velocity', { OBJ: stmt.objVar }, {}, stmt.__id, { X: x, Y: y, Z: z })
    }
    case 'g3d:jump': {
      const force = exprToValueBlock(stmt.force)
      if (!force) return rawJSBlock(stmt)
      return block('sz_g3d_jump', { OBJ: stmt.objVar }, {}, stmt.__id, { FORCE: force })
    }
    case 'g3d:setScale': {
      const factor = exprToValueBlock(stmt.factor)
      if (!factor) return rawJSBlock(stmt)
      return block('sz_g3d_set_scale', { OBJ: stmt.objVar }, {}, stmt.__id, { FACTOR: factor })
    }
    case 'g3d:applyGravity':
      return block(
        'sz_g3d_apply_gravity',
        { OBJ: stmt.objVar, GROUND: stmt.groundVar },
        {},
        stmt.__id,
      )
    case 'g3d:controlWithKeys': {
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      return speed === null
        ? rawJSBlock(stmt)
        : block('sz_g3d_control_keys', { OBJ: stmt.objVar }, {}, stmt.__id, { SPEED: speed })
    }
    case 'g3d:cameraFollow':
      return block(
        'sz_g3d_camera_follow',
        { WORLD: stmt.worldVar, OBJ: stmt.objVar },
        {},
        stmt.__id,
      )
    case 'g3d:createGroup':
      return block('sz_g3d_create_group', { NAME: stmt.varName }, {}, stmt.__id)
    case 'g3d:runEnemies': {
      const every = exprToValueBlock(valueToExpr(stmt.every))
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      return every === null || speed === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g3d_run_enemies',
            { WORLD: stmt.worldVar, GROUP: stmt.groupVar, GROUND: stmt.groundVar },
            {},
            stmt.__id,
            { EVERY: every, SPEED: speed },
          )
    }
    case 'g3d:stop':
      return block('sz_g3d_stop', { WORLD: stmt.worldVar }, {}, stmt.__id)
    case 'g3d:createCrossingScene':
      return block(
        'sz_g3d_create_crossing_scene',
        { CANVAS: stmt.canvasId, NAME: stmt.varName },
        {},
        stmt.__id,
      )
    case 'g3d:createCrosser':
      return block(
        'sz_g3d_create_crosser',
        { NAME: stmt.varName, WORLD: stmt.worldVar, COLOR: stmt.color },
        {},
        stmt.__id,
      )
    case 'g3d:crosserMove':
      return block('sz_g3d_crosser_move', { OBJ: stmt.objVar, DIR: stmt.direction }, {}, stmt.__id)
    case 'g3d:crosserStep':
      return block('sz_g3d_crosser_step', { OBJ: stmt.objVar, WORLD: stmt.worldVar }, {}, stmt.__id)
    case 'g3d:crosserReset':
      return block(
        'sz_g3d_crosser_reset',
        { OBJ: stmt.objVar, WORLD: stmt.worldVar },
        {},
        stmt.__id,
      )
    case 'g3d:addRow': {
      const row = exprToValueBlock(stmt.rowIndex)
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      if (!row || !speed) return rawJSBlock(stmt)
      return block(
        'sz_g3d_add_row',
        { WORLD: stmt.worldVar, KIND: stmt.kind, DIR: stmt.direction },
        {},
        stmt.__id,
        { ROW: row, SPEED: speed },
      )
    }
    case 'g3d:generateRows': {
      const count = exprToValueBlock(valueToExpr(stmt.count))
      return count === null
        ? rawJSBlock(stmt)
        : block('sz_g3d_generate_rows', { WORLD: stmt.worldVar }, {}, stmt.__id, { COUNT: count })
    }
    case 'g3d:moveTraffic':
      return block('sz_g3d_move_traffic', { WORLD: stmt.worldVar }, {}, stmt.__id)
    case 'g3d:isometricCamera':
      return block(
        'sz_g3d_isometric_camera',
        { WORLD: stmt.worldVar, FOLLOW: stmt.followVar },
        {},
        stmt.__id,
      )
    case 'g3d:gridStep':
      return block('sz_g3d_grid_step', { OBJ: stmt.objVar }, {}, stmt.__id)
    case 'g3d:gridMove':
      return block('sz_g3d_grid_move', { OBJ: stmt.objVar, DIR: stmt.direction }, {}, stmt.__id)
    case 'g3d:moveAcross': {
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      const min = exprToValueBlock(valueToExpr(stmt.min))
      const max = exprToValueBlock(valueToExpr(stmt.max))
      return speed === null || min === null || max === null
        ? rawJSBlock(stmt)
        : block('sz_g3d_move_across', { GROUP: stmt.groupVar }, {}, stmt.__id, {
            SPEED: speed,
            MIN: min,
            MAX: max,
          })
    }
    case 'g3d:gridPosition': {
      const row = exprToValueBlock(stmt.row)
      const col = exprToValueBlock(stmt.col)
      if (!row || !col) return rawJSBlock(stmt)
      return block('sz_g3d_grid_position', { OBJ: stmt.objVar }, {}, stmt.__id, {
        ROW: row,
        COL: col,
      })
    }
    case 'g3d:topCamera':
      return block(
        'sz_g3d_top_camera',
        { WORLD: stmt.worldVar, FOLLOW: stmt.followVar },
        {},
        stmt.__id,
      )
    case 'g3d:moveInCircle': {
      const radius = exprToValueBlock(valueToExpr(stmt.radius))
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      return radius === null || speed === null
        ? rawJSBlock(stmt)
        : block('sz_g3d_move_in_circle', { OBJ: stmt.objVar }, {}, stmt.__id, {
            RADIUS: radius,
            SPEED: speed,
          })
    }
    case 'g3d:createRaceScene':
      return block(
        'sz_g3d_create_race_scene',
        { CANVAS: stmt.canvasId, NAME: stmt.varName },
        {},
        stmt.__id,
      )
    case 'g3d:createRaceTrack':
      return block('sz_g3d_create_race_track', { WORLD: stmt.worldVar }, {}, stmt.__id)
    case 'g3d:createRaceCar':
      return block(
        'sz_g3d_create_race_car',
        { NAME: stmt.varName, WORLD: stmt.worldVar, COLOR: stmt.color },
        {},
        stmt.__id,
      )
    case 'g3d:raceStep':
      return block('sz_g3d_race_step', { OBJ: stmt.objVar, WORLD: stmt.worldVar }, {}, stmt.__id)
    case 'g3d:raceControl':
      return block('sz_g3d_race_control', { OBJ: stmt.objVar, MODE: stmt.mode }, {}, stmt.__id)
    case 'g3d:runRivals':
      return block('sz_g3d_run_rivals', { WORLD: stmt.worldVar }, {}, stmt.__id)
    case 'g3d:raceReset':
      return block('sz_g3d_race_reset', { OBJ: stmt.objVar, WORLD: stmt.worldVar }, {}, stmt.__id)
    case 'g3d:fall':
      return block('sz_g3d_fall', { OBJ: stmt.objVar }, {}, stmt.__id)
    case 'g3d:slideBetween': {
      const min = exprToValueBlock(valueToExpr(stmt.min))
      const max = exprToValueBlock(valueToExpr(stmt.max))
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      return min === null || max === null || speed === null
        ? rawJSBlock(stmt)
        : block('sz_g3d_slide_between', { OBJ: stmt.objVar, AXIS: stmt.axis }, {}, stmt.__id, {
            MIN: min,
            MAX: max,
            SPEED: speed,
          })
    }
    case 'g3d:spin': {
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      return speed === null
        ? rawJSBlock(stmt)
        : block('sz_g3d_spin', { OBJ: stmt.objVar, AXIS: stmt.axis }, {}, stmt.__id, {
            SPEED: speed,
          })
    }
    case 'g3d:createStackScene':
      return block(
        'sz_g3d_create_stack_scene',
        { CANVAS: stmt.canvasId, NAME: stmt.varName },
        {},
        stmt.__id,
      )
    case 'g3d:createStackTower':
      return block('sz_g3d_create_stack_tower', { WORLD: stmt.worldVar }, {}, stmt.__id)
    case 'g3d:stackDrop':
      return block('sz_g3d_stack_drop', { WORLD: stmt.worldVar }, {}, stmt.__id)
    case 'g3d:stackStep':
      return block('sz_g3d_stack_step', { WORLD: stmt.worldVar }, {}, stmt.__id)
    case 'g3d:stackReset':
      return block('sz_g3d_stack_reset', { WORLD: stmt.worldVar }, {}, stmt.__id)
    case 'g3d:moveBy': {
      const x = exprToValueBlock(stmt.x)
      const y = exprToValueBlock(stmt.y)
      const z = exprToValueBlock(stmt.z)
      if (!x || !y || !z) return rawJSBlock(stmt)
      return block('sz_g3d_move_by', { OBJ: stmt.objVar }, {}, stmt.__id, { X: x, Y: y, Z: z })
    }
    case 'g3d:rotateBy': {
      const amount = exprToValueBlock(stmt.amount)
      if (!amount) return rawJSBlock(stmt)
      return block('sz_g3d_rotate_by', { OBJ: stmt.objVar, AXIS: stmt.axis }, {}, stmt.__id, {
        AMOUNT: amount,
      })
    }
    case 'g3d:moveTowards': {
      const x = exprToValueBlock(stmt.x)
      const y = exprToValueBlock(stmt.y)
      const z = exprToValueBlock(stmt.z)
      const factor = exprToValueBlock(valueToExpr(stmt.factor))
      if (!x || !y || !z || !factor) return rawJSBlock(stmt)
      return block('sz_g3d_move_towards', { OBJ: stmt.objVar }, {}, stmt.__id, {
        X: x,
        Y: y,
        Z: z,
        FACTOR: factor,
      })
    }
    case 'g3d:lookAtObject':
      return block('sz_g3d_look_at_object', { A: stmt.aVar, B: stmt.bVar }, {}, stmt.__id)
    case 'g3d:lookAtPoint': {
      const x = exprToValueBlock(stmt.x)
      const y = exprToValueBlock(stmt.y)
      const z = exprToValueBlock(stmt.z)
      if (!x || !y || !z) return rawJSBlock(stmt)
      return block('sz_g3d_look_at_point', { OBJ: stmt.objVar }, {}, stmt.__id, {
        X: x,
        Y: y,
        Z: z,
      })
    }
    case 'g3d:moveForward': {
      const dist = exprToValueBlock(stmt.dist)
      if (!dist) return rawJSBlock(stmt)
      return block('sz_g3d_move_forward', { OBJ: stmt.objVar }, {}, stmt.__id, { DIST: dist })
    }
    case 'g3d:faceVelocity':
      return block('sz_g3d_face_velocity', { OBJ: stmt.objVar }, {}, stmt.__id)
    case 'g3d:body': {
      const gravity = exprToValueBlock(valueToExpr(stmt.gravity))
      return gravity === null
        ? rawJSBlock(stmt)
        : block('sz_g3d_body', { OBJ: stmt.objVar }, {}, stmt.__id, { GRAVITY: gravity })
    }
    case 'g3d:stepBody':
      return block('sz_g3d_step_body', { OBJ: stmt.objVar, WORLD: stmt.worldVar }, {}, stmt.__id)
    case 'g3d:setSolid':
      return block('sz_g3d_set_solid', { OBJ: stmt.objVar }, {}, stmt.__id)
    case 'g3d:platformerControls': {
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      const jump = exprToValueBlock(valueToExpr(stmt.jump))
      return speed === null || jump === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g3d_platformer_controls',
            { OBJ: stmt.objVar, WORLD: stmt.worldVar },
            {},
            stmt.__id,
            { SPEED: speed, JUMP: jump },
          )
    }
    case 'g3d:fpsControls': {
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      return speed === null
        ? rawJSBlock(stmt)
        : block('sz_g3d_fps_controls', { OBJ: stmt.objVar, WORLD: stmt.worldVar }, {}, stmt.__id, {
            SPEED: speed,
          })
    }
    case 'g3d:resolveCollision':
      return block('sz_g3d_resolve_collision', { A: stmt.aVar, B: stmt.bVar }, {}, stmt.__id)
    case 'g3d:fpsCamera':
      return block('sz_g3d_fps_camera', { WORLD: stmt.worldVar, OBJ: stmt.objVar }, {}, stmt.__id)
    case 'g3d:orbitCamera':
      return block('sz_g3d_orbit_camera', { WORLD: stmt.worldVar, OBJ: stmt.objVar }, {}, stmt.__id)
    case 'g3d:thirdPersonCamera': {
      const dist = exprToValueBlock(valueToExpr(stmt.dist))
      const height = exprToValueBlock(valueToExpr(stmt.height))
      return dist === null || height === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g3d_third_person_camera',
            { WORLD: stmt.worldVar, OBJ: stmt.objVar },
            {},
            stmt.__id,
            { DIST: dist, HEIGHT: height },
          )
    }
    case 'g3d:cameraLookAt':
      return block(
        'sz_g3d_camera_look_at',
        { WORLD: stmt.worldVar, OBJ: stmt.objVar },
        {},
        stmt.__id,
      )
    case 'g3d:setFOV': {
      const deg = exprToValueBlock(valueToExpr(stmt.deg))
      return deg === null
        ? rawJSBlock(stmt)
        : block('sz_g3d_set_fov', { WORLD: stmt.worldVar }, {}, stmt.__id, { DEG: deg })
    }
    case 'g3d:createCylinder': {
      const radius = exprToValueBlock(valueToExpr(stmt.radius))
      const height = exprToValueBlock(valueToExpr(stmt.height))
      return radius === null || height === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g3d_create_cylinder',
            { NAME: stmt.varName, WORLD: stmt.worldVar, COLOR: stmt.color },
            {},
            stmt.__id,
            { RADIUS: radius, HEIGHT: height },
          )
    }
    case 'g3d:createCone': {
      const radius = exprToValueBlock(valueToExpr(stmt.radius))
      const height = exprToValueBlock(valueToExpr(stmt.height))
      return radius === null || height === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g3d_create_cone',
            { NAME: stmt.varName, WORLD: stmt.worldVar, COLOR: stmt.color },
            {},
            stmt.__id,
            { RADIUS: radius, HEIGHT: height },
          )
    }
    case 'g3d:createPlane': {
      const w = exprToValueBlock(valueToExpr(stmt.width))
      const d = exprToValueBlock(valueToExpr(stmt.depth))
      return w === null || d === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g3d_create_plane',
            { NAME: stmt.varName, WORLD: stmt.worldVar, COLOR: stmt.color },
            {},
            stmt.__id,
            { W: w, D: d },
          )
    }
    case 'g3d:createTorus': {
      const radius = exprToValueBlock(valueToExpr(stmt.radius))
      const tube = exprToValueBlock(valueToExpr(stmt.tube))
      return radius === null || tube === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g3d_create_torus',
            { NAME: stmt.varName, WORLD: stmt.worldVar, COLOR: stmt.color },
            {},
            stmt.__id,
            { RADIUS: radius, TUBE: tube },
          )
    }
    case 'g3d:createModel':
      return block(
        'sz_g3d_create_model',
        { NAME: stmt.varName, WORLD: stmt.worldVar },
        {},
        stmt.__id,
      )
    case 'g3d:setColor':
      return block('sz_g3d_set_color', { OBJ: stmt.objVar, COLOR: stmt.color }, {}, stmt.__id)
    case 'g3d:setOpacity': {
      const opacity = exprToValueBlock(valueToExpr(stmt.opacity))
      return opacity === null
        ? rawJSBlock(stmt)
        : block('sz_g3d_set_opacity', { OBJ: stmt.objVar }, {}, stmt.__id, { OPACITY: opacity })
    }
    case 'g3d:setMaterial':
      return block('sz_g3d_set_material', { OBJ: stmt.objVar, KIND: stmt.kind }, {}, stmt.__id)
    case 'g3d:setTexture':
      return block('sz_g3d_set_texture', { OBJ: stmt.objVar, ASSET: stmt.asset }, {}, stmt.__id)
    case 'g3d:setVisible':
      return block('sz_g3d_set_visible', { OBJ: stmt.objVar, MODE: stmt.mode }, {}, stmt.__id)
    case 'g3d:removeObject':
      return block(
        'sz_g3d_remove_object',
        { WORLD: stmt.worldVar, OBJ: stmt.objVar },
        {},
        stmt.__id,
      )
    case 'g3d:addToModel':
      return block(
        'sz_g3d_add_to_model',
        { MODEL: stmt.modelVar, PART: stmt.partVar },
        {},
        stmt.__id,
      )
    case 'g3d:addAmbientLight': {
      const intensity = exprToValueBlock(valueToExpr(stmt.intensity))
      return intensity === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g3d_add_ambient_light',
            { WORLD: stmt.worldVar, COLOR: stmt.color },
            {},
            stmt.__id,
            { INTENSITY: intensity },
          )
    }
    case 'g3d:addSunLight': {
      const intensity = exprToValueBlock(valueToExpr(stmt.intensity))
      return intensity === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g3d_add_sun_light',
            { WORLD: stmt.worldVar, COLOR: stmt.color },
            {},
            stmt.__id,
            { INTENSITY: intensity },
          )
    }
    case 'g3d:addPointLight': {
      const intensity = exprToValueBlock(valueToExpr(stmt.intensity))
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return intensity === null || x === null || y === null || z === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g3d_add_point_light',
            { WORLD: stmt.worldVar, COLOR: stmt.color },
            {},
            stmt.__id,
            { INTENSITY: intensity, X: x, Y: y, Z: z },
          )
    }
    case 'g3d:setFog': {
      const near = exprToValueBlock(valueToExpr(stmt.near))
      const far = exprToValueBlock(valueToExpr(stmt.far))
      return near === null || far === null
        ? rawJSBlock(stmt)
        : block('sz_g3d_set_fog', { WORLD: stmt.worldVar, COLOR: stmt.color }, {}, stmt.__id, {
            NEAR: near,
            FAR: far,
          })
    }
    case 'g3d:setSky':
      return block(
        'sz_g3d_set_sky',
        { WORLD: stmt.worldVar, TOP: stmt.top, BOTTOM: stmt.bottom },
        {},
        stmt.__id,
      )
    case 'g3d:setShadows':
      return block('sz_g3d_set_shadows', { WORLD: stmt.worldVar, MODE: stmt.mode }, {}, stmt.__id)
    case 'g3d:createSwarm':
      return block(
        'sz_g3d_create_swarm',
        { NAME: stmt.varName, WORLD: stmt.worldVar },
        {},
        stmt.__id,
      )
    case 'g3d:spawnInSwarm': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return x === null || y === null || z === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g3d_spawn_in_swarm',
            { SWARM: stmt.swarmVar, ORIGINAL: stmt.originalVar },
            {},
            stmt.__id,
            { X: x, Y: y, Z: z },
          )
    }
    case 'g3d:forEachInSwarm':
      return block(
        'sz_g3d_for_each_swarm',
        { SWARM: stmt.swarmVar, ITEM: stmt.itemName },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'g3d:removeFromSwarm':
      return block(
        'sz_g3d_remove_from_swarm',
        { SWARM: stmt.swarmVar, ITEM: stmt.itemVar },
        {},
        stmt.__id,
      )
    case 'g3d:pruneSwarm': {
      const min = exprToValueBlock(valueToExpr(stmt.min))
      const max = exprToValueBlock(valueToExpr(stmt.max))
      return min === null || max === null
        ? rawJSBlock(stmt)
        : block('sz_g3d_prune_swarm', { SWARM: stmt.swarmVar, AXIS: stmt.axis }, {}, stmt.__id, {
            MIN: min,
            MAX: max,
          })
    }
    case 'g3d:playNote': {
      const freq = exprToValueBlock(valueToExpr(stmt.freq))
      const ms = exprToValueBlock(valueToExpr(stmt.ms))
      return freq === null || ms === null
        ? rawJSBlock(stmt)
        : block('sz_g3d_play_note', {}, {}, stmt.__id, { FREQ: freq, MS: ms })
    }
    case 'g3d:playEffect':
      return block('sz_g3d_play_effect', { KIND: stmt.kind }, {}, stmt.__id)
    // ----- game-2d-advanced (kit profissional) -----
    case 'gk:setup': {
      const w = exprToValueBlock(valueToExpr(stmt.w))
      const h = exprToValueBlock(valueToExpr(stmt.h))
      return w === null || h === null
        ? rawJSBlock(stmt)
        : block('sz_gk_setup', { BG: stmt.bg, ACCENT: stmt.accent }, {}, stmt.__id, { W: w, H: h })
    }
    case 'gk:setupFull':
      return block('sz_gk_setup_full', { BG: stmt.bg, ACCENT: stmt.accent }, {}, stmt.__id)
    case 'gk:start':
      return block('sz_gk_start', {}, {}, stmt.__id)
    case 'gk:loadImage':
      return block('sz_gk_load_image', { NAME: stmt.name, ASSET: stmt.asset }, {}, stmt.__id)
    case 'gk:setScreenText': {
      const title = exprToValueBlock(valueToExpr(stmt.title))
      const text = exprToValueBlock(valueToExpr(stmt.text))
      const button = exprToValueBlock(valueToExpr(stmt.button))
      return title === null || text === null || button === null
        ? rawJSBlock(stmt)
        : block('sz_gk_set_screen_text', { SCREEN: stmt.screen }, {}, stmt.__id, {
            TITLE: title,
            TEXT: text,
            BTN: button,
          })
    }
    case 'gk:createScreen': {
      const title = exprToValueBlock(valueToExpr(stmt.title))
      const text = exprToValueBlock(valueToExpr(stmt.text))
      return title === null || text === null
        ? rawJSBlock(stmt)
        : block('sz_gk_create_screen', { NAME: stmt.name }, {}, stmt.__id, {
            TITLE: title,
            TEXT: text,
          })
    }
    case 'gk:addButton': {
      const label = exprToValueBlock(valueToExpr(stmt.label))
      return label === null
        ? rawJSBlock(stmt)
        : block(
            'sz_gk_add_button',
            { SCREEN: stmt.screen },
            { BODY: statementsToBlocks(stmt.body) },
            stmt.__id,
            { LABEL: label },
          )
    }
    case 'gk:setScreenBg':
      return block(
        'sz_gk_set_screen_bg',
        { SCREEN: stmt.screen, COLOR: stmt.color, IMAGE: stmt.image },
        {},
        stmt.__id,
      )
    case 'gk:showScreen':
      return block('sz_gk_show_screen', { SCREEN: stmt.name }, {}, stmt.__id)
    case 'gk:hideScreens':
      return block('sz_gk_hide_screens', {}, {}, stmt.__id)
    case 'gk:setState':
      return block('sz_gk_set_state', { STATE: stmt.name }, {}, stmt.__id)
    case 'gk:restartGame':
      return block('sz_gk_restart_game', {}, {}, stmt.__id)
    case 'gk:onGameStart':
      return block('sz_gk_on_game_start', {}, { BODY: statementsToBlocks(stmt.body) }, stmt.__id)
    case 'gk:onEnterState':
      return block(
        'sz_gk_on_enter_state',
        { STATE: stmt.name },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'gk:pause':
      return block('sz_gk_pause', {}, {}, stmt.__id)
    case 'gk:resume':
      return block('sz_gk_resume', {}, {}, stmt.__id)
    case 'gk:returnToMenu':
      return block('sz_gk_return_to_menu', {}, {}, stmt.__id)
    case 'gk:endGame':
      return block('sz_gk_end_game', {}, {}, stmt.__id)
    case 'gk:onUpdate':
      return block(
        'sz_gk_on_update',
        { DT: stmt.dtName },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'gk:onDraw':
      return block(
        'sz_gk_on_draw',
        { PARAM: stmt.ctxName },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'gk:onDrawHud':
      return block(
        'sz_gk_on_draw_hud',
        { PARAM: stmt.ctxName },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'gk:onGameClick':
      return block(
        'sz_gk_on_game_click',
        { PX: stmt.xName, PY: stmt.yName },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'gk:setSheet': {
      const fw = exprToValueBlock(valueToExpr(stmt.fw))
      const fh = exprToValueBlock(valueToExpr(stmt.fh))
      return fw === null || fh === null
        ? rawJSBlock(stmt)
        : block('sz_gk_set_sheet', { CHAR: stmt.charVar, IMAGE: stmt.image }, {}, stmt.__id, {
            FW: fw,
            FH: fh,
          })
    }
    case 'gk:playAnim': {
      const from = exprToValueBlock(valueToExpr(stmt.from))
      const to = exprToValueBlock(valueToExpr(stmt.to))
      const fps = exprToValueBlock(valueToExpr(stmt.fps))
      return from === null || to === null || fps === null
        ? rawJSBlock(stmt)
        : block('sz_gk_play_anim', { CHAR: stmt.charVar }, {}, stmt.__id, {
            FROM: from,
            TO: to,
            FPS: fps,
          })
    }
    case 'gk:cameraFollow': {
      const w = exprToValueBlock(valueToExpr(stmt.w))
      const h = exprToValueBlock(valueToExpr(stmt.h))
      return w === null || h === null
        ? rawJSBlock(stmt)
        : block('sz_gk_camera_follow', { CHAR: stmt.charVar }, {}, stmt.__id, { W: w, H: h })
    }
    case 'gk:cameraFollowMap':
      return block('sz_gk_camera_follow_map', { CHAR: stmt.charVar, MAP: stmt.map }, {}, stmt.__id)
    case 'gk:cameraStop':
      return block('sz_gk_camera_stop', {}, {}, stmt.__id)
    case 'gk:launchTowards': {
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      return speed === null
        ? rawJSBlock(stmt)
        : block(
            'sz_gk_launch_towards',
            { WHO: stmt.charVar, TARGET: stmt.targetVar },
            {},
            stmt.__id,
            { V: speed },
          )
    }
    case 'gk:moveByVelocity':
      return block('sz_gk_move_by_velocity', { WHO: stmt.charVar, DT: stmt.dtVar }, {}, stmt.__id)
    case 'gk:setAngle': {
      const degrees = exprToValueBlock(valueToExpr(stmt.degrees))
      return degrees === null
        ? rawJSBlock(stmt)
        : block('sz_gk_set_angle', { WHO: stmt.charVar }, {}, stmt.__id, { DEG: degrees })
    }
    case 'gk:drawBar': {
      const current = exprToValueBlock(valueToExpr(stmt.current))
      const max = exprToValueBlock(valueToExpr(stmt.max))
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const w = exprToValueBlock(valueToExpr(stmt.w))
      const h = exprToValueBlock(valueToExpr(stmt.h))
      return current === null ||
        max === null ||
        x === null ||
        y === null ||
        w === null ||
        h === null
        ? rawJSBlock(stmt)
        : block('sz_gk_draw_bar', { COLOR: stmt.color }, {}, stmt.__id, {
            CUR: current,
            MAX: max,
            X: x,
            Y: y,
            W: w,
            H: h,
          })
    }
    case 'gk:rpgMoveGrid': {
      const cell = exprToValueBlock(valueToExpr(stmt.cell))
      return cell === null
        ? rawJSBlock(stmt)
        : block('sz_gk_rpg_move_grid', { CHAR: stmt.charVar, DT: stmt.dtVar }, {}, stmt.__id, {
            CELL: cell,
          })
    }
    case 'gk:rpgBlockCell': {
      const cx = exprToValueBlock(valueToExpr(stmt.cx))
      const cy = exprToValueBlock(valueToExpr(stmt.cy))
      return cx === null || cy === null
        ? rawJSBlock(stmt)
        : block('sz_gk_rpg_block_cell', {}, {}, stmt.__id, { CX: cx, CY: cy })
    }
    case 'gk:rpgCreateNpc': {
      const cx = exprToValueBlock(valueToExpr(stmt.cx))
      const cy = exprToValueBlock(valueToExpr(stmt.cy))
      return cx === null || cy === null
        ? rawJSBlock(stmt)
        : block(
            'sz_gk_rpg_create_npc',
            { NAME: stmt.name, IMAGE: stmt.image, LOOK: stmt.look },
            {},
            stmt.__id,
            { CX: cx, CY: cy },
          )
    }
    case 'gk:rpgDrawNpcs':
      return block('sz_gk_rpg_draw_npcs', {}, {}, stmt.__id)
    case 'gk:rpgOnTalk':
      return block(
        'sz_gk_rpg_on_talk',
        { NPC: stmt.npc },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'gk:rpgSay': {
      const textValue = exprToValueBlock(valueToExpr(stmt.text))
      const speaker = exprToValueBlock(valueToExpr(stmt.speaker))
      return textValue === null || speaker === null
        ? rawJSBlock(stmt)
        : block('sz_gk_rpg_say', {}, {}, stmt.__id, { TEXT: textValue, NAME: speaker })
    }
    case 'gk:rpgAddFlag':
      return block('sz_gk_rpg_add_flag', { FLAG: stmt.flag }, {}, stmt.__id)
    case 'gk:rpgGiveItem':
      return block('sz_gk_rpg_give_item', { NAME: stmt.item, IMAGE: stmt.image }, {}, stmt.__id)
    case 'gk:rpgRemoveItem':
      return block('sz_gk_rpg_remove_item', { NAME: stmt.item }, {}, stmt.__id)
    case 'gk:rpgDrawInventory': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      return x === null || y === null
        ? rawJSBlock(stmt)
        : block('sz_gk_rpg_draw_inventory', {}, {}, stmt.__id, { X: x, Y: y })
    }
    case 'gk:rpgGoMap':
      return block('sz_gk_rpg_go_map', { MAP: stmt.map }, {}, stmt.__id)
    case 'gk:rpgSetStartMap':
      return block('sz_gk_rpg_set_start_map', { MAP: stmt.map }, {}, stmt.__id)
    case 'gk:rpgCreateMap': {
      const cols = exprToValueBlock(valueToExpr(stmt.cols))
      const rows = exprToValueBlock(valueToExpr(stmt.rows))
      return cols === null || rows === null
        ? rawJSBlock(stmt)
        : block(
            'sz_gk_rpg_create_map',
            { MAP: stmt.map, PARAM: stmt.ctxName },
            { BODY: statementsToBlocks(stmt.body) },
            stmt.__id,
            { COLS: cols, ROWS: rows },
          )
    }
    case 'gk:rpgOnEnterMap':
      return block(
        'sz_gk_rpg_on_enter_map',
        { MAP: stmt.map },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'gk:rpgCreateDoor': {
      const cx = exprToValueBlock(valueToExpr(stmt.cx))
      const cy = exprToValueBlock(valueToExpr(stmt.cy))
      return cx === null || cy === null
        ? rawJSBlock(stmt)
        : block('sz_gk_rpg_create_door', { MAP: stmt.map }, {}, stmt.__id, { CX: cx, CY: cy })
    }
    // 🌍 Mundo aberto: bordas ligadas; o tamanho pertence ao mapa criado.
    case 'gk:rpgConnectEdge':
      return block('sz_gk_rpg_connect_edge', { SIDE: stmt.side, MAP: stmt.map }, {}, stmt.__id)
    case 'gk:rpgBattleStats': {
      const hp = exprToValueBlock(valueToExpr(stmt.hp))
      const str = exprToValueBlock(valueToExpr(stmt.str))
      const def = exprToValueBlock(valueToExpr(stmt.def))
      return hp === null || str === null || def === null
        ? rawJSBlock(stmt)
        : block('sz_gk_rpg_battle_stats', {}, {}, stmt.__id, { HP: hp, STR: str, DEF: def })
    }
    case 'gk:rpgBattleStart': {
      const hp = exprToValueBlock(valueToExpr(stmt.hp))
      const str = exprToValueBlock(valueToExpr(stmt.str))
      const def = exprToValueBlock(valueToExpr(stmt.def))
      return hp === null || str === null || def === null
        ? rawJSBlock(stmt)
        : block(
            'sz_gk_rpg_battle_start',
            { NAME: stmt.name, ...(stmt.image ? { IMAGE: stmt.image } : {}) },
            {},
            stmt.__id,
            { HP: hp, STR: str, DEF: def },
          )
    }
    case 'gk:rpgSetSpecial': {
      const dmg = exprToValueBlock(valueToExpr(stmt.dmg))
      const cost = exprToValueBlock(valueToExpr(stmt.cost))
      return dmg === null || cost === null
        ? rawJSBlock(stmt)
        : block('sz_gk_rpg_set_special', { NAME: stmt.name }, {}, stmt.__id, {
            DMG: dmg,
            COST: cost,
          })
    }
    case 'gk:rpgGivePotion': {
      const heal = exprToValueBlock(valueToExpr(stmt.heal))
      return heal === null
        ? rawJSBlock(stmt)
        : block('sz_gk_rpg_give_potion', { NAME: stmt.name }, {}, stmt.__id, { HEAL: heal })
    }
    case 'gk:rpgHealHero':
      return block('sz_gk_rpg_heal_hero', {}, {}, stmt.__id)
    case 'gk:rpgBattleReward': {
      const xp = exprToValueBlock(valueToExpr(stmt.xp))
      return xp === null
        ? rawJSBlock(stmt)
        : block('sz_gk_rpg_battle_reward', {}, {}, stmt.__id, { XP: xp })
    }
    case 'gk:rpgInflict': {
      const turns = exprToValueBlock(valueToExpr(stmt.turns))
      // R25: STATUS virou campo (veneno|regenera|atrapalha); default veneno.
      return turns === null
        ? rawJSBlock(stmt)
        : block('sz_gk_rpg_inflict', { WHO: stmt.who, STATUS: stmt.status }, {}, stmt.__id, {
            TURNS: turns,
          })
    }
    case 'gk:rpgAddAlly': {
      const hp = exprToValueBlock(valueToExpr(stmt.hp))
      const str = exprToValueBlock(valueToExpr(stmt.str))
      const def = exprToValueBlock(valueToExpr(stmt.def))
      return hp === null || str === null || def === null
        ? rawJSBlock(stmt)
        : block(
            'sz_gk_rpg_add_ally',
            { NAME: stmt.name, COLOR: stmt.color, ...(stmt.image ? { IMAGE: stmt.image } : {}) },
            {},
            stmt.__id,
            { HP: hp, STR: str, DEF: def },
          )
    }
    case 'gk:rpgAddFoe': {
      const hp = exprToValueBlock(valueToExpr(stmt.hp))
      const str = exprToValueBlock(valueToExpr(stmt.str))
      const def = exprToValueBlock(valueToExpr(stmt.def))
      return hp === null || str === null || def === null
        ? rawJSBlock(stmt)
        : block(
            'sz_gk_rpg_add_foe',
            { NAME: stmt.name, COLOR: stmt.color, ...(stmt.image ? { IMAGE: stmt.image } : {}) },
            {},
            stmt.__id,
            { HP: hp, STR: str, DEF: def },
          )
    }
    case 'gk:rpgTeachMove': {
      const dmg = exprToValueBlock(valueToExpr(stmt.dmg))
      const cost = exprToValueBlock(valueToExpr(stmt.cost))
      return dmg === null || cost === null
        ? rawJSBlock(stmt)
        : block('sz_gk_rpg_teach_move', { MOVE: stmt.move, WHO: stmt.who }, {}, stmt.__id, {
            DMG: dmg,
            COST: cost,
          })
    }
    case 'gk:rpgTeachHeal': {
      const amount = exprToValueBlock(valueToExpr(stmt.amount))
      const cost = exprToValueBlock(valueToExpr(stmt.cost))
      return amount === null || cost === null
        ? rawJSBlock(stmt)
        : block('sz_gk_rpg_teach_heal', { MOVE: stmt.move, WHO: stmt.who }, {}, stmt.__id, {
            AMOUNT: amount,
            COST: cost,
          })
    }
    case 'gk:rpgAddBoss': {
      const hp = exprToValueBlock(valueToExpr(stmt.hp))
      const str = exprToValueBlock(valueToExpr(stmt.str))
      const def = exprToValueBlock(valueToExpr(stmt.def))
      return hp === null || str === null || def === null
        ? rawJSBlock(stmt)
        : block(
            'sz_gk_rpg_add_boss',
            { NAME: stmt.name, ...(stmt.image ? { IMAGE: stmt.image } : {}) },
            {},
            stmt.__id,
            { HP: hp, STR: str, DEF: def },
          )
    }
    case 'gk:rpgDefineBattler': {
      const hp = exprToValueBlock(valueToExpr(stmt.hp))
      const str = exprToValueBlock(valueToExpr(stmt.str))
      const def = exprToValueBlock(valueToExpr(stmt.def))
      return hp === null || str === null || def === null
        ? rawJSBlock(stmt)
        : block(
            'sz_gk_rpg_define_battler',
            {
              NAME: stmt.name,
              IMAGE: stmt.image,
              COLOR: stmt.color,
              BOSS: stmt.boss ? 'TRUE' : 'FALSE',
            },
            {},
            stmt.__id,
            { HP: hp, STR: str, DEF: def },
          )
    }
    case 'gk:rpgBattleNamed':
      return block('sz_gk_rpg_battle_named', { NAME: stmt.name }, {}, stmt.__id)
    case 'gk:rpgAddFoeNamed':
      return block('sz_gk_rpg_add_foe_named', { NAME: stmt.name }, {}, stmt.__id)
    case 'gk:rpgOnFoeTurn':
      return block(
        'sz_gk_rpg_on_foe_turn',
        { NAME: stmt.name },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'gk:rpgFoeUse':
      return block('sz_gk_rpg_foe_use', { NAME: stmt.name, MOVE: stmt.move }, {}, stmt.__id)
    case 'gk:rpgFoeHitAll': {
      const dmg = exprToValueBlock(valueToExpr(stmt.dmg))
      return dmg === null
        ? rawJSBlock(stmt)
        : block('sz_gk_rpg_foe_hit_all', { NAME: stmt.name }, {}, stmt.__id, { DMG: dmg })
    }
    case 'gk:rpgOnBattleEnd':
      return block(
        'sz_gk_rpg_on_battle_end',
        {},
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'gk:setWalkSheet': {
      const fw = exprToValueBlock(valueToExpr(stmt.fw))
      const fh = exprToValueBlock(valueToExpr(stmt.fh))
      return fw === null || fh === null
        ? rawJSBlock(stmt)
        : block('sz_gk_set_walk_sheet', { CHAR: stmt.charVar, IMAGE: stmt.image }, {}, stmt.__id, {
            FW: fw,
            FH: fh,
          })
    }
    case 'gk:rpgCutscene':
      return block('sz_gk_rpg_cutscene', {}, { BODY: statementsToBlocks(stmt.body) }, stmt.__id)
    case 'gk:rpgWait': {
      const sec = exprToValueBlock(valueToExpr(stmt.seconds))
      return sec === null
        ? rawJSBlock(stmt)
        : block('sz_gk_rpg_wait', {}, {}, stmt.__id, { SECONDS: sec })
    }
    case 'gk:rpgFace':
      return block('sz_gk_rpg_face', { NPC: stmt.npc, DIR: stmt.dir }, {}, stmt.__id)
    case 'gk:rpgNpcWalkTo': {
      const cx = exprToValueBlock(valueToExpr(stmt.cx))
      const cy = exprToValueBlock(valueToExpr(stmt.cy))
      return cx === null || cy === null
        ? rawJSBlock(stmt)
        : block('sz_gk_rpg_npc_walk_to', { NPC: stmt.npc }, {}, stmt.__id, { CX: cx, CY: cy })
    }
    case 'gk:rpgNpcWander':
      return block('sz_gk_rpg_npc_wander', { NPC: stmt.npc }, {}, stmt.__id)
    case 'gk:rpgOnStep': {
      const cx = exprToValueBlock(valueToExpr(stmt.cx))
      const cy = exprToValueBlock(valueToExpr(stmt.cy))
      return cx === null || cy === null
        ? rawJSBlock(stmt)
        : block('sz_gk_rpg_on_step', {}, { BODY: statementsToBlocks(stmt.body) }, stmt.__id, {
            CX: cx,
            CY: cy,
          })
    }
    case 'gk:rpgMenu': {
      const title = exprToValueBlock(valueToExpr(stmt.title))
      return title === null
        ? rawJSBlock(stmt)
        : block('sz_gk_rpg_menu', {}, { BODY: statementsToBlocks(stmt.body) }, stmt.__id, {
            TITLE: title,
          })
    }
    case 'gk:rpgOption': {
      const label = exprToValueBlock(valueToExpr(stmt.label))
      return label === null
        ? rawJSBlock(stmt)
        : block('sz_gk_rpg_option', {}, { BODY: statementsToBlocks(stmt.body) }, stmt.__id, {
            LABEL: label,
          })
    }
    case 'gk:rpgSave':
      return block('sz_gk_rpg_save', {}, {}, stmt.__id)
    case 'gk:rpgLoad':
      return block('sz_gk_rpg_load', {}, {}, stmt.__id)
    case 'gk:loadTilemap':
      return block('sz_gk_load_tilemap', { NAME: stmt.name, IMAGE: stmt.asset }, {}, stmt.__id)
    case 'gk:drawTilemap':
      return block('sz_gk_draw_tilemap', { MAP: stmt.name, LAYER: stmt.layer }, {}, stmt.__id)
    case 'gk:tilemapSolid':
      return block('sz_gk_tilemap_solid', { MAP: stmt.name }, {}, stmt.__id)
    case 'gk:drawShadow':
      return block('sz_gk_draw_shadow', { CHAR: stmt.charVar }, {}, stmt.__id)
    case 'gk:drawByDepth':
      return block('sz_gk_draw_by_depth', { CHAR: stmt.charVar }, {}, stmt.__id)
    case 'gk:cameraShake': {
      const int = exprToValueBlock(valueToExpr(stmt.intensity))
      const sec = exprToValueBlock(valueToExpr(stmt.seconds))
      return int === null || sec === null
        ? rawJSBlock(stmt)
        : block('sz_gk_camera_shake', {}, {}, stmt.__id, { INT: int, SEC: sec })
    }
    case 'gk:applyGravity': {
      const g = exprToValueBlock(valueToExpr(stmt.g))
      return g === null
        ? rawJSBlock(stmt)
        : block('sz_gk_apply_gravity', { WHO: stmt.charVar, DT: stmt.dtVar }, {}, stmt.__id, {
            G: g,
          })
    }
    case 'gk:jump': {
      const force = exprToValueBlock(valueToExpr(stmt.force))
      return force === null
        ? rawJSBlock(stmt)
        : block('sz_gk_jump', { WHO: stmt.charVar }, {}, stmt.__id, { FORCE: force })
    }
    case 'gk:setVelocity': {
      const vx = exprToValueBlock(valueToExpr(stmt.vx))
      const vy = exprToValueBlock(valueToExpr(stmt.vy))
      return vx === null || vy === null
        ? rawJSBlock(stmt)
        : block('sz_gk_set_velocity', { WHO: stmt.charVar }, {}, stmt.__id, { VX: vx, VY: vy })
    }
    case 'gk:setTerminalVelocity': {
      const max = exprToValueBlock(valueToExpr(stmt.max))
      return max === null
        ? rawJSBlock(stmt)
        : block('sz_gk_set_terminal_velocity', { WHO: stmt.charVar }, {}, stmt.__id, { MAX: max })
    }
    case 'gk:bounceOnEdges':
      return block('sz_gk_bounce_on_edges', { WHO: stmt.charVar }, {}, stmt.__id)
    case 'gk:paddleBounce':
      return block(
        'sz_gk_paddle_bounce',
        { BALL: stmt.ballVar, PADDLE: stmt.paddleVar },
        {},
        stmt.__id,
      )
    case 'gk:boardCreate': {
      const cols = exprToValueBlock(valueToExpr(stmt.cols))
      const rows = exprToValueBlock(valueToExpr(stmt.rows))
      const empty = exprToValueBlock(valueToExpr(stmt.empty))
      return cols === null || rows === null || empty === null
        ? rawJSBlock(stmt)
        : block('sz_gk_board_create', { NAME: stmt.name }, {}, stmt.__id, {
            COLS: cols,
            ROWS: rows,
            EMPTY: empty,
          })
    }
    case 'gk:boardSet': {
      const value = exprToValueBlock(valueToExpr(stmt.value))
      const col = exprToValueBlock(valueToExpr(stmt.col))
      const row = exprToValueBlock(valueToExpr(stmt.row))
      return value === null || col === null || row === null
        ? rawJSBlock(stmt)
        : block('sz_gk_board_set', { NAME: stmt.name }, {}, stmt.__id, {
            VALUE: value,
            COL: col,
            ROW: row,
          })
    }
    case 'gk:playersSetup': {
      const n = exprToValueBlock(valueToExpr(stmt.n))
      return n === null
        ? rawJSBlock(stmt)
        : block('sz_gk_players_setup', {}, {}, stmt.__id, { N: n })
    }
    case 'gk:nextPlayer':
      return block('sz_gk_next_player', {}, {}, stmt.__id)
    case 'gk:onTurnChange':
      return block('sz_gk_on_turn_change', {}, { BODY: statementsToBlocks(stmt.body) }, stmt.__id)
    case 'gk:moveAlongTrack': {
      const spaces = exprToValueBlock(valueToExpr(stmt.spaces))
      return spaces === null
        ? rawJSBlock(stmt)
        : block('sz_gk_move_along_track', { WHO: stmt.who, PATH: stmt.path }, {}, stmt.__id, {
            SPACES: spaces,
          })
    }
    case 'gk:onLandSpace':
      return block('sz_gk_on_land_space', {}, { BODY: statementsToBlocks(stmt.body) }, stmt.__id)
    case 'gk:pileMoveTop':
      return block('sz_gk_pile_move_top', { FROM: stmt.fromVar, TO: stmt.toVar }, {}, stmt.__id)
    case 'gk:pileShuffleFrom':
      return block(
        'sz_gk_pile_shuffle_from',
        { DECK: stmt.deckVar, DISCARD: stmt.discardVar },
        {},
        stmt.__id,
      )
    case 'gk:cardFlip': {
      const card = exprToValueBlock(valueToExpr(stmt.card))
      return card === null
        ? rawJSBlock(stmt)
        : block('sz_gk_card_flip', {}, {}, stmt.__id, { CARD: card })
    }
    case 'gk:handDraw': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      return x === null || y === null
        ? rawJSBlock(stmt)
        : block(
            'sz_gk_hand_draw',
            { PILE: stmt.pileVar, FAN: stmt.fan ? 'TRUE' : 'FALSE' },
            {},
            stmt.__id,
            { X: x, Y: y },
          )
    }
    case 'gk:cardsStart': {
      const hero = exprToValueBlock(valueToExpr(stmt.heroHp))
      const enemy = exprToValueBlock(valueToExpr(stmt.enemyHp))
      return hero === null || enemy === null
        ? rawJSBlock(stmt)
        : block('sz_gk_cards_start', {}, {}, stmt.__id, { HERO_HP: hero, ENEMY_HP: enemy })
    }
    case 'gk:cardsEnergyPerTurn': {
      const n = exprToValueBlock(valueToExpr(stmt.n))
      return n === null
        ? rawJSBlock(stmt)
        : block('sz_gk_cards_energy_per_turn', {}, {}, stmt.__id, { N: n })
    }
    case 'gk:cardsSpend': {
      const n = exprToValueBlock(valueToExpr(stmt.n))
      return n === null ? rawJSBlock(stmt) : block('sz_gk_cards_spend', {}, {}, stmt.__id, { N: n })
    }
    case 'gk:cardsOnTurn':
      return block('sz_gk_cards_on_turn', {}, { BODY: statementsToBlocks(stmt.body) }, stmt.__id)
    case 'gk:cardsEndTurn':
      return block('sz_gk_cards_end_turn', {}, {}, stmt.__id)
    case 'gk:cardsDrawHud':
      return block('sz_gk_cards_draw_hud', {}, {}, stmt.__id)
    case 'gk:cardsHurtEnemy': {
      const n = exprToValueBlock(valueToExpr(stmt.n))
      return n === null
        ? rawJSBlock(stmt)
        : block('sz_gk_cards_hurt_enemy', {}, {}, stmt.__id, { N: n })
    }
    case 'gk:cardsHurtMe': {
      const n = exprToValueBlock(valueToExpr(stmt.n))
      return n === null
        ? rawJSBlock(stmt)
        : block('sz_gk_cards_hurt_me', {}, {}, stmt.__id, { N: n })
    }
    case 'gk:cardsGainBlock': {
      const n = exprToValueBlock(valueToExpr(stmt.n))
      return n === null
        ? rawJSBlock(stmt)
        : block('sz_gk_cards_gain_block', {}, {}, stmt.__id, { N: n })
    }
    case 'gk:cardsEnemyIntent': {
      const v = exprToValueBlock(valueToExpr(stmt.value))
      return v === null
        ? rawJSBlock(stmt)
        : block('sz_gk_cards_enemy_intent', { ACTION: stmt.action }, {}, stmt.__id, { VALUE: v })
    }
    case 'gk:cardsOnEnemyTurn':
      return block(
        'sz_gk_cards_on_enemy_turn',
        {},
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'gk:wrapEdges':
      return block('sz_gk_wrap_edges', { WHO: stmt.charVar }, {}, stmt.__id)
    case 'gk:collideTilemap':
      return block('sz_gk_collide_tilemap', { WHO: stmt.charVar, MAP: stmt.map }, {}, stmt.__id)
    case 'gk:collideGroup':
      return block('sz_gk_collide_group', { WHO: stmt.charVar, MOLD: stmt.mold }, {}, stmt.__id)
    case 'gk:overlapGroups':
      return block(
        'sz_gk_overlap_groups',
        { A_NAME: stmt.aName, MOLD_A: stmt.moldA, B_NAME: stmt.bName, MOLD_B: stmt.moldB },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'gk:everySeconds': {
      const secs = exprToValueBlock(valueToExpr(stmt.seconds))
      return secs === null
        ? rawJSBlock(stmt)
        : block('sz_gk_every_seconds', {}, { BODY: statementsToBlocks(stmt.body) }, stmt.__id, {
            SECS: secs,
          })
    }
    case 'gk:setTileSize': {
      const px = exprToValueBlock(valueToExpr(stmt.px))
      return px === null
        ? rawJSBlock(stmt)
        : block('sz_gk_set_tile_size', {}, {}, stmt.__id, { PX: px })
    }
    case 'gk:setTileAt': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const index = exprToValueBlock(valueToExpr(stmt.index))
      return x === null || y === null || index === null
        ? rawJSBlock(stmt)
        : block('sz_gk_set_tile_at', { MAP: stmt.map }, {}, stmt.__id, { X: x, Y: y, INDEX: index })
    }
    case 'gk:breakTileAt':
      return block('sz_gk_break_tile_at', { MAP: stmt.map, WHO: stmt.charVar }, {}, stmt.__id)
    case 'gk:setProperty': {
      const value = exprToValueBlock(valueToExpr(stmt.value))
      return value === null
        ? rawJSBlock(stmt)
        : block('sz_gk_set_property', { WHO: stmt.charVar, PROP: stmt.prop }, {}, stmt.__id, {
            VALUE: value,
          })
    }
    case 'gk:setFacingDir':
      return block('sz_gk_set_facing', { WHO: stmt.charVar, DIR: stmt.dir }, {}, stmt.__id)
    case 'gk:tweenTo': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const secs = exprToValueBlock(valueToExpr(stmt.seconds))
      return x === null || y === null || secs === null
        ? rawJSBlock(stmt)
        : block('sz_gk_tween_to', { WHO: stmt.charVar }, {}, stmt.__id, { X: x, Y: y, SECS: secs })
    }
    // 🏃 Kit Plataforma
    case 'gk:platformerHero': {
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      const jump = exprToValueBlock(valueToExpr(stmt.force))
      return speed === null || jump === null
        ? rawJSBlock(stmt)
        : block('sz_gk_plat_hero', { WHO: stmt.charVar, DT: stmt.dtVar }, {}, stmt.__id, {
            SPEED: speed,
            JUMP: jump,
          })
    }
    case 'gk:setJumpFeel': {
      const coyote = exprToValueBlock(valueToExpr(stmt.coyote))
      const buffer = exprToValueBlock(valueToExpr(stmt.buffer))
      const hold = exprToValueBlock(valueToExpr(stmt.hold))
      const gravity = exprToValueBlock(valueToExpr(stmt.gravity))
      return coyote === null || buffer === null || hold === null || gravity === null
        ? rawJSBlock(stmt)
        : block('sz_gk_plat_jump_feel', {}, {}, stmt.__id, {
            COYOTE: coyote,
            BUFFER: buffer,
            HOLD: hold,
            GRAVITY: gravity,
          })
    }
    case 'gk:doubleJump': {
      const force = exprToValueBlock(valueToExpr(stmt.force))
      const times = exprToValueBlock(valueToExpr(stmt.times))
      return force === null || times === null
        ? rawJSBlock(stmt)
        : block('sz_gk_plat_double_jump', { WHO: stmt.charVar }, {}, stmt.__id, {
            FORCE: force,
            TIMES: times,
          })
    }
    case 'gk:wallSlide': {
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      return speed === null
        ? rawJSBlock(stmt)
        : block('sz_gk_plat_wall_slide', { WHO: stmt.charVar }, {}, stmt.__id, { SPEED: speed })
    }
    case 'gk:wallJump': {
      const fx = exprToValueBlock(valueToExpr(stmt.forceX))
      const fy = exprToValueBlock(valueToExpr(stmt.forceY))
      return fx === null || fy === null
        ? rawJSBlock(stmt)
        : block('sz_gk_plat_wall_jump', { WHO: stmt.charVar }, {}, stmt.__id, { FX: fx, FY: fy })
    }
    case 'gk:climbLadder': {
      const tile = exprToValueBlock(valueToExpr(stmt.tile))
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      return tile === null || speed === null
        ? rawJSBlock(stmt)
        : block('sz_gk_plat_ladder', { WHO: stmt.charVar, MAP: stmt.map }, {}, stmt.__id, {
            TILE: tile,
            SPEED: speed,
          })
    }
    case 'gk:oneWayPlatform':
      return block(
        'sz_gk_plat_one_way',
        { WHO: stmt.charVar, MOLD: stmt.mold, DT: stmt.dtVar },
        {},
        stmt.__id,
      )
    case 'gk:dropThrough':
      return block('sz_gk_plat_drop_through', { WHO: stmt.charVar }, {}, stmt.__id)
    case 'gk:movingPlatform': {
      const x1 = exprToValueBlock(valueToExpr(stmt.x1))
      const y1 = exprToValueBlock(valueToExpr(stmt.y1))
      const x2 = exprToValueBlock(valueToExpr(stmt.x2))
      const y2 = exprToValueBlock(valueToExpr(stmt.y2))
      const secs = exprToValueBlock(valueToExpr(stmt.seconds))
      return x1 === null || y1 === null || x2 === null || y2 === null || secs === null
        ? rawJSBlock(stmt)
        : block('sz_gk_plat_moving', { WHO: stmt.charVar, DT: stmt.dtVar }, {}, stmt.__id, {
            X1: x1,
            Y1: y1,
            X2: x2,
            Y2: y2,
            SECS: secs,
          })
    }
    case 'gk:rideOn':
      return block('sz_gk_plat_ride_on', { WHO: stmt.charVar, MOLD: stmt.mold }, {}, stmt.__id)
    case 'gk:stompKill': {
      const bounce = exprToValueBlock(valueToExpr(stmt.bounce))
      return bounce === null
        ? rawJSBlock(stmt)
        : block('sz_gk_plat_stomp', { WHO: stmt.charVar, MOLD: stmt.mold }, {}, stmt.__id, {
            BOUNCE: bounce,
          })
    }
    case 'gk:patrolTurnAtWall': {
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      return speed === null
        ? rawJSBlock(stmt)
        : block('sz_gk_plat_patrol_wall', { WHO: stmt.charVar }, {}, stmt.__id, { SPEED: speed })
    }
    case 'gk:setCheckpoint': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      return x === null || y === null
        ? rawJSBlock(stmt)
        : block('sz_gk_plat_checkpoint', {}, {}, stmt.__id, { X: x, Y: y })
    }
    case 'gk:respawn':
      return block('sz_gk_plat_respawn', { WHO: stmt.charVar }, {}, stmt.__id)
    case 'gk:platStateFrames': {
      const from = exprToValueBlock(valueToExpr(stmt.from))
      const to = exprToValueBlock(valueToExpr(stmt.to))
      const fps = exprToValueBlock(valueToExpr(stmt.fps))
      return from === null || to === null || fps === null
        ? rawJSBlock(stmt)
        : block(
            'sz_gk_plat_state_frames',
            { WHO: stmt.charVar, STATE: stmt.state },
            {},
            stmt.__id,
            {
              FROM: from,
              TO: to,
              FPS: fps,
            },
          )
    }
    case 'gk:platformerAnim':
      return block('sz_gk_plat_anim', { WHO: stmt.charVar }, {}, stmt.__id)
    // 👾 R16 — Kit Monstrinhos
    case 'gk:pkmCreature': {
      const hp = exprToValueBlock(valueToExpr(stmt.hp))
      const st = exprToValueBlock(valueToExpr(stmt.str))
      const df = exprToValueBlock(valueToExpr(stmt.def))
      const sp = exprToValueBlock(valueToExpr(stmt.spd))
      return hp === null || st === null || df === null || sp === null
        ? rawJSBlock(stmt)
        : block(
            'sz_gk_pkm_creature',
            { NAME: stmt.name, TYPE: stmt.creatureType, IMAGE: stmt.image, LOOK: stmt.look },
            {},
            stmt.__id,
            { HP: hp, STR: st, DEF: df, SPD: sp },
          )
    }
    case 'gk:pkmMove': {
      const dmg = exprToValueBlock(valueToExpr(stmt.dmg))
      const acc = exprToValueBlock(valueToExpr(stmt.acc))
      return dmg === null || acc === null
        ? rawJSBlock(stmt)
        : block(
            'sz_gk_pkm_move',
            {
              MOVE: stmt.move,
              CREATURE: stmt.creature,
              TYPE: stmt.moveType,
              FX: stmt.fx,
              COLOR: stmt.color,
            },
            {},
            stmt.__id,
            { DMG: dmg, ACC: acc },
          )
    }
    case 'gk:pkmTypeChart': {
      const m = exprToValueBlock(valueToExpr(stmt.mult))
      return m === null
        ? rawJSBlock(stmt)
        : block('sz_gk_pkm_type_chart', { A: stmt.atk, B: stmt.def }, {}, stmt.__id, { MULT: m })
    }
    case 'gk:pkmEvolve': {
      const l = exprToValueBlock(valueToExpr(stmt.level))
      return l === null
        ? rawJSBlock(stmt)
        : block('sz_gk_pkm_evolve', { FROM: stmt.from, TO: stmt.to }, {}, stmt.__id, { LEVEL: l })
    }
    case 'gk:pkmCatchDifficulty':
      return block(
        'sz_gk_pkm_catch_difficulty',
        { NAME: stmt.creature, LEVEL: stmt.level },
        {},
        stmt.__id,
      )
    case 'gk:pkmGive': {
      const l = exprToValueBlock(valueToExpr(stmt.level))
      return l === null
        ? rawJSBlock(stmt)
        : block('sz_gk_pkm_give', { CREATURE: stmt.creature }, {}, stmt.__id, { LEVEL: l })
    }
    case 'gk:pkmGiveBall': {
      const c = exprToValueBlock(valueToExpr(stmt.count))
      const pw = exprToValueBlock(valueToExpr(stmt.power))
      return c === null || pw === null
        ? rawJSBlock(stmt)
        : block('sz_gk_pkm_give_ball', {}, {}, stmt.__id, { COUNT: c, POWER: pw })
    }
    case 'gk:pkmHealTeam':
      return block('sz_gk_pkm_heal_team', {}, {}, stmt.__id)
    case 'gk:pkmDrawTeam': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      return x === null || y === null
        ? rawJSBlock(stmt)
        : block('sz_gk_pkm_draw_team', {}, {}, stmt.__id, { X: x, Y: y })
    }
    case 'gk:pkmGrassCells': {
      const x1 = exprToValueBlock(valueToExpr(stmt.x1))
      const y1 = exprToValueBlock(valueToExpr(stmt.y1))
      const x2 = exprToValueBlock(valueToExpr(stmt.x2))
      const y2 = exprToValueBlock(valueToExpr(stmt.y2))
      return x1 === null || y1 === null || x2 === null || y2 === null
        ? rawJSBlock(stmt)
        : block('sz_gk_pkm_grass_cells', {}, {}, stmt.__id, { X1: x1, Y1: y1, X2: x2, Y2: y2 })
    }
    case 'gk:pkmGrassTiles': {
      const i = exprToValueBlock(valueToExpr(stmt.index))
      return i === null
        ? rawJSBlock(stmt)
        : block('sz_gk_pkm_grass_tiles', { MAP: stmt.map }, {}, stmt.__id, { INDEX: i })
    }
    case 'gk:pkmWild': {
      const mn = exprToValueBlock(valueToExpr(stmt.min))
      const mx = exprToValueBlock(valueToExpr(stmt.max))
      return mn === null || mx === null
        ? rawJSBlock(stmt)
        : block('sz_gk_pkm_wild', { CREATURE: stmt.creature }, {}, stmt.__id, { MIN: mn, MAX: mx })
    }
    case 'gk:pkmEncounterRate': {
      const p2 = exprToValueBlock(valueToExpr(stmt.percent))
      return p2 === null
        ? rawJSBlock(stmt)
        : block('sz_gk_pkm_encounter_rate', {}, {}, stmt.__id, { PCT: p2 })
    }
    case 'gk:pkmBattleWild': {
      const l = exprToValueBlock(valueToExpr(stmt.level))
      return l === null
        ? rawJSBlock(stmt)
        : block('sz_gk_pkm_battle_wild', { CREATURE: stmt.creature }, {}, stmt.__id, { LEVEL: l })
    }
    case 'gk:pkmBattleTrainer':
      return block(
        'sz_gk_pkm_battle_trainer',
        { NAME: stmt.name },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'gk:pkmTrainerCreature': {
      const l = exprToValueBlock(valueToExpr(stmt.level))
      return l === null
        ? rawJSBlock(stmt)
        : block('sz_gk_pkm_trainer_creature', { CREATURE: stmt.creature }, {}, stmt.__id, {
            LEVEL: l,
          })
    }
    // 🧭 R15 — primitivos gerais
    case 'gk:defineRegion': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const w = exprToValueBlock(valueToExpr(stmt.w))
      const h = exprToValueBlock(valueToExpr(stmt.h))
      return x === null || y === null || w === null || h === null
        ? rawJSBlock(stmt)
        : block('sz_gk_define_region', { NAME: stmt.name }, {}, stmt.__id, {
            X: x,
            Y: y,
            W: w,
            H: h,
          })
    }
    case 'gk:launchToPoint': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const sp = exprToValueBlock(valueToExpr(stmt.speed))
      return x === null || y === null || sp === null
        ? rawJSBlock(stmt)
        : block('sz_gk_launch_to_point', { WHO: stmt.charVar }, {}, stmt.__id, {
            X: x,
            Y: y,
            SPEED: sp,
          })
    }
    case 'gk:setVelocityAngle': {
      const d = exprToValueBlock(valueToExpr(stmt.degrees))
      const f2 = exprToValueBlock(valueToExpr(stmt.force))
      return d === null || f2 === null
        ? rawJSBlock(stmt)
        : block('sz_gk_set_velocity_angle', { WHO: stmt.charVar }, {}, stmt.__id, {
            DEG: d,
            FORCE: f2,
          })
    }
    // R21 — primitivos gerais
    case 'gk:floatText': {
      const t = exprToValueBlock(valueToExpr(stmt.text))
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const sz = exprToValueBlock(valueToExpr(stmt.size))
      return t === null || x === null || y === null || sz === null
        ? rawJSBlock(stmt)
        : block('sz_gk_float_text', { COLOR: stmt.color }, {}, stmt.__id, {
            TEXT: t,
            X: x,
            Y: y,
            SIZE: sz,
          })
    }
    case 'gk:trailOn': {
      const sz = exprToValueBlock(valueToExpr(stmt.size))
      const rt = exprToValueBlock(valueToExpr(stmt.rate))
      const lf = exprToValueBlock(valueToExpr(stmt.life))
      return sz === null || rt === null || lf === null
        ? rawJSBlock(stmt)
        : block('sz_gk_trail_on', { WHO: stmt.charVar, COLOR: stmt.color }, {}, stmt.__id, {
            SIZE: sz,
            RATE: rt,
            LIFE: lf,
          })
    }
    case 'gk:trailOff':
      return block('sz_gk_trail_off', { WHO: stmt.charVar }, {}, stmt.__id)
    case 'gk:shockwave': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const r = exprToValueBlock(valueToExpr(stmt.radius))
      const s2 = exprToValueBlock(valueToExpr(stmt.seconds))
      return x === null || y === null || r === null || s2 === null
        ? rawJSBlock(stmt)
        : block('sz_gk_shockwave', { COLOR: stmt.color }, {}, stmt.__id, {
            X: x,
            Y: y,
            RADIUS: r,
            SECS: s2,
          })
    }
    case 'gk:scrollImage': {
      const vx = exprToValueBlock(valueToExpr(stmt.vx))
      const vy = exprToValueBlock(valueToExpr(stmt.vy))
      return vx === null || vy === null
        ? rawJSBlock(stmt)
        : block('sz_gk_scroll_image', { IMAGE: stmt.image }, {}, stmt.__id, { VX: vx, VY: vy })
    }
    case 'gk:leanOnMove': {
      const d = exprToValueBlock(valueToExpr(stmt.degrees))
      return d === null
        ? rawJSBlock(stmt)
        : block('sz_gk_lean_on_move', { WHO: stmt.charVar }, {}, stmt.__id, { DEG: d })
    }
    case 'gk:fanShot': {
      const c = exprToValueBlock(valueToExpr(stmt.count))
      const a = exprToValueBlock(valueToExpr(stmt.arc))
      const d = exprToValueBlock(valueToExpr(stmt.degrees))
      const sp = exprToValueBlock(valueToExpr(stmt.speed))
      return c === null || a === null || d === null || sp === null
        ? rawJSBlock(stmt)
        : block('sz_gk_fan_shot', { WHO: stmt.charVar, MOLD: stmt.mold }, {}, stmt.__id, {
            COUNT: c,
            ARC: a,
            DEG: d,
            SPEED: sp,
          })
    }
    // 🚀 R22 — Kit Nave
    case 'gk:naveShip': {
      const sp = exprToValueBlock(valueToExpr(stmt.speed))
      const ln = exprToValueBlock(valueToExpr(stmt.lean))
      return sp === null || ln === null
        ? rawJSBlock(stmt)
        : block('sz_gk_nave_ship', { WHO: stmt.charVar, DT: stmt.dtVar }, {}, stmt.__id, {
            SPEED: sp,
            LEAN: ln,
          })
    }
    case 'gk:navePowerup': {
      const s2 = exprToValueBlock(valueToExpr(stmt.seconds))
      return s2 === null
        ? rawJSBlock(stmt)
        : block('sz_gk_nave_powerup', { POWER: stmt.power, WHO: stmt.charVar }, {}, stmt.__id, {
            SECS: s2,
          })
    }
    case 'gk:naveWave': {
      const c = exprToValueBlock(valueToExpr(stmt.cols))
      const r = exprToValueBlock(valueToExpr(stmt.rows))
      const g = exprToValueBlock(valueToExpr(stmt.gap))
      const sp = exprToValueBlock(valueToExpr(stmt.speed))
      const dr = exprToValueBlock(valueToExpr(stmt.drop))
      const ac = exprToValueBlock(valueToExpr(stmt.accel))
      return c === null || r === null || g === null || sp === null || dr === null || ac === null
        ? rawJSBlock(stmt)
        : block('sz_gk_nave_wave', { MOLD: stmt.mold }, {}, stmt.__id, {
            COLS: c,
            ROWS: r,
            GAP: g,
            SPEED: sp,
            DROP: dr,
            ACCEL: ac,
          })
    }
    case 'gk:naveWaveShooter': {
      const s2 = exprToValueBlock(valueToExpr(stmt.seconds))
      const sp = exprToValueBlock(valueToExpr(stmt.speed))
      return s2 === null || sp === null
        ? rawJSBlock(stmt)
        : block(
            'sz_gk_nave_wave_shooter',
            { MOLD: stmt.mold, BULLET: stmt.bullet },
            {},
            stmt.__id,
            { SECS: s2, SPEED: sp },
          )
    }
    case 'gk:naveInvasionLine': {
      const y = exprToValueBlock(valueToExpr(stmt.y))
      return y === null
        ? rawJSBlock(stmt)
        : block('sz_gk_nave_invasion_line', {}, {}, stmt.__id, { Y: y })
    }
    case 'gk:naveStarfield': {
      const c = exprToValueBlock(valueToExpr(stmt.count))
      const sp = exprToValueBlock(valueToExpr(stmt.speed))
      return c === null || sp === null
        ? rawJSBlock(stmt)
        : block('sz_gk_nave_starfield', {}, {}, stmt.__id, { COUNT: c, SPEED: sp })
    }
    case 'gk:naveBomb': {
      const r = exprToValueBlock(valueToExpr(stmt.radius))
      return r === null
        ? rawJSBlock(stmt)
        : block('sz_gk_nave_bomb', { MOLD: stmt.mold, TARGET: stmt.target }, {}, stmt.__id, {
            RADIUS: r,
          })
    }
    // 🛤️ R25 — caminhos + paralaxe + explosão por folha
    case 'gk:definePath':
      return block(
        'sz_gk_define_path',
        { NAME: stmt.name },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'gk:pathPoint': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      return x === null || y === null
        ? rawJSBlock(stmt)
        : block('sz_gk_path_point', {}, {}, stmt.__id, { X: x, Y: y })
    }
    case 'gk:followPath': {
      const sp = exprToValueBlock(valueToExpr(stmt.speed))
      return sp === null
        ? rawJSBlock(stmt)
        : block(
            'sz_gk_follow_path',
            { WHO: stmt.charVar, PATH: stmt.path, DT: stmt.dtVar },
            {},
            stmt.__id,
            {
              SPEED: sp,
            },
          )
    }
    case 'gk:parallaxLayer': {
      const fx = exprToValueBlock(valueToExpr(stmt.fx))
      const fy = exprToValueBlock(valueToExpr(stmt.fy))
      return fx === null || fy === null
        ? rawJSBlock(stmt)
        : block('sz_gk_parallax_layer', { IMAGE: stmt.image }, {}, stmt.__id, { FX: fx, FY: fy })
    }
    case 'gk:sheetBurst': {
      const fr = exprToValueBlock(valueToExpr(stmt.frames))
      const fp = exprToValueBlock(valueToExpr(stmt.fps))
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const sz = exprToValueBlock(valueToExpr(stmt.size))
      return fr === null || fp === null || x === null || y === null || sz === null
        ? rawJSBlock(stmt)
        : block('sz_gk_sheet_burst', { IMAGE: stmt.image }, {}, stmt.__id, {
            FRAMES: fr,
            FPS: fp,
            X: x,
            Y: y,
            SIZE: sz,
          })
    }
    // 🏰 R26 — Kit Defesa de Torre
    case 'gk:tdWave': {
      const count = exprToValueBlock(valueToExpr(stmt.count))
      const gap = exprToValueBlock(valueToExpr(stmt.gap))
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      return count === null || gap === null || speed === null
        ? rawJSBlock(stmt)
        : block('sz_gk_td_wave', { PATH: stmt.path, MOLD: stmt.mold }, {}, stmt.__id, {
            COUNT: count,
            GAP: gap,
            SPEED: speed,
          })
    }
    case 'gk:tdSlot': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const sz = exprToValueBlock(valueToExpr(stmt.size))
      return x === null || y === null || sz === null
        ? rawJSBlock(stmt)
        : block('sz_gk_td_slot', {}, {}, stmt.__id, { X: x, Y: y, SIZE: sz })
    }
    case 'gk:tdDrawSlots':
      return block('sz_gk_td_draw_slots', {}, {}, stmt.__id)
    case 'gk:tdOnBuy': {
      const cost = exprToValueBlock(valueToExpr(stmt.cost))
      return cost === null
        ? rawJSBlock(stmt)
        : block(
            'sz_gk_td_on_buy',
            { PX: stmt.xName, PY: stmt.yName },
            { BODY: statementsToBlocks(stmt.body) },
            stmt.__id,
            { COST: cost },
          )
    }
    case 'gk:tdFreeSlot': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      return x === null || y === null
        ? rawJSBlock(stmt)
        : block('sz_gk_td_free_slot', {}, {}, stmt.__id, { X: x, Y: y })
    }
    case 'gk:tdDrawRange': {
      const r = exprToValueBlock(valueToExpr(stmt.radius))
      return r === null
        ? rawJSBlock(stmt)
        : block('sz_gk_td_draw_range', { WHO: stmt.charVar }, {}, stmt.__id, { RADIUS: r })
    }
    case 'gk:tdSetCoins': {
      const n = exprToValueBlock(valueToExpr(stmt.n))
      return n === null
        ? rawJSBlock(stmt)
        : block('sz_gk_td_set_coins', {}, {}, stmt.__id, { N: n })
    }
    case 'gk:tdAddCoins': {
      const n = exprToValueBlock(valueToExpr(stmt.n))
      return n === null
        ? rawJSBlock(stmt)
        : block('sz_gk_td_add_coins', {}, {}, stmt.__id, { N: n })
    }
    case 'gk:setOpacity': {
      const p = exprToValueBlock(valueToExpr(stmt.percent))
      return p === null
        ? rawJSBlock(stmt)
        : block('sz_gk_set_opacity', { WHO: stmt.charVar }, {}, stmt.__id, { PCT: p })
    }
    case 'gk:fadeTo': {
      const p = exprToValueBlock(valueToExpr(stmt.percent))
      const s2 = exprToValueBlock(valueToExpr(stmt.seconds))
      return p === null || s2 === null
        ? rawJSBlock(stmt)
        : block('sz_gk_fade_to', { WHO: stmt.charVar }, {}, stmt.__id, { PCT: p, SECS: s2 })
    }
    case 'gk:tweenProperty': {
      const t = exprToValueBlock(valueToExpr(stmt.to))
      const s2 = exprToValueBlock(valueToExpr(stmt.seconds))
      return t === null || s2 === null
        ? rawJSBlock(stmt)
        : block('sz_gk_tween_property', { WHO: stmt.charVar, PROP: stmt.prop }, {}, stmt.__id, {
            TO: t,
            SECS: s2,
          })
    }
    case 'gk:lutaMatch': {
      const rounds = exprToValueBlock(valueToExpr(stmt.rounds))
      const secs = exprToValueBlock(valueToExpr(stmt.seconds))
      return rounds === null || secs === null
        ? rawJSBlock(stmt)
        : block('sz_gk_luta_match', { P1: stmt.p1Var, P2: stmt.p2Var }, {}, stmt.__id, {
            ROUNDS: rounds,
            SECS: secs,
          })
    }
    case 'gk:lutaDrawHud':
      return block('sz_gk_luta_draw_hud', {}, {}, stmt.__id)
    case 'gk:lutaFighter':
      return block(
        'sz_gk_luta_fighter',
        {
          WHO: stmt.charVar,
          LEFT: stmt.left,
          RIGHT: stmt.right,
          JUMP: stmt.jump,
          CROUCH: stmt.crouch,
          GUARD: stmt.guard,
          DT: stmt.dtVar,
        },
        {},
        stmt.__id,
      )
    case 'gk:lutaAI':
      return block('sz_gk_luta_ai', { WHO: stmt.charVar, LEVEL: stmt.level }, {}, stmt.__id)
    case 'gk:lutaMove': {
      const dmg = exprToValueBlock(valueToExpr(stmt.damage))
      const range = exprToValueBlock(valueToExpr(stmt.range))
      return dmg === null || range === null
        ? rawJSBlock(stmt)
        : block(
            'sz_gk_luta_move',
            {
              NAME: stmt.name,
              WHO: stmt.charVar,
              SPEED: stmt.speed,
              PIERCE: stmt.pierce ? 'TRUE' : 'FALSE',
              SPECIAL: stmt.special ? 'TRUE' : 'FALSE',
            },
            {},
            stmt.__id,
            { DMG: dmg, RANGE: range },
          )
    }
    case 'gk:lutaMoveAnim': {
      const from = exprToValueBlock(valueToExpr(stmt.from))
      const to = exprToValueBlock(valueToExpr(stmt.to))
      return from === null || to === null
        ? rawJSBlock(stmt)
        : block('sz_gk_luta_move_anim', { NAME: stmt.name, WHO: stmt.charVar }, {}, stmt.__id, {
            FROM: from,
            TO: to,
          })
    }
    case 'gk:lutaAttack':
      return block('sz_gk_luta_attack', { WHO: stmt.charVar, MOVE: stmt.move }, {}, stmt.__id)
    case 'gk:setSwingWindow': {
      const start = exprToValueBlock(valueToExpr(stmt.start))
      const active = exprToValueBlock(valueToExpr(stmt.active))
      return start === null || active === null
        ? rawJSBlock(stmt)
        : block('sz_gk_swing_window', { WHO: stmt.charVar }, {}, stmt.__id, {
            START: start,
            ACTIVE: active,
          })
    }
    case 'gk:playAnimOnce': {
      const from = exprToValueBlock(valueToExpr(stmt.from))
      const to = exprToValueBlock(valueToExpr(stmt.to))
      const fps = exprToValueBlock(valueToExpr(stmt.fps))
      return from === null || to === null || fps === null
        ? rawJSBlock(stmt)
        : block('sz_gk_play_anim_once', { WHO: stmt.charVar }, {}, stmt.__id, {
            FROM: from,
            TO: to,
            FPS: fps,
          })
    }
    case 'gk:setEntityState': {
      const secs = exprToValueBlock(valueToExpr(stmt.seconds))
      return secs === null
        ? rawJSBlock(stmt)
        : block('sz_gk_set_entity_state', { WHO: stmt.charVar, STATE: stmt.state }, {}, stmt.__id, {
            SECS: secs,
          })
    }
    case 'gk:stateAnim': {
      const from = exprToValueBlock(valueToExpr(stmt.from))
      const to = exprToValueBlock(valueToExpr(stmt.to))
      const fps = exprToValueBlock(valueToExpr(stmt.fps))
      return from === null || to === null || fps === null
        ? rawJSBlock(stmt)
        : block(
            'sz_gk_state_anim',
            { WHO: stmt.charVar, STATE: stmt.state, ONCE: stmt.once ? 'TRUE' : 'FALSE' },
            {},
            stmt.__id,
            { FROM: from, TO: to, FPS: fps },
          )
    }
    case 'gk:stateLook':
      return block(
        'sz_gk_state_look',
        { WHO: stmt.charVar, STATE: stmt.state, LOOK: stmt.look },
        {},
        stmt.__id,
      )
    case 'gk:autoAnimate':
      return block('sz_gk_auto_animate', { WHO: stmt.charVar }, {}, stmt.__id)
    case 'gk:thrust': {
      const deg = exprToValueBlock(valueToExpr(stmt.degrees))
      const force = exprToValueBlock(valueToExpr(stmt.force))
      return deg === null || force === null
        ? rawJSBlock(stmt)
        : block('sz_gk_thrust', { WHO: stmt.charVar }, {}, stmt.__id, { DEG: deg, FORCE: force })
    }
    case 'gk:applyFriction': {
      const factor = exprToValueBlock(valueToExpr(stmt.factor))
      return factor === null
        ? rawJSBlock(stmt)
        : block('sz_gk_apply_friction', { WHO: stmt.charVar, DT: stmt.dtVar }, {}, stmt.__id, {
            FACTOR: factor,
          })
    }
    case 'gk:waitThen': {
      const secs = exprToValueBlock(valueToExpr(stmt.seconds))
      return secs === null
        ? rawJSBlock(stmt)
        : block('sz_gk_wait', {}, { DO: statementsToBlocks(stmt.body) }, stmt.__id, { SECS: secs })
    }
    case 'gk:setHitbox': {
      const ox = exprToValueBlock(valueToExpr(stmt.ox))
      const oy = exprToValueBlock(valueToExpr(stmt.oy))
      const w = exprToValueBlock(valueToExpr(stmt.w))
      const h = exprToValueBlock(valueToExpr(stmt.h))
      return ox === null || oy === null || w === null || h === null
        ? rawJSBlock(stmt)
        : block('sz_gk_set_hitbox', { WHO: stmt.charVar }, {}, stmt.__id, {
            OX: ox,
            OY: oy,
            W: w,
            H: h,
          })
    }
    case 'gk:fadeScreen': {
      const s2 = exprToValueBlock(valueToExpr(stmt.seconds))
      return s2 === null
        ? rawJSBlock(stmt)
        : block(
            'sz_gk_fade_screen',
            { COLOR: stmt.color, DIR: stmt.toDark ? 'escurecer' : 'clarear' },
            {},
            stmt.__id,
            { SECS: s2 },
          )
    }
    case 'gk:flashScreen': {
      const t = exprToValueBlock(valueToExpr(stmt.times))
      return t === null
        ? rawJSBlock(stmt)
        : block('sz_gk_flash_screen', { COLOR: stmt.color }, {}, stmt.__id, { TIMES: t })
    }
    case 'gk:saveValue': {
      const v = exprToValueBlock(stmt.value)
      return v === null
        ? rawJSBlock(stmt)
        : block('sz_gk_save_value', { NAME: stmt.name }, {}, stmt.__id, { VALUE: v })
    }
    case 'gk:playMusic':
      return block('sz_gk_play_music', { SOUND: stmt.sound }, {}, stmt.__id)
    case 'gk:stopSound':
      return block('sz_gk_stop_sound', { SOUND: stmt.sound }, {}, stmt.__id)
    case 'gk:setVolume': {
      const l = exprToValueBlock(valueToExpr(stmt.level))
      return l === null
        ? rawJSBlock(stmt)
        : block('sz_gk_set_volume', { SOUND: stmt.sound }, {}, stmt.__id, { LEVEL: l })
    }
    case 'gk:createEmptyTilemap': {
      const c = exprToValueBlock(valueToExpr(stmt.cols))
      const r = exprToValueBlock(valueToExpr(stmt.rows))
      const fi = exprToValueBlock(valueToExpr(stmt.fill))
      return c === null || r === null || fi === null
        ? rawJSBlock(stmt)
        : block(
            'sz_gk_create_empty_tilemap',
            { NAME: stmt.name, ASSET: stmt.asset },
            {},
            stmt.__id,
            { COLS: c, ROWS: r, FILL: fi },
          )
    }
    case 'gk:moveWithCustomKeys':
      return block(
        'sz_gk_move_with_custom_keys',
        {
          WHO: stmt.charVar,
          UP: stmt.up,
          DOWN: stmt.down,
          LEFT: stmt.left,
          RIGHT: stmt.right,
          DT: stmt.dtVar,
        },
        {},
        stmt.__id,
      )
    case 'gk:attackFacing': {
      const range = exprToValueBlock(valueToExpr(stmt.range))
      const dur = exprToValueBlock(valueToExpr(stmt.duration))
      return range === null || dur === null
        ? rawJSBlock(stmt)
        : block('sz_gk_attack_facing', { WHO: stmt.charVar }, {}, stmt.__id, {
            RANGE: range,
            DUR: dur,
          })
    }
    case 'gk:patrolAround': {
      const ox = exprToValueBlock(valueToExpr(stmt.ox))
      const oy = exprToValueBlock(valueToExpr(stmt.oy))
      const radius = exprToValueBlock(valueToExpr(stmt.radius))
      return ox === null || oy === null || radius === null
        ? rawJSBlock(stmt)
        : block('sz_gk_patrol_around', { WHO: stmt.charVar }, {}, stmt.__id, {
            OX: ox,
            OY: oy,
            RADIUS: radius,
          })
    }
    case 'gk:drawHearts': {
      const cur = exprToValueBlock(valueToExpr(stmt.current))
      const mx = exprToValueBlock(valueToExpr(stmt.max))
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      return cur === null || mx === null || x === null || y === null
        ? rawJSBlock(stmt)
        : block('sz_gk_draw_hearts', {}, {}, stmt.__id, { CUR: cur, MAX: mx, X: x, Y: y })
    }
    case 'gk:drawBackground':
      return block(
        'sz_gk_draw_background',
        { COLOR: stmt.color, GRID: stmt.grid ? 'TRUE' : 'FALSE' },
        {},
        stmt.__id,
      )
    case 'gk:createCharacter': {
      const w = exprToValueBlock(valueToExpr(stmt.w))
      const h = exprToValueBlock(valueToExpr(stmt.h))
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      return w === null || h === null || speed === null
        ? rawJSBlock(stmt)
        : block(
            'sz_gk_create_character',
            { NAME: stmt.varName, IMAGE: stmt.image, COLOR: stmt.color },
            {},
            stmt.__id,
            { W: w, H: h, SPEED: speed },
          )
    }
    case 'gk:moveWithKeys':
      return block('sz_gk_move_with_keys', { CHAR: stmt.charVar, DT: stmt.dtVar }, {}, stmt.__id)
    case 'gk:keepOnScreen':
      return block('sz_gk_keep_on_screen', { CHAR: stmt.charVar }, {}, stmt.__id)
    case 'gk:drawCharacter':
      return block('sz_gk_draw_character', { CHAR: stmt.charVar }, {}, stmt.__id)
    case 'gk:placeCharacter': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      return x === null || y === null
        ? rawJSBlock(stmt)
        : block('sz_gk_place_character', { CHAR: stmt.charVar }, {}, stmt.__id, { X: x, Y: y })
    }
    case 'gk:resetCharacter':
      return block('sz_gk_reset_character', { CHAR: stmt.charVar }, {}, stmt.__id)
    case 'gk:setSpeedMultiplier': {
      const factor = exprToValueBlock(valueToExpr(stmt.factor))
      return factor === null
        ? rawJSBlock(stmt)
        : block('sz_gk_set_speed_multiplier', { CHAR: stmt.charVar }, {}, stmt.__id, {
            FACTOR: factor,
          })
    }
    case 'gk:setPauseKey':
      return block('sz_gk_set_pause_key', { KEY: stmt.key }, {}, stmt.__id)
    // ----- game-2d-advanced P24 -----
    case 'gk:onEvent':
      return block(
        'sz_gk_on_event',
        { NAME: stmt.event },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'gk:emit':
      return block('sz_gk_emit', { NAME: stmt.event }, {}, stmt.__id)
    case 'gk:defineMold': {
      const w = exprToValueBlock(valueToExpr(stmt.w))
      const h = exprToValueBlock(valueToExpr(stmt.h))
      const health = exprToValueBlock(valueToExpr(stmt.health))
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      const damage = exprToValueBlock(valueToExpr(stmt.damage))
      return w === null || h === null || health === null || speed === null || damage === null
        ? rawJSBlock(stmt)
        : block(
            'sz_gk_define_mold',
            { NAME: stmt.name, COLOR: stmt.color, IMAGE: stmt.image, LOOK: stmt.look },
            {},
            stmt.__id,
            { W: w, H: h, HEALTH: health, SPEED: speed, DAMAGE: damage },
          )
    }
    case 'gk:spawnFromMold': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      return x === null || y === null
        ? rawJSBlock(stmt)
        : block('sz_gk_spawn_from_mold', { MOLD: stmt.mold }, {}, stmt.__id, { X: x, Y: y })
    }
    case 'gk:startSpawner': {
      const sec = exprToValueBlock(valueToExpr(stmt.seconds))
      return sec === null
        ? rawJSBlock(stmt)
        : block('sz_gk_start_spawner', { MOLD: stmt.mold }, {}, stmt.__id, { SEC: sec })
    }
    case 'gk:stopSpawner':
      return block('sz_gk_stop_spawner', { MOLD: stmt.mold }, {}, stmt.__id)
    case 'gk:spawnNamed': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      return x === null || y === null
        ? rawJSBlock(stmt)
        : block('sz_gk_spawn_named', { NAME: stmt.varName, MOLD: stmt.mold }, {}, stmt.__id, {
            X: x,
            Y: y,
          })
    }
    case 'gk:forEachActive':
      return block(
        'sz_gk_for_each_active',
        { MOLD: stmt.mold, ITEM: stmt.itemName },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'gk:cullOffscreen': {
      const margin = exprToValueBlock(valueToExpr(stmt.margin))
      return margin === null
        ? rawJSBlock(stmt)
        : block('sz_gk_cull_offscreen', { MOLD: stmt.mold }, {}, stmt.__id, { MARGIN: margin })
    }
    case 'gk:recycle':
      return block('sz_gk_recycle', { WHO: stmt.charVar }, {}, stmt.__id)
    case 'gk:drawActive':
      return block('sz_gk_draw_active', { MOLD: stmt.mold }, {}, stmt.__id)
    case 'gk:defineLook': {
      // IR v0.2 (sem tamanho-base) normaliza p/ 40×40 — o default do runtime;
      // o shouldEmitAsShadow marca os literais como SOMBRA (preset editável).
      const baseW = exprToValueBlock(valueToExpr(stmt.baseW ?? 40))
      const baseH = exprToValueBlock(valueToExpr(stmt.baseH ?? 40))
      return baseW === null || baseH === null
        ? rawJSBlock(stmt)
        : block(
            'sz_gk_define_look',
            { NAME: stmt.name, CTX: stmt.ctxName },
            { BODY: statementsToBlocks(stmt.body) },
            stmt.__id,
            { W: baseW, H: baseH },
          )
    }
    case 'gk:drawLook': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const w = exprToValueBlock(valueToExpr(stmt.w))
      const h = exprToValueBlock(valueToExpr(stmt.h))
      return x === null || y === null || w === null || h === null
        ? rawJSBlock(stmt)
        : block('sz_gk_draw_look', { LOOK: stmt.look }, {}, stmt.__id, { X: x, Y: y, W: w, H: h })
    }
    case 'gk:seek':
      return block(
        'sz_gk_seek',
        { WHO: stmt.charVar, TARGET: stmt.targetVar, DT: stmt.dtVar },
        {},
        stmt.__id,
      )
    case 'gk:drift':
      return block('sz_gk_drift', { WHO: stmt.charVar, DT: stmt.dtVar }, {}, stmt.__id)
    case 'gk:face':
      return block('sz_gk_face', { WHO: stmt.charVar, TARGET: stmt.targetVar }, {}, stmt.__id)
    case 'gk:hurt': {
      const amount = exprToValueBlock(valueToExpr(stmt.amount))
      const iframes = exprToValueBlock(valueToExpr(stmt.iframes))
      return amount === null || iframes === null
        ? rawJSBlock(stmt)
        : block('sz_gk_hurt', { WHO: stmt.charVar }, {}, stmt.__id, {
            AMOUNT: amount,
            IFRAMES: iframes,
          })
    }
    case 'gk:knockback': {
      const force = exprToValueBlock(valueToExpr(stmt.force))
      return force === null
        ? rawJSBlock(stmt)
        : block('sz_gk_knockback', { WHO: stmt.charVar, FROM: stmt.fromVar }, {}, stmt.__id, {
            FORCE: force,
          })
    }
    case 'gk:drawHealthBar': {
      const max = exprToValueBlock(valueToExpr(stmt.max))
      return max === null
        ? rawJSBlock(stmt)
        : block('sz_gk_draw_health_bar', { WHO: stmt.charVar }, {}, stmt.__id, { MAX: max })
    }
    case 'gk:setMission': {
      const sec = exprToValueBlock(valueToExpr(stmt.seconds))
      const kills = exprToValueBlock(valueToExpr(stmt.killCount))
      return sec === null || kills === null
        ? rawJSBlock(stmt)
        : block('sz_gk_set_mission', {}, {}, stmt.__id, { SEC: sec, KILLS: kills })
    }
    case 'gk:missionKill':
      return block('sz_gk_mission_kill', {}, {}, stmt.__id)
    case 'gk:drawTimer': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      return x === null || y === null
        ? rawJSBlock(stmt)
        : block('sz_gk_draw_timer', {}, {}, stmt.__id, { X: x, Y: y })
    }
    case 'gk:defineEffect': {
      const count = exprToValueBlock(valueToExpr(stmt.count))
      const size = exprToValueBlock(valueToExpr(stmt.size))
      const life = exprToValueBlock(valueToExpr(stmt.life))
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      const gravity = exprToValueBlock(valueToExpr(stmt.gravity))
      return count === null || size === null || life === null || speed === null || gravity === null
        ? rawJSBlock(stmt)
        : block('sz_gk_define_effect', { NAME: stmt.name, COLOR: stmt.color }, {}, stmt.__id, {
            COUNT: count,
            SIZE: size,
            LIFE: life,
            SPEED: speed,
            GRAVITY: gravity,
          })
    }
    case 'gk:burst': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      return x === null || y === null
        ? rawJSBlock(stmt)
        : block('sz_gk_burst', { EFFECT: stmt.effect }, {}, stmt.__id, { X: x, Y: y })
    }
    case 'gk:drawEffects':
      return block('sz_gk_draw_effects', {}, {}, stmt.__id)
    case 'gk:loadSound':
      return block('sz_gk_load_sound', { NAME: stmt.name, SOUND: stmt.asset }, {}, stmt.__id)
    case 'gk:playSound':
      return block('sz_gk_play_sound', { NAME: stmt.name }, {}, stmt.__id)
    case 'gk:playEffect':
      return block('sz_gk_play_effect', { FX: stmt.fx }, {}, stmt.__id)
    case 'gk:playTone': {
      const freq = exprToValueBlock(valueToExpr(stmt.freq))
      const ms = exprToValueBlock(valueToExpr(stmt.ms))
      return freq === null || ms === null
        ? rawJSBlock(stmt)
        : block('sz_gk_play_tone', {}, {}, stmt.__id, { FREQ: freq, MS: ms })
    }
    // ---- Jogo 3D Avançado (game-3d-advanced) ----
    case 'g3k:setup': {
      const w = exprToValueBlock(valueToExpr(stmt.w))
      const h = exprToValueBlock(valueToExpr(stmt.h))
      const world = exprToValueBlock(valueToExpr(stmt.world))
      return w === null || h === null || world === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_setup', { SKY: stmt.sky, GROUND: stmt.ground }, {}, stmt.__id, {
            W: w,
            H: h,
            SIZE: world,
          })
    }
    case 'g3k:scatterDecor': {
      const count = exprToValueBlock(valueToExpr(stmt.count))
      return count === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_scatter_decor', {}, {}, stmt.__id, { COUNT: count })
    }
    case 'g3k:setEffects': {
      const strength = exprToValueBlock(valueToExpr(stmt.strength))
      return strength === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g3k_set_effects',
            {
              SHADOWS: stmt.shadows ? 'TRUE' : 'FALSE',
              BLOOM: stmt.bloom ? 'TRUE' : 'FALSE',
              VIGNETTE: stmt.vignette ? 'TRUE' : 'FALSE',
            },
            {},
            stmt.__id,
            { STRENGTH: strength },
          )
    }
    case 'g3k:start':
      return block('sz_g3k_start', {}, {}, stmt.__id)
    case 'g3k:defineMold': {
      const health = exprToValueBlock(valueToExpr(stmt.health))
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      return health === null || speed === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g3k_define_mold',
            { NAME: stmt.name },
            { BODY: statementsToBlocks(stmt.body) },
            stmt.__id,
            { HEALTH: health, SPEED: speed },
          )
    }
    case 'g3k:part': {
      const w = exprToValueBlock(valueToExpr(stmt.w))
      const h = exprToValueBlock(valueToExpr(stmt.h))
      const d = exprToValueBlock(valueToExpr(stmt.d))
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return w === null || h === null || d === null || x === null || y === null || z === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g3k_part',
            {
              SHAPE: stmt.shape,
              MATERIAL: stmt.material,
              COLOR: stmt.color,
              TEXTURE: stmt.texture,
              MODEL: stmt.model,
            },
            {},
            stmt.__id,
            { W: w, H: h, D: d, X: x, Y: y, Z: z },
          )
    }
    case 'g3k:spawn': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return x === null || y === null || z === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_spawn', { MOLD: stmt.mold }, {}, stmt.__id, { X: x, Y: y, Z: z })
    }
    case 'g3k:spawnNamed': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return x === null || y === null || z === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_spawn_named', { NAME: stmt.varName, MOLD: stmt.mold }, {}, stmt.__id, {
            X: x,
            Y: y,
            Z: z,
          })
    }
    case 'g3k:spawnFrom':
      return block('sz_g3k_spawn_from', { MOLD: stmt.mold, FROM: stmt.fromVar }, {}, stmt.__id)
    case 'g3k:startSpawner': {
      const sec = exprToValueBlock(valueToExpr(stmt.seconds))
      return sec === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_start_spawner', { MOLD: stmt.mold, WHERE: stmt.where }, {}, stmt.__id, {
            SEC: sec,
          })
    }
    case 'g3k:stopSpawner':
      return block('sz_g3k_stop_spawner', { MOLD: stmt.mold }, {}, stmt.__id)
    case 'g3k:forEachAlive':
      return block(
        'sz_g3k_for_each_alive',
        { MOLD: stmt.mold, ITEM: stmt.itemName },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'g3k:recycle':
      return block('sz_g3k_recycle', { WHO: stmt.charVar }, {}, stmt.__id)
    case 'g3k:recycleAll':
      return block('sz_g3k_recycle_all', { MOLD: stmt.mold }, {}, stmt.__id)
    case 'g3k:cullFar': {
      const dist = exprToValueBlock(valueToExpr(stmt.dist))
      return dist === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_cull_far', { MOLD: stmt.mold }, {}, stmt.__id, { DIST: dist })
    }
    case 'g3k:onUpdate':
      return block(
        'sz_g3k_on_update',
        { DT: stmt.dtName },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'g3k:moveWithKeys': {
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      return speed === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_move_with_keys', { CHAR: stmt.charVar }, {}, stmt.__id, { SPEED: speed })
    }
    case 'g3k:setPauseKey':
      return block('sz_g3k_set_pause_key', { KEY: stmt.key }, {}, stmt.__id)
    case 'g3k:cameraFollow': {
      const dist = exprToValueBlock(valueToExpr(stmt.dist))
      const height = exprToValueBlock(valueToExpr(stmt.height))
      return dist === null || height === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_camera_follow', { CHAR: stmt.charVar }, {}, stmt.__id, {
            DIST: dist,
            HEIGHT: height,
          })
    }
    case 'g3k:cameraOrbit': {
      const dist = exprToValueBlock(valueToExpr(stmt.dist))
      return dist === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_camera_orbit', {}, {}, stmt.__id, { DIST: dist })
    }
    case 'g3k:cameraTop': {
      const height = exprToValueBlock(valueToExpr(stmt.height))
      return height === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_camera_top', {}, {}, stmt.__id, { HEIGHT: height })
    }
    case 'g3k:cameraAngle': {
      const az = exprToValueBlock(valueToExpr(stmt.az))
      const el = exprToValueBlock(valueToExpr(stmt.el))
      return az === null || el === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_camera_angle', {}, {}, stmt.__id, { AZ: az, EL: el })
    }
    case 'g3k:cameraDistance': {
      const dist = exprToValueBlock(valueToExpr(stmt.dist))
      return dist === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_camera_distance', {}, {}, stmt.__id, { DIST: dist })
    }
    case 'g3k:cameraShake': {
      const strength = exprToValueBlock(valueToExpr(stmt.strength))
      const seconds = exprToValueBlock(valueToExpr(stmt.seconds))
      return strength === null || seconds === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_camera_shake', {}, {}, stmt.__id, { STRENGTH: strength, SECONDS: seconds })
    }
    case 'g3k:cameraLens': {
      const fov = exprToValueBlock(valueToExpr(stmt.fov))
      return fov === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_camera_lens', {}, {}, stmt.__id, { FOV: fov })
    }
    case 'g3k:cameraLookAt':
      return block('sz_g3k_camera_look_at', { CHAR: stmt.charVar }, {}, stmt.__id)
    case 'g3k:cameraLookAtPoint': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return x === null || y === null || z === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_camera_look_at_point', {}, {}, stmt.__id, { X: x, Y: y, Z: z })
    }
    case 'g3k:cameraSmooth': {
      const lambda = exprToValueBlock(valueToExpr(stmt.lambda))
      return lambda === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_camera_smooth', {}, {}, stmt.__id, { LAMBDA: lambda })
    }
    case 'g3k:place': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return x === null || y === null || z === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_place', { CHAR: stmt.charVar }, {}, stmt.__id, { X: x, Y: y, Z: z })
    }
    case 'g3k:setYaw': {
      const deg = exprToValueBlock(valueToExpr(stmt.degrees))
      return deg === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_set_yaw', { CHAR: stmt.charVar }, {}, stmt.__id, { DEG: deg })
    }
    case 'g3k:setVelocity': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return x === null || y === null || z === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_set_velocity', { CHAR: stmt.charVar }, {}, stmt.__id, { X: x, Y: y, Z: z })
    }
    case 'g3k:setDrag': {
      const drag = exprToValueBlock(valueToExpr(stmt.drag))
      return drag === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_set_drag', { CHAR: stmt.charVar }, {}, stmt.__id, { DRAG: drag })
    }
    case 'g3k:setEntityValue': {
      const value = exprToValueBlock(stmt.value)
      return value === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_set_entity_value', { CHAR: stmt.charVar, KEY: stmt.key }, {}, stmt.__id, {
            VALUE: value,
          })
    }
    case 'g3k:lookAt':
      return block('sz_g3k_look_at', { WHO: stmt.charVar, TARGET: stmt.targetVar }, {}, stmt.__id)
    case 'g3k:moveForward': {
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      return speed === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_move_forward', { WHO: stmt.charVar }, {}, stmt.__id, { SPEED: speed })
    }
    case 'g3k:fall': {
      const g = exprToValueBlock(valueToExpr(stmt.g))
      return g === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_fall', { CHAR: stmt.charVar }, {}, stmt.__id, { G: g })
    }
    case 'g3k:jump': {
      const force = exprToValueBlock(valueToExpr(stmt.force))
      return force === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_jump', { CHAR: stmt.charVar }, {}, stmt.__id, { FORCE: force })
    }
    case 'g3k:makeSolid':
      return block('sz_g3k_make_solid', { MOLD: stmt.mold }, {}, stmt.__id)
    case 'g3k:setSeed': {
      const seed = exprToValueBlock(valueToExpr(stmt.seed))
      return seed === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_set_seed', {}, {}, stmt.__id, { SEED: seed })
    }
    case 'g3k:makeTrigger':
      return block('sz_g3k_make_trigger', { MOLD: stmt.mold }, {}, stmt.__id)
    case 'g3k:setCollider':
      return block('sz_g3k_set_collider', { MOLD: stmt.mold, SHAPE: stmt.shape }, {}, stmt.__id)
    case 'g3k:setPhysics':
      return block('sz_g3k_set_physics', { MOLD: stmt.mold, KIND: stmt.kind }, {}, stmt.__id)
    case 'g3k:playAnim':
      return block(
        'sz_g3k_play_anim',
        { CHAR: stmt.charVar, CLIP: stmt.clip, LOOP: stmt.loop ? 'LOOP' : 'ONCE' },
        {},
        stmt.__id,
      )
    case 'g3k:stopAnim':
      return block('sz_g3k_stop_anim', { CHAR: stmt.charVar }, {}, stmt.__id)
    case 'g3k:setStateAnim':
      return block(
        'sz_g3k_state_anim',
        { MOLD: stmt.mold, STATE: stmt.state, CLIP: stmt.clip },
        {},
        stmt.__id,
      )
    case 'g3k:playMusic':
      return block('sz_g3k_play_music', { NAME: stmt.name }, {}, stmt.__id)
    case 'g3k:stopMusic':
      return block('sz_g3k_stop_music', {}, {}, stmt.__id)
    case 'g3k:startTimer': {
      const seconds = exprToValueBlock(valueToExpr(stmt.seconds))
      return seconds === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_start_timer', {}, {}, stmt.__id, { SECONDS: seconds })
    }
    case 'g3k:stopTimer':
      return block('sz_g3k_stop_timer', {}, {}, stmt.__id)
    case 'g3k:onTimerEnd':
      return block('sz_g3k_on_timer_end', {}, { BODY: statementsToBlocks(stmt.body) }, stmt.__id)
    case 'g3k:say': {
      const textValue = exprToValueBlock(valueToExpr(stmt.text))
      const seconds = exprToValueBlock(valueToExpr(stmt.seconds))
      return textValue === null || seconds === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_say', { CHAR: stmt.charVar }, {}, stmt.__id, {
            TEXT: textValue,
            SECONDS: seconds,
          })
    }
    case 'g3k:hideSay':
      return block('sz_g3k_hide_say', { CHAR: stmt.charVar }, {}, stmt.__id)
    case 'g3k:passThrough':
      return block(
        'sz_g3k_pass_through',
        { CHAR: stmt.charVar, GHOST: stmt.ghost ? 'TRUE' : 'FALSE' },
        {},
        stmt.__id,
      )
    case 'g3k:showHealthBar':
      return block(
        'sz_g3k_show_health_bar',
        { MOLD: stmt.mold, ON: stmt.on ? 'TRUE' : 'FALSE' },
        {},
        stmt.__id,
      )
    case 'g3k:onOverlap':
      return block(
        'sz_g3k_on_overlap',
        { ZONE: stmt.zoneName, MOLD: stmt.mold, WHO: stmt.whoName },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'g3k:setBounce': {
      const amount = exprToValueBlock(valueToExpr(stmt.amount))
      return amount === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_set_bounce', { MOLD: stmt.mold }, {}, stmt.__id, { AMOUNT: amount })
    }
    case 'g3k:setFriction': {
      const amount = exprToValueBlock(valueToExpr(stmt.amount))
      return amount === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_set_friction', { MOLD: stmt.mold }, {}, stmt.__id, { AMOUNT: amount })
    }
    case 'g3k:platformerKeys': {
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      const jump = exprToValueBlock(valueToExpr(stmt.jump))
      return speed === null || jump === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_platformer_keys', { CHAR: stmt.charVar }, {}, stmt.__id, {
            SPEED: speed,
            JUMP: jump,
          })
    }
    case 'g3k:addLight': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      const intensity = exprToValueBlock(valueToExpr(stmt.intensity))
      return x === null || y === null || z === null || intensity === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_add_light', { COLOR: stmt.color }, {}, stmt.__id, {
            X: x,
            Y: y,
            Z: z,
            INTENSITY: intensity,
          })
    }
    case 'g3k:setAmbient': {
      const intensity = exprToValueBlock(valueToExpr(stmt.intensity))
      return intensity === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_set_ambient', {}, {}, stmt.__id, { INTENSITY: intensity })
    }
    case 'g3k:setFog': {
      const near = exprToValueBlock(valueToExpr(stmt.near))
      const far = exprToValueBlock(valueToExpr(stmt.far))
      return near === null || far === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_set_fog', { COLOR: stmt.color }, {}, stmt.__id, { NEAR: near, FAR: far })
    }
    case 'g3k:setSkyPhoto':
      return block('sz_g3k_set_sky_photo', { PHOTO: stmt.photo }, {}, stmt.__id)
    case 'g3k:setSky':
      return block('sz_g3k_set_sky', { TOP: stmt.top, BOTTOM: stmt.bottom }, {}, stmt.__id)
    case 'g3k:pick':
      return block('sz_g3k_pick', { NAME: stmt.varName, MOLD: stmt.mold }, {}, stmt.__id)
    case 'g3k:cameraFps':
      return block('sz_g3k_camera_fps', { CHAR: stmt.charVar }, {}, stmt.__id)
    case 'g3k:moveFps': {
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      return speed === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_move_fps', { CHAR: stmt.charVar }, {}, stmt.__id, { SPEED: speed })
    }
    case 'g3k:onEnterEntityState':
      return block(
        'sz_g3k_on_enter_entity_state',
        { ITEM: stmt.itemName, MOLD: stmt.mold, STATE: stmt.state },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'g3k:onEntityStateUpdate':
      return block(
        'sz_g3k_on_entity_state_update',
        { ITEM: stmt.itemName, MOLD: stmt.mold, STATE: stmt.state, DT: stmt.dtName },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'g3k:onExitEntityState':
      return block(
        'sz_g3k_on_exit_entity_state',
        { ITEM: stmt.itemName, MOLD: stmt.mold, STATE: stmt.state },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'g3k:setEntityState':
      return block(
        'sz_g3k_set_entity_state',
        { CHAR: stmt.charVar, STATE: stmt.state },
        {},
        stmt.__id,
      )
    case 'g3k:stateTimer': {
      const sec = exprToValueBlock(valueToExpr(stmt.sec))
      return sec === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g3k_state_timer',
            { MOLD: stmt.mold, STATE: stmt.state, NEXT: stmt.next },
            {},
            stmt.__id,
            { SEC: sec },
          )
    }
    case 'g3k:seek':
      return block('sz_g3k_seek', { WHO: stmt.charVar, TARGET: stmt.targetVar }, {}, stmt.__id)
    case 'g3k:seekPoint': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return x === null || z === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_seek_point', { WHO: stmt.charVar }, {}, stmt.__id, { X: x, Z: z })
    }
    case 'g3k:aimAt': {
      const smooth = exprToValueBlock(valueToExpr(stmt.smooth))
      return smooth === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_aim_at', { WHO: stmt.charVar, TARGET: stmt.targetVar }, {}, stmt.__id, {
            SMOOTH: smooth,
          })
    }
    case 'g3k:faceVelocity':
      return block('sz_g3k_face_velocity', { WHO: stmt.charVar }, {}, stmt.__id)
    case 'g3k:forEachNear': {
      const radius = exprToValueBlock(valueToExpr(stmt.radius))
      return radius === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g3k_for_each_near',
            { ITEM: stmt.itemName, MOLD: stmt.mold, CHAR: stmt.charVar },
            { BODY: statementsToBlocks(stmt.body) },
            stmt.__id,
            { RADIUS: radius },
          )
    }
    case 'g3k:storeNearest':
      return block(
        'sz_g3k_store_nearest',
        { NAME: stmt.varName, MOLD: stmt.mold, CHAR: stmt.charVar },
        {},
        stmt.__id,
      )
    case 'g3k:hurt': {
      const amount = exprToValueBlock(valueToExpr(stmt.amount))
      return amount === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_hurt', { WHO: stmt.charVar }, {}, stmt.__id, { AMOUNT: amount })
    }
    case 'g3k:onEntityDeath':
      return block(
        'sz_g3k_on_entity_death',
        { ITEM: stmt.itemName, MOLD: stmt.mold },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'g3k:defineEffect': {
      const count = exprToValueBlock(valueToExpr(stmt.count))
      const spread = exprToValueBlock(valueToExpr(stmt.spread))
      const s1 = exprToValueBlock(valueToExpr(stmt.sizeFrom))
      const s2 = exprToValueBlock(valueToExpr(stmt.sizeTo))
      const life = exprToValueBlock(valueToExpr(stmt.life))
      const gravity = exprToValueBlock(valueToExpr(stmt.gravity))
      return count === null ||
        spread === null ||
        s1 === null ||
        s2 === null ||
        life === null ||
        gravity === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g3k_define_effect',
            { NAME: stmt.name, C1: stmt.colorFrom, C2: stmt.colorTo },
            {},
            stmt.__id,
            { COUNT: count, SPREAD: spread, S1: s1, S2: s2, LIFE: life, GRAVITY: gravity },
          )
    }
    case 'g3k:burstAt': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return x === null || y === null || z === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_burst_at', { EFFECT: stmt.effect }, {}, stmt.__id, { X: x, Y: y, Z: z })
    }
    case 'g3k:burstOn':
      return block('sz_g3k_burst_on', { EFFECT: stmt.effect, WHO: stmt.charVar }, {}, stmt.__id)
    case 'g3k:defineEmitter': {
      const s1 = exprToValueBlock(valueToExpr(stmt.sizeFrom))
      const s2 = exprToValueBlock(valueToExpr(stmt.sizeTo))
      const rate = exprToValueBlock(valueToExpr(stmt.rate))
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      const cone = exprToValueBlock(valueToExpr(stmt.cone))
      const gravity = exprToValueBlock(valueToExpr(stmt.gravity))
      return s1 === null ||
        s2 === null ||
        rate === null ||
        speed === null ||
        cone === null ||
        gravity === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g3k_define_emitter',
            {
              NAME: stmt.name,
              C1: stmt.colorFrom,
              C2: stmt.colorTo,
              GLOW: stmt.glow ? 'TRUE' : 'FALSE',
              CURVE: stmt.curve,
            },
            {},
            stmt.__id,
            { S1: s1, S2: s2, RATE: rate, SPEED: speed, CONE: cone, GRAVITY: gravity },
          )
    }
    case 'g3k:startEmitter': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return x === null || y === null || z === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_start_emitter', { EFFECT: stmt.effect }, {}, stmt.__id, {
            X: x,
            Y: y,
            Z: z,
          })
    }
    case 'g3k:emitterOn':
      return block('sz_g3k_emitter_on', { EFFECT: stmt.effect, WHO: stmt.charVar }, {}, stmt.__id)
    case 'g3k:stopEmitter':
      return block('sz_g3k_stop_emitter', { EFFECT: stmt.effect }, {}, stmt.__id)
    case 'g3k:addAttractor': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      const intensity = exprToValueBlock(valueToExpr(stmt.intensity))
      const radius = exprToValueBlock(valueToExpr(stmt.radius))
      return x === null || y === null || z === null || intensity === null || radius === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_add_attractor', { EFFECT: stmt.effect }, {}, stmt.__id, {
            X: x,
            Y: y,
            Z: z,
            INT: intensity,
            RAD: radius,
          })
    }
    case 'g3k:setScreenText': {
      const title = exprToValueBlock(valueToExpr(stmt.title))
      const text = exprToValueBlock(valueToExpr(stmt.text))
      const button = exprToValueBlock(valueToExpr(stmt.button))
      return title === null || text === null || button === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_set_screen_text', { SCREEN: stmt.screen }, {}, stmt.__id, {
            TITLE: title,
            TEXT: text,
            BTN: button,
          })
    }
    case 'g3k:createScreen': {
      const title = exprToValueBlock(valueToExpr(stmt.title))
      const text = exprToValueBlock(valueToExpr(stmt.text))
      return title === null || text === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_create_screen', { NAME: stmt.name }, {}, stmt.__id, {
            TITLE: title,
            TEXT: text,
          })
    }
    case 'g3k:addButton': {
      const label = exprToValueBlock(valueToExpr(stmt.label))
      return label === null
        ? rawJSBlock(stmt)
        : block(
            'sz_g3k_add_button',
            { SCREEN: stmt.screen },
            { BODY: statementsToBlocks(stmt.body) },
            stmt.__id,
            { LABEL: label },
          )
    }
    case 'g3k:showScreen':
      return block('sz_g3k_show_screen', { SCREEN: stmt.name }, {}, stmt.__id)
    case 'g3k:hideScreens':
      return block('sz_g3k_hide_screens', {}, {}, stmt.__id)
    case 'g3k:hudText': {
      const text = exprToValueBlock(valueToExpr(stmt.text))
      return text === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_hud_text', { SLOT: stmt.slot }, {}, stmt.__id, { TEXT: text })
    }
    case 'g3k:setState':
      return block('sz_g3k_set_state', { STATE: stmt.name }, {}, stmt.__id)
    case 'g3k:onEnterState':
      return block(
        'sz_g3k_on_enter_state',
        { STATE: stmt.name },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'g3k:returnToMenu':
      return block('sz_g3k_return_to_menu', {}, {}, stmt.__id)
    case 'g3k:endGame':
      return block('sz_g3k_end_game', {}, {}, stmt.__id)
    case 'g3k:onEvent':
      return block(
        'sz_g3k_on_event',
        { NAME: stmt.event },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'g3k:emit':
      return block('sz_g3k_emit', { NAME: stmt.event }, {}, stmt.__id)
    case 'g3k:loadSound':
      return block('sz_g3k_load_sound', { SOUND: stmt.asset, NAME: stmt.name }, {}, stmt.__id)
    case 'g3k:playSound':
      return block('sz_g3k_play_sound', { NAME: stmt.name }, {}, stmt.__id)
    case 'g3k:playEffect':
      return block('sz_g3k_play_effect', { FX: stmt.fx }, {}, stmt.__id)
    case 'g3k:playTone': {
      const freq = exprToValueBlock(valueToExpr(stmt.freq))
      const ms = exprToValueBlock(valueToExpr(stmt.ms))
      return freq === null || ms === null
        ? rawJSBlock(stmt)
        : block('sz_g3k_play_tone', {}, {}, stmt.__id, { FREQ: freq, MS: ms })
    }
    // ---- Mundo 3D (world-3d) ----
    case 'w3d:setup': {
      const world = exprToValueBlock(valueToExpr(stmt.world))
      return world === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_setup', { STYLE: stmt.style }, {}, stmt.__id, { WORLD: world })
    }
    case 'w3d:terrain': {
      const h = exprToValueBlock(valueToExpr(stmt.h))
      const s = exprToValueBlock(valueToExpr(stmt.s))
      return h === null || s === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_terrain', {}, {}, stmt.__id, { H: h, S: s })
    }
    case 'w3d:flatten': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      const r = exprToValueBlock(valueToExpr(stmt.r))
      return x === null || z === null || r === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_flatten', {}, {}, stmt.__id, { X: x, Z: z, R: r })
    }
    case 'w3d:path': {
      const x1 = exprToValueBlock(valueToExpr(stmt.x1))
      const z1 = exprToValueBlock(valueToExpr(stmt.z1))
      const x2 = exprToValueBlock(valueToExpr(stmt.x2))
      const z2 = exprToValueBlock(valueToExpr(stmt.z2))
      const w = exprToValueBlock(valueToExpr(stmt.w))
      return x1 === null || z1 === null || x2 === null || z2 === null || w === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_path', {}, {}, stmt.__id, { X1: x1, Z1: z1, X2: x2, Z2: z2, W: w })
    }
    case 'w3d:water': {
      const y = exprToValueBlock(valueToExpr(stmt.y))
      return y === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_water', { COLOR: stmt.color }, {}, stmt.__id, { Y: y })
    }
    case 'w3d:skyPhoto':
      return block('sz_w3d_sky_photo', { ASSET: stmt.asset }, {}, stmt.__id)
    case 'w3d:start':
      return block('sz_w3d_start', {}, {}, stmt.__id)
    case 'w3d:car':
      return block('sz_w3d_car', { STYLE: stmt.style, COLOR: stmt.color }, {}, stmt.__id)
    case 'w3d:carBoost': {
      const force = exprToValueBlock(valueToExpr(stmt.force))
      return force === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_car_boost', {}, {}, stmt.__id, { FORCE: force })
    }
    case 'w3d:engineSound':
      return block('sz_w3d_engine_sound', { ON: stmt.on ? 'ligado' : 'desligado' }, {}, stmt.__id)
    case 'w3d:loadSound':
      return block('sz_w3d_load_sound', { NAME: stmt.name, ASSET: stmt.asset }, {}, stmt.__id)
    case 'w3d:playSound':
      return block('sz_w3d_play_sound', { NAME: stmt.name }, {}, stmt.__id)
    case 'w3d:playMusic':
      return block('sz_w3d_play_music', { NAME: stmt.name }, {}, stmt.__id)
    case 'w3d:stopMusic':
      return block('sz_w3d_stop_music', {}, {}, stmt.__id)
    case 'w3d:hud': {
      const t = exprToValueBlock(valueToExpr(stmt.text))
      return t === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_hud', { CORNER: stmt.corner }, {}, stmt.__id, { TEXT: t })
    }
    case 'w3d:say': {
      const t = exprToValueBlock(valueToExpr(stmt.text))
      const secs = exprToValueBlock(valueToExpr(stmt.secs))
      return t === null || secs === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_say', {}, {}, stmt.__id, { TEXT: t, SECS: secs })
    }
    case 'w3d:point': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return x === null || z === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_point', { NAME: stmt.name }, {}, stmt.__id, { X: x, Z: z })
    }
    case 'w3d:onPoint':
      return block(
        'sz_w3d_on_point',
        { NAME: stmt.name },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'w3d:zone': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      const r = exprToValueBlock(valueToExpr(stmt.r))
      return x === null || z === null || r === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_zone', { NAME: stmt.name }, {}, stmt.__id, { X: x, Z: z, R: r })
    }
    case 'w3d:onZone':
      return block(
        'sz_w3d_on_zone',
        { NAME: stmt.name },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'w3d:totemText': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return x === null || z === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_totem_text', { TITLE: stmt.title, BODY: stmt.body }, {}, stmt.__id, {
            X: x,
            Z: z,
          })
    }
    case 'w3d:totemImage': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      const w = exprToValueBlock(valueToExpr(stmt.w))
      return x === null || z === null || w === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_totem_image', { IMAGE: stmt.image }, {}, stmt.__id, { X: x, Z: z, W: w })
    }
    case 'w3d:galleryCreate': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return x === null || z === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_gallery_create', { TITLE: stmt.title }, {}, stmt.__id, { X: x, Z: z })
    }
    case 'w3d:galleryAdd':
      return block(
        'sz_w3d_gallery_add',
        { IMAGE: stmt.image, CAPTION: stmt.caption },
        {},
        stmt.__id,
      )
    case 'w3d:raceCreate': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      const deg = exprToValueBlock(valueToExpr(stmt.deg))
      const laps = exprToValueBlock(valueToExpr(stmt.laps))
      return x === null || z === null || deg === null || laps === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_race_create', {}, {}, stmt.__id, { X: x, Z: z, DEG: deg, LAPS: laps })
    }
    case 'w3d:raceCheckpoint': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      const deg = exprToValueBlock(valueToExpr(stmt.deg))
      return x === null || z === null || deg === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_race_checkpoint', {}, {}, stmt.__id, { X: x, Z: z, DEG: deg })
    }
    case 'w3d:raceOnStart':
      return block('sz_w3d_race_on_start', {}, { BODY: statementsToBlocks(stmt.body) }, stmt.__id)
    case 'w3d:raceOnCheckpoint':
      return block(
        'sz_w3d_race_on_checkpoint',
        {},
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'w3d:raceOnFinish':
      return block('sz_w3d_race_on_finish', {}, { BODY: statementsToBlocks(stmt.body) }, stmt.__id)
    case 'w3d:bowlingCreate': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      const deg = exprToValueBlock(valueToExpr(stmt.deg))
      return x === null || z === null || deg === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_bowling_create', {}, {}, stmt.__id, { X: x, Z: z, DEG: deg })
    }
    case 'w3d:bowlingReset':
      return block('sz_w3d_bowling_reset', {}, {}, stmt.__id)
    case 'w3d:bowlingOnStrike':
      return block(
        'sz_w3d_bowling_on_strike',
        {},
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'w3d:stack': {
      const n = exprToValueBlock(valueToExpr(stmt.n))
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return n === null || x === null || z === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_stack', { THING: stmt.thing }, {}, stmt.__id, { N: n, X: x, Z: z })
    }
    case 'w3d:carStats': {
      const speed = exprToValueBlock(valueToExpr(stmt.speed))
      const turn = exprToValueBlock(valueToExpr(stmt.turn))
      const jump = exprToValueBlock(valueToExpr(stmt.jump))
      return speed === null || turn === null || jump === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_car_stats', {}, {}, stmt.__id, { SPEED: speed, TURN: turn, JUMP: jump })
    }
    case 'w3d:carPlace': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      const deg = exprToValueBlock(valueToExpr(stmt.deg))
      return x === null || z === null || deg === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_car_place', {}, {}, stmt.__id, { X: x, Z: z, DEG: deg })
    }
    case 'w3d:grass':
      return block('sz_w3d_grass', { AMOUNT: stmt.amount }, {}, stmt.__id)
    case 'w3d:scatter': {
      const n = exprToValueBlock(valueToExpr(stmt.n))
      return n === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_scatter', { THING: stmt.thing }, {}, stmt.__id, { N: n })
    }
    case 'w3d:scatterModel': {
      const n = exprToValueBlock(valueToExpr(stmt.n))
      const s = exprToValueBlock(valueToExpr(stmt.s))
      return n === null || s === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_scatter_model', { MODEL: stmt.model }, {}, stmt.__id, { N: n, S: s })
    }
    case 'w3d:placeThing': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      const s = exprToValueBlock(valueToExpr(stmt.s))
      return x === null || z === null || s === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_place_thing', { THING: stmt.thing }, {}, stmt.__id, { X: x, Z: z, S: s })
    }
    case 'w3d:placeModel': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      const s = exprToValueBlock(valueToExpr(stmt.s))
      const deg = exprToValueBlock(valueToExpr(stmt.deg))
      return x === null || z === null || s === null || deg === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_place_model', { MODEL: stmt.model }, {}, stmt.__id, {
            X: x,
            Z: z,
            S: s,
            DEG: deg,
          })
    }
    case 'w3d:clearArea': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      const r = exprToValueBlock(valueToExpr(stmt.r))
      return x === null || z === null || r === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_clear_area', {}, {}, stmt.__id, { X: x, Z: z, R: r })
    }
    case 'w3d:onCrash':
      return block('sz_w3d_on_crash', {}, { BODY: statementsToBlocks(stmt.body) }, stmt.__id)
    case 'w3d:horn':
      return block('sz_w3d_horn', {}, {}, stmt.__id)
    case 'w3d:onHorn':
      return block('sz_w3d_on_horn', {}, { BODY: statementsToBlocks(stmt.body) }, stmt.__id)
    case 'w3d:carLights':
      return block('sz_w3d_car_lights', {}, {}, stmt.__id)
    case 'w3d:tireMarks':
      return block('sz_w3d_tire_marks', { ON: stmt.on ? 'ligadas' : 'desligadas' }, {}, stmt.__id)
    case 'w3d:carPaint':
      return block('sz_w3d_car_paint', { PAINT: stmt.paint }, {}, stmt.__id)
    case 'w3d:achievement':
      return block('sz_w3d_achievement', { NAME: stmt.name }, {}, stmt.__id)
    case 'w3d:onAchievement':
      return block(
        'sz_w3d_on_achievement',
        { NAME: stmt.name },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'w3d:minimap':
      return block('sz_w3d_minimap', { MODE: stmt.mode }, {}, stmt.__id)
    case 'w3d:racePodium':
      return block('sz_w3d_race_podium', {}, {}, stmt.__id)
    case 'w3d:whisperCorner': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return x === null || z === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_whisper_corner', {}, {}, stmt.__id, { X: x, Z: z })
    }
    case 'w3d:flameNote': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return x === null || z === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_flame_note', { TEXT: stmt.text }, {}, stmt.__id, { X: x, Z: z })
    }
    case 'w3d:coinsScatter': {
      const n = exprToValueBlock(valueToExpr(stmt.n))
      return n === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_coins_scatter', {}, {}, stmt.__id, { N: n })
    }
    case 'w3d:coinsRing': {
      const n = exprToValueBlock(valueToExpr(stmt.n))
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      const r = exprToValueBlock(valueToExpr(stmt.r))
      return n === null || x === null || z === null || r === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_coins_ring', {}, {}, stmt.__id, { N: n, X: x, Z: z, R: r })
    }
    case 'w3d:coinsLine': {
      const n = exprToValueBlock(valueToExpr(stmt.n))
      const x1 = exprToValueBlock(valueToExpr(stmt.x1))
      const z1 = exprToValueBlock(valueToExpr(stmt.z1))
      const x2 = exprToValueBlock(valueToExpr(stmt.x2))
      const z2 = exprToValueBlock(valueToExpr(stmt.z2))
      return n === null || x1 === null || z1 === null || x2 === null || z2 === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_coins_line', {}, {}, stmt.__id, { N: n, X1: x1, Z1: z1, X2: x2, Z2: z2 })
    }
    case 'w3d:onCollect':
      return block('sz_w3d_on_collect', {}, { BODY: statementsToBlocks(stmt.body) }, stmt.__id)
    case 'w3d:quest':
      return block('sz_w3d_quest', { NAME: stmt.name, DESC: stmt.desc }, {}, stmt.__id)
    case 'w3d:questDone':
      return block('sz_w3d_quest_done', { NAME: stmt.name }, {}, stmt.__id)
    case 'w3d:onQuestDone':
      return block(
        'sz_w3d_on_quest_done',
        { NAME: stmt.name },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'w3d:marker': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return x === null || z === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_marker', { ICON: stmt.icon }, {}, stmt.__id, { X: x, Z: z })
    }
    case 'w3d:guideArrow': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return x === null || z === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_guide_arrow', { ON: stmt.on ? 'ligada' : 'desligada' }, {}, stmt.__id, {
            X: x,
            Z: z,
          })
    }
    case 'w3d:npc': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return x === null || z === null
        ? rawJSBlock(stmt)
        : block(
            'sz_w3d_npc',
            { NAME: stmt.name, COLOR: stmt.color, HAT: stmt.hat },
            {},
            stmt.__id,
            { X: x, Z: z },
          )
    }
    case 'w3d:npcWander': {
      const r = exprToValueBlock(valueToExpr(stmt.r))
      return r === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_npc_wander', { NAME: stmt.name }, {}, stmt.__id, { R: r })
    }
    case 'w3d:npcTalk':
      return block(
        'sz_w3d_npc_talk',
        { NAME: stmt.name },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'w3d:npcAsk':
      return block(
        'sz_w3d_npc_ask',
        { NAME: stmt.name, QUESTION: stmt.question, OPT_A: stmt.optA, OPT_B: stmt.optB },
        { BODY_A: statementsToBlocks(stmt.bodyA), BODY_B: statementsToBlocks(stmt.bodyB) },
        stmt.__id,
      )
    case 'w3d:door': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      const deg = exprToValueBlock(valueToExpr(stmt.deg))
      return x === null || z === null || deg === null
        ? rawJSBlock(stmt)
        : block(
            'sz_w3d_door',
            { TITLE: stmt.title, TEXT: stmt.body, IMAGE: stmt.image },
            {},
            stmt.__id,
            { X: x, Z: z, DEG: deg },
          )
    }
    case 'w3d:crops': {
      const n = exprToValueBlock(valueToExpr(stmt.n))
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return n === null || x === null || z === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_crops', { KIND: stmt.kind }, {}, stmt.__id, { N: n, X: x, Z: z })
    }
    case 'w3d:barn': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      const deg = exprToValueBlock(valueToExpr(stmt.deg))
      return x === null || z === null || deg === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_barn', {}, {}, stmt.__id, { X: x, Z: z, DEG: deg })
    }
    case 'w3d:windmill': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return x === null || z === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_windmill', {}, {}, stmt.__id, { X: x, Z: z })
    }
    case 'w3d:fence': {
      const x1 = exprToValueBlock(valueToExpr(stmt.x1))
      const z1 = exprToValueBlock(valueToExpr(stmt.z1))
      const x2 = exprToValueBlock(valueToExpr(stmt.x2))
      const z2 = exprToValueBlock(valueToExpr(stmt.z2))
      return x1 === null || z1 === null || x2 === null || z2 === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_fence', {}, {}, stmt.__id, { X1: x1, Z1: z1, X2: x2, Z2: z2 })
    }
    case 'w3d:animals': {
      const n = exprToValueBlock(valueToExpr(stmt.n))
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      const r = exprToValueBlock(valueToExpr(stmt.r))
      return n === null || x === null || z === null || r === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_animals', { KIND: stmt.kind }, {}, stmt.__id, { N: n, X: x, Z: z, R: r })
    }
    case 'w3d:crater': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      const r = exprToValueBlock(valueToExpr(stmt.r))
      return x === null || z === null || r === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_crater', {}, {}, stmt.__id, { X: x, Z: z, R: r })
    }
    case 'w3d:flag': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return x === null || z === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_flag', { COLOR: stmt.color }, {}, stmt.__id, { X: x, Z: z })
    }
    case 'w3d:rocket': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return x === null || z === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_rocket', {}, {}, stmt.__id, { X: x, Z: z })
    }
    case 'w3d:npcSay':
      return block('sz_w3d_npc_say', { NAME: stmt.name, TEXT: stmt.text }, {}, stmt.__id)
    case 'w3d:npcEmote':
      return block('sz_w3d_npc_emote', { NAME: stmt.name, EMOTE: stmt.emote }, {}, stmt.__id)
    case 'w3d:islands': {
      const n = exprToValueBlock(valueToExpr(stmt.n))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      return n === null || y === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_islands', {}, {}, stmt.__id, { N: n, Y: y })
    }
    case 'w3d:boat':
      return block('sz_w3d_boat', { COLOR: stmt.color }, {}, stmt.__id)
    case 'w3d:bridge': {
      const x1 = exprToValueBlock(valueToExpr(stmt.x1))
      const z1 = exprToValueBlock(valueToExpr(stmt.z1))
      const x2 = exprToValueBlock(valueToExpr(stmt.x2))
      const z2 = exprToValueBlock(valueToExpr(stmt.z2))
      const w = exprToValueBlock(valueToExpr(stmt.w))
      return x1 === null || z1 === null || x2 === null || z2 === null || w === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_bridge', {}, {}, stmt.__id, { X1: x1, Z1: z1, X2: x2, Z2: z2, W: w })
    }
    case 'w3d:lighthouse': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return x === null || z === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_lighthouse', {}, {}, stmt.__id, { X: x, Z: z })
    }
    case 'w3d:ambience':
      return block('sz_w3d_ambience', { KIND: stmt.kind }, {}, stmt.__id)
    case 'w3d:person':
      return block('sz_w3d_person', { COLOR: stmt.color, HAT: stmt.hat }, {}, stmt.__id)
    case 'w3d:personStats': {
      const walk = exprToValueBlock(valueToExpr(stmt.walk))
      const run = exprToValueBlock(valueToExpr(stmt.run))
      const jump = exprToValueBlock(valueToExpr(stmt.jump))
      return walk === null || run === null || jump === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_person_stats', {}, {}, stmt.__id, { WALK: walk, RUN: run, JUMP: jump })
    }
    case 'w3d:personPlace': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      const deg = exprToValueBlock(valueToExpr(stmt.deg))
      return x === null || z === null || deg === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_person_place', {}, {}, stmt.__id, { X: x, Z: z, DEG: deg })
    }
    case 'w3d:personAccessory':
      return block('sz_w3d_person_accessory', { ACC: stmt.acc }, {}, stmt.__id)
    case 'w3d:personEmote':
      return block('sz_w3d_person_emote', { EMOTE: stmt.emote }, {}, stmt.__id)
    case 'w3d:onVehicle':
      return block(
        'sz_w3d_on_vehicle',
        { WHEN: stmt.when },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'w3d:waterfall': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      const h = exprToValueBlock(valueToExpr(stmt.h))
      const deg = exprToValueBlock(valueToExpr(stmt.deg))
      return x === null || z === null || h === null || deg === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_waterfall', {}, {}, stmt.__id, { X: x, Z: z, H: h, DEG: deg })
    }
    case 'w3d:lamp': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return x === null || z === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_lamp', {}, {}, stmt.__id, { X: x, Z: z })
    }
    case 'w3d:city': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return x === null || z === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_city', { SIZE: stmt.size, MODE: stmt.mode }, {}, stmt.__id, { X: x, Z: z })
    }
    case 'w3d:district': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      const size = exprToValueBlock(valueToExpr(stmt.size))
      return x === null || z === null || size === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_district', { KIND: stmt.kind }, {}, stmt.__id, { X: x, Z: z, SIZE: size })
    }
    case 'w3d:roadGrid': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      const size = exprToValueBlock(valueToExpr(stmt.size))
      const width = exprToValueBlock(valueToExpr(stmt.width))
      return x === null || z === null || size === null || width === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_road_grid', { LAYOUT: stmt.layout }, {}, stmt.__id, {
            X: x,
            Z: z,
            SIZE: size,
            WIDTH: width,
          })
    }
    case 'w3d:houseRow': {
      const n = exprToValueBlock(valueToExpr(stmt.n))
      const x1 = exprToValueBlock(valueToExpr(stmt.x1))
      const z1 = exprToValueBlock(valueToExpr(stmt.z1))
      const x2 = exprToValueBlock(valueToExpr(stmt.x2))
      const z2 = exprToValueBlock(valueToExpr(stmt.z2))
      return n === null || x1 === null || z1 === null || x2 === null || z2 === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_house_row', { STYLE: stmt.style }, {}, stmt.__id, {
            N: n,
            X1: x1,
            Z1: z1,
            X2: x2,
            Z2: z2,
          })
    }
    case 'w3d:quality':
      return block('sz_w3d_quality', { MODE: stmt.mode }, {}, stmt.__id)
    case 'w3d:inventoryGive': {
      const n = exprToValueBlock(valueToExpr(stmt.n))
      return n === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_inventory_give', { ITEM: stmt.item }, {}, stmt.__id, { N: n })
    }
    case 'w3d:inventoryRemove': {
      const n = exprToValueBlock(valueToExpr(stmt.n))
      return n === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_inventory_remove', { ITEM: stmt.item }, {}, stmt.__id, { N: n })
    }
    case 'w3d:traffic': {
      const n = exprToValueBlock(valueToExpr(stmt.n))
      return n === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_traffic', { SEM: stmt.sem }, {}, stmt.__id, { N: n })
    }
    case 'w3d:stringLights': {
      const x1 = exprToValueBlock(valueToExpr(stmt.x1))
      const z1 = exprToValueBlock(valueToExpr(stmt.z1))
      const x2 = exprToValueBlock(valueToExpr(stmt.x2))
      const z2 = exprToValueBlock(valueToExpr(stmt.z2))
      return x1 === null || z1 === null || x2 === null || z2 === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_string_lights', {}, {}, stmt.__id, { X1: x1, Z1: z1, X2: x2, Z2: z2 })
    }
    case 'w3d:fireflies':
      return block('sz_w3d_fireflies', { AMOUNT: stmt.amount }, {}, stmt.__id)
    case 'w3d:campfire': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return x === null || z === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_campfire', {}, {}, stmt.__id, { X: x, Z: z })
    }
    case 'w3d:pushPlace': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return x === null || z === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_push_place', { THING: stmt.thing }, {}, stmt.__id, { X: x, Z: z })
    }
    case 'w3d:pushScatter': {
      const n = exprToValueBlock(valueToExpr(stmt.n))
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      const r = exprToValueBlock(valueToExpr(stmt.r))
      return n === null || x === null || z === null || r === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_push_scatter', {}, {}, stmt.__id, { N: n, X: x, Z: z, R: r })
    }
    case 'w3d:letters': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      const s = exprToValueBlock(valueToExpr(stmt.s))
      return x === null || z === null || s === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_letters', { WORD: stmt.word }, {}, stmt.__id, { X: x, Z: z, S: s })
    }
    case 'w3d:explosive': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const z = exprToValueBlock(valueToExpr(stmt.z))
      return x === null || z === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_explosive', {}, {}, stmt.__id, { X: x, Z: z })
    }
    case 'w3d:onExplosion':
      return block('sz_w3d_on_explosion', {}, { BODY: statementsToBlocks(stmt.body) }, stmt.__id)
    case 'w3d:confetti':
      return block('sz_w3d_confetti', {}, {}, stmt.__id)
    case 'w3d:fireworks':
      return block('sz_w3d_fireworks', {}, {}, stmt.__id)
    case 'w3d:tornado': {
      const secs = exprToValueBlock(valueToExpr(stmt.secs))
      return secs === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_tornado', {}, {}, stmt.__id, { SECS: secs })
    }
    case 'w3d:season':
      return block('sz_w3d_season', { SEASON: stmt.season }, {}, stmt.__id)
    case 'w3d:clouds':
      return block('sz_w3d_clouds', { AMOUNT: stmt.amount }, {}, stmt.__id)
    case 'w3d:cameraMode':
      return block('sz_w3d_camera_mode', { MODE: stmt.mode }, {}, stmt.__id)
    case 'w3d:cameraShake': {
      const force = exprToValueBlock(valueToExpr(stmt.force))
      const secs = exprToValueBlock(valueToExpr(stmt.secs))
      return force === null || secs === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_camera_shake', {}, {}, stmt.__id, { FORCE: force, SECS: secs })
    }
    case 'w3d:effects': {
      const strength = exprToValueBlock(valueToExpr(stmt.strength))
      return strength === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_effects', { ON: stmt.on ? 'ligados' : 'desligados' }, {}, stmt.__id, {
            STRENGTH: strength,
          })
    }
    case 'w3d:dayNight': {
      const minutes = exprToValueBlock(valueToExpr(stmt.minutes))
      return minutes === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_daynight', {}, {}, stmt.__id, { MIN: minutes })
    }
    case 'w3d:setTime':
      return block('sz_w3d_set_time', { TIME: stmt.time }, {}, stmt.__id)
    case 'w3d:weather':
      return block('sz_w3d_weather', { W: stmt.kind }, {}, stmt.__id)
    case 'w3d:wind': {
      const force = exprToValueBlock(valueToExpr(stmt.force))
      return force === null
        ? rawJSBlock(stmt)
        : block('sz_w3d_wind', {}, {}, stmt.__id, { F: force })
    }
    case 'w3d:onDayNight':
      return block(
        'sz_w3d_on_daynight',
        { WHEN: stmt.when },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'w3d:onUpdate':
      return block(
        'sz_w3d_on_update',
        { DT: stmt.dtName },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'classDecl': {
      const members: SerializedBlocklyBlock[] = []
      // Construtor só vira bloco se há parâmetros ou corpo (espelha o gerador).
      if ((stmt.ctorParams?.length ?? 0) > 0 || stmt.ctorBody.length > 0) {
        const ctorParams = new Set(stmt.ctorParams ?? [])
        const body = statementsToBlocks(stmt.ctorBody)
        for (const b of body) retypeParamsAsArgs(b, ctorParams)
        // Preserva o `ctorId` no round-trip IR→Blocks: sem isso, recriar a classe
        // a partir do IR daria um id novo ao bloco do construtor e o realce
        // bloco↔código pararia até a próxima edição (o sourcemap usa ctorId).
        const ctor = block('sz_js_constructor', {}, { BODY: body }, stmt.ctorId)
        ctor.extraState = paramsExtra(stmt.ctorParams ?? [])
        members.push(ctor)
      }
      for (const m of stmt.methods) members.push(methodToBlock(m))
      const b = block('sz_js_class', { NAME: stmt.name }, { MEMBERS: members }, stmt.__id)
      if (stmt.superClass) b.extraState = { extends: stmt.superClass }
      return b
    }
    case 'newInstance': {
      // Canvas 3D: com namespace (`new THREE.X`) OU classe de ADDON conhecida sob um
      // projeto three (`new GLTFLoader()`) → o bloco Canvas 3D, com CLASS = referência
      // completa (`THREE.Scene` / `GLTFLoader`). Senão → o bloco genérico do aluno.
      const t3dNamed =
        !!stmt.namespace || (recognizeThree && CANVAS3D_ADDON_CLASSES.has(stmt.className))
      if (t3dNamed) {
        const ref = stmt.namespace ? `${stmt.namespace}.${stmt.className}` : stmt.className
        return callWithArgs(
          'sz_t3d_new_var',
          { VARNAME: stmt.varName, CLASS: ref },
          stmt.args ?? [],
          stmt,
        )
      }
      return callWithArgs(
        'sz_js_new_var',
        { VARNAME: stmt.varName, CLASS: stmt.className },
        stmt.args ?? [],
        stmt,
      )
    }
    case 'importStar':
      return block('sz_t3d_import', { NAME: stmt.name }, {}, stmt.__id)
    case 'importNamed':
      return block(
        'sz_t3d_import_named',
        { NAMES: stmt.names.join(', '), MODULE: stmt.module },
        {},
        stmt.__id,
      )
    case 'callMethod':
      return callWithArgs(
        'sz_js_call_method',
        { OBJ: stmt.objectVar, METHOD: stmt.method },
        stmt.args ?? [],
        stmt,
      )
    case 'eventHandler': {
      const targetKind = resolveEventTargetKind(stmt.target, stmt.targetKind)
      if (targetKind === 'document' || targetKind === 'window') return rawJSBlock(stmt)
      const canonicalEvent =
        stmt.event === 'mousedown'
          ? 'pointerdown'
          : stmt.event === 'mouseup'
            ? 'pointerup'
            : stmt.event
      if (!NAMED_ELEMENT_EVENT_KINDS.has(canonicalEvent)) return rawJSBlock(stmt)
      return block(
        'sz_js_on_event_named',
        {
          EVENT: canonicalEvent,
          TARGET_KIND: targetKind,
          TARGET: stmt.target,
          HANDLER: stmt.handlerName,
        },
        {},
        stmt.__id,
      )
    }
    case 'setThisProp': {
      const value = exprToValueBlock(stmt.value)
      if (!value) return rawJSBlock(stmt)
      return block('sz_js_set_this_prop', { NAME: stmt.name }, {}, stmt.__id, { VALUE: value })
    }
    case 'setProp': {
      const value = exprToValueBlock(stmt.value)
      if (!value) return rawJSBlock(stmt)
      return block('sz_js_set_prop', { OBJ: stmt.objectVar, NAME: stmt.name }, {}, stmt.__id, {
        VALUE: value,
      })
    }
    case 'memberSet': {
      // Canvas 3D: reconhece obj.visible/castShadow/intensity/background/… →
      // bloco amigável (só em projeto three). Senão, propriedade genérica.
      const t3d = recognizeT3dSet(stmt)
      if (t3d) return t3d
      const obj = exprToValueBlock(stmt.object)
      const value = exprToValueBlock(stmt.value)
      if (!obj || !value) return rawJSBlock(stmt)
      return block('sz_js_member_set', { NAME: stmt.name }, {}, stmt.__id, {
        OBJ: obj,
        VALUE: value,
      })
    }
    case 'onClickAssign': {
      const target = exprToValueBlock(stmt.target)
      if (!target) return rawJSBlock(stmt)
      return block('sz_js_element_onclick', {}, { DO: statementsToBlocks(stmt.body) }, stmt.__id, {
        TARGET: target,
      })
    }
    case 'awaitStmt': {
      const value = exprToValueBlock(stmt.value)
      if (!value) return rawJSBlock(stmt)
      return block('sz_js_await', {}, {}, stmt.__id, { VALUE: value })
    }
    case 'setTimeoutCall': {
      const ms = exprToValueBlock(stmt.delay)
      if (!ms) return rawJSBlock(stmt)
      return block('sz_js_set_timeout_call', { FN: stmt.fn }, {}, stmt.__id, { MS: ms })
    }
    case 'indexSet': {
      const obj = exprToValueBlock(stmt.object)
      const index = exprToValueBlock(stmt.index)
      const value = exprToValueBlock(stmt.value)
      if (!obj || !index || !value) return rawJSBlock(stmt)
      return block('sz_js_index_set', {}, {}, stmt.__id, { OBJ: obj, INDEX: index, VALUE: value })
    }
    case 'memberCall': {
      // Canvas 3D: reconhece scene.add / obj.position.set / renderer.render/… →
      // bloco amigável (só em projeto three). Senão, "chamar método" genérico.
      const t3d = recognizeT3dCall(stmt)
      if (t3d) return t3d
      const obj = exprToValueBlock(stmt.object)
      if (!obj) return rawJSBlock(stmt)
      const valueInputs: Record<string, SerializedBlocklyBlock> = { OBJ: obj }
      for (let i = 0; i < stmt.args.length; i += 1) {
        const vb = exprToValueBlock(stmt.args[i] as JSExpr)
        if (!vb) return rawJSBlock(stmt)
        valueInputs[`ARG${i}`] = vb
      }
      const b = block('sz_js_method_on', { METHOD: stmt.method }, {}, stmt.__id, valueInputs)
      if (stmt.args.length > 0) b.extraState = { items: stmt.args.length }
      return b
    }
    case 'superCall':
      return callWithArgs('sz_js_super_ctor', {}, stmt.args, stmt)
    case 'superMethodCall':
      return callWithArgs('sz_js_super_method', { METHOD: stmt.method }, stmt.args, stmt)
    case 'mountRenderer':
      return block('sz_t3d_mount_renderer', { R: stmt.renderer }, {}, stmt.__id)
    case 'loaderLoad': {
      if (!recognizeThree) return rawJSBlock(stmt)
      // URL é o NOME do asset (campo seletor) — sempre string (o parser só casa
      // literal de string). Round-trip fiel com o `field_asset_picker`. O TIPO do
      // bloco é discriminado pelo loader: declarado como AudioLoader → bloco de SOM.
      const url = stmt.url.type === 'str' ? stmt.url.value : ''
      return block(
        stmt.resourceKind === 'audio' || audioLoaderVars.has(stmt.loaderVar)
          ? 'sz_t3d_load_sound'
          : 'sz_t3d_load_model',
        {
          LOADER: stmt.loaderVar,
          PARAM: stmt.param,
          URL: url,
          ERROR_PARAM: stmt.errorParam ?? 'erro',
        },
        {
          DO: statementsToBlocks(stmt.body),
          DO_ERROR: statementsToBlocks(stmt.errorBody ?? []),
        },
        stmt.__id,
      )
    }
    case 'traverseEach': {
      if (!recognizeThree) return rawJSBlock(stmt)
      // `objeto.traverse((parte) => { … })` — o objeto vem no soquete OBJ.
      const obj = exprToValueBlock(stmt.object)
      if (!obj) return rawJSBlock(stmt)
      return block(
        'sz_t3d_traverse',
        { PARAM: stmt.param },
        { DO: statementsToBlocks(stmt.body) },
        stmt.__id,
        { OBJ: obj },
      )
    }
    case 'threeSceneSetup':
      return block('sz_t3d_scene_create', { SCENE: stmt.scene }, {}, stmt.__id)
    case 'threeRendererSetup':
      return block(
        'sz_t3d_renderer_create',
        { RENDERER: stmt.renderer, CANVAS: stmt.canvas },
        {},
        stmt.__id,
      )
    case 'threeCameraSetup': {
      const vs = valueSocketsOf([
        ['FOV', stmt.fov],
        ['NEAR', stmt.near],
        ['FAR', stmt.far],
      ])
      return vs
        ? block(
            'sz_t3d_camera_create',
            { CAMERA: stmt.camera, CANVAS: stmt.canvas },
            {},
            stmt.__id,
            vs,
          )
        : rawJSBlock(stmt)
    }
    case 'threeLightSetup': {
      const vs = valueSocketsOf([
        ['COLOR', stmt.color],
        ['INTENSITY', stmt.intensity],
      ])
      return vs
        ? block(
            'sz_t3d_light_create',
            { LIGHT: stmt.light, SCENE: stmt.scene, KIND: stmt.kind },
            {},
            stmt.__id,
            vs,
          )
        : rawJSBlock(stmt)
    }
    case 'rendererConfig':
      // Forward-only: só chega aqui via block→IR→block (o parser não reconstrói o nó);
      // remonta os dropdowns. Do CÓDIGO, as linhas voltam como blocos genéricos.
      return block(
        'sz_t3d_renderer_config',
        {
          R: stmt.renderer,
          PIXELS: stmt.pixels,
          SHADOWS: stmt.shadows,
          COLORSPACE: stmt.colorSpace,
          TONE: stmt.toneMapping,
        },
        {},
        stmt.__id,
      )
    case 'rendererResponsive':
      return block(
        'sz_t3d_renderer_responsive',
        {
          R: stmt.renderer,
          CAMERA: stmt.camera,
          COMPOSER: stmt.composer ?? '',
          CLEANUP: stmt.cleanup,
        },
        {},
        stmt.__id,
      )
    case 'environmentLoad':
      return block(
        'sz_t3d_load_environment',
        {
          SCENE: stmt.scene,
          URL: stmt.url,
          TEXTURE: stmt.texture,
          BACKGROUND: stmt.background ? 'true' : 'false',
        },
        {},
        stmt.__id,
      )
    case 'disposeObject':
      return block('sz_t3d_dispose_object', { OBJECT: stmt.object }, {}, stmt.__id)
    case 'lerpPosition': {
      const vs = valueSocketsOf([
        ['TARGET', stmt.target],
        ['ALPHA', stmt.alpha],
        ['DT', stmt.dt],
      ])
      return vs
        ? block('sz_t3d_lerp_position', { OBJ: stmt.object }, {}, stmt.__id, vs)
        : rawJSBlock(stmt)
    }
    case 'bloomSetup': {
      // Macro Brilho (forward-only): só chega aqui via block→IR→block. Do CÓDIGO, a
      // esteira volta como blocos primitivos (new EffectComposer/addPass/…).
      const vs = valueSocketsOf([
        ['STRENGTH', stmt.strength],
        ['RADIUS', stmt.radius],
        ['THRESHOLD', stmt.threshold],
      ])
      if (!vs) return rawJSBlock(stmt)
      return block(
        'sz_t3d_bloom_setup',
        { R: stmt.renderer, SCENE: stmt.scene, CAMERA: stmt.camera, COMPOSER: stmt.composer },
        {},
        stmt.__id,
        vs,
      )
    }
    case 'particlesSetup': {
      // Macro Partículas (forward-only): só chega aqui via block→IR→block. Do CÓDIGO,
      // vira os blocos primitivos (BufferGeometry/Points/laço).
      const vs = valueSocketsOf([
        ['COUNT', stmt.count],
        ['SIZE', stmt.size],
        ['SPREAD', stmt.spread],
        ['COLOR', stmt.color],
      ])
      if (!vs) return rawJSBlock(stmt)
      return block(
        'sz_t3d_particles',
        { SCENE: stmt.scene, PARTICLES: stmt.particles },
        {},
        stmt.__id,
        vs,
      )
    }
    case 'waterSetup': {
      // Macro Água (forward-only): só chega aqui via block→IR→block.
      const vs = valueSocketsOf([
        ['SIZE', stmt.size],
        ['COLOR', stmt.color],
      ])
      if (!vs) return rawJSBlock(stmt)
      return block('sz_t3d_water', { SCENE: stmt.scene, WATER: stmt.water }, {}, stmt.__id, vs)
    }
    case 'waterTime': {
      const dt = exprToValueBlock(stmt.dt ?? { type: 'num', value: 1 / 60 })
      return dt
        ? block('sz_t3d_water_wave', { WATER: stmt.water }, {}, stmt.__id, { DT: dt })
        : rawJSBlock(stmt)
    }
    case 'grassSetup': {
      // Macro Grama (forward-only): só chega aqui via block→IR→block.
      const vs = valueSocketsOf([
        ['COUNT', stmt.count],
        ['SIZE', stmt.size],
        ['SPREAD', stmt.spread],
        ['COLOR', stmt.color],
      ])
      if (!vs) return rawJSBlock(stmt)
      return block('sz_t3d_grass', { SCENE: stmt.scene, GRASS: stmt.grass }, {}, stmt.__id, vs)
    }
    case 'grassTime': {
      const dt = exprToValueBlock(stmt.dt ?? { type: 'num', value: 1 / 60 })
      return dt
        ? block('sz_t3d_grass_wave', { GRASS: stmt.grass }, {}, stmt.__id, { DT: dt })
        : rawJSBlock(stmt)
    }
    case 'signSetup': {
      // Macro Letreiro (forward-only): só chega aqui via block→IR→block.
      const vs = valueSocketsOf([
        ['SIZE', stmt.size],
        ['COLOR', stmt.color],
      ])
      if (!vs) return rawJSBlock(stmt)
      return block(
        'sz_t3d_sign',
        { SCENE: stmt.scene, TEXT: stmt.text, SIGN: stmt.sign },
        {},
        stmt.__id,
        vs,
      )
    }
    case 'primitiveSetup': {
      const vs = valueSocketsOf([
        ['W', stmt.width],
        ['H', stmt.height],
        ['D', stmt.depth],
        ['COLOR', stmt.color],
      ])
      if (!vs) return rawJSBlock(stmt)
      return block(
        'sz_t3d_primitive',
        { SHAPE: stmt.shape, SCENE: stmt.scene, MESH: stmt.mesh },
        {},
        stmt.__id,
        vs,
      )
    }
    case 'terrainSetup': {
      const vs = valueSocketsOf([
        ['SIZE', stmt.size],
        ['SEGMENTS', stmt.segments],
        ['HILLS', stmt.hills],
        ['SMOOTH', stmt.smooth],
        ['COLOR', stmt.color],
      ])
      if (!vs) return rawJSBlock(stmt)
      return block(
        'sz_t3d_terrain',
        { SCENE: stmt.scene, TERRAIN: stmt.terrain, HEIGHT_FN: stmt.heightFunction },
        {},
        stmt.__id,
        vs,
      )
    }
    case 'roadSetup': {
      const vs = valueSocketsOf([
        ['X1', stmt.x1],
        ['Z1', stmt.z1],
        ['X2', stmt.x2],
        ['Z2', stmt.z2],
        ['WIDTH', stmt.width],
        ['SEGMENTS', stmt.segments ?? { type: 'num', value: 24 }],
        ['COLOR', stmt.color],
      ])
      if (!vs) return rawJSBlock(stmt)
      return block(
        'sz_t3d_road',
        { SCENE: stmt.scene, ROAD: stmt.road, HEIGHT_FN: stmt.heightFunction ?? 'alturaChao' },
        {},
        stmt.__id,
        vs,
      )
    }
    case 'buildingSetup': {
      const vs = valueSocketsOf([
        ['X', stmt.x],
        ['Z', stmt.z],
        ['W', stmt.width],
        ['H', stmt.height],
        ['D', stmt.depth],
        ['COLOR', stmt.color],
        ['ROOF', stmt.roofColor],
      ])
      if (!vs) return rawJSBlock(stmt)
      return block(
        'sz_t3d_building',
        {
          SCENE: stmt.scene,
          BUILDING: stmt.building,
          HEIGHT_FN: stmt.heightFunction ?? 'alturaChao',
        },
        {},
        stmt.__id,
        vs,
      )
    }
    case 'citySetup': {
      const vs = valueSocketsOf([
        ['BLOCKS_X', stmt.blocksX],
        ['BLOCKS_Z', stmt.blocksZ],
        ['SPACING', stmt.spacing],
        ['ROAD_WIDTH', stmt.roadWidth],
        ['MIN_HEIGHT', stmt.minHeight],
        ['MAX_HEIGHT', stmt.maxHeight],
        ['SEED', stmt.seed],
        ['COLOR', stmt.color],
        ['ROOF', stmt.roofColor],
      ])
      return vs
        ? block(
            'sz_t3d_city',
            { SCENE: stmt.scene, HEIGHT_FN: stmt.heightFunction, CITY: stmt.city },
            {},
            stmt.__id,
            vs,
          )
        : rawJSBlock(stmt)
    }
    case 'physicsLiteSetup': {
      const vs = valueSocketsOf([
        ['GRAVITY', stmt.gravity],
        ['SUBSTEPS', stmt.maxSubSteps],
      ])
      if (!vs) return rawJSBlock(stmt)
      return block(
        'sz_t3d_physics_setup',
        { WORLD: stmt.world, HEIGHT_FN: stmt.heightFunction },
        {},
        stmt.__id,
        vs,
      )
    }
    case 'physicsLiteStaticBox': {
      const vs = valueSocketsOf([
        ['X', stmt.x],
        ['Y', stmt.y],
        ['Z', stmt.z],
        ['W', stmt.width],
        ['H', stmt.height],
        ['D', stmt.depth],
      ])
      if (!vs) return rawJSBlock(stmt)
      return block(
        'sz_t3d_physics_static_box',
        { WORLD: stmt.world, ID: stmt.id },
        {},
        stmt.__id,
        vs,
      )
    }
    case 'physicsLiteStaticSphere': {
      const vs = valueSocketsOf([
        ['X', stmt.x],
        ['Y', stmt.y],
        ['Z', stmt.z],
        ['RADIUS', stmt.radius],
      ])
      return vs
        ? block(
            'sz_t3d_physics_static_sphere',
            { WORLD: stmt.world, ID: stmt.id },
            {},
            stmt.__id,
            vs,
          )
        : rawJSBlock(stmt)
    }
    case 'physicsLiteStaticObject':
      return block(
        'sz_t3d_physics_static_object',
        { WORLD: stmt.world, OBJECT: stmt.object, ID: stmt.id },
        {},
        stmt.__id,
      )
    case 'physicsLiteStaticCity':
      return block(
        'sz_t3d_physics_static_city',
        { WORLD: stmt.world, CITY: stmt.city, PREFIX: stmt.prefix },
        {},
        stmt.__id,
      )
    case 'physicsLiteBody': {
      const vs = valueSocketsOf([
        ['W', stmt.width],
        ['H', stmt.height],
        ['D', stmt.depth],
        ['FRICTION', stmt.friction],
        ['BOUNCE', stmt.bounce],
      ])
      if (!vs) return rawJSBlock(stmt)
      return block(
        'sz_t3d_physics_body',
        { WORLD: stmt.world, OBJECT: stmt.object, ID: stmt.id, KIND: stmt.kind },
        {},
        stmt.__id,
        vs,
      )
    }
    case 'physicsLiteMove': {
      const vs = valueSocketsOf([
        ['X', stmt.x],
        ['Z', stmt.z],
        ['SPEED', stmt.speed],
      ])
      if (!vs) return rawJSBlock(stmt)
      return block('sz_t3d_physics_move', { WORLD: stmt.world, ID: stmt.id }, {}, stmt.__id, vs)
    }
    case 'physicsLiteJump': {
      const vs = valueSocketsOf([['SPEED', stmt.speed]])
      if (!vs) return rawJSBlock(stmt)
      return block('sz_t3d_physics_jump', { WORLD: stmt.world, ID: stmt.id }, {}, stmt.__id, vs)
    }
    case 'physicsLiteTrigger': {
      const vs = valueSocketsOf([
        ['X', stmt.x],
        ['Y', stmt.y],
        ['Z', stmt.z],
        ['W', stmt.width],
        ['H', stmt.height],
        ['D', stmt.depth],
      ])
      if (!vs) return rawJSBlock(stmt)
      return block('sz_t3d_physics_trigger', { WORLD: stmt.world, ID: stmt.id }, {}, stmt.__id, vs)
    }
    case 'physicsLiteStep': {
      const vs = valueSocketsOf([['DT', stmt.dt]])
      if (!vs) return rawJSBlock(stmt)
      return block('sz_t3d_physics_step', { WORLD: stmt.world }, {}, stmt.__id, vs)
    }
    case 'physicsLiteVelocity':
    case 'physicsLiteImpulse':
    case 'physicsLiteTeleport': {
      const vs = valueSocketsOf([
        ['X', stmt.x],
        ['Y', stmt.y],
        ['Z', stmt.z],
      ])
      if (!vs) return rawJSBlock(stmt)
      const type =
        stmt.type === 'physicsLiteVelocity'
          ? 'sz_t3d_physics_velocity'
          : stmt.type === 'physicsLiteImpulse'
            ? 'sz_t3d_physics_impulse'
            : 'sz_t3d_physics_teleport'
      return block(type, { WORLD: stmt.world, ID: stmt.id }, {}, stmt.__id, vs)
    }
    case 'physicsLiteRemove':
      return block('sz_t3d_physics_remove', { WORLD: stmt.world, ID: stmt.id }, {}, stmt.__id)
    case 'physicsLiteClear':
      return block('sz_t3d_physics_clear', { WORLD: stmt.world }, {}, stmt.__id)
    case 'physicsLiteCollisionEvent':
      return block(
        'sz_t3d_physics_on_collision',
        {
          WORLD: stmt.world,
          BODY_PARAM: stmt.bodyParam,
          COLLIDER_PARAM: stmt.colliderParam,
        },
        { DO: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'physicsLiteTriggerEvent':
      return block(
        'sz_t3d_physics_on_trigger',
        {
          WORLD: stmt.world,
          BODY_PARAM: stmt.bodyParam,
          TRIGGER_PARAM: stmt.triggerParam,
          ENTERING_PARAM: stmt.enteringParam,
        },
        { DO: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'physicsLiteRaycast': {
      const vs = valueSocketsOf([
        ['OX', stmt.ox],
        ['OY', stmt.oy],
        ['OZ', stmt.oz],
        ['DX', stmt.dx],
        ['DY', stmt.dy],
        ['DZ', stmt.dz],
        ['MAX', stmt.maxDistance],
      ])
      return vs
        ? block(
            'sz_t3d_physics_raycast',
            { WORLD: stmt.world, RESULT: stmt.result },
            {},
            stmt.__id,
            vs,
          )
        : rawJSBlock(stmt)
    }
    case 'physicsLiteBodyState':
      return block(
        'sz_t3d_physics_body_state',
        { WORLD: stmt.world, ID: stmt.id, RESULT: stmt.result },
        {},
        stmt.__id,
      )
    case 'physicsLiteStats':
      return block(
        'sz_t3d_physics_stats',
        { WORLD: stmt.world, RESULT: stmt.result },
        {},
        stmt.__id,
      )
    case 'exprStatement': {
      const value = exprToValueBlock(stmt.value)
      if (!value) return rawJSBlock(stmt)
      return block('sz_js_expr_statement', {}, {}, stmt.__id, { VALUE: value })
    }
    case 'return': {
      // `return;` (saída antecipada) → bloco sem soquete.
      if (stmt.value === undefined) return block('sz_js_return_void', {}, {}, stmt.__id)
      const value = exprToValueBlock(stmt.value)
      if (!value) return rawJSBlock(stmt)
      return block('sz_js_return', {}, {}, stmt.__id, { VALUE: value })
    }
    case 'funcDecl': {
      const params = new Set(stmt.params)
      const body = statementsToBlocks(stmt.body)
      for (const b of body) retypeParamsAsArgs(b, params)
      const blk = block(
        'sz_js_function',
        { NAME: stmt.name, ASYNC: stmt.async ? 'TRUE' : 'FALSE' },
        { BODY: body },
        stmt.__id,
      )
      blk.extraState = paramsExtra(stmt.params)
      return blk
    }
    case 'callFunction':
      return callWithArgs('sz_js_call_function', { NAME: stmt.name }, stmt.args, stmt)
    case 'arrayPush': {
      const value = exprToValueBlock(stmt.value)
      if (!value) return rawJSBlock(stmt)
      return block('sz_js_array_push', { NAME: stmt.arrayVar }, {}, stmt.__id, { VALUE: value })
    }
    case 'arrayRemove':
      return block('sz_js_array_remove', { NAME: stmt.arrayVar, END: stmt.end }, {}, stmt.__id)
    case 'arraySplice': {
      const start = exprToValueBlock(stmt.start)
      const count = exprToValueBlock(stmt.count)
      if (!start || !count) return rawJSBlock(stmt)
      return block('sz_js_array_splice', { NAME: stmt.arrayVar }, {}, stmt.__id, {
        START: start,
        COUNT: count,
      })
    }
    case 'rawJS':
      return block('sz_adv_raw_js', { CODE: stmt.code }, {}, stmt.__id)
  }
  return null
}

/** Estado serializado do `sz_params_mutator` a partir dos nomes de parâmetros. */
function paramsExtra(names: string[]): { params: Array<{ name: string; id: string }> } {
  return { params: names.map((name, i) => ({ name, id: `p${i}` })) }
}

function methodToBlock(m: {
  __id?: string
  name: string
  params: string[]
  body: JSStatement[]
  async?: boolean
}): SerializedBlocklyBlock {
  const params = new Set(m.params)
  const body = statementsToBlocks(m.body)
  for (const b of body) retypeParamsAsArgs(b, params)
  // Idem ao construtor: passar o `__id` mantém o vínculo entre o bloco no
  // canvas e a entrada de sourcemap após round-trips IR→Blocks.
  const blk = block(
    'sz_js_class_method',
    { NAME: m.name, ASYNC: m.async ? 'TRUE' : 'FALSE' },
    { BODY: body },
    m.__id,
  )
  blk.extraState = paramsExtra(m.params)
  return blk
}

/**
 * Pós-passo do round-trip código→blocos: dentro do escopo de um
 * construtor/método, um `sz_val_variable` cujo nome é um parâmetro vira o
 * relator de parâmetro `sz_val_arg` (bloco cinza estilo MakeCode). Percorre a
 * subárvore serializada (inputs + next).
 */
function retypeParamsAsArgs(node: SerializedBlocklyBlock, params: Set<string>): void {
  if (params.size > 0 && node.type === 'sz_val_variable') {
    const name = node.fields?.NAME
    if (typeof name === 'string' && params.has(name)) node.type = 'sz_val_arg'
  }
  if (node.inputs) {
    for (const input of Object.values(node.inputs)) {
      if (input?.block) retypeParamsAsArgs(input.block, params)
    }
  }
  if (node.next?.block) retypeParamsAsArgs(node.next.block, params)
}

/**
 * Monta um bloco com argumentos variádicos (`sz_js_new_var`/`sz_js_call_method`):
 * cada arg vira uma tomada `ARG{i}` e a contagem vai no `extraState` do mutator.
 * Se algum argumento não for representável como bloco de valor, o statement
 * inteiro cai em "código avançado".
 */
function callWithArgs(
  type: string,
  fields: Record<string, string | number>,
  args: JSExpr[],
  stmt: JSStatement,
): SerializedBlocklyBlock {
  const valueInputs: Record<string, SerializedBlocklyBlock> = {}
  for (let i = 0; i < args.length; i += 1) {
    const vb = exprToValueBlock(args[i] as JSExpr)
    if (!vb) return rawJSBlock(stmt)
    valueInputs[`ARG${i}`] = vb
  }
  const b = block(type, fields, {}, stmt.__id, valueInputs)
  if (args.length > 0) b.extraState = { items: args.length }
  return b
}

/** Tipo do bloco literal por kind de sombra (espelha `shadowFor` da migração). */
const SHADOW_LITERAL_BLOCK: Record<'number' | 'text' | 'color', string> = {
  number: 'sz_val_number',
  text: 'sz_val_text',
  color: 'sz_val_color',
}

/**
 * O valor deste soquete deve ser emitido como SOMBRA? Verdadeiro quando o bloco
 * tem preset de sombra para o slot (fonte: `LEGACY_VALUE_FIELDS`) e o filho é o
 * literal PURO do kind casado. Sem isso, a reconstrução IR→blocos devolvia
 * FROM/TO/FPS (etc.) como blocos REAIS e os preenchimentos automáticos
 * (`fillFrames`/`applySuggestedSize`, que só escrevem em `isShadow()`) morriam
 * em silêncio após uma passada pela Ponte. Getter/expressão nunca vira sombra.
 */
function shouldEmitAsShadow(blockType: string, slot: string, child: SerializedBlocklyBlock) {
  const kind = LEGACY_VALUE_FIELDS[blockType]?.[slot]
  if (!kind) return false
  if (child.type !== SHADOW_LITERAL_BLOCK[kind]) return false
  if (child.inputs && Object.keys(child.inputs).length > 0) return false
  return !child.next
}

function block(
  type: string,
  fields: Record<string, string | number> = {},
  inputs: Record<string, SerializedBlocklyBlock[]> = {},
  id?: string,
  /** Tomadas de valor (`input_value`): um único bloco de valor por slot. */
  valueInputs: Record<string, SerializedBlocklyBlock> = {},
): SerializedBlocklyBlock {
  const serializedInputs = Object.fromEntries(
    Object.entries(inputs)
      .map(([name, children]) => [name, chain(children)])
      .filter((entry): entry is [string, SerializedBlocklyBlock] => Boolean(entry[1])),
  )
  const allInputs: NonNullable<SerializedBlocklyBlock['inputs']> = {
    ...Object.fromEntries(Object.entries(serializedInputs).map(([k, v]) => [k, { block: v }])),
    ...Object.fromEntries(
      Object.entries(valueInputs).map(([k, v]) => [
        k,
        shouldEmitAsShadow(type, k, v) ? { shadow: v } : { block: v },
      ]),
    ),
  }
  return {
    type,
    ...(id ? { id } : {}),
    ...(Object.keys(fields).length > 0 ? { fields } : {}),
    ...(Object.keys(allInputs).length > 0 ? { inputs: allInputs } : {}),
  }
}

/**
 * Converte uma expressão IR no bloco de VALOR (`sz_val_*`) correspondente.
 * Devolve `null` para expressões que nenhum bloco de valor representa (ex.:
 * binop/call) — nesse caso o statement-pai cai em "código avançado".
 *
 * Propaga `expr.__id` como id do bloco de valor para que o source map cruzado
 * (bloco ↔ código) continue casando depois de um round-trip código→blocos.
 */
function exprToValueBlock(expr: JSExpr): SerializedBlocklyBlock | null {
  const built = exprToValueBlockInner(expr)
  if (built && expr.__id && !built.id) built.id = expr.__id
  return built
}

function exprToValueBlockInner(expr: JSExpr): SerializedBlocklyBlock | null {
  const canvasBlock = canvasExpressionIRToBlock(expr, {
    block,
    expressionToBlock: exprToValueBlock,
    valueBlocks,
  })
  if (canvasBlock !== undefined) return canvasBlock
  switch (expr.type) {
    case 'num':
      return block('sz_val_number', { NUM: expr.value })
    case 'str':
      return block('sz_val_text', { TEXT: expr.value })
    case 'color':
      return block('sz_val_color', { COLOR: expr.value })
    case 'colorAlpha':
      return block('sz_val_color_alpha', { COLOR: expr.hex, ALPHA: Math.round(expr.alpha * 100) })
    case 'var':
      return block('sz_val_variable', { NAME: expr.name })
    case 'bool':
      return block('sz_val_bool', { VALUE: expr.value ? 'true' : 'false' })
    case 'null':
      return block('sz_val_null')
    case 'g2d:keyDown':
      return block('sz_g2d_key_down', { KEY: expr.key })
    case 'g2d:touches':
      return block('sz_g2d_touches', { A: expr.aVar, B: expr.bVar })
    case 'g2d:countGroup':
      return block('sz_g2d_count_group', { GROUP: expr.groupVar })
    case 'g2d:spriteAngle':
      return block('sz_g2d_sprite_angle', { SPRITE: expr.spriteVar })
    case 'g2d:distance':
      return block('sz_g2d_distance', { A: expr.aVar, B: expr.bVar })
    case 'g2d:angleTo':
      return block('sz_g2d_angle_to', { A: expr.aVar, B: expr.bVar })
    case 'g2d:getHealth':
      return block('sz_g2d_get_health', { SPRITE: expr.spriteVar })
    case 'g2d:getMaxHealth':
      return block('sz_g2d_get_max_health', { SPRITE: expr.spriteVar })
    case 'g2d:enemyDamage':
      return block('sz_g2d_enemy_damage', { SPRITE: expr.spriteVar })
    case 'g2d:spriteX':
      return block('sz_g2d_sprite_x', { SPRITE: expr.spriteVar })
    case 'g2d:spriteY':
      return block('sz_g2d_sprite_y', { SPRITE: expr.spriteVar })
    case 'g2d:spriteW':
      return block('sz_g2d_sprite_w', { SPRITE: expr.spriteVar })
    case 'g2d:spriteH':
      return block('sz_g2d_sprite_h', { SPRITE: expr.spriteVar })
    case 'g2d:centerX':
      return block('sz_g2d_center_x', { SPRITE: expr.spriteVar })
    case 'g2d:centerY':
      return block('sz_g2d_center_y', { SPRITE: expr.spriteVar })
    case 'g2d:shapeW':
      return block('sz_g2d_shape_w', {})
    case 'g2d:shapeH':
      return block('sz_g2d_shape_h', {})
    case 'g2d:spriteVx':
      return block('sz_g2d_sprite_vx', { SPRITE: expr.spriteVar })
    case 'g2d:spriteVy':
      return block('sz_g2d_sprite_vy', { SPRITE: expr.spriteVar })
    case 'g2d:spriteSpeed':
      return block('sz_g2d_sprite_speed', { SPRITE: expr.spriteVar })
    case 'g2d:isMoving':
      return block('sz_g2d_is_moving', { SPRITE: expr.spriteVar })
    case 'g2d:isMovingH':
      return block('sz_g2d_is_moving_h', { SPRITE: expr.spriteVar })
    case 'g2d:isMovingV':
      return block('sz_g2d_is_moving_v', { SPRITE: expr.spriteVar })
    case 'g2d:randomBetween': {
      const vs = valueBlocks({ MIN: valueToExpr(expr.min), MAX: valueToExpr(expr.max) })
      return vs === null ? null : block('sz_g2d_random_between', {}, {}, expr.__id, vs)
    }
    case 'g2d:randomChance': {
      const p = exprToValueBlock(valueToExpr(expr.percent))
      return p === null ? null : block('sz_g2d_random_chance', {}, {}, expr.__id, { PERCENT: p })
    }
    case 'g2d:hasHealth':
      return block('sz_g2d_has_health', { SPRITE: expr.spriteVar })
    case 'g2d:healthDepleted':
      return block('sz_g2d_health_depleted', { SPRITE: expr.spriteVar })
    case 'g2d:isInvincible':
      return block('sz_g2d_is_invincible', { SPRITE: expr.spriteVar })
    case 'g2d:cooldownReady': {
      const f = exprToValueBlock(valueToExpr(expr.frames))
      return f === null
        ? null
        : block('sz_g2d_cooldown_ready', { SPRITE: expr.spriteVar }, {}, expr.__id, { FRAMES: f })
    }
    case 'g2d:isPaused':
      return block('sz_g2d_is_paused', {})
    case 'g2d:cameraX':
      return block('sz_g2d_camera_x', {})
    case 'g2d:cameraY':
      return block('sz_g2d_camera_y', {})
    case 'g2d:randomX':
      return block('sz_g2d_random_x', {})
    case 'g2d:randomY':
      return block('sz_g2d_random_y', {})
    case 'g2d:tileAtSprite':
      return block('sz_g2d_tile_at', { MAP: expr.mapVar, SPRITE: expr.spriteVar })
    case 'g2d:sceneIs':
      return block('sz_g2d_scene_is', { SCENE: expr.name })
    case 'g2d:stickHeroScore':
      return block('sz_g2d_stickhero_score', { GAME: expr.gameVar })
    case 'g2d:stickHeroOver':
      return block('sz_g2d_stickhero_over', { GAME: expr.gameVar })
    case 'g2d:balloonScore':
      return block('sz_g2d_balloon_score', { GAME: expr.gameVar })
    case 'g2d:balloonFuel':
      return block('sz_g2d_balloon_fuel', { GAME: expr.gameVar })
    case 'g2d:balloonOver':
      return block('sz_g2d_balloon_over', { GAME: expr.gameVar })
    case 'g2d:aimReleased':
      return block('sz_g2d_aim_released', { THROWER: expr.throwerVar })
    case 'g2d:bananaHitThrower':
      return block('sz_g2d_banana_hit_thrower', { CITY: expr.cityVar, THROWER: expr.throwerVar })
    case 'g2d:bananaHitCity':
      return block('sz_g2d_banana_hit_city', { CITY: expr.cityVar })
    case 'g3d:keyDown':
      return block('sz_g3d_key_down', { KEY: expr.key })
    case 'g3d:collides':
      return block('sz_g3d_collides', { A: expr.aVar, B: expr.bVar })
    case 'g3d:hitAny':
      return block('sz_g3d_hit_any', { OBJ: expr.objVar, GROUP: expr.groupVar })
    case 'g3d:crosserHit':
      return block('sz_g3d_crosser_hit', { OBJ: expr.objVar, WORLD: expr.worldVar })
    case 'g3d:crosserRow':
      return block('sz_g3d_crosser_row', { OBJ: expr.objVar })
    case 'g3d:touchesBox':
      return block('sz_g3d_touches_box', { OBJ: expr.objVar, GROUP: expr.groupVar })
    case 'g3d:distanceTo':
      return block('sz_g3d_distance_to', { A: expr.aVar, B: expr.bVar })
    case 'g3d:countSwarm':
      return block('sz_g3d_count_swarm', { SWARM: expr.swarmVar })
    case 'g3d:isNear': {
      const dist = exprToValueBlock(valueToExpr(expr.dist))
      return dist === null
        ? null
        : block('sz_g3d_is_near', { A: expr.aVar, B: expr.bVar }, {}, expr.__id, { DIST: dist })
    }
    case 'g3d:raceHit':
      return block('sz_g3d_race_hit', { OBJ: expr.objVar, WORLD: expr.worldVar })
    case 'g3d:raceLaps':
      return block('sz_g3d_race_laps', { OBJ: expr.objVar })
    case 'g3d:stackScore':
      return block('sz_g3d_stack_score', { WORLD: expr.worldVar })
    case 'g3d:stackGameOver':
      return block('sz_g3d_stack_game_over', { WORLD: expr.worldVar })
    case 'g3d:getPos':
      return block('sz_g3d_get_pos', { OBJ: expr.objVar, AXIS: expr.axis })
    case 'g3d:getRot':
      return block('sz_g3d_get_rot', { OBJ: expr.objVar, AXIS: expr.axis })
    case 'g3d:getScale':
      return block('sz_g3d_get_scale', { OBJ: expr.objVar })
    case 'g3d:getVel':
      return block('sz_g3d_get_vel', { OBJ: expr.objVar, AXIS: expr.axis })
    case 'g3d:getSpeed':
      return block('sz_g3d_get_speed', { OBJ: expr.objVar })
    case 'g3d:isMoving':
      return block('sz_g3d_is_moving', { OBJ: expr.objVar })
    case 'g3d:dt':
      return block('sz_g3d_dt', { WORLD: expr.worldVar })
    case 'g3d:angleTo':
      return block('sz_g3d_angle_to', { A: expr.aVar, B: expr.bVar })
    case 'g3d:pickAtMouse':
      return block('sz_g3d_pick_at_mouse', { WORLD: expr.worldVar })
    case 'g3d:pointerOver':
      return block('sz_g3d_pointer_over', { WORLD: expr.worldVar, OBJ: expr.objVar })
    case 'g3d:aimAhead': {
      const dist = exprToValueBlock(valueToExpr(expr.dist))
      return dist === null
        ? null
        : block('sz_g3d_aim_ahead', { WORLD: expr.worldVar, OBJ: expr.objVar }, {}, expr.__id, {
            DIST: dist,
          })
    }
    case 'g3d:onGround':
      return block('sz_g3d_on_ground', { WORLD: expr.worldVar, OBJ: expr.objVar })
    case 'g3d:groundHeight':
      return block('sz_g3d_ground_height', { WORLD: expr.worldVar, OBJ: expr.objVar })
    // ----- game-2d-advanced (kit profissional) -----
    case 'gk:gameWidth':
      return block('sz_gk_game_width', {})
    case 'gk:gameHeight':
      return block('sz_gk_game_height', {})
    case 'gk:gameState':
      return block('sz_gk_game_state', {})
    case 'gk:stateIs':
      return block('sz_gk_state_is', { STATE: expr.name })
    case 'gk:charactersTouch':
      return block('sz_gk_characters_touch', { A: expr.aVar, B: expr.bVar })
    case 'gk:charX':
      return block('sz_gk_char_x', { CHAR: expr.charVar })
    case 'gk:charY':
      return block('sz_gk_char_y', { CHAR: expr.charVar })
    case 'gk:keyDown':
      return block('sz_gk_key_down', { KEY: expr.key })
    case 'gk:keyPressed':
      return block('sz_gk_key_pressed', { KEY: expr.key })
    case 'gk:countActive':
      return block('sz_gk_count_active', { MOLD: expr.mold })
    case 'gk:touchCircle':
      return block('sz_gk_touching_circle', { A: expr.aVar, B: expr.bVar })
    case 'gk:didHit':
      return block('sz_gk_did_hit', { WHO: expr.aVar, TARGET: expr.bVar })
    case 'gk:isOnGround':
      return block('sz_gk_is_on_ground', { WHO: expr.charVar })
    // 👾 R16 — Kit Monstrinhos
    case 'gk:pkmLevelOf':
      return block('sz_gk_pkm_level_of', { CREATURE: expr.creature })
    case 'gk:pkmHas':
      return block('sz_gk_pkm_has', { CREATURE: expr.creature })
    case 'gk:pkmTeamSize':
      return block('sz_gk_pkm_team_size', {})
    case 'gk:pkmBallCount':
      return block('sz_gk_pkm_ball_count', {})
    case 'gk:pkmCaught':
      return block('sz_gk_pkm_caught', {})
    // 🧭 R15 — primitivos gerais
    case 'gk:isInside':
      return block('sz_gk_is_inside', { WHO: expr.charVar, REGION: expr.region })
    case 'gk:overlapPercent':
      return block('sz_gk_overlap_percent', { WHO: expr.charVar, REGION: expr.region })
    case 'gk:chance': {
      const p = exprToValueBlock(valueToExpr(expr.percent))
      return p === null ? null : block('sz_gk_chance', {}, {}, undefined, { PCT: p })
    }
    case 'gk:distanceBetween':
      return block('sz_gk_distance_between', { A: expr.a, B: expr.b })
    case 'gk:pointIn': {
      const x = exprToValueBlock(valueToExpr(expr.x))
      const y = exprToValueBlock(valueToExpr(expr.y))
      return x === null || y === null
        ? null
        : block('sz_gk_point_in', { WHO: expr.charVar }, {}, undefined, { X: x, Y: y })
    }
    case 'gk:opacityOf':
      return block('sz_gk_opacity_of', { WHO: expr.charVar })
    case 'gk:savedValue':
      return block('sz_gk_saved_value', { NAME: expr.name })
    case 'gk:velocityOf':
      return block('sz_gk_velocity_of', { WHO: expr.charVar, AXIS: expr.axis })
    case 'gk:propertyOf':
      return block('sz_gk_property_of', { WHO: expr.charVar, PROP: expr.prop })
    case 'gk:facingOf':
      return block('sz_gk_facing_of', { WHO: expr.charVar })
    case 'gk:cooldownReady': {
      const secs = exprToValueBlock(valueToExpr(expr.seconds))
      return secs === null
        ? null
        : block('sz_gk_cooldown_ready', { WHO: expr.charVar }, {}, expr.__id, { SECS: secs })
    }
    case 'gk:tileAt': {
      const x = exprToValueBlock(valueToExpr(expr.x))
      const y = exprToValueBlock(valueToExpr(expr.y))
      return x === null || y === null
        ? null
        : block('sz_gk_tile_at', { MAP: expr.map }, {}, expr.__id, { X: x, Y: y })
    }
    case 'gk:isDead':
      return block('sz_gk_is_dead', { CHAR: expr.charVar })
    case 'gk:isInvincible':
      return block('sz_gk_is_invincible', { CHAR: expr.charVar })
    case 'gk:healthOf':
      return block('sz_gk_health_of', { CHAR: expr.charVar })
    case 'gk:animEnded':
      return block('sz_gk_anim_ended', { WHO: expr.charVar })
    case 'gk:lutaWinner':
      return block('sz_gk_luta_winner', {})
    case 'gk:lutaRound':
      return block('sz_gk_luta_round', {})
    case 'gk:lutaWinsOf':
      return block('sz_gk_luta_wins_of', { WHO: expr.charVar })
    case 'gk:lutaCombo':
      return block('sz_gk_luta_combo', { WHO: expr.charVar })
    case 'gk:lutaSpecial':
      return block('sz_gk_luta_special', { WHO: expr.charVar })
    case 'gk:lutaIsGuarding':
      return block('sz_gk_luta_is_guarding', { WHO: expr.charVar })
    case 'gk:entityState':
      return block('sz_gk_entity_state', { WHO: expr.charVar })
    case 'gk:angleOf':
      return block('sz_gk_angle_of', { WHO: expr.charVar })
    case 'gk:angleTo':
      return block('sz_gk_angle_to', { WHO: expr.charVar, TARGET: expr.targetVar })
    case 'gk:nearestActive': {
      const x = exprToValueBlock(valueToExpr(expr.x))
      const y = exprToValueBlock(valueToExpr(expr.y))
      return x === null || y === null
        ? null
        : block('sz_gk_nearest_active', { MOLD: expr.mold }, {}, expr.__id, { X: x, Y: y })
    }
    case 'gk:randomActive':
      return block('sz_gk_random_active', { MOLD: expr.mold })
    case 'gk:navePowerOf':
      return block('sz_gk_nave_power_of', { WHO: expr.charVar })
    case 'gk:pathProgress':
      return block('sz_gk_path_progress', { WHO: expr.charVar })
    case 'gk:pickActive':
      return block('sz_gk_pick_active', { MOLD: expr.mold, MODE: expr.mode, PROP: expr.prop })
    case 'gk:tdCoins':
      return block('sz_gk_td_coins', {})
    case 'gk:countItem':
      return block('sz_gk_count_item', { NAME: expr.name })
    case 'gk:timeSurvived':
      return block('sz_gk_time_survived', {})
    case 'gk:kills':
      return block('sz_gk_kills', {})
    case 'gk:cameraX':
      return block('sz_gk_camera_x', {})
    case 'gk:cameraY':
      return block('sz_gk_camera_y', {})
    case 'gk:mouseX':
      return block('sz_gk_mouse_x', {})
    case 'gk:mouseY':
      return block('sz_gk_mouse_y', {})
    case 'gk:mouseScreenX':
      return block('sz_gk_mouse_screen_x', {})
    case 'gk:mouseScreenY':
      return block('sz_gk_mouse_screen_y', {})
    case 'gk:mouseDown':
      return block('sz_gk_mouse_down', {})
    case 'gk:rpgCell': {
      const n = exprToValueBlock(valueToExpr(expr.n))
      return n === null ? null : block('sz_gk_rpg_cell', {}, {}, expr.__id, { N: n })
    }
    case 'gk:rpgHasFlag':
      return block('sz_gk_rpg_has_flag', { FLAG: expr.flag })
    case 'gk:rpgHasItem':
      return block('sz_gk_rpg_has_item', { NAME: expr.item })
    case 'gk:rpgBattleWon':
      return block('sz_gk_rpg_battle_won', {})
    case 'gk:rpgHasSave':
      return block('sz_gk_rpg_has_save', {})
    case 'gk:rpgLevel':
      return block('sz_gk_rpg_level', {})
    case 'gk:rpgXp':
      return block('sz_gk_rpg_xp', {})
    case 'gk:battlerLife':
      return block('sz_gk_battler_life', { NAME: expr.name })
    case 'gk:battlerMaxLife':
      return block('sz_gk_battler_max_life', { NAME: expr.name })
    case 'gk:rpgCurrentMap':
      return block('sz_gk_rpg_current_map', {})
    case 'gk:boardGet': {
      const col = exprToValueBlock(valueToExpr(expr.col))
      const row = exprToValueBlock(valueToExpr(expr.row))
      return col === null || row === null
        ? null
        : block('sz_gk_board_get', { NAME: expr.name }, {}, expr.__id, { COL: col, ROW: row })
    }
    case 'gk:boardCount': {
      const value = exprToValueBlock(valueToExpr(expr.value))
      return value === null
        ? null
        : block('sz_gk_board_count', { NAME: expr.name }, {}, expr.__id, { VALUE: value })
    }
    case 'gk:boardIn': {
      const col = exprToValueBlock(valueToExpr(expr.col))
      const row = exprToValueBlock(valueToExpr(expr.row))
      return col === null || row === null
        ? null
        : block('sz_gk_board_in', { NAME: expr.name }, {}, expr.__id, { COL: col, ROW: row })
    }
    case 'gk:rollDice': {
      const faces = exprToValueBlock(valueToExpr(expr.faces))
      return faces === null ? null : block('sz_gk_roll_dice', {}, {}, expr.__id, { FACES: faces })
    }
    case 'gk:currentPlayer':
      return block('sz_gk_current_player', {})
    case 'gk:spaceOf':
      return block('sz_gk_space_of', { WHO: expr.who })
    case 'gk:pileTop':
      return block('sz_gk_pile_top', { PILE: expr.pileVar })
    case 'gk:pileSize':
      return block('sz_gk_pile_size', { PILE: expr.pileVar })
    case 'gk:card': {
      const front = exprToValueBlock(valueToExpr(expr.front))
      const back = exprToValueBlock(valueToExpr(expr.back))
      return front === null || back === null
        ? null
        : block('sz_gk_card', {}, {}, expr.__id, { FRONT: front, BACK: back })
    }
    case 'gk:cardIsUp': {
      const card = exprToValueBlock(valueToExpr(expr.card))
      return card === null ? null : block('sz_gk_card_is_up', {}, {}, expr.__id, { CARD: card })
    }
    case 'gk:cardFace': {
      const card = exprToValueBlock(valueToExpr(expr.card))
      return card === null ? null : block('sz_gk_card_face', {}, {}, expr.__id, { CARD: card })
    }
    case 'gk:cardAt': {
      const x = exprToValueBlock(valueToExpr(expr.x))
      const y = exprToValueBlock(valueToExpr(expr.y))
      return x === null || y === null
        ? null
        : block('sz_gk_card_at', { PILE: expr.pileVar }, {}, expr.__id, { X: x, Y: y })
    }
    case 'gk:cardsEnergy':
      return block('sz_gk_cards_energy', {})
    case 'gk:cardsHeroLife':
      return block('sz_gk_cards_hero_life', {})
    case 'gk:cardsEnemyLife':
      return block('sz_gk_cards_enemy_life', {})
    case 'gk:cardsIntentAction':
      return block('sz_gk_cards_intent_action', {})
    case 'gk:cardsIntentValue':
      return block('sz_gk_cards_intent_value', {})
    // ---- Jogo 3D Avançado (game-3d-advanced) ----
    case 'g3k:worldSize':
      return block('sz_g3k_world_size', {})
    case 'g3k:countAlive':
      return block('sz_g3k_count_alive', { MOLD: expr.mold })
    case 'g3k:keyDown':
      return block('sz_g3k_key_down', { KEY: expr.key })
    case 'g3k:keyPressed':
      return block('sz_g3k_key_pressed', { KEY: expr.key })
    case 'g3k:mouseDown':
      return block('sz_g3k_mouse_down', {})
    case 'g3k:mousePressed':
      return block('sz_g3k_mouse_pressed', {})
    case 'g3k:posOf':
      return block('sz_g3k_pos_of', { AXIS: expr.axis, CHAR: expr.charVar })
    case 'g3k:exists':
      return block('sz_g3k_exists', { CHAR: expr.charVar })
    case 'g3k:entityStateIs':
      return block('sz_g3k_entity_state_is', { CHAR: expr.charVar, STATE: expr.state })
    case 'g3k:isMold':
      return block('sz_g3k_is_mold', { CHAR: expr.charVar, MOLD: expr.mold })
    case 'g3k:isAimingAt':
      return block('sz_g3k_is_aiming_at', { A: expr.aVar, B: expr.bVar })
    case 'g3k:touches': {
      const dist = exprToValueBlock(valueToExpr(expr.dist))
      return dist === null
        ? null
        : block('sz_g3k_touches', { A: expr.aVar, B: expr.bVar }, {}, expr.__id, { DIST: dist })
    }
    case 'g3k:healthOf':
      return block('sz_g3k_health_of', { CHAR: expr.charVar })
    case 'g3k:entityValue':
      return block('sz_g3k_entity_value', { KEY: expr.key, CHAR: expr.charVar })
    case 'g3k:stateTime':
      return block('sz_g3k_state_time', { CHAR: expr.charVar })
    case 'g3k:onGround':
      return block('sz_g3k_on_ground', { CHAR: expr.charVar })
    case 'g3k:velocityOf':
      return block('sz_g3k_velocity_of', { CHAR: expr.charVar, AXIS: expr.axis })
    case 'g3k:distanceBetween':
      return block('sz_g3k_distance_between', { A: expr.aVar, B: expr.bVar })
    case 'g3k:randomBetween': {
      const from = exprToValueBlock(valueToExpr(expr.from))
      const to = exprToValueBlock(valueToExpr(expr.to))
      return from === null || to === null
        ? null
        : block('sz_g3k_random_between', {}, {}, undefined, { FROM: from, TO: to })
    }
    case 'g3k:randomChance': {
      const percent = exprToValueBlock(valueToExpr(expr.percent))
      return percent === null
        ? null
        : block('sz_g3k_random_chance', {}, {}, undefined, { PERCENT: percent })
    }
    case 'g3k:timeLeft':
      return block('sz_g3k_time_left', {})
    case 'g3k:maxHealthOf':
      return block('sz_g3k_max_health_of', { CHAR: expr.charVar })
    case 'g3k:stateOf':
      return block('sz_g3k_state_of', { CHAR: expr.charVar })
    case 'g3k:pointerOver':
      return block('sz_g3k_pointer_over', { CHAR: expr.charVar })
    case 'g3k:groundPoint':
      return block('sz_g3k_ground_point', { AXIS: expr.axis })
    // ---- Mundo 3D (world-3d) — valores ----
    case 'w3d:worldSize':
      return block('sz_w3d_world_size', {})
    case 'w3d:groundHeight': {
      const x = exprToValueBlock(valueToExpr(expr.x))
      const z = exprToValueBlock(valueToExpr(expr.z))
      return x === null || z === null
        ? null
        : block('sz_w3d_ground_height', {}, {}, undefined, { X: x, Z: z })
    }
    case 'w3d:carPos':
      return block('sz_w3d_car_pos', { AXIS: expr.axis })
    case 'w3d:carSpeed':
      return block('sz_w3d_car_speed', {})
    case 'w3d:personPos':
      return block('sz_w3d_person_pos', { AXIS: expr.axis })
    case 'w3d:isDriving':
      return block('sz_w3d_is_driving', {})
    case 'w3d:coinCount':
      return block('sz_w3d_coin_count', {})
    case 'w3d:hasAchievement':
      return block('sz_w3d_has_achievement', { NAME: expr.name })
    case 'w3d:inventoryCount':
      return block('sz_w3d_inventory_count', { ITEM: expr.item })
    case 'w3d:inventoryHas': {
      const n = exprToValueBlock(valueToExpr(expr.n))
      return n === null
        ? null
        : block('sz_w3d_inventory_has', { ITEM: expr.item }, {}, undefined, { N: n })
    }
    case 'w3d:keyDown':
      return block('sz_w3d_key_down', { KEY: expr.key })
    case 'w3d:keyPressed':
      return block('sz_w3d_key_pressed', { KEY: expr.key })
    case 'w3d:timeOfDay':
      return block('sz_w3d_time_of_day', {})
    case 'w3d:raceTime':
      return block('sz_w3d_race_time', {})
    case 'w3d:raceBest':
      return block('sz_w3d_race_best', {})
    case 'w3d:pinsDown':
      return block('sz_w3d_pins_down', {})
    case 'w3d:knockedCount':
      return block('sz_w3d_knocked_count', {})
    case 'g3k:stateIs':
      return block('sz_g3k_state_is', { STATE: expr.name })
    case 'g3k:gameState':
      return block('sz_g3k_game_state', {})
    case 'isFullscreen':
      return block('sz_val_is_fullscreen')
    case 'systemDark':
      return block('sz_val_system_dark')
    case 'perfNow':
      return block('sz_val_perf_now')
    case 'dateGet':
      return block('sz_val_date_part', { PART: expr.part })
    case 'global':
      switch (expr.kind) {
        case 'innerWidth':
          return block('sz_val_window_width')
        case 'innerHeight':
          return block('sz_val_window_height')
        case 'devicePixelRatio':
          return block('sz_val_device_pixel_ratio')
      }
      return block('sz_val_window_width')
    case 'canvasDim':
      return block(expr.dim === 'width' ? 'sz_val_canvas_width' : 'sz_val_canvas_height', {
        CTX: expr.ctxVar,
      })
    case 'random': {
      const min = exprToValueBlock(expr.min)
      const max = exprToValueBlock(expr.max)
      return min && max ? block('sz_val_random', {}, {}, undefined, { MIN: min, MAX: max }) : null
    }
    case 'arrayMap': {
      const transform = exprToValueBlock(expr.transform)
      if (!transform) return null
      return block('sz_val_array_map', { ARR: expr.arrayVar, ITEM: expr.itemName }, {}, expr.__id, {
        TRANSFORM: transform,
      })
    }
    case 'hslColor': {
      const vs = valueBlocks({ H: expr.h, S: expr.s, L: expr.l })
      return vs ? block('sz_val_color_hsl', {}, {}, undefined, vs) : null
    }
    case 'randomFloat':
      return block('sz_val_random_float')
    case 'thisRef':
      return block('sz_val_this')
    case 'thisProp':
      return block('sz_val_this_prop', { NAME: expr.name })
    case 'propAccess':
      return block('sz_val_get_prop', { NAME: expr.name, OBJ: expr.objectVar })
    case 'binop': {
      const a = exprToValueBlock(expr.left)
      const b = exprToValueBlock(expr.right)
      if (!a || !b) return null
      // Contas → sz_math_arithmetic; comparações (>, <, ==, ===, …) → sz_val_compare.
      return ['+', '-', '*', '/', '%', '**'].includes(expr.op)
        ? block('sz_math_arithmetic', { OP: expr.op }, {}, undefined, { A: a, B: b })
        : block('sz_val_compare', { OP: expr.op }, {}, undefined, { LEFT: a, RIGHT: b })
    }
    case 'logical': {
      const a = exprToValueBlock(expr.left)
      const b = exprToValueBlock(expr.right)
      return a && b
        ? block('sz_val_logic', { OP: expr.op }, {}, undefined, { LEFT: a, RIGHT: b })
        : null
    }
    case 'logicalNot': {
      const v = exprToValueBlock(expr.value)
      return v ? block('sz_val_not', {}, {}, undefined, { VALUE: v }) : null
    }
    case 'ternary': {
      const cond = exprToValueBlock(expr.condition)
      const whenTrue = exprToValueBlock(expr.whenTrue)
      const whenFalse = exprToValueBlock(expr.whenFalse)
      return cond && whenTrue && whenFalse
        ? block('sz_val_ternary', {}, {}, undefined, {
            COND: cond,
            TRUE_VAL: whenTrue,
            FALSE_VAL: whenFalse,
          })
        : null
    }
    case 'mathUnary': {
      const arg = exprToValueBlock(expr.arg)
      if (!arg) return null
      // Trigonometria tem bloco próprio; arredondamento/raiz ficam em sz_math_function.
      const trig = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan'])
      const type = trig.has(expr.fn) ? 'sz_math_trig' : 'sz_math_function'
      return block(type, { FN: expr.fn }, {}, undefined, { VALUE: arg })
    }
    case 'mathBinary': {
      const a = exprToValueBlock(expr.a)
      const b = exprToValueBlock(expr.b)
      if (!a || !b) return null
      if (expr.fn === 'atan2') {
        return block('sz_math_atan2', {}, {}, undefined, { A: a, B: b })
      }
      if (expr.fn === 'hypot') {
        return block('sz_math_hypot', {}, {}, undefined, { A: a, B: b })
      }
      return block('sz_math_minmax', { FN: expr.fn }, {}, undefined, { A: a, B: b })
    }
    case 'distance': {
      const a = exprToValueBlock(expr.a)
      const b = exprToValueBlock(expr.b)
      return a && b ? block('sz_val_distance', {}, {}, undefined, { OBJ1: a, OBJ2: b }) : null
    }
    case 'mathConst':
      // Só π tem bloco; outras constantes caem em "código avançado".
      return expr.name === 'PI' ? block('sz_val_math_pi') : null
    case 'angleConvert': {
      const arg = exprToValueBlock(expr.arg)
      return arg
        ? block('sz_math_angle_convert', { DIR: expr.dir }, {}, undefined, { VALUE: arg })
        : null
    }
    case 'eventProp':
      return expr.prop === 'key' || expr.prop === 'code'
        ? block('sz_val_event_key', { PROP: expr.prop })
        : block('sz_val_event_pos', { AXIS: expr.prop })
    case 'vec2': {
      const x = exprToValueBlock(expr.x)
      const y = exprToValueBlock(expr.y)
      return x && y ? block('sz_val_vector2d', {}, {}, undefined, { X: x, Y: y }) : null
    }
    case 'vec3': {
      const x = exprToValueBlock(expr.x)
      const y = exprToValueBlock(expr.y)
      const z = exprToValueBlock(expr.z)
      return x && y && z ? block('sz_val_vector3d', {}, {}, undefined, { X: x, Y: y, Z: z }) : null
    }
    case 'array': {
      const valueInputs: Record<string, SerializedBlocklyBlock> = {}
      for (let i = 0; i < expr.items.length; i += 1) {
        const vb = exprToValueBlock(expr.items[i] as JSExpr)
        if (!vb) return null
        valueInputs[`ITEM${i}`] = vb
      }
      const b = block('sz_val_array', {}, {}, expr.__id, valueInputs)
      b.extraState = { items: expr.items.length }
      return b
    }
    case 'arrayLength':
      return block('sz_val_array_length', { NAME: expr.arrayVar })
    case 'concat': {
      const valueInputs: Record<string, SerializedBlocklyBlock> = {}
      for (let i = 0; i < expr.parts.length; i += 1) {
        const vb = exprToValueBlock(expr.parts[i] as JSExpr)
        if (!vb) return null
        valueInputs[`ITEM${i}`] = vb
      }
      const b = block('sz_val_join', {}, {}, expr.__id, valueInputs)
      b.extraState = { items: expr.parts.length }
      return b
    }
    case 'concatArrays': {
      const valueInputs: Record<string, SerializedBlocklyBlock> = {}
      for (let i = 0; i < expr.parts.length; i += 1) {
        const vb = exprToValueBlock(expr.parts[i] as JSExpr)
        if (!vb) return null
        valueInputs[`ITEM${i}`] = vb
      }
      const b = block('sz_val_concat_arrays', {}, {}, expr.__id, valueInputs)
      b.extraState = { items: expr.parts.length }
      return b
    }
    case 'index': {
      const idx = exprToValueBlock(expr.index)
      return idx
        ? block('sz_val_array_index', { NAME: expr.arrayVar }, {}, undefined, { INDEX: idx })
        : null
    }
    case 'arrayLast':
      return block('sz_val_array_last', { NAME: expr.arrayVar })
    case 'arrayFind': {
      const cond = exprToValueBlock(expr.cond)
      return cond
        ? block('sz_val_array_find', { NAME: expr.arrayVar, ITEM: expr.itemName }, {}, expr.__id, {
            COND: cond,
          })
        : null
    }
    case 'arrayFilter': {
      const array = exprToValueBlock(expr.array)
      const cond = exprToValueBlock(expr.cond)
      return array && cond
        ? block('sz_val_array_filter', { ITEM: expr.itemName }, {}, expr.__id, {
            ARRAY: array,
            COND: cond,
          })
        : null
    }
    case 'shuffle':
      return block('sz_val_shuffle', { NAME: expr.arrayVar })
    case 'datasetGet':
      return block('sz_val_dataset', { KEY: expr.key, OBJ: expr.objectVar })
    case 'getElement':
      return block('sz_val_get_element', { ID: expr.id }, {}, expr.__id)
    case 'querySelectorValue':
      return block(
        'sz_val_query_select',
        { MODE: expr.all ? 'all' : 'one', SELECTOR: expr.selector },
        {},
        expr.__id,
      )
    case 'promiseAll': {
      const list = exprToValueBlock(expr.list)
      return list ? block('sz_val_promise_all', {}, {}, expr.__id, { LIST: list }) : null
    }
    case 'newPromise':
      return block(
        'sz_val_new_promise',
        { PARAM: expr.param },
        { DO: statementsToBlocks(expr.body) },
        expr.__id,
      )
    case 'storageGet':
      // A chave vai num campo de texto: só representável como bloco se for literal.
      return expr.key.type === 'str'
        ? block('sz_val_storage_get', { STORE: expr.store, KEY: expr.key.value })
        : null
    case 'classContains':
      return block('sz_val_class_contains', {
        TARGET_KIND: expr.targetKind ?? 'id',
        TARGET: expr.targetId,
        CLASS: expr.className,
      })
    case 'callMethodExpr': {
      const valueInputs: Record<string, SerializedBlocklyBlock> = {}
      for (let i = 0; i < expr.args.length; i += 1) {
        const vb = exprToValueBlock(expr.args[i] as JSExpr)
        if (!vb) return null
        valueInputs[`ARG${i}`] = vb
      }
      const b = block(
        'sz_val_call_method',
        { OBJ: expr.objectVar, METHOD: expr.method },
        {},
        undefined,
        valueInputs,
      )
      if (expr.args.length > 0) b.extraState = { items: expr.args.length }
      return b
    }
    case 'objectLiteral': {
      const fields: Record<string, string> = {}
      const valueInputs: Record<string, SerializedBlocklyBlock> = {}
      for (let i = 0; i < expr.entries.length; i += 1) {
        const e = expr.entries[i] as { key: string; value: JSExpr }
        const vb = exprToValueBlock(e.value)
        if (!vb) return null
        fields[`KEY${i}`] = e.key
        valueInputs[`ITEM${i}`] = vb
      }
      const b = block('sz_val_object', fields, {}, expr.__id, valueInputs)
      b.extraState = { items: expr.entries.length }
      return b
    }
    case 'memberGet': {
      const obj = exprToValueBlock(expr.object)
      if (!obj) return null
      const type = expr.optional ? 'sz_val_member_get_optional' : 'sz_val_member_get'
      return block(type, { NAME: expr.name }, {}, expr.__id, { OBJ: obj })
    }
    case 'memberCallExpr': {
      const obj = exprToValueBlock(expr.object)
      if (!obj) return null
      const valueInputs: Record<string, SerializedBlocklyBlock> = { OBJ: obj }
      for (let i = 0; i < expr.args.length; i += 1) {
        const vb = exprToValueBlock(expr.args[i] as JSExpr)
        if (!vb) return null
        valueInputs[`ARG${i}`] = vb
      }
      const b = block('sz_val_method_on', { METHOD: expr.method }, {}, expr.__id, valueInputs)
      if (expr.args.length > 0) b.extraState = { items: expr.args.length }
      return b
    }
    case 'newExpr': {
      const valueInputs: Record<string, SerializedBlocklyBlock> = {}
      for (let i = 0; i < expr.args.length; i += 1) {
        const vb = exprToValueBlock(expr.args[i] as JSExpr)
        if (!vb) return null
        valueInputs[`ARG${i}`] = vb
      }
      // Com namespace (`new THREE.X()`) OU classe de ADDON sob three (`new
      // GLTFLoader()`) → o bloco Canvas 3D (CLASS = referência completa); senão → o
      // bloco genérico de classe do aluno.
      const t3dNamed =
        !!expr.namespace || (recognizeThree && CANVAS3D_ADDON_CLASSES.has(expr.className))
      const b = t3dNamed
        ? block(
            'sz_t3d_new',
            { CLASS: expr.namespace ? `${expr.namespace}.${expr.className}` : expr.className },
            {},
            expr.__id,
            valueInputs,
          )
        : block('sz_val_new', { CLASS: expr.className }, {}, expr.__id, valueInputs)
      if (expr.args.length > 0) b.extraState = { items: expr.args.length }
      return b
    }
    case 'call': {
      const valueInputs: Record<string, SerializedBlocklyBlock> = {}
      for (let i = 0; i < expr.args.length; i += 1) {
        const vb = exprToValueBlock(expr.args[i] as JSExpr)
        if (!vb) return null
        valueInputs[`ARG${i}`] = vb
      }
      const b = block('sz_val_call_function', { NAME: expr.name }, {}, undefined, valueInputs)
      if (expr.args.length > 0) b.extraState = { items: expr.args.length }
      return b
    }
    case 'objectOp': {
      const obj = exprToValueBlock(expr.object)
      if (!obj) return null
      return block('sz_val_object_op', { OP: expr.op }, {}, expr.__id, { OBJ: obj })
    }
    case 'indexGet': {
      const obj = exprToValueBlock(expr.object)
      const idx = exprToValueBlock(expr.index)
      if (!obj || !idx) return null
      return block('sz_val_index_get', {}, {}, expr.__id, { OBJ: obj, INDEX: idx })
    }
    default:
      return null
  }
}

/**
 * Constrói o mapa de tomadas de valor a partir de expressões IR. Devolve `null`
 * se qualquer expressão não for representável (o statement-pai vira avançado).
 */
function valueBlocks(map: Record<string, JSExpr>): Record<string, SerializedBlocklyBlock> | null {
  const out: Record<string, SerializedBlocklyBlock> = {}
  for (const [name, expr] of Object.entries(map)) {
    const vb = exprToValueBlock(expr)
    if (!vb) return null
    out[name] = vb
  }
  return out
}

function chain(blocks: SerializedBlocklyBlock[]): SerializedBlocklyBlock | null {
  if (blocks.length === 0) return null
  for (let i = 0; i < blocks.length - 1; i++) {
    const current = blocks[i]
    const next = blocks[i + 1]
    if (current && next) current.next = { block: next }
  }
  return blocks[0] ?? null
}

function position(block: SerializedBlocklyBlock, x: number, y: number): SerializedBlocklyBlock {
  block.x = x
  block.y = y
  return block
}

function isBlock(
  block: SerializedBlocklyBlock | null | undefined,
): block is SerializedBlocklyBlock {
  return Boolean(block)
}

function numberExpr(expr: JSExpr): number | null {
  return expr.type === 'num' ? expr.value : null
}

function stringExpr(expr: JSExpr): string | null {
  return expr.type === 'str' ? expr.value : null
}

function varExpr(expr: JSExpr): string | null {
  return expr.type === 'var' ? expr.name : null
}

function incrementExpr(targetName: string, expr: JSExpr): number | null {
  if (expr.type !== 'binop' || (expr.op !== '+' && expr.op !== '-')) return null
  if (expr.left.type !== 'var' || expr.left.name !== targetName) return null
  const n = numberExpr(expr.right)
  if (n === null) return null
  // `x = x - n` → bloco "Somar N" com delta negativo.
  return expr.op === '-' ? -n : n
}

function rawJSBlock(stmt: JSStatement): SerializedBlocklyBlock {
  return block('sz_adv_raw_js', { CODE: rawJSCodeFor(stmt) }, {}, stmt.__id)
}

/**
 * Código que o bloco de "código avançado" carrega quando um statement do IR não é
 * representável como bloco estruturado. Para um `rawJS` é o código verbatim; para
 * qualquer outro (ex.: `storageSet`/`storageGet` com chave NÃO-literal, ou
 * `querySelector`/`fetchJson` com seletor/URL dinâmico) COMPILAMOS o statement
 * para JS válido — antes era um `JSON.stringify` do nó do IR, que o gerador
 * re-emitia VERBATIM como um objeto literal quebrado, DESCARTANDO a chamada real
 * (ex.: o `localStorage.setItem(variavel, x)` sumia ao passar pela visão de
 * Blocos). Compilar mantém o trecho válido e re-parseável (round-trip estável).
 */
function rawJSCodeFor(stmt: JSStatement): string {
  if (stmt.type === 'rawJS') return stmt.code
  try {
    return compileStatements([stmt], 0)
  } catch {
    // A montagem dos blocos JAMAIS pode quebrar: na falha (inalcançável p/ IR
    // válido) cai para o nó comentado — JS inerte que preserva o dado p/ debug.
    return `/* ${JSON.stringify(stmt)} */`
  }
}

function renderElementFallback(node: Extract<SZIR['html'][number], { type: 'element' }>): string {
  const id = node.id ? ` id="${node.id}"` : ''
  const text = node.text ?? ''
  return `<${node.tag}${id}>${text}</${node.tag}>`
}

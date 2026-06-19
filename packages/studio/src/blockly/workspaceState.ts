import { compileStatements } from '#generators'
import type { CSSEntry, JSExpr, JSStatement, KeyframesCSS, SZIR } from '#ir'
import { readingOrderIndices, SHADOW_PRESETS } from './buildIR'

/** Tags container (têm input CHILDREN) → tipo de bloco. */
const CONTAINER_BLOCK: Partial<Record<string, string>> = {
  div: 'sz_html_div',
  section: 'sz_html_section',
  header: 'sz_html_header',
  nav: 'sz_html_nav',
  footer: 'sz_html_footer',
  main: 'sz_html_main',
  ul: 'sz_html_ul',
  form: 'sz_html_form',
}

/** Tags de folha com apenas texto → tipo de bloco. */
const TEXT_BLOCK: Partial<Record<string, string>> = {
  h1: 'sz_html_h1',
  h2: 'sz_html_h2',
  h3: 'sz_html_h3',
  p: 'sz_html_p',
  span: 'sz_html_span',
  strong: 'sz_html_strong',
  em: 'sz_html_em',
  li: 'sz_html_li',
  label: 'sz_html_label',
}

export interface SerializedBlocklyBlock {
  type: string
  id?: string
  x?: number
  y?: number
  fields?: Record<string, string | number>
  inputs?: Record<string, { block: SerializedBlocklyBlock }>
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
])

/** Atributos representados por um campo do bloco (logo, não vão para `data`). */
const FIELD_ATTRS: Record<string, readonly string[]> = {
  a: ['href'],
  img: ['src', 'alt'],
  input: ['type', 'placeholder'],
  textarea: ['placeholder'],
}

/**
 * Serializa, como JSON, os atributos do elemento que nenhum campo do bloco
 * representa (ex.: `class`, `role`, `data-*`), além do `id` quando o bloco não
 * tem campo de id. Esse JSON vai para o `data` do bloco e é re-mesclado em
 * `buildIRFromWorkspace`, garantindo round-trip sem perda.
 */
function extraData(node: Extract<SZIR['html'][number], { type: 'element' }>): string | undefined {
  const extra: Record<string, string> = {}
  if (node.id && !ID_FIELD_TAGS.has(node.tag)) extra.id = node.id
  const fieldKeys = FIELD_ATTRS[node.tag] ?? []
  for (const [k, v] of Object.entries(node.attrs ?? {})) {
    // `class` é representado pelo campo CLASS do bloco — não vai para `data`.
    if (k === 'class') continue
    if (!fieldKeys.includes(k)) extra[k] = v
  }
  return Object.keys(extra).length > 0 ? JSON.stringify(extra) : undefined
}

export interface SerializedBlocklyWorkspace {
  blocks: {
    languageVersion: 0
    blocks: SerializedBlocklyBlock[]
  }
}

/** Uma pilha top-level de uma categoria: onde começa (índice no array de blocos) e onde fica. */
export interface StackPlacement {
  startIndex: number
  x: number
  y: number
}

/** Agrupamento das colunas por categoria, derivado do `blocksState` anterior. */
export interface StacksLayout {
  html: StackPlacement[]
  css: StackPlacement[]
  js: StackPlacement[]
}

export interface BuildWorkspaceStateOptions {
  startX?: number
  startY?: number
  /** Distância horizontal entre as colunas de HTML, CSS e JS. */
  colGap?: number
  /**
   * Layout a preservar (várias pilhas/colunas do mesmo tipo). Quando ausente,
   * cada categoria vira uma única pilha nas colunas padrão. Ver
   * {@link layoutFromBlocksState}.
   */
  layout?: StacksLayout | null
}

export function buildWorkspaceStateFromIR(
  ir: SZIR,
  options: BuildWorkspaceStateOptions = {},
): SerializedBlocklyWorkspace {
  const startX = options.startX ?? 32
  const startY = options.startY ?? 32
  // Cada categoria vai para a SUA coluna (HTML | CSS | JS). Antes HTML e CSS
  // dividiam a mesma coluna e, numa landing page grande, a pilha de HTML cobria
  // a de CSS. Em colunas separadas as pilhas crescem para baixo sem se sobrepor.
  const colGap = options.colGap ?? 420
  const layout = options.layout
  const stacks: SerializedBlocklyBlock[] = []

  const htmlBlocks = ir.html.map(htmlNodeToBlock).filter(isBlock)
  stacks.push(...splitIntoStacks(htmlBlocks, layout?.html, startX, startY))

  const cssBlocks = ir.css.flatMap(cssEntryToBlocks)
  stacks.push(...splitIntoStacks(cssBlocks, layout?.css, startX + colGap, startY))

  const jsBlocks = statementsToBlocks(ir.js)
  stacks.push(...splitIntoStacks(jsBlocks, layout?.js, startX + colGap * 2, startY))

  return { blocks: { languageVersion: 0, blocks: stacks } }
}

/**
 * Divide os blocos de uma categoria em pilhas top-level. Sem `placements`, vira
 * UMA pilha na coluna padrão (comportamento histórico). Com `placements` (do
 * layout preservado), fatia o array nos `startIndex` e posiciona cada pilha onde
 * o aluno a deixou. A cobertura é completa (nenhum bloco se perde): a 1ª fatia
 * começa em 0 e a última vai até o fim; blocos a mais (statements adicionados)
 * entram na última pilha.
 */
function splitIntoStacks(
  blocks: SerializedBlocklyBlock[],
  placements: StackPlacement[] | undefined,
  defaultX: number,
  defaultY: number,
): SerializedBlocklyBlock[] {
  if (!placements || placements.length === 0) {
    const head = chain(blocks)
    return head ? [position(head, defaultX, defaultY)] : []
  }
  const out: SerializedBlocklyBlock[] = []
  for (let i = 0; i < placements.length; i++) {
    const start = i === 0 ? 0 : Math.min(placements[i]?.startIndex ?? 0, blocks.length)
    const end =
      i + 1 < placements.length
        ? Math.min(placements[i + 1]?.startIndex ?? blocks.length, blocks.length)
        : blocks.length
    if (start >= end) continue
    const head = chain(blocks.slice(start, end))
    if (head) out.push(position(head, placements[i]?.x ?? defaultX, placements[i]?.y ?? defaultY))
  }
  return out
}

/** Categoria de uma pilha top-level a partir do tipo do bloco (espelha organize.ts). */
function categoryOf(type: string): keyof StacksLayout {
  if (type.startsWith('sz_html_') || type === 'sz_adv_raw_html') return 'html'
  if (type.startsWith('sz_css_') || type === 'sz_adv_raw_css') return 'css'
  return 'js'
}

/** Tamanho da pilha (nº de blocos na cadeia `.next`) a partir do bloco serializado. */
function chainLength(block: SerializedBlocklyBlock): number {
  let count = 0
  let cur: SerializedBlocklyBlock | undefined = block
  while (cur) {
    count += 1
    cur = cur.next?.block
  }
  return count
}

/**
 * Verdadeiro se o `blocksState` é `null`/inválido OU é uma serialização válida
 * porém sem blocos top-level. Os modos Blocos/Ponte usam para decidir se devem
 * derivar os blocos do IR — sem isso, um `blocksState` vazio (resíduo de algum
 * ciclo anterior, ex.: sanitizer que descartava todo o estado) passava no
 * early-return e o canvas ficava em branco depois do refresh.
 */
export function isBlocksStateEmpty(state: unknown): boolean {
  const tops = (state as SerializedBlocklyWorkspace | null | undefined)?.blocks?.blocks
  return !Array.isArray(tops) || tops.length === 0
}

/**
 * Deriva o {@link StacksLayout} a partir de um `blocksState` (serialização do
 * Blockly: x/y + cadeia `.next`). Usado pela Ponte para preservar as colunas do
 * aluno ao reconstruir o workspace numa edição de código. Devolve `null` apenas
 * quando o workspace está vazio (sem blocos top-level) — qualquer arranjo, mesmo
 * com uma única pilha por categoria, conta como custom e tem suas posições
 * preservadas. (Antes esta função descartava layouts "triviais" achando que eram
 * o default; mas um aluno pode ter movido a pilha única para uma posição custom,
 * e descartar mandava o rebuild aplicar os defaults `x = 32, 452, 872`.)
 */
export function layoutFromBlocksState(state: unknown): StacksLayout | null {
  const tops = (state as SerializedBlocklyWorkspace | null | undefined)?.blocks?.blocks
  if (!Array.isArray(tops) || tops.length === 0) return null

  const order = readingOrderIndices(tops.map((t) => ({ x: t.x ?? 0, y: t.y ?? 0 })))
  const layout: StacksLayout = { html: [], css: [], js: [] }
  const counts: Record<keyof StacksLayout, number> = { html: 0, css: 0, js: 0 }
  for (const i of order) {
    const top = tops[i]
    if (!top) continue
    const category = categoryOf(top.type)
    layout[category].push({ startIndex: counts[category], x: top.x ?? 0, y: top.y ?? 0 })
    counts[category] += chainLength(top)
  }

  return layout
}

function htmlNodeToBlock(node: SZIR['html'][number]): SerializedBlocklyBlock {
  const built = htmlNodeToBlockInner(node)
  if (node.type === 'element') {
    // `class` agora é um campo visível em todos os blocos HTML.
    if (node.attrs?.class) {
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
  if (node.type === 'text') {
    return block('sz_html_text', { TEXT: node.text }, {}, node.__id)
  }
  if (node.type === 'canvas') {
    // Largura/altura não são mais campos do bloco — só o id. Quando a IR carrega
    // width/height (ex.: `<canvas width=200 height=100>` vindo do HTML), os
    // guardamos no `data` do bloco (mesma estratégia do `extraData`) para que o
    // round-trip blocos→código não os perca. `buildIR` os recupera de `data`.
    const built = block('sz_html_canvas', { ID: node.id }, {}, node.__id)
    const extra: Record<string, number> = {}
    if (node.width !== undefined) extra.width = node.width
    if (node.height !== undefined) extra.height = node.height
    if (Object.keys(extra).length > 0) built.data = JSON.stringify(extra)
    return built
  }

  const containerType = CONTAINER_BLOCK[node.tag]
  if (containerType) {
    return block(
      containerType,
      { ID: node.id ?? '' },
      { CHILDREN: (node.children ?? []).map(htmlNodeToBlock) },
      node.__id,
    )
  }

  const textType = TEXT_BLOCK[node.tag]
  if (textType) {
    return block(
      textType,
      { TEXT: node.text ?? '' },
      { CHILDREN: (node.children ?? []).map(htmlNodeToBlock) },
      node.__id,
    )
  }

  if (node.tag === 'button') {
    return block(
      'sz_html_button',
      { ID: node.id ?? 'meuBotao', TEXT: node.text ?? '' },
      {},
      node.__id,
    )
  }
  if (node.tag === 'a') {
    return block(
      'sz_html_link',
      { HREF: node.attrs?.href ?? '#', TEXT: node.text ?? '' },
      {},
      node.__id,
    )
  }
  if (node.tag === 'img') {
    return block(
      'sz_html_image',
      { SRC: node.attrs?.src ?? '', ALT: node.attrs?.alt ?? '' },
      {},
      node.__id,
    )
  }
  if (node.tag === 'input') {
    return block(
      'sz_html_input',
      {
        ID: node.id ?? '',
        TYPE: node.attrs?.type ?? 'text',
        PLACEHOLDER: node.attrs?.placeholder ?? '',
      },
      {},
      node.__id,
    )
  }
  if (node.tag === 'textarea') {
    return block(
      'sz_html_textarea',
      { ID: node.id ?? '', PLACEHOLDER: node.attrs?.placeholder ?? '' },
      {},
      node.__id,
    )
  }
  return block('sz_adv_raw_html', { CODE: renderElementFallback(node) }, {}, node.__id)
}

/** Declarações → blocos `sz_css_decl` (encaixáveis num input CSSDecl). */
function declarationsToBlocks(declarations?: Record<string, string>): SerializedBlocklyBlock[] {
  if (!declarations) return []
  return Object.entries(declarations).map(([prop, value]) =>
    block('sz_css_decl', { PROP: prop, VALUE: value }),
  )
}

/** Texto `@keyframes …` para o fallback rawCSS (passos que o bloco from/to não cobre). */
function keyframesToText(entry: KeyframesCSS): string {
  const steps = entry.steps
    .map((step) => {
      const decls = Object.entries(step.declarations)
        .map(([k, v]) => `    ${k}: ${v};`)
        .join('\n')
      return `  ${step.at} {\n${decls}\n  }`
    })
    .join('\n')
  return `@keyframes ${entry.name} {\n${steps}\n}`
}

/**
 * Reverte `@keyframes` para o bloco from/to quando os passos são só `from`/`0%`
 * e `to`/`100%`; caso contrário (multi-passo, vindo de código) cai num bloco
 * rawCSS preservando o texto.
 */
function keyframesToBlock(entry: KeyframesCSS): SerializedBlocklyBlock {
  const from = entry.steps.find((s) => s.at === 'from' || s.at === '0%')
  const to = entry.steps.find((s) => s.at === 'to' || s.at === '100%')
  const isFromTo =
    /^[A-Za-z_-][\w-]*$/.test(entry.name) &&
    entry.steps.length > 0 &&
    entry.steps.every((s) => s === from || s === to)
  if (isFromTo) {
    return block(
      'sz_css_keyframes',
      { NAME: entry.name },
      {
        FROM: declarationsToBlocks(from?.declarations),
        TO: declarationsToBlocks(to?.declarations),
      },
      entry.__id,
    )
  }
  return block('sz_adv_raw_css', { CODE: keyframesToText(entry) }, {}, entry.__id)
}

function cssEntryToBlocks(entry: CSSEntry): SerializedBlocklyBlock[] {
  if ('type' in entry && entry.type === 'rawCSS') {
    return [block('sz_adv_raw_css', { CODE: entry.code }, {}, entry.__id)]
  }
  if ('type' in entry && entry.type === 'mediaQuery') {
    const inner = entry.rules.flatMap(cssEntryToBlocks)
    return [
      block(
        'sz_css_media_query',
        { DIR: entry.feature, PX: entry.px },
        { RULES: inner },
        entry.__id,
      ),
    ]
  }
  if ('type' in entry && entry.type === 'keyframes') {
    return [keyframesToBlock(entry)]
  }

  const blocks: SerializedBlocklyBlock[] = []
  // Após os early-returns de rawCSS e mediaQuery, só resta CSSRule (sem `type`).
  const rule = entry as Exclude<CSSEntry, { type: string }>
  const consumed = new Set<string>()
  const selector = rule.selector

  if (
    selector === 'body' &&
    rule.declarations.background &&
    isLosslessColor(rule.declarations.background)
  ) {
    blocks.push(block('sz_css_body_background', { COLOR: rule.declarations.background }))
    consumed.add('background')
  }
  if (selector === 'body' && rule.declarations.color && isLosslessColor(rule.declarations.color)) {
    blocks.push(block('sz_css_body_text_color', { COLOR: rule.declarations.color }))
    consumed.add('color')
  }
  if (selector === 'body' && isExactBodyCenter(rule.declarations)) {
    blocks.push(block('sz_css_body_center'))
    for (const property of [
      'display',
      'flex-direction',
      'align-items',
      'justify-content',
      'min-height',
      'margin',
    ]) {
      consumed.add(property)
    }
  }

  if (rule.declarations.width) {
    const w = rule.declarations.width.trim()
    const pct = pctValue(w)
    const px = pxValue(w)
    if (pct !== null) {
      blocks.push(block('sz_css_width_percent', { SELECTOR: selector, VALUE: pct }))
      consumed.add('width')
    } else if (px !== null) {
      blocks.push(block('sz_css_width', { SELECTOR: selector, VALUE: px }))
      consumed.add('width')
    }
  }
  if (rule.declarations.height) {
    const px = pxValue(rule.declarations.height)
    if (px !== null) {
      blocks.push(block('sz_css_height', { SELECTOR: selector, VALUE: px }))
      consumed.add('height')
    }
  }
  if (rule.declarations.border) {
    const border = rule.declarations.border.trim()
    const parsed = parseBorder(border)
    // Só promove se a cor for hex canônico e a regeneração bater verbatim.
    if (
      parsed &&
      isLosslessColor(parsed.color) &&
      `${parsed.width}px solid ${parsed.color}` === border
    ) {
      blocks.push(
        block('sz_css_border', { SELECTOR: selector, WIDTH: parsed.width, COLOR: parsed.color }),
      )
      consumed.add('border')
    }
  }
  if (rule.declarations.padding) {
    const px = pxValue(rule.declarations.padding)
    if (px !== null) {
      blocks.push(block('sz_css_padding', { SELECTOR: selector, VALUE: px }))
      consumed.add('padding')
    }
  }
  if (rule.declarations.margin && !consumed.has('margin')) {
    const px = pxValue(rule.declarations.margin)
    if (px !== null) {
      blocks.push(block('sz_css_margin', { SELECTOR: selector, VALUE: px }))
      consumed.add('margin')
    }
  }

  // ---- Layout flex ----
  const dir = rule.declarations['flex-direction']
  if (
    rule.declarations.display === 'flex' &&
    !consumed.has('display') &&
    dir &&
    ['row', 'column'].includes(dir)
  ) {
    blocks.push(block('sz_css_display_flex', { SELECTOR: selector, DIR: dir }))
    consumed.add('display')
    consumed.add('flex-direction')
  }
  const justify = rule.declarations['justify-content']
  if (
    justify &&
    !consumed.has('justify-content') &&
    ['flex-start', 'center', 'flex-end', 'space-between', 'space-around'].includes(justify)
  ) {
    blocks.push(block('sz_css_justify', { SELECTOR: selector, VALUE: justify }))
    consumed.add('justify-content')
  }
  const align = rule.declarations['align-items']
  if (
    align &&
    !consumed.has('align-items') &&
    ['stretch', 'flex-start', 'center', 'flex-end'].includes(align)
  ) {
    blocks.push(block('sz_css_align', { SELECTOR: selector, VALUE: align }))
    consumed.add('align-items')
  }
  if (rule.declarations.gap) {
    const px = pxValue(rule.declarations.gap)
    if (px !== null) {
      blocks.push(block('sz_css_gap', { SELECTOR: selector, VALUE: px }))
      consumed.add('gap')
    }
  }

  // ---- Tipografia ----
  if (rule.declarations['font-size']) {
    const px = pxValue(rule.declarations['font-size'])
    if (px !== null) {
      blocks.push(block('sz_css_font_size', { SELECTOR: selector, VALUE: px }))
      consumed.add('font-size')
    }
  }
  const weight = rule.declarations['font-weight']
  if (weight && ['normal', 'bold'].includes(weight)) {
    blocks.push(block('sz_css_font_weight', { SELECTOR: selector, VALUE: weight }))
    consumed.add('font-weight')
  }
  const textAlign = rule.declarations['text-align']
  if (textAlign && ['left', 'center', 'right'].includes(textAlign)) {
    blocks.push(block('sz_css_text_align', { SELECTOR: selector, VALUE: textAlign }))
    consumed.add('text-align')
  }
  if (
    rule.declarations.color &&
    !consumed.has('color') &&
    isLosslessColor(rule.declarations.color)
  ) {
    blocks.push(block('sz_css_text_color', { SELECTOR: selector, COLOR: rule.declarations.color }))
    consumed.add('color')
  }
  const transform = rule.declarations['text-transform']
  if (transform && ['none', 'uppercase', 'lowercase', 'capitalize'].includes(transform)) {
    blocks.push(block('sz_css_text_transform', { SELECTOR: selector, VALUE: transform }))
    consumed.add('text-transform')
  }
  const decoration = rule.declarations['text-decoration']
  if (decoration && ['none', 'underline'].includes(decoration)) {
    blocks.push(block('sz_css_text_decoration', { SELECTOR: selector, VALUE: decoration }))
    consumed.add('text-decoration')
  }
  const spacing = rule.declarations['letter-spacing']
  if (spacing) {
    const px = pxValue(spacing)
    if (px !== null) {
      blocks.push(block('sz_css_letter_spacing', { SELECTOR: selector, VALUE: px }))
      consumed.add('letter-spacing')
    }
  }

  // ---- Fundo e cor ----
  if (
    rule.declarations['background-color'] &&
    isLosslessColor(rule.declarations['background-color'])
  ) {
    blocks.push(
      block('sz_css_background_color', {
        SELECTOR: selector,
        COLOR: rule.declarations['background-color'],
      }),
    )
    consumed.add('background-color')
  }
  if (rule.declarations.background && !consumed.has('background')) {
    const bg = rule.declarations.background.trim()
    const grad = parseGradient(bg)
    // Só promove se as cores forem hex canônico e a regeneração bater verbatim.
    if (
      grad &&
      isLosslessColor(grad.c1) &&
      isLosslessColor(grad.c2) &&
      `linear-gradient(135deg, ${grad.c1}, ${grad.c2})` === bg
    ) {
      blocks.push(block('sz_css_gradient', { SELECTOR: selector, C1: grad.c1, C2: grad.c2 }))
      consumed.add('background')
    }
  }

  // ---- Caixa e espaço ----
  if (rule.declarations['border-radius']) {
    const px = pxValue(rule.declarations['border-radius'])
    if (px !== null) {
      blocks.push(block('sz_css_border_radius', { SELECTOR: selector, VALUE: px }))
      consumed.add('border-radius')
    }
  }
  if (rule.declarations['box-shadow']) {
    // shadowLevel só casa um preset exato → regeneração idêntica (sem perda).
    const level = shadowLevel(rule.declarations['box-shadow'])
    if (level) {
      blocks.push(block('sz_css_shadow', { SELECTOR: selector, LEVEL: level }))
      consumed.add('box-shadow')
    }
  }
  if (rule.declarations['max-width']) {
    const px = pxValue(rule.declarations['max-width'])
    if (px !== null) {
      blocks.push(block('sz_css_max_width', { SELECTOR: selector, VALUE: px }))
      consumed.add('max-width')
    }
  }

  const remaining = Object.entries(rule.declarations).filter(([name]) => !consumed.has(name))
  if (remaining.length > 0) {
    // Declarações sem bloco amigável dedicado viram uma "Regra CSS" genérica
    // (seletor livre) com um bloco "propriedade: valor" por declaração —
    // em vez de cair em "código avançado". Preserva o `block.id` de cada
    // declaração (vindo de `__declIds`) para manter o realce bloco↔código
    // funcionando após round-trips IR→Blocks.
    const decls = remaining.map(([prop, value]) =>
      block('sz_css_decl', { PROP: prop, VALUE: value }, {}, rule.__declIds?.[prop]),
    )
    blocks.push(block('sz_css_rule', { SELECTOR: selector }, { CHILDREN: decls }))
  }
  if (entry.__id && blocks[0] && !blocks[0].id) {
    blocks[0].id = entry.__id
  }
  return blocks
}

function statementsToBlocks(statements: JSStatement[]): SerializedBlocklyBlock[] {
  return statements.map(statementToBlock).filter(isBlock)
}

function statementToBlock(stmt: JSStatement): SerializedBlocklyBlock | null {
  switch (stmt.type) {
    case 'event': {
      // Clique global no documento → bloco "clicar em qualquer lugar".
      if (stmt.event === 'click' && stmt.targetKind === 'document') {
        return block(
          'sz_js_on_click_anywhere',
          {},
          { DO: statementsToBlocks(stmt.body) },
          stmt.__id,
        )
      }
      const map: Partial<Record<string, string>> = {
        click: 'sz_js_on_click',
        mouseover: 'sz_js_on_mouseover',
        submit: 'sz_js_on_submit',
        input: 'sz_js_on_input',
      }
      const blockType = map[stmt.event]
      if (!blockType) return rawJSBlock(stmt)
      return block(
        blockType,
        { TARGET: stmt.target, TARGET_KIND: stmt.targetKind ?? 'id' },
        { DO: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    }
    case 'consoleLog': {
      const text = stringExpr(stmt.value)
      if (text !== null) return block('sz_js_console_log_text', { VALUE: text }, {}, stmt.__id)
      const name = varExpr(stmt.value)
      if (name) return block('sz_js_console_log_var', { NAME: name }, {}, stmt.__id)
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
    case 'setProperty': {
      const kind = stmt.targetKind ?? 'id'
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
    case 'setText': {
      const value = stringExpr(stmt.value)
      return value === null
        ? rawJSBlock(stmt)
        : block('sz_js_set_text', { TARGET: stmt.targetId, VALUE: value }, {}, stmt.__id)
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
      return block(
        'sz_js_if_else',
        {},
        { THEN: statementsToBlocks(stmt.then), ELSE: statementsToBlocks(stmt.else ?? []) },
        stmt.__id,
        { COND: cond },
      )
    }
    case 'repeat': {
      const times = numberExpr(stmt.times)
      return times === null
        ? rawJSBlock(stmt)
        : block('sz_js_repeat', { TIMES: times }, { DO: statementsToBlocks(stmt.body) }, stmt.__id)
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
    case 'forEach':
      return block(
        'sz_js_for_each',
        { ITEM: stmt.itemName, INDEX: stmt.indexName ?? '', NAME: stmt.arrayVar },
        { DO: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
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
    case 'canvasSetup':
      return block(
        'sz_canvas_setup',
        { CANVAS_ID: stmt.canvasId, CTX: stmt.varName },
        {},
        stmt.__id,
      )
    case 'canvasSetSize': {
      const vs = valueBlocks({ W: stmt.w, H: stmt.h })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_set_size', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasClear':
      return block('sz_canvas_clear', { CTX: stmt.ctxVar }, {}, stmt.__id)
    case 'canvasFillStyle': {
      const vs = valueBlocks({ COLOR: stmt.color })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_fill_style', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasFillRect': {
      const vs = valueBlocks({ X: stmt.x, Y: stmt.y, W: stmt.w, H: stmt.h })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_fill_rect', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasArc': {
      const vs = valueBlocks({ X: stmt.x, Y: stmt.y, R: stmt.r })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_arc', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasFillText': {
      const text = stringExpr(stmt.text)
      const vs = valueBlocks({ X: stmt.x, Y: stmt.y })
      return text === null || vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_fill_text', { TEXT: text, CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'animationLoop': {
      const b = block('sz_canvas_anim_loop', {}, { BODY: statementsToBlocks(stmt.body) }, stmt.__id)
      // Reativa o "guardar id em [var]" (mutator) quando o IR tem handle.
      if (stmt.handle) b.extraState = { handle: stmt.handle }
      return b
    }
    case 'cancelAnimationFrame': {
      const vs = valueBlocks({ HANDLE: stmt.handle })
      return vs === null ? rawJSBlock(stmt) : block('sz_canvas_cancel_anim', {}, {}, stmt.__id, vs)
    }
    case 'keyboardSimple':
      return block('sz_canvas_keyboard', { NAME: stmt.varName }, {}, stmt.__id)
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
    case 'appendChild':
      return block(
        'sz_js_append_child',
        { PARENT: stmt.parentVar, CHILD: stmt.childVar },
        {},
        stmt.__id,
      )
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
    case 'canvasDrawImage': {
      const vs = valueBlocks({ X: stmt.x, Y: stmt.y, W: stmt.w, H: stmt.h })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_draw_image', { CTX: stmt.ctxVar, SRC: stmt.src }, {}, stmt.__id, vs)
    }
    case 'canvasSave':
      return block('sz_canvas_save', { CTX: stmt.ctxVar }, {}, stmt.__id)
    case 'canvasRestore':
      return block('sz_canvas_restore', { CTX: stmt.ctxVar }, {}, stmt.__id)
    case 'canvasTranslate': {
      const vs = valueBlocks({ X: stmt.x, Y: stmt.y })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_translate', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasRotate': {
      const a = numberExpr(stmt.angle)
      return a === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_rotate', { CTX: stmt.ctxVar, ANGLE: a }, {}, stmt.__id)
    }
    case 'canvasScale': {
      const sx = numberExpr(stmt.sx)
      const sy = numberExpr(stmt.sy)
      return sx === null || sy === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_scale', { CTX: stmt.ctxVar, SX: sx, SY: sy }, {}, stmt.__id)
    }
    case 'canvasGradient': {
      // Bloco visual suporta apenas 2 stops; se a IR tiver mais, marca avançado.
      if (stmt.stops.length !== 2) return rawJSBlock(stmt)
      const x0 = numberExpr(stmt.x0)
      const y0 = numberExpr(stmt.y0)
      const x1 = numberExpr(stmt.x1)
      const y1 = numberExpr(stmt.y1)
      if (x0 === null || y0 === null || x1 === null || y1 === null) return rawJSBlock(stmt)
      return block(
        'sz_canvas_gradient',
        {
          CTX: stmt.ctxVar,
          NAME: stmt.varName,
          X0: x0,
          Y0: y0,
          X1: x1,
          Y1: y1,
          C0: stmt.stops[0]?.color ?? '#000000',
          C1: stmt.stops[1]?.color ?? '#ffffff',
        },
        {},
        stmt.__id,
      )
    }
    case 'canvasBeginPath':
      return block('sz_canvas_begin_path', { CTX: stmt.ctxVar }, {}, stmt.__id)
    case 'canvasClosePath':
      return block('sz_canvas_close_path', { CTX: stmt.ctxVar }, {}, stmt.__id)
    case 'canvasStroke':
      return block('sz_canvas_stroke', { CTX: stmt.ctxVar }, {}, stmt.__id)
    case 'canvasFill':
      return block('sz_canvas_fill', { CTX: stmt.ctxVar }, {}, stmt.__id)
    case 'canvasMoveTo': {
      const vs = valueBlocks({ X: stmt.x, Y: stmt.y })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_move_to', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasLineTo': {
      const vs = valueBlocks({ X: stmt.x, Y: stmt.y })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_line_to', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasStrokeStyle': {
      const vs = valueBlocks({ COLOR: stmt.color })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_stroke_style', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasLineWidth': {
      const vs = valueBlocks({ WIDTH: stmt.width })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_line_width', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasGlobalAlpha': {
      const vs = valueBlocks({ ALPHA: stmt.alpha })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_global_alpha', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasFont':
      return block(
        'sz_canvas_font',
        { CTX: stmt.ctxVar, SIZE: stmt.size, FAMILY: stmt.family },
        {},
        stmt.__id,
      )
    case 'canvasTextAlign':
      return block('sz_canvas_text_align', { CTX: stmt.ctxVar, ALIGN: stmt.align }, {}, stmt.__id)
    case 'g2d:createSprite':
      return block(
        'sz_g2d_create_sprite',
        {
          NAME: stmt.varName,
          X: stmt.x,
          Y: stmt.y,
          W: stmt.w,
          H: stmt.h,
          COLOR: stmt.color,
        },
        {},
        stmt.__id,
      )
    case 'g2d:drawSprite':
      return block('sz_g2d_draw_sprite', { SPRITE: stmt.spriteVar }, {}, stmt.__id)
    case 'g2d:setPosition': {
      const x = numberExpr(stmt.x)
      const y = numberExpr(stmt.y)
      return x === null || y === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_set_position', { SPRITE: stmt.spriteVar, X: x, Y: y }, {}, stmt.__id)
    }
    case 'g2d:setVelocity': {
      const vx = numberExpr(stmt.vx)
      const vy = numberExpr(stmt.vy)
      return vx === null || vy === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_set_velocity', { SPRITE: stmt.spriteVar, VX: vx, VY: vy }, {}, stmt.__id)
    }
    case 'g2d:collides':
      return block(
        'sz_g2d_collides',
        { NAME: stmt.varName, A: stmt.aVar, B: stmt.bVar },
        {},
        stmt.__id,
      )
    case 'g2d:score':
      return block('sz_g2d_score', { NAME: stmt.varName, INITIAL: stmt.initial }, {}, stmt.__id)
    case 'g2d:gameOver':
      return block('sz_g2d_game_over', { TEXT: stmt.text }, {}, stmt.__id)
    case 'g2d:clear':
      return block('sz_g2d_clear', {}, {}, stmt.__id)
    case 'g2d:updateEachFrame':
      return block(
        'sz_g2d_update_each_frame',
        {},
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'g2d:setGravity':
      return block('sz_g2d_set_gravity', { VALUE: stmt.value }, {}, stmt.__id)
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
    case 'g2d:playSound':
      return block('sz_g2d_play_sound', { FREQ: stmt.freq, MS: stmt.durationMs }, {}, stmt.__id)
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
    case 'g2d:createImageSprite':
      return block(
        'sz_g2d_create_image_sprite',
        { NAME: stmt.varName, X: stmt.x, Y: stmt.y, W: stmt.w, H: stmt.h, IMAGE: stmt.image },
        {},
        stmt.__id,
      )
    case 'g2d:setImage':
      return block('sz_g2d_set_image', { SPRITE: stmt.spriteVar, IMAGE: stmt.image }, {}, stmt.__id)
    case 'g2d:loadSpritesheet':
      return block(
        'sz_g2d_load_spritesheet',
        { NAME: stmt.varName, IMAGE: stmt.image, FW: stmt.frameW, FH: stmt.frameH },
        {},
        stmt.__id,
      )
    case 'g2d:animateSprite':
      return block(
        'sz_g2d_animate_sprite',
        {
          SPRITE: stmt.spriteVar,
          SHEET: stmt.sheetVar,
          FROM: stmt.from,
          TO: stmt.to,
          FPS: stmt.fps,
        },
        {},
        stmt.__id,
      )
    case 'g2d:drawFrame':
      return block(
        'sz_g2d_draw_frame',
        {
          INDEX: stmt.index,
          SHEET: stmt.sheetVar,
          X: stmt.x,
          Y: stmt.y,
          W: stmt.w,
          H: stmt.h,
        },
        {},
        stmt.__id,
      )
    case 'g2d:platformer':
      return block(
        'sz_g2d_platformer',
        { SPRITE: stmt.spriteVar, SPEED: stmt.speed, JUMP: stmt.jump },
        {},
        stmt.__id,
      )
    case 'g2d:topDown':
      return block('sz_g2d_top_down', { SPRITE: stmt.spriteVar, SPEED: stmt.speed }, {}, stmt.__id)
    case 'g2d:followPointer':
      return block(
        'sz_g2d_follow_pointer',
        { SPRITE: stmt.spriteVar, SPEED: stmt.speed },
        {},
        stmt.__id,
      )
    case 'g2d:clampToScreen':
      return block('sz_g2d_clamp_to_screen', { SPRITE: stmt.spriteVar }, {}, stmt.__id)
    case 'g2d:flash':
      return block('sz_g2d_flash', { COLOR: stmt.color }, {}, stmt.__id)
    case 'g2d:shake':
      return block('sz_g2d_shake', { INTENSITY: stmt.intensity }, {}, stmt.__id)
    case 'g2d:emitParticles':
      return block(
        'sz_g2d_emit_particles',
        { COUNT: stmt.count, COLOR: stmt.color, X: stmt.x, Y: stmt.y },
        {},
        stmt.__id,
      )
    case 'g2d:drawParticles':
      return block('sz_g2d_draw_particles', {}, {}, stmt.__id)
    case 'g2d:createTileMap':
      return block(
        'sz_g2d_create_tilemap',
        {
          NAME: stmt.varName,
          IMAGE: stmt.image,
          TILE: stmt.tile,
          SOLID: stmt.solid,
          GRID: stmt.grid,
        },
        {},
        stmt.__id,
      )
    case 'g2d:drawTileMap':
      return block('sz_g2d_draw_tilemap', { MAP: stmt.mapVar, X: stmt.x, Y: stmt.y }, {}, stmt.__id)
    case 'g2d:tileMapCollide':
      return block(
        'sz_g2d_tilemap_collide',
        { SPRITE: stmt.spriteVar, MAP: stmt.mapVar },
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
      if (!x || !y || !vx || !vy) return rawJSBlock(stmt)
      return block(
        'sz_g2d_spawn_in_group',
        { GROUP: stmt.groupVar, W: stmt.w, H: stmt.h, COLOR: stmt.color },
        {},
        stmt.__id,
        { X: x, Y: y, VX: vx, VY: vy },
      )
    }
    case 'g2d:spawnImageInGroup': {
      const x = exprToValueBlock(stmt.x)
      const y = exprToValueBlock(stmt.y)
      const vx = exprToValueBlock(stmt.vx)
      const vy = exprToValueBlock(stmt.vy)
      if (!x || !y || !vx || !vy) return rawJSBlock(stmt)
      return block(
        'sz_g2d_spawn_image_in_group',
        { GROUP: stmt.groupVar, W: stmt.w, H: stmt.h, IMAGE: stmt.image },
        {},
        stmt.__id,
        { X: x, Y: y, VX: vx, VY: vy },
      )
    }
    case 'g2d:updateGroup':
      return block('sz_g2d_update_group', { GROUP: stmt.groupVar }, {}, stmt.__id)
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
    case 'g2d:everySeconds':
      return block(
        'sz_g2d_every_seconds',
        { SECS: stmt.seconds },
        { BODY: statementsToBlocks(stmt.body) },
        stmt.__id,
      )
    case 'g2d:drawScore': {
      const value = exprToValueBlock(stmt.value)
      if (!value) return rawJSBlock(stmt)
      return block(
        'sz_g2d_draw_score',
        { LABEL: stmt.label, X: stmt.x, Y: stmt.y, COLOR: stmt.color, SIZE: stmt.size },
        {},
        stmt.__id,
        { VALUE: value },
      )
    }
    case 'g2d:drawLabel':
      return block(
        'sz_g2d_draw_label',
        {
          TEXT: stmt.text,
          X: stmt.x,
          Y: stmt.y,
          COLOR: stmt.color,
          SIZE: stmt.size,
          ALIGN: stmt.align,
        },
        {},
        stmt.__id,
      )
    case 'g2d:drawHearts': {
      const count = exprToValueBlock(stmt.count)
      if (!count) return rawJSBlock(stmt)
      return block(
        'sz_g2d_draw_hearts',
        { X: stmt.x, Y: stmt.y, SIZE: stmt.size, COLOR: stmt.color },
        {},
        stmt.__id,
        { COUNT: count },
      )
    }
    case 'g2d:drawBar': {
      const value = exprToValueBlock(stmt.value)
      const max = exprToValueBlock(stmt.max)
      if (!value || !max) return rawJSBlock(stmt)
      return block(
        'sz_g2d_draw_bar',
        { X: stmt.x, Y: stmt.y, W: stmt.w, H: stmt.h, COLOR: stmt.color },
        {},
        stmt.__id,
        { VALUE: value, MAX: max },
      )
    }
    case 'g2d:setScene':
      return block('sz_g2d_set_scene', { SCENE: stmt.name }, {}, stmt.__id)
    case 'g2d:showScreen':
      return block(
        'sz_g2d_show_screen',
        { TITLE: stmt.title, SUBTITLE: stmt.subtitle, HINT: stmt.hint, BG: stmt.bg },
        {},
        stmt.__id,
      )
    case 'g2d:restart':
      return block('sz_g2d_restart', {}, {}, stmt.__id)
    case 'g2d:starfield':
      return block('sz_g2d_starfield', { SPEED: stmt.speed }, {}, stmt.__id)
    case 'g2d:dragX':
      return block('sz_g2d_drag_x', { SPRITE: stmt.spriteVar }, {}, stmt.__id)
    case 'g2d:fitScreen':
      return block('sz_g2d_fit_screen', { PERCENT: stmt.percent }, {}, stmt.__id)
    case 'g2d:spawnBullet': {
      const x = exprToValueBlock(stmt.x)
      const y = exprToValueBlock(stmt.y)
      const vx = exprToValueBlock(stmt.vx)
      const vy = exprToValueBlock(stmt.vy)
      if (!x || !y || !vx || !vy) return rawJSBlock(stmt)
      return block(
        'sz_g2d_spawn_bullet',
        { GROUP: stmt.groupVar, R: stmt.radius, COLOR: stmt.color },
        {},
        stmt.__id,
        { X: x, Y: y, VX: vx, VY: vy },
      )
    }
    case 'g2d:arrowsX':
      return block('sz_g2d_arrows_x', { SPRITE: stmt.spriteVar, SPEED: stmt.speed }, {}, stmt.__id)
    case 'g2d:blinkSprite':
      return block('sz_g2d_blink', { SPRITE: stmt.spriteVar, FRAMES: stmt.frames }, {}, stmt.__id)
    case 'g2d:createShip':
      return block(
        'sz_g2d_create_ship',
        {
          NAME: stmt.varName,
          X: stmt.x,
          Y: stmt.y,
          W: stmt.w,
          H: stmt.h,
          BODY: stmt.bodyColor,
          WINGS: stmt.wingColor,
        },
        {},
        stmt.__id,
      )
    case 'g2d:spawnAsteroid': {
      const x = exprToValueBlock(stmt.x)
      const y = exprToValueBlock(stmt.y)
      const vx = exprToValueBlock(stmt.vx)
      const vy = exprToValueBlock(stmt.vy)
      if (!x || !y || !vx || !vy) return rawJSBlock(stmt)
      return block(
        'sz_g2d_spawn_asteroid',
        { GROUP: stmt.groupVar, SIZE: stmt.size, COLOR: stmt.color },
        {},
        stmt.__id,
        { X: x, Y: y, VX: vx, VY: vy },
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
    case 'g3d:createScene':
      return block(
        'sz_g3d_create_scene',
        { CANVAS: stmt.canvasId, NAME: stmt.varName },
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
    case 'g3d:createBox':
      return block(
        'sz_g3d_create_box',
        { NAME: stmt.varName, WORLD: stmt.worldVar, SIZE: stmt.size, COLOR: stmt.color },
        {},
        stmt.__id,
      )
    case 'g3d:createSphere':
      return block(
        'sz_g3d_create_sphere',
        { NAME: stmt.varName, WORLD: stmt.worldVar, RADIUS: stmt.radius, COLOR: stmt.color },
        {},
        stmt.__id,
      )
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
    case 'newInstance':
      return callWithArgs(
        'sz_js_new_var',
        { VARNAME: stmt.varName, CLASS: stmt.className },
        stmt.args ?? [],
        stmt,
      )
    case 'callMethod':
      return callWithArgs(
        'sz_js_call_method',
        { OBJ: stmt.objectVar, METHOD: stmt.method },
        stmt.args ?? [],
        stmt,
      )
    case 'eventHandler': {
      // O bloco "listener por nome" cobre id/var; document cai em avançado (raro).
      if (stmt.targetKind === 'document') return rawJSBlock(stmt)
      return block(
        'sz_js_on_event_named',
        {
          EVENT: stmt.event,
          TARGET_KIND: stmt.targetKind ?? 'id',
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
      const obj = exprToValueBlock(stmt.object)
      const value = exprToValueBlock(stmt.value)
      if (!obj || !value) return rawJSBlock(stmt)
      return block('sz_js_member_set', { NAME: stmt.name }, {}, stmt.__id, {
        OBJ: obj,
        VALUE: value,
      })
    }
    case 'memberCall': {
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
      const blk = block('sz_js_function', { NAME: stmt.name }, { BODY: body }, stmt.__id)
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
}): SerializedBlocklyBlock {
  const params = new Set(m.params)
  const body = statementsToBlocks(m.body)
  for (const b of body) retypeParamsAsArgs(b, params)
  // Idem ao construtor: passar o `__id` mantém o vínculo entre o bloco no
  // canvas e a entrada de sourcemap após round-trips IR→Blocks.
  const blk = block('sz_js_class_method', { NAME: m.name }, { BODY: body }, m.__id)
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
  const allInputs: Record<string, { block: SerializedBlocklyBlock }> = {
    ...Object.fromEntries(Object.entries(serializedInputs).map(([k, v]) => [k, { block: v }])),
    ...Object.fromEntries(Object.entries(valueInputs).map(([k, v]) => [k, { block: v }])),
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
    case 'g2d:keyDown':
      return block('sz_g2d_key_down', { KEY: expr.key })
    case 'g2d:touches':
      return block('sz_g2d_touches', { A: expr.aVar, B: expr.bVar })
    case 'g2d:countGroup':
      return block('sz_g2d_count_group', { GROUP: expr.groupVar })
    case 'g2d:sceneIs':
      return block('sz_g2d_scene_is', { SCENE: expr.name })
    case 'inputKeyPressed':
      return block('sz_input_key_pressed', { KEY: expr.key })
    case 'inputPointer':
      return block(expr.axis === 'y' ? 'sz_input_pointer_y' : 'sz_input_pointer_x')
    case 'global':
      return block(expr.kind === 'innerWidth' ? 'sz_val_window_width' : 'sz_val_window_height')
    case 'canvasDim':
      return block(expr.dim === 'width' ? 'sz_val_canvas_width' : 'sz_val_canvas_height', {
        CTX: expr.ctxVar,
      })
    case 'random': {
      const min = exprToValueBlock(expr.min)
      const max = exprToValueBlock(expr.max)
      return min && max ? block('sz_val_random', {}, {}, undefined, { MIN: min, MAX: max }) : null
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
      return block('sz_val_event_pos', { AXIS: expr.prop })
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
    case 'shuffle':
      return block('sz_val_shuffle', { NAME: expr.arrayVar })
    case 'datasetGet':
      return block('sz_val_dataset', { KEY: expr.key, OBJ: expr.objectVar })
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
      return block('sz_val_member_get', { NAME: expr.name }, {}, expr.__id, { OBJ: obj })
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

/**
 * Promove `body { … }` para o bloco amigável de centralização SÓ quando o
 * conjunto bate EXATAMENTE o que o bloco regenera — senão promover inventaria
 * propriedades (`flex-direction:column`, `min-height:100vh`, `margin:0`).
 */
function isExactBodyCenter(d: Record<string, string>): boolean {
  return (
    d.display === 'flex' &&
    d['flex-direction'] === 'column' &&
    d['align-items'] === 'center' &&
    d['justify-content'] === 'center' &&
    d['min-height'] === '100vh' &&
    d.margin === '0'
  )
}

/** `Npx` exato → N (sem perda). Senão `null` (a declaração vai para verbatim). */
function pxValue(value: string): number | null {
  const v = value.trim()
  const m = v.match(/^(\d+(?:\.\d+)?)px$/i)
  if (!m) return null
  const n = Number(m[1])
  return `${n}px` === v ? n : null
}

/** `N%` exato → N (sem perda). */
function pctValue(value: string): number | null {
  const v = value.trim()
  const m = v.match(/^(\d+(?:\.\d+)?)%$/)
  if (!m) return null
  const n = Number(m[1])
  return `${n}%` === v ? n : null
}

/** Hex canônico minúsculo de 6 dígitos — o campo de cor do Blockly o re-emite igual. */
function isLosslessColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/.test(value.trim())
}

function parseBorder(value: string): { width: number; color: string } | null {
  const match = value.match(/^(\d+(?:\.\d+)?)px\s+solid\s+(.+)$/i)
  if (!match) return null
  return { width: Number(match[1]), color: match[2]?.trim() ?? '#000000' }
}

function parseGradient(value: string): { c1: string; c2: string } | null {
  const m = value.trim().match(/^linear-gradient\(\s*135deg\s*,\s*([^,]+?)\s*,\s*([^)]+?)\s*\)$/i)
  if (!m) return null
  return { c1: m[1] ?? '#000000', c2: m[2] ?? '#ffffff' }
}

function shadowLevel(value: string): 'sm' | 'md' | 'lg' | null {
  const v = value.trim()
  for (const [level, preset] of Object.entries(SHADOW_PRESETS)) {
    if (preset === v) return level as 'sm' | 'md' | 'lg'
  }
  return null
}

function renderElementFallback(node: Extract<SZIR['html'][number], { type: 'element' }>): string {
  const id = node.id ? ` id="${node.id}"` : ''
  const text = node.text ?? ''
  return `<${node.tag}${id}>${text}</${node.tag}>`
}

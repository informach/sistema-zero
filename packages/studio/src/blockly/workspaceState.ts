import { compileStatements } from '#generators'
import type { CSSEntry, JSExpr, JSStatement, KeyframesCSS, SZIR } from '#ir'
import { screenTextToExpr, valueToExpr } from '#ir'
import { FRAME_APPEARANCE, FRAME_BEHAVIOR, FRAME_STRUCTURE, SHADOW_PRESETS } from './buildIR'

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
  'svg',
  'g',
  'path',
  'text',
])

/** Atributos representados por um campo do bloco (logo, não vão para `data`). */
const FIELD_ATTRS: Record<string, readonly string[]> = {
  a: ['href'],
  img: ['src', 'alt'],
  input: ['type', 'placeholder'],
  textarea: ['placeholder'],
  svg: ['width', 'height', 'viewBox'],
  g: ['transform'],
  path: ['d', 'fill', 'stroke', 'transform'],
  circle: ['cx', 'cy', 'r', 'fill'],
  ellipse: ['cx', 'cy', 'rx', 'ry', 'fill'],
  rect: ['x', 'y', 'width', 'height', 'fill'],
  line: ['x1', 'y1', 'x2', 'y2', 'stroke'],
  polyline: ['points', 'fill', 'stroke'],
  polygon: ['points', 'fill', 'stroke'],
  text: ['x', 'y', 'fill'],
  use: ['href', 'transform'],
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

export interface BuildWorkspaceStateOptions {
  startX?: number
  startY?: number
  /** Distância horizontal entre as colunas dos 3 frames. */
  colGap?: number
}

export function buildWorkspaceStateFromIR(
  ir: SZIR,
  options: BuildWorkspaceStateOptions = {},
): SerializedBlocklyWorkspace {
  const startX = options.startX ?? 32
  const startY = options.startY ?? 32
  // Modelo CONTAINER (estilo MakeCode): cada categoria vira UM frame — 🧱 Estrutura
  // (HTML) | 🎨 Aparência (CSS) | ⚙️ Comportamento (JS) — com os blocos da categoria
  // DENTRO. É o inverso EXATO de buildIRFromWorkspace (que lê os filhos de cada
  // frame), então blocos→IR→blocos é estável. Uma coluna por frame.
  const colGap = options.colGap ?? 420

  const htmlChildren = ir.html.map(htmlNodeToBlock).filter(isBlock)
  const cssChildren = ir.css.flatMap(cssEntryToBlocks)
  const jsChildren = statementsToBlocks(ir.js)

  const structure = position(block(FRAME_STRUCTURE, {}, { CHILDREN: htmlChildren }), startX, startY)
  const appearance = position(
    block(FRAME_APPEARANCE, {}, { CHILDREN: cssChildren }),
    startX + colGap,
    startY,
  )
  const behavior = position(
    block(FRAME_BEHAVIOR, {}, { CHILDREN: jsChildren }),
    startX + colGap * 2,
    startY,
  )

  return { blocks: { languageVersion: 0, blocks: [structure, appearance, behavior] } }
}

/**
 * `blocksState` com os 3 frames VAZIOS — semeia o projeto novo (`createEmptyProject`)
 * já com 🧱 Estrutura / 🎨 Aparência / ⚙️ Comportamento na tela, como o `on start` do
 * MakeCode. (O `BlocksMode` faz short-circuit quando o IR está todo vazio, por isso o
 * projeto novo precisa do `blocksState`, não só do IR.)
 */
export function emptyFramesBlocksState(): SerializedBlocklyWorkspace {
  return buildWorkspaceStateFromIR({ html: [], css: [], js: [], extensions: [] })
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
    const canvasFields: Record<string, string> = { ID: node.id }
    if (node.class) canvasFields.CLASS = node.class
    const built = block('sz_html_canvas', canvasFields, {}, node.__id)
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
  // ---- SVG ----
  if (node.tag === 'svg') {
    return block(
      'sz_html_svg',
      {
        ID: node.id ?? '',
        WIDTH: node.attrs?.width ?? '',
        HEIGHT: node.attrs?.height ?? '',
        VIEWBOX: node.attrs?.viewBox ?? '',
      },
      { CHILDREN: (node.children ?? []).map(htmlNodeToBlock) },
      node.__id,
    )
  }
  if (node.tag === 'g') {
    return block(
      'sz_svg_group',
      { ID: node.id ?? '', TRANSFORM: node.attrs?.transform ?? '' },
      { CHILDREN: (node.children ?? []).map(htmlNodeToBlock) },
      node.__id,
    )
  }
  if (node.tag === 'path') {
    return block(
      'sz_svg_path',
      {
        ID: node.id ?? '',
        D: node.attrs?.d ?? '',
        FILL: node.attrs?.fill ?? '',
        STROKE: node.attrs?.stroke ?? '',
        TRANSFORM: node.attrs?.transform ?? '',
      },
      {},
      node.__id,
    )
  }
  if (node.tag === 'circle') {
    return block(
      'sz_svg_circle',
      {
        CX: node.attrs?.cx ?? '0',
        CY: node.attrs?.cy ?? '0',
        R: node.attrs?.r ?? '8',
        FILL: node.attrs?.fill ?? '',
      },
      {},
      node.__id,
    )
  }
  if (node.tag === 'rect') {
    return block(
      'sz_svg_rect',
      {
        X: node.attrs?.x ?? '0',
        Y: node.attrs?.y ?? '0',
        WIDTH: node.attrs?.width ?? '20',
        HEIGHT: node.attrs?.height ?? '20',
        FILL: node.attrs?.fill ?? '',
      },
      {},
      node.__id,
    )
  }
  if (node.tag === 'line') {
    return block(
      'sz_svg_line',
      {
        X1: node.attrs?.x1 ?? '0',
        Y1: node.attrs?.y1 ?? '0',
        X2: node.attrs?.x2 ?? '10',
        Y2: node.attrs?.y2 ?? '10',
        STROKE: node.attrs?.stroke ?? 'black',
      },
      {},
      node.__id,
    )
  }
  if (node.tag === 'use') {
    return block(
      'sz_svg_use',
      { HREF: node.attrs?.href ?? '#minhaForma', TRANSFORM: node.attrs?.transform ?? '' },
      {},
      node.__id,
    )
  }
  if (node.tag === 'ellipse') {
    return block(
      'sz_svg_ellipse',
      {
        CX: node.attrs?.cx ?? '0',
        CY: node.attrs?.cy ?? '0',
        RX: node.attrs?.rx ?? '20',
        RY: node.attrs?.ry ?? '10',
        FILL: node.attrs?.fill ?? '',
      },
      {},
      node.__id,
    )
  }
  if (node.tag === 'polyline') {
    return block(
      'sz_svg_polyline',
      {
        POINTS: node.attrs?.points ?? '',
        FILL: node.attrs?.fill ?? 'none',
        STROKE: node.attrs?.stroke ?? 'black',
      },
      {},
      node.__id,
    )
  }
  if (node.tag === 'polygon') {
    return block(
      'sz_svg_polygon',
      {
        POINTS: node.attrs?.points ?? '',
        FILL: node.attrs?.fill ?? '',
        STROKE: node.attrs?.stroke ?? '',
      },
      {},
      node.__id,
    )
  }
  if (node.tag === 'text') {
    return block(
      'sz_svg_text',
      {
        ID: node.id ?? '',
        X: node.attrs?.x ?? '0',
        Y: node.attrs?.y ?? '0',
        TEXT: node.text ?? '',
        FILL: node.attrs?.fill ?? '',
      },
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
 * e `to`/`100%`; multi-passo vira o bloco "animação (vários passos)" com blocos
 * "passo" filhos (editável); só sem passos cai num rawCSS preservando o texto.
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
  if (entry.steps.length > 0) {
    return block(
      'sz_css_keyframes_steps',
      { NAME: entry.name },
      {
        STEPS: entry.steps.map((s) =>
          block(
            'sz_css_keyframe_step',
            { AT: s.at },
            { DECLS: declarationsToBlocks(s.declarations) },
          ),
        ),
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
  if ('type' in entry && entry.type === 'googleFont') {
    return [block('sz_css_google_font', { FONT: entry.family }, {}, entry.__id)]
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
      // Teclado global → "Quando apertar/soltar a tecla" (corpo embutido).
      if (stmt.event === 'keydown' || stmt.event === 'keyup') {
        return block(
          'sz_js_on_key',
          { WHEN: stmt.event },
          { DO: statementsToBlocks(stmt.body) },
          stmt.__id,
        )
      }
      // Eventos globais sem alvo de elemento (mouse na tela / janela / tela cheia).
      const globalMap: Partial<Record<string, string>> = {
        mousemove: 'sz_js_on_mousemove',
        mousedown: 'sz_js_on_pointer_down',
        mouseup: 'sz_js_on_pointer_up',
        load: 'sz_js_on_load',
        resize: 'sz_js_on_resize',
        fullscreenchange: 'sz_js_on_fullscreen_change',
      }
      const globalType = globalMap[stmt.event]
      if (globalType) {
        return block(globalType, {}, { DO: statementsToBlocks(stmt.body) }, stmt.__id)
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
      if (stmt.targetKind === 'this') return rawJSBlock(stmt)
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
    case 'canvasStrokeRect': {
      const vs = valueBlocks({ X: stmt.x, Y: stmt.y, W: stmt.w, H: stmt.h })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_stroke_rect', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasClearRect': {
      const vs = valueBlocks({ X: stmt.x, Y: stmt.y, W: stmt.w, H: stmt.h })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_clear_rect', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasRoundRect': {
      const vs = valueBlocks({ X: stmt.x, Y: stmt.y, W: stmt.w, H: stmt.h, R: stmt.r })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_round_rect', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasEllipse': {
      const vs = valueBlocks({ X: stmt.x, Y: stmt.y, RX: stmt.rx, RY: stmt.ry })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_ellipse', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasArcSlice': {
      const vs = valueBlocks({ X: stmt.x, Y: stmt.y, R: stmt.r, START: stmt.start, END: stmt.end })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_arc_slice', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasQuadraticCurve': {
      const vs = valueBlocks({ CPX: stmt.cpx, CPY: stmt.cpy, X: stmt.x, Y: stmt.y })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_quadratic_curve', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasBezierCurve': {
      const vs = valueBlocks({
        CP1X: stmt.cp1x,
        CP1Y: stmt.cp1y,
        CP2X: stmt.cp2x,
        CP2Y: stmt.cp2y,
        X: stmt.x,
        Y: stmt.y,
      })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_bezier_curve', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasArcTo': {
      const vs = valueBlocks({ X1: stmt.x1, Y1: stmt.y1, X2: stmt.x2, Y2: stmt.y2, R: stmt.r })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_arc_to', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasShadow': {
      const vs = valueBlocks({ COLOR: stmt.color, BLUR: stmt.blur })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_shadow', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasStrokeText': {
      const vs = valueBlocks({ TEXT: stmt.text, X: stmt.x, Y: stmt.y })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_stroke_text', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasLineDash': {
      const vs = valueBlocks({ SEGMENT: stmt.segment })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_line_dash', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }

    case 'canvasFillText': {
      const vs = valueBlocks({ TEXT: stmt.text, X: stmt.x, Y: stmt.y })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_fill_text', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'animationLoop': {
      const b = block('sz_canvas_anim_loop', {}, { BODY: statementsToBlocks(stmt.body) }, stmt.__id)
      // Reativa os slots do mutator (guardar id / tempo / delta) quando o IR os tem.
      const extra: { handle?: string; timeVar?: string; deltaVar?: string } = {}
      if (stmt.handle) extra.handle = stmt.handle
      if (stmt.timeVar) extra.timeVar = stmt.timeVar
      if (stmt.deltaVar) extra.deltaVar = stmt.deltaVar
      if (Object.keys(extra).length > 0) b.extraState = extra
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
          block('sz_js_case', {}, { DO: statementsToBlocks(c.body) }, undefined, { MATCH: match }),
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
      const angle = exprToValueBlock(stmt.angle)
      return angle === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_rotate', { CTX: stmt.ctxVar }, {}, stmt.__id, { ANGLE: angle })
    }
    case 'canvasScale': {
      const sx = exprToValueBlock(stmt.sx)
      const sy = exprToValueBlock(stmt.sy)
      return sx === null || sy === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_scale', { CTX: stmt.ctxVar }, {}, stmt.__id, { SX: sx, SY: sy })
    }
    case 'canvasGradient': {
      // O bloco visual só representa FIELMENTE 2 stops nos offsets 0 e 1 com cor
      // hex de 6 dígitos (o seletor de cor a re-emite igual). Qualquer outra forma
      // — mais stops, offsets custom (0.3/0.8 viravam 0/1) ou cores nomeadas/rgba
      // (forçadas à paleta) — seria promovida COM PERDA, mudando o desenho do aluno
      // num round-trip blocos⇄código. Fica como rawJS, igual à disciplina de
      // cssEntryToBlocks (só promove quando regenera verbatim).
      const c0 = stmt.stops[0]?.color
      const c1 = stmt.stops[1]?.color
      if (
        stmt.stops.length !== 2 ||
        stmt.stops[0]?.offset !== 0 ||
        stmt.stops[1]?.offset !== 1 ||
        !c0 ||
        !c1 ||
        !isLosslessColor(c0) ||
        !isLosslessColor(c1)
      ) {
        return rawJSBlock(stmt)
      }
      const x0 = exprToValueBlock(stmt.x0)
      const y0 = exprToValueBlock(stmt.y0)
      const x1 = exprToValueBlock(stmt.x1)
      const y1 = exprToValueBlock(stmt.y1)
      if (x0 === null || y0 === null || x1 === null || y1 === null) return rawJSBlock(stmt)
      return block(
        'sz_canvas_gradient',
        { CTX: stmt.ctxVar, NAME: stmt.varName, C0: c0, C1: c1 },
        {},
        stmt.__id,
        { X0: x0, Y0: y0, X1: x1, Y1: y1 },
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
    case 'canvasRect': {
      const vs = valueBlocks({ X: stmt.x, Y: stmt.y, W: stmt.w, H: stmt.h })
      return vs === null
        ? rawJSBlock(stmt)
        : block('sz_canvas_rect', { CTX: stmt.ctxVar }, {}, stmt.__id, vs)
    }
    case 'canvasClip':
      return block('sz_canvas_clip', { CTX: stmt.ctxVar }, {}, stmt.__id)
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
        { CTX: stmt.ctxVar, SIZE: stmt.size, FAMILY: stmt.family, WEIGHT: stmt.weight ?? '' },
        {},
        stmt.__id,
      )
    case 'canvasTextAlign':
      return block('sz_canvas_text_align', { CTX: stmt.ctxVar, ALIGN: stmt.align }, {}, stmt.__id)
    case 'canvasTextBaseline':
      return block(
        'sz_canvas_text_baseline',
        { CTX: stmt.ctxVar, BASELINE: stmt.baseline },
        {},
        stmt.__id,
      )
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
            { NAME: stmt.varName, IMAGE: stmt.image, SOLID: stmt.solid, GRID: stmt.grid },
            {},
            stmt.__id,
            { TILE: tile },
          )
    }
    case 'g2d:drawTileMap': {
      const x = exprToValueBlock(valueToExpr(stmt.x))
      const y = exprToValueBlock(valueToExpr(stmt.y))
      return x === null || y === null
        ? rawJSBlock(stmt)
        : block('sz_g2d_draw_tilemap', { MAP: stmt.mapVar }, {}, stmt.__id, { X: x, Y: y })
    }
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
      return block(
        'sz_g2d_create_stickhero',
        { NAME: stmt.varName, CTX: stmt.ctxVar },
        {},
        stmt.__id,
      )
    case 'g2d:updateStickHero':
      return block('sz_g2d_update_stickhero', { GAME: stmt.gameVar }, {}, stmt.__id)
    case 'g2d:restartStickHero':
      return block('sz_g2d_restart_stickhero', { GAME: stmt.gameVar }, {}, stmt.__id)
    case 'g2d:createBalloon':
      return block('sz_g2d_create_balloon', { NAME: stmt.varName, CTX: stmt.ctxVar }, {}, stmt.__id)
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
    case 'inputKeyPressed':
      return block('sz_input_key_pressed', { KEY: expr.key })
    case 'inputPointer':
      return block(expr.axis === 'y' ? 'sz_input_pointer_y' : 'sz_input_pointer_x')
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
    case 'canvasMeasureText': {
      const t = exprToValueBlock(expr.text)
      return t === null
        ? null
        : block('sz_canvas_measure_text', { CTX: expr.ctxVar }, {}, expr.__id, { TEXT: t })
    }
    case 'canvasIsPointInPath': {
      const vs = valueBlocks({ X: expr.x, Y: expr.y })
      return vs === null
        ? null
        : block('sz_canvas_point_in_path', { CTX: expr.ctxVar }, {}, expr.__id, vs)
    }
    case 'canvasIsPointInStroke': {
      const vs = valueBlocks({ X: expr.x, Y: expr.y })
      return vs === null
        ? null
        : block('sz_canvas_point_in_stroke', { CTX: expr.ctxVar }, {}, expr.__id, vs)
    }
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

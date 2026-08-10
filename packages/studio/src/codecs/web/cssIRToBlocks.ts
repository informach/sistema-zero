import { generateCSS } from '#generators'
import type { CSSDeclarations, CSSEntry, KeyframesCSS } from '#ir'
import {
  cssDeclarationEntries,
  cssDeclarationsRecord,
  hasDuplicateCSSDeclarations,
  hasOrderDependentCSSDeclarations,
} from '#ir'
import type { SerializedBlocklyBlock } from '../types'
import { SHADOW_PRESETS } from './cssBlockToIR'
import { isLosslessColor } from './losslessValues'

export interface CSSIRToBlocksContext {
  block(
    type: string,
    fields?: Record<string, string | number>,
    inputs?: Record<string, SerializedBlocklyBlock[]>,
    id?: string,
  ): SerializedBlocklyBlock
}

export function createCSSIRToBlocks(context: CSSIRToBlocksContext) {
  const block = context.block
  function declarationsToBlocks(declarations?: CSSDeclarations): SerializedBlocklyBlock[] {
    if (!declarations) return []
    return cssDeclarationEntries(declarations).map(({ property, value, __id }) =>
      block('sz_css_decl', { PROP: property, VALUE: value }, {}, __id),
    )
  }

  /** Texto `@keyframes …` para o fallback rawCSS (passos que o bloco from/to não cobre). */
  function keyframesToText(entry: KeyframesCSS): string {
    const steps = entry.steps
      .map((step) => {
        const decls = cssDeclarationEntries(step.declarations)
          .map(({ property, value }) => `    ${property}: ${value};`)
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
    if ('type' in entry && entry.type === 'comment') {
      return [block('sz_css_comment', { TEXT: entry.text }, {}, entry.__id)]
    }
    if ('type' in entry && entry.type === 'mediaQuery') {
      if (entry.feature === 'prefers-reduced-motion') {
        const rule = entry.rules.length === 1 ? entry.rules[0] : undefined
        if (rule && !('type' in rule)) {
          const declarations = cssDeclarationsRecord(rule.declarations)
          if (
            Object.keys(declarations).length === 2 &&
            declarations.animation === 'none' &&
            declarations.transition === 'none'
          ) {
            return [block('sz_css_reduce_motion', { SELECTOR: rule.selector }, {}, entry.__id)]
          }
        }
        return [block('sz_adv_raw_css', { CODE: generateCSS([entry]).trimEnd() }, {}, entry.__id)]
      }
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
    const sourceRule = entry as Exclude<CSSEntry, { type: string }>
    const orderedDeclarations = cssDeclarationEntries(sourceRule.declarations, sourceRule.__declIds)
    // Fallbacks repetidos dependem da ordem. Mantemos todos dentro de UMA regra
    // genérica, sem promover alguns para blocos dedicados que poderiam reordená-los.
    if (
      hasDuplicateCSSDeclarations(sourceRule.declarations) ||
      hasOrderDependentCSSDeclarations(sourceRule.declarations)
    ) {
      return [
        block(
          'sz_css_rule',
          { SELECTOR: sourceRule.selector },
          { CHILDREN: declarationsToBlocks(orderedDeclarations) },
          sourceRule.__id,
        ),
      ]
    }
    // O reconhecedor de blocos dedicados trabalha por propriedade. Este record é
    // apenas uma visão derivada; a ordem/identidade segue em orderedDeclarations.
    const rule = {
      ...sourceRule,
      declarations: cssDeclarationsRecord(sourceRule.declarations),
    }
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
    if (
      selector === 'body' &&
      rule.declarations.color &&
      isLosslessColor(rule.declarations.color)
    ) {
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
      blocks.push(
        block('sz_css_text_color', { SELECTOR: selector, COLOR: rule.declarations.color }),
      )
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

    // ---- 🎮 Posição & jogo: propriedade com bloco dedicado volta a ele (não à
    // "Regra" genérica). Palavras-chave = guarda por enum; valores livres
    // (offset/opacity/url) guardam a string crua e regeneram idênticas. ----
    if (
      rule.declarations.position &&
      ['static', 'relative', 'absolute', 'fixed', 'sticky'].includes(rule.declarations.position)
    ) {
      blocks.push(
        block('sz_css_position', { SELECTOR: selector, VALUE: rule.declarations.position }),
      )
      consumed.add('position')
    }
    for (const side of ['top', 'left', 'right', 'bottom']) {
      const value = rule.declarations[side]
      if (value && !consumed.has(side)) {
        blocks.push(block('sz_css_offset', { SIDE: side, SELECTOR: selector, VALUE: value }))
        consumed.add(side)
      }
    }
    if (
      rule.declarations.display &&
      !consumed.has('display') &&
      ['block', 'inline', 'inline-block', 'none'].includes(rule.declarations.display)
    ) {
      blocks.push(block('sz_css_display', { SELECTOR: selector, VALUE: rule.declarations.display }))
      consumed.add('display')
    }
    if (
      rule.declarations.overflow &&
      ['hidden', 'visible', 'scroll', 'auto'].includes(rule.declarations.overflow)
    ) {
      blocks.push(
        block('sz_css_overflow', { SELECTOR: selector, VALUE: rule.declarations.overflow }),
      )
      consumed.add('overflow')
    }
    if (
      rule.declarations.cursor &&
      ['pointer', 'default', 'crosshair', 'move', 'grab', 'not-allowed'].includes(
        rule.declarations.cursor,
      )
    ) {
      blocks.push(block('sz_css_cursor', { SELECTOR: selector, VALUE: rule.declarations.cursor }))
      consumed.add('cursor')
    }
    if (
      rule.declarations['image-rendering'] &&
      ['pixelated', 'crisp-edges', 'auto'].includes(rule.declarations['image-rendering'])
    ) {
      blocks.push(
        block('sz_css_image_rendering', {
          SELECTOR: selector,
          VALUE: rule.declarations['image-rendering'],
        }),
      )
      consumed.add('image-rendering')
    }
    if (
      rule.declarations['object-fit'] &&
      ['cover', 'contain', 'fill', 'none'].includes(rule.declarations['object-fit'])
    ) {
      blocks.push(
        block('sz_css_object_fit', { SELECTOR: selector, VALUE: rule.declarations['object-fit'] }),
      )
      consumed.add('object-fit')
    }
    if (rule.declarations.opacity) {
      blocks.push(block('sz_css_opacity', { SELECTOR: selector, VALUE: rule.declarations.opacity }))
      consumed.add('opacity')
    }
    if (rule.declarations['z-index']) {
      const z = rule.declarations['z-index'].trim()
      const n = Number(z)
      if (Number.isInteger(n) && String(n) === z) {
        blocks.push(block('sz_css_z_index', { SELECTOR: selector, VALUE: n }))
        consumed.add('z-index')
      }
    }
    if (rule.declarations['background-image']) {
      const m = rule.declarations['background-image'].trim().match(/^url\('([^']*)'\)$/)
      if (m) {
        blocks.push(block('sz_css_background_image', { SELECTOR: selector, URL: m[1] ?? '' }))
        consumed.add('background-image')
      }
    }

    const remaining = orderedDeclarations.filter(({ property }) => !consumed.has(property))
    if (remaining.length > 0) {
      // Declarações sem bloco amigável dedicado viram uma "Regra CSS" genérica
      // (seletor livre) com um bloco "propriedade: valor" por declaração —
      // em vez de cair em "código avançado". Preserva o `block.id` de cada
      // declaração (vindo de `__declIds`) para manter o realce bloco↔código
      // funcionando após round-trips IR→Blocks.
      const decls = remaining.map(({ property, value, __id }) =>
        block('sz_css_decl', { PROP: property, VALUE: value }, {}, __id),
      )
      blocks.push(block('sz_css_rule', { SELECTOR: selector }, { CHILDREN: decls }))
    }
    if (entry.__id && blocks[0] && !blocks[0].id) {
      blocks[0].id = entry.__id
    }
    return blocks
  }

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

  return cssEntryToBlocks
}

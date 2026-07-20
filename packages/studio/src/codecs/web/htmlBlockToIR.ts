import type * as Blockly from 'blockly/core'
import type { HTMLNode, HTMLTag } from '#ir'
import { HTMLNodeSchema } from '#ir'
import { htmlElementForBlock, isSupportedHTMLInputType } from '../../html/catalog'

export interface HTMLBlockToIRContext {
  children(block: Blockly.Block, inputName: string, seen: Set<string>): HTMLNode[]
}

function field(block: Blockly.Block, name: string): string {
  return String(block.getFieldValue(name) ?? '')
}

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

function parseCanvasData(raw: string | null | undefined): {
  width?: number
  height?: number
  attrs?: Record<string, string>
  children?: HTMLNode[]
  classSource?: 'legacy'
} {
  if (!raw) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (typeof parsed !== 'object' || parsed === null) return {}
  const record = parsed as Record<string, unknown>
  const out: {
    width?: number
    height?: number
    attrs?: Record<string, string>
    children?: HTMLNode[]
    classSource?: 'legacy'
  } = {}
  if (typeof record.width === 'number' && Number.isFinite(record.width)) out.width = record.width
  if (typeof record.height === 'number' && Number.isFinite(record.height))
    out.height = record.height
  if (record.attrs && typeof record.attrs === 'object' && !Array.isArray(record.attrs)) {
    const attrs = Object.fromEntries(
      Object.entries(record.attrs).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    )
    if (Object.keys(attrs).length > 0) out.attrs = attrs
  }
  if (Array.isArray(record.children)) {
    const children: HTMLNode[] = []
    for (const child of record.children) {
      const result = HTMLNodeSchema.safeParse(child)
      if (!result.success) return out
      children.push(result.data)
    }
    if (children.length > 0) out.children = children
  }
  if (record.classSource === 'legacy') out.classSource = 'legacy'
  return out
}

function catalogNode(
  block: Blockly.Block,
  seen: Set<string>,
  context: HTMLBlockToIRContext,
): HTMLNode | null {
  const descriptor = htmlElementForBlock(block.type)
  if (!descriptor) return null
  if (descriptor.parserShape === 'inline-text') {
    const text = field(block, 'TEXT')
    const children = context.children(block, 'CHILDREN', seen)
    const labelFor = descriptor.tag === 'label' ? field(block, 'FOR') : ''
    return {
      type: 'element',
      tag: descriptor.tag,
      ...(text ? { text } : {}),
      ...(labelFor ? { attrs: { for: labelFor } } : {}),
      ...(children.length > 0 ? { children } : {}),
    }
  }
  if (
    descriptor.parserShape === 'container' &&
    descriptor.tag !== 'svg' &&
    descriptor.tag !== 'g'
  ) {
    const id = field(block, 'ID')
    return {
      type: 'element',
      tag: descriptor.tag,
      ...(id ? { id } : {}),
      children: context.children(block, 'CHILDREN', seen),
    }
  }
  return null
}

function svgAttributes(
  block: Blockly.Block,
  fields: ReadonlyArray<readonly [attribute: string, fieldName: string]>,
): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const [attribute, fieldName] of fields) {
    const value = field(block, fieldName)
    if (value) attrs[attribute] = value
  }
  return attrs
}

function svgLeaf(
  tag: HTMLTag,
  block: Blockly.Block,
  fields: ReadonlyArray<readonly [attribute: string, fieldName: string]>,
): HTMLNode {
  const id = field(block, 'ID')
  const attrs = svgAttributes(block, fields)
  return {
    type: 'element',
    tag,
    ...(id ? { id } : {}),
    ...(Object.keys(attrs).length > 0 ? { attrs } : {}),
  }
}

export function htmlBlockToIR(
  block: Blockly.Block,
  seen: Set<string>,
  context: HTMLBlockToIRContext,
): HTMLNode | null {
  const fromCatalog = catalogNode(block, seen, context)
  if (fromCatalog) return fromCatalog

  switch (block.type) {
    case 'sz_html_button': {
      const id = field(block, 'ID')
      const buttonType = field(block, 'TYPE')
      return {
        type: 'element',
        tag: 'button',
        ...(id ? { id } : {}),
        text: field(block, 'TEXT'),
        ...(buttonType ? { attrs: { type: buttonType } } : {}),
      }
    }
    case 'sz_html_link':
      return {
        type: 'element',
        tag: 'a',
        text: field(block, 'TEXT'),
        attrs: { href: field(block, 'HREF') },
      }
    case 'sz_html_image': {
      const id = field(block, 'ID')
      const alt = field(block, 'ALT')
      const decorative = field(block, 'DECORATIVE') === 'TRUE'
      return {
        type: 'element',
        tag: 'img',
        ...(id ? { id } : {}),
        attrs: {
          src: field(block, 'SRC'),
          ...(decorative ? { alt: '' } : alt ? { alt } : {}),
        },
      }
    }
    case 'sz_html_input': {
      const id = field(block, 'ID')
      const inputType = field(block, 'TYPE')
      const placeholder = field(block, 'PLACEHOLDER')
      const name = field(block, 'NAME')
      const value = field(block, 'VALUE')
      const checked = field(block, 'CHECKED') === 'TRUE'
      const attrs: Record<string, string> = {}
      if (inputType && isSupportedHTMLInputType(inputType)) attrs.type = inputType
      if (placeholder) attrs.placeholder = placeholder
      if (name) attrs.name = name
      if (value) attrs.value = value
      if (checked) attrs.checked = ''
      return {
        type: 'element',
        tag: 'input',
        ...(id ? { id } : {}),
        ...(Object.keys(attrs).length > 0 ? { attrs } : {}),
      }
    }
    case 'sz_html_textarea': {
      const id = field(block, 'ID')
      const placeholder = field(block, 'PLACEHOLDER')
      const name = field(block, 'NAME')
      const attrs: Record<string, string> = {}
      if (placeholder) attrs.placeholder = placeholder
      if (name) attrs.name = name
      return {
        type: 'element',
        tag: 'textarea',
        ...(id ? { id } : {}),
        text: field(block, 'TEXT'),
        ...(Object.keys(attrs).length > 0 ? { attrs } : {}),
      }
    }
    case 'sz_html_canvas': {
      const id = field(block, 'ID')
      const data = parseCanvasData((block as unknown as { data?: string | null }).data)
      const node: Extract<HTMLNode, { type: 'canvas' }> = {
        type: 'canvas',
        ...(id ? { id } : {}),
      }
      const className = field(block, 'CLASS')
      const attrs = { ...(data.attrs ?? {}) }
      if (className) {
        if (data.classSource === 'legacy') node.class = className
        else attrs.class = className
      }
      if (Object.keys(attrs).length > 0) node.attrs = attrs
      const description = field(block, 'DESCRIPTION')
      if (description) node.children = [{ type: 'text', text: description }]
      else if (data.children) node.children = data.children
      if (data.width != null) node.width = data.width
      if (data.height != null) node.height = data.height
      return node
    }
    case 'sz_html_text':
      return { type: 'text', text: field(block, 'TEXT') }
    case 'sz_html_comment':
      return { type: 'comment', text: field(block, 'TEXT') }
    case 'sz_html_svg': {
      const id = field(block, 'ID')
      const attrs = svgAttributes(block, [
        ['width', 'WIDTH'],
        ['height', 'HEIGHT'],
        ['viewBox', 'VIEWBOX'],
      ])
      return {
        type: 'element',
        tag: 'svg',
        ...(id ? { id } : {}),
        ...(Object.keys(attrs).length > 0 ? { attrs } : {}),
        children: context.children(block, 'CHILDREN', seen),
      }
    }
    case 'sz_svg_group': {
      const id = field(block, 'ID')
      const transform = field(block, 'TRANSFORM')
      return {
        type: 'element',
        tag: 'g',
        ...(id ? { id } : {}),
        ...(transform ? { attrs: { transform } } : {}),
        children: context.children(block, 'CHILDREN', seen),
      }
    }
    case 'sz_svg_path':
      return svgLeaf('path', block, [
        ['d', 'D'],
        ['fill', 'FILL'],
        ['stroke', 'STROKE'],
        ['transform', 'TRANSFORM'],
      ])
    case 'sz_svg_circle':
      return svgLeaf('circle', block, [
        ['cx', 'CX'],
        ['cy', 'CY'],
        ['r', 'R'],
        ['fill', 'FILL'],
      ])
    case 'sz_svg_rect':
      return svgLeaf('rect', block, [
        ['x', 'X'],
        ['y', 'Y'],
        ['width', 'WIDTH'],
        ['height', 'HEIGHT'],
        ['fill', 'FILL'],
      ])
    case 'sz_svg_line':
      return svgLeaf('line', block, [
        ['x1', 'X1'],
        ['y1', 'Y1'],
        ['x2', 'X2'],
        ['y2', 'Y2'],
        ['stroke', 'STROKE'],
      ])
    case 'sz_svg_use': {
      const attrs: Record<string, string> = {}
      const href = field(block, 'HREF')
      const data = readBlockData(block)
      if (href) attrs['xlink:href' in data ? 'xlink:href' : 'href'] = href
      const transform = field(block, 'TRANSFORM')
      if (transform) attrs.transform = transform
      const id = field(block, 'ID')
      return {
        type: 'element',
        tag: 'use',
        ...(id ? { id } : {}),
        ...(Object.keys(attrs).length > 0 ? { attrs } : {}),
      }
    }
    case 'sz_svg_ellipse':
      return svgLeaf('ellipse', block, [
        ['cx', 'CX'],
        ['cy', 'CY'],
        ['rx', 'RX'],
        ['ry', 'RY'],
        ['fill', 'FILL'],
      ])
    case 'sz_svg_polyline':
      return svgLeaf('polyline', block, [
        ['points', 'POINTS'],
        ['fill', 'FILL'],
        ['stroke', 'STROKE'],
      ])
    case 'sz_svg_polygon':
      return svgLeaf('polygon', block, [
        ['points', 'POINTS'],
        ['fill', 'FILL'],
        ['stroke', 'STROKE'],
      ])
    case 'sz_svg_text': {
      const id = field(block, 'ID')
      const attrs = svgAttributes(block, [
        ['x', 'X'],
        ['y', 'Y'],
        ['fill', 'FILL'],
      ])
      const text = field(block, 'TEXT')
      return {
        type: 'element',
        tag: 'text',
        ...(id ? { id } : {}),
        ...(text ? { text } : {}),
        ...(Object.keys(attrs).length > 0 ? { attrs } : {}),
      }
    }
    default:
      return null
  }
}

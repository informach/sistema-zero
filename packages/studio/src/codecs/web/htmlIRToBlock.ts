import type { HTMLNode } from '#ir'
import {
  htmlElementForTag,
  isSupportedHTMLImageLoading,
  normalizeHTMLButtonType,
  normalizeHTMLInputType,
} from '../../html/catalog'
import type { SerializedBlocklyBlock } from '../types'

export interface HTMLIRToBlockContext {
  block(
    type: string,
    fields?: Record<string, string | number>,
    inputs?: Record<string, SerializedBlocklyBlock[]>,
    id?: string,
  ): SerializedBlocklyBlock
  nodeToBlock(node: HTMLNode): SerializedBlocklyBlock
  renderNodes(nodes: HTMLNode[]): string
  renderElementFallback(node: Extract<HTMLNode, { type: 'element' }>): string
}

export function htmlIRToBlock(
  node: HTMLNode,
  context: HTMLIRToBlockContext,
): SerializedBlocklyBlock | null {
  const { block, nodeToBlock } = context
  if (node.type === 'text') {
    return block('sz_html_text', { TEXT: node.text }, {}, node.__id)
  }
  if (node.type === 'comment') {
    return block('sz_html_comment', { TEXT: node.text }, {}, node.__id)
  }
  if (node.type === 'canvas') {
    const simpleDescription =
      node.children?.length === 1 && node.children[0]?.type === 'text' ? node.children[0].text : ''
    const built = block(
      'sz_html_canvas',
      {
        ID: node.id ?? '',
        CLASS: node.class ?? node.attrs?.class ?? '',
        DESCRIPTION: simpleDescription,
      },
      {},
      node.__id,
    )
    const extra: {
      width?: number
      height?: number
      attrs?: Record<string, string>
      children?: HTMLNode[]
      classSource?: 'legacy'
    } = {}
    if (node.width !== undefined) extra.width = node.width
    if (node.height !== undefined) extra.height = node.height
    const attrs = Object.fromEntries(
      Object.entries(node.attrs ?? {}).filter(([name]) => name !== 'class'),
    )
    if (Object.keys(attrs).length > 0) extra.attrs = attrs
    if (node.children && !simpleDescription) extra.children = node.children
    if (node.class) extra.classSource = 'legacy'
    if (Object.keys(extra).length > 0) built.data = JSON.stringify(extra)
    return built
  }
  if (node.type !== 'element') return null

  const descriptor = htmlElementForTag(node.tag)
  if (
    descriptor?.parserShape === 'container' &&
    descriptor.tag !== 'svg' &&
    descriptor.tag !== 'g'
  ) {
    return block(
      descriptor.blockType,
      { ID: node.id ?? '' },
      { CHILDREN: (node.children ?? []).map(nodeToBlock) },
      node.__id,
    )
  }
  if (descriptor?.parserShape === 'inline-text') {
    const fields: Record<string, string> = { TEXT: node.text ?? '' }
    if (node.tag === 'label') fields.FOR = node.attrs?.for ?? ''
    return block(
      descriptor.blockType,
      fields,
      { CHILDREN: (node.children ?? []).map(nodeToBlock) },
      node.__id,
    )
  }

  switch (node.tag) {
    case 'button': {
      const buttonType = normalizeHTMLButtonType(node.attrs?.type ?? '')
      if (buttonType === undefined) {
        return block('sz_adv_raw_html', { CODE: context.renderNodes([node]) }, {}, node.__id)
      }
      return block(
        'sz_html_button',
        { ID: node.id ?? '', TEXT: node.text ?? '', TYPE: buttonType },
        {},
        node.__id,
      )
    }
    case 'a':
      return block(
        'sz_html_link',
        { HREF: node.attrs?.href ?? '#', TEXT: node.text ?? '' },
        {},
        node.__id,
      )
    case 'img': {
      const hasAlt = Object.hasOwn(node.attrs ?? {}, 'alt')
      const alt = node.attrs?.alt ?? ''
      return block(
        'sz_html_image',
        {
          SRC: node.attrs?.src ?? '',
          ALT: alt,
          DECORATIVE: hasAlt && alt === '' ? 'TRUE' : 'FALSE',
          ID: node.id ?? '',
          WIDTH: node.attrs?.width ?? '',
          HEIGHT: node.attrs?.height ?? '',
          LOADING: isSupportedHTMLImageLoading(node.attrs?.loading ?? '')
            ? (node.attrs?.loading ?? '')
            : 'auto',
        },
        {},
        node.__id,
      )
    }
    case 'input': {
      const inputType = normalizeHTMLInputType(node.attrs?.type ?? '')
      if (inputType === undefined) {
        return block('sz_adv_raw_html', { CODE: context.renderNodes([node]) }, {}, node.__id)
      }
      return block(
        'sz_html_input',
        {
          ID: node.id ?? '',
          TYPE: inputType,
          PLACEHOLDER: node.attrs?.placeholder ?? '',
          NAME: node.attrs?.name ?? '',
          VALUE: node.attrs?.value ?? '',
          CHECKED: node.attrs && Object.hasOwn(node.attrs, 'checked') ? 'TRUE' : 'FALSE',
          AUTOCOMPLETE: node.attrs?.autocomplete ?? '',
        },
        {},
        node.__id,
      )
    }
    case 'textarea':
      return block(
        'sz_html_textarea',
        {
          ID: node.id ?? '',
          NAME: node.attrs?.name ?? '',
          TEXT: node.text ?? '',
          PLACEHOLDER: node.attrs?.placeholder ?? '',
          AUTOCOMPLETE: node.attrs?.autocomplete ?? '',
        },
        {},
        node.__id,
      )
    case 'svg':
      return block(
        'sz_html_svg',
        {
          ID: node.id ?? '',
          WIDTH: node.attrs?.width ?? '',
          HEIGHT: node.attrs?.height ?? '',
          VIEWBOX: node.attrs?.viewBox ?? '',
        },
        { CHILDREN: (node.children ?? []).map(nodeToBlock) },
        node.__id,
      )
    case 'g':
      return block(
        'sz_svg_group',
        { ID: node.id ?? '', TRANSFORM: node.attrs?.transform ?? '' },
        { CHILDREN: (node.children ?? []).map(nodeToBlock) },
        node.__id,
      )
    case 'path':
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
    case 'circle':
      return block(
        'sz_svg_circle',
        {
          ID: node.id ?? '',
          CX: node.attrs?.cx ?? '',
          CY: node.attrs?.cy ?? '',
          R: node.attrs?.r ?? '',
          FILL: node.attrs?.fill ?? '',
        },
        {},
        node.__id,
      )
    case 'rect':
      return block(
        'sz_svg_rect',
        {
          ID: node.id ?? '',
          X: node.attrs?.x ?? '',
          Y: node.attrs?.y ?? '',
          WIDTH: node.attrs?.width ?? '',
          HEIGHT: node.attrs?.height ?? '',
          FILL: node.attrs?.fill ?? '',
        },
        {},
        node.__id,
      )
    case 'line':
      return block(
        'sz_svg_line',
        {
          ID: node.id ?? '',
          X1: node.attrs?.x1 ?? '',
          Y1: node.attrs?.y1 ?? '',
          X2: node.attrs?.x2 ?? '',
          Y2: node.attrs?.y2 ?? '',
          STROKE: node.attrs?.stroke ?? '',
        },
        {},
        node.__id,
      )
    case 'use':
      return block(
        'sz_svg_use',
        {
          ID: node.id ?? '',
          HREF: node.attrs?.href ?? node.attrs?.['xlink:href'] ?? '',
          TRANSFORM: node.attrs?.transform ?? '',
        },
        {},
        node.__id,
      )
    case 'ellipse':
      return block(
        'sz_svg_ellipse',
        {
          ID: node.id ?? '',
          CX: node.attrs?.cx ?? '',
          CY: node.attrs?.cy ?? '',
          RX: node.attrs?.rx ?? '',
          RY: node.attrs?.ry ?? '',
          FILL: node.attrs?.fill ?? '',
        },
        {},
        node.__id,
      )
    case 'polyline':
      return block(
        'sz_svg_polyline',
        {
          ID: node.id ?? '',
          POINTS: node.attrs?.points ?? '',
          FILL: node.attrs?.fill ?? '',
          STROKE: node.attrs?.stroke ?? '',
        },
        {},
        node.__id,
      )
    case 'polygon':
      return block(
        'sz_svg_polygon',
        {
          ID: node.id ?? '',
          POINTS: node.attrs?.points ?? '',
          FILL: node.attrs?.fill ?? '',
          STROKE: node.attrs?.stroke ?? '',
        },
        {},
        node.__id,
      )
    case 'text':
      return block(
        'sz_svg_text',
        {
          ID: node.id ?? '',
          X: node.attrs?.x ?? '',
          Y: node.attrs?.y ?? '',
          TEXT: node.text ?? '',
          FILL: node.attrs?.fill ?? '',
        },
        {},
        node.__id,
      )
    default:
      return block('sz_adv_raw_html', { CODE: context.renderElementFallback(node) }, {}, node.__id)
  }
}

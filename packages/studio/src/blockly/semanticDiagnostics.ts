import type * as Blockly from 'blockly/core'
import {
  type CSSEntry,
  type CSSRule,
  type HTMLNode,
  normalizeSZIR,
  type SZIRInput,
  SZIRInputSchema,
} from '#ir'

const SEMANTIC_WARNING_ID = 'sz-semantic-diagnostic'

type WarnableBlock = Blockly.Block & {
  setWarningText?: (text: string | null, id?: string) => void
}

function closestBlockId(root: unknown, path: PropertyKey[]): string | undefined {
  let value = root
  let closest: string | undefined
  for (const segment of path) {
    if (typeof value !== 'object' || value === null) break
    const record = value as Record<PropertyKey, unknown>
    if (typeof record.__id === 'string') closest = record.__id
    value = record[segment]
  }
  if (typeof value === 'object' && value !== null) {
    const id = (value as Record<PropertyKey, unknown>).__id
    if (typeof id === 'string') closest = id
  }
  return closest
}

function addBlockMessage(
  workspace: Blockly.Workspace,
  messagesByBlock: Map<WarnableBlock, Set<string>>,
  blockId: string | undefined,
  message: string,
): void {
  if (!blockId) return
  const block: WarnableBlock | null = workspace.getBlockById(blockId)
  if (!block?.setWarningText) return
  const messages = messagesByBlock.get(block) ?? new Set<string>()
  messages.add(message)
  messagesByBlock.set(block, messages)
}

function collectHtmlTargets(nodes: HTMLNode[]): {
  ids: Set<string>
  classes: Set<string>
  tags: Set<string>
} {
  const ids = new Set<string>()
  const classes = new Set<string>()
  const tags = new Set<string>(['html', 'body'])
  const stack = [...nodes]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!node) continue
    if (node.type === 'canvas') {
      tags.add('canvas')
      ids.add(node.id)
      for (const className of node.class?.split(/\s+/) ?? []) {
        if (className) classes.add(className)
      }
      continue
    }
    if (node.type !== 'element') continue
    tags.add(node.tag)
    if (node.id) ids.add(node.id)
    for (const className of node.attrs?.class?.split(/\s+/) ?? []) {
      if (className) classes.add(className)
    }
    stack.push(...(node.children ?? []))
  }
  return { ids, classes, tags }
}

function collectCssRules(entries: CSSEntry[]): CSSRule[] {
  const rules: CSSRule[] = []
  const stack = [...entries]
  while (stack.length > 0) {
    const entry = stack.pop()
    if (!entry) continue
    if ('type' in entry) {
      if (entry.type === 'mediaQuery') stack.push(...entry.rules)
      continue
    }
    rules.push(entry)
  }
  return rules
}

/**
 * Diagnósticos amigáveis para seletores simples. Não bloqueiam o preview: uma
 * parte pode ser criada depois por JavaScript, mas a criança recebe uma pista
 * imediata para o caso mais comum (id/classe digitado errado ou `#` esquecido).
 */
function addCssSelectorMessages(
  workspace: Blockly.Workspace,
  input: SZIRInput,
  messagesByBlock: Map<WarnableBlock, Set<string>>,
): void {
  const ir = normalizeSZIR(input)
  const targets = collectHtmlTargets(ir.html)
  const simpleSelector = /^([#.][A-Za-z_][\w-]*|[A-Za-z][\w-]*)(?:::{0,1}[A-Za-z-]+)*$/

  for (const rule of collectCssRules(ir.css)) {
    const selector = rule.selector.trim()
    const match = simpleSelector.exec(selector)
    const base = match?.[1]
    if (!base) continue

    if (base.startsWith('#')) {
      if (!targets.ids.has(base.slice(1))) {
        addBlockMessage(
          workspace,
          messagesByBlock,
          rule.__id,
          `Não achei ${base} no HTML. Crie uma parte com esse id ou escolha outra no seletor.`,
        )
      }
      continue
    }
    if (base.startsWith('.')) {
      if (!targets.classes.has(base.slice(1))) {
        addBlockMessage(
          workspace,
          messagesByBlock,
          rule.__id,
          `Não achei ${base} no HTML. Adicione essa classe ou escolha outra no seletor.`,
        )
      }
      continue
    }
    if (!targets.tags.has(base) && targets.ids.has(base)) {
      addBlockMessage(
        workspace,
        messagesByBlock,
        rule.__id,
        `Para escolher o id “${base}”, use #${base}. O # diz ao CSS que esse é o nome da peça.`,
      )
    }
  }
}

const SVG_LENGTH_RE =
  /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?(?:px|pt|pc|cm|mm|in|em|ex|rem|%)?$/i
const SVG_NUMBER_RE = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i

function isSvgLength(value: string): boolean {
  const clean = value.trim()
  return SVG_LENGTH_RE.test(clean) || /^(?:calc|var|min|max|clamp)\(.+\)$/.test(clean)
}

function hasValidSvgPoints(value: string): boolean {
  const numbers = value.trim().replace(/,/g, ' ').split(/\s+/).filter(Boolean)
  return (
    numbers.length >= 4 &&
    numbers.length % 2 === 0 &&
    numbers.every((part) => SVG_NUMBER_RE.test(part))
  )
}

function hasValidSvgPath(value: string): boolean {
  const clean = value.trim()
  return /^[Mm][\s\S]*$/.test(clean) && !/[^MmZzLlHhVvCcSsQqTtAaEe0-9+.,\-\s]/.test(clean)
}

function addSvgMessages(
  workspace: Blockly.Workspace,
  input: SZIRInput,
  messagesByBlock: Map<WarnableBlock, Set<string>>,
): void {
  const ir = normalizeSZIR(input)
  const ids = new Set<string>()
  const elements: Array<Extract<HTMLNode, { type: 'element' }>> = []
  const stack = [...ir.html]
  while (stack.length > 0) {
    const node = stack.pop()
    if (node?.type !== 'element') continue
    elements.push(node)
    if (node.id) ids.add(node.id)
    stack.push(...(node.children ?? []))
  }

  const lengthAttributes: Record<string, readonly string[]> = {
    svg: ['width', 'height'],
    circle: ['cx', 'cy', 'r'],
    ellipse: ['cx', 'cy', 'rx', 'ry'],
    rect: ['x', 'y', 'width', 'height'],
    line: ['x1', 'y1', 'x2', 'y2'],
    text: ['x', 'y'],
  }
  const nonNegativeAttributes: Record<string, readonly string[]> = {
    svg: ['width', 'height'],
    circle: ['r'],
    ellipse: ['rx', 'ry'],
    rect: ['width', 'height'],
  }

  for (const node of elements) {
    for (const attribute of lengthAttributes[node.tag] ?? []) {
      const value = node.attrs?.[attribute]
      if (value && !isSvgLength(value)) {
        addBlockMessage(
          workspace,
          messagesByBlock,
          node.__id,
          `“${value}” não parece uma medida válida para ${attribute}. Tente um número, como 50.`,
        )
      }
    }
    for (const attribute of nonNegativeAttributes[node.tag] ?? []) {
      const value = node.attrs?.[attribute]
      if (value && SVG_NUMBER_RE.test(value) && Number(value) < 0) {
        addBlockMessage(
          workspace,
          messagesByBlock,
          node.__id,
          `${attribute} não pode ser negativo. Use zero ou um número maior.`,
        )
      }
    }

    if ((node.tag === 'polyline' || node.tag === 'polygon') && node.attrs?.points) {
      if (!hasValidSvgPoints(node.attrs.points)) {
        addBlockMessage(
          workspace,
          messagesByBlock,
          node.__id,
          'Os pontos precisam formar pares x,y separados por espaços, como “20,30 80,90”.',
        )
      }
    }
    if (node.tag === 'path' && node.attrs?.d && !hasValidSvgPath(node.attrs.d)) {
      addBlockMessage(
        workspace,
        messagesByBlock,
        node.__id,
        'O caminho precisa começar com M e usar instruções como L, C e Z.',
      )
    }
    if (node.tag === 'use') {
      const href = node.attrs?.href ?? node.attrs?.['xlink:href']
      if (href?.startsWith('#') && !ids.has(href.slice(1))) {
        addBlockMessage(
          workspace,
          messagesByBlock,
          node.__id,
          `Não achei ${href}. Dê esse id a uma forma ou escolha outra forma guardada.`,
        )
      }
    }
  }
}

/**
 * Converte os diagnósticos semânticos do SZ-IR em avisos presos aos blocos que
 * precisam de correção. Retorna false para o chamador preservar o último preview
 * válido em vez de gerar JavaScript quebrado e uma tela vazia.
 */
export function applySemanticDiagnostics(workspace: Blockly.Workspace, input: SZIRInput): boolean {
  for (const block of workspace.getAllBlocks(false)) {
    block.setWarningText?.(null, SEMANTIC_WARNING_ID)
  }

  const parsed = SZIRInputSchema.safeParse(input)
  const messagesByBlock = new Map<WarnableBlock, Set<string>>()
  if (parsed.success) {
    addCssSelectorMessages(workspace, parsed.data, messagesByBlock)
    addSvgMessages(workspace, parsed.data, messagesByBlock)
  } else {
    for (const issue of parsed.error.issues) {
      addBlockMessage(workspace, messagesByBlock, closestBlockId(input, issue.path), issue.message)
    }
  }

  for (const [block, messages] of messagesByBlock) {
    block.setWarningText?.([...messages].join('\n'), SEMANTIC_WARNING_ID)
  }
  return parsed.success
}

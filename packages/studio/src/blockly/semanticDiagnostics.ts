import type * as Blockly from 'blockly/core'
import {
  behaviorStatements,
  type CSSEntry,
  type CSSRule,
  collectCanvasContextSymbols,
  collectCanvasNumericIssues,
  cssCommentRejectionReason,
  cssDeclarationEntries,
  type HTMLNode,
  htmlAttributeRejectionReason,
  normalizeSZIR,
  prepareCSSDeclaration,
  type SZIRInput,
  SZIRInputSchema,
} from '#ir'
import { collectHTMLAccessibilityIssues } from '../html/accessibility'

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

function addHTMLAccessibilityMessages(
  workspace: Blockly.Workspace,
  input: SZIRInput,
  messagesByBlock: Map<WarnableBlock, Set<string>>,
): void {
  const ir = normalizeSZIR(input)
  for (const issue of collectHTMLAccessibilityIssues(ir.html)) {
    addBlockMessage(workspace, messagesByBlock, issue.blockId, issue.message)
  }
}

interface HtmlIdSymbol {
  id: string
  tag: string
  blockId?: string
}

function collectHtmlTargets(nodes: HTMLNode[]): {
  ids: Set<string>
  classes: Set<string>
  tags: Set<string>
  idSymbols: HtmlIdSymbol[]
} {
  const ids = new Set<string>()
  const classes = new Set<string>()
  const tags = new Set<string>(['html', 'body'])
  const idSymbols: HtmlIdSymbol[] = []
  const stack = [...nodes]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!node) continue
    if (node.type === 'canvas') {
      tags.add('canvas')
      if (node.id) {
        ids.add(node.id)
        idSymbols.push({ id: node.id, tag: 'canvas', blockId: node.__id })
      }
      for (const className of (node.class ?? node.attrs?.class)?.split(/\s+/) ?? []) {
        if (className) classes.add(className)
      }
      continue
    }
    if (node.type !== 'element') continue
    tags.add(node.tag)
    if (node.id) {
      ids.add(node.id)
      idSymbols.push({ id: node.id, tag: node.tag, blockId: node.__id })
    }
    for (const className of node.attrs?.class?.split(/\s+/) ?? []) {
      if (className) classes.add(className)
    }
    stack.push(...(node.children ?? []))
  }
  return { ids, classes, tags, idSymbols }
}

/**
 * Confere os símbolos que o Canvas materializa antes de o gerador substituir o
 * último preview válido. Esses casos seriam ambíguos no DOM ou produziriam uma
 * declaração JavaScript repetida, portanto são erros bloqueantes (não dicas).
 */
function addCanvasMessages(
  workspace: Blockly.Workspace,
  input: SZIRInput,
  messagesByBlock: Map<WarnableBlock, Set<string>>,
): boolean {
  const ir = normalizeSZIR(input)
  const { idSymbols } = collectHtmlTargets(ir.html)
  const symbolsById = new Map<string, HtmlIdSymbol[]>()
  for (const symbol of idSymbols) {
    const matches = symbolsById.get(symbol.id) ?? []
    matches.push(symbol)
    symbolsById.set(symbol.id, matches)
  }

  let valid = true
  for (const [id, symbols] of symbolsById) {
    if (symbols.length < 2) continue
    valid = false
    for (const symbol of symbols) {
      addBlockMessage(
        workspace,
        messagesByBlock,
        symbol.blockId,
        `O id “${id}” aparece ${symbols.length} vezes. Cada parte da página precisa de um id diferente.`,
      )
    }
  }

  const { setups, uses } = collectCanvasContextSymbols(behaviorStatements(ir))
  const setupsByContext = new Map<string, typeof setups>()
  for (const setup of setups) {
    const contextName = setup.name
    const sameName = setupsByContext.get(contextName) ?? []
    sameName.push(setup)
    setupsByContext.set(contextName, sameName)

    const targets = symbolsById.get(setup.canvasId) ?? []
    if (targets.length === 0) {
      valid = false
      addBlockMessage(
        workspace,
        messagesByBlock,
        setup.blockId,
        `Não achei uma tela Canvas com o id “${setup.canvasId}”. Crie a tela no HTML ou escolha o id correto.`,
      )
    } else if (targets.length === 1 && targets[0]?.tag !== 'canvas') {
      valid = false
      addBlockMessage(
        workspace,
        messagesByBlock,
        setup.blockId,
        `O id “${setup.canvasId}” pertence a <${targets[0]?.tag}>. Escolha uma tela Canvas.`,
      )
    }
  }

  for (const [contextName, repeated] of setupsByContext) {
    if (repeated.length < 2) continue
    valid = false
    for (const setup of repeated) {
      addBlockMessage(
        workspace,
        messagesByBlock,
        setup.blockId,
        `O pincel “${contextName}” foi preparado ${repeated.length} vezes. Dê um nome diferente a cada pincel.`,
      )
    }
  }

  const preparedContexts = new Set(setups.map((setup) => setup.name))
  for (const use of uses) {
    if (preparedContexts.has(use.name)) continue
    valid = false
    addBlockMessage(
      workspace,
      messagesByBlock,
      use.blockId,
      `O pincel “${use.name}” ainda não foi preparado. Use “Preparar a tela” antes de desenhar.`,
    )
  }

  for (const issue of collectCanvasNumericIssues(behaviorStatements(ir))) {
    valid = false
    addBlockMessage(
      workspace,
      messagesByBlock,
      issue.blockId,
      `O ${issue.label} não pode ser negativo. Use 0 ou um número maior.`,
    )
  }
  return valid
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
 * Expõe no bloco o mesmo motivo pelo qual o gerador recusaria uma declaração
 * CSS ou atributo HTML. Segurança continua fail-closed, mas nunca silenciosa.
 */
function addOutputSafetyMessages(
  workspace: Blockly.Workspace,
  input: SZIRInput,
  messagesByBlock: Map<WarnableBlock, Set<string>>,
): boolean {
  const ir = normalizeSZIR(input)
  let valid = true

  const htmlStack = ir.html.map((node) => ({ node, ownerBlockId: node.__id }))
  while (htmlStack.length > 0) {
    const current = htmlStack.pop()
    if (!current) continue
    const { node } = current
    const blockId = node.__id ?? current.ownerBlockId
    if (node.type === 'element' || node.type === 'canvas') {
      for (const [name, value] of Object.entries(node.attrs ?? {})) {
        if (name.toLowerCase() === 'id') continue
        const reason = htmlAttributeRejectionReason(name, value)
        if (!reason) continue
        valid = false
        addBlockMessage(workspace, messagesByBlock, blockId, reason)
      }
      for (const child of node.children ?? []) {
        htmlStack.push({ node: child, ownerBlockId: blockId })
      }
    }
  }

  const cssStack = [...ir.css]
  while (cssStack.length > 0) {
    const entry = cssStack.pop()
    if (!entry) continue
    if ('type' in entry) {
      if (entry.type === 'mediaQuery') {
        cssStack.push(...entry.rules)
      } else if (entry.type === 'comment') {
        const reason = cssCommentRejectionReason(entry.text)
        if (reason) {
          valid = false
          addBlockMessage(workspace, messagesByBlock, entry.__id, reason)
        }
      } else if (entry.type === 'keyframes') {
        for (const step of entry.steps) {
          for (const declaration of cssDeclarationEntries(step.declarations)) {
            const prepared = prepareCSSDeclaration(declaration.property, declaration.value)
            if (prepared.accepted) continue
            valid = false
            addBlockMessage(
              workspace,
              messagesByBlock,
              declaration.__id ?? entry.__id,
              prepared.message,
            )
          }
        }
      }
      continue
    }
    for (const declaration of cssDeclarationEntries(entry.declarations, entry.__declIds)) {
      const prepared = prepareCSSDeclaration(declaration.property, declaration.value)
      if (prepared.accepted) continue
      valid = false
      addBlockMessage(workspace, messagesByBlock, declaration.__id ?? entry.__id, prepared.message)
    }
  }

  return valid
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
  /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)(?:px|pt|pc|cm|mm|in|em|ex|rem|%)?$/i
const SVG_NUMBER_RE = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i

function isSvgLength(value: string): boolean {
  const clean = value.trim()
  return SVG_LENGTH_RE.test(clean) || /^(?:calc|var|min|max|clamp)\(.+\)$/.test(clean)
}

/** Número literal de uma medida; expressões dinâmicas devolvem `null`. */
function svgLiteralLengthNumber(value: string): number | null {
  const match = SVG_LENGTH_RE.exec(value.trim())
  return match?.[1] === undefined ? null : Number(match[1])
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
  if (!/^[Mm]/.test(clean)) return false
  const tokenPattern = /[A-Za-z]|[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/gi
  const tokens: string[] = []
  let end = 0
  for (const match of clean.matchAll(tokenPattern)) {
    if (!/^[\s,]*$/.test(clean.slice(end, match.index))) return false
    tokens.push(match[0])
    end = (match.index ?? 0) + match[0].length
  }
  if (!/^[\s,]*$/.test(clean.slice(end)) || tokens.length === 0) return false

  const arity: Readonly<Record<string, number>> = {
    M: 2,
    L: 2,
    H: 1,
    V: 1,
    C: 6,
    S: 4,
    Q: 4,
    T: 2,
    A: 7,
    Z: 0,
  }
  let index = 0
  while (index < tokens.length) {
    const command = tokens[index]
    if (!command || !/^[A-Za-z]$/.test(command)) return false
    const upper = command.toUpperCase()
    const commandArity = arity[upper]
    if (commandArity === undefined) return false
    index += 1
    const start = index
    while (index < tokens.length && !/^[A-Za-z]$/.test(tokens[index] ?? '')) index += 1
    const args = tokens.slice(start, index)
    if (commandArity === 0) {
      if (args.length > 0) return false
      continue
    }
    if (
      args.length < commandArity ||
      args.length % commandArity !== 0 ||
      !args.every((part) => SVG_NUMBER_RE.test(part))
    ) {
      return false
    }
    if (upper === 'A') {
      for (let offset = 0; offset < args.length; offset += commandArity) {
        if (!/^[01]$/.test(args[offset + 3] ?? '') || !/^[01]$/.test(args[offset + 4] ?? '')) {
          return false
        }
      }
    }
  }
  return true
}

function hasValidSvgViewBox(value: string): boolean {
  const numbers = value.trim().replace(/,/g, ' ').split(/\s+/).filter(Boolean)
  return (
    numbers.length === 4 &&
    numbers.every((part) => SVG_NUMBER_RE.test(part)) &&
    Number(numbers[2]) > 0 &&
    Number(numbers[3]) > 0
  )
}

function hasValidSvgTransform(value: string): boolean {
  const clean = value.trim()
  if (!clean) return true
  const allowedArity: Readonly<Record<string, readonly number[]>> = {
    matrix: [6],
    translate: [1, 2],
    scale: [1, 2],
    rotate: [1, 3],
    skewX: [1],
    skewY: [1],
  }
  const transformPattern = /([A-Za-z]+)\s*\(([^()]*)\)/g
  let found = false
  let end = 0
  for (const match of clean.matchAll(transformPattern)) {
    if (!/^[\s,]*$/.test(clean.slice(end, match.index))) return false
    const acceptedCounts = allowedArity[match[1] ?? '']
    const args = (match[2] ?? '').replace(/,/g, ' ').split(/\s+/).filter(Boolean)
    if (!acceptedCounts?.includes(args.length) || !args.every((part) => SVG_NUMBER_RE.test(part))) {
      return false
    }
    found = true
    end = (match.index ?? 0) + match[0].length
  }
  return found && /^[\s,]*$/.test(clean.slice(end))
}

function addSvgMessages(
  workspace: Blockly.Workspace,
  input: SZIRInput,
  messagesByBlock: Map<WarnableBlock, Set<string>>,
): boolean {
  const ir = normalizeSZIR(input)
  type SvgElement = Extract<HTMLNode, { type: 'element' }>
  interface SvgRecord {
    node: SvgElement
    ancestorIds: string[]
  }
  const records: SvgRecord[] = []
  const stack = ir.html.map((node) => ({ node, ancestorIds: [] as string[] }))
  while (stack.length > 0) {
    const current = stack.pop()
    const node = current?.node
    if (node?.type !== 'element') continue
    const ancestorIds = current?.ancestorIds ?? []
    records.push({ node, ancestorIds })
    const childAncestors = node.id ? [...ancestorIds, node.id] : ancestorIds
    stack.push(
      ...(node.children ?? []).map((child) => ({ node: child, ancestorIds: childAncestors })),
    )
  }
  const nodesById = new Map<string, SvgElement[]>()
  for (const { node } of records) {
    if (!node.id) continue
    const matches = nodesById.get(node.id) ?? []
    matches.push(node)
    nodesById.set(node.id, matches)
  }

  const useRecords = records.filter(({ node }) => node.tag === 'use')
  const referenceGraph = new Map<string, Set<string>>()
  for (const { node, ancestorIds } of useRecords) {
    const href = node.attrs?.href ?? node.attrs?.['xlink:href']
    const owner = ancestorIds.at(-1)
    if (!owner || !href?.startsWith('#')) continue
    const targets = referenceGraph.get(owner) ?? new Set<string>()
    targets.add(href.slice(1))
    referenceGraph.set(owner, targets)
  }
  const reaches = (from: string, to: string, seen = new Set<string>()): boolean => {
    if (from === to) return true
    if (seen.has(from)) return false
    seen.add(from)
    for (const next of referenceGraph.get(from) ?? []) {
      if (reaches(next, to, seen)) return true
    }
    return false
  }

  let valid = true
  const warn = (blockId: string | undefined, message: string): void => {
    valid = false
    addBlockMessage(workspace, messagesByBlock, blockId, message)
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

  for (const { node, ancestorIds } of records) {
    for (const attribute of lengthAttributes[node.tag] ?? []) {
      const value = node.attrs?.[attribute]
      if (value && !isSvgLength(value)) {
        warn(
          node.__id,
          `“${value}” não parece uma medida válida para ${attribute}. Tente um número, como 50.`,
        )
      }
    }
    for (const attribute of nonNegativeAttributes[node.tag] ?? []) {
      const value = node.attrs?.[attribute]
      const literal = value ? svgLiteralLengthNumber(value) : null
      if (literal !== null && literal < 0) {
        warn(node.__id, `${attribute} não pode ser negativo. Use zero ou um número maior.`)
      }
    }

    if (node.tag === 'svg' && node.attrs?.viewBox && !hasValidSvgViewBox(node.attrs.viewBox)) {
      warn(
        node.__id,
        'O mapa interno precisa de quatro números: início horizontal, início vertical, largura e altura. Exemplo: “0 0 200 200”.',
      )
    }
    if (node.attrs?.transform && !hasValidSvgTransform(node.attrs.transform)) {
      warn(
        node.__id,
        'A transformação não está completa. Tente, por exemplo, “translate(20 10)”, “rotate(45)” ou “scale(2)”.',
      )
    }

    if ((node.tag === 'polyline' || node.tag === 'polygon') && node.attrs?.points) {
      if (!hasValidSvgPoints(node.attrs.points)) {
        warn(
          node.__id,
          'Os pontos precisam formar pares x,y separados por espaços, como “20,30 80,90”.',
        )
      }
    }
    if (node.tag === 'path' && node.attrs?.d && !hasValidSvgPath(node.attrs.d)) {
      warn(node.__id, 'O caminho precisa começar com M e usar instruções como L, C e Z.')
    }
    if (node.tag === 'use') {
      const href = (node.attrs?.href ?? node.attrs?.['xlink:href'])?.trim()
      if (!href) {
        warn(node.__id, 'Escolha uma forma guardada para reutilizar neste desenho.')
        continue
      }
      if (!href.startsWith('#')) {
        const localName = href.includes('#') ? href.slice(href.lastIndexOf('#') + 1) : href
        warn(
          node.__id,
          `Para usar uma forma deste desenho, escreva #${localName}. O # aponta para o id da forma guardada.`,
        )
        continue
      }
      const targetId = href.slice(1)
      const targets = nodesById.get(targetId) ?? []
      if (targets.length === 0) {
        warn(
          node.__id,
          `Não achei ${href}. Dê esse id a uma forma ou escolha outra forma guardada.`,
        )
        continue
      }
      const allowedTargets = new Set([
        'symbol',
        'g',
        'path',
        'circle',
        'ellipse',
        'line',
        'rect',
        'polyline',
        'polygon',
        'text',
      ])
      if (targets.some((target) => !allowedTargets.has(target.tag))) {
        warn(
          node.__id,
          `${href} aponta para <${targets[0]?.tag}>. Escolha uma forma, um grupo ou uma peça reutilizável.`,
        )
        continue
      }
      const owner = ancestorIds.at(-1)
      if ((owner && reaches(targetId, owner)) || node.id === targetId) {
        warn(
          node.__id,
          `${href} criaria uma referência circular. Escolha uma forma que não contenha este bloco.`,
        )
      }
    }
  }
  return valid
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
  let semanticValid = true
  if (parsed.success) {
    addCssSelectorMessages(workspace, parsed.data, messagesByBlock)
    addHTMLAccessibilityMessages(workspace, parsed.data, messagesByBlock)
    semanticValid = addSvgMessages(workspace, parsed.data, messagesByBlock)
    semanticValid = addCanvasMessages(workspace, parsed.data, messagesByBlock) && semanticValid
    semanticValid =
      addOutputSafetyMessages(workspace, parsed.data, messagesByBlock) && semanticValid
  } else {
    for (const issue of parsed.error.issues) {
      addBlockMessage(workspace, messagesByBlock, closestBlockId(input, issue.path), issue.message)
    }
  }

  for (const [block, messages] of messagesByBlock) {
    block.setWarningText?.([...messages].join('\n'), SEMANTIC_WARNING_ID)
  }
  return parsed.success && semanticValid
}

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

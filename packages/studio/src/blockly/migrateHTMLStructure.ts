import { HTML_STRUCTURE_ROOT, htmlElementForBlock, isHTMLBlockChildAllowed } from '../html/catalog'

interface SerializedInput {
  block?: SerializedBlock
  shadow?: SerializedBlock
}

interface SerializedBlock {
  type: string
  fields?: Record<string, string | number>
  inputs?: Record<string, SerializedInput>
  next?: { block: SerializedBlock }
  [key: string]: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isSerializedBlock(value: unknown): value is SerializedBlock {
  return isRecord(value) && typeof value.type === 'string'
}

function topBlocks(state: unknown): SerializedBlock[] | null {
  if (!isRecord(state) || !isRecord(state.blocks)) return null
  const blocks = state.blocks.blocks
  if (!Array.isArray(blocks) || !blocks.every(isSerializedBlock)) return null
  return blocks
}

function unlinkChain(head: SerializedBlock | undefined): SerializedBlock[] {
  const blocks: SerializedBlock[] = []
  let current = head
  while (current) {
    const next = current.next?.block
    delete current.next
    blocks.push(current)
    current = next
  }
  return blocks
}

function linkChain(blocks: SerializedBlock[]): SerializedBlock | undefined {
  for (let index = 0; index < blocks.length - 1; index += 1) {
    const current = blocks[index]
    const next = blocks[index + 1]
    if (current && next) current.next = { block: next }
  }
  return blocks[0]
}

function isHTMLBlock(type: string): boolean {
  return (
    htmlElementForBlock(type) !== undefined ||
    type === 'sz_html_text' ||
    type === 'sz_html_comment' ||
    type === 'sz_html_canvas' ||
    type === 'sz_adv_raw_html'
  )
}

function isNestedForm(type: string, ancestors: readonly string[]): boolean {
  return type === 'sz_html_form' && ancestors.includes('sz_html_form')
}

interface NormalizeResult {
  accepted: SerializedBlock[]
  promoted: SerializedBlock[]
}

/**
 * Normaliza o conteúdo de um contêiner. O primeiro filho incompatível e cada
 * bloco incompatível seguinte sobem para depois do contêiner, preservando ordem
 * e dados. O nível acima decide se já são válidos ou se precisam subir de novo.
 */
function normalizeSequence(
  head: SerializedBlock | undefined,
  parentType: string,
  ancestors: readonly string[],
  markChanged: () => void,
): NormalizeResult {
  const accepted: SerializedBlock[] = []
  const promoted: SerializedBlock[] = []
  let promoting = false

  for (const original of unlinkChain(head)) {
    const candidates = normalizeBlock(original, ancestors, markChanged)
    for (const candidate of candidates) {
      const allowed =
        isHTMLBlockChildAllowed(parentType, candidate.type) &&
        !isNestedForm(candidate.type, ancestors)
      if (!allowed) {
        promoting = true
        markChanged()
      }
      if (promoting) {
        promoted.push(candidate)
      } else accepted.push(candidate)
    }
  }
  return { accepted, promoted }
}

function setInputChain(
  block: SerializedBlock,
  inputName: string,
  input: SerializedInput,
  children: SerializedBlock[],
): void {
  const head = linkChain(children)
  if (head) input.block = head
  else delete input.block
  if (!input.block && !input.shadow) delete block.inputs?.[inputName]
  if (block.inputs && Object.keys(block.inputs).length === 0) delete block.inputs
}

/** Devolve o bloco e os descendentes que precisaram subir para depois dele. */
function normalizeBlock(
  block: SerializedBlock,
  ancestors: readonly string[],
  markChanged: () => void,
): SerializedBlock[] {
  // O campo TYPE não existia no bloco de botão antigo. Vazio preserva a
  // semântica original (automático do navegador); botões novos nascem `button`.
  if (block.type === 'sz_html_button' && !Object.hasOwn(block.fields ?? {}, 'TYPE')) {
    block.fields = { ...(block.fields ?? {}), TYPE: '' }
    markChanged()
  }

  const promoted: SerializedBlock[] = []
  for (const [inputName, input] of Object.entries(block.inputs ?? {})) {
    if (inputName === 'CHILDREN' && isHTMLBlock(block.type)) {
      const result = normalizeSequence(
        input.block,
        block.type,
        [...ancestors, block.type],
        markChanged,
      )
      setInputChain(block, inputName, input, result.accepted)
      promoted.push(...result.promoted)
      continue
    }
    if (input.block) walkGenericTree(input.block, ancestors, markChanged)
    if (input.shadow) walkGenericTree(input.shadow, ancestors, markChanged)
  }
  return [block, ...promoted]
}

function walkGenericTree(
  head: SerializedBlock,
  ancestors: readonly string[],
  markChanged: () => void,
): void {
  let current: SerializedBlock | undefined = head
  while (current) {
    normalizeBlock(current, ancestors, markChanged)
    current = current.next?.block
  }
}

function wrapRootOnlyChildren(
  blocks: SerializedBlock[],
  markChanged: () => void,
): SerializedBlock[] {
  const out: SerializedBlock[] = []
  let pendingList: SerializedBlock[] = []
  let pendingSvg: SerializedBlock[] = []

  const flushList = (): void => {
    if (pendingList.length === 0) return
    const child = linkChain(pendingList)
    out.push({
      type: 'sz_html_ul',
      fields: { ID: '', CLASS: '' },
      ...(child ? { inputs: { CHILDREN: { block: child } } } : {}),
    })
    pendingList = []
    markChanged()
  }
  const flushSvg = (): void => {
    if (pendingSvg.length === 0) return
    const child = linkChain(pendingSvg)
    out.push({
      type: 'sz_html_svg',
      fields: { ID: '', WIDTH: '', HEIGHT: '', VIEWBOX: '', CLASS: '' },
      ...(child ? { inputs: { CHILDREN: { block: child } } } : {}),
    })
    pendingSvg = []
    markChanged()
  }

  for (const block of blocks) {
    const categories = htmlElementForBlock(block.type)?.categories ?? []
    if (categories.includes('list-item')) {
      flushSvg()
      pendingList.push(block)
      continue
    }
    if (categories.includes('svg') && !categories.includes('phrasing')) {
      flushList()
      pendingSvg.push(block)
      continue
    }
    flushList()
    flushSvg()
    out.push(block)
  }
  flushList()
  flushSvg()
  return out
}

function normalizeRootChain(
  head: SerializedBlock | undefined,
  markChanged: () => void,
): SerializedBlock[] {
  const result = normalizeSequence(head, HTML_STRUCTURE_ROOT, [HTML_STRUCTURE_ROOT], markChanged)
  return wrapRootOnlyChildren([...result.accepted, ...result.promoted], markChanged)
}

/**
 * Migra estados HTML anteriores aos encaixes semânticos. É pura para o chamador:
 * clona somente o valor de trabalho e devolve a referência original quando nada
 * mudou.
 */
export function migrateHTMLStructure(state: unknown): unknown {
  const originalTop = topBlocks(state)
  if (!originalTop) return state

  const cloned: unknown = structuredClone(state)
  const clonedTop = topBlocks(cloned)
  if (!clonedTop) return state
  let changed = false
  const markChanged = (): void => {
    changed = true
  }

  const normalizedTop: SerializedBlock[] = []
  for (const top of clonedTop) {
    if (top.type === HTML_STRUCTURE_ROOT) {
      const input = top.inputs?.CHILDREN
      if (input) setInputChain(top, 'CHILDREN', input, normalizeRootChain(input.block, markChanged))
      normalizedTop.push(top)
      continue
    }
    if (isHTMLBlock(top.type)) {
      normalizedTop.push(...normalizeRootChain(top, markChanged))
      continue
    }
    walkGenericTree(top, [], markChanged)
    normalizedTop.push(top)
  }

  if (!changed) return state
  clonedTop.splice(0, clonedTop.length, ...normalizedTop)
  return cloned
}

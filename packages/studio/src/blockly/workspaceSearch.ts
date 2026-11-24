import type * as Blockly from 'blockly/core'

/**
 * Procurar no programa (lote 3 da missão, seção 6: "pesquisa e localização em projetos grandes",
 * 21/11/2026).
 *
 * Procura pelo MODELO dos blocos, não pelo desenho: num projeto grande a cauda de cada área nasce
 * sem desenho (`deferredTail.ts`), e o texto de um bloco adiado não está na página. O texto de um
 * bloco é o que a criança lê nele (rótulos e campos das entradas dele, sem os blocos encaixados), e
 * o valor de uma sombra (o número dentro de um encaixe) conta para o bloco que a contém. Achar um
 * bloco leva ao "Mostrar o bloco" de sempre (`highlightStore.revealBlock`), que desenha a cauda até
 * ele.
 */

export { WORKSPACE_SEARCH_MIN_BLOCKS } from './offscreenThreshold'

export interface WorkspaceSearchHit {
  /** O bloco que a criança vê (nunca uma sombra). */
  id: string
  /** O texto do bloco, como ele aparece. */
  text: string
  /** A área do projeto em que ele mora ("Ao iniciar", "Quando acontecer"...), ou nada (rascunho). */
  area: string | null
}

export interface WorkspaceSearchResult {
  hits: WorkspaceSearchHit[]
  /** Quantos blocos casaram, além dos que cabem em `hits`. */
  total: number
}

/** Sem acento, minúsculas e espaços simples: "Ação  Rápida" e "acao rapida" casam. */
export function normalizeSearchText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/** `ConnectionType.NEXT_STATEMENT`: a entrada que guarda blocos empilhados ("então", "fazer"). */
const STATEMENT_CONNECTION = 3
/** Até onde um valor encaixado dentro de outro entra na linha (o resto é raro e só alonga). */
const LINE_DEPTH_MAX = 4

/**
 * Um botão de imagem (o + e o − do "Se"): o texto dele é a descrição, não algo que se lê. Pelo
 * `clickHandler` do `FieldImage`, não pelo `isClickable()`: este exige o bloco editável, e num
 * bloco travado o "adicionar senão se" voltava à busca (full review final de 21/11/2026). O
 * Blockly 12 não tem leitura pública do tratador; a propriedade é a que o `isClickable` dele usa.
 */
const isImageButton = (field: Blockly.Field) =>
  !field.EDITABLE && Boolean((field as unknown as { clickHandler?: unknown }).clickHandler)

/**
 * O texto que a criança lê na LINHA do próprio bloco (proposta aprovada em 21/11/2026): rótulos e
 * campos, e o que está encaixado nela (a condição do "Se", o número de um encaixe), até a primeira
 * entrada de blocos empilhados, inclusive o rótulo dela ("então"). As partes seguintes (os outros
 * ramos, o + e o −) e os blocos de dentro são outros resultados.
 */
export function blockOwnText(block: Blockly.Block, depth = 0): string {
  const parts: string[] = []
  for (const input of block.inputList) {
    for (const field of input.fieldRow) {
      if (isImageButton(field)) continue
      const text = field.getText()
      if (text) parts.push(text)
    }
    if (input.connection?.type === STATEMENT_CONNECTION) break
    const target = input.connection?.targetBlock()
    if (target && depth < LINE_DEPTH_MAX) {
      const nested = blockOwnText(target, depth + 1)
      if (nested) parts.push(nested)
    }
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

function areaOf(block: Blockly.Block): string | null {
  const root = block.getRootBlock()
  if (!root.type.startsWith('sz_frame_')) return null
  // O rótulo da área é o primeiro texto dela ("Ao iniciar", "Quando acontecer"...).
  for (const input of root.inputList)
    for (const field of input.fieldRow) {
      const text = field.getText().trim()
      if (text) return text
    }
  return null
}

/**
 * Todos os blocos na ordem do programa (de cima para baixo, cada bloco antes dos que ele contém e
 * dos que vêm depois dele), com pilha explícita. O `getAllBlocks(true)` do Blockly 12 recursa na
 * cadeia (`getDescendants`) e espalha listas grandes a cada nível: numa sequência longa estoura.
 */
export function blocksInProgramOrder(workspace: Blockly.Workspace): Blockly.Block[] {
  const ordered: Blockly.Block[] = []
  const pending = [...workspace.getTopBlocks(true)].reverse()
  while (pending.length > 0) {
    const block = pending.pop() as Blockly.Block
    ordered.push(block)
    const children = block.getChildren(true)
    for (let index = children.length - 1; index >= 0; index--)
      pending.push(children[index] as Blockly.Block)
  }
  return ordered
}

/** Um bloco já lido para a busca: o texto como aparece e o texto sem acento para comparar. */
export interface WorkspaceSearchEntry extends WorkspaceSearchHit {
  normalized: string
}

/**
 * Lê o programa uma vez (revisão do lote 3, achado 7): a busca procurava no workspace a cada tecla
 * (cerca de 15 ms com 10 mil blocos numa máquina de mesa, na renderização). O índice é refeito
 * só quando o programa muda; cada tecla só filtra.
 */
export function buildWorkspaceSearchIndex(workspace: Blockly.Workspace): WorkspaceSearchEntry[] {
  const entries: WorkspaceSearchEntry[] = []
  for (const block of blocksInProgramOrder(workspace)) {
    if (block.isShadow() || block.type.startsWith('sz_frame_')) continue
    const text = blockOwnText(block)
    entries.push({ id: block.id, text, area: areaOf(block), normalized: normalizeSearchText(text) })
  }
  return entries
}

/** Os blocos do índice cujo texto tem TODAS as palavras procuradas, na ordem do programa. */
export function filterWorkspaceSearchIndex(
  index: readonly WorkspaceSearchEntry[],
  query: string,
  limit = 30,
): WorkspaceSearchResult {
  const terms = normalizeSearchText(query).split(' ').filter(Boolean)
  if (terms.length === 0) return { hits: [], total: 0 }
  const hits: WorkspaceSearchHit[] = []
  let total = 0
  for (const entry of index) {
    if (!terms.every((term) => entry.normalized.includes(term))) continue
    total++
    if (hits.length < limit) hits.push({ id: entry.id, text: entry.text, area: entry.area })
  }
  return { hits, total }
}

/** Os blocos cujo texto tem TODAS as palavras procuradas, na ordem do programa. */
export function searchWorkspaceBlocks(
  workspace: Blockly.Workspace,
  query: string,
  limit = 30,
): WorkspaceSearchResult {
  if (!normalizeSearchText(query)) return { hits: [], total: 0 }
  return filterWorkspaceSearchIndex(buildWorkspaceSearchIndex(workspace), query, limit)
}

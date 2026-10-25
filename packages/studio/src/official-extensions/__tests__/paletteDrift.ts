import type { ExtensionToolboxCategory } from '#extensions'
import { type ExtensionPaletteTree, paletteTreeTypes } from '../extensionPalette'

/**
 * Rede comum de drift da paleta das extensões oficiais (antes cada docDrift tinha a sua
 * cópia). Não existe mais o balde "Mais": bloco fora da árvore simplesmente some da
 * paleta, então estes relatórios precisam sair VAZIOS. Se algo cair aqui, ponha o bloco
 * na família certa do `palette.ts`; não afrouxe o teste.
 */

interface DriftBlock {
  readonly type: string
  readonly hidden?: boolean
}

/** Todo `type` de bloco na toolbox, em qualquer nível (com repetição). */
export function toolboxBlockTypes(cat: ExtensionToolboxCategory, acc: string[] = []): string[] {
  for (const c of cat.contents) {
    if (c.kind === 'category') toolboxBlockTypes(c, acc)
    else acc.push(c.type)
  }
  return acc
}

/** Todo nome de categoria da toolbox (a raiz inclusive), em qualquer nível. */
export function toolboxCategoryNames(cat: ExtensionToolboxCategory, acc: string[] = []): string[] {
  acc.push(cat.name)
  for (const c of cat.contents) if (c.kind === 'category') toolboxCategoryNames(c, acc)
  return acc
}

function repeated(types: readonly string[]): string[] {
  const count = new Map<string, number>()
  for (const type of types) count.set(type, (count.get(type) ?? 0) + 1)
  return [...count.entries()].filter(([, n]) => n > 1).map(([type]) => type)
}

/**
 * A árvore pura (`palette.ts`) contra os blocos: todo bloco visível em exatamente UM
 * lugar e nenhum tipo citado que não exista. Bloco `hidden` pode ficar citado (a
 * toolbox o filtra), mas não é cobrado.
 */
export function paletteTreeDrift(tree: ExtensionPaletteTree, blocks: readonly DriftBlock[]) {
  const cited = paletteTreeTypes(tree)
  const citedSet = new Set(cited)
  const known = new Set(blocks.map((block) => block.type))
  return {
    foraDaArvore: blocks
      .filter((block) => !block.hidden && !citedSet.has(block.type))
      .map((block) => block.type),
    emDoisLugares: repeated(cited),
    fantasmas: [...citedSet].filter((type) => !known.has(type)),
  }
}

/** A toolbox montada contra os blocos: mesma cobrança, mais a ausência do balde "Mais". */
export function toolboxDrift(toolbox: ExtensionToolboxCategory, blocks: readonly DriftBlock[]) {
  const types = toolboxBlockTypes(toolbox)
  const present = new Set(types)
  const known = new Set(blocks.map((block) => block.type))
  return {
    foraDaToolbox: blocks
      .filter((block) => !block.hidden && !present.has(block.type))
      .map((block) => block.type),
    emDoisLugares: repeated(types),
    fantasmasNaToolbox: [...present].filter((type) => !known.has(type)),
    categoriaMais: toolboxCategoryNames(toolbox).filter((name) => name === 'Mais'),
  }
}

export const NO_PALETTE_TREE_DRIFT = { foraDaArvore: [], emDoisLugares: [], fantasmas: [] }
export const NO_TOOLBOX_DRIFT = {
  foraDaToolbox: [],
  emDoisLugares: [],
  fantasmasNaToolbox: [],
  categoriaMais: [],
}

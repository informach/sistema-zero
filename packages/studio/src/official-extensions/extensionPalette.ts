import { categoryShades } from '../blockly/colorShades'
import type { ExtensionToolboxCategory, ToolboxBlockInputs } from '../extensions/toolboxTypes'

/**
 * Paleta de uma extensão oficial a partir de uma árvore PURA família → seção → tipos
 * (molde: `game-2d/palette.ts`). Fonte única de cor, ordem, filtro de `hidden` e toolbox,
 * para que cada extensão só declare a árvore + as sombras dos soquetes.
 *
 * - Cor = navegação: cada FAMÍLIA recebe um tom da cor base (`categoryShades`) e todos os
 *   blocos dela saem nesse tom. Bloco fora da árvore mantém a cor própria (ou a de
 *   `fallbackColour`).
 * - Bloco `hidden` (legado) nunca entra na toolbox, mesmo que a árvore o cite. A seção que
 *   fica vazia continua na árvore: quem poda é o `pruneEmptyCategories` da toolbox.
 * - **Família achatada:** uma família com UMA seção de MESMO nome (`flatFamily`) é desenhada
 *   sem o nível do meio, com os blocos direto nela. É a forma das paletas planas antigas
 *   (Jogo 3D, Mundo 3D, Avançado), que ficam idênticas até ganharem seções de verdade.
 */

export interface PaletteSection {
  readonly name: string
  readonly types: readonly string[]
}

export interface PaletteFamily {
  readonly name: string
  readonly sections: readonly PaletteSection[]
}

export type ExtensionPaletteTree = readonly PaletteFamily[]

/** Família de uma seção só, desenhada achatada (ver o cabeçalho). */
export function flatFamily(name: string, types: readonly string[]): PaletteFamily {
  return { name, sections: [{ name, types }] }
}

/** A lista plana antiga `{ name, types }[]` como árvore de famílias achatadas. */
export function flatFamilies(
  groups: readonly { readonly name: string; readonly types: readonly string[] }[],
): ExtensionPaletteTree {
  return groups.map((group) => flatFamily(group.name, group.types))
}

function isFlat(family: PaletteFamily): boolean {
  return family.sections.length === 1 && family.sections[0]?.name === family.name
}

/** Todos os tipos citados pela árvore, na ordem de leitura (com repetição, se houver). */
export function paletteTreeTypes(tree: ExtensionPaletteTree): string[] {
  return tree.flatMap((family) => family.sections.flatMap((section) => [...section.types]))
}

interface PaletteBlock {
  readonly type: string
  readonly colour?: string | number
  readonly hidden?: boolean
}

export interface ExtensionPaletteOptions<B extends PaletteBlock> {
  /** Nome da categoria-raiz na paleta ("Jogo 3D"). */
  readonly name: string
  /** Cor base da extensão; as famílias são tons dela. */
  readonly colour: string
  readonly tree: ExtensionPaletteTree
  readonly blocks: readonly B[]
  /** Sombras dos soquetes de valor por tipo de bloco (formato do toolbox do Blockly). */
  readonly shadows?: Readonly<Record<string, ToolboxBlockInputs>>
  /** Cor de um bloco que a árvore não cita (ex.: a lista de nomes de cena do Jogo 2D). */
  readonly fallbackColour?: (
    type: string,
    colourOf: (type: string) => string | undefined,
  ) => string | undefined
  /** `palette` reordena os blocos na ordem da árvore; `source` mantém a de declaração. */
  readonly order?: 'palette' | 'source'
}

export interface ExtensionPalette<B> {
  /** Cópias dos blocos já com a cor da família (e na ordem pedida). */
  readonly blocks: B[]
  readonly visibleTypes: ReadonlySet<string>
  readonly toolbox: ExtensionToolboxCategory
}

export function buildExtensionPalette<B extends PaletteBlock>(
  options: ExtensionPaletteOptions<B>,
): ExtensionPalette<B> {
  const { colour: base, tree, shadows = {} } = options
  const shades = categoryShades(base, tree.length)
  const familyColour = (index: number) => shades[index] ?? base
  const colourByType = new Map<string, string>(
    tree.flatMap((family, index) =>
      paletteTreeTypes([family]).map((type) => [type, familyColour(index)] as const),
    ),
  )
  const colourOf = (type: string) => colourByType.get(type)
  const coloured = options.blocks.map((block) => {
    const colour =
      colourByType.get(block.type) ?? options.fallbackColour?.(block.type, colourOf) ?? block.colour
    return { ...block, colour } as B
  })
  if (options.order !== 'source') {
    const orderByType = new Map([...colourByType.keys()].map((type, index) => [type, index]))
    const rank = (type: string) => orderByType.get(type) ?? Number.MAX_SAFE_INTEGER
    coloured.sort((a, b) => rank(a.type) - rank(b.type))
  }
  const visibleTypes = new Set(coloured.filter((block) => !block.hidden).map((b) => b.type))

  const toolboxBlocks = (types: readonly string[]) =>
    types
      .filter((type) => visibleTypes.has(type))
      .map((type) => {
        const inputs = shadows[type]
        return inputs ? { kind: 'block' as const, type, inputs } : { kind: 'block' as const, type }
      })

  const toolbox: ExtensionToolboxCategory = {
    kind: 'category',
    name: options.name,
    colour: base,
    contents: tree.map((family, index) => ({
      kind: 'category' as const,
      name: family.name,
      colour: familyColour(index),
      contents: isFlat(family)
        ? toolboxBlocks(family.sections[0]?.types ?? [])
        : family.sections.map((section) => ({
            kind: 'category' as const,
            name: section.name,
            colour: familyColour(index),
            contents: toolboxBlocks(section.types),
          })),
    })),
  }

  return { blocks: coloured, visibleTypes, toolbox }
}

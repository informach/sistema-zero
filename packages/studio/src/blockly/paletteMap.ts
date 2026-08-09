import type { ExtensionToolboxCategory } from '../extensions/types'
import { gameTwoDToolboxCategory } from '../official-extensions/game-2d/blocks'
import { gameKitToolboxCategory } from '../official-extensions/game-2d-advanced/blocks'
import { gameThreeDToolboxCategory } from '../official-extensions/game-3d/blocks'
import { gameKit3DToolboxCategory } from '../official-extensions/game-3d-advanced/blocks'
import { world3DToolboxCategory } from '../official-extensions/world-3d/blocks'
import { ADVANCED_BLOCKS } from './blocks/advanced'
import { CANVAS_BLOCKS, CANVAS_GROUPS } from './blocks/canvas'
import { CANVAS3D_BLOCKS, CANVAS3D_GROUPS } from './blocks/canvas3d'
import { CSS_BLOCKS, CSS_GROUPS } from './blocks/css'
import { DOM_BLOCKS } from './blocks/dom'
import { HTML_BLOCKS, HTML_GROUPS } from './blocks/html'
import { JS_BLOCKS, JS_GROUPS } from './blocks/js'
import { MATH_BLOCKS } from './blocks/math'
import { OBJECT_BLOCKS } from './blocks/objects'
import { SOM_BLOCKS, SOM_GROUPS } from './blocks/som'
import { SVG_BLOCKS, SVG_GROUPS } from './blocks/svg'
import type { BlockDefinition } from './blocks/types'
import { VALUE_BLOCKS } from './blocks/values'
import {
  isEventProgrammingDefinition,
  PROGRAMMING_CONDITION_VALUE_TYPES,
  PROGRAMMING_LIST_VALUE_TYPES,
} from './programmingContract'
import {
  CLASS_CATEGORY_DEFINITIONS,
  FUNCTION_CATEGORY_DEFINITIONS,
} from './programmingOfferability'
import { PROJECT_AREA_FRAME_TYPES } from './projectAreas'

/**
 * Onde cada bloco MORA na paleta que a criança vê — o caminho completo, não só a
 * categoria de topo.
 *
 * Existe porque o `category` do `blockCatalog` é a chave de CURADORIA do admin
 * (`allowCategories`), e ela não bate com a árvore visível: "Matemática",
 * "Valores", "Funções", "Objetos", "Classes" e "Página e Eventos" são categorias
 * no catálogo mas SUB-categorias de "Programação" na paleta. Mandar a criança
 * para "a categoria Matemática" a faz procurar um item que não existe no topo.
 *
 * ⚠️ Espelha a composição de `buildCoreToolbox` (`toolbox.ts`) DE PROPÓSITO, em
 * vez de chamá-la: aquele arquivo importa `./blocks`, que registra blocos no
 * registry GLOBAL do Blockly — e este módulo é lido pelo servidor (via
 * `SERVER_BLOCK_CATALOG`). O preço é a possibilidade de deriva, e o freio é o
 * teste de conformidade que anda a toolbox real e compara com este mapa.
 *
 * O caminho NÃO depende do nível da criança: o nível decide o que APARECE, nunca
 * onde o bloco mora.
 */
export type PalettePath = readonly string[]

const paths = new Map<string, PalettePath>()

/** Primeira atribuição vence — é a que a criança encontra descendo a paleta. */
function assign(type: string, path: PalettePath): void {
  if (!paths.has(type)) paths.set(type, path)
}

/** Bloco legado (`hidden`) segue registrado p/ abrir projeto antigo, mas some da paleta. */
const visible = (blocks: readonly BlockDefinition[]): BlockDefinition[] =>
  blocks.filter((block) => !block.hidden)

function assignAll(blocks: readonly BlockDefinition[], path: PalettePath): void {
  for (const block of visible(blocks)) assign(block.type, path)
}

/**
 * Categoria de topo dividida em sub-grupos, com o "Mais" para o que sobra.
 * `reserved` são os tipos que a paleta guarda para OUTRO grupo — sem isso eles
 * cairiam no "Mais" antes de a categoria de destino existir.
 */
function assignGrouped(
  category: string,
  blocks: readonly BlockDefinition[],
  groups: readonly { name: string; types: string[] }[],
  options: {
    extraByGroup?: (groupName: string) => readonly BlockDefinition[]
    reserved?: readonly string[]
  } = {},
): void {
  const list = visible(blocks)
  const byType = new Map(list.map((block) => [block.type, block]))
  const used = new Set<string>(options.reserved ?? [])
  for (const group of groups) {
    for (const type of group.types) {
      used.add(type)
      if (byType.has(type)) assign(type, [category, group.name])
    }
    for (const extra of visible(options.extraByGroup?.(group.name) ?? []))
      assign(extra.type, [category, group.name])
  }
  for (const block of list) if (!used.has(block.type)) assign(block.type, [category, 'Mais'])
}

// 🗂️ Áreas do projeto — sempre visíveis, fora do catálogo, mas a criança as vê.
for (const type of PROJECT_AREA_FRAME_TYPES) {
  assign(type, ['🗂️ Áreas do projeto'])
}

assignGrouped('HTML', HTML_BLOCKS, HTML_GROUPS)
assignGrouped('SVG', SVG_BLOCKS, SVG_GROUPS)
assignGrouped('CSS', CSS_BLOCKS, CSS_GROUPS)

// ── Programação: o guarda-chuva que junta linguagem, DOM, matemática e OOP ──
// A ordem abaixo é a mesma de `buildCoreToolbox`, e importa: blocos de valor de
// lista/condição moram nos grupos de lista/condição, não em 🔣 Valores.
assignGrouped('Programação', JS_BLOCKS, JS_GROUPS, {
  extraByGroup: (groupName) =>
    groupName === '📋 Listas'
      ? VALUE_BLOCKS.filter((block) => PROGRAMMING_LIST_VALUE_TYPES.has(block.type))
      : groupName === '❓ Lógica & Se'
        ? VALUE_BLOCKS.filter((block) => PROGRAMMING_CONDITION_VALUE_TYPES.has(block.type))
        : [],
  // `Object.assign` é linguagem, mas pedagogicamente pertence a 📦 Objetos — a
  // paleta o reserva para não reaparecer em "Mais".
  reserved: ['sz_js_object_assign'],
})
assignAll(MATH_BLOCKS, ['Programação', '🔢 Matemática'])
assignAll(
  VALUE_BLOCKS.filter(
    (block) =>
      !isEventProgrammingDefinition(block) &&
      !PROGRAMMING_LIST_VALUE_TYPES.has(block.type) &&
      !PROGRAMMING_CONDITION_VALUE_TYPES.has(block.type),
  ),
  ['Programação', '🔣 Valores'],
)
assignAll(
  DOM_BLOCKS.filter((block) => !isEventProgrammingDefinition(block)),
  ['Programação', '🌐 Página'],
)
// ⚡ Eventos recolhe os "Quando…" das TRÊS origens (DOM, JS e Valores).
assignAll([...DOM_BLOCKS, ...JS_BLOCKS, ...VALUE_BLOCKS].filter(isEventProgrammingDefinition), [
  'Programação',
  '⚡ Eventos',
])
// Flyouts dinâmicos: sem `contents` estático, o mesmo atalho que o indexador da
// busca usa. Em Funções vale o conjunto COMPLETO, não só o estático: o relator de
// parâmetro (`sz_val_arg`) só é gerado com uma função selecionada, mas a criança o
// vê ali dentro — e é onde ela deve procurar.
assignAll(FUNCTION_CATEGORY_DEFINITIONS, ['Programação', '🧩 Funções'])
assignAll(CLASS_CATEGORY_DEFINITIONS, ['Programação', '🏛️ Classes'])
assignAll(
  [...OBJECT_BLOCKS, ...JS_BLOCKS.filter((block) => block.type === 'sz_js_object_assign')],
  ['Programação', '📦 Objetos'],
)

assignGrouped('Canvas', CANVAS_BLOCKS, CANVAS_GROUPS)
assignGrouped('Som', SOM_BLOCKS, SOM_GROUPS)
assignGrouped('Canvas 3D', CANVAS3D_BLOCKS, CANVAS3D_GROUPS)
// "Avançado" é plana de verdade na paleta (3 blocos, sem sub-grupo).
assignAll(ADVANCED_BLOCKS, ['Avançado'])

/** Extensões já vêm com a árvore pronta (categoria → sub-categoria → blocos). */
function assignExtension(category: ExtensionToolboxCategory, trail: readonly string[]): void {
  const path = [...trail, category.name]
  for (const item of category.contents) {
    if (item.kind === 'block') assign(item.type, path)
    else assignExtension(item, path)
  }
}
for (const category of [
  gameTwoDToolboxCategory,
  gameKitToolboxCategory,
  gameThreeDToolboxCategory,
  gameKit3DToolboxCategory,
  world3DToolboxCategory,
]) {
  assignExtension(category, [])
}

export const PALETTE_PATH_BY_TYPE: ReadonlyMap<string, PalettePath> = paths

/** Caminho legível ("Programação › 🏷️ Variáveis"); vazio quando desconhecido. */
export function palettePathOf(type: string): PalettePath {
  return PALETTE_PATH_BY_TYPE.get(type) ?? []
}

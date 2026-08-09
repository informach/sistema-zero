import type { ExtensionToolboxCategory } from '../extensions/types'
import { gameTwoDBlocks, gameTwoDToolboxCategory } from '../official-extensions/game-2d/blocks'
import {
  gameKitBlocks,
  gameKitToolboxCategory,
} from '../official-extensions/game-2d-advanced/blocks'
import { gameThreeDBlocks, gameThreeDToolboxCategory } from '../official-extensions/game-3d/blocks'
import {
  gameKit3DBlocks,
  gameKit3DToolboxCategory,
} from '../official-extensions/game-3d-advanced/blocks'
import { world3DBlocks, world3DToolboxCategory } from '../official-extensions/world-3d/blocks'
import { inferBlockContract } from './blockContracts'
import { resolveBlockLevel } from './blockLevels'
import { ADVANCED_BLOCKS } from './blocks/advanced'
import { CANVAS_BLOCKS } from './blocks/canvas'
import { CANVAS3D_BLOCKS } from './blocks/canvas3d'
import { CSS_BLOCKS } from './blocks/css'
import { FRAME_BLOCKS } from './blocks/frames'
import { HTML_BLOCKS } from './blocks/html'
import { SOM_BLOCKS } from './blocks/som'
import { SVG_BLOCKS } from './blocks/svg'
import type { BlockDefinition, BlockPlacement } from './blocks/types'
import { palettePathOf } from './paletteMap'
import { PROGRAMMING_CATALOG_GROUPS } from './programmingContract'

// O subpath público `@sistemazero/studio/server-catalog` também expõe a ordem
// pedagógica necessária aos consumidores server-only, sem importar o editor React.
export { BLOCK_LEVELS } from '../core/levels'

/** Entrada do catálogo de blocos p/ o picker da "lista de blocos" da aula (admin). */
export interface BlockCatalogEntry {
  /** id do bloco — é o que entra na lista `allowBlocks` do bloco Estúdio. */
  type: string
  /** Rótulo legível em PT (derivado do texto do bloco). */
  label: string
  /** Categoria amigável — a que o aluno vê na paleta. */
  category: string
}

/** Forma mínima que o catálogo lê (core = `BlockDefinition`; extensões = arrays próprios). */
interface BlockLike {
  type: string
  message0?: string
  hidden?: boolean
}

export interface ServerBlockCatalogEntry extends BlockCatalogEntry {
  /** Subcategoria real; famílias sem segundo nível repetem a categoria. */
  subcategory: string
  /**
   * O caminho que a criança REALMENTE vê na paleta (ex.: `['Programação',
   * '🏷️ Variáveis']`). ⚠️ Não é derivável de `category` + `subcategory`: o
   * `category` é a chave de curadoria do admin (`allowCategories`) e trata
   * Matemática/Valores/Funções/Objetos/Classes/Página como categorias de topo,
   * quando na paleta elas são filhas de "Programação". É este campo que o Zappy
   * cita — mandar a criança para "a categoria Matemática" a faz procurar um item
   * que não existe no topo. Vazio quando o bloco não está em nenhuma paleta.
   */
  palettePath: readonly string[]
  extension: string | null
  level: import('#core').BlockLevel
  tooltip: string
  inputs: string[]
  placement: BlockPlacement | null
  /** Área pedagógica preenchida por contrato, nunca inferida pela IA. */
  area: 'structure' | 'appearance' | 'molds' | 'start' | 'events' | 'loops' | 'value'
}

/**
 * Rótulos AMIGÁVEIS p/ o picker em blocos cujo texto vive nos SOQUETES de valor: sem isto,
 * tirar os `%N` do `message0` deixa só um fragmento ("de", "Alterar para") e os pares
 * valor/comando ainda colidem. Aqui cada um ganha um rótulo claro e DISTINTO (o id do bloco
 * não muda — é só o que o admin LÊ na lista). Cobre os 4 pares achados na auditoria de rótulos.
 */
const LABEL_OVERRIDES: Record<string, string> = {
  // Programação — mensagens compostas em várias linhas ou formadas só por
  // soquetes não produzem um rótulo útil ao remover `%N`.
  sz_js_if_else: 'Condição se, senão se e senão',
  sz_js_try_catch: 'Tentar, tratar erro e finalizar',
  sz_js_object_assign: 'Copiar propriedades entre objetos',
  sz_val_number: 'Número',
  sz_val_bool: 'Verdadeiro ou falso',
  sz_val_compare: 'Comparar dois valores',
  sz_val_logic: 'Combinar condições',
  sz_math_arithmetic: 'Conta matemática',
  sz_canvas_anim_loop: 'A cada quadro da animação',
  sz_t3d_set_visible: 'Mostrar ou esconder objeto 3D',
  // SVG — o texto visual inclui coordenadas/atributos; o professor precisa ver
  // a intenção pedagógica, não uma lista como “id largura altura viewBox”.
  sz_html_svg: 'Criar uma área de desenho vetorial',
  sz_svg_title: 'Dar um nome acessível ao desenho',
  sz_svg_desc: 'Descrever o desenho para leitores de tela',
  sz_svg_defs: 'Guardar formas para reutilizar',
  sz_svg_symbol: 'Criar uma peça SVG reutilizável',
  sz_svg_group: 'Agrupar formas para transformar juntas',
  sz_svg_use: 'Reutilizar uma forma pelo nome',
  sz_svg_circle: 'Desenhar um círculo',
  sz_svg_ellipse: 'Desenhar uma elipse',
  sz_svg_rect: 'Desenhar um retângulo',
  sz_svg_line: 'Desenhar uma linha',
  sz_svg_polyline: 'Desenhar uma linha com vários pontos',
  sz_svg_polygon: 'Desenhar uma forma com vários pontos',
  sz_svg_path: 'Desenhar um caminho livre',
  sz_svg_text: 'Escrever no desenho',
  // CSS — mensagens visuais perdem os campos no catálogo; o professor precisa
  // enxergar a intenção completa, não fragmentos como apenas “:”.
  sz_css_rule: 'Regra de estilo para uma parte da página',
  sz_css_decl: 'Propriedade e valor de CSS',
  sz_css_var: 'Criar variável de estilo',
  sz_css_media_query: 'Adaptar o estilo ao tamanho da tela',
  sz_css_focus_visible: 'Destacar uma parte ao navegar pelo teclado',
  // Matemática — o `%1` é um dropdown de função; o `message0` é só "%1 de %2".
  sz_math_function: 'Função matemática (arredondar, raiz, absoluto…)',
  sz_math_trig: 'Trigonometria (seno, cosseno, tangente…)',
  // Página e Eventos — "Alterar … para …"; o que muda é o TIPO do valor escrito.
  sz_js_set_property_text: 'Alterar uma propriedade (escrever um texto)',
  sz_js_set_property_calc: 'Alterar uma propriedade (com um cálculo)',
  // Objetos — "de <obj> chamar método <nome>"; forma de valor vs. de comando.
  sz_val_method_on: 'Chamar método de um objeto (valor)',
  sz_js_method_on: 'Chamar método de um objeto (comando)',
  // Classes — "no objeto <nome> chamar método <nome>"; valor vs. comando.
  sz_val_call_method: 'No objeto, chamar um método (valor)',
  sz_js_call_method: 'No objeto, chamar um método (comando)',
  // Objetos — "%1 de %2" (o %1 é dropdown chaves/valores/pares).
  sz_val_object_op: 'Chaves, valores ou pares de um objeto',
  // Objetos — "item %1 de %2" (acesso por chave/índice).
  sz_val_index_get: 'Item de uma lista ou objeto (por índice/chave)',
  // Objetos — "definir item %1 de %2 como %3" (escrita por chave/índice).
  sz_js_index_set: 'Guardar um item numa lista ou objeto (por índice/chave)',
  // Imagem — "imagem %1" (o %1 é o seletor de imagem do projeto).
  sz_val_image: 'Imagem do projeto',
  // Imagem — "quando a imagem %1 carregar, fazer …".
  sz_js_image_onload: 'Quando a imagem terminar de carregar',
}

/** Texto do bloco sem os placeholders `%N` — vira o rótulo do picker. */
function labelOf(b: BlockLike): string {
  const override = LABEL_OVERRIDES[b.type]
  if (override) return override
  const raw = b.message0 ?? b.type
  const clean = raw
    .replace(/%\{[^}]*\}/g, '') // referências i18n (raras)
    .replace(/%%/g, '%') // percent literal escapado (Blockly)
    .replace(/%\d+/g, ' ') // placeholders de argumento (%1, %2…)
    .replace(/\s+/g, ' ')
    .trim()
  return clean || b.type
}

// Cada array de blocos sob o RÓTULO de categoria que o aluno vê (DOM = Página e Eventos;
// JS = Programação; extensões = Jogo 2D/3D). A ordem segue a da paleta.
const GROUPS: readonly (readonly [string, readonly BlockLike[]])[] = [
  // 🗂️ Áreas do projeto abrem a lista: a aula precisa poder escolher QUAIS áreas
  // a criança recebe, e sem elas no catálogo o professor montava uma lista de
  // blocos que não tinham onde ser encaixados.
  ['🗂️ Áreas do projeto', FRAME_BLOCKS],
  ['HTML', HTML_BLOCKS],
  ['SVG', SVG_BLOCKS],
  ['CSS', CSS_BLOCKS],
  ...PROGRAMMING_CATALOG_GROUPS.slice(0, 2).map(
    ({ category, definitions }) => [category, definitions] as const,
  ),
  ['Canvas', CANVAS_BLOCKS],
  ['Som', SOM_BLOCKS],
  ['Canvas 3D', CANVAS3D_BLOCKS],
  ...PROGRAMMING_CATALOG_GROUPS.slice(2).map(
    ({ category, definitions }) => [category, definitions] as const,
  ),
  ['Avançado', ADVANCED_BLOCKS],
  ['Jogo 2D', gameTwoDBlocks],
  ['Jogo 2D Avançado', gameKitBlocks],
  ['Jogo 3D', gameThreeDBlocks],
  ['Jogo 3D Avançado', gameKit3DBlocks],
  ['Mundo 3D', world3DBlocks],
]

/**
 * Catálogo dos blocos (id + rótulo + categoria) p/ o admin escolher a "lista de blocos" da
 * aula (`allowBlocks` restritivo). Inclui o CORE, as 🗂️ Áreas do projeto e todas as extensões
 * oficiais (p/ restringir blocos de jogo também). Blocos `hidden` (legados) ficam de fora.
 * ⚠️ Bloco de extensão só APARECE pro aluno se a extensão estiver instalada no projeto
 * inicial — o picker oferece, a instalação habilita.
 *
 * ⚠️ As áreas TAMBÉM entram sozinhas quando a paleta oferece algum bloco que mora nelas
 * (`buildCoreToolbox`), então listá-las é para o professor RESTRINGIR de propósito, não uma
 * obrigação: uma lista que só tem blocos de sprite já recebe ⚙️ Ao iniciar automaticamente.
 */
export const BLOCK_CATALOG: readonly BlockCatalogEntry[] = GROUPS.flatMap(([category, blocks]) =>
  blocks.filter((b) => !b.hidden).map((b) => ({ type: b.type, label: labelOf(b), category })),
)

function extensionFor(type: string): string | null {
  if (type.startsWith('sz_g2d_')) return 'game-2d'
  if (type.startsWith('sz_gk_')) return 'game-2d-advanced'
  if (type.startsWith('sz_g3d_')) return 'game-3d'
  if (type.startsWith('sz_g3k_')) return 'game-3d-advanced'
  if (type.startsWith('sz_w3d_')) return 'world-3d'
  return null
}

function collectToolboxSubcategories(
  category: ExtensionToolboxCategory,
  output: Map<string, string>,
): void {
  for (const item of category.contents) {
    if (item.kind === 'block') output.set(item.type, category.name)
    else collectToolboxSubcategories(item, output)
  }
}

const TOOLBOX_SUBCATEGORY_BY_TYPE = new Map<string, string>()
for (const category of [
  gameTwoDToolboxCategory,
  gameKitToolboxCategory,
  gameThreeDToolboxCategory,
  gameKit3DToolboxCategory,
  world3DToolboxCategory,
]) {
  collectToolboxSubcategories(category, TOOLBOX_SUBCATEGORY_BY_TYPE)
}

/** A Área do projeto que cada bloco-container REPRESENTA. */
const AREA_OF_FRAME: Readonly<Record<string, ServerBlockCatalogEntry['area']>> = {
  sz_frame_structure: 'structure',
  sz_frame_appearance: 'appearance',
  sz_frame_molds: 'molds',
  sz_frame_start: 'start',
  sz_frame_events: 'events',
  sz_frame_loops: 'loops',
}

function areaFor(definition: BlockDefinition): ServerBlockCatalogEntry['area'] {
  const contract = inferBlockContract(definition)
  // ⚠️ Um frame NÃO é "structure": ele É uma área, e dizer que ⚙️ Ao iniciar
  // pertence à estrutura faz o Zappy ensinar o lugar errado. O mapa acima é a
  // fonte; frame desconhecido cai no genérico em vez de mentir.
  if (contract.domain === 'frame') return AREA_OF_FRAME[definition.type] ?? 'start'
  if (contract.domain === 'html') return 'structure'
  if (contract.domain === 'css') return 'appearance'
  if (contract.domain === 'value') return 'value'
  // ⚠️ `root[0]` é a área CANÔNICA e pode ser 'molds' — o cast que existia aqui
  // prometia só start/events/loops e escondia isso do compilador.
  const canonical = contract.placement?.root[0]
  if (canonical) return canonical
  if (contract.placement?.role === 'event') return 'events'
  if (contract.placement?.role === 'loop') return 'loops'
  return 'start'
}

/**
 * Catálogo server-safe usado pelo Zappy. Este módulo importa somente definições
 * JSON/puras; não importa `blockly/core`, DOM, React, Monaco ou extensões em runtime.
 */
export const SERVER_BLOCK_CATALOG: readonly ServerBlockCatalogEntry[] = GROUPS.flatMap(
  ([category, blocks]) =>
    blocks
      .filter((block) => !block.hidden)
      .map((raw) => {
        const block = raw as BlockDefinition
        const contract = inferBlockContract(block)
        const args = [
          ...(block.args0 ?? []),
          ...(block.args1 ?? []),
          ...(block.args2 ?? []),
          ...(block.args3 ?? []),
          ...(block.args4 ?? []),
          ...(block.args5 ?? []),
        ]
        return {
          type: block.type,
          label: labelOf(block),
          category,
          subcategory: TOOLBOX_SUBCATEGORY_BY_TYPE.get(block.type) ?? category,
          palettePath: palettePathOf(block.type),
          extension: extensionFor(block.type),
          level: resolveBlockLevel(block.type),
          tooltip: typeof block.tooltip === 'string' ? block.tooltip : '',
          inputs: args.flatMap((arg) => {
            if (!arg || typeof arg !== 'object' || !('name' in arg)) return []
            return typeof arg.name === 'string' ? [arg.name] : []
          }),
          placement: contract.placement ?? null,
          area: areaFor(block),
        }
      }),
)

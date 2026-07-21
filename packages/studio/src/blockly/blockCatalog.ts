import { gameTwoDBlocks } from '../official-extensions/game-2d/blocks'
import { gameKitBlocks } from '../official-extensions/game-2d-advanced/blocks'
import { gameThreeDBlocks } from '../official-extensions/game-3d/blocks'
import { gameKit3DBlocks } from '../official-extensions/game-3d-advanced/blocks'
import { world3DBlocks } from '../official-extensions/world-3d/blocks'
import { ADVANCED_BLOCKS } from './blocks/advanced'
import { CANVAS_BLOCKS } from './blocks/canvas'
import { CANVAS3D_BLOCKS } from './blocks/canvas3d'
import { CSS_BLOCKS } from './blocks/css'
import { HTML_BLOCKS } from './blocks/html'
import { SVG_BLOCKS } from './blocks/svg'
import { PROGRAMMING_CATALOG_GROUPS } from './programmingContract'

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
  ['HTML', HTML_BLOCKS],
  ['SVG', SVG_BLOCKS],
  ['CSS', CSS_BLOCKS],
  ...PROGRAMMING_CATALOG_GROUPS.slice(0, 2).map(
    ({ category, definitions }) => [category, definitions] as const,
  ),
  ['Canvas', CANVAS_BLOCKS],
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
 * aula (`allowBlocks` restritivo). Inclui o CORE + todas as extensões oficiais (p/ restringir
 * blocos de jogo também). As 🗂️ Áreas do projeto (frames) ficam de FORA — são sempre
 * visíveis. Blocos `hidden` (legados) também. ⚠️ Bloco de extensão só APARECE pro aluno se a
 * extensão estiver instalada no projeto inicial — o picker oferece, a instalação habilita.
 */
export const BLOCK_CATALOG: readonly BlockCatalogEntry[] = GROUPS.flatMap(([category, blocks]) =>
  blocks.filter((b) => !b.hidden).map((b) => ({ type: b.type, label: labelOf(b), category })),
)

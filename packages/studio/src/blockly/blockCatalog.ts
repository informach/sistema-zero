import { gameTwoDBlocks } from '../official-extensions/game-2d/blocks'
import { gameThreeDBlocks } from '../official-extensions/game-3d/blocks'
import { ADVANCED_BLOCKS } from './blocks/advanced'
import { CANVAS_BLOCKS } from './blocks/canvas'
import { CSS_BLOCKS } from './blocks/css'
import { DOM_BLOCKS } from './blocks/dom'
import { FUNCTION_BLOCKS } from './blocks/functions'
import { HTML_BLOCKS } from './blocks/html'
import { JS_BLOCKS } from './blocks/js'
import { MATH_BLOCKS } from './blocks/math'
import { OBJECT_BLOCKS } from './blocks/objects'
import { OOP_BLOCKS } from './blocks/oop'
import { SVG_BLOCKS } from './blocks/svg'
import { VALUE_BLOCKS } from './blocks/values'

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

/** Texto do bloco sem os placeholders `%N` — vira o rótulo do picker. */
function labelOf(b: BlockLike): string {
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
const GROUPS: readonly [string, readonly BlockLike[]][] = [
  ['HTML', HTML_BLOCKS],
  ['SVG', SVG_BLOCKS],
  ['CSS', CSS_BLOCKS],
  ['Página e Eventos', DOM_BLOCKS],
  ['Programação', JS_BLOCKS],
  ['Canvas', CANVAS_BLOCKS],
  ['Valores', VALUE_BLOCKS],
  ['Matemática', MATH_BLOCKS],
  ['Funções', FUNCTION_BLOCKS],
  ['Objetos', OBJECT_BLOCKS],
  ['Classes', OOP_BLOCKS],
  ['Avançado', ADVANCED_BLOCKS],
  ['Jogo 2D', gameTwoDBlocks],
  ['Jogo 3D', gameThreeDBlocks],
]

/**
 * Catálogo dos blocos (id + rótulo + categoria) p/ o admin escolher a "lista de blocos" da
 * aula (`allowBlocks` restritivo). Inclui o CORE + as extensões Jogo 2D/3D (p/ restringir
 * blocos de jogo também). As 🗂️ Áreas do projeto (frames) ficam de FORA — são sempre
 * visíveis. Blocos `hidden` (legados) também. ⚠️ Bloco de extensão só APARECE pro aluno se a
 * extensão estiver instalada no projeto inicial — o picker oferece, a instalação habilita.
 */
export const BLOCK_CATALOG: readonly BlockCatalogEntry[] = GROUPS.flatMap(([category, blocks]) =>
  blocks.filter((b) => !b.hidden).map((b) => ({ type: b.type, label: labelOf(b), category })),
)

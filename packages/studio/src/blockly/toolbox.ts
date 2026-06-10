import {
  ADVANCED_BLOCKS,
  CANVAS_BLOCKS,
  CSS_BLOCKS,
  HTML_BLOCKS,
  JS_BLOCKS,
  MATH_BLOCKS,
  OBJECT_BLOCKS,
  VALUE_BLOCKS,
} from './blocks'
import type { BlockDefinition } from './blocks/types'
import { type SocketShadow, socketInputsFor } from './blocks/valueSockets'
import { CATEGORY_COLORS } from './theme'

/** Shadow anexado a um slot `input_value` (número editável ou seletor de cor). */
type ShadowInput = SocketShadow

export interface ToolboxBlockEntry {
  kind: 'block'
  type: string
  /** Sombras dos slots de valor, para o bloco já vir "preenchido" da paleta. */
  inputs?: Record<string, ShadowInput>
}

export interface ToolboxCategory {
  kind: 'category'
  name: string
  colour: string
  contents: ToolboxBlockEntry[]
}

/** Categoria especial do plugin @blockly/toolbox-search (filtro ao vivo). */
export interface ToolboxSearchCategory {
  kind: 'search'
  name: string
  colour: string
  contents: []
}

/** Categoria de flyout dinâmico (conteúdo gerado por callback registrado). */
export interface ToolboxCustomCategory {
  kind: 'category'
  name: string
  colour: string
  custom: string
}

export interface ToolboxConfiguration {
  kind: 'categoryToolbox'
  contents: (ToolboxCategory | ToolboxSearchCategory | ToolboxCustomCategory)[]
}

function toEntries(blocks: BlockDefinition[]): ToolboxBlockEntry[] {
  return blocks
    .filter((b) => !b.hidden)
    .map((b) => {
      const inputs = socketInputsFor(b.type)
      if (!inputs) return { kind: 'block', type: b.type } as const
      return { kind: 'block', type: b.type, inputs }
    })
}

export function buildCoreToolbox(extraCategories: ToolboxCategory[] = []): ToolboxConfiguration {
  return {
    kind: 'categoryToolbox',
    contents: [
      {
        kind: 'search',
        name: '🔎 Pesquisar',
        colour: CATEGORY_COLORS.search,
        contents: [],
      },
      {
        kind: 'category',
        name: 'HTML',
        colour: CATEGORY_COLORS.html,
        contents: toEntries(HTML_BLOCKS),
      },
      {
        kind: 'category',
        name: 'CSS',
        colour: CATEGORY_COLORS.css,
        contents: toEntries(CSS_BLOCKS),
      },
      {
        kind: 'category',
        name: 'JavaScript',
        colour: CATEGORY_COLORS.js,
        contents: toEntries(JS_BLOCKS),
      },
      {
        kind: 'category',
        name: 'Matemática',
        colour: CATEGORY_COLORS.math,
        contents: toEntries(MATH_BLOCKS),
      },
      {
        kind: 'category',
        name: 'Canvas',
        colour: CATEGORY_COLORS.canvas,
        contents: toEntries(CANVAS_BLOCKS),
      },
      {
        kind: 'category',
        name: 'Valores',
        colour: CATEGORY_COLORS.values,
        contents: toEntries(VALUE_BLOCKS),
      },
      {
        // Categoria dinâmica: blocos de função + relatores dos parâmetros da
        // função em edição (ver functionsFlyout).
        kind: 'category',
        name: 'Funções',
        colour: CATEGORY_COLORS.functions,
        custom: 'SZ_FUNCTIONS',
      },
      {
        // Categoria dinâmica: botão "Criar uma classe" + blocos + relatores dos
        // parâmetros do construtor/método atual (ver classesFlyout).
        kind: 'category',
        name: 'Classes',
        colour: CATEGORY_COLORS.classes,
        custom: 'SZ_CLASSES',
      },
      {
        kind: 'category',
        name: 'Objetos',
        colour: CATEGORY_COLORS.objects,
        contents: toEntries(OBJECT_BLOCKS),
      },
      ...extraCategories,
      {
        kind: 'category',
        name: 'Avançado',
        colour: CATEGORY_COLORS.advanced,
        contents: toEntries(ADVANCED_BLOCKS),
      },
    ],
  }
}

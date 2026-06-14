import {
  type BlockLevel,
  FULL_LEARNING_PROFILE,
  isBlockTypeAllowed,
  isCategoryAllowed,
  type LearningProfile,
} from '#core'
import {
  ADVANCED_BLOCKS,
  CANVAS_BLOCKS,
  CSS_BLOCKS,
  DOM_BLOCKS,
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

function toEntries(
  blocks: BlockDefinition[],
  categoryLevel: BlockLevel,
  profile: LearningProfile,
): ToolboxBlockEntry[] {
  return blocks
    .filter((b) => !b.hidden && isBlockTypeAllowed(b.type, b.level ?? categoryLevel, profile))
    .map((b) => {
      const inputs = socketInputsFor(b.type)
      if (!inputs) return { kind: 'block', type: b.type } as const
      return { kind: 'block', type: b.type, inputs }
    })
}

/** Nível default de cada categoria core (sobreposto pelo `level` de cada bloco). */
const CORE_CATEGORY_LEVELS: Record<string, BlockLevel> = {
  HTML: 'iniciante',
  CSS: 'iniciante',
  DOM: 'iniciante',
  JavaScript: 'iniciante',
  Matemática: 'iniciante',
  Canvas: 'intermediario',
  Valores: 'iniciante',
  Funções: 'intermediario',
  Classes: 'avancado',
  Objetos: 'intermediario',
  Avançado: 'avancado',
}

/**
 * Monta a toolbox core, filtrada pelo perfil de aprendizado. Sem perfil, mostra
 * tudo (default standalone/playground/testes). Categorias acima do nível somem;
 * dentro de uma categoria visível, blocos acima do nível também são omitidos;
 * categorias de conteúdo que ficam vazias são descartadas.
 */
export function buildCoreToolbox(
  extraCategories: ToolboxCategory[] = [],
  profile: LearningProfile = FULL_LEARNING_PROFILE,
): ToolboxConfiguration {
  const contents: ToolboxConfiguration['contents'] = [
    // Busca é sempre visível; ela só encontra os blocos que estão na toolbox
    // (já filtrada), então respeita o nível automaticamente.
    { kind: 'search', name: '🔎 Pesquisar', colour: CATEGORY_COLORS.search, contents: [] },
  ]

  const pushContent = (name: string, colour: string, blocks: BlockDefinition[]): void => {
    const level = CORE_CATEGORY_LEVELS[name] ?? 'iniciante'
    if (!isCategoryAllowed(name, level, profile)) return
    const entries = toEntries(blocks, level, profile)
    if (entries.length === 0) return
    contents.push({ kind: 'category', name, colour, contents: entries })
  }

  const pushCustom = (name: string, colour: string, custom: string): void => {
    const level = CORE_CATEGORY_LEVELS[name] ?? 'iniciante'
    if (!isCategoryAllowed(name, level, profile)) return
    contents.push({ kind: 'category', name, colour, custom })
  }

  pushContent('HTML', CATEGORY_COLORS.html, HTML_BLOCKS)
  pushContent('CSS', CATEGORY_COLORS.css, CSS_BLOCKS)
  // DOM (manipulação da página) entre CSS e JavaScript: HTML→CSS→DOM agrupa o
  // "pacote da página"; JavaScript fica com a linguagem (lógica) logo abaixo.
  pushContent('DOM', CATEGORY_COLORS.dom, DOM_BLOCKS)
  pushContent('JavaScript', CATEGORY_COLORS.js, JS_BLOCKS)
  pushContent('Matemática', CATEGORY_COLORS.math, MATH_BLOCKS)
  pushContent('Canvas', CATEGORY_COLORS.canvas, CANVAS_BLOCKS)
  pushContent('Valores', CATEGORY_COLORS.values, VALUE_BLOCKS)
  // Categorias dinâmicas: blocos de função/classe + relatores dos parâmetros
  // em edição (ver functionsFlyout/classesFlyout).
  pushCustom('Funções', CATEGORY_COLORS.functions, 'SZ_FUNCTIONS')
  pushCustom('Classes', CATEGORY_COLORS.classes, 'SZ_CLASSES')
  pushContent('Objetos', CATEGORY_COLORS.objects, OBJECT_BLOCKS)
  // Extensões: o caller já filtra por nível (minLevel) antes de passar.
  contents.push(...extraCategories)
  pushContent('Avançado', CATEGORY_COLORS.advanced, ADVANCED_BLOCKS)

  return { kind: 'categoryToolbox', contents }
}

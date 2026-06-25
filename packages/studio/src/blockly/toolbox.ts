import {
  type BlockLevel,
  CORE_CATEGORY_LEVELS,
  FULL_LEARNING_PROFILE,
  isBlockTypeAllowed,
  isCategoryAllowed,
  type LearningProfile,
} from '#core'
import {
  ADVANCED_BLOCKS,
  CANVAS_BLOCKS,
  CANVAS_GROUPS,
  CSS_BLOCKS,
  CSS_GROUPS,
  DOM_BLOCKS,
  HTML_BLOCKS,
  HTML_GROUPS,
  JS_BLOCKS,
  JS_GROUPS,
  MATH_BLOCKS,
  OBJECT_BLOCKS,
  SVG_BLOCKS,
  SVG_GROUPS,
  VALUE_BLOCKS,
} from './blocks'
import type { BlockDefinition } from './blocks/types'
import { type SocketShadow, socketInputsFor } from './blocks/valueSockets'
import { CATEGORY_COLORS } from './theme'

/** Shadow anexado a um slot `input_value` (número editável ou seletor de cor). */
type ShadowInput = SocketShadow

// Eventos (listeners "Quando…") vivem em DOM_BLOCKS mas, na toolbox, saem da
// subcategoria 🌐 Página e formam a 📡 ⚡ Eventos. Esta é a lista que define o
// que é "evento" (sai da Página).
const EVENT_LISTENER_TYPES: ReadonlySet<string> = new Set([
  'sz_js_on_click',
  'sz_js_on_click_anywhere',
  'sz_js_on_mouseover',
  'sz_js_on_input',
  'sz_js_on_submit',
  'sz_js_on_event_named',
  'sz_js_event_method',
  'sz_js_on_key',
  'sz_js_on_mousemove',
  'sz_js_on_pointer_down',
  'sz_js_on_pointer_up',
  'sz_js_on_load',
  'sz_js_on_resize',
  'sz_js_on_fullscreen_change',
])

// Ordem dos blocos DENTRO da subcategoria ⚡ Eventos (teclado → mouse/clique →
// formulário → janela → tempo → ligar-a-função). Reúne blocos de DOM, JS (timers)
// e Valores (leitores do evento); um mesmo bloco pode aparecer aqui E na sua
// categoria de origem (timers em 🔁 Repetições, leitores em 🔣 Valores).
const EVENTOS_TYPE_ORDER: readonly string[] = [
  // ⌨️ Teclado
  'sz_js_on_key',
  'sz_val_event_key',
  // 🖱️ Mouse / clique
  'sz_js_on_click',
  'sz_js_on_click_anywhere',
  'sz_js_on_mouseover',
  'sz_js_on_mousemove',
  'sz_js_on_pointer_down',
  'sz_js_on_pointer_up',
  'sz_val_event_pos',
  // 📝 Formulário
  'sz_js_on_input',
  'sz_js_on_submit',
  // 🪟 Página / janela
  'sz_js_on_load',
  'sz_js_on_resize',
  'sz_js_on_fullscreen_change',
  // ⏱️ Tempo
  'sz_js_set_timeout',
  'sz_js_set_interval',
  'sz_js_set_timeout_seconds',
  'sz_js_set_interval_seconds',
  // 🔧 Avançado: ligar a uma função nomeada + método do evento
  'sz_js_on_event_named',
  'sz_js_event_method',
]

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
  // Aceita blocos, sub-categorias aninhadas OU sub-categorias dinâmicas (custom,
  // ex.: Funções/Classes dentro de "Programação").
  contents: (ToolboxBlockEntry | ToolboxCategory | ToolboxCustomCategory)[]
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
    // 🗂️ Áreas do projeto: os 3 blocos-CONTAINER (frames). SEMPRE visíveis — a
    // criança precisa deles em qualquer aula —, então não passam pelo filtro de
    // nível/categoria. Cada frame carrega sua própria cor (HTML/CSS/JS).
    {
      kind: 'category',
      name: '🗂️ Áreas do projeto',
      colour: '#475569',
      contents: [
        { kind: 'block', type: 'sz_frame_structure' },
        { kind: 'block', type: 'sz_frame_appearance' },
        { kind: 'block', type: 'sz_frame_behavior' },
      ],
    },
  ]

  const pushContent = (name: string, colour: string, blocks: BlockDefinition[]): void => {
    const level = CORE_CATEGORY_LEVELS[name] ?? 'iniciante'
    if (!isCategoryAllowed(name, level, profile)) return
    const entries = toEntries(blocks, level, profile)
    if (entries.length === 0) return
    contents.push({ kind: 'category', name, colour, contents: entries })
  }

  /**
   * Igual ao pushContent, mas divide os blocos em SUB-CATEGORIAS coloridas com
   * ícone (estilo Scratch/MakeCode). Respeita o nível: sub-categoria sem nenhum
   * bloco visível é omitida; se a categoria inteira ficar vazia, ela some. Blocos
   * fora de qualquer grupo entram num "Mais" (nada se perde da paleta).
   */
  const pushGrouped = (
    name: string,
    colour: string,
    blocks: BlockDefinition[],
    groups: { name: string; colour: string; types: string[] }[],
  ): void => {
    const level = CORE_CATEGORY_LEVELS[name] ?? 'iniciante'
    if (!isCategoryAllowed(name, level, profile)) return
    const byType = new Map(blocks.map((b) => [b.type, b]))
    const used = new Set<string>()
    const subCats: ToolboxCategory[] = []
    for (const g of groups) {
      const groupBlocks = g.types
        .map((t) => {
          used.add(t)
          return byType.get(t)
        })
        .filter((b): b is BlockDefinition => Boolean(b))
      const entries = toEntries(groupBlocks, level, profile)
      if (entries.length === 0) continue
      subCats.push({ kind: 'category', name: g.name, colour: g.colour, contents: entries })
    }
    const leftover = toEntries(
      blocks.filter((b) => !used.has(b.type)),
      level,
      profile,
    )
    if (leftover.length > 0) {
      subCats.push({ kind: 'category', name: 'Mais', colour, contents: leftover })
    }
    if (subCats.length === 0) return
    contents.push({ kind: 'category', name, colour, contents: subCats })
  }

  pushGrouped('HTML', CATEGORY_COLORS.html, HTML_BLOCKS, HTML_GROUPS)
  pushGrouped('SVG', CATEGORY_COLORS.svg, SVG_BLOCKS, SVG_GROUPS)
  pushGrouped('CSS', CATEGORY_COLORS.css, CSS_BLOCKS, CSS_GROUPS)

  // ---- "Programação": guarda-chuva que junta a LÓGICA (JavaScript dividido em
  // sub-grupos), DOM, Matemática, Valores, Funções, Classes e Objetos em
  // sub-categorias coloridas. O Canvas fica DE FORA (categoria própria, abaixo). ----
  // Cada sub-categoria é gateada pelo NOME ORIGINAL da categoria (preserva o
  // allowCategories das aulas) e pelo seu nível; sub vazia some; se TODAS somem,
  // o guarda-chuva some.
  const progSubs: (ToolboxCategory | ToolboxCustomCategory)[] = []
  // 1) JavaScript dividido em grupos (nível-base iniciante; o nível por-bloco filtra).
  if (isCategoryAllowed('JavaScript', 'iniciante', profile)) {
    const jsByType = new Map(JS_BLOCKS.map((b) => [b.type, b]))
    const usedJs = new Set<string>()
    for (const g of JS_GROUPS) {
      const blocks = g.types
        .map((t) => {
          usedJs.add(t)
          return jsByType.get(t)
        })
        .filter((b): b is BlockDefinition => Boolean(b))
      const entries = toEntries(blocks, 'iniciante', profile)
      if (entries.length > 0)
        progSubs.push({ kind: 'category', name: g.name, colour: g.colour, contents: entries })
    }
    const leftover = toEntries(
      JS_BLOCKS.filter((b) => !usedJs.has(b.type)),
      'iniciante',
      profile,
    )
    if (leftover.length > 0)
      progSubs.push({
        kind: 'category',
        name: 'Mais',
        colour: CATEGORY_COLORS.js,
        contents: leftover,
      })
  }
  // 2) Demais categorias como sub-categorias (cor original mantida).
  const pushSub = (
    orig: string,
    name: string,
    colour: string,
    level: BlockLevel,
    blocks: BlockDefinition[],
  ): void => {
    if (!isCategoryAllowed(orig, level, profile)) return
    const entries = toEntries(blocks, level, profile)
    if (entries.length > 0) progSubs.push({ kind: 'category', name, colour, contents: entries })
  }
  const pushSubCustom = (
    orig: string,
    name: string,
    colour: string,
    level: BlockLevel,
    custom: string,
  ): void => {
    if (!isCategoryAllowed(orig, level, profile)) return
    progSubs.push({ kind: 'category', name, colour, custom })
  }
  pushSub('Matemática', '🔢 Matemática', CATEGORY_COLORS.math, 'iniciante', MATH_BLOCKS)
  pushSub('Valores', '🔣 Valores', CATEGORY_COLORS.values, 'iniciante', VALUE_BLOCKS)
  // Página: só os blocos de ELEMENTO (os "Quando…" saem para ⚡ Eventos).
  const paginaBlocks = DOM_BLOCKS.filter((b) => !EVENT_LISTENER_TYPES.has(b.type))
  pushSub('DOM', '🌐 Página', CATEGORY_COLORS.dom, 'iniciante', paginaBlocks)
  // ⚡ Eventos: listeners + leitores do evento + temporizadores, na ordem curada.
  // Gateada por 'DOM' (preserva o allowCategories das aulas). Resolve cada tipo a
  // partir das três origens; tipos inexistentes (ex.: nível) são ignorados.
  const eventosByType = new Map(
    [...DOM_BLOCKS, ...JS_BLOCKS, ...VALUE_BLOCKS].map((b) => [b.type, b] as const),
  )
  const eventosBlocks = EVENTOS_TYPE_ORDER.map((t) => eventosByType.get(t)).filter(
    (b): b is BlockDefinition => Boolean(b),
  )
  pushSub('DOM', '⚡ Eventos', CATEGORY_COLORS.events, 'iniciante', eventosBlocks)
  pushSubCustom('Funções', '🧩 Funções', CATEGORY_COLORS.functions, 'intermediario', 'SZ_FUNCTIONS')
  pushSubCustom('Classes', '🏛️ Classes', CATEGORY_COLORS.classes, 'avancado', 'SZ_CLASSES')
  pushSub('Objetos', '📦 Objetos', CATEGORY_COLORS.objects, 'intermediario', OBJECT_BLOCKS)
  if (progSubs.length > 0) {
    contents.push({
      kind: 'category',
      name: 'Programação',
      colour: CATEGORY_COLORS.js,
      contents: progSubs,
    })
  }

  // Canvas: categoria PRÓPRIA (fora da Programação) — desenho, será incrementada.
  pushGrouped('Canvas', CATEGORY_COLORS.canvas, CANVAS_BLOCKS, CANVAS_GROUPS)
  // Extensões: o caller já filtra por nível (minLevel) antes de passar.
  contents.push(...extraCategories)
  pushContent('Avançado', CATEGORY_COLORS.advanced, ADVANCED_BLOCKS)

  return { kind: 'categoryToolbox', contents }
}

import {
  type BlockLevel,
  CORE_CATEGORY_LEVELS,
  FULL_LEARNING_PROFILE,
  isBlockTypeAllowed,
  isCategoryAllowed,
  type LearningProfile,
} from '#core'
import {
  FRAME_APPEARANCE,
  FRAME_EVENTS,
  FRAME_LOOPS,
  FRAME_MOLDS,
  FRAME_START,
  FRAME_STRUCTURE,
  getBlockContract,
  inferBlockContract,
} from './blockContracts'
import { resolveBlockLevel } from './blockLevels'
import {
  ADVANCED_BLOCKS,
  CANVAS_BLOCKS,
  CANVAS_GROUPS,
  CANVAS3D_BLOCKS,
  CANVAS3D_GROUPS,
  CSS_BLOCKS,
  CSS_GROUPS,
  DOM_BLOCKS,
  HTML_BLOCKS,
  HTML_GROUPS,
  JS_BLOCKS,
  JS_GROUPS,
  MATH_BLOCKS,
  OBJECT_BLOCKS,
  SOM_BLOCKS,
  SOM_GROUPS,
  SVG_BLOCKS,
  SVG_GROUPS,
  VALUE_BLOCKS,
} from './blocks'
import type { BlockDefinition } from './blocks/types'
import { type SocketShadow, socketInputsFor } from './blocks/valueSockets'
import {
  isEventProgrammingDefinition,
  PROGRAMMING_CONDITION_VALUE_TYPES,
  PROGRAMMING_LIST_VALUE_TYPES,
} from './programmingContract'
import {
  CLASS_CATEGORY_DEFINITIONS,
  classesCategoryProvidesContextualParameters,
  FUNCTION_STATIC_DEFINITIONS,
  restrictedFunctionsCategoryHasContent,
} from './programmingOfferability'
import { CATEGORY_COLORS } from './theme'

/** Shadow anexado a um slot `input_value` (número editável ou seletor de cor). */
type ShadowInput = SocketShadow

// Ordem dos blocos DENTRO da subcategoria ⚡ Eventos (teclado → mouse/clique →
// formulário → janela → ligar-a-função). Reúne blocos de DOM e leitores do
// evento. Temporizadores ficam só em 🔁 Repetições para não duplicar conceitos.
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
  'sz_js_on_resize',
  'sz_js_on_fullscreen_change',
  'sz_js_on_context_menu',
  'sz_js_on_blur',
  'sz_js_element_onclick',
  // 🔧 Avançado: ligar a uma função nomeada + método do evento
  'sz_js_on_event_named',
  'sz_js_event_method',
]

const EVENTOS_ORDER_INDEX = new Map(EVENTOS_TYPE_ORDER.map((type, index) => [type, index]))

/**
 * A área/contexto declarados no contrato decidem o pertencimento à categoria.
 * `EVENTOS_TYPE_ORDER` apenas ordena os conhecidos; um evento novo nunca some
 * da paleta por faltar em uma segunda lista classificadora.
 */
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
  cssconfig?: { label?: string }
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
  cssconfig?: { label?: string }
  custom: string
}

export interface ToolboxConfiguration {
  kind: 'categoryToolbox'
  contents: (ToolboxCategory | ToolboxSearchCategory | ToolboxCustomCategory)[]
}

/**
 * Classes do rótulo das categorias de Programação (guarda-chuva + as filhas).
 *
 * ⚠️ O `cssconfig.label` do Blockly **SUBSTITUI** a classe padrão, não soma: o
 * `parseCategoryDef_` faz `Object.assign(cssConfig_, cssconfig)` por cima do
 * default `{ label: 'blocklyToolboxCategoryLabel' }`. Passando só a nossa, o
 * rótulo de "Programação" perdia a classe padrão — e com ela o negrito, o
 * tamanho, a fonte de display e os 6px de recuo (`studio.css`), ficando visivelmente
 * diferente e mais à esquerda que as categorias irmãs. O defeito só aparecia com
 * a categoria NÃO selecionada, porque no estado selecionado havia uma regra
 * duplicada cobrindo a classe custom — por isso passou batido quando entrou.
 *
 * Repetir a padrão aqui é seguro: o `addClass` do Blockly faz `split(' ')` e
 * aplica todas. A classe própria continua existindo como gancho do e2e de
 * contraste (`e2e/programming-accessibility.spec.ts`).
 */
const PROGRAMMING_LABEL_CLASSES = 'blocklyToolboxCategoryLabel sz-toolbox-programming-label'

function toEntries(
  blocks: BlockDefinition[],
  _categoryLevel: BlockLevel,
  profile: LearningProfile,
  onMold?: (definition: BlockDefinition) => void,
): ToolboxBlockEntry[] {
  return blocks
    .filter((b) => !b.hidden && isBlockTypeAllowed(b.type, resolveBlockLevel(b.type), profile))
    .map((b) => {
      onMold?.(b)
      const inputs = socketInputsFor(b.type)
      if (!inputs) return { kind: 'block', type: b.type } as const
      return { kind: 'block', type: b.type, inputs }
    })
}

/**
 * Filtra uma categoria de toolbox (extensão) deixando SÓ os blocos cujo `type` está em
 * `only` (modo restritivo da aula); sub-categorias que ficam vazias somem; flyout dinâmico
 * (`custom`) sai (não dá p/ filtrar conteúdo gerado). `null` se nada sobrou.
 */
function filterToolboxCategory(
  cat: ToolboxCategory,
  only: ReadonlySet<string>,
): ToolboxCategory | null {
  const contents: ToolboxCategory['contents'] = []
  for (const c of cat.contents) {
    if (c.kind === 'category') {
      if ('custom' in c) continue
      const sub = filterToolboxCategory(c, only)
      if (sub) contents.push(sub)
    } else if (only.has(c.type)) {
      contents.push(c)
    }
  }
  return contents.length > 0 ? { ...cat, contents } : null
}

/**
 * Filtra uma categoria de EXTENSÃO (Jogo 2D/3D) pelo NÍVEL por-bloco do perfil — deixa só
 * os blocos cujo `resolveBlockLevel` cabe no teto do aluno; sub-categoria vazia some; flyout
 * dinâmico (`custom`) sai. `null` se nada sobrou. É o análogo por-NÍVEL do `filterToolboxCategory`
 * (que é por LISTA da aula) — antes as extensões não filtravam por-bloco (só o `minLevel`
 * da extensão inteira gateava a categoria).
 */
function filterToolboxCategoryByLevel(
  cat: ToolboxCategory,
  profile: LearningProfile,
): ToolboxCategory | null {
  const contents: ToolboxCategory['contents'] = []
  for (const c of cat.contents) {
    if (c.kind === 'category') {
      if ('custom' in c) continue
      const sub = filterToolboxCategoryByLevel(c, profile)
      if (sub) contents.push(sub)
    } else if (isBlockTypeAllowed(c.type, resolveBlockLevel(c.type), profile)) {
      contents.push(c)
    }
  }
  return contents.length > 0 ? { ...cat, contents } : null
}

/**
 * Rede de segurança FINAL: remove categorias/sub-categorias que ficaram SEM nenhum bloco
 * (a curadoria por nível, a lista de blocos da aula e a poda de extensão já tentam — isto
 * GARANTE que nenhuma categoria/sub-categoria vazia apareça na paleta). Preserva 🔎 Pesquisar
 * (contents vazio DE PROPÓSITO) e os flyouts dinâmicos (`custom`, conteúdo gerado em runtime).
 */
function pruneEmptyCategories(contents: readonly unknown[]): unknown[] {
  const out: unknown[] = []
  for (const c of contents) {
    const node = c as { kind?: string; custom?: string; contents?: readonly unknown[] }
    // Busca e flyout dinâmico (custom) NUNCA são "categoria vazia" — seguem sempre.
    if (node.kind === 'search' || (node.kind === 'category' && node.custom !== undefined)) {
      out.push(c)
      continue
    }
    if (node.kind === 'category' && Array.isArray(node.contents)) {
      const pruned = pruneEmptyCategories(node.contents)
      if (pruned.length > 0) out.push({ ...node, contents: pruned })
      continue
    }
    out.push(c) // bloco (ou outro nó folha)
  }
  return out
}

/**
 * Monta a toolbox core, filtrada pelo perfil de aprendizado. Sem perfil, mostra
 * tudo (default standalone/playground/testes). Categorias acima do nível somem;
 * dentro de uma categoria visível, blocos acima do nível também são omitidos;
 * categorias de conteúdo que ficam vazias são descartadas.
 */
/**
 * A paleta montada oferece algum bloco que MORA em 🧩 Meus moldes?
 *
 * ⭐⭐ É assim que a área nova decide se aparece, e não por um degrau escolhido à
 * mão. Um número fixo abre o pior buraco possível: a criança vê "Carregar o som"
 * ou "Desenhar a figura assim:" na paleta, arrasta, e a área onde eles encaixam
 * não existe para ela. Medido na primeira versão deste arquivo: SETE blocos
 * ficavam órfãos, incluindo o som do núcleo, que é a porta de entrada.
 *
 * Derivando da paleta REAL, a área aparece exatamente quando existe algo para
 * pôr dentro dela, seja qual for a lista de moldes ou a curadoria da aula.
 *
 * ⚠️ Só decide a PALETA: uma área que já existe no projeto continua no canvas e
 * continua gerando, mesmo num degrau em que ela não seria oferecida.
 */
/** Bloco-container de cada Área do projeto, na ordem em que a criança os lê. */
const AREA_FRAMES = [
  { area: 'structure', frame: FRAME_STRUCTURE },
  { area: 'appearance', frame: FRAME_APPEARANCE },
  { area: 'molds', frame: FRAME_MOLDS },
  { area: 'start', frame: FRAME_START },
  { area: 'events', frame: FRAME_EVENTS },
  { area: 'loops', frame: FRAME_LOOPS },
] as const

type AreaKey = (typeof AREA_FRAMES)[number]['area']

/**
 * A Área do projeto a que este bloco PERTENCE, do ponto de vista da paleta.
 *
 * ⚠️ É a área CANÔNICA (`root[0]`), não todas em que ele cabe. Variável e função
 * cabem em 🧩 Meus moldes de propósito, e contá-las faria a área aparecer já no
 * primeiro degrau, onde não existe molde nenhum para pôr dentro. Mesma régua do
 * `areaForBlockType`, que decide para onde a migração move um bloco.
 */
function areaOfDefinition(definition: BlockDefinition): AreaKey | null {
  const contract = inferBlockContract(definition)
  if (contract.domain === 'html') return 'structure'
  if (contract.domain === 'css') return 'appearance'
  if (contract.domain === 'frame' || contract.domain === 'value') return null
  return (contract.placement?.root[0] as AreaKey | undefined) ?? null
}

/** Idem, para as categorias de EXTENSÃO, que chegam prontas (só com tipos). */
function areaOfType(type: string): AreaKey | null {
  const contract = getBlockContract(type)
  if (!contract) return null
  if (contract.domain === 'html') return 'structure'
  if (contract.domain === 'css') return 'appearance'
  if (contract.domain === 'frame' || contract.domain === 'value') return null
  return (contract.placement?.root[0] as AreaKey | undefined) ?? null
}

/** Há algum bloco (de qualquer área) nesta subárvore da paleta? */
function offersAnyBlock(contents: readonly unknown[] | undefined): boolean {
  return (contents ?? []).some((entry) => {
    const node = entry as { kind?: string; contents?: readonly unknown[]; custom?: string }
    if (node.kind === 'block') return true
    if (node.custom !== undefined) return true
    return offersAnyBlock(node.contents)
  })
}

function collectOfferedAreas(contents: readonly unknown[], into: Set<AreaKey>): void {
  for (const entry of contents) {
    const node = entry as { kind?: string; type?: string; contents?: readonly unknown[] }
    if (node.kind === 'block' && node.type) {
      const area = areaOfType(node.type)
      if (area) into.add(area)
    } else if (Array.isArray(node.contents)) {
      collectOfferedAreas(node.contents, into)
    }
  }
}

export function buildCoreToolbox(
  extraCategories: ToolboxCategory[] = [],
  profile: LearningProfile = FULL_LEARNING_PROFILE,
): ToolboxConfiguration {
  const contents: ToolboxConfiguration['contents'] = [
    // Busca é sempre visível; ela só encontra os blocos que estão na toolbox
    // (já filtrada), então respeita o nível automaticamente.
    { kind: 'search', name: '🔎 Pesquisar', colour: CATEGORY_COLORS.search, contents: [] },
    // 🗂️ Áreas do projeto: os blocos-container. O CONTEÚDO é preenchido no fim
    // desta função — cada área entra somente quando a paleta montada oferece
    // algum bloco que mora nela. Cada frame carrega sua própria cor.
    { kind: 'category', name: '🗂️ Áreas do projeto', colour: '#475569', contents: [] },
  ]
  const projectAreas = contents[1] as ToolboxCategory
  // Áreas que os flyouts DINÂMICOS (Funções/Classes) oferecem: o conteúdo deles
  // não aparece no `contents` e escaparia da varredura.
  const dynamicAreas = new Set<AreaKey>()
  const markArea = (definition: BlockDefinition) => {
    const area = areaOfDefinition(definition)
    if (area) dynamicAreas.add(area)
  }

  // Lista de blocos da aula (`allowBlocks` não-vazia) = modo RESTRITIVO: só os listados
  // entram na paleta (os frames seguem sempre). Decidido aqui p/ alcançar TAMBÉM os flyouts
  // dinâmicos (Funções/Classes) e as categorias de EXTENSÃO; o resto restringe via toEntries.
  const restrict = (profile.allowBlocks?.length ?? 0) > 0
  const only = new Set(profile.allowBlocks ?? [])

  const pushContent = (name: string, colour: string, blocks: BlockDefinition[]): void => {
    const level = CORE_CATEGORY_LEVELS[name] ?? 'iniciante-2d'
    if (!isCategoryAllowed(name, level, profile)) return
    const entries = toEntries(blocks, level, profile, markArea)
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
    const level = CORE_CATEGORY_LEVELS[name] ?? 'iniciante-2d'
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
      const entries = toEntries(groupBlocks, level, profile, markArea)
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
  if (isCategoryAllowed('JavaScript', 'iniciante-2d', profile)) {
    const jsByType = new Map(JS_BLOCKS.map((b) => [b.type, b]))
    // Object.assign é linguagem JS, mas pedagogicamente pertence à caixa de
    // Objetos. Reservá-lo aqui evita que reapareça no grupo "Mais".
    const usedJs = new Set<string>(['sz_js_object_assign'])
    for (const g of JS_GROUPS) {
      const languageBlocks = g.types
        .map((t) => {
          usedJs.add(t)
          return jsByType.get(t)
        })
        .filter((b): b is BlockDefinition => Boolean(b))
      const relatedValues =
        g.name === '📋 Listas'
          ? VALUE_BLOCKS.filter((definition) => PROGRAMMING_LIST_VALUE_TYPES.has(definition.type))
          : g.name === '❓ Lógica & Se'
            ? VALUE_BLOCKS.filter((definition) =>
                PROGRAMMING_CONDITION_VALUE_TYPES.has(definition.type),
              )
            : []
      const blocks = [...languageBlocks, ...relatedValues]
      const entries = toEntries(blocks, 'iniciante-2d', profile, markArea)
      if (entries.length > 0)
        progSubs.push({ kind: 'category', name: g.name, colour: g.colour, contents: entries })
    }
    const leftover = toEntries(
      JS_BLOCKS.filter((b) => !usedJs.has(b.type)),
      'iniciante-2d',
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
    const entries = toEntries(blocks, level, profile, markArea)
    if (entries.length > 0) progSubs.push({ kind: 'category', name, colour, contents: entries })
  }
  const pushSubCustom = (
    orig: string,
    name: string,
    colour: string,
    level: BlockLevel,
    custom: string,
    blocks: BlockDefinition[],
    restrictedContentAvailable = blocks.some((block) => only.has(block.type)),
  ): void => {
    const contextualFunctions =
      orig === 'Funções' && classesCategoryProvidesContextualParameters(profile)
    if (!isCategoryAllowed(orig, level, profile) && !contextualFunctions) return
    // Restrição: o flyout dinâmico (Funções/Classes) só entra se a aula listou ALGUM
    // bloco dele — senão vazaria (não dá p/ filtrar o conteúdo gerado pelo callback).
    if (restrict && !restrictedContentAvailable) return
    // ⚠️ O flyout dinâmico não tem `contents` para varrer, então quem procura
    // blocos na paleta montada NÃO enxerga o que ele vai oferecer. A classe mora
    // aqui, e sem este registro a área 🧩 Meus moldes não apareceria num projeto
    // que só usa classes.
    for (const block of blocks) markArea(block)
    progSubs.push({ kind: 'category', name, colour, custom })
  }
  pushSub('Matemática', '🔢 Matemática', CATEGORY_COLORS.math, 'intermediario-2d', MATH_BLOCKS)
  const valueBlocks = VALUE_BLOCKS.filter((block) => !isEventProgrammingDefinition(block))
  pushSub(
    'Valores',
    '🔣 Valores',
    CATEGORY_COLORS.values,
    'iniciante-2d',
    valueBlocks.filter(
      (block) =>
        !PROGRAMMING_LIST_VALUE_TYPES.has(block.type) &&
        !PROGRAMMING_CONDITION_VALUE_TYPES.has(block.type),
    ),
  )
  // Página: só os blocos de ELEMENTO (os "Quando…" saem para ⚡ Eventos).
  const paginaBlocks = DOM_BLOCKS.filter((block) => !isEventProgrammingDefinition(block))
  pushSub('DOM', '🌐 Página', CATEGORY_COLORS.dom, 'iniciante-2d', paginaBlocks)
  // ⚡ Eventos: listeners + leitores do evento, na ordem curada.
  // Gateada por 'DOM' (preserva o allowCategories das aulas). Resolve cada tipo a
  // partir das três origens; tipos inexistentes (ex.: nível) são ignorados.
  const eventosByType = new Map(
    [...DOM_BLOCKS, ...JS_BLOCKS, ...VALUE_BLOCKS].map((b) => [b.type, b] as const),
  )
  const eventosBlocks = [...eventosByType.values()]
    .filter(isEventProgrammingDefinition)
    .sort(
      (a, b) =>
        (EVENTOS_ORDER_INDEX.get(a.type) ?? Number.MAX_SAFE_INTEGER) -
        (EVENTOS_ORDER_INDEX.get(b.type) ?? Number.MAX_SAFE_INTEGER),
    )
  pushSub('DOM', '⚡ Eventos', CATEGORY_COLORS.events, 'iniciante-2d', eventosBlocks)
  pushSubCustom(
    'Funções',
    '🧩 Funções',
    CATEGORY_COLORS.functions,
    'intermediario-2d',
    'SZ_FUNCTIONS',
    [...FUNCTION_STATIC_DEFINITIONS],
    restrictedFunctionsCategoryHasContent(only),
  )
  pushSubCustom('Classes', '🏛️ Classes', CATEGORY_COLORS.classes, 'avancado-2d', 'SZ_CLASSES', [
    ...CLASS_CATEGORY_DEFINITIONS,
  ])
  pushSub('Objetos', '📦 Objetos', CATEGORY_COLORS.objects, 'avancado-2d', [
    ...OBJECT_BLOCKS,
    ...JS_BLOCKS.filter((b) => b.type === 'sz_js_object_assign'),
  ])
  if (progSubs.length > 0) {
    for (const category of progSubs) {
      category.cssconfig = { label: PROGRAMMING_LABEL_CLASSES }
    }
    contents.push({
      kind: 'category',
      name: 'Programação',
      colour: CATEGORY_COLORS.js,
      cssconfig: { label: PROGRAMMING_LABEL_CLASSES },
      contents: progSubs,
    })
  }

  // Canvas: categoria PRÓPRIA (fora da Programação) — desenho, será incrementada.
  pushGrouped('Canvas', CATEGORY_COLORS.canvas, CANVAS_BLOCKS, CANVAS_GROUPS)
  // Som: tocar os arquivos de audio do projeto, sem depender de extensao.
  pushGrouped('Som', CATEGORY_COLORS.som, SOM_BLOCKS, SOM_GROUPS)
  // Canvas 3D inteiro é avançado-3d ("na unha por último", 26/07). A categoria
  // aparece somente no topo, quando todos os blocos técnicos e visuais cabem.
  pushGrouped('Canvas 3D', CATEGORY_COLORS.canvas3d, CANVAS3D_BLOCKS, CANVAS3D_GROUPS)
  // Extensões: em modo restritivo (lista de blocos), filtra cada categoria p/ só os blocos
  // LISTADOS; senão filtra por NÍVEL por-bloco (o caller já gateou a categoria por `minLevel`,
  // mas dentro dela cada bloco respeita o próprio nível). Sub-categoria vazia some nos dois.
  for (const cat of extraCategories) {
    const filtered = restrict
      ? filterToolboxCategory(cat, only)
      : filterToolboxCategoryByLevel(cat, profile)
    if (filtered) contents.push(filtered)
  }
  pushContent('Avançado', CATEGORY_COLORS.advanced, ADVANCED_BLOCKS)

  // ⭐⭐ CADA Área do projeto entra somente quando a paleta já montada oferece
  // algum bloco que mora nela — inclusive vindo de uma extensão ou de um flyout
  // dinâmico. Decidido aqui, no fim, para enxergar tudo que sobreviveu ao filtro
  // de nível e à lista de blocos da aula.
  //
  // ⚠️ Antes, as áreas eram FIXAS e ficavam fora de toda curadoria. O sintoma era
  // silencioso e feio: uma aula de primeiros passos, sem HTML nem CSS liberados,
  // mostrava 🧱 Estrutura e 🎨 Aparência na paleta, e a criança arrastava áreas
  // que não tinham um único bloco para receber. A regra passa a ser a mesma para
  // as seis: área é ferramenta de guardar bloco, e sem bloco não há o que guardar.
  const offeredAreas = new Set<AreaKey>(dynamicAreas)
  collectOfferedAreas(contents, offeredAreas)

  // ⭐⭐ A lista da aula MANDA: área marcada no picker entra mesmo que nenhum
  // bloco dela tenha sobrado. Sem isto, o professor marca 🧩 Meus moldes no
  // admin e a área simplesmente não aparece — o picker vira um botão morto, que
  // é o oposto do motivo de as áreas terem entrado no catálogo.
  if (restrict) {
    for (const { area, frame } of AREA_FRAMES) {
      if (only.has(frame)) offeredAreas.add(area)
    }
  }

  // ⚠️ Rede: uma paleta com blocos e NENHUMA área deixaria a criança sem lugar
  // para encaixar o que ela vê (acontece com uma lista só de valores, que não
  // pertencem a área nenhuma). Todo programa começa em ⚙️ Ao iniciar, então é
  // ela que garante o piso.
  const paletteHasBlocks = contents.some((c) => {
    const node = c as { kind?: string; contents?: readonly unknown[]; custom?: string }
    return node.kind === 'category' && (node.custom !== undefined || offersAnyBlock(node.contents))
  })
  if (offeredAreas.size === 0 && paletteHasBlocks) offeredAreas.add('start')

  for (const { area, frame } of AREA_FRAMES) {
    if (offeredAreas.has(area)) projectAreas.contents.push({ kind: 'block', type: frame })
  }

  // Poda final: categoria/sub-categoria sem nenhum bloco some (garante o pedido — sem
  // categorias/sub-categorias vazias na paleta da aula).
  return {
    kind: 'categoryToolbox',
    contents: pruneEmptyCategories(contents) as ToolboxConfiguration['contents'],
  }
}

import * as Blockly from 'blockly/core'
import { FULL_LEARNING_PROFILE, isBlockTypeAllowed, type LearningProfile } from '#core'
import { resolveBlockLevel } from './blockLevels'
import { getParamNames } from './blocks/paramsMutator'
import { socketInputsFor } from './blocks/valueSockets'
import { CLASS_CATEGORY_DEFINITIONS, FUNCTION_STATIC_DEFINITIONS } from './programmingOfferability'

/**
 * Conteúdo dinâmico da categoria "Classes". Junta, num só lugar:
 *  - os blocos de classe (classe, construtor, método, novo, propriedades, etc.);
 *  - os blocos-relator (`sz_val_arg`) dos parâmetros do construtor/método em que
 *    o aluno está trabalhando (escopo = bloco selecionado). Assim não precisa de
 *    uma categoria "Parâmetros" separada.
 */

export const CLASSES_FLYOUT_CALLBACK = 'SZ_CLASSES'
export const FUNCTIONS_FLYOUT_CALLBACK = 'SZ_FUNCTIONS'

type FlyoutItem =
  | { kind: 'label'; text: string }
  | { kind: 'block'; type: string; fields?: Record<string, string>; inputs?: unknown }

/** Blocos cujos parâmetros (via `sz_params_mutator`) dão escopo aos relatores. */
const PARAM_SCOPE_TYPES = new Set(['sz_js_class_method', 'sz_js_constructor', 'sz_js_function'])

/** Sobe pelos blocos-pai até achar a função/método/construtor que dá escopo aos parâmetros. */
function scopeParams(block: Blockly.Block): string[] | null {
  let cur: Blockly.Block | null = block
  while (cur) {
    if (PARAM_SCOPE_TYPES.has(cur.type)) {
      return getParamNames(cur)
    }
    cur = cur.getParent()
  }
  return null
}

// Cache de `allParams` por workspace, invalidado por uma versão que só avança em
// eventos que podem mudar parâmetros. Abrir a categoria Funções/Classes SEM um
// bloco selecionado caía no fallback `allParams`, que varria TODOS os blocos
// (O(N)) a cada abertura da paleta — perceptível em projetos grandes.
const paramsVersion = new WeakMap<Blockly.Workspace, number>()
const allParamsCache = new WeakMap<Blockly.Workspace, { version: number; params: string[] }>()
const versionTracked = new WeakSet<Blockly.Workspace>()

/**
 * Garante (uma vez por workspace) um listener barato que avança a versão dos
 * parâmetros em create/delete/change — os únicos eventos que mexem na lista de
 * parâmetros (o mutator de parâmetros emite BLOCK_CHANGE). O custo por evento é
 * um type-check + incremento de Map; muito menor que a varredura O(N) que evita.
 */
function ensureParamsVersionTracking(workspace: Blockly.Workspace): void {
  if (versionTracked.has(workspace)) return
  versionTracked.add(workspace)
  workspace.addChangeListener((event: Blockly.Events.Abstract) => {
    if (
      event.type === Blockly.Events.BLOCK_CREATE ||
      event.type === Blockly.Events.BLOCK_DELETE ||
      event.type === Blockly.Events.BLOCK_CHANGE
    ) {
      paramsVersion.set(workspace, (paramsVersion.get(workspace) ?? 0) + 1)
    }
  })
}

/** Todos os parâmetros distintos declarados no workspace (fallback sem escopo). */
function allParams(workspace: Blockly.Workspace): string[] {
  const version = paramsVersion.get(workspace) ?? 0
  const cached = allParamsCache.get(workspace)
  if (cached && cached.version === version) return cached.params
  const set = new Set<string>()
  for (const b of workspace.getAllBlocks(false)) {
    if (PARAM_SCOPE_TYPES.has(b.type)) {
      for (const p of getParamNames(b)) set.add(p)
    }
  }
  const params = [...set]
  allParamsCache.set(workspace, { version, params })
  return params
}

/** Entradas estáticas dos blocos de classe (com sombras nos slots de valor). */
function dynamicBlockAllowed(
  type: string,
  category: 'Funções' | 'Classes',
  profile: LearningProfile,
): boolean {
  if (profile.allowBlocks && profile.allowBlocks.length > 0) {
    return profile.allowBlocks.includes(type)
  }
  if (profile.allowCategories?.includes(category)) return true
  return isBlockTypeAllowed(type, resolveBlockLevel(type), profile)
}

function staticEntries(profile: LearningProfile): FlyoutItem[] {
  return CLASS_CATEGORY_DEFINITIONS.filter((b) =>
    dynamicBlockAllowed(b.type, 'Classes', profile),
  ).map((b) => {
    const inputs = socketInputsFor(b.type)
    if (!inputs) return { kind: 'block', type: b.type }
    return { kind: 'block', type: b.type, inputs }
  })
}

function classesFlyout(workspace: Blockly.WorkspaceSvg, profile: LearningProfile): FlyoutItem[] {
  const items: FlyoutItem[] = [...staticEntries(profile)]

  const selected = Blockly.common.getSelected()
  const selectedBlock = selected instanceof Blockly.BlockSvg ? selected : null
  let names = selectedBlock ? scopeParams(selectedBlock) : null
  if (!names || names.length === 0) names = allParams(workspace)

  if (names.length > 0 && dynamicBlockAllowed('sz_val_arg', 'Classes', profile)) {
    items.push({ kind: 'label', text: 'Parâmetros' })
    for (const name of names) {
      items.push({ kind: 'block', type: 'sz_val_arg', fields: { NAME: name } })
    }
  }
  return items
}

/** Registra o callback do flyout da categoria Classes num workspace. */
export function registerClassesFlyout(
  workspace: Blockly.WorkspaceSvg,
  profile: LearningProfile = FULL_LEARNING_PROFILE,
): void {
  ensureParamsVersionTracking(workspace)
  workspace.registerToolboxCategoryCallback(CLASSES_FLYOUT_CALLBACK, ((ws: Blockly.WorkspaceSvg) =>
    classesFlyout(ws, profile)) as unknown as (
    ws: Blockly.WorkspaceSvg,
  ) => Blockly.utils.toolbox.FlyoutItemInfo[])
}

/** Tipo de bloco como item de flyout, já com sombras dos slots de valor. */
function blockEntry(type: string): FlyoutItem {
  const inputs = socketInputsFor(type)
  return inputs ? { kind: 'block', type, inputs } : { kind: 'block', type }
}

/**
 * Conteúdo dinâmico da categoria "Funções": os blocos de função (declarar,
 * chamar como comando/valor) e `retornar`, mais os relatores (`sz_val_arg`) dos
 * parâmetros da função em edição (escopo = bloco selecionado; fallback = todos).
 */
function functionsFlyout(workspace: Blockly.WorkspaceSvg, profile: LearningProfile): FlyoutItem[] {
  const items: FlyoutItem[] = functionCategoryBlockTypes(profile).map(blockEntry)

  const selected = Blockly.common.getSelected()
  const selectedBlock = selected instanceof Blockly.BlockSvg ? selected : null
  let names = selectedBlock ? scopeParams(selectedBlock) : null
  if (!names || names.length === 0) names = allParams(workspace)

  if (names.length > 0 && dynamicBlockAllowed('sz_val_arg', 'Funções', profile)) {
    items.push({ kind: 'label', text: 'Parâmetros' })
    for (const name of names) {
      items.push({ kind: 'block', type: 'sz_val_arg', fields: { NAME: name } })
    }
  }
  return items
}

/**
 * Tipos de bloco que vivem SÓ nas categorias dinâmicas (Funções/Classes) — não
 * estão no `languageTree` estático e por isso a busca (`@blockly/toolbox-search`)
 * não os indexa sozinha. Exclui os relatores `sz_val_arg` (gerados por escopo) e
 * os blocos OOP legados (fora da paleta). Usado por `searchCategory.ts`.
 */
/** Tipos da categoria "Funções" (sem os ocultos), incl. os de retorno. */
export function functionCategoryBlockTypes(
  profile: LearningProfile = FULL_LEARNING_PROFILE,
): string[] {
  return [...FUNCTION_STATIC_DEFINITIONS.map((b) => b.type)].filter((type) =>
    dynamicBlockAllowed(type, 'Funções', profile),
  )
}

/** Tipos da categoria "Classes" (sem ocultos/legados/relatores). */
export function classCategoryBlockTypes(
  profile: LearningProfile = FULL_LEARNING_PROFILE,
): string[] {
  return CLASS_CATEGORY_DEFINITIONS.filter((b) =>
    dynamicBlockAllowed(b.type, 'Classes', profile),
  ).map((b) => b.type)
}

export function dynamicCategoryBlockTypes(): string[] {
  return [...functionCategoryBlockTypes(), ...classCategoryBlockTypes()]
}

/**
 * Tipos dinâmicos (Funções/Classes) que NÃO cabem no perfil e por isso devem
 * sumir da OFERTA da busca de blocos. A busca os indexa GLOBALMENTE (não estão no
 * languageTree estático já filtrado por nível), então sem este filtro um aluno em
 * perfil restrito acharia Funções/Classes digitando o nome — vazamento da oferta
 * que contradiz a divulgação progressiva do professor. Espelha EXATAMENTE o gate
 * da paleta: categoria, nível por bloco e listas restritivas da aula passam pelo
 * mesmo `dynamicBlockAllowed`, evitando diferenças entre busca e flyout.
 */
export function blockedDynamicSearchTypes(profile: LearningProfile): Set<string> {
  const all = dynamicCategoryBlockTypes()
  const allowed = new Set([
    ...functionCategoryBlockTypes(profile),
    ...classCategoryBlockTypes(profile),
  ])
  return new Set(all.filter((type) => !allowed.has(type)))
}

/** Registra o callback do flyout da categoria Funções num workspace. */
export function registerFunctionsFlyout(
  workspace: Blockly.WorkspaceSvg,
  profile: LearningProfile = FULL_LEARNING_PROFILE,
): void {
  ensureParamsVersionTracking(workspace)
  workspace.registerToolboxCategoryCallback(FUNCTIONS_FLYOUT_CALLBACK, ((
    ws: Blockly.WorkspaceSvg,
  ) => functionsFlyout(ws, profile)) as unknown as (
    ws: Blockly.WorkspaceSvg,
  ) => Blockly.utils.toolbox.FlyoutItemInfo[])
}

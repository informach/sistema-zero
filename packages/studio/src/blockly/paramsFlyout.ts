import * as Blockly from 'blockly/core'
import { FULL_LEARNING_PROFILE, isBlockTypeAllowed, type LearningProfile } from '#core'
import { resolveBlockLevel } from './blockLevels'
import { getParamNames } from './blocks/paramsMutator'
import { socketInputsFor } from './blocks/valueSockets'
import {
  CLASS_CATEGORY_DEFINITIONS,
  classesCategoryProvidesContextualParameters,
  FUNCTION_STATIC_DEFINITIONS,
  PROGRAMMING_PARAMETER_SCOPE_TYPES,
} from './programmingOfferability'

/**
 * Conteúdo dinâmico das categorias "Funções" e "Classes". Relatores de
 * parâmetro pertencem exclusivamente a Funções e só aparecem para o escopo
 * atualmente selecionado; nunca vazam nomes de outra função.
 */

export const CLASSES_FLYOUT_CALLBACK = 'SZ_CLASSES'
export const FUNCTIONS_FLYOUT_CALLBACK = 'SZ_FUNCTIONS'

type FlyoutItem =
  | { kind: 'label'; text: string }
  | { kind: 'block'; type: string; fields?: Record<string, string>; inputs?: unknown }

/** Blocos cujos parâmetros (via `sz_params_mutator`) dão escopo aos relatores. */
/** Sobe pelos blocos-pai até achar a função/método/construtor que dá escopo aos parâmetros. */
function scopeParams(block: Blockly.Block): string[] | null {
  let cur: Blockly.Block | null = block
  while (cur) {
    if (PROGRAMMING_PARAMETER_SCOPE_TYPES.has(cur.type)) {
      return getParamNames(cur)
    }
    cur = cur.getParent()
  }
  return null
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

export function classFlyoutItems(profile: LearningProfile): FlyoutItem[] {
  return staticEntries(profile)
}

/** Registra o callback do flyout da categoria Classes num workspace. */
export function registerClassesFlyout(
  workspace: Blockly.WorkspaceSvg,
  profile: LearningProfile = FULL_LEARNING_PROFILE,
): void {
  workspace.registerToolboxCategoryCallback(CLASSES_FLYOUT_CALLBACK, (() =>
    classFlyoutItems(profile)) as unknown as (
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
 * parâmetros da função em edição (escopo = bloco selecionado).
 */
export function functionFlyoutItemsForSelection(
  selectedBlock: Blockly.Block | null,
  profile: LearningProfile,
): FlyoutItem[] {
  const items: FlyoutItem[] = functionCategoryBlockTypes(profile).map(blockEntry)
  const selectedScope = selectedBlock ? scopeParams(selectedBlock) : null
  const names = selectedScope ?? []
  const contextualParametersAllowed =
    dynamicBlockAllowed('sz_val_arg', 'Funções', profile) ||
    classesCategoryProvidesContextualParameters(profile)

  if (names.length > 0 && contextualParametersAllowed) {
    items.push({ kind: 'label', text: 'Parâmetros' })
    for (const name of names) {
      items.push({ kind: 'block', type: 'sz_val_arg', fields: { NAME: name } })
    }
  } else if (items.length === 0 && contextualParametersAllowed) {
    items.push({
      kind: 'label',
      text:
        selectedScope === null
          ? 'Selecione um método ou construtor com parâmetros'
          : 'Adicione parâmetros ao método ou construtor selecionado',
    })
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
  workspace.registerToolboxCategoryCallback(FUNCTIONS_FLYOUT_CALLBACK, (() => {
    const selected = Blockly.common.getSelected()
    const selectedBlock = selected instanceof Blockly.BlockSvg ? selected : null
    return functionFlyoutItemsForSelection(selectedBlock, profile)
  }) as unknown as (ws: Blockly.WorkspaceSvg) => Blockly.utils.toolbox.FlyoutItemInfo[])
}

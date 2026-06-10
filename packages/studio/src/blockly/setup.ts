import { registerFieldColour } from '@blockly/field-colour'
// Plugin oficial que adiciona uma categoria "Buscar" à toolbox com filtro ao
// vivo dos blocos pelo texto (auto-registra a categoria `kind: 'search'`).
import '@blockly/toolbox-search'
import * as Blockly from 'blockly/core'
import * as PtBr from 'blockly/msg/pt-br'
import { registerCoreBlocks } from './blocks'
import { registerAnimLoopMutator } from './blocks/animLoopMutator'
import { registerArgsMutator } from './blocks/argsMutator'
import { registerArrayMutator } from './blocks/arrayMutator'
import { registerExtendsMutator } from './blocks/extendsMutator'
import { registerObjectMutator } from './blocks/objectMutator'
import { registerParamsMutator } from './blocks/paramsMutator'
import { registerFieldColourSZ } from './fields/FieldColourSZ'
import { organizeBlocks } from './organize'
import { registerPtSearchCategory } from './searchCategory'
import { szTheme } from './theme'

let initialized = false

/**
 * Registra o item "Organizar blocos" no menu de contexto do workspace —
 * arruma as pilhas HTML/CSS/JS em colunas que não se sobrepõem (ver
 * `organizeBlocks`). Idempotente: ignora se já registrado.
 */
function registerOrganizeContextMenu(): void {
  const registry = Blockly.ContextMenuRegistry.registry
  if (registry.getItem('sz_organize')) return
  registry.register({
    id: 'sz_organize',
    weight: 6,
    scopeType: Blockly.ContextMenuRegistry.ScopeType.WORKSPACE,
    displayText: () => 'Organizar blocos',
    preconditionFn: (scope) =>
      (scope.workspace?.getTopBlocks(false).length ?? 0) > 0 ? 'enabled' : 'disabled',
    callback: (scope) => organizeBlocks(scope.workspace),
  })
}

/** Garante que os blocos core e o tema do Sistema Zero estão registrados. */
export function ensureBlocklyInitialized(): void {
  if (initialized) return
  // Traduz a UI nativa do Blockly (menu de contexto: Desfazer, Refazer,
  // "Arrumar Blocos", Recolher/Expandir, Excluir, etc.) para PT-BR.
  Blockly.setLocale(PtBr as unknown as Record<string, string>)
  // Blockly 11 removeu FieldColour do core — registramos o plugin oficial
  // para que `field_colour` continue funcionando (usado por extensões) e
  // adicionamos `field_colour_sz` com paleta MakeCode + input HEX.
  registerFieldColour()
  registerFieldColourSZ()
  // Os mutators precisam estar registrados antes de qualquer instância dos
  // blocos que os usam ser criada (init aplica o mutator pelo nome).
  registerAnimLoopMutator()
  registerArgsMutator()
  registerArrayMutator()
  registerObjectMutator()
  registerParamsMutator()
  registerExtendsMutator()
  registerCoreBlocks()
  // Sobrescreve os textos em inglês da categoria de busca por PT-BR.
  registerPtSearchCategory()
  registerOrganizeContextMenu()
  initialized = true
}

export { Blockly, szTheme }

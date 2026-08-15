/**
 * API pública do @sistemazero/pinta — TUDO fora daqui é interno.
 *
 * Contrato com o host (community-kids):
 * 1. `setPintaStorageNamespace(viewerId)` ANTES de montar (isola a galeria por
 *    perfil no IndexedDB — mesmo contrato do studio).
 * 2. `<PintaApp adapter={...} />` — uncontrolled, navegação por estado.
 */
export { PintaApp } from './components/PintaApp'
export type { PintaProjectRef } from './core/project'
/**
 * Os presets moram AQUI, e não no admin, para a autoria e a tela da criança não drifarem: quem
 * escolhe "Só o essencial" no bloco e quem monta a caixa leem a mesma lista.
 */
export { PINTA_TOOL_PRESETS, type PintaToolPreset } from './core/toolCuration'
export type {
  PintaExportedAsset,
  PintaHostAdapter,
  PintaInitialIntent,
  PintaSendResult,
  PintaTaskSession,
} from './core/types'
export { setPintaStorageNamespace } from './state/persistence'

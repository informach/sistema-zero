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
export type {
  PintaExportedAsset,
  PintaHostAdapter,
  PintaInitialIntent,
  PintaSendResult,
} from './core/types'
export { setPintaStorageNamespace } from './state/persistence'

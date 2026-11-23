/**
 * API pública do @sistemazero/pinta — TUDO fora daqui é interno.
 *
 * Contrato com o host (community-kids):
 * 1. `setPintaStorageNamespace(viewerId)` ANTES de montar (isola a galeria por
 *    perfil no IndexedDB — mesmo contrato do studio).
 * 2. `<PintaApp adapter={...} />` — uncontrolled, navegação por estado.
 */

// Chrome do HOST na barra (07/09/2026): o kids embrulha o `<PintaApp>` neste Provider com
// o botão do menu lateral + o selo "Guardado na sua conta"; o Pinta desenha no idioma dele.
export { PintaHostChromeProvider, usePintaHostChrome } from './components/hostChrome'
export { PintaApp, type PintaCompletionControl } from './components/PintaApp'
export type { PintaProjectRef } from './core/project'
/**
 * Os presets moram AQUI, e não no admin, para a autoria e a tela da criança não drifarem: quem
 * escolhe "Só o essencial" no bloco e quem monta a caixa leem a mesma lista.
 */
export { PINTA_TOOL_PRESETS, type PintaToolPreset } from './core/toolCuration'
export type {
  PintaExportedAsset,
  PintaGuideRect,
  PintaHostAdapter,
  PintaHostChrome,
  PintaHostChromeAccount,
  PintaHostChromeBack,
  PintaHostChromeMenu,
  PintaHostChromeStatus,
  PintaInitialCanvas,
  PintaInitialIntent,
  PintaSendResult,
  PintaTaskSession,
} from './core/types'
export { holdPintaEditorLock, withClosedPintaEditors } from './state/causalEditorLocks'
export type { PintaEditorWriteContext } from './state/editorStore'
/** A janela focal de um cenário grande e a ligação dela com a fila causal da conta. */
export type { LocalRegionAuthorSession } from './state/localRegionAuthorSession'
export type { LocalRegionCausalBinding, LocalRegionCausalUnit } from './state/localRegionEditing'
/** A biblioteca do perfil também é usada pelo Molda através do host. */
export { createPaletteLibraryStore, type PaletteLibraryStore } from './state/paletteLibraryStore'
export {
  // "Guardado na sua conta" (18/08/2026): o host embrulha o armazenamento local num
  // espelho que sobe/desce cada desenho da nuvem — o mesmo `PintaPersistence` que
  // a galeria E o editor usam (`usePintaApp().persistence`).
  createPintaCausalPersistence,
  createPintaPersistence,
  // O host (a nuvem) NÃO grava por baixo de um desenho aberto no editor (ver o registro) e,
  // ao fechar, traz o que ficou pulado.
  isPintaAssetOpen,
  type PintaAssetOpenEvent,
  type PintaCausalLocalPort,
  type PintaPersistence,
  type PintaPersistenceEvent,
  type PintaReadIssue,
  setPintaStorageNamespace,
  subscribePintaAssetOpenState,
} from './state/persistence'
/** Os cartões da galeria focal: o espelho da conta repassa o índice do armazenamento. */
export type { RegionalGalleryCard, RegionGalleryIndex } from './state/regionGalleryIndex'

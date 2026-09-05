/**
 * `@sistemazero/molda`: a face React do pacote. O host monta `<MoldaApp>`
 * depois de `setMoldaStorageNamespace(perfil)`. A face pura (sem React) vive
 * em `@sistemazero/molda/assets`; a face de dados do Estúdio em
 * `@sistemazero/molda/studio-library`.
 */
export * from './assets/index'
export type { MoldaHostAdapter } from './components/appContext'
export type { MoldaAppProps } from './components/MoldaApp'
export { MoldaApp } from './components/MoldaApp'
export type { MoldaCopy } from './core/copy'
export { COPY } from './core/copy'
export type { MemoryPersistence } from './state/memoryPersistence'
export { createMemoryPersistence } from './state/memoryPersistence'
export type {
  CreateMoldaPersistenceOptions,
  MoldaPersistence,
  MoldaPersistenceEvent,
} from './state/persistence'
export {
  createMoldaPersistence,
  getDefaultMoldaPersistence,
  getMoldaStorageNamespace,
  isMoldaAssetOpen,
  isStorageBudgetError,
  MoldaStorageBudgetError,
  markMoldaAssetClosed,
  markMoldaAssetOpen,
  setMoldaStorageNamespace,
  subscribeMoldaAssetOpenState,
} from './state/persistence'

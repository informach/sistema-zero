// Superfície pública do @sistemazero/studio. Tudo que NÃO está aqui é
// detalhe interno e pode mudar sem aviso.
export type {
  ExtraFile,
  FileName,
  IDEMode,
  InstalledExtension,
  Project,
  ProjectFiles,
} from '#core'
export { createEmptyProject, IDE_MODES, MODE_LABELS } from '#core'
export { createLocalPersistenceAdapter } from './persistence/local'
export type { StudioPersistence, StudioPersistenceAdapter } from './persistence/types'
export type { ProjectSummary } from './state/persistence'
export type { StudioLimits } from './state/projectStore'
export type { StudioAIConfig, StudioFeatures } from './studio/config'
export { Studio } from './studio/Studio'
export type { StudioTheme } from './studio/theme'
export type { StudioHandle, StudioLocale, StudioProps } from './studio/types'

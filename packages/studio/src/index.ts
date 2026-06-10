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
export { Studio } from './studio/Studio'
export type { StudioTheme } from './studio/theme'
export type { StudioLocale, StudioProps } from './studio/types'

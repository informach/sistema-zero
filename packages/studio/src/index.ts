// Superfície pública do @sistemazero/studio. Tudo que NÃO está aqui é
// detalhe interno e pode mudar sem aviso.
export type { FileSystemTree } from '@webcontainer/api'
export type {
  BlockLevel,
  ExtraFile,
  FileName,
  IDEMode,
  InstalledExtension,
  ProDirNode,
  ProFileLanguage,
  ProFileNode,
  Project,
  ProjectFiles,
  ProjectKind,
  ProjectTree,
  ProNode,
  ProProjectMeta,
} from '#core'
export { createEmptyProject, IDE_MODES, MODE_LABELS, normalizeProPath } from '#core'
export {
  createProProject,
  listProTemplates,
  PRO_TEMPLATES,
  type ProTemplate,
} from './components/code/pro-templates'
export { createLocalPersistenceAdapter } from './persistence/local'
export type { StudioPersistence, StudioPersistenceAdapter } from './persistence/types'
export { ProjectList, type ProjectListProps } from './projects/ProjectList'
export type { ProjectSummary } from './state/persistence'
export type { StudioLimits } from './state/projectStore'
export type { StudioAIConfig, StudioFeatures } from './studio/config'
export { prefetchStudioModes } from './studio/prefetch'
export { Studio } from './studio/Studio'
export type { StudioTheme } from './studio/theme'
export type { StudioHandle, StudioLocale, StudioProps } from './studio/types'

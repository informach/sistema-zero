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
export {
  CORE_CATEGORY_OPTIONS,
  createEmptyProject,
  IDE_MODES,
  MODE_LABELS,
  normalizeProPath,
} from '#core'
export {
  createProProject,
  listProTemplates,
  PRO_TEMPLATES,
  type ProTemplate,
} from './components/code/pro-templates'
export {
  StudioProjectPlayer,
  type StudioProjectPlayerProps,
} from './components/preview/StudioProjectPlayer'
export {
  type CaptureCoverOptions,
  captureCoverFromProject,
} from './cover/coverCapture'
export { createLocalPersistenceAdapter } from './persistence/local'
export type { StudioPersistence, StudioPersistenceAdapter } from './persistence/types'
export { type RenderProjectOptions, renderProjectToPreviewDoc } from './preview/renderProject'
export { ProjectList, type ProjectListProps } from './projects/ProjectList'
export type { ProjectSummary } from './state/persistence'
export type { StudioLimits } from './state/projectStore'
export type {
  ActivityCheck,
  ActivityCheckBase,
  ActivityCheckKind,
  ActivityRunResult,
  BehaviorCheck,
  BehaviorRule,
  CheckResult,
  CheckVerifiedBy,
  CodeCheck,
  JsonValue,
  LessonActivity,
  StructureCheck,
  StructureRule,
  TestCaseCheck,
} from './studio/activity'
export type { StudioAIConfig, StudioFeatures } from './studio/config'
export { prefetchStudioModes } from './studio/prefetch'
/** @deprecated Use {@link StudioEditor} ou {@link StudioLesson}. */
export { Studio } from './studio/Studio'
export { StudioEditor } from './studio/StudioEditor'
export { StudioLesson } from './studio/StudioLesson'
export type {
  StudioShareAdapter,
  StudioShareGenerateInput,
  StudioSharePublishInput,
  StudioShareResult,
} from './studio/share'
export type { StudioTheme } from './studio/theme'
export type {
  StudioEditorProps,
  StudioHandle,
  StudioLessonProps,
  StudioLocale,
  StudioProps,
} from './studio/types'

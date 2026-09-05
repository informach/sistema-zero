// Superfície pública do @sistemazero/studio. Tudo que NÃO está aqui é
// detalhe interno e pode mudar sem aviso.
export type { FileSystemTree } from '@webcontainer/api'
export type {
  AnyBlockLevel,
  BlockLevel,
  ExtraFile,
  FileName,
  IDEMode,
  InstalledExtension,
  LegacyBlockLevel,
  ProDirNode,
  ProFileLanguage,
  ProFileNode,
  Project,
  ProjectFiles,
  ProjectKind,
  ProjectTree,
  ProNode,
  ProProjectMeta,
  StudioProBuildFileLimitError,
  StudioProBuildLimits,
} from '#core'
export {
  BLOCK_LEVEL_OPTIONS,
  BLOCK_LEVELS,
  CORE_CATEGORY_OPTIONS,
  createEmptyProject,
  IDE_MODES,
  MAX_BLOCK_LEVEL,
  MODE_LABELS,
  normalizeBlockLevel,
  normalizeProPath,
  STUDIO_PRO_BUILD_LIMITS,
  studioProBuildFileLimitError,
  studioProBuildRequestByteLength,
} from '#core'
export type {
  AIFreeFormRequest,
  AIProvider,
  AIRequestOptions,
  ProjectContext,
} from './ai/contracts'
export type { PersonalAsset, SavePersonalAssetResult } from './asset-library/personal'
export {
  BLOCK_CATALOG,
  type BlockCatalogEntry,
  SERVER_BLOCK_CATALOG,
  type ServerBlockCatalogEntry,
} from './blockly/blockCatalog'
export { ESSENTIAL_2D_ALLOW_BLOCKS, ESSENTIAL_2D_BLOCK_TYPES } from './career/blockProfiles'
export {
  createProProject,
  listProTemplates,
  PRO_TEMPLATES,
  type ProTemplate,
} from './components/code/pro-templates'
export {
  type StudioPlayerOriginAdapter,
  type StudioPlayerOriginRequest,
  StudioProjectPlayer,
  type StudioProjectPlayerProps,
} from './components/preview/StudioProjectPlayer'
/**
 * `true` quando o modo Código (pro/WebContainer) PODE rodar neste ambiente
 * (página cross-origin isolada — host com COOP/COEP). O host usa p/ gatear a
 * entrada no editor pro sem montar o runtime pesado. Ver docs/embedding.md.
 */
export { canBootWebContainer as canRunProMode } from './components/terminal/webContainerClient'
export {
  type CaptureCoverOptions,
  captureCoverFromProject,
} from './cover/coverCapture'
export { createLocalPersistenceAdapter } from './persistence/local'
export type { StudioPersistence, StudioPersistenceAdapter } from './persistence/types'
export type { PreviewSecurityProfile } from './preview/csp'
export {
  type RenderProjectOptions,
  renderProjectToPreviewDoc,
  renderProjectToPreviewDocAsync,
} from './preview/renderProject'
export {
  discardImportedProjectSnapshot,
  importProjectSnapshot,
  listProjectSummariesLightForCloud,
  loadProjectAssetsSnapshotForCloud,
  loadProjectSnapshotForCloud,
  loadProjectSummaryForCloud,
  restoreProjectFromCloud,
  validateCloudProjectSnapshot,
} from './projects/importSnapshot'
export { ProjectList, type ProjectListProps } from './projects/ProjectList'
export {
  buildTilemapGameProject,
  type TilemapGamePayload,
} from './projects/tilemapGame'
export {
  // "Guardado na sua conta": o host observa toda escrita/apagamento local (subir
  // para a nuvem) e relê o snapshot COMPLETO (com blocos) na hora de subir. A descida
  // nem copia nem restaura um projeto ABERTO (`isProjectOpenAnywhere`).
  isProjectOpenAnywhere,
  listProjectSummariesLight,
  loadProjectSummaryById,
  PROJECT_CHANGED_EVENT,
  type ProjectChangedDetail,
  type ProjectSummary,
  type StudioCloudMirror,
  setStudioCloudMirror,
} from './state/persistence'
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
export type {
  StudioMoldaCreationKind,
  StudioMoldaCreationSummary,
  StudioMoldaImportResult,
  StudioMoldaLibraryAdapter,
} from './studio/molda-library'
export type {
  StudioPintaDrawingSummary,
  StudioPintaImportResult,
  StudioPintaLibraryAdapter,
} from './studio/pinta-library'
export { prefetchStudioModes } from './studio/prefetch'
export type {
  StudioProRuntimeAdapter,
  StudioProRuntimeBuildInput,
  StudioProRuntimeBuildResult,
} from './studio/pro-runtime'
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
  StudioTutorAdapter,
  StudioTutorAskInput,
  StudioTutorAskResult,
  StudioTutorBlockReference,
  StudioTutorConfig,
  StudioTutorFeedbackInput,
  StudioTutorHistoryMessage,
  StudioTutorLessonReference,
  StudioTutorProjectContext,
  StudioTutorResponse,
  StudioTutorScope,
} from './studio/tutor'
export type {
  StudioEditorProps,
  StudioHandle,
  StudioLessonProps,
  StudioLocale,
  StudioProps,
  StudioTaskSession,
} from './studio/types'

import { getPersonalAssetsNamespace, setPersonalAssetsNamespace } from './asset-library/personal'
import { releaseDrawingSyncProfile } from './asset-library/personalSync'
import { setStorageNamespace } from './state/persistence'

/**
 * Namespeia TODO o armazenamento local do Studio por VIEWER (perfil kids ou
 * conta adulto): a persistência de projetos E a biblioteca pessoal ("Meus
 * desenhos", alimentada pelo Pinta). O host chama ANTES de usar a
 * ProjectList/editor; vazio = stores históricos compartilhados (a lição reseta
 * p/ '').
 */
export function setStudioStorageNamespace(namespace: string): void {
  const previous = getPersonalAssetsNamespace()
  const next = namespace.trim()
  if (previous !== next) releaseDrawingSyncProfile(previous)
  setStorageNamespace(namespace)
  setPersonalAssetsNamespace(namespace)
}

/**
 * API pública do @sistemazero/pensa (contrato Fase 0) — TUDO fora daqui é
 * interno. O CSS sai pelo subpath `@sistemazero/pensa/styles.css`.
 */
export { PensaApp } from './components/PensaApp'
export type {
  PensaArtifactView,
  PensaBuildEnv,
  PensaChatHandlers,
  PensaChatInput,
  PensaChecklistItemView,
  PensaCycleView,
  PensaHostAdapter,
  PensaMission,
  PensaProjectDetailView,
  PensaProjectKind,
  PensaProjectListView,
  PensaStage,
  PensaStageView,
  PensaTaskColumn,
  PensaTaskView,
  PensaTransport,
  PensaZState,
} from './core/types'
export { PensaApiError } from './core/types'

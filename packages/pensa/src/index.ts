// Chrome do HOST nos cabeçalhos (07/09/2026): o kids embrulha o `<PensaApp>` neste Provider
// com o botão do menu lateral; o Pensa desenha no idioma dele.
export { PensaHostChromeProvider, usePensaHostChrome } from './components/hostChrome'
export { PensaApp } from './components/PensaApp'
export type {
  PensaArtifactType,
  PensaArtifactView,
  PensaChatHandlers,
  PensaChatInput,
  PensaCycleView,
  PensaHostAdapter,
  PensaHostChrome,
  PensaHostChromeMenu,
  PensaMascotPose,
  PensaPintaTaskContext,
  PensaProjectDetailView,
  PensaProjectListView,
  PensaStage,
  PensaStageView,
  PensaStudioTaskContext,
  PensaTaskContext,
  PensaTaskDestination,
  PensaTaskGuide,
  PensaTaskHandoffView,
  PensaTaskOutputRef,
  PensaTaskStatus,
  PensaTaskView,
  PensaTransport,
  PensaZState,
} from './core/types'
export { PensaApiError } from './core/types'

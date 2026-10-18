import { isPythonProject, type PythonClassicProjectDocument } from '../../core/editableProject'
import type { ProjectStoreApi } from '../../state/projectStore'
import type { PythonAnalysisController } from '../language/controller'
import type { PythonParsedDocument } from '../language/types'
import { preparePythonVisualTransaction } from '../language/visualTransaction'
import type { PythonBlockCodec } from './contract'
import type { PythonBlockProjection } from './projection'
import { bindPythonVisualOrigins } from './provenance'
import {
  createPythonWorkspaceDraft,
  pendingPythonWorkspaceDraft,
  readPythonWorkspaceDraft,
  updatePythonWorkspaceDraft,
} from './workspaceDraft'
import { rebasePythonWorkspaceState } from './workspaceState'

/**
 * The workspace is staged synchronously before the first await. The old source
 * remains authoritative until CPython verifies a candidate and the guarded CAS
 * publishes it. Failure/cancellation before publication leaves the draft intact.
 * If a store subscriber retires the editor after publication, the old caller can
 * receive AbortError; that invalidates its UI delivery, not the committed source.
 */
export function commitPythonWorkspaceGesture(options: {
  store: ProjectStoreApi
  analysis: PythonAnalysisController
  document: PythonParsedDocument
  workspace: Record<string, unknown>
  rootIds: readonly string[]
  /** A captured validation error may be thrown here *after* the draft is safe. */
  projection: PythonBlockProjection | (() => PythonBlockProjection)
  codecs: readonly PythonBlockCodec[]
  /** Active file, editor generation and host curation must still match. */
  current(): boolean
}): Promise<PythonParsedDocument> {
  const { store, analysis } = options
  const document = structuredClone(options.document)
  const project = store.getState().project
  if (
    !project ||
    !isPythonProject(project) ||
    project.kind !== 'classic' ||
    project.id !== document.identity.projectId ||
    project.files[document.identity.path] !== document.source ||
    !options.current()
  )
    throw new Error('O código mudou. Atualize os blocos antes de aplicar esta edição.')
  if (store.getState().editingAccess !== 'author')
    throw new Error('Este projeto está em observação.')
  const previousDraft = pendingPythonWorkspaceDraft(project)
  if (previousDraft?.pending && previousDraft.path !== document.identity.path)
    throw new Error(
      `Conclua ou descarte primeiro as alterações dos blocos em ${previousDraft.path}.`,
    )
  const expectedId = project.id
  const expectedExtensions = project.installedExtensions
  const codecs = [...options.codecs]
  const draft = createPythonWorkspaceDraft(
    project,
    document.identity.path,
    options.workspace,
    options.rootIds,
  )
  const staged = store
    .getState()
    .applyPythonSourceFiles(
      project,
      project.files,
      updatePythonWorkspaceDraft(project, draft.path, draft),
    )
  if (staged) throw new Error(staged)
  const persistedProject = store.getState().project
  const persistedDraft = persistedProject?.blocksState
  // Store subscribers may synchronously stage another gesture during publication.
  // Claim only our pre-publication generation, never whichever draft is now current.
  if (
    !persistedProject ||
    !isPythonProject(persistedProject) ||
    readPythonWorkspaceDraft(persistedProject, draft.path)?.generation !== draft.generation
  )
    return Promise.reject(new DOMException('Edição substituída.', 'AbortError'))
  const projection = structuredClone(
    typeof options.projection === 'function' ? options.projection() : options.projection,
  )
  function currentProject(): PythonClassicProjectDocument | undefined {
    const current = store.getState().project
    if (
      store.getState().editingAccess !== 'author' ||
      !current ||
      !isPythonProject(current) ||
      current.kind !== 'classic' ||
      current.id !== expectedId ||
      current.files[document.identity.path] !== document.source ||
      current.blocksState !== persistedDraft ||
      current.installedExtensions !== expectedExtensions
    )
      return
    return current
  }
  return analysis
    .run({
      current: () => options.current() && !!currentProject(),
      execute: async (parser) => {
        const result = await preparePythonVisualTransaction({
          document,
          projection,
          codecs,
          nextIdentity: { ...document.identity, generation: document.identity.generation + 1 },
          current: () => {
            if (!options.current() || !currentProject())
              throw new DOMException('Edição substituída.', 'AbortError')
            return { identity: document.identity, source: document.source }
          },
          analysis: parser,
        })
        const settled = {
          ...draft,
          pending: false,
          baseSource: result.parsed.source,
          workspace: rebasePythonWorkspaceState(
            draft.workspace,
            bindPythonVisualOrigins(projection, result.parsed.tree!, codecs),
          ),
        }
        return { result, settled }
      },
      commit({ result, settled }) {
        // The controller has already checked host callbacks and its lease. Read
        // only local state until CAS: invoking host code here could retire it.
        const current = currentProject()
        if (!current) throw new Error('O código mudou. O rascunho dos blocos foi mantido.')
        const issue = store.getState().applyPythonSourceFiles(
          current,
          {
            ...current.files,
            [document.identity.path]: result.parsed.source,
          },
          updatePythonWorkspaceDraft(current, settled.path, settled),
        )
        if (issue) throw new Error(issue)
      },
    })
    .then(({ result }) => result.parsed)
}

import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import type { PythonClassicProjectDocument, PythonProjectDocument } from '../../core/pythonProject'
import { splitPythonWorkspace } from './workspaceParts'

/** A recoverable editing buffer. It is never an executable source of truth. */
export interface PythonWorkspaceDraft {
  kind: 'python-workspace-draft'
  version: 1
  path: string
  baseSource: string
  generation: string
  pending: boolean
  workspace: Record<string, unknown>
  rootIds: string[]
}
export interface PythonWorkspaceState {
  kind: 'python-workspace-collection'
  version: 2
  activePath: string
  drafts: PythonWorkspaceDraft[]
  /** Independent of source revisions and of an unfinished executable edit. */
  scratch: { path: string; workspace: Record<string, unknown> }[]
}

/** Explicit empty cache: unlike a quick-load null, this must replace older saved drafts. */
export function emptyPythonWorkspaceState(): PythonWorkspaceState {
  return {
    kind: 'python-workspace-collection',
    version: 2,
    activePath: '',
    drafts: [],
    scratch: [],
  }
}

const limits = { nodes: 160_000, textChars: 8_388_608, depth: 40_064 }
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

function decode(raw: unknown): PythonWorkspaceDraft | undefined {
  if (!record(raw)) return
  const rootIds = raw.rootIds
  if (
    raw.kind !== 'python-workspace-draft' ||
    raw.version !== 1 ||
    typeof raw.path !== 'string' ||
    typeof raw.baseSource !== 'string' ||
    raw.baseSource.length > 1_048_576 ||
    typeof raw.generation !== 'string' ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(raw.generation) ||
    typeof raw.pending !== 'boolean' ||
    !record(raw.workspace) ||
    !Array.isArray(rootIds) ||
    rootIds.length > 20_000 ||
    !rootIds.every((id): id is string => typeof id === 'string' && id.length <= 128) ||
    new Set(rootIds).size !== rootIds.length
  )
    return
  return {
    kind: raw.kind,
    version: raw.version,
    path: raw.path,
    baseSource: raw.baseSource,
    generation: raw.generation,
    pending: raw.pending,
    workspace: raw.workspace,
    rootIds,
  }
}

function decodeState(raw: unknown): PythonWorkspaceState | undefined {
  if (
    !record(raw) ||
    raw.kind !== 'python-workspace-collection' ||
    raw.version !== 2 ||
    typeof raw.activePath !== 'string' ||
    !Array.isArray(raw.drafts) ||
    raw.drafts.length > 1000 ||
    !Array.isArray(raw.scratch) ||
    raw.scratch.length > 1000
  )
    return
  const drafts: PythonWorkspaceDraft[] = []
  const paths = new Set<string>()
  for (const value of raw.drafts) {
    const draft = decode(value)
    if (!draft || paths.has(draft.path)) return
    paths.add(draft.path)
    drafts.push(draft)
  }
  const scratch: PythonWorkspaceState['scratch'] = []
  paths.clear()
  for (const value of raw.scratch) {
    if (
      !record(value) ||
      typeof value.path !== 'string' ||
      !record(value.workspace) ||
      paths.has(value.path)
    )
      return
    paths.add(value.path)
    scratch.push({ path: value.path, workspace: value.workspace })
  }
  return { kind: raw.kind, version: raw.version, activePath: raw.activePath, drafts, scratch }
}

export function createPythonWorkspaceDraft(
  project: PythonClassicProjectDocument,
  path: string,
  workspace: Record<string, unknown>,
  rootIds: readonly string[],
): PythonWorkspaceDraft {
  const source = project.files[path]
  if (source === undefined || !path.endsWith('.py'))
    throw new Error('Selecione um arquivo Python para editar os blocos.')
  const draft = decode(
    copyStudioProjectJson(
      {
        kind: 'python-workspace-draft',
        version: 1,
        path,
        baseSource: source,
        generation: crypto.randomUUID(),
        pending: true,
        workspace,
        rootIds: [...rootIds],
      },
      limits,
    ),
  )
  if (!draft) throw new Error('Não foi possível guardar as alterações dos blocos.')
  return draft
}

/** Capture both parts atomically at the live editor boundary. */
export function capturePythonWorkspace(
  project: PythonClassicProjectDocument,
  path: string,
  workspace: Record<string, unknown>,
  rootIds: readonly string[],
) {
  const { program, scratch } = splitPythonWorkspace(workspace)
  return { draft: createPythonWorkspaceDraft(project, path, program, rootIds), scratch }
}

/** Detached and globally bounded; Blockly still validates each workspace before recovery. */
function readDrafts(project: PythonProjectDocument): {
  drafts: PythonWorkspaceDraft[]
  scratch: PythonWorkspaceState['scratch']
  activePath?: string
} {
  if (
    project.kind !== 'classic' ||
    !record(project.blocksState) ||
    project.blocksState.kind !== 'python-workspace-collection'
  )
    return { drafts: [], scratch: [] }
  const state = decodeState(copyStudioProjectJson(project.blocksState, limits))
  if (!state) return { drafts: [], scratch: [] }
  const drafts = state.drafts.filter(
    (draft) => draft.path.endsWith('.py') && project.files[draft.path] === draft.baseSource,
  )
  return {
    drafts,
    scratch: state.scratch.filter(
      (entry) => entry.path.endsWith('.py') && project.files[entry.path] !== undefined,
    ),
    activePath: state.activePath,
  }
}

export function readPythonScratchWorkspace(project: PythonProjectDocument, path: string) {
  return readDrafts(project).scratch.find((entry) => entry.path === path)?.workspace
}

export function readPythonWorkspaceDraft(
  project: PythonProjectDocument,
  path?: string,
): PythonWorkspaceDraft | undefined {
  const state = readDrafts(project)
  return state.drafts.find((draft) => draft.path === (path ?? state.activePath))
}

export function pendingPythonWorkspaceDraft(project: PythonProjectDocument) {
  return readDrafts(project).drafts.find((draft) => draft.pending)
}

function pack(
  drafts: PythonWorkspaceDraft[],
  scratch: PythonWorkspaceState['scratch'],
  activePath?: string,
  knownEmpty = false,
): PythonWorkspaceState | null {
  if (!drafts.length && !scratch.length) return knownEmpty ? emptyPythonWorkspaceState() : null
  if (drafts.length > 1000 || scratch.length > 1000)
    throw new Error('Há arquivos demais com blocos salvos neste projeto.')
  const active =
    drafts.find((draft) => draft.path === activePath) ??
    scratch.find((entry) => entry.path === activePath) ??
    drafts[0] ??
    scratch[0]
  if (!active) throw new Error('A coleção de blocos precisa de um arquivo ativo.')
  const state: PythonWorkspaceState = {
    kind: 'python-workspace-collection',
    version: 2,
    activePath: active.path,
    drafts,
    scratch,
  }
  // A longer filename can exceed the global recovery budget.
  const detached = decodeState(copyStudioProjectJson(state, limits))
  if (!detached) throw new Error('Não foi possível guardar a coleção de blocos Python.')
  return detached
}

/** Discarding a source cache preserves scratch. Only an explicit scratch snapshot replaces it. */
export function updatePythonWorkspaceDraft(
  project: PythonClassicProjectDocument,
  path: string,
  draft?: PythonWorkspaceDraft,
  scratchWorkspace?: Record<string, unknown> | null,
): PythonWorkspaceState | null {
  if (draft && draft.path !== path) throw new Error('O rascunho pertence a outro arquivo Python.')
  const state = readDrafts(project)
  const drafts = state.drafts.filter((entry) => entry.path !== path)
  if (draft) drafts.push(draft)
  const scratch =
    scratchWorkspace === undefined
      ? state.scratch
      : state.scratch.filter((entry) => entry.path !== path)
  if (scratchWorkspace) scratch.push({ path, workspace: scratchWorkspace })
  return pack(drafts, scratch, draft ? path : state.activePath, true)
}

export function assertPythonVisualDraftSettled(project: PythonProjectDocument): void {
  if (pendingPythonWorkspaceDraft(project))
    throw new Error(
      'As alterações dos blocos ainda não foram aplicadas ao código. Conclua ou descarte esse rascunho antes de continuar.',
    )
}

/** Unrelated source/material edits and file moves must not erase an unfinished visual gesture. */
export function preservePythonWorkspaceDraft(
  project: PythonClassicProjectDocument,
  files: Record<string, string>,
  moved?: { from: string; to: string },
): PythonWorkspaceState | null {
  const state = readDrafts(project)
  const movedPath = (path: string) =>
    moved && (path === moved.from || path.startsWith(`${moved.from}/`))
      ? moved.to + path.slice(moved.from.length)
      : path
  const drafts = state.drafts.flatMap((draft) => {
    const path = movedPath(draft.path)
    return files[path] === draft.baseSource && path.endsWith('.py') ? [{ ...draft, path }] : []
  })
  const scratch = state.scratch.flatMap((entry) => {
    const path = movedPath(entry.path)
    return files[path] !== undefined && path.endsWith('.py') ? [{ ...entry, path }] : []
  })
  return pack(
    drafts,
    scratch,
    state.activePath && movedPath(state.activePath),
    project.blocksState != null,
  )
}

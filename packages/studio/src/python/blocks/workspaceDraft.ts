import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import type { PythonClassicProjectDocument, PythonProjectDocument } from '../../core/pythonProject'

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
  version: 1
  activePath: string
  drafts: PythonWorkspaceDraft[]
}

/** Explicit empty cache: unlike a quick-load null, this must replace older saved drafts. */
export function emptyPythonWorkspaceState(): PythonWorkspaceState {
  return { kind: 'python-workspace-collection', version: 1, activePath: '', drafts: [] }
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
    raw.version !== 1 ||
    typeof raw.activePath !== 'string' ||
    !Array.isArray(raw.drafts) ||
    raw.drafts.length > 1000
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
  return { kind: raw.kind, version: raw.version, activePath: raw.activePath, drafts }
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

/** Detached and globally bounded; Blockly still validates each workspace before recovery. */
function readDrafts(project: PythonProjectDocument): {
  drafts: PythonWorkspaceDraft[]
  activePath?: string
} {
  if (
    project.kind !== 'classic' ||
    !record(project.blocksState) ||
    project.blocksState.kind !== 'python-workspace-collection'
  )
    return { drafts: [] }
  const state = decodeState(copyStudioProjectJson(project.blocksState, limits))
  if (!state) return { drafts: [] }
  const drafts = state.drafts.filter(
    (draft) => draft.path.endsWith('.py') && project.files[draft.path] === draft.baseSource,
  )
  return {
    drafts,
    activePath: state.activePath,
  }
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
  activePath?: string,
  knownEmpty = false,
): PythonWorkspaceState | null {
  if (!drafts.length) return knownEmpty ? emptyPythonWorkspaceState() : null
  if (drafts.length > 1000) throw new Error('Há arquivos demais com blocos salvos neste projeto.')
  const active = drafts.find((draft) => draft.path === activePath) ?? drafts[0]
  if (!active) throw new Error('A coleção de blocos precisa de um arquivo ativo.')
  const state: PythonWorkspaceState = {
    kind: 'python-workspace-collection',
    version: 1,
    activePath: active.path,
    drafts,
  }
  // A longer filename can exceed the global recovery budget.
  const detached = decodeState(copyStudioProjectJson(state, limits))
  if (!detached) throw new Error('Não foi possível guardar a coleção de blocos Python.')
  return detached
}

/** Replace only one file's cache. Passing no draft discards only that file's cache. */
export function updatePythonWorkspaceDraft(
  project: PythonClassicProjectDocument,
  path: string,
  draft?: PythonWorkspaceDraft,
): PythonWorkspaceState | null {
  if (draft && draft.path !== path) throw new Error('O rascunho pertence a outro arquivo Python.')
  const state = readDrafts(project)
  const drafts = state.drafts.filter((entry) => entry.path !== path)
  if (draft) drafts.push(draft)
  return pack(drafts, draft ? path : state.activePath, true)
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
  return pack(drafts, state.activePath && movedPath(state.activePath), project.blocksState != null)
}

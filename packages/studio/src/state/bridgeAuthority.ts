import type { EditableStudioProject as Project } from '../core/editableProject'

/** Python drafts are recoverable per-file buffers, not stale JavaScript projections. */
export function hasStaleJavaScriptBridgeBlocks(
  project: Pick<Project, 'kind' | 'programmingLanguage' | 'bridgeCodeAhead'>,
): boolean {
  return (
    project.programmingLanguage !== 'python' &&
    project.kind !== 'pro' &&
    project.bridgeCodeAhead === true
  )
}

/**
 * Snapshot seguro para persistência/host quando o texto da Ponte ainda está à
 * frente do reverse-parse. IR e blocos são derivados antigos nesse intervalo e
 * não podem atravessar a fronteira junto do código novo.
 */
export function snapshotProjectWithCurrentAuthority(project: Project): Project {
  if (!hasStaleJavaScriptBridgeBlocks(project)) return project
  return { ...project, ir: null, blocksState: null }
}

import type { Project } from '#core'

/**
 * Snapshot seguro para persistência/host quando o texto da Ponte ainda está à
 * frente do reverse-parse. IR e blocos são derivados antigos nesse intervalo e
 * não podem atravessar a fronteira junto do código novo.
 */
export function snapshotProjectWithCurrentAuthority(project: Project): Project {
  if (project.kind === 'pro' || project.bridgeCodeAhead !== true) return project
  return { ...project, ir: null, blocksState: null }
}

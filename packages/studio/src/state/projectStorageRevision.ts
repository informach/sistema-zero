import type { StudioProChange } from '@sistemazero/core/studio/pro-revision'
import type { ProjectAsset } from '../core/projectAssets'

/** Local material inverse; binaries remain outside the textual tree and cloud artifacts. */
export interface ProAssetEdit {
  id: string
  value: ProjectAsset | null
  index: number
  cover: { before: string | null; after: string | null }
}

/** Local-only lineage. Symbols survive immutable spreads, but never JSON/cloud exports. */
const localRevision = Symbol('studio.local-revision')
export interface LocalHead {
  version: 1
  token: string
  writer: string
  base: string | null
  sequence: number
  deleted?: true
}
export interface ProApplicationRecord {
  version: 1
  operationId: string
  source: 'editor' | 'zappy'
  jobId?: string
  label?: string
  pathMap?: Record<string, string>
  requestId?: string
  decisionsHash?: string
  projectId: string
  beforeHash: string
  afterHash: string
  inverse: StudioProChange
  assetInverse?: ProAssetEdit
  createdAt: number
  bytes: number
  undoOf?: string
}
export interface LocalLineage {
  scope: string
  projectId: string
  writer: string
  base: string | null
  pending: Map<string, { sequence: number; record: ProApplicationRecord }>
  saved: Set<string>
  durableToken: string | null
  recovery?: boolean
  recoverySources?: Array<{ key: string; token: string }>
}
export interface LocalRevision {
  lineage: LocalLineage
  sequence: number
  token: string
}
/** Lineage belongs to a document identity, independently of language or payload. */
type ProjectIdentity = { id: string }
type LocalProject = ProjectIdentity & { [localRevision]?: LocalRevision }

export function readLocalRevision(project: ProjectIdentity): LocalRevision | undefined {
  const stamp = (project as LocalProject)[localRevision]
  return stamp?.lineage.projectId === project.id ? stamp : undefined
}
export function installLocalRevision<T extends ProjectIdentity>(
  project: T,
  scope: string,
  head?: LocalHead,
): T {
  const lineage: LocalLineage = {
    scope,
    projectId: project.id,
    writer: crypto.randomUUID(),
    base: head?.token ?? null,
    durableToken: head?.token ?? null,
    pending: new Map(),
    saved: new Set(),
  }
  ;(project as LocalProject)[localRevision] = { lineage, sequence: 0, token: crypto.randomUUID() }
  return project
}
export function copyLocalRevision<T extends ProjectIdentity>(
  source: ProjectIdentity,
  target: T,
): T {
  const stamp = readLocalRevision(source)
  if (stamp && source.id === target.id) (target as LocalProject)[localRevision] = stamp
  return target
}
/** Called for each immutable store edit, including hydration. No asynchronous hashing. */
export function advanceLocalRevision<T extends ProjectIdentity>(
  previous: ProjectIdentity | null,
  next: T,
): T {
  const stamp = previous && readLocalRevision(previous)
  if (stamp && previous.id === next.id) {
    ;(next as LocalProject)[localRevision] = {
      lineage: stamp.lineage,
      sequence: stamp.sequence + 1,
      token: crypto.randomUUID(),
    }
  }
  return next
}
/** A second editor gets a distinct writer, even if the host reused a loaded Project object. */
export function forkLocalRevision<T extends ProjectIdentity>(project: T): T {
  const stamp = readLocalRevision(project)
  if (!stamp) return project
  const copy = { ...project }
  const installed = installLocalRevision(
    copy,
    stamp.lineage.scope,
    stamp.lineage.durableToken
      ? { version: 1, token: stamp.lineage.durableToken, writer: '', base: null, sequence: 0 }
      : undefined,
  ) as T
  if (stamp.lineage.recovery) {
    const next = readLocalRevision(installed)!
    next.lineage.recovery = true
    next.lineage.recoverySources = stamp.lineage.recoverySources
    for (const [id, entry] of stamp.lineage.pending)
      next.lineage.pending.set(id, { sequence: next.sequence, record: entry.record })
  }
  return installed
}
/**
 * O host trocou o documento ABERTO por outro conteúdo com o mesmo id (`handle.replaceProject`,
 * o "Trazer o que eu enviei" da aula). O snapshot que chega da rede não tem linhagem, e sem
 * ela a próxima gravação nasceria com `base: null` diante de uma cabeça já gravada: o CAS a
 * lia como escrita de outra aba (`ProjectWriteConflict`). A troca é uma edição DESTE editor,
 * então herda a base durável dele; a cópia recebe outro escritor ao hidratar. Uma escrita de
 * outra aba depois dessa base continua sendo conflito. A recuperação pendente NÃO é herdada:
 * a edição preservada segue na própria partição, e o conteúdo novo não a apaga.
 */
export function inheritLocalRevision<T extends ProjectIdentity>(
  live: ProjectIdentity | null,
  replacement: T,
): T {
  const stamp = live && readLocalRevision(live)
  if (!stamp || live.id !== replacement.id || readLocalRevision(replacement)) return replacement
  const durable = stamp.lineage.durableToken
  return installLocalRevision(
    { ...replacement },
    stamp.lineage.scope,
    durable ? { version: 1, token: durable, writer: '', base: null, sequence: 0 } : undefined,
  )
}
export function localHead(stamp: LocalRevision): LocalHead {
  return {
    version: 1,
    token: stamp.token,
    writer: stamp.lineage.writer,
    base: stamp.lineage.base,
    sequence: stamp.sequence,
  }
}
export function isLocalHead(value: unknown): value is LocalHead {
  const h = value as LocalHead | undefined
  return Boolean(
    h &&
      h.version === 1 &&
      typeof h.token === 'string' &&
      typeof h.writer === 'string' &&
      (h.base === null || typeof h.base === 'string') &&
      Number.isSafeInteger(h.sequence),
  )
}
export function acceptsLocalHead(current: LocalHead | undefined, next: LocalHead): boolean {
  if (current?.deleted) return false
  return (
    (current?.token ?? null) === next.base ||
    (current?.writer === next.writer &&
      current.base === next.base &&
      current.sequence <= next.sequence)
  )
}
export class ProjectWriteConflict extends Error {
  constructor() {
    super(
      'O projeto foi alterado ou apagado em outra aba. Suas edições continuam nesta sessão; reabra ou exporte uma cópia antes de continuar.',
    )
    this.name = 'ProjectWriteConflict'
  }
}

import { pensaStudioProjectId } from './pensa-studio-link'

/** A device must download a committed restoration before saving over that game. */
const PREFIX = 'sz:pensa-restore:'
const PENSA_STUDIO_ID = /^pensa-[a-f0-9]{32}$/

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

function readMap(viewerId: string): Record<string, number> {
  const raw = storage()?.getItem(`${PREFIX}${viewerId}`)
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const map: Record<string, number> = {}
    for (const [id, revision] of Object.entries(parsed as Record<string, unknown>)) {
      if (PENSA_STUDIO_ID.test(id) && Number.isSafeInteger(revision) && (revision as number) > 0)
        map[id] = revision as number
    }
    return map
  } catch {
    return {}
  }
}

function writeMap(viewerId: string, map: Record<string, number>): void {
  try {
    const store = storage()
    if (!store) return
    if (Object.keys(map).length === 0) store.removeItem(`${PREFIX}${viewerId}`)
    else store.setItem(`${PREFIX}${viewerId}`, JSON.stringify(map))
  } catch {
    // Armazenamento cheio ou bloqueado: sem a marca, vale a regra comum da nuvem.
  }
}

/** A revisão restaurada que este aparelho ainda precisa alcançar; `null` = nada pendente. */
export function pensaRestoreRevision(viewerId: string, studioProjectId: string): number | null {
  if (!viewerId || !PENSA_STUDIO_ID.test(studioProjectId)) return null
  return readMap(viewerId)[studioProjectId] ?? null
}

/** Guarda (só para cima: uma leitura atrasada nunca rebaixa a marca). */
export function notePensaRestore(viewerId: string, studioProjectId: string, revision: number) {
  if (!viewerId || !PENSA_STUDIO_ID.test(studioProjectId)) return
  if (!Number.isSafeInteger(revision) || revision <= 0) return
  const map = readMap(viewerId)
  if ((map[studioProjectId] ?? 0) >= revision) return
  map[studioProjectId] = revision
  writeMap(viewerId, map)
}

export function clearPensaRestore(viewerId: string, studioProjectId: string): void {
  if (!viewerId) return
  const map = readMap(viewerId)
  if (!(studioProjectId in map)) return
  delete map[studioProjectId]
  writeMap(viewerId, map)
}

/** Pendente = há marca e a revisão sincronizada aqui ainda não chegou nela. */
export function isPensaRestorePending(
  restoreRevision: number | null,
  syncedRevision: number | undefined,
): boolean {
  return restoreRevision !== null && (syncedRevision ?? 0) < restoreRevision
}

/** The server explicitly identifies a committed restore; a checkpoint is not a restore. */
export function restoredSaveRevisionOf(
  view: unknown,
): { projectId: string; revision: number } | null {
  if (
    !view ||
    typeof view !== 'object' ||
    !('project' in view) ||
    !('restoredSaveRevision' in view)
  )
    return null
  const project = view.project
  if (
    !project ||
    typeof project !== 'object' ||
    !('id' in project) ||
    typeof project.id !== 'string'
  )
    return null
  if (typeof view.restoredSaveRevision !== 'string') return null
  const revision = Number(view.restoredSaveRevision)
  if (!Number.isSafeInteger(revision) || revision <= 0) return null
  return { projectId: project.id, revision }
}

/** O transporte registra a revisão restaurada recebida do servidor. */
export function notePensaRestoreFromView(viewerId: string | null | undefined, view: unknown) {
  if (!viewerId) return
  const restored = restoredSaveRevisionOf(view)
  if (!restored) return
  notePensaRestore(viewerId, pensaStudioProjectId(restored.projectId), restored.revision)
}

/** Recusa de abrir com uma frase PARA A CRIANÇA (a tela mostra no lugar do recado genérico). */
export class PensaOpenRefused extends Error {}

/** Pull the committed restore first; offline edits remain eligible for the cloud conflict copy. */
export async function reconcilePensaOpen(input: {
  restoreRevision: number | null
  syncedRevision: () => number | undefined
  clear: () => void
  /** A descida da nuvem (single-flight); `null` = sem nuvem neste aparelho. */
  pull: (() => Promise<void>) | null
  /** O bilhete da versão na conta; lança sem rede. `null` = sem nuvem neste aparelho. */
  peek: (() => Promise<{ summary: { revision: number } } | null>) | null
}): Promise<void> {
  const { restoreRevision } = input
  if (restoreRevision === null) return
  const arrived = () => !isPensaRestorePending(restoreRevision, input.syncedRevision())
  if (arrived()) {
    input.clear()
    return
  }
  if (!input.pull || !input.peek) return
  await input.pull().catch(() => {})
  if (arrived()) {
    input.clear()
    return
  }
  let remote: { summary: { revision: number } } | null = null
  try {
    remote = await input.peek()
  } catch {
    // Sem rede (ou a nuvem fora): abre o que está no aparelho.
    return
  }
  if (remote && remote.summary.revision >= restoreRevision)
    throw new PensaOpenRefused(
      'A versão guardada deste jogo ainda não chegou aqui. Feche o jogo em outras abas e tente de novo.',
    )
}

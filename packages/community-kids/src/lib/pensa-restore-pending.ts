import { pensaStudioProjectId } from './pensa-studio-link'

/**
 * Restauração do Pensa v2 PENDENTE neste aparelho (14/10/2026).
 *
 * Restaurar uma versão guardada troca o arquivo do jogo NA CONTA (`pensa-<id>` ganha uma
 * revisão nova, e o plano passa a apontar para ela). Até a versão restaurada descer para este
 * aparelho, a cópia local é a ANTIGA: abrir e salvar por cima dela subiria a versão velha no
 * lugar da restaurada, e o plano ficaria ligado ao arquivo errado.
 *
 * Só esse caso pede cuidado. Um jogo do Pensa que mudou em OUTRO aparelho (o caso comum de dois
 * computadores) segue a regra de sempre da nuvem, e um plano v1 nunca restaura. Por isso a
 * marca é EXPLÍCITA: a revisão restaurada, guardada por perfil quando o host VÊ a jornada
 * restaurada passar pelo transporte do Pensa (a resposta da restauração e as leituras da
 * jornada). Ela some quando a revisão sincronizada deste aparelho alcança a restaurada.
 *
 * ⚠️ O prefixo NÃO pode começar com `sz:pensa:`: o `pensa-client` apaga essas chaves (são do
 * fluxo antigo) toda vez que monta.
 */
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
    const parsed = JSON.parse(raw) as unknown
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

/**
 * A revisão do arquivo restaurado, lida de uma jornada v2 (`PensaJourneyView`), ou `null`.
 *
 * O servidor não carimba "restaurado" na jornada; o que distingue é a forma: proteger uma
 * versão grava o ponto de restauração com a MESMA revisão do arquivo na jornada e no registro
 * do ponto, enquanto restaurar aponta a jornada para o ponto escolhido com a revisão NOVA do
 * arquivo (a do registro continua a antiga). Proteger de novo depois desfaz a diferença, e é o
 * certo: a partir daí a nuvem tem uma versão comum.
 */
export function restoredSaveRevisionOf(
  view: unknown,
): { projectId: string; revision: number } | null {
  if (!view || typeof view !== 'object') return null
  const v = view as {
    project?: { id?: unknown }
    journey?: {
      contractVersion?: unknown
      checkpoint?: { id?: unknown; saveRevision?: unknown } | null
    }
    checkpoints?: Array<{ id?: unknown; saveRevision?: unknown }>
  }
  const checkpoint = v.journey?.checkpoint
  if (v.journey?.contractVersion !== 2 || !checkpoint || typeof v.project?.id !== 'string')
    return null
  if (typeof checkpoint.id !== 'string' || typeof checkpoint.saveRevision !== 'string') return null
  const record = Array.isArray(v.checkpoints)
    ? v.checkpoints.find((item) => item?.id === checkpoint.id)
    : undefined
  if (!record || record.saveRevision === checkpoint.saveRevision) return null
  const revision = Number(checkpoint.saveRevision)
  if (!Number.isSafeInteger(revision) || revision <= 0) return null
  return { projectId: v.project.id, revision }
}

/** O transporte do Pensa chama a cada resposta de jornada v2: guarda a marca quando cabe. */
export function notePensaRestoreFromView(viewerId: string | null | undefined, view: unknown) {
  if (!viewerId) return
  const restored = restoredSaveRevisionOf(view)
  if (!restored) return
  notePensaRestore(viewerId, pensaStudioProjectId(restored.projectId), restored.revision)
}

/** Recusa de abrir com uma frase PARA A CRIANÇA (a tela mostra no lugar do recado genérico). */
export class PensaOpenRefused extends Error {}

/**
 * Antes de abrir um jogo do Pensa no Estúdio. SÓ faz algo com uma restauração v2 pendente neste
 * aparelho; sem ela não há rede nenhuma, e o jogo que está aqui abre na hora (inclusive sem
 * internet, e inclusive os planos v1: o `pensa-` do arquivo é o mesmo nos dois).
 *
 * Com ela, a versão restaurada precisa DESCER antes de o editor abrir (a descida guarda o que
 * mudou aqui como cópia e põe a restaurada no mesmo id). Sem rede, resolve e o host abre a cópia
 * local: o que for feito nela vira a cópia quando a restaurada chegar, nada se perde. Só RECUSA
 * quando a nuvem respondeu, a restaurada existe e mesmo assim não desceu, que é o jogo aberto em
 * outra aba (a descida não mexe em projeto aberto): a frase diz o que fazer.
 */
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

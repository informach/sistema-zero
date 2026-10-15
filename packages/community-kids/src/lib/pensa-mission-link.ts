import { type GuideError, progressRefusal, RECUSA_AO_ABRIR } from './pensa-guide-errors'

/**
 * Abrir o jogo por uma missão do Pensa: o Estúdio ANOTA a missão (começada e ligada ao jogo do
 * plano) e só então mostra o editor (15/10/2026).
 *
 * No Pensa v2 essa anotação é contabilidade: quem prova a missão é o jogo guardado na conta,
 * conferido na hora de concluir (o guia manda o jogo de novo). Por isso, no v2:
 * - a anotação não leva a versão do progresso que a página tinha (o servidor junta com o que
 *   ele sabe e protege a escrita sozinho), e uma página velha não vira conflito;
 * - uma recusa de agora (a missão ainda depende das anteriores, o caminho mudou, o servidor
 *   tropeçou, a rede caiu) NÃO tranca o jogo: ele abre e o guia é relido.
 * Antes qualquer 409 virava "A tarefa mudou em outro lugar", o jogo não abria e o "Tentar de
 * novo" não refazia nada. Só barra abrir o que o jogo não resolve: a missão é de outra pessoa da
 * equipe, ou não existe mais. O plano anterior ao v2 segue estrito (lá a conclusão depende da
 * anotação feita na abertura).
 */
const BARRA_ABRIR = new Set(['PENSA_NOT_YOUR_MISSION', 'PENSA_MISSION_TAKEN', 'PENSA_NOT_FOUND'])

export type MissionLinkResult<P> =
  | { kind: 'linked'; progress: P }
  /** O servidor não anotou agora: o jogo abre do mesmo jeito. `reread` = reler o guia. */
  | { kind: 'deferred'; reread: boolean }

/** A recusa que barra abrir, com a frase da criança. `reread` = reler o guia antes de tentar. */
export type MissionLinkRefusal = GuideError & { reread?: boolean }

export async function linkStudioMission<P>(input: {
  fetch: (url: string, init: RequestInit) => Promise<Response>
  taskId: string
  /** Plano do Pensa v2 (guia `contractVersion: 2`). */
  v2: boolean
  status: 'planned' | 'in_progress'
  expectedUpdatedAt: string | null
  projectId: string
  saveRevision: string
}): Promise<MissionLinkResult<P>> {
  let response: Response
  try {
    response = await input.fetch(`/api/pensa/tasks/${encodeURIComponent(input.taskId)}/progress`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...(input.v2 ? {} : { expectedUpdatedAt: input.expectedUpdatedAt }),
        ...(input.status === 'planned' ? { status: 'in_progress' } : {}),
        outputRef: {
          kind: 'studio_project',
          projectId: input.projectId,
          saveRevision: input.saveRevision,
        },
      }),
    })
  } catch (cause) {
    if (input.v2) return { kind: 'deferred', reread: false }
    throw cause
  }
  const body = (await response.json().catch(() => null)) as {
    task?: { progress: P }
    error?: { code?: string; message?: string }
  } | null
  if (response.ok && body?.task) return { kind: 'linked', progress: body.task.progress }
  const code = body?.error?.code ?? ''
  const tolerated = response.status === 409 || response.status >= 500 || response.ok
  // Reler o guia só quando ele pode ter mudado (409): com o servidor fora (5xx) a releitura
  // falharia também, e o erro dela tomaria a tela no lugar do jogo que acabou de abrir.
  if (input.v2 && tolerated && !BARRA_ABRIR.has(code))
    return { kind: 'deferred', reread: response.status === 409 || response.ok }
  const refusal: MissionLinkRefusal = progressRefusal(response.status, body, RECUSA_AO_ABRIR)
  if (response.status === 409) refusal.reread = true
  throw refusal
}

type LinkedProgress = { outputRef?: { kind: 'studio_project'; projectId: string } | null }

/**
 * O progresso que o guia do v2 recebe: sem `outputRef` (a anotação ao abrir foi adiada), o jogo
 * aberto entra como vínculo provisório. Sem isso "Experimentei e funcionou" ficava desligado sem
 * motivo nem saída; quem prova a missão é o jogo guardado, conferido na conclusão.
 */
export function withProvisionalGameLink<P extends LinkedProgress>(
  progress: P,
  v2: boolean,
  projectId: string,
): P {
  if (!v2 || progress.outputRef) return progress
  return { ...progress, outputRef: { kind: 'studio_project', projectId } }
}

/**
 * Para onde vai quem sai do editor: o PLANO da missão aberta (`?tarefa=`), o plano do jogo aberto
 * pelo "Abrir meu jogo" (`?projeto=pensa-…`, só enquanto ESSE jogo está aberto) ou, `null`, a
 * lista de jogos.
 */
export function editorExitPath(input: {
  taskId: string | null
  handoffProjectId: string | null
  openingPlanId: string | null
  initialProjectId: string | null
  openProjectId: string | null
}): string | null {
  if (input.taskId)
    return input.handoffProjectId
      ? `/pensa?plano=${encodeURIComponent(input.handoffProjectId)}`
      : '/pensa'
  if (input.openingPlanId && input.openProjectId && input.openProjectId === input.initialProjectId)
    return `/pensa?plano=${encodeURIComponent(input.openingPlanId)}`
  return null
}

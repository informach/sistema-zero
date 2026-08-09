/**
 * A última foto boa que o PREVIEW mandou, por projeto.
 *
 * O editor pede uma miniatura ao preview de tempos em tempos (ver
 * `snapshotBridge.ts`) e guarda aqui. Ao sair, o Studio grava essa foto no card
 * em vez de abrir um iframe e rodar o jogo de novo — que era o caminho antigo e
 * dependia de o navegador continuar entregando quadros justamente na saída.
 *
 * ⚠️ Vive em memória de MÓDULO, e não numa store por instância, de propósito: o
 * `PreviewIframe` que escreve e o `StudioCore` que lê são desmontados em ordens
 * diferentes, e a foto precisa sobreviver aos dois. A chave é o id do projeto, o
 * que também isola duas instâncias do Studio na mesma página.
 */

import { MAX_PROJECT_THUMB_CHARS } from '../state/persistence'

export interface ProjectSnapshot {
  projectId: string
  dataUrl: string
  /** Quando chegou, para o leitor recusar foto velha. */
  at: number
}

const porProjeto = new Map<string, ProjectSnapshot>()

/** Foto além disto é considerada velha demais para virar capa. */
export const SNAPSHOT_MAX_AGE_MS = 5 * 60_000

/**
 * Guarda a foto que chegou do preview. ⚠️ **Esta é a FRONTEIRA DE CONFIANÇA**, e
 * é por isso que a validação mora aqui e não no bridge: o bridge roda no mesmo
 * contexto do programa da criança, que pode postar a mensagem de foto à mão com
 * o conteúdo que quiser. Validar lá dentro não vale como garantia.
 *
 * ⚠️ O teto é o **da gravação** (`MAX_PROJECT_THUMB_CHARS`), não o da ponte. Os
 * dois já divergiram: o bridge aceitava até 400 KB e o `writeProjectThumb`
 * recusa acima de 300 KB **em silêncio** — uma foto no meio era guardada aqui,
 * escolhida em vez da reserva, e depois descartada sem que ninguém soubesse. Uma
 * foto grande demais tem que ser recusada JÁ, para o caminho antigo assumir.
 */
export function rememberProjectSnapshot(
  projectId: string,
  dataUrl: string,
  now = Date.now(),
): void {
  if (!projectId || !dataUrl) return
  if (!dataUrl.startsWith('data:image/') || dataUrl.length > MAX_PROJECT_THUMB_CHARS) return
  porProjeto.set(projectId, { projectId, dataUrl, at: now })
}

/**
 * Lê a foto recente sem consumi-la. O objeto devolvido funciona como recibo: o
 * gravador confirma o consumo somente depois que a persistência termina.
 */
export function peekProjectSnapshot(projectId: string, now = Date.now()): ProjectSnapshot | null {
  const guardada = porProjeto.get(projectId)
  if (!guardada) return null
  if (now - guardada.at > SNAPSHOT_MAX_AGE_MS) {
    porProjeto.delete(projectId)
    return null
  }
  return guardada
}

/**
 * Confirma o consumo da foto gravada. Uma captura mais nova nunca é apagada por
 * uma gravação antiga que terminou depois dela.
 */
export function consumeProjectSnapshot(snapshot: ProjectSnapshot): boolean {
  if (porProjeto.get(snapshot.projectId) !== snapshot) return false
  porProjeto.delete(snapshot.projectId)
  return true
}

/** Esquece o que foi guardado (troca de projeto, exclusão, testes). */
export function forgetProjectSnapshot(projectId?: string): void {
  if (projectId) porProjeto.delete(projectId)
  else porProjeto.clear()
}

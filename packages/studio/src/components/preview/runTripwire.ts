/**
 * A marca de execução da prévia (pacote B da evolução do Estúdio).
 *
 * Em navegador que não isola a prévia do editor, um jogo preso num cálculo sem fim congela a aba
 * inteira. A criança fecha a aba, abre o projeto de novo, a prévia roda sozinha e trava outra
 * vez: o projeto fica impossível de abrir. A marca quebra esse laço.
 *
 * - Ao começar a rodar um jogo, a aba grava a marca DELA para o projeto e a renova a cada
 *   `RUN_TRIPWIRE_REFRESH_MS` enquanto o jogo roda (é a linha de execução do EDITOR que renova:
 *   numa aba congelada a renovação para).
 * - A marca sai quando o jogo para ou o editor fecha direito. Sinais de vida do jogo não a
 *   removem: um programa pode travar depois de vários segundos saudáveis.
 * - Ao abrir um projeto, a prévia NÃO roda sozinha se houver marca parada há mais de
 *   `RUN_TRIPWIRE_STALE_MS` (a aba congelou ou caiu com o jogo rodando) ou marca no formato de
 *   antes (sem dono). A marca renovada de OUTRA aba viva não conta: é alguém rodando o mesmo
 *   projeto agora (achado E6 da revisão de 20/11: sem dono por aba, uma aba viva travava a
 *   abertura da outra, e o encerramento de uma tirava a marca da outra).
 * - Cada aba só tira a própria marca. Um Rodar (ou a abertura que respeitou a marca) esquece as
 *   marcas paradas desse projeto.
 *
 * Mora no `localStorage` (síncrono: tem de estar gravada ANTES de o jogo começar) e por perfil
 * de armazenamento do navegador. Sem `localStorage` (modo privado, contexto restrito), não há
 * marca e tudo segue como antes.
 */
const PREFIX = 'sz:run-tripwire:'
export const RUN_TRIPWIRE_REFRESH_MS = 2_000
export const RUN_TRIPWIRE_STALE_MS = 6_000

/** Esta aba (este carregamento da página). */
const TAB = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
const refreshers = new Map<string, ReturnType<typeof setInterval>>()

const legacyKey = (projectId: string) => PREFIX + projectId
const tabPrefix = (projectId: string) => `${PREFIX}${projectId}#`
const ownKey = (projectId: string) => tabPrefix(projectId) + TAB

function write(projectId: string): void {
  window.localStorage.setItem(ownKey(projectId), JSON.stringify({ at: Date.now() }))
}

/** A hora da última renovação de uma marca com dono; `null` quando não dá para ler (conta como parada). */
function markedAt(raw: string | null): number | null {
  if (raw === null) return null
  try {
    const at = (JSON.parse(raw) as { at?: unknown }).at
    return typeof at === 'number' && Number.isFinite(at) ? at : null
  } catch {
    return null
  }
}

/** As marcas de OUTRAS abas (e a de antes, sem dono) deste projeto, com a parada de cada uma. */
function otherMarks(projectId: string, now: number): { key: string; stale: boolean }[] {
  const marks: { key: string; stale: boolean }[] = []
  const storage = window.localStorage
  const prefix = tabPrefix(projectId)
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key === null) continue
    if (key === legacyKey(projectId)) marks.push({ key, stale: true })
    else if (key.startsWith(prefix) && key !== ownKey(projectId)) {
      const at = markedAt(storage.getItem(key))
      marks.push({ key, stale: at === null || now - at > RUN_TRIPWIRE_STALE_MS })
    }
  }
  return marks
}

/** Esquece as marcas paradas deste projeto: a interrupção já foi respeitada ou a pessoa rodou. */
export function forgetInterruptedRuns(projectId: string): void {
  try {
    for (const { key, stale } of otherMarks(projectId, Date.now()))
      if (stale) window.localStorage.removeItem(key)
  } catch {
    // Sem armazenamento: nada a esquecer.
  }
}

export function armRunTripwire(projectId: string): void {
  try {
    forgetInterruptedRuns(projectId)
    write(projectId)
    if (!refreshers.has(projectId)) {
      refreshers.set(
        projectId,
        setInterval(() => {
          try {
            write(projectId)
          } catch {
            // Armazenamento cheio ou fechado: a marca de antes segue valendo.
          }
        }, RUN_TRIPWIRE_REFRESH_MS),
      )
    }
  } catch {
    // Sem armazenamento: sem marca.
  }
}

export function disarmRunTripwire(projectId: string): void {
  const refresher = refreshers.get(projectId)
  if (refresher !== undefined) clearInterval(refresher)
  refreshers.delete(projectId)
  try {
    window.localStorage.removeItem(ownKey(projectId))
  } catch {
    // Sem armazenamento: nada a tirar.
  }
}

/** A última execução deste projeto em alguma aba não terminou de maneira controlada. */
export function wasRunInterrupted(projectId: string): boolean {
  try {
    return otherMarks(projectId, Date.now()).some((mark) => mark.stale)
  } catch {
    return false
  }
}

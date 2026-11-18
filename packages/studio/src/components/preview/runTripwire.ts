/**
 * A marca de execução da prévia (pacote B da evolução do Estúdio).
 *
 * Em navegador que não isola a prévia do editor, um jogo preso num cálculo sem fim congela a aba
 * inteira. A criança fecha a aba, abre o projeto de novo, a prévia roda sozinha e trava outra
 * vez: o projeto fica impossível de abrir. A marca quebra esse laço.
 *
 * - Ao começar a rodar um jogo, a marca do projeto é gravada.
 * - Ela sai quando o jogo para ou o editor fecha direito. Sinais de vida não a removem:
 *   um programa pode travar depois de vários segundos saudáveis. Numa aba congelada o
 *   encerramento não roda, e a marca fica.
 * - Ao abrir um projeto com a marca, a prévia NÃO roda sozinha: espera o Rodar.
 *
 * Mora no `localStorage` (síncrono: tem de estar gravada ANTES de o jogo começar) e por perfil
 * de armazenamento do navegador. Sem `localStorage` (modo privado, contexto restrito), não há
 * marca e tudo segue como antes.
 */
const PREFIX = 'sz:run-tripwire:'

export function armRunTripwire(projectId: string): void {
  try {
    window.localStorage.setItem(PREFIX + projectId, String(Date.now()))
  } catch {
    // Sem armazenamento: sem marca.
  }
}

export function disarmRunTripwire(projectId: string): void {
  try {
    window.localStorage.removeItem(PREFIX + projectId)
  } catch {
    // Sem armazenamento: nada a tirar.
  }
}

/** A última execução deste projeto não terminou de maneira controlada. */
export function wasRunInterrupted(projectId: string): boolean {
  try {
    return window.localStorage.getItem(PREFIX + projectId) !== null
  } catch {
    return false
  }
}

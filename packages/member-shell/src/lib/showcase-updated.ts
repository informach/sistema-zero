/**
 * O selo "Atualizado" dos posts do Mural: o jogo foi trocado por uma versão nova depois
 * de publicado. A data da publicação e a ordem no Mural não mudam; o selo é o aviso.
 */
const DATE = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/** "Atualizado em 02/07/2026", ou `null` quando o jogo nunca foi atualizado. */
export function showcaseUpdatedLabel(thread: { gameUpdatedAt?: string | null }): string | null {
  if (!thread.gameUpdatedAt) return null
  const at = new Date(thread.gameUpdatedAt)
  if (Number.isNaN(at.getTime())) return null
  return `Atualizado em ${DATE.format(at)}`
}

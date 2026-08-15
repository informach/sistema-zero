/**
 * Qual desenho o bloco de Pinta oferece como INICIAL.
 *
 * ⚠️ O rascunho local NÃO entra aqui: no Pinta o rascunho é o próprio armazenamento injetado, e
 * "o que já está guardado vence o desenho inicial" é regra de DENTRO do pacote. Esta função só
 * decide o que oferecer quando o armazenamento do bloco ainda está vazio.
 *
 * Ordem: **entrega desta aula → desenho da aula anterior da cadeia → desenho do professor**.
 * Cada passo é lazy (só busca quando pode valer) e best-effort (falha cai no próximo).
 *
 * Vive fora do componente porque a regra tem três ramos e uma condição sutil — o tipo de coisa
 * que regride em silêncio num `useEffect` que ninguém consegue testar.
 */
export interface PintaSeedSources {
  /** Desenho autorado pelo professor: o último recurso, sempre presente. */
  initialAsset: unknown
  /** Nome da cadeia. Vazio/ausente = aula independente (sem carryover). */
  chain?: string
  /** A criança já entregou NESTA aula? (`pintaState.submitted` da projeção.) */
  submitted: boolean
  /** Entrega desta aula. Best-effort: `null` em falha de rede. */
  loadSubmission: () => Promise<unknown | null>
  /** Entrega da aula anterior da MESMA cadeia. Mesma régua. */
  loadCarryover: () => Promise<unknown | null>
  /** Componente ainda montado? Evita a 2ª ida depois do unmount. */
  aborted?: () => boolean
}

export async function resolvePintaSeed(sources: PintaSeedSources): Promise<unknown> {
  const { initialAsset, chain, submitted, loadSubmission, loadCarryover, aborted } = sources

  if (submitted) {
    const mine = await loadSubmission()
    if (mine) return mine
    // ⚠️ A cadeia é PULADA aqui de propósito, e a condição é "já enviou nesta aula?", não
    // "consegui baixar a entrega?": num soluço de rede o fallback certo é o desenho do
    // professor, não o da aula ANTERIOR. A cadeia já passou desta aula, e trazer o passo
    // anterior por cima de um trabalho que existe é o pior dos dois erros.
    return initialAsset
  }

  if (chain?.trim() && !aborted?.()) {
    const previous = await loadCarryover()
    if (previous) return previous
  }

  return initialAsset
}

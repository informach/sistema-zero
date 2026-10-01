export interface TrechoDeTexto {
  texto: string
  forte: boolean
}

/**
 * Parte um parágrafo nos trechos que ganham negrito. A copy não muda: os destaques são substrings
 * LITERAIS dela (`destaques.ts`), e a soma dos trechos devolve o parágrafo inteiro, igual.
 */
export function comDestaques(texto: string, frases: readonly string[] = []): TrechoDeTexto[] {
  const faixas = frases
    .map((frase) => ({ inicio: texto.indexOf(frase), fim: texto.indexOf(frase) + frase.length }))
    .filter((faixa) => faixa.inicio >= 0)
    .sort((a, b) => a.inicio - b.inicio)
  const trechos: TrechoDeTexto[] = []
  let cursor = 0
  for (const faixa of faixas) {
    if (faixa.inicio < cursor) continue
    if (faixa.inicio > cursor)
      trechos.push({ texto: texto.slice(cursor, faixa.inicio), forte: false })
    trechos.push({ texto: texto.slice(faixa.inicio, faixa.fim), forte: true })
    cursor = faixa.fim
  }
  if (cursor < texto.length) trechos.push({ texto: texto.slice(cursor), forte: false })
  return trechos
}

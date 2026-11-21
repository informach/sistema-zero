/**
 * O mesmo documento com quebras de linha diferentes (R4 da revisão de 20/11/2026).
 *
 * O projeto guarda o texto do arquivo como veio (um arquivo trazido de fora pode misturar CRLF, LF
 * e CR). O Monaco não guarda quebras misturadas: o modelo normaliza todas para uma só. Os dois são
 * o mesmo documento, e o projeto só muda quando a criança edita (aí o editor grava o texto dele).
 * Toda conferência "o editor mostra o arquivo do projeto?" passa por aqui; comparar o texto cru
 * deixava o mapa em "Lendo o mapa…", sumia com os problemas e reescrevia o modelo (apagando o
 * desfazer) a cada operação de documento.
 */

const LINE_BREAK = /\r\n?/g

/** Os dois textos só diferem nas quebras de linha (ou são iguais). */
export function sameTextExceptLineBreaks(a: string, b: string): boolean {
  if (a === b) return true
  if (!a.includes('\r') && !b.includes('\r')) return false
  return a.replace(LINE_BREAK, '\n') === b.replace(LINE_BREAK, '\n')
}

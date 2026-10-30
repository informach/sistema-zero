/** Um número estável a partir de um texto (o mesmo pedido o dia inteiro, em qualquer aparelho). */
export function numeroEstavel(texto: string): number {
  let h = 2166136261
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

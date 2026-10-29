/** Imagens importadas como arquivo (miniaturas): o Bun copia para a saída (com hash) e devolve o caminho. */
declare module '*.png' {
  const caminho: string
  export default caminho
}

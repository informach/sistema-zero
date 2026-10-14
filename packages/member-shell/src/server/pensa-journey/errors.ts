/**
 * Erros do Pensa v2 que carregam uma frase PARA A CRIANÇA. Todo o resto (provedor, rede, parser)
 * vai ao log só pelo NOME e chega à tela como a frase gentil de sempre (full review de 14/10/2026:
 * "Seus recursos mudaram…" virava "Não consegui preparar esta parte agora").
 */
export class JourneyChildError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JourneyChildError'
  }
}

/**
 * A saída do modelo veio fora das regras (bloco inexistente, missão faltando, JSON fora do
 * formato). `reason` é para o MODELO, na tentativa de reparo (diz a missão e o id); `message` é a
 * frase da criança se o reparo também falhar.
 */
export class JourneyOutputInvalid extends Error {
  constructor(
    readonly reason: string,
    message = 'Não consegui preparar esta parte agora. Sua ideia está guardada. Você pode tentar de novo ou ajustar o pedido.',
  ) {
    super(message)
    this.name = 'JourneyOutputInvalid'
  }
}

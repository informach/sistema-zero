/**
 * Tradução AMIGÁVEL (gloss em português) para as mensagens de erro nativas do
 * JavaScript que chegam ao console em inglês. A ideia: o aluno (criança 9+) NÃO
 * fica diante de um "x is not defined" sem saída — recebe uma dica calma em
 * português com o próximo passo. A linha original em inglês CONTINUA visível no
 * console (a criança aprende a mensagem real e pode colar numa IA/busca).
 *
 * Função PURA (sem DOM, sem store): só recebe a mensagem crua e devolve, quando
 * reconhece um dos padrões comuns, uma frase em PT — ou `null` caso não conheça
 * o padrão (aí o console mostra só a linha original).
 */

/**
 * Devolve uma dica em português para a mensagem de erro nativa, ou `null` se o
 * padrão não for reconhecido. Cobre os 3-4 erros mais comuns de quem está
 * aprendendo a programar.
 */
export function glossErrorMessage(message: string): string | null {
  if (!message) return null

  // Canvas 2D usa mensagens diferentes entre Chrome/WebKit para a mesma
  // condição (`arc()`/`ellipse()`/`arcTo()` e `roundRect()`): raio negativo.
  if (/\bradius\b.*\bnegative\b|\bRadius value\b.*\bis negative\b/i.test(message)) {
    return 'Dica: o raio não pode ser negativo. Use 0 ou um número maior.'
  }

  // "x is not defined" → variável usada antes de existir (ou nome digitado errado).
  // Em navegadores reais a mensagem vem PREFIXADA ("Uncaught ReferenceError: x is
  // not defined" / "ReferenceError: x is not defined"), então usamos o identificador
  // CAPTURADO pelo padrão — não o 1º token da mensagem (que seria "Uncaught").
  const notDefined = /['"]?([A-Za-z_$][\w$]*)['"]? is not defined/.exec(message)
  if (notDefined) {
    const name = notDefined[1]
    const alvo = name ? `"${name}"` : 'esse nome'
    return `Dica: ${alvo} ainda não existe. Confira se você escreveu o nome certo e se criou essa variável antes de usá-la.`
  }

  // "y is not a function" → chamou algo que não é função (typo no nome do método?).
  const notAFunction = /(['"]?[\w$.]+['"]?) is not a function/.exec(message)
  if (notAFunction) {
    return 'Dica: você tentou usar isto como um comando (função), mas ele não é um. Confira o nome — talvez tenha um errinho de digitação.'
  }

  // "Cannot read properties of undefined/null (reading 'x')" (Chrome moderno) e a
  // forma singular antiga "Cannot read property 'x' of undefined/null" → acessou
  // algo de um valor vazio. Aceita ambas (o `.*?` cobre o nome no meio da antiga).
  const cannotRead = /Cannot read propert(?:y|ies)\b.*?\bof (undefined|null)/.exec(message)
  if (cannotRead) {
    return 'Dica: você tentou pegar algo de um valor que está vazio. Confira se essa parte já foi criada e tem um valor antes de usá-la.'
  }

  return null
}

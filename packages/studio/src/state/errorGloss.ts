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

  // Python: os tropeços mais comuns de quem está começando, em português.
  const python = glossPythonError(message)
  if (python) return python

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

const PYTHON_GLOSSES: readonly [RegExp, string][] = [
  [
    /unsupported operand type\(s\) for \S+: '(int|float)' and 'str'|unsupported operand type\(s\) for \S+: 'str' and '(int|float)'|can only concatenate str \(not "(int|float)"\) to str/,
    'Dica: você juntou um número com um texto. Para escrever o número junto do texto, use str(numero); para fazer conta com um texto, use int(texto).',
  ],
  [
    /IndentationError|expected an indented block|unindent does not match|unexpected indent/,
    'Dica: o recuo (os espaços no começo da linha) não está certo. Tudo o que fica dentro de um if, for, while ou def precisa do mesmo recuo.',
  ],
  [/expected ':'/, 'Dica: faltou o dois-pontos (:) no fim da linha do if, for, while ou def.'],
  [
    /ZeroDivisionError|division by zero/,
    'Dica: o programa tentou dividir por zero. Confira o número que está embaixo da divisão.',
  ],
  [
    /(list|tuple|string) index out of range/,
    'Dica: o programa pediu uma posição que não existe. A primeira posição é 0 e a última é o tamanho menos 1.',
  ],
  [
    /'NoneType' object (has no attribute|is not subscriptable|is not iterable|is not callable)/,
    'Dica: este valor está vazio (None). Muitas vezes é uma função que não tem return, ou uma variável que ainda não recebeu nada.',
  ],
  [
    /has no attribute '([A-Za-z_]\w*)'/,
    'Dica: este valor não tem esse nome depois do ponto. Confira se o nome está escrito certinho.',
  ],
  [
    /invalid literal for int\(\) with base 10|could not convert string to float/,
    'Dica: este texto não é um número, então não dá para transformá-lo em número.',
  ],
  [
    /takes (\d+) positional arguments? but (\d+) (was|were) given|missing \d+ required positional argument/,
    'Dica: a função recebeu um número de valores diferente do que ela espera. Confira os valores entre parênteses.',
  ],
  [
    /^KeyError: '([A-Z_0-9]+)'$/m,
    'Dica: esse nome de tecla não existe. Confira como ele se escreve (por exemplo, keyboard.space ou keys.LEFT).',
  ],
  [
    /^KeyError:/m,
    'Dica: o programa procurou uma chave que não está no dicionário. Confira o nome da chave.',
  ],
  [
    /invalid syntax|unterminated string literal|was never closed|unmatched '/,
    'Dica: tem algo escrito de um jeito que o Python não entende nesta linha. Confira parênteses, aspas e dois-pontos.',
  ],
]

/** Uma dica em português para os erros mais comuns do Python, ou `null`. */
export function glossPythonError(message: string): string | null {
  for (const [pattern, gloss] of PYTHON_GLOSSES) if (pattern.test(message)) return gloss
  return null
}

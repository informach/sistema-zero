/**
 * Reduz o payload dos runtimes oficiais sem minificar ou reescrever JavaScript.
 *
 * Só linhas vazias e comentários de linha completos são removidos. Comentários
 * inline e qualquer ocorrência de `//` dentro de código ou strings permanecem
 * intactos, mantendo o resultado previsível e fácil de depurar.
 *
 * `trimIndent` (os três runtimes 3D, lote 14 do review 3D) tira também a indentação de cada
 * linha. Só é seguro num texto SEM crase: sem template literal não há string de várias linhas
 * (os runtimes não usam barra de continuação), então nenhum texto muda, só os espaços à
 * esquerda. Se sobrar uma crase fora dos comentários, a função recusa em vez de mexer no
 * conteúdo de uma string.
 */
export function compactOfficialRuntimeSource(
  source: string,
  options: { trimIndent?: boolean; stripBlockComments?: boolean } = {},
): string {
  const raw = source.split('\n')
  const lines = (options.stripBlockComments ? stripLeadingBlockComments(raw) : raw).filter(
    (line) => {
      const trimmed = line.trim()
      return trimmed !== '' && !trimmed.startsWith('//')
    },
  )
  if (!options.trimIndent) return lines.join('\n')
  const compacted = lines.map((line) => line.trimStart()).join('\n')
  if (compacted.includes('`')) {
    throw new Error('compactOfficialRuntimeSource: trimIndent exige um runtime sem crase')
  }
  return compacted
}

/**
 * `stripBlockComments` (lote 4 da missão, 21/11/2026): o Jogo 2D mandava 54,5 KB de comentários
 * de bloco (`/** … *\/`) a cada criança, a cada execução. Só sai o comentário que COMEÇA uma
 * linha: ali ele não pode estar dentro de uma string (os runtimes não têm string de várias linhas:
 * sem crase e sem barra de continuação, conferido abaixo) nem de uma expressão regular (nenhuma
 * começa com `*`). O comentário termina no primeiro `*\/`, como na linguagem; o código que vem
 * depois dele na mesma linha fica. A linha que termina com um `/*` aberto no meio do código (que
 * pode ser só um texto como `'image/*'`) põe a função em modo cauteloso: nada sai até aparecer um
 * `*\/`. As quebras de linha entre os códigos que ficam não mudam (a inserção de ponto e vírgula
 * continua igual).
 */
function stripLeadingBlockComments(lines: readonly string[]): string[] {
  const kept: string[] = []
  let inComment = false
  let cautious = false
  for (const line of lines) {
    if (line.endsWith(String.fromCharCode(92))) {
      throw new Error('stripBlockComments: o runtime tem uma linha com barra de continuação')
    }
    let rest = line
    if (inComment) {
      const end = rest.indexOf('*/')
      if (end < 0) continue
      rest = ` ${rest.slice(end + 2)}`
      inComment = false
    }
    if (cautious) {
      if (rest.includes('*/')) cautious = false
      kept.push(rest)
      continue
    }
    while (rest.trimStart().startsWith('/*')) {
      const start = rest.indexOf('/*')
      const end = rest.indexOf('*/', start + 2)
      if (end < 0) {
        inComment = true
        rest = ''
        break
      }
      rest = ` ${rest.slice(end + 2)}`
    }
    if (rest.trim() === '') continue
    if (rest.lastIndexOf('/*') > rest.lastIndexOf('*/')) cautious = true
    kept.push(rest)
  }
  if (inComment) throw new Error('stripBlockComments: comentário de bloco sem fim')
  return kept
}

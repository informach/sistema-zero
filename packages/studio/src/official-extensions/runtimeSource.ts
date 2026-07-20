/**
 * Reduz o payload dos runtimes oficiais sem minificar ou reescrever JavaScript.
 *
 * Só linhas vazias e comentários de linha completos são removidos. Comentários
 * inline e qualquer ocorrência de `//` dentro de código ou strings permanecem
 * intactos, mantendo o resultado previsível e fácil de depurar.
 */
export function compactOfficialRuntimeSource(source: string): string {
  return source
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      return trimmed !== '' && !trimmed.startsWith('//')
    })
    .join('\n')
}

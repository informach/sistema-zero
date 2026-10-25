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
  options: { trimIndent?: boolean } = {},
): string {
  const lines = source.split('\n').filter((line) => {
    const trimmed = line.trim()
    return trimmed !== '' && !trimmed.startsWith('//')
  })
  if (!options.trimIndent) return lines.join('\n')
  const compacted = lines.map((line) => line.trimStart()).join('\n')
  if (compacted.includes('`')) {
    throw new Error('compactOfficialRuntimeSource: trimIndent exige um runtime sem crase')
  }
  return compacted
}

/** Built once per transaction; scanning backwards for an absent CR is quadratic on LF files. */
export function indexPythonSourceLines(source: string) {
  const starts = [0]
  for (let offset = 0; offset < source.length; offset++) {
    const code = source.charCodeAt(offset)
    if (code === 13) {
      if (source.charCodeAt(offset + 1) === 10) offset++
      starts.push(offset + 1)
    } else if (code === 10) starts.push(offset + 1)
  }
  return {
    source,
    lineAt(offset: number) {
      if (!Number.isSafeInteger(offset) || offset < 0 || offset > source.length)
        throw new Error('Posição Python inválida.')
      let low = 0,
        high = starts.length
      while (low < high) {
        const middle = (low + high) >>> 1
        if (starts[middle]! <= offset) low = middle + 1
        else high = middle
      }
      const start = starts[low - 1]!
      const next = starts[low] ?? source.length
      const end =
        starts[low] === undefined ? next : next - (source.slice(next - 2, next) === '\r\n' ? 2 : 1)
      return { start, end, next }
    },
  }
}
export type PythonSourceLines = ReturnType<typeof indexPythonSourceLines>

const ENCODING_DECLARATION = /^[\t \f]*#.*?coding[:=]/
const COMMENT_OR_BLANK = /^[\t \f]*(#.*)?$/

/**
 * Fim do cabeçalho do módulo, onde nada pode entrar acima: o shebang e a declaração de
 * codificação. Pela PEP 263 a declaração vale na linha 1 ou na linha 2, e na 2 só quando a 1 é
 * comentário ou está em branco (o CPython só olha a 2 nesse caso).
 */
export function pythonModuleHeaderEnd(source: string, lines: PythonSourceLines) {
  if (!source) return 0
  const first = lines.lineAt(0)
  const firstText = source.slice(0, first.end)
  if (first.next < source.length) {
    const second = lines.lineAt(first.next)
    if (
      COMMENT_OR_BLANK.test(firstText) &&
      ENCODING_DECLARATION.test(source.slice(first.next, second.end))
    )
      return second.next
  }
  return /^#!/.test(firstText) || ENCODING_DECLARATION.test(firstText) ? first.next : 0
}

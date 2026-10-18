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

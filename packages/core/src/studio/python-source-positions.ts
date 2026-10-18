import type { PythonLanguageSpan } from './python-language-results'

export interface PythonSourcePosition {
  line: number
  character: number
}
export interface PythonSourceRange {
  start: PythonSourcePosition
  end: PythonSourcePosition
}

/** LSP uses UTF-16. Preserve CR, LF and CRLF without normalizing the saved document. */
export function sourcePositions(source: string) {
  const starts = [0]
  const ends: number[] = []
  for (let index = 0; index < source.length; index++) {
    if (source[index] !== '\n' && source[index] !== '\r') continue
    ends.push(index)
    if (source[index] === '\r' && source[index + 1] === '\n') index++
    starts.push(index + 1)
  }
  ends.push(source.length)
  function boundary(offset: number) {
    if (
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset > source.length ||
      (source[offset - 1] === '\r' && source[offset] === '\n') ||
      (source.charCodeAt(offset - 1) >= 0xd800 &&
        source.charCodeAt(offset - 1) <= 0xdbff &&
        source.charCodeAt(offset) >= 0xdc00 &&
        source.charCodeAt(offset) <= 0xdfff)
    )
      throw new Error('Invalid source position')
    return offset
  }
  function offset(position: PythonSourcePosition) {
    if (
      !Number.isSafeInteger(position.line) ||
      !Number.isSafeInteger(position.character) ||
      position.line < 0 ||
      position.line >= starts.length ||
      position.character < 0
    )
      throw new Error('Invalid LSP position')
    const value = starts[position.line]! + position.character
    if (value > ends[position.line]!) throw new Error('LSP position exceeds source line')
    return boundary(value)
  }
  return {
    offset,
    position(value: number): PythonSourcePosition {
      boundary(value)
      let lower = 0,
        upper = starts.length
      while (lower + 1 < upper) {
        const middle = (lower + upper) >>> 1
        if (starts[middle]! <= value) lower = middle
        else upper = middle
      }
      return { line: lower, character: value - starts[lower]! }
    },
    span(range: PythonSourceRange): PythonLanguageSpan {
      const start = offset(range.start),
        end = offset(range.end)
      if (end < start) throw new Error('Inverted LSP range')
      return { start, length: end - start }
    },
  }
}

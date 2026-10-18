import { sourcePositions } from '@sistemazero/core/studio/python-source-positions'
import type * as Monaco from 'monaco-editor'

/** Monaco normalizes mixed line endings on model creation; the saved source remains authoritative. */
export function samePythonEditorText(source: string, buffer: string) {
  return source === buffer || source.replace(/\r\n|\r/g, '\n') === buffer.replace(/\r\n|\r/g, '\n')
}
export function pythonDocumentOffset(
  source: string,
  buffer: string,
  position: { lineNumber: number; column: number },
): number | null {
  if (!samePythonEditorText(source, buffer)) return null
  try {
    return sourcePositions(source).offset({
      line: position.lineNumber - 1,
      character: position.column - 1,
    })
  } catch {
    return null
  }
}
export function pythonDocumentRange(source: string, start: number, length: number): Monaco.IRange {
  return pythonDocumentCoordinates(source).range(start, length)
}

/** One index per source snapshot, reused by all diagnostics and completion/symbol ranges. */
export function pythonDocumentCoordinates(source: string) {
  const positions = sourcePositions(source)
  return {
    position: positions.position,
    range(start: number, length: number): Monaco.IRange {
      if (!Number.isSafeInteger(length) || length < 0) throw new Error('Posição Python inválida.')
      const from = positions.position(start),
        to = positions.position(start + length)
      return {
        startLineNumber: from.line + 1,
        startColumn: from.character + 1,
        endLineNumber: to.line + 1,
        endColumn: to.character + 1,
      }
    },
  }
}

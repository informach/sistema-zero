import {
  isStudioTutorSourcePath,
  parseStudioTutorFileReference,
  type StudioTutorCodeFile,
  type StudioTutorFileReference,
  type StudioTutorSelection,
} from '@sistemazero/core/studio/pro-tutor'
import {
  isStudioTutorSensitivePath,
  redactStudioTutorSecrets,
  sanitizeStudioTutorExcerpt,
  studioTutorLineCount,
  studioTutorSourceHash,
} from './tutorSafety'

/** A selection is meaningful only in the exact document and inside its Monaco coordinates. */
export function isCurrentStudioTutorSelection(
  selection: StudioTutorSelection,
  content: string,
): boolean {
  if (
    !isStudioTutorSourcePath(selection.path) ||
    isStudioTutorSensitivePath(selection.path) ||
    selection.sourceHash !== studioTutorSourceHash(content) ||
    !Number.isSafeInteger(selection.documentVersion) ||
    selection.documentVersion < 0
  )
    return false
  const lines = content.split(/\r\n|\r|\n/)
  if (
    ![selection.startLine, selection.endLine, selection.startColumn, selection.endColumn].every(
      (value) => Number.isSafeInteger(value) && value > 0,
    )
  )
    return false
  return (
    selection.endLine >= selection.startLine &&
    selection.endLine <= lines.length &&
    selection.startColumn <= (lines[selection.startLine - 1]?.length ?? -1) + 1 &&
    selection.endColumn <= (lines[selection.endLine - 1]?.length ?? -1) + 1 &&
    (selection.endLine > selection.startLine || selection.endColumn >= selection.startColumn)
  )
}

/** Redact the WHOLE file before selecting a window: a secret can start outside the selection. */
export function createStudioTutorExcerpts(
  file: { path: string; content: string },
  options: { selection?: StudioTutorSelection; diagnosticLine?: number; maxChars: number },
): StudioTutorCodeFile[] {
  const sourceHash = studioTutorSourceHash(file.content)
  const original = file.content.replace(/\r\n|\r/g, '\n')
  const sanitized = redactStudioTutorSecrets(
    original.replace(/data:[^\s"')]+/gi, '[asset removido]'),
  ).text
  const lines = sanitized.split('\n')
  const mapping = studioTutorLineCount(original) === lines.length ? 'lines' : 'file'
  const selection =
    options.selection?.path === file.path &&
    isCurrentStudioTutorSelection(options.selection, file.content)
      ? options.selection
      : undefined
  const windows: Array<{ start: number; end: number }> = []
  const addWindow = (start: number, end: number) => {
    const next = { start: Math.max(1, start), end: Math.min(lines.length, end) }
    if (next.start > next.end) return
    const overlapping = windows.find(
      (item) => next.start <= item.end + 1 && next.end >= item.start - 1,
    )
    if (overlapping) {
      overlapping.start = Math.min(overlapping.start, next.start)
      overlapping.end = Math.max(overlapping.end, next.end)
    } else windows.push(next)
  }
  if (mapping === 'lines') {
    if (selection) addWindow(selection.startLine - 6, selection.endLine + 6)
    if (options.diagnosticLine) addWindow(options.diagnosticLine - 6, options.diagnosticLine + 6)
  }
  // Imports/configuration remain useful alongside a distant selection, under the same budget.
  addWindow(1, windows.length ? Math.min(12, lines.length) : lines.length)
  const budget = Math.max(1, Math.floor(options.maxChars / windows.length))
  return windows.map((window, index) => {
    const wholeWindow = lines.slice(window.start - 1, window.end).join('\n')
    let offset = 0
    const focusLine =
      selection && selection.startLine >= window.start && selection.startLine <= window.end
        ? selection.startLine
        : options.diagnosticLine &&
            options.diagnosticLine >= window.start &&
            options.diagnosticLine <= window.end
          ? options.diagnosticLine
          : undefined
    if (mapping === 'lines' && wholeWindow.length > budget && focusLine !== undefined) {
      const before = lines.slice(window.start - 1, focusLine - 1)
      const originalLine = original.split('\n')[focusLine - 1]
      const column =
        selection?.startLine === focusLine && originalLine === lines[focusLine - 1]
          ? selection.startColumn - 1
          : 0
      const focusOffset = before.reduce((total, line) => total + line.length + 1, 0) + column
      offset = Math.max(0, focusOffset - Math.min(200, Math.floor(budget / 4)))
    }
    const content = wholeWindow.slice(offset, offset + budget)
    const startLine = window.start + studioTutorLineCount(wholeWindow.slice(0, offset)) - 1
    return sanitizeStudioTutorExcerpt(
      {
        path: file.path,
        content,
        excerpt: {
          id: `excerpt-${studioTutorSourceHash(file.path + sourceHash)
            .slice(7, 23)
            .replace(/[^A-Za-z0-9]/g, '_')}-${index}`,
          sourceHash,
          startLine,
          endLine: startLine + studioTutorLineCount(content) - 1,
          mapping,
          truncated:
            window.start > 1 || window.end < lines.length || content.length !== wholeWindow.length,
          ...(selection ? { documentVersion: selection.documentVersion } : {}),
        },
      },
      (text) => text,
      budget,
    )
  })
}

/** A stale or legacy answer can open a file, but cannot silently highlight a different line. */
export function resolveStudioTutorReference(
  reference: StudioTutorFileReference,
  currentContent: string | undefined,
): StudioTutorFileReference | null {
  const safe = parseStudioTutorFileReference(reference)
  if (!safe || isStudioTutorSensitivePath(safe.path) || currentContent === undefined) return null
  if (
    !safe.sourceHash ||
    safe.sourceHash !== studioTutorSourceHash(currentContent) ||
    safe.startLine === undefined ||
    safe.endLine === undefined ||
    safe.endLine > studioTutorLineCount(currentContent)
  )
    return { path: safe.path }
  return safe
}

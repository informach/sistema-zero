/**
 * Where a Python error happened in the child's own files, read from the traceback.
 *
 * The worker sends `str(error)` and the formatted traceback. A child needs the line of HER
 * code (the last frame inside the project, even when the error is raised inside a library such
 * as pgzero) and the kind of error (`TypeError: ...`), not only its text.
 */

/** Where the worker mounts the project (interpreter.ts PROJECT_ROOT; a test keeps them equal). */
export const PYTHON_PROJECT_ROOT = '/studio/project'

export interface PythonErrorSummary {
  /** Path relative to the project, or undefined when no frame is in the project. */
  path?: string
  /** 1-based line in that file (0 when unknown). */
  line: number
  /** The last line of the traceback: "TypeError: unsupported operand ...". */
  message: string
}

const FRAME = /File "([^"\n]+)", line (\d+)/g

export function summarizePythonError(traceback: string, fallback: string): PythonErrorSummary {
  const prefix = `${PYTHON_PROJECT_ROOT}/`
  let path: string | undefined
  let line = 0
  for (const match of traceback.matchAll(FRAME)) {
    const file = match[1]!
    if (!file.startsWith(prefix)) continue
    path = file.slice(prefix.length)
    line = Number(match[2])
  }
  const last = traceback
    .trimEnd()
    .split('\n')
    .reverse()
    .find((text) => text.trim() !== '')
    ?.trim()
  // The last line of a traceback names the error; a bare text (no traceback) stays as it was.
  const message =
    last && /^[A-Za-z_][\w.]*(Error|Exception|Exit|Interrupt|Warning)\b/.test(last)
      ? last
      : fallback
  return { path, line, message }
}

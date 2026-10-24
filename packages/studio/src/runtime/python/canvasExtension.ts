import { hasPgzeroExtension } from './pgzero/contract'
import { hasTurtleExtension } from './turtle/contract'

/** Python extensions that own the execution canvas. At most one per project. */
export type PythonCanvasExtension = 'python-turtle' | 'python-pgzero'
export const PYTHON_CANVAS_EXTENSIONS: readonly PythonCanvasExtension[] = [
  'python-turtle',
  'python-pgzero',
]

export function pythonCanvasExtension(
  extensions: readonly { id: string; version: string }[],
): PythonCanvasExtension | undefined {
  const turtle = hasTurtleExtension(extensions)
  const pgzero = hasPgzeroExtension(extensions)
  if (turtle && pgzero)
    throw new Error('Turtle e Pygame Zero usam a mesma tela: escolha só uma das duas extensões.')
  return turtle ? 'python-turtle' : pgzero ? 'python-pgzero' : undefined
}
export function isPythonCanvasExtension(value: unknown): value is PythonCanvasExtension {
  return value === 'python-turtle' || value === 'python-pgzero'
}

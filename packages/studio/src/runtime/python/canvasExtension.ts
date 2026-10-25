import { hasPgzeroExtension } from './pgzero/contract'
import { hasPygameExtension } from './pygame/contract'
import { hasTurtleExtension } from './turtle/contract'

/** Python extensions that own the execution canvas. At most one per project. */
export type PythonCanvasExtension = 'python-turtle' | 'python-pgzero' | 'python-pygame'
export const PYTHON_CANVAS_EXTENSIONS: readonly PythonCanvasExtension[] = [
  'python-turtle',
  'python-pgzero',
  'python-pygame',
]

export function pythonCanvasExtension(
  extensions: readonly { id: string; version: string }[],
): PythonCanvasExtension | undefined {
  const turtle = hasTurtleExtension(extensions)
  const pgzero = hasPgzeroExtension(extensions)
  const pygame = hasPygameExtension(extensions)
  if (Number(turtle) + Number(pgzero) + Number(pygame) > 1)
    throw new Error('Turtle, Pygame Zero e Pygame-ce usam a mesma tela: escolha só uma extensão.')
  return turtle ? 'python-turtle' : pgzero ? 'python-pgzero' : pygame ? 'python-pygame' : undefined
}
export function isPythonCanvasExtension(value: unknown): value is PythonCanvasExtension {
  return value === 'python-turtle' || value === 'python-pgzero' || value === 'python-pygame'
}

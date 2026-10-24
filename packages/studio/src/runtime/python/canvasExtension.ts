import { hasPgzeroExtension } from './pgzero/contract'
import { RAYLIB_2D_EXTENSION, RAYLIB_3D_EXTENSION } from './raylib/contract'
import { hasTurtleExtension } from './turtle/contract'

/** Python extensions that own the execution canvas. At most one per project. */
export type PythonCanvasExtension =
  | 'python-turtle'
  | 'python-pgzero'
  | 'python-raylib-2d'
  | 'python-raylib-3d'
export const PYTHON_CANVAS_EXTENSIONS: readonly PythonCanvasExtension[] = [
  'python-turtle',
  'python-pgzero',
  'python-raylib-2d',
  'python-raylib-3d',
]
/** Names the learner sees, for the "only one canvas extension" message. */
export const PYTHON_CANVAS_EXTENSION_NAMES: Readonly<Record<PythonCanvasExtension, string>> = {
  'python-turtle': 'Turtle',
  'python-pgzero': 'Pygame Zero',
  'python-raylib-2d': 'Raylib 2D',
  'python-raylib-3d': 'Raylib 3D',
}

const installed = (
  extensions: readonly { id: string; version: string }[],
  extension: { id: string; version: string },
) => extensions.some((entry) => entry.id === extension.id && entry.version === extension.version)

export function pythonCanvasExtension(
  extensions: readonly { id: string; version: string }[],
): PythonCanvasExtension | undefined {
  const found: PythonCanvasExtension[] = []
  if (hasTurtleExtension(extensions)) found.push('python-turtle')
  if (hasPgzeroExtension(extensions)) found.push('python-pgzero')
  if (installed(extensions, RAYLIB_2D_EXTENSION)) found.push('python-raylib-2d')
  if (installed(extensions, RAYLIB_3D_EXTENSION)) found.push('python-raylib-3d')
  if (found.length > 1)
    throw new Error(
      `${found.map((id) => PYTHON_CANVAS_EXTENSION_NAMES[id]).join(' e ')} usam a mesma tela: escolha só uma dessas extensões.`,
    )
  return found[0]
}
export function isPythonCanvasExtension(value: unknown): value is PythonCanvasExtension {
  return (PYTHON_CANVAS_EXTENSIONS as readonly unknown[]).includes(value)
}

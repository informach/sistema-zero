import {
  PYTHON_CANVAS_EXTENSION_NAMES,
  PYTHON_CANVAS_EXTENSIONS,
  type PythonCanvasExtension,
} from './canvasExtensionContract'
import { hasPgzeroExtension } from './pgzero/contract'
import { hasPygameExtension } from './pygame/contract'
import { RAYLIB_2D_EXTENSION, RAYLIB_3D_EXTENSION } from './raylib/contract'
import { hasTurtleExtension } from './turtle/contract'

export {
  PYTHON_CANVAS_EXTENSION_NAMES,
  PYTHON_CANVAS_EXTENSIONS,
  type PythonCanvasExtension,
} from './canvasExtensionContract'

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
  if (hasPygameExtension(extensions)) found.push('python-pygame')
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

import { PGZERO_EXTENSION } from './pgzero/contract'
import { PYGAME_EXTENSION } from './pygame/contract'
import { RAYLIB_2D_EXTENSION, RAYLIB_3D_EXTENSION } from './raylib/contract'
import { TURTLE_EXTENSION } from './turtle/contract'

/** Metadata shared by the gallery, authoring policy and worker, without execution code. */
export const PYTHON_CANVAS_EXTENSIONS = [
  TURTLE_EXTENSION.id,
  PGZERO_EXTENSION.id,
  PYGAME_EXTENSION.id,
  RAYLIB_2D_EXTENSION.id,
  RAYLIB_3D_EXTENSION.id,
] as const
export type PythonCanvasExtension = (typeof PYTHON_CANVAS_EXTENSIONS)[number]
export const PYTHON_CANVAS_EXTENSION_NAMES: Readonly<Record<PythonCanvasExtension, string>> = {
  'python-turtle': 'Turtle',
  'python-pgzero': 'Pygame Zero',
  'python-pygame': 'Pygame-ce',
  'python-raylib-2d': 'Raylib 2D',
  'python-raylib-3d': 'Raylib 3D',
}

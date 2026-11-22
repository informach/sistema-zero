import {
  PYTHON_PINTA_REGIONS_FEATURE,
  PYTHON_PINTA_SCENE_MODULE_PATHS,
  type StudioPythonRuntimeFeature,
} from '@sistemazero/core/studio/python-runtime-features'
import { pythonCanvasExtension } from './canvasExtension'
import type { PythonCanvasExtension } from './canvasExtensionContract'

export type PythonPintaScenesCanvas = keyof typeof PYTHON_PINTA_SCENE_MODULE_PATHS

export function isPythonPintaScenesCanvas(
  id: string | null | undefined,
): id is PythonPintaScenesCanvas {
  return id != null && Object.hasOwn(PYTHON_PINTA_SCENE_MODULE_PATHS, id)
}

export function supportsPythonPintaScenes(
  extensions: readonly { id: string; version: string }[],
  features: readonly StudioPythonRuntimeFeature[] | undefined,
): PythonPintaScenesCanvas | undefined {
  if (!features?.includes(PYTHON_PINTA_REGIONS_FEATURE)) return undefined
  const canvas: PythonCanvasExtension | undefined = pythonCanvasExtension(extensions)
  return isPythonPintaScenesCanvas(canvas) ? canvas : undefined
}

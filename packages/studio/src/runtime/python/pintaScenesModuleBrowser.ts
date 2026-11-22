import {
  PYTHON_PINTA_SCENE_MODULE_MAX_BYTES,
  PYTHON_PINTA_SCENE_MODULE_PATHS,
} from '@sistemazero/core/studio/python-runtime-features'
import type { PythonCanvasExtension } from './canvasExtensionContract'
import { isPythonPintaScenesCanvas, type PythonPintaScenesCanvas } from './pintaScenesContract'
import { fetchPythonWebBytes, pythonWebBytesSha256 } from './webFiles'

export type PintaSceneArtifactPins = Record<
  PythonPintaScenesCanvas,
  { bytes: number; sha256: string }
>

/** Build-time only. Unbundled consumers and default distributions have no provider. */
declare const __STUDIO_PINTA_SCENE_ARTIFACTS__: PintaSceneArtifactPins | null | undefined
const pins =
  typeof __STUDIO_PINTA_SCENE_ARTIFACTS__ === 'undefined' ? null : __STUDIO_PINTA_SCENE_ARTIFACTS__

export async function loadBrowserPintaScenesModule(
  canvas: PythonCanvasExtension,
  base: URL,
  signal: AbortSignal,
) {
  if (!isPythonPintaScenesCanvas(canvas) || !pins) return undefined
  const expected = pins[canvas]
  const file = PYTHON_PINTA_SCENE_MODULE_PATHS[canvas]
  const bytes = await fetchPythonWebBytes(
    new URL(file, base),
    Math.min(expected.bytes, PYTHON_PINTA_SCENE_MODULE_MAX_BYTES),
    signal,
  )
  if (
    bytes.byteLength !== expected.bytes ||
    (await pythonWebBytesSha256(bytes)) !== expected.sha256
  )
    throw new Error('O módulo de cenários do Pinta não corresponde à distribuição Python.')
  signal.throwIfAborted()
  return bytes
}

import {
  PYTHON_PINTA_SCENE_MODULE_MAX_BYTES,
  PYTHON_PINTA_SCENE_MODULE_PATHS,
} from '@sistemazero/core/studio/python-runtime-features'
import type { PythonCanvasExtension } from './canvasExtensionContract'
import { isPythonPintaScenesCanvas, type PythonPintaScenesCanvas } from './pintaScenesContract'
import { fetchPythonWebBytes } from './webFiles'

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
  if (bytes.byteLength !== expected.bytes) incompatible()
  signal.throwIfAborted()
  return { bytes, sha256: expected.sha256 }
}

type CapturedPintaScenesModule = Awaited<ReturnType<typeof loadBrowserPintaScenesModule>>

function incompatible(): never {
  throw new Error('O módulo de cenários do Pinta não corresponde à distribuição Python.')
}

/** Opaque worker origins have no SubtleCrypto. The trusted CPython stdlib hashes a bounded
 * temporary file off sys.path before the project is mounted. */
export function installablePintaScenesSources(
  runtime: {
    FS: {
      mkdirTree(path: string): void
      writeFile(path: string, bytes: Uint8Array): void
      unlink(path: string): void
      analyzePath(path: string): { exists: boolean }
    }
    runPython(source: string): unknown
  },
  sources: ReadonlyMap<string, Uint8Array<ArrayBuffer>>,
  artifact: CapturedPintaScenesModule,
) {
  if (!artifact) return sources
  const directory = '/studio'
  const temporary = `${directory}/pinta-scene-source.bin`
  runtime.FS.mkdirTree(directory)
  try {
    runtime.FS.writeFile(temporary, artifact.bytes)
    const actual = runtime.runPython(
      `__import__('hashlib').sha256(__import__('pathlib').Path(${JSON.stringify(temporary)}).read_bytes()).hexdigest()`,
    )
    if (actual !== artifact.sha256) incompatible()
    return new Map([...sources, ['pinta.py', artifact.bytes]])
  } finally {
    if (runtime.FS.analyzePath(temporary).exists) runtime.FS.unlink(temporary)
  }
}

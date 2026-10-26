import { loadPythonExtensionFiles } from '../extensionFiles'
import { RAYLIB_MODULE_FILES } from './contract'

/** Closed, immutable extension sources; never accepts a project filename or executable URL. */
export function loadRaylibModuleSources(
  base: URL,
  signal?: AbortSignal,
): Promise<ReadonlyMap<string, Uint8Array<ArrayBuffer>>> {
  return loadPythonExtensionFiles({
    base: new URL('raylib/', base),
    files: RAYLIB_MODULE_FILES,
    maximum: 2 * 1024 * 1024,
    label: 'do Raylib',
    signal,
  })
}

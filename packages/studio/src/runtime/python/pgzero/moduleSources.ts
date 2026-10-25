import { loadPythonExtensionFiles } from '../extensionFiles'
import { PGZERO_MODULE_FILES } from './contract'

/** Closed, immutable extension sources; never accepts a project filename or executable URL. */
export function loadPgzeroModuleSources(
  base: URL,
  signal?: AbortSignal,
): Promise<ReadonlyMap<string, Uint8Array<ArrayBuffer>>> {
  return loadPythonExtensionFiles({
    base: new URL('pgzero/', base),
    files: PGZERO_MODULE_FILES,
    maximum: 2 * 1024 * 1024,
    label: 'do Pygame Zero',
    signal,
  })
}

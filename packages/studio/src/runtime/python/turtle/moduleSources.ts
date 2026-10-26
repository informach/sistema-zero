import { loadPythonExtensionFiles } from '../extensionFiles'
import { TURTLE_MODULE_FILES } from './contract'

/** Closed, immutable extension sources; never accepts a project filename or executable URL. */
export function loadTurtleModuleSources(
  base: URL,
  signal?: AbortSignal,
): Promise<ReadonlyMap<string, Uint8Array<ArrayBuffer>>> {
  return loadPythonExtensionFiles({
    base: new URL('turtle/', base),
    files: TURTLE_MODULE_FILES,
    maximum: 1024 * 1024,
    label: 'da extensão Turtle',
    signal,
  })
}

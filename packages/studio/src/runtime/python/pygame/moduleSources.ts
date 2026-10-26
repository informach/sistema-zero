import { loadPythonExtensionFiles } from '../extensionFiles'
import { PYGAME_CE_WHEEL, PYGAME_MODULE_FILES } from './contract'

/** The host bridge and pinned pygame-ce wheel, loaded as one immutable, bounded batch. */
export async function loadPygameModuleSources(
  base: URL,
  signal?: AbortSignal,
): Promise<{
  sources: ReadonlyMap<string, Uint8Array<ArrayBuffer>>
  wheel: Uint8Array<ArrayBuffer>
}> {
  const files = await loadPythonExtensionFiles({
    base,
    files: [PYGAME_CE_WHEEL.file, ...PYGAME_MODULE_FILES.map((filename) => `pygame/${filename}`)],
    maximum: (filename) =>
      filename === PYGAME_CE_WHEEL.file
        ? PYGAME_CE_WHEEL.bytes
        : filename.endsWith('.ttf')
          ? 1024 * 1024
          : 256 * 1024,
    label: 'do Pygame-ce',
    signal,
  })
  const wheel = files.get(PYGAME_CE_WHEEL.file)!
  if (wheel.byteLength !== PYGAME_CE_WHEEL.bytes)
    throw new Error('O pacote do Pygame-ce não corresponde à distribuição aprovada.')
  return {
    sources: new Map(
      PYGAME_MODULE_FILES.map((filename) => [filename, files.get(`pygame/${filename}`)!]),
    ),
    wheel,
  }
}

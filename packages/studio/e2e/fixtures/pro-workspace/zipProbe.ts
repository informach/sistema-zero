import { strFromU8, unzipSync } from 'fflate'
import { zipFiles } from '../../../src/export/zip'

/** Browser-only fixture: exercise the production worker, not a mocked compressor. */
export async function zipProbe(cancel: boolean) {
  const text = 'export const ação = "🙂"\r\n'.repeat(750)
  const binary = Uint8Array.from({ length: 200_000 }, (_, index) => index % 251)
  const files = Object.fromEntries(Array.from({ length: 80 }, (_, i) => [`src/file-${i}.ts`, text]))
  const controller = new AbortController()
  const started = performance.now()
  const pending = zipFiles({ ...files, 'public/model.bin': binary }, { signal: controller.signal })
  if (cancel) controller.abort(new Error('cancelled'))
  try {
    const bytes = await pending
    const elapsed = performance.now() - started
    const result = unzipSync(bytes)
    return {
      elapsed,
      files: Object.keys(result).length,
      valid:
        Object.keys(files).every((path) => strFromU8(result[path]!) === text) &&
        result['public/model.bin']?.every((value, index) => value === binary[index]),
      inputBytes: binary.byteLength,
      cancelled: false,
    }
  } catch (error) {
    if (!cancel || !(error instanceof Error) || error.message !== 'cancelled') throw error
    return { cancelled: true, inputBytes: binary.byteLength }
  }
}

/** Python source/media budget, independent of the historical JavaScript upload policy.
 * Decoder resolution/PCM budgets belong to the selected runtime extension as well.
 */
export const STUDIO_PYTHON_MATERIAL_LIMITS = Object.freeze({
  version: 1,
  snapshotBytes: 32 * 1024 * 1024,
  imageBytes: 16 * 1024 * 1024,
  audioBytes: 32 * 1024 * 1024,
  totalBytes: 32 * 1024 * 1024,
})
const encodedChars = (bytes: number) => Math.ceil(bytes / 3) * 4 + 256
export const STUDIO_PYTHON_MATERIAL_DATA_LIMITS = Object.freeze({
  maxAssetDataUrlChars: encodedChars(STUDIO_PYTHON_MATERIAL_LIMITS.imageBytes),
  maxAudioDataUrlChars: encodedChars(STUDIO_PYTHON_MATERIAL_LIMITS.audioBytes),
  maxAssetsTotalChars: encodedChars(STUDIO_PYTHON_MATERIAL_LIMITS.totalBytes) + 128 * 256,
})

import { GltfInputError } from './gltfInput'
import { RasterInputError } from './rasterInput'

/** Preserve the format boundary and complete cause chain; unrelated programming errors are not translated. */
export function withGltfRasterErrors<T>(read: () => T): T {
  try {
    return read()
  } catch (error) {
    if (!(error instanceof RasterInputError)) throw error
    throw new GltfInputError(error.reason, error.path, error.message, { cause: error })
  }
}

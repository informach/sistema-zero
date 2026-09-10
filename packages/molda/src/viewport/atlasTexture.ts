import { RgbaTexture } from './rgbaTexture'

/** Square atlas compatibility facade; rectangular scene images share the same upload lifecycle. */
export class AtlasTexture extends RgbaTexture {
  constructor(
    pixels: Uint8Array,
    readonly size: number,
  ) {
    super(pixels, size, size)
  }
}

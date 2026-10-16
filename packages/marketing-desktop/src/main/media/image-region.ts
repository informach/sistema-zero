import { writeFile } from 'node:fs/promises'
import { type ImageRegion, imageRegionSchema } from '@sistemazero/marketing-contracts'
import sharp from 'sharp'
import { readImageInput } from './image-input'

async function oriented(source: string) {
  // A derivative is normalized; the original remains immutable, including EXIF orientation.
  return sharp(await readImageInput(source), { limitInputPixels: 40_000_000, failOn: 'warning' })
    .autoOrient()
    .png()
    .toBuffer()
}
function pixels(region: ImageRegion, width: number, height: number) {
  const value = imageRegionSchema.parse(region),
    left = Math.floor(value.x * width),
    top = Math.floor(value.y * height)
  return {
    left,
    top,
    width: Math.max(1, Math.min(width - left, Math.round(value.width * width))),
    height: Math.max(1, Math.min(height - top, Math.round(value.height * height))),
  }
}
export async function cropRegion(source: string, region: ImageRegion, destination: string) {
  const original = await oriented(source),
    metadata = await sharp(original).metadata()
  const cropped = await sharp(original)
    .extract(pixels(region, metadata.width, metadata.height))
    .png()
    .toBuffer()
  await writeFile(destination, cropped)
}
/** Pixels outside the requested rectangle come from the original, never from the AI response. */
export async function mergeRegion(source: string, region: ImageRegion, generated: Buffer) {
  const original = await oriented(source),
    metadata = await sharp(original).metadata(),
    rectangle = pixels(region, metadata.width, metadata.height)
  const base = await sharp(original).toColourspace('srgb').ensureAlpha().raw().toBuffer()
  const replacement = await sharp(generated, { limitInputPixels: 40_000_000, failOn: 'warning' })
    .autoOrient()
    .resize(rectangle.width, rectangle.height, { fit: 'fill' })
    .toColourspace('srgb')
    .ensureAlpha()
    .raw()
    .toBuffer()
  for (let row = 0; row < rectangle.height; row++)
    replacement.copy(
      base,
      ((rectangle.top + row) * metadata.width + rectangle.left) * 4,
      row * rectangle.width * 4,
      (row + 1) * rectangle.width * 4,
    )
  return sharp(base, { raw: { width: metadata.width, height: metadata.height, channels: 4 } })
    .png()
    .toBuffer()
}

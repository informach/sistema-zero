import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { MAX_VIDEO_VISUAL_IMAGE_BYTES, MAX_VISUAL_IMAGES } from '../visual-input-limits'
import { readImageInput } from './image-input'

/** Provider-only views: keep source identity, aspect ratio and original bytes untouched. */
export async function prepareVideoVisualImages(
  files: string[],
  directory: string,
  signal: AbortSignal,
) {
  if (files.length > MAX_VISUAL_IMAGES) throw new Error('Há fontes visuais demais neste pedido')
  const results: string[] = []
  for (const [index, file] of files.entries()) {
    signal.throwIfAborted()
    if ((await stat(file)).size <= MAX_VIDEO_VISUAL_IMAGE_BYTES) {
      results.push(file)
      continue
    }
    const bytes = await readImageInput(file)
    let view: Buffer | undefined
    for (const edge of [1536, 1024, 768, 512]) {
      signal.throwIfAborted()
      const resized = await sharp(bytes, { failOn: 'warning', limitInputPixels: 40_000_000 })
        .resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer()
      if (resized.length <= MAX_VIDEO_VISUAL_IMAGE_BYTES) {
        view = resized
        break
      }
    }
    if (!view) throw new Error('Não foi possível preparar a referência visual dentro do limite')
    signal.throwIfAborted()
    const folder = path.join(directory, 'visual-input')
    await mkdir(folder, { recursive: true })
    const output = path.join(folder, `${index}.webp`)
    await writeFile(output, view)
    results.push(output)
  }
  signal.throwIfAborted()
  return results
}

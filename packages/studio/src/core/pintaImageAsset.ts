import {
  type PintaImageDerivation,
  PintaImageDerivationSchema,
} from '@sistemazero/core/studio/pinta-image'
import { decodeProjectAsset, digestAssetBytes, isSvgDataUrl } from './assetBinary'
import type { ProjectAsset } from './projectAssets'

type ImageBinding = {
  pintaImage?: unknown
  kind?: unknown
  source?: unknown
  libId?: unknown
  libOrigin?: unknown
  dataUrl?: unknown
  width?: unknown
  height?: unknown
  proPath?: unknown
  sprite?: unknown
  tileset?: unknown
  tilemap?: unknown
}

/** The captured bytes keep the format the recipe asked for, and so does the Python file. */
const OUTPUT_DATA_URL: Readonly<
  Record<PintaImageDerivation['output']['mime'], (dataUrl: string) => boolean>
> = {
  'image/png': (dataUrl) => dataUrl.startsWith('data:image/png;base64,'),
  'image/svg+xml': isSvgDataUrl,
}
const OUTPUT_EXTENSION: Readonly<Record<PintaImageDerivation['output']['mime'], RegExp>> = {
  'image/png': /\.png$/i,
  'image/svg+xml': /\.svg$/i,
}

/** Integer root size, exactly as Pinta writes it (`<svg ... width="W" height="H" viewBox=...>`). */
function svgRootSize(bytes: Uint8Array): { width: number; height: number } | null {
  const head = new TextDecoder().decode(bytes.subarray(0, 65536))
  const root = /^<svg\b[^>]*>/.exec(head)?.[0]
  const width = root && /\swidth="(\d+)"/.exec(root)?.[1]
  const height = root && /\sheight="(\d+)"/.exec(root)?.[1]
  return width && height && /\sviewBox="/.test(root)
    ? { width: Number(width), height: Number(height) }
    : null
}

/** Recipe is durable content: invalid or incompatible metadata must never be silently stripped. */
export function readPintaImageAssetMetadata(asset: ImageBinding): PintaImageDerivation | undefined {
  if (asset.pintaImage === undefined) return undefined
  const metadata = PintaImageDerivationSchema.parse(asset.pintaImage)
  if (
    asset.kind !== 'image' ||
    asset.source !== 'library' ||
    asset.libOrigin !== 'pinta' ||
    asset.libId !== `personal:${metadata.recipe.drawingId}` ||
    typeof asset.dataUrl !== 'string' ||
    !OUTPUT_DATA_URL[metadata.output.mime](asset.dataUrl) ||
    asset.width !== metadata.output.width ||
    asset.height !== metadata.output.height ||
    (asset.proPath !== undefined &&
      (typeof asset.proPath !== 'string' ||
        !OUTPUT_EXTENSION[metadata.output.mime].test(asset.proPath))) ||
    asset.sprite !== undefined ||
    asset.tileset !== undefined ||
    asset.tilemap !== undefined
  )
    throw new Error(
      'A receita do Pinta não corresponde à imagem capturada. O original foi preservado.',
    )
  return metadata
}

/** The normal material decoder/digest supplies exact bytes; no image decoder or source lookup. */
export function assertPintaImageAssetBytes(
  asset: ProjectAsset,
  bytes: Uint8Array,
  sha256: string,
): void {
  const metadata = readPintaImageAssetMetadata(asset)
  if (!metadata) return
  const output = metadata.output
  if (output.mime === 'image/svg+xml') {
    const size = svgRootSize(bytes)
    if (
      !size ||
      size.width !== output.width ||
      size.height !== output.height ||
      bytes.byteLength !== output.bytes ||
      sha256 !== output.sha256
    )
      throw new Error(
        'Os bytes do desenho vetorial não correspondem à receita do Pinta. O original foi preservado.',
      )
    return
  }
  if (
    bytes.byteLength < 33 ||
    ![137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)
  )
    throw new Error('O material derivado do Pinta precisa conter os bytes PNG capturados.')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (
    view.getUint32(8) !== 13 ||
    view.getUint32(12) !== 0x49484452 ||
    view.getUint32(16) !== output.width ||
    view.getUint32(20) !== output.height ||
    bytes.byteLength !== output.bytes ||
    sha256 !== output.sha256
  )
    throw new Error(
      'Os bytes da imagem não correspondem à receita do Pinta. O original foi preservado.',
    )
}

/** Used at project read, not per source keystroke. The caller has already copied its document. */
export async function assertPintaImageAssets(assets: readonly ProjectAsset[]): Promise<void> {
  for (const asset of assets) {
    if (asset.pintaImage === undefined) continue
    const { bytes } = decodeProjectAsset(asset.dataUrl)
    assertPintaImageAssetBytes(asset, bytes, await digestAssetBytes(bytes))
  }
}

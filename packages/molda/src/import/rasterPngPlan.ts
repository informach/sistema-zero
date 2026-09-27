import { crc32 } from '../export/png'
import { SCENE_LIMITS } from '../scene/limits'
import {
  checkRasterByteBudget,
  RASTER_INPUT_LIMITS,
  RasterInputError,
  rasterChoice,
  requireRaster,
} from './rasterInput'
import { rasterPngPasses } from './rasterPngPasses'

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]

/** Bounded transient views, not a persistent image. No compressed ancillary data is opened. */
export function planRasterPng(bytes: Uint8Array, path = 'image') {
  checkRasterByteBudget(bytes.byteLength, path)
  if (!(bytes.buffer instanceof ArrayBuffer))
    throw new RasterInputError(
      'unsupported',
      path,
      'A imagem precisa de memória não compartilhada.',
    )
  requireRaster(
    bytes.length >= 33 && SIGNATURE.every((byte, i) => bytes[i] === byte),
    path,
    'A assinatura PNG está incompleta ou incorreta.',
  )
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  requireRaster(
    view.getUint32(8) === 13 && view.getUint32(12) === 0x49484452,
    path,
    'O primeiro chunk PNG precisa ser IHDR.',
  )
  const width = view.getUint32(16),
    height = view.getUint32(20)
  requireRaster(
    width > 0 && height > 0 && width <= 0x7fffffff && height <= 0x7fffffff,
    path,
    'As dimensões PNG são inválidas.',
  )
  if (width > SCENE_LIMITS.imageSide || height > SCENE_LIMITS.imageSide)
    throw new RasterInputError('budget', path, 'A textura ultrapassa 1024 pixels por lado.')
  const depth = rasterChoice(bytes[24], [1, 2, 4, 8, 16], path)
  const colorType = rasterChoice(bytes[25], [0, 2, 3, 4, 6], path)
  requireRaster(
    colorType === 0 || (colorType === 3 ? depth !== 16 : depth >= 8),
    path,
    'A profundidade não é válida para este tipo de cor PNG.',
  )
  if (bytes[26] !== 0 || bytes[27] !== 0 || (bytes[28] !== 0 && bytes[28] !== 1))
    throw new RasterInputError(
      'unsupported',
      path,
      'Este método de compressão, filtro ou interlace PNG não é suportado.',
    )
  const channels = colorType === 2 ? 3 : colorType === 4 ? 2 : colorType === 6 ? 4 : 1
  const layout = rasterPngPasses(width, height, channels * depth, bytes[28] === 1)
  const idat: Uint8Array[] = []
  let palette: Uint8Array | null = null,
    alpha: Uint8Array | null = null
  let transparent: number[] | null = null
  let sawData = false,
    endedData = false,
    ended = false,
    chunks = 0
  for (let offset = 8; offset < bytes.length; ) {
    if (++chunks > RASTER_INPUT_LIMITS.imageChunks)
      throw new RasterInputError('budget', path, 'A imagem PNG tem chunks demais.')
    requireRaster(offset + 12 <= bytes.length, path, 'O chunk PNG está incompleto.')
    const length = view.getUint32(offset),
      next = offset + length + 12
    requireRaster(
      length <= 0x7fffffff && next <= bytes.length,
      path,
      'O tamanho do chunk PNG é inválido.',
    )
    const type = view.getUint32(offset + 4)
    for (let i = offset + 4; i < offset + 8; i++) {
      const code = bytes[i]!
      requireRaster(
        (code >= 65 && code <= 90) || (code >= 97 && code <= 122),
        path,
        'O nome do chunk PNG é inválido.',
      )
    }
    requireRaster(
      crc32(bytes.subarray(offset + 4, next - 4)) === view.getUint32(next - 4),
      path,
      'O CRC de um chunk PNG não confere.',
    )
    const data = bytes.subarray(offset + 8, next - 4)
    if (sawData && type !== 0x49444154) endedData = true
    if (type === 0x49484452) {
      requireRaster(offset === 8, path, 'O PNG repete o cabeçalho IHDR.')
    } else if (type === 0x504c5445) {
      requireRaster(
        !sawData &&
          palette === null &&
          alpha === null &&
          transparent === null &&
          colorType !== 0 &&
          colorType !== 4,
        path,
        'A paleta PNG está repetida, fora de ordem ou não é permitida.',
      )
      requireRaster(
        length > 0 &&
          length % 3 === 0 &&
          length <= 768 &&
          (colorType !== 3 || length / 3 <= 2 ** depth),
        path,
        'O tamanho da paleta PNG é inválido.',
      )
      palette = data
    } else if (type === 0x74524e53) {
      requireRaster(
        !sawData && alpha === null && transparent === null && colorType !== 4 && colorType !== 6,
        path,
        'A transparência PNG está repetida, fora de ordem ou não é permitida.',
      )
      if (colorType === 3) {
        requireRaster(
          palette !== null && length <= palette.length / 3,
          path,
          'A transparência precisa caber na paleta PNG.',
        )
        alpha = data
      } else {
        requireRaster(
          length === (colorType === 0 ? 2 : 6),
          path,
          'O tamanho da transparência PNG é inválido.',
        )
        transparent = []
        for (let i = 0; i < length; i += 2)
          transparent.push(view.getUint16(offset + 8 + i) & (2 ** depth - 1))
      }
    } else if (type === 0x49444154) {
      requireRaster(
        !endedData && (colorType !== 3 || palette !== null),
        path,
        'IDATs precisam ser consecutivos e vir após a paleta quando ela é exigida.',
      )
      sawData = true
      idat.push(data)
    } else if (type === 0x49454e44) {
      requireRaster(
        sawData && length === 0 && next === bytes.length,
        path,
        'O final do PNG é inválido.',
      )
      ended = true
    } else if ((bytes[offset + 4]! & 32) === 0) {
      throw new RasterInputError(
        'unsupported',
        path,
        'O PNG contém um chunk crítico não suportado.',
      )
    }
    offset = next
  }
  requireRaster(ended, path, 'O PNG não tem um final completo.')
  return { width, height, depth, colorType, channels, palette, alpha, transparent, idat, ...layout }
}

export type RasterPngPlan = ReturnType<typeof planRasterPng>

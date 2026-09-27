import { SCENE_LIMITS } from '../scene/limits'
import { RasterInputError, requireRaster } from './rasterInput'

export function readRasterJpegFrame(data: Uint8Array, progressive: boolean, path: string) {
  requireRaster(data.length >= 6, path, 'O quadro JPEG está incompleto.')
  const precision = data[0],
    height = data[1]! * 256 + data[2]!,
    width = data[3]! * 256 + data[4]!,
    count = data[5]!
  requireRaster(data.length === 6 + count * 3, path, 'O quadro JPEG tem comprimento incorreto.')
  if (precision !== 8 || (count !== 1 && count !== 3))
    throw new RasterInputError(
      'unsupported',
      path,
      'Este JPEG precisa usar 8 bits e cinza ou RGB/YCbCr.',
    )
  requireRaster(width > 0 && height > 0, path, 'As dimensões JPEG precisam ser positivas.')
  if (width > SCENE_LIMITS.imageSide || height > SCENE_LIMITS.imageSide)
    throw new RasterInputError('budget', path, 'A textura ultrapassa 1024 pixels por lado.')
  const components = new Map<number, { h: number; v: number }>()
  let maxH = 0,
    maxV = 0
  for (let i = 6; i < data.length; i += 3) {
    const id = data[i]!,
      h = data[i + 1]! >> 4,
      v = data[i + 1]! & 15
    requireRaster(!components.has(id), path, 'O componente JPEG está repetido.')
    requireRaster(h >= 1 && h <= 4 && v >= 1 && v <= 4, path, 'A amostragem JPEG é inválida.')
    requireRaster(data[i + 2]! <= 3, path, 'A tabela de quantização JPEG é inválida.')
    components.set(id, { h, v })
    maxH = Math.max(maxH, h)
    maxV = Math.max(maxV, v)
  }
  return { width, height, progressive, components, maxH, maxV }
}

export type RasterJpegFrame = ReturnType<typeof readRasterJpegFrame>

/** Conservative padded sample visits, independent of encoded entropy size. */
export function rasterJpegScanWork(data: Uint8Array, frame: RasterJpegFrame, path: string) {
  const count = data[0]
  requireRaster(
    count !== undefined && count > 0 && count <= frame.components.size,
    path,
    'Scan JPEG inválido.',
  )
  requireRaster(data.length === 4 + count * 2, path, 'O scan JPEG tem comprimento incorreto.')
  const selected = new Set<number>()
  let blocksPerMcu = 0
  for (let i = 1; i <= count * 2; i += 2) {
    const id = data[i]!,
      component = frame.components.get(id),
      tables = data[i + 1]!
    requireRaster(
      component && !selected.has(id),
      path,
      'O scan JPEG repete ou desconhece um componente.',
    )
    requireRaster(tables >> 4 <= 3 && (tables & 15) <= 3, path, 'A tabela Huffman JPEG é inválida.')
    selected.add(id)
    blocksPerMcu += component.h * component.v
  }
  const start = data[data.length - 3]!,
    end = data[data.length - 2]!,
    high = data[data.length - 1]! >> 4,
    low = data[data.length - 1]! & 15
  requireRaster(
    frame.progressive
      ? start <= end &&
          end <= 63 &&
          (start === 0 ? end === 0 : count === 1) &&
          high <= 13 &&
          low <= 13 &&
          (high === 0 || high === low + 1)
      : start === 0 && end === 63 && high === 0 && low === 0,
    path,
    'Os parâmetros do scan JPEG são inválidos.',
  )
  requireRaster(count === 1 || blocksPerMcu <= 10, path, 'O scan JPEG tem blocos demais por MCU.')
  return (
    Math.ceil(frame.width / (8 * frame.maxH)) *
    Math.ceil(frame.height / (8 * frame.maxV)) *
    blocksPerMcu *
    64
  )
}

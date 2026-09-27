import {
  checkRasterByteBudget,
  RASTER_INPUT_LIMITS,
  RasterInputError,
  requireRaster,
} from './rasterInput'
import { type RasterJpegFrame, rasterJpegScanWork, readRasterJpegFrame } from './rasterJpegFrame'
import { rasterJpegMarkers } from './rasterJpegMarkers'
import { validateRasterJpegTables } from './rasterJpegTables'

/** Header/scan budgets, not a JPEG entropy validator. No pixels or ICC/EXIF parsing. */
export function planRasterJpeg(bytes: Uint8Array, path = 'image') {
  checkRasterByteBudget(bytes.byteLength, path)
  if (!(bytes.buffer instanceof ArrayBuffer))
    throw new RasterInputError(
      'unsupported',
      path,
      'A imagem precisa de memória não compartilhada.',
    )
  requireRaster(
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
    path,
    'A assinatura JPEG está incorreta.',
  )
  let frame: RasterJpegFrame | null = null,
    jfif = false,
    adobe: number | null = null,
    scans = 0,
    work = 0
  for (const { code, data } of rasterJpegMarkers(bytes, path)) {
    if (code >= 0xc0 && code <= 0xcf && code !== 0xc4) {
      if (code !== 0xc0 && code !== 0xc1 && code !== 0xc2)
        throw new RasterInputError(
          'unsupported',
          path,
          'Este modo de compressão JPEG não é suportado.',
        )
      requireRaster(frame === null, path, 'A imagem JPEG precisa ter um único quadro.')
      frame = readRasterJpegFrame(data, code === 0xc2, path)
    } else if (code === 0xda) {
      requireRaster(frame !== null, path, 'O scan JPEG precisa de um quadro anterior.')
      work += rasterJpegScanWork(data, frame, path)
      if (++scans > RASTER_INPUT_LIMITS.jpegScans || work > RASTER_INPUT_LIMITS.jpegScanSamples)
        throw new RasterInputError(
          'budget',
          path,
          'Os scans JPEG ultrapassam o limite de processamento.',
        )
    } else if (code === 0xe0 && [74, 70, 73, 70, 0].every((v, i) => data[i] === v)) {
      requireRaster(data.length >= 14, path, 'O cabeçalho JFIF está incompleto.')
      jfif = true
    } else if (code === 0xee && [65, 100, 111, 98, 101].every((v, i) => data[i] === v)) {
      requireRaster(data.length >= 12, path, 'O cabeçalho Adobe JPEG está incompleto.')
      requireRaster(
        adobe === null || adobe === data[11],
        path,
        'Os modos de cor Adobe são conflitantes.',
      )
      adobe = data[11]!
      if (data[5] !== 0 || adobe > 1)
        throw new RasterInputError(
          'unsupported',
          path,
          'Este modo de cor Adobe JPEG não é suportado.',
        )
    } else if (code === 0xdb || code === 0xc4) {
      validateRasterJpegTables(code, data, path)
    } else if (code === 0xdd) {
      requireRaster(data.length === 2, path, 'O intervalo de restart JPEG é inválido.')
    } else if (code !== 0xfe && (code < 0xe0 || code > 0xef)) {
      throw new RasterInputError('unsupported', path, 'Este segmento JPEG não é suportado.')
    }
  }
  requireRaster(frame !== null && scans > 0, path, 'A imagem JPEG precisa de quadro e pixels.')
  const ids = [...frame.components.keys()]
  // Same precedence as libjpeg: JFIF, Adobe, component IDs, then YCbCr default.
  // These markers specify component encoding, not an ICC transfer function.
  const colorTransform =
    frame.components.size === 3 &&
    (jfif || (adobe !== null ? adobe === 1 : ![82, 71, 66].every((id, i) => ids[i] === id)))
  return { width: frame.width, height: frame.height, colorTransform }
}

export type RasterJpegPlan = ReturnType<typeof planRasterJpeg>

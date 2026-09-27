import { requireRaster } from './rasterInput'

/** Validate framing before the codec can read beyond a segment or grow a tree. */
export function validateRasterJpegTables(code: number, data: Uint8Array, path: string): void {
  requireRaster(data.length > 0, path, 'O segmento JPEG precisa de uma tabela.')
  for (let offset = 0; offset < data.length; ) {
    const spec = data[offset++]!,
      kind = spec >> 4
    requireRaster(kind <= 1 && (spec & 15) <= 3, path, 'A identificação da tabela JPEG é inválida.')
    if (code === 0xdb) {
      const size = kind + 1
      requireRaster(
        offset + 64 * size <= data.length,
        path,
        'A tabela de quantização está incompleta.',
      )
      for (let i = 0; i < 64; i++, offset += size)
        requireRaster(
          data[offset]! * (size === 2 ? 256 : 1) + (size === 2 ? data[offset + 1]! : 0) > 0,
          path,
          'A quantização JPEG precisa ser positiva.',
        )
    } else {
      requireRaster(offset + 16 <= data.length, path, 'A tabela Huffman está incompleta.')
      let count = 0,
        slots = 1
      for (let i = 0; i < 16; i++) {
        const lengthCount = data[offset++]!
        count += lengthCount
        slots = slots * 2 - lengthCount
        requireRaster(
          slots > 0,
          path,
          'A árvore Huffman JPEG está excedida ou usa o código reservado.',
        )
      }
      requireRaster(
        count > 0 && count <= 256 && offset + count <= data.length,
        path,
        'Os símbolos Huffman estão incompletos.',
      )
      for (let i = 0; i < count; i++, offset++)
        requireRaster(
          kind === 0 ? data[offset]! <= 11 : (data[offset]! & 15) <= 10,
          path,
          'O símbolo Huffman não é válido para JPEG de 8 bits.',
        )
    }
  }
}

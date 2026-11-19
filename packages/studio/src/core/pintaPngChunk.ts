import { PINTA_IMAGE_DATA_KEYWORD } from '@sistemazero/core/studio/pinta-image'

/** The producer writes one compressed iTXt immediately after IHDR. No decompression here. */
export function pintaPngDataRange(bytes: Uint8Array): { start: number; end: number } | null {
  if (
    bytes.length < 45 ||
    ![137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)
  )
    return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.getUint32(8) !== 13 || view.getUint32(12) !== 0x49484452) return null
  const offset = 33,
    keyword = PINTA_IMAGE_DATA_KEYWORD,
    length = view.getUint32(offset)
  const end = offset + 8 + length
  if (
    view.getUint32(offset + 4) !== 0x69545874 ||
    length < keyword.length + 11 ||
    end + 4 > bytes.length
  )
    return null
  for (let i = 0; i < keyword.length; i++)
    if (bytes[offset + 8 + i] !== keyword.charCodeAt(i)) return null
  const flags = offset + 8 + keyword.length
  if (bytes[flags] !== 0 || bytes[flags + 1] !== 1 || bytes[flags + 2] !== 0) return null
  const languageEnd = bytes.indexOf(0, flags + 3)
  if (languageEnd < 0 || languageEnd >= end) return null
  const translatedEnd = bytes.indexOf(0, languageEnd + 1)
  if (translatedEnd < 0 || translatedEnd + 7 > end) return null
  return { start: translatedEnd + 1, end }
}

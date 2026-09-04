/**
 * Decodificador PNG INDEPENDENTE do escritor, só para os testes (RGBA 8 bits,
 * filtro None; qualquer outra coisa lança). Confere assinatura, CRC de cada
 * chunk e o tamanho do IDAT descomprimido.
 */
import { unzlibSync } from 'fflate'
import { crc32 } from '../export/png'

export interface DecodedPng {
  width: number
  height: number
  rgba: Uint8Array
}

export function decodePng(bytes: Uint8Array): DecodedPng {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  for (let i = 0; i < 8; i += 1) if (bytes[i] !== signature[i]) throw new Error('assinatura PNG')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let offset = 8
  let width = 0
  let height = 0
  const idat: Uint8Array[] = []
  let ended = false
  while (offset < bytes.length && !ended) {
    const length = view.getUint32(offset)
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8))
    const data = bytes.subarray(offset + 8, offset + 8 + length)
    const crc = view.getUint32(offset + 8 + length)
    if (crc !== crc32(bytes.subarray(offset + 4, offset + 8 + length)))
      throw new Error(`CRC ${type}`)
    if (type === 'IHDR') {
      width = view.getUint32(offset + 8)
      height = view.getUint32(offset + 12)
      if (data[8] !== 8 || data[9] !== 6) throw new Error('só RGBA 8 bits')
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') {
      ended = true
    }
    offset += 12 + length
  }
  const total = idat.reduce((sum, part) => sum + part.length, 0)
  const joined = new Uint8Array(total)
  let at = 0
  for (const part of idat) {
    joined.set(part, at)
    at += part.length
  }
  const raw = unzlibSync(joined)
  const stride = width * 4
  if (raw.length !== (stride + 1) * height) throw new Error('IDAT com tamanho errado')
  const rgba = new Uint8Array(stride * height)
  for (let y = 0; y < height; y += 1) {
    if (raw[y * (stride + 1)] !== 0) throw new Error('só filtro None')
    rgba.set(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), y * stride)
  }
  return { width, height, rgba }
}

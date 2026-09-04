/**
 * Decodificador RGBE INDEPENDENTE do escritor, só para os testes: cabeçalho,
 * resolução `-Y h +X w`, scanlines novas (RLE por canal) ou planas, e a
 * volta para float pela MESMA fórmula do `HDRLoader` do three
 * (`2^(e-128) / 255`).
 */
export interface DecodedHdr {
  width: number
  height: number
  rgbe: Uint8Array
  rgb: Float32Array
  headerLines: string[]
}

export function decodeRgbe(bytes: Uint8Array): DecodedHdr {
  let pos = 0
  const headerLines: string[] = []
  const readLine = (): string => {
    let end = pos
    while (end < bytes.length && bytes[end] !== 0x0a) end += 1
    const line = new TextDecoder().decode(bytes.subarray(pos, end))
    pos = end + 1
    return line
  }
  const magic = readLine()
  if (!magic.startsWith('#?')) throw new Error('assinatura')
  headerLines.push(magic)
  for (;;) {
    const line = readLine()
    if (line === '') break
    headerLines.push(line)
    if (pos >= bytes.length) throw new Error('cabeçalho sem fim')
  }
  const resolution = readLine()
  const match = /^-Y (\d+) \+X (\d+)$/.exec(resolution)
  if (!match) throw new Error(`resolução: ${resolution}`)
  const height = Number(match[1])
  const width = Number(match[2])
  const rgbe = new Uint8Array(width * height * 4)
  const useRle = width >= 8 && width <= 32767
  for (let y = 0; y < height; y += 1) {
    const lineStart = y * width * 4
    if (
      useRle &&
      bytes[pos] === 2 &&
      bytes[pos + 1] === 2 &&
      (((bytes[pos + 2] as number) << 8) | (bytes[pos + 3] as number)) === width
    ) {
      pos += 4
      for (let c = 0; c < 4; c += 1) {
        let x = 0
        while (x < width) {
          let count = bytes[pos] as number
          pos += 1
          if (count > 128) {
            count -= 128
            const value = bytes[pos] as number
            pos += 1
            if (x + count > width) throw new Error('run estoura a linha')
            for (let i = 0; i < count; i += 1) rgbe[lineStart + (x + i) * 4 + c] = value
          } else {
            if (count === 0 || x + count > width) throw new Error('literal inválido')
            for (let i = 0; i < count; i += 1)
              rgbe[lineStart + (x + i) * 4 + c] = bytes[pos + i] as number
            pos += count
          }
          x += count
        }
      }
    } else {
      rgbe.set(bytes.subarray(pos, pos + width * 4), lineStart)
      pos += width * 4
    }
  }
  if (pos !== bytes.length) throw new Error(`sobraram ${bytes.length - pos} bytes`)
  const rgb = new Float32Array(width * height * 3)
  for (let i = 0; i < width * height; i += 1) {
    const e = rgbe[i * 4 + 3] as number
    const scale = e === 0 ? 0 : 2 ** (e - 128) / 255
    rgb[i * 3] = (rgbe[i * 4] as number) * scale
    rgb[i * 3 + 1] = (rgbe[i * 4 + 1] as number) * scale
    rgb[i * 3 + 2] = (rgbe[i * 4 + 2] as number) * scale
  }
  return { width, height, rgbe, rgb, headerLines }
}

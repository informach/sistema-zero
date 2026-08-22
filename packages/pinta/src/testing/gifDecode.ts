/**
 * Decodificador de GIF89a **só para teste** — escrito a partir da especificação,
 * de propósito por um caminho diferente do codificador (`export/gif.ts`).
 *
 * Existe porque asserção de cabeçalho não prova nada num formato comprimido: um
 * GIF com o LZW embaralhado tem os mesmos primeiros bytes, o mesmo tamanho de
 * paleta e o mesmo terminador que um GIF certo — e só o decodificador de
 * verdade, na hora de mostrar para a criança, descobre. Aqui o teste fecha o
 * ciclo: codifica, decodifica e compara pixel a pixel.
 */

export interface DecodedGifFrame {
  indices: Uint8Array
  delayCs: number
  transparentIndex: number | null
  /** 1 = deixa como está, 2 = volta ao fundo. */
  disposal: number
}

export interface DecodedGif {
  version: string
  width: number
  height: number
  /** Tabela de cores global, já recortada no tamanho declarado. */
  palette: Array<[number, number, number]>
  /** A extensão NETSCAPE 2.0 estava presente. */
  loop: boolean
  frames: DecodedGifFrame[]
}

function lzwDecode(data: Uint8Array, minCodeSize: number, pixelCount: number): Uint8Array {
  const clearCode = 1 << minCodeSize
  const endCode = clearCode + 1
  let codeSize = minCodeSize + 1
  let dictionary: number[][] = []

  const reset = (): void => {
    dictionary = []
    for (let i = 0; i < clearCode; i += 1) dictionary.push([i])
    dictionary.push([], []) // clear + end ocupam lugar, nunca são expandidos
    codeSize = minCodeSize + 1
  }
  reset()

  const out = new Uint8Array(pixelCount)
  let written = 0
  let bitPos = 0
  const totalBits = data.length * 8

  const readCode = (): number => {
    let code = 0
    for (let i = 0; i < codeSize; i += 1) {
      const byte = data[bitPos >> 3] ?? 0
      code |= ((byte >> (bitPos & 7)) & 1) << i
      bitPos += 1
    }
    return code
  }

  let previous: number[] | null = null
  while (bitPos + codeSize <= totalBits) {
    const code = readCode()
    if (code === endCode) break
    if (code === clearCode) {
      reset()
      previous = null
      continue
    }
    let entry: number[]
    const known = dictionary[code]
    if (known !== undefined && code !== clearCode && code !== endCode) {
      entry = known
    } else if (previous && code === dictionary.length) {
      // O caso KwKwK: o codificador usou uma entrada no mesmo passo em que a criou.
      entry = [...previous, previous[0] as number]
    } else {
      throw new Error(`GIF: código ${code} fora do dicionário (tamanho ${dictionary.length})`)
    }
    for (const pixel of entry) {
      if (written >= out.length) throw new Error('GIF: pixels demais no quadro')
      out[written] = pixel
      written += 1
    }
    if (previous) {
      dictionary.push([...previous, entry[0] as number])
      if (dictionary.length === 1 << codeSize && codeSize < 12) codeSize += 1
    }
    previous = entry
  }
  if (written !== pixelCount) {
    throw new Error(`GIF: esperava ${pixelCount} pixels, decodifiquei ${written}`)
  }
  return out
}

export function decodeGif(bytes: Uint8Array): DecodedGif {
  let at = 0
  const u8 = (): number => {
    const value = bytes[at]
    if (value === undefined) throw new Error('GIF: acabou no meio')
    at += 1
    return value
  }
  const u16 = (): number => u8() | (u8() << 8)

  const signature = String.fromCharCode(u8(), u8(), u8())
  const version = String.fromCharCode(u8(), u8(), u8())
  if (signature !== 'GIF') throw new Error(`GIF: assinatura "${signature}"`)

  const width = u16()
  const height = u16()
  const packed = u8()
  u8() // índice de fundo
  u8() // proporção do pixel

  const palette: Array<[number, number, number]> = []
  if (packed & 0x80) {
    const size = 1 << ((packed & 0x07) + 1)
    for (let i = 0; i < size; i += 1) palette.push([u8(), u8(), u8()])
  }

  /** Junta os sub-blocos (tamanho + bytes, 0 encerra) num array só. */
  const readBlocks = (): number[] => {
    const out: number[] = []
    for (;;) {
      const size = u8()
      if (size === 0) return out
      for (let i = 0; i < size; i += 1) out.push(u8())
    }
  }

  const frames: DecodedGifFrame[] = []
  let loop = false
  let pendingDelay = 0
  let pendingTransparent: number | null = null
  let pendingDisposal = 0

  for (;;) {
    const marker = u8()
    if (marker === 0x3b) break

    if (marker === 0x21) {
      const label = u8()
      if (label === 0xf9) {
        const size = u8()
        if (size !== 4) throw new Error('GIF: controle gráfico com tamanho errado')
        const flags = u8()
        pendingDisposal = (flags >> 2) & 0x07
        pendingDelay = u16()
        const transparent = u8()
        pendingTransparent = flags & 0x01 ? transparent : null
        if (u8() !== 0) throw new Error('GIF: controle gráfico sem terminador')
        continue
      }
      if (label === 0xff) {
        const size = u8()
        let name = ''
        for (let i = 0; i < size; i += 1) name += String.fromCharCode(u8())
        readBlocks()
        if (name === 'NETSCAPE2.0') loop = true
        continue
      }
      readBlocks()
      continue
    }

    if (marker !== 0x2c) throw new Error(`GIF: marcador desconhecido 0x${marker.toString(16)}`)
    u16() // left
    u16() // top
    const frameWidth = u16()
    const frameHeight = u16()
    const framePacked = u8()
    if (framePacked & 0x80) throw new Error('GIF: tabela local não suportada aqui')
    if (framePacked & 0x40) throw new Error('GIF: entrelaçado não suportado aqui')
    const minCodeSize = u8()
    const data = Uint8Array.from(readBlocks())
    frames.push({
      indices: lzwDecode(data, minCodeSize, frameWidth * frameHeight),
      delayCs: pendingDelay,
      transparentIndex: pendingTransparent,
      disposal: pendingDisposal,
    })
  }

  return { version, width, height, palette, loop, frames }
}

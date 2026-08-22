import { describe, expect, test } from 'bun:test'
import { decodeGif } from '../testing/gifDecode'
import { encodeGif, type GifFrame, msToDelayCs } from './gif'

type Rgb = readonly [number, number, number]

const RED: Rgb = [255, 0, 0]
const GREEN: Rgb = [0, 255, 0]
const BLUE: Rgb = [0, 0, 255]

function frame(indices: number[], delayCs = 10): GifFrame {
  return { indices: Uint8Array.from(indices), delayCs }
}

describe('encodeGif — estrutura do arquivo', () => {
  test('cabeçalho 89a, tamanho e terminador', () => {
    const bytes = encodeGif({
      width: 2,
      height: 2,
      palette: [RED, GREEN],
      frames: [frame([0, 1, 1, 0])],
      transparentIndex: null,
      loop: true,
    })
    expect(String.fromCharCode(...bytes.slice(0, 6))).toBe('GIF89a')
    expect(bytes[bytes.length - 1]).toBe(0x3b)
    const gif = decodeGif(bytes)
    expect(gif.width).toBe(2)
    expect(gif.height).toBe(2)
  })

  test('a extensão NETSCAPE só existe quando a animação REPETE', () => {
    const base = {
      width: 1,
      height: 1,
      palette: [RED, GREEN],
      frames: [frame([0]), frame([1])],
      transparentIndex: null,
    }
    expect(decodeGif(encodeGif({ ...base, loop: true })).loop).toBe(true)
    // Sem a extensão o arquivo toca UMA vez e para — é o `loop: false` da animação.
    expect(decodeGif(encodeGif({ ...base, loop: false })).loop).toBe(false)
  })

  test('a tabela de cores cresce para a potência de 2 seguinte, preenchida com preto', () => {
    const gif = decodeGif(
      encodeGif({
        width: 1,
        height: 1,
        palette: [RED, GREEN, BLUE],
        frames: [frame([2])],
        transparentIndex: null,
        loop: false,
      }),
    )
    // 3 cores não é potência de 2: a tabela vai a 4 (o formato exige).
    expect(gif.palette).toHaveLength(4)
    expect(gif.palette.slice(0, 3)).toEqual([[...RED], [...GREEN], [...BLUE]])
    expect(gif.palette[3]).toEqual([0, 0, 0])
  })

  test('transparência liga a flag, grava o índice e pede descarte 2', () => {
    const gif = decodeGif(
      encodeGif({
        width: 2,
        height: 1,
        palette: [RED, GREEN],
        frames: [frame([0, 1])],
        transparentIndex: 0,
        loop: true,
      }),
    )
    expect(gif.frames[0]?.transparentIndex).toBe(0)
    // Descarte 2 = limpa antes do próximo quadro. Com 1 o desenho anterior
    // apareceria pelos buracos do seguinte (rastro).
    expect(gif.frames[0]?.disposal).toBe(2)
  })

  test('sem transparência o descarte é 1 e a flag fica desligada', () => {
    const gif = decodeGif(
      encodeGif({
        width: 2,
        height: 1,
        palette: [RED, GREEN],
        frames: [frame([0, 1])],
        transparentIndex: null,
        loop: true,
      }),
    )
    expect(gif.frames[0]?.transparentIndex).toBeNull()
    expect(gif.frames[0]?.disposal).toBe(1)
  })

  test('cada quadro leva o SEU tempo', () => {
    const gif = decodeGif(
      encodeGif({
        width: 1,
        height: 1,
        palette: [RED, GREEN],
        frames: [frame([0], 25), frame([1], 4), frame([0], 13)],
        transparentIndex: null,
        loop: true,
      }),
    )
    expect(gif.frames.map((f) => f.delayCs)).toEqual([25, 4, 13])
  })
})

describe('encodeGif — o LZW volta igual (ida e volta)', () => {
  test('quadros pequenos com repetição voltam pixel a pixel', () => {
    const frames = [
      frame([0, 0, 1, 1, 2, 2, 0, 0, 1]),
      frame([2, 2, 2, 2, 2, 2, 2, 2, 2]),
      frame([0, 1, 2, 0, 1, 2, 0, 1, 2]),
    ]
    const gif = decodeGif(
      encodeGif({
        width: 3,
        height: 3,
        palette: [RED, GREEN, BLUE],
        frames,
        transparentIndex: 0,
        loop: true,
      }),
    )
    expect(gif.frames).toHaveLength(3)
    gif.frames.forEach((decoded, i) => {
      expect(Array.from(decoded.indices)).toEqual(Array.from(frames[i]?.indices ?? []))
    })
  })

  test('paleta de 2 cores ainda codifica (o LZW do GIF não aceita código de 1 bit)', () => {
    const indices = Array.from({ length: 64 }, (_, i) => (i % 3 === 0 ? 1 : 0))
    const gif = decodeGif(
      encodeGif({
        width: 8,
        height: 8,
        palette: [RED, GREEN],
        frames: [frame(indices)],
        transparentIndex: null,
        loop: false,
      }),
    )
    expect(Array.from(gif.frames[0]?.indices ?? [])).toEqual(indices)
  })

  test('ruído grande atravessa o crescimento da largura de código e o reset do dicionário', () => {
    // 256 cores + 200×200 de ruído determinístico: passa dos 4096 códigos e força
    // o `clearCode` no meio do fluxo, o trecho que nenhum desenho pequeno exercita.
    const palette: Rgb[] = Array.from({ length: 256 }, (_, i) => [i, (i * 7) % 256, (i * 13) % 256])
    const size = 200
    const indices = new Uint8Array(size * size)
    let seed = 12345
    for (let i = 0; i < indices.length; i += 1) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      indices[i] = (seed >> 16) & 0xff
    }
    const bytes = encodeGif({
      width: size,
      height: size,
      palette,
      frames: [{ indices, delayCs: 10 }],
      transparentIndex: null,
      loop: true,
    })
    const gif = decodeGif(bytes)
    expect(Array.from(gif.frames[0]?.indices ?? [])).toEqual(Array.from(indices))
  })

  test('imagem grande e chapada passa dos sub-blocos de 255 bytes', () => {
    const indices = new Uint8Array(300 * 300).fill(1)
    const gif = decodeGif(
      encodeGif({
        width: 300,
        height: 300,
        palette: [RED, GREEN],
        frames: [{ indices, delayCs: 10 }],
        transparentIndex: null,
        loop: false,
      }),
    )
    expect(gif.frames[0]?.indices.every((v) => v === 1)).toBe(true)
    expect(gif.frames[0]?.indices).toHaveLength(300 * 300)
  })
})

describe('encodeGif — entradas impossíveis', () => {
  const ok = {
    width: 2,
    height: 2,
    palette: [RED, GREEN],
    frames: [frame([0, 1, 1, 0])],
    transparentIndex: null,
    loop: true,
  }

  test('recusa quadro com o número errado de pixels', () => {
    expect(() => encodeGif({ ...ok, frames: [frame([0, 1])] })).toThrow(/tamanho diferente/)
  })

  test('recusa paleta vazia ou acima de 256', () => {
    expect(() => encodeGif({ ...ok, palette: [] })).toThrow(/paleta/)
    const big: Rgb[] = Array.from({ length: 257 }, () => RED)
    expect(() => encodeGif({ ...ok, palette: big })).toThrow(/paleta/)
  })

  test('recusa índice transparente fora da tabela', () => {
    expect(() => encodeGif({ ...ok, transparentIndex: 9 })).toThrow(/transparente/)
  })

  test('⚠️ recusa PIXEL fora da tabela — mascarar viraria outra cor sem avisar', () => {
    // Medido antes da guarda: numa tabela de 4, o índice 5 saía como 1 e o 7
    // como 3, com o arquivo passando em qualquer asserção de cabeçalho.
    expect(() =>
      encodeGif({ ...ok, palette: [RED, GREEN, BLUE], frames: [frame([0, 1, 5, 2])] }),
    ).toThrow(/fora da tabela/)
  })

  test('o último índice VÁLIDO da tabela passa (a guarda não é estreita demais)', () => {
    // Paleta de 3 → tabela de 4 → o índice 3 existe (preto de preenchimento).
    const gif = decodeGif(
      encodeGif({ ...ok, palette: [RED, GREEN, BLUE], frames: [frame([0, 1, 2, 3])] }),
    )
    expect(Array.from(gif.frames[0]?.indices ?? [])).toEqual([0, 1, 2, 3])
  })

  test('recusa animação sem quadro nenhum', () => {
    expect(() => encodeGif({ ...ok, frames: [] })).toThrow(/sem quadros/)
  })
})

describe('msToDelayCs', () => {
  test('arredonda para centésimos', () => {
    expect(msToDelayCs(1000)).toBe(100)
    expect(msToDelayCs(125)).toBe(13)
  })

  test('nunca desce de 2 — navegador troca 0 e 1 por 10 e a animação trava', () => {
    expect(msToDelayCs(0)).toBe(2)
    expect(msToDelayCs(8)).toBe(2)
  })
})

import { RGBAFormat, SRGBColorSpace, type Texture, UnsignedByteType } from 'three'
import type { PixelsDaTextura } from './pintura'

function conferirDimensoes(largura: number, altura: number) {
  if (
    !Number.isSafeInteger(largura) ||
    !Number.isSafeInteger(altura) ||
    largura < 1 ||
    altura < 1 ||
    largura > 4096 ||
    altura > 4096 ||
    largura * altura > 8_388_608
  )
    throw Error('A imagem compilada excede o limite de pixels.')
}
function superficie(largura: number, altura: number) {
  conferirDimensoes(largura, altura)
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(largura, altura)
  if (typeof document === 'undefined')
    throw Error('A compilação de imagens precisa de um encoder Canvas2D.')
  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura
  return canvas
}

/** Lê a imagem já autorizada/decodificada. Não busca URLs nem altera a textura. */
export function pixelsDaTexturaCompilada(textura: Texture, sinal: AbortSignal): PixelsDaTextura {
  sinal.throwIfAborted()
  if (textura.colorSpace !== SRGBColorSpace)
    throw Error('A textura de chão precisa estar em sRGB antes da compilação.')
  const imagem = textura.image as {
      width?: number
      height?: number
      naturalWidth?: number
      naturalHeight?: number
      data?: unknown
    } | null,
    largura = imagem?.naturalWidth ?? imagem?.width ?? 0,
    altura = imagem?.naturalHeight ?? imagem?.height ?? 0
  conferirDimensoes(largura, altura)
  if (imagem?.data !== undefined) {
    if (
      !(imagem.data instanceof Uint8Array || imagem.data instanceof Uint8ClampedArray) ||
      imagem.data.length !== largura * altura * 4 ||
      textura.type !== UnsignedByteType ||
      textura.format !== RGBAFormat
    )
      throw Error('Os pixels da textura precisam ser RGBA de oito bits.')
    return { largura, altura, pixels: new Uint8Array(imagem.data), flipY: textura.flipY }
  }
  const canvas = superficie(largura, altura),
    ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw Error('Não consegui ler os pixels da textura de chão.')
  try {
    ctx.drawImage(imagem as CanvasImageSource, 0, 0)
    sinal.throwIfAborted()
    return {
      largura,
      altura,
      pixels: ctx.getImageData(0, 0, largura, altura).data,
      flipY: textura.flipY,
    }
  } catch (erro) {
    sinal.throwIfAborted()
    throw Error(
      `Não consegui ler a imagem de chão carregada: ${erro instanceof Error ? erro.message : 'imagem inválida'}`,
    )
  } finally {
    canvas.width = canvas.height = 1
  }
}

export async function codificarPngCompilado(
  imagem: Pick<PixelsDaTextura, 'largura' | 'altura' | 'pixels'>,
  sinal: AbortSignal,
): Promise<Uint8Array> {
  sinal.throwIfAborted()
  const { largura, altura, pixels } = imagem
  if (pixels.length !== largura * altura * 4)
    throw Error('Os pixels não correspondem à imagem compilada.')
  const canvas = superficie(largura, altura)
  try {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw Error('Não consegui criar o PNG compilado.')
    ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels), largura, altura), 0, 0)
    const blob =
      'convertToBlob' in canvas
        ? await canvas.convertToBlob({ type: 'image/png' })
        : await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
    sinal.throwIfAborted()
    if (blob?.type !== 'image/png') throw Error('O encoder não produziu uma imagem PNG.')
    const bytes = new Uint8Array(await blob.arrayBuffer())
    sinal.throwIfAborted()
    return bytes
  } finally {
    canvas.width = canvas.height = 1
  }
}

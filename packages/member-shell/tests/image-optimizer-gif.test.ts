import { describe, expect, mock, test } from 'bun:test'
import sharp from 'sharp'
// Caminho relativo de propósito: o codificador é interno ao Pinta (não está no
// exports map) e este teste existe justamente para casar as duas pontas — o GIF
// que a criança BAIXA do Pinta é o mesmo que ela ANEXA na comunidade.
import { encodeGif } from '../../pinta/src/export/gif'

// `server-only` lança fora do React Server — neutraliza para testar a lógica pura.
mock.module('server-only', () => ({}))

const { optimizeAnimatedGif, optimizeImage, optimizeUgcImage, UnsupportedImageError } =
  await import('../src/server/image-optimizer')

const T = [0, 0, 0] as const
const R = [255, 0, 0] as const
const G = [0, 255, 0] as const

/** GIF animado de 4×4 com `frames` quadros, saído do codificador REAL do Pinta. */
function pintaGif(frames = 3): Buffer {
  const quadro = (cor: number) =>
    Uint8Array.from([0, 0, 0, 0, 0, cor, cor, 0, 0, cor, cor, 0, 0, 0, 0, 0])
  return Buffer.from(
    encodeGif({
      width: 4,
      height: 4,
      palette: [T, R, G],
      frames: Array.from({ length: frames }, (_, i) => ({
        indices: quadro((i % 2) + 1),
        delayCs: 13,
      })),
      transparentIndex: 0,
      loop: true,
    }),
  )
}

describe('optimizeAnimatedGif', () => {
  test('o GIF do Pinta atravessa o re-encode com TODOS os quadros', async () => {
    const out = await optimizeAnimatedGif(pintaGif(3))
    expect(out.contentType).toBe('image/gif')
    expect(out.extension).toBe('gif')
    expect(out.width).toBe(4)
    expect(out.height).toBe(4)
    expect(out.frames).toBe(3)
    // E o que sai é um GIF animado de verdade, não só um cabeçalho certo.
    const meta = await sharp(out.buffer, { animated: true }).metadata()
    expect(meta.format).toBe('gif')
    expect(meta.pages).toBe(3)
    expect(meta.pageHeight).toBe(4)
  })

  test('⚠️ o caminho normal (WebP) MATARIA a animação — é por isso que o ramo existe', async () => {
    const webp = await optimizeImage(pintaGif(3), 'ugc')
    const meta = await sharp(webp.buffer, { animated: true }).metadata()
    expect(webp.contentType).toBe('image/webp')
    // Um quadro só: a animação sumiria em silêncio, com toast de sucesso.
    expect(meta.pages ?? 1).toBe(1)
  })

  test('recusa arquivo que não é GIF (mesmo se o cliente jurar que é)', async () => {
    const png = await sharp({
      create: { width: 4, height: 4, channels: 3, background: '#ff0000' },
    })
      .png()
      .toBuffer()
    expect(optimizeAnimatedGif(png)).rejects.toThrow(/não é um GIF/)
  })

  test('recusa GIF com quadros demais (bomba de quadro pequeno)', async () => {
    // Cada quadro cabe no limite de pixels sozinho; o perigo é a SOMA.
    expect(optimizeAnimatedGif(pintaGif(400))).rejects.toThrow(/quadros demais/)
  })

  test('lixo não vira arquivo: entrada indecifrável falha em vez de subir', async () => {
    expect(optimizeAnimatedGif(Buffer.from('isto não é imagem nenhuma'))).rejects.toThrow()
  })
})

describe('optimizeUgcImage — a REGRA que a feature existe para garantir', () => {
  test('⭐ gif preserva os quadros; o resto vira WebP', async () => {
    // Este é o teste que impede a regressão SILENCIOSA: apagar o ramo do GIF não
    // quebraria upload nenhum — o arquivo subiria certinho e só não animaria.
    const animado = await optimizeUgcImage(pintaGif(3), 'image/gif')
    expect(animado.contentType).toBe('image/gif')
    expect((await sharp(animado.buffer, { animated: true }).metadata()).pages).toBe(3)

    const png = await sharp({
      create: { width: 8, height: 8, channels: 3, background: '#00ff00' },
    })
      .png()
      .toBuffer()
    const parada = await optimizeUgcImage(png, 'image/png')
    expect(parada.contentType).toBe('image/webp')
  })

  test('mime desconhecido cai no caminho parado (não vira porta dos fundos p/ o gif)', async () => {
    const png = await sharp({
      create: { width: 8, height: 8, channels: 3, background: '#0000ff' },
    })
      .png()
      .toBuffer()
    expect((await optimizeUgcImage(png, 'imagem/qualquer')).contentType).toBe('image/webp')
  })
})

describe('UnsupportedImageError — culpa do arquivo, não do servidor', () => {
  test('as recusas conhecidas são tipadas (a rota devolve 400, não 500)', async () => {
    // Sem o tipo, isso caía no `mediaErrorResponse`: 500 + "Falha na operação de
    // mídia." para a criança e um alerta no Sentry para um arquivo ruim.
    for (const entrada of [pintaGif(400), Buffer.from('não é imagem')]) {
      const erro = await optimizeAnimatedGif(entrada).catch((e: unknown) => e)
      expect(erro).toBeInstanceOf(UnsupportedImageError)
      expect((erro as Error).message).toMatch(/GIF/)
    }
  })
})

import { describe, expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))

const { watermarkCacheKey } = await import('../src/lib/download-mime')
const { presignWatermarkedPdf } = await import('../src/server/private-delivery')
const { WatermarkUnavailableError } = await import('../src/server/watermark-error')
const { createGate } = await import('../src/server/watermark-queue')
type PresignedWatermarkIo = import('../src/server/private-delivery').PresignedWatermarkIo

const srcKey = 'admin/attachments/livro.pdf'
const email = 'comprador@example.com'
const cacheKey = watermarkCacheKey(srcKey, 'comprador-1', 'etag-1')
const bytes = (value: string) => new TextEncoder().encode(value)
const stream = (value: string) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes(value))
      controller.close()
    },
  })

function setup(opts: { cached?: boolean; watermarkFails?: boolean; putFails?: boolean } = {}) {
  const calls = { get: [] as string[], put: [] as string[], presign: [] as string[] }
  const io: PresignedWatermarkIo = {
    head: async (key) => (opts.cached && key === cacheKey ? { contentLength: 5 } : null),
    get: async (key) => {
      calls.get.push(key)
      return { body: stream('ORIGINAL') }
    },
    put: async ({ key, body }) => {
      calls.put.push(`${key}:${new TextDecoder().decode(body)}`)
      if (opts.putFails) throw new Error('R2 indisponível')
    },
    presign: async (key) => {
      calls.presign.push(key)
      return `https://r2.example/${key}`
    },
    watermark: async (input, buyer) => {
      if (opts.watermarkFails) throw new Error('PDF cifrado')
      return bytes(`MARCADO(${new TextDecoder().decode(input)}|${buyer})`)
    },
    gate: createGate(1),
  }
  return { io, calls }
}

const request = (io: PresignedWatermarkIo) =>
  presignWatermarkedPdf(
    {
      srcKey,
      srcEtag: 'etag-1',
      email,
      userId: 'comprador-1',
      responseContentDisposition: 'attachment',
    },
    io,
  )

describe('PDF grande com URL pré-assinada', () => {
  test('marca com o e-mail do comprador antes de assinar a cópia privada', async () => {
    const { io, calls } = setup()
    expect(await request(io)).toBe(`https://r2.example/${cacheKey}`)
    expect(calls.get).toEqual([srcKey])
    expect(calls.put).toEqual([`${cacheKey}:MARCADO(ORIGINAL|${email})`])
    expect(calls.presign).toEqual([cacheKey])
  })

  test('cache existente só assina a cópia marcada, sem abrir o original', async () => {
    const { io, calls } = setup({ cached: true })
    expect(await request(io)).toBe(`https://r2.example/${cacheKey}`)
    expect(calls.get).toEqual([])
    expect(calls.presign).toEqual([cacheKey])
  })

  test.each([
    { watermarkFails: true },
    { putFails: true },
  ])('falha no preparo bloqueia a assinatura do original: %p', async (options) => {
    const { io, calls } = setup(options)
    await expect(request(io)).rejects.toBeInstanceOf(WatermarkUnavailableError)
    expect(calls.presign).toEqual([])
  })
})

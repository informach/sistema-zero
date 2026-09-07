import { describe, expect, test } from 'bun:test'
import { watermarkCacheKey } from '../src/lib/download-mime'
import { type InlineWatermarkIo, watermarkedPdfInline } from '../src/server/private-delivery'
import {
  type ConcurrencyGate,
  createGate,
  WatermarkQueueBusyError,
} from '../src/server/watermark-queue'

/**
 * Entrega INLINE do PDF (≤20MB) com marca d'água por aluno — o caminho do livro 3D.
 * Incidente 07/09: sem cache, cada abertura re-marcava o PDF atrás de um gate de
 * concorrência 1 sem prazo; uma turma abrindo cadernos travava todos os e-books.
 * Estes testes fixam o contrato que impede a volta: cache hit não passa pelo
 * pdf-lib nem pelo gate; miss marca UMA vez e grava; falha de cache não falha a
 * entrega; fila cheia vira erro tipado (→ 503), não espera infinita.
 */

const SRC = 'admin/attachments/366b917b.pdf'
const ETAG = '7385eb79713a707c4eb518981aa01794'
const USER = 'user-1'
const EMAIL = 'aluno@example.com'
const CACHE_KEY = watermarkCacheKey(SRC, USER, ETAG)

const bytes = (s: string) => new TextEncoder().encode(s)
const streamOf = (data: Uint8Array) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(data)
      controller.close()
    },
  })
const readAll = async (body: ReadableStream<Uint8Array> | Uint8Array) => {
  if (body instanceof Uint8Array) return new TextDecoder().decode(body)
  return new TextDecoder().decode(new Uint8Array(await new Response(body).arrayBuffer()))
}

interface FakeIoOptions {
  cached?: boolean
  putFails?: boolean
  watermarkFails?: boolean
  gate?: ConcurrencyGate
  waitTimeoutMs?: number
}

function fakeIo(opts: FakeIoOptions = {}) {
  const calls = { head: [] as string[], get: [] as string[], put: [] as string[], watermark: 0 }
  let gateRuns = 0
  const gate: ConcurrencyGate = opts.gate ?? {
    async run(fn, gateOpts) {
      gateRuns++
      return createGate(1).run(fn, gateOpts)
    },
  }
  const io: InlineWatermarkIo = {
    head: async (key) => {
      calls.head.push(key)
      return opts.cached && key === CACHE_KEY ? { contentLength: 3 } : null
    },
    get: async (key) => {
      calls.get.push(key)
      return { body: streamOf(bytes(key === CACHE_KEY ? 'CACHED' : 'ORIGINAL')) }
    },
    put: async (input) => {
      calls.put.push(input.key)
      if (opts.putFails) throw new Error('R2 indisponível')
    },
    watermark: async (input, email) => {
      calls.watermark++
      if (opts.watermarkFails) throw new Error('PDF cifrado')
      return bytes(`MARKED(${new TextDecoder().decode(input)}|${email})`)
    },
    gate,
    waitTimeoutMs: opts.waitTimeoutMs,
  }
  return { io, calls, gateRuns: () => gateRuns }
}

const request = (io: InlineWatermarkIo, signal?: AbortSignal) =>
  watermarkedPdfInline({ srcKey: SRC, srcEtag: ETAG, email: EMAIL, userId: USER, signal }, io)

describe('watermarkedPdfInline', () => {
  test('cache hit: serve o PDF já marcado SEM passar pelo gate nem pelo pdf-lib', async () => {
    const { io, calls, gateRuns } = fakeIo({ cached: true })
    const out = await request(io)
    expect(out.cached).toBe(true)
    expect(await readAll(out.body)).toBe('CACHED')
    expect(calls.head).toEqual([CACHE_KEY])
    expect(calls.get).toEqual([CACHE_KEY]) // nunca baixa a origem
    expect(calls.watermark).toBe(0)
    expect(gateRuns()).toBe(0)
    expect(calls.put).toEqual([])
  })

  test('cache miss: marca com o e-mail do aluno, grava no cache (key com a versão) e entrega', async () => {
    const { io, calls, gateRuns } = fakeIo()
    const out = await request(io)
    expect(out.cached).toBe(false)
    expect(await readAll(out.body)).toBe(`MARKED(ORIGINAL|${EMAIL})`)
    expect(calls.get).toEqual([SRC])
    expect(calls.watermark).toBe(1)
    expect(gateRuns()).toBe(1)
    // A key do cache leva o ETag da origem: regravar o PDF na mesma key invalida sozinho.
    expect(calls.put).toEqual([CACHE_KEY])
    expect(CACHE_KEY).toContain(`/${ETAG}/`)
  })

  test('falha ao gravar o cache NÃO falha a entrega (o aluno recebe o PDF marcado)', async () => {
    const { io, calls } = fakeIo({ putFails: true })
    const out = await request(io)
    expect(await readAll(out.body)).toBe(`MARKED(ORIGINAL|${EMAIL})`)
    expect(calls.put).toEqual([CACHE_KEY]) // tentou
  })

  test('falha de marcação serve o ORIGINAL e não cacheia (problema transitório não gruda)', async () => {
    const { io, calls } = fakeIo({ watermarkFails: true })
    const out = await request(io)
    expect(await readAll(out.body)).toBe('ORIGINAL')
    expect(calls.put).toEqual([])
  })

  test('fila cheia além do prazo → WatermarkQueueBusyError (vira 503, não 524)', async () => {
    // Gate REAL de 1 vaga, ocupado por um job que não termina.
    const gate = createGate(1)
    let release!: () => void
    const blocker = gate.run(
      () =>
        new Promise<void>((r) => {
          release = r
        }),
    )
    const { io, calls } = fakeIo({ gate, waitTimeoutMs: 20 })
    await expect(request(io)).rejects.toBeInstanceOf(WatermarkQueueBusyError)
    expect(calls.watermark).toBe(0)
    expect(calls.put).toEqual([])
    release()
    await blocker
  })

  test('cliente foi embora (signal abortado) → sai da fila sem marcar', async () => {
    const gate = createGate(1)
    let release!: () => void
    const blocker = gate.run(
      () =>
        new Promise<void>((r) => {
          release = r
        }),
    )
    const { io, calls } = fakeIo({ gate, waitTimeoutMs: 5_000 })
    const aborter = new AbortController()
    const pending = request(io, aborter.signal)
    aborter.abort()
    await expect(pending).rejects.toMatchObject({ code: 'WATERMARK_ABORTED' })
    expect(calls.watermark).toBe(0)
    release()
    await blocker
  })

  test('sem ETag (legado) cai na key antiga — não zera o cache de quem já tinha', async () => {
    const { io, calls } = fakeIo()
    await watermarkedPdfInline({ srcKey: SRC, srcEtag: null, email: EMAIL, userId: USER }, io)
    expect(calls.put).toEqual([watermarkCacheKey(SRC, USER)])
    expect(calls.put[0]).toMatch(/^watermarked\/[0-9a-f]{64}\/user-1\.pdf$/)
  })
})

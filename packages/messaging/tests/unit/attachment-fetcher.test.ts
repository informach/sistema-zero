import { afterAll, describe, expect, it } from 'bun:test'
import { ProviderSendError } from '../../src/domain/ports/provider-error'
import { HttpAttachmentFetcher } from '../../src/infrastructure/gateways/http-attachment-fetcher'

const PDF_BYTES = new TextEncoder().encode('%PDF-1.4 fake-danfse')

// Servidor efêmero (porta 0): simula o serviço fiscal servindo o DANFSe.
const server = Bun.serve({
  port: 0,
  fetch(req) {
    const url = new URL(req.url)
    if (url.pathname === '/danfse.pdf') {
      return new Response(PDF_BYTES, { headers: { 'content-type': 'application/pdf' } })
    }
    if (url.pathname === '/grande-declarado') {
      // content-length explícito acima do teto.
      return new Response(new Uint8Array(4096), {
        headers: { 'content-type': 'application/pdf' },
      })
    }
    if (url.pathname === '/grande-stream') {
      // Corpo MAIOR que o teto SEM content-length (chunked) — só o tamanho REAL pega.
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          for (let i = 0; i < 3; i++) controller.enqueue(new Uint8Array(512))
          controller.close()
        },
      })
      return new Response(stream)
    }
    if (url.pathname === '/erro-500') return new Response('boom', { status: 500 })
    if (url.pathname === '/lento') {
      return new Promise<Response>((resolve) =>
        setTimeout(() => resolve(new Response('tarde demais')), 500),
      )
    }
    return new Response('not found', { status: 404 })
  },
})
afterAll(() => server.stop(true))

const base = () => `http://127.0.0.1:${server.port}`
const fetcher = (
  over: Partial<{ maxBytes: number; allowedHosts: string[]; timeoutMs: number }> = {},
) =>
  new HttpAttachmentFetcher({
    maxBytes: over.maxBytes ?? 1024,
    allowedHosts: over.allowedHosts ?? [],
    timeoutMs: over.timeoutMs,
  })

async function expectSendError(
  promise: Promise<unknown>,
  expected: { permanent: boolean; code?: string },
): Promise<ProviderSendError> {
  const error = await promise.then(
    () => null,
    (e) => e as unknown,
  )
  expect(error).toBeInstanceOf(ProviderSendError)
  const sendError = error as ProviderSendError
  expect(sendError.permanent).toBe(expected.permanent)
  if (expected.code) expect(sendError.code).toBe(expected.code)
  return sendError
}

describe('HttpAttachmentFetcher', () => {
  it('busca a URL e devolve base64 + contentType da origem', async () => {
    const result = await fetcher().fetch(`${base()}/danfse.pdf`)
    expect(result.contentBase64).toBe(Buffer.from(PDF_BYTES).toString('base64'))
    expect(result.contentType).toBe('application/pdf')
  })

  it('allowlist vazia = qualquer host (dev liberado)', async () => {
    const result = await fetcher({ allowedHosts: [] }).fetch(`${base()}/danfse.pdf`)
    expect(result.contentBase64.length).toBeGreaterThan(0)
  })

  it('allowlist setada BLOQUEIA host fora da lista (permanente, anti-SSRF)', async () => {
    await expectSendError(
      fetcher({ allowedHosts: ['fiscal.railway.internal'] }).fetch(`${base()}/danfse.pdf`),
      { permanent: true, code: 'ATTACHMENT_HOST_NOT_ALLOWED' },
    )
  })

  it('allowlist é case-insensitive e aceita o host listado', async () => {
    const result = await fetcher({ allowedHosts: ['127.0.0.1'] }).fetch(`${base()}/danfse.pdf`)
    expect(result.contentType).toBe('application/pdf')
  })

  it('content-length declarado acima do teto → falha RE-TENTÁVEL', async () => {
    await expectSendError(fetcher({ maxBytes: 1024 }).fetch(`${base()}/grande-declarado`), {
      permanent: false,
      code: 'ATTACHMENT_TOO_LARGE',
    })
  })

  it('tamanho REAL lido acima do teto (sem content-length) → falha RE-TENTÁVEL', async () => {
    await expectSendError(fetcher({ maxBytes: 1024 }).fetch(`${base()}/grande-stream`), {
      permanent: false,
      code: 'ATTACHMENT_TOO_LARGE',
    })
  })

  it('4xx/5xx da origem → falha RE-TENTÁVEL (mesmo caminho de retry do provedor)', async () => {
    const notFound = await expectSendError(fetcher().fetch(`${base()}/sumiu`), {
      permanent: false,
      code: 'ATTACHMENT_FETCH_FAILED',
    })
    expect(notFound.status).toBe(404)
    const serverError = await expectSendError(fetcher().fetch(`${base()}/erro-500`), {
      permanent: false,
      code: 'ATTACHMENT_FETCH_FAILED',
    })
    expect(serverError.status).toBe(500)
  })

  it('timeout → falha RE-TENTÁVEL', async () => {
    await expectSendError(fetcher({ timeoutMs: 50 }).fetch(`${base()}/lento`), {
      permanent: false,
      code: 'ATTACHMENT_FETCH_FAILED',
    })
  })

  it('URL inválida ou protocolo não-http(s) → falha PERMANENTE', async () => {
    await expectSendError(fetcher().fetch('isto não é url'), {
      permanent: true,
      code: 'ATTACHMENT_URL_INVALID',
    })
    await expectSendError(fetcher().fetch('file:///etc/passwd'), {
      permanent: true,
      code: 'ATTACHMENT_URL_INVALID',
    })
  })
})

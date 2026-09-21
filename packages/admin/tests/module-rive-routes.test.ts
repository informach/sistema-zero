import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

mock.module('server-only', () => ({}))

const R2_PUBLIC_URL = 'https://media.test'
const PREFIXO = `${R2_PUBLIC_URL}/admin/module-rive/`

// ⚠️ Espalhar o módulo REAL e sobrescrever só o necessário: o `mock.module` do bun
// é GLOBAL AO RUN, e um mock parcial vaza para os arquivos seguintes — quem
// importar um símbolo que ele não exporta quebra com `Export named 'X' not found`,
// longe daqui. Mesma receita do `fixtures/lesson-publication.fixture.ts`.
// ⚠️ Preenche a env REAL em vez de mockar `@/lib/env`. O `mock.module` do bun é
// global ao run e um `getEnv` falso vazaria para todo arquivo seguinte; o schema
// só exige uma forma de verificar o token, então isto sai mais barato e mais
// honesto (a rota passa pelo `getEnv` de verdade). Antes de qualquer import que o
// chame — o `getEnv` memoriza na primeira chamada.
process.env.JWT_HS256_SECRET ??= 'segredo-de-teste-com-16+'
process.env.R2_PUBLIC_URL = R2_PUBLIC_URL

let putArgs: { key: string; body: Uint8Array; contentType: string } | null = null
const actualR2 = await import('@/server/r2')
mock.module('@/server/r2', () => ({
  ...actualR2,
  r2PutObject: async (input: { key: string; body: Uint8Array; contentType: string }) => {
    putArgs = input
    return { key: input.key, url: `${R2_PUBLIC_URL}/${input.key}` }
  },
}))

let sessao: unknown = { id: 'admin-1', role: 'admin' }
const actualMedia = await import('@/server/media')
mock.module('@/server/media', () => ({
  ...actualMedia,
  requireMediaSession: async () => sessao,
}))

const { POST } = await import('../src/app/api/media/module-rive/route')
const { GET } = await import('../src/app/api/media/module-rive/preview/route')

const RIV = new Uint8Array(
  readFileSync(resolve(import.meta.dir, '../../community-kids/public/zappy/happy.riv')),
)

/**
 * Requisição com a FORMA que a rota consome (`headers.get` + `formData()`), em vez
 * de um `Request` de verdade.
 *
 * ⚠️⚠️ Duas armadilhas de implementação de fetch tornam o `Request` real inviável
 * aqui, e as duas só aparecem na suíte COMPLETA, nunca no arquivo isolado:
 *  1. `content-length` é FORBIDDEN HEADER NAME — construir um `Request` com ele o
 *     descarta assim que o polyfill do `next/server` (carregado por outro arquivo
 *     antes deste) está no lugar, e a rota responde 411.
 *  2. Um corpo multipart codificado pelo `Response` do Bun volta como
 *     `ERR_FORMDATA_PARSE_ERROR` nesse mesmo polyfill.
 *
 * O `Headers` avulso não filtra nada (o guard "forbidden" é do `Request`), então o
 * `content-length` chega inteiro ao `rejectOversizedRequest` — que é exatamente o
 * que este teste precisa exercitar.
 */
function requisicao(form: FormData | null, headers: Record<string, string>): Request {
  return {
    headers: new Headers(headers),
    formData: async () => {
      if (!form) throw new Error('sem corpo')
      return form
    },
  } as unknown as Request
}

async function upload(nome: string, bytes: Uint8Array): Promise<Response> {
  const form = new FormData()
  form.set('file', new File([bytes as BlobPart], nome))
  return POST(
    requisicao(form, {
      'content-type': 'multipart/form-data; boundary=x',
      'content-length': String(bytes.byteLength + 200),
    }),
  )
}

const preview = (src: string) =>
  GET(
    new Request(`https://admin.test/api/media/module-rive/preview?src=${encodeURIComponent(src)}`),
  )

beforeEach(() => {
  putArgs = null
  sessao = { id: 'admin-1', role: 'admin' }
})

describe('POST /api/media/module-rive', () => {
  test('publica o .riv no bucket público como octet-stream', async () => {
    const response = await upload('nave.riv', RIV)
    expect(response.status).toBe(200)
    expect((await response.json()).url).toStartWith(PREFIXO)
    expect(putArgs?.key).toStartWith('admin/module-rive/')
    expect(putArgs?.key).toEndWith('.riv')
    // ⚠️ Nunca um tipo que o navegador possa ATIVAR por sniffing — é a diferença
    // que a troca do SVG comprou.
    expect(putArgs?.contentType).toBe('application/octet-stream')
    expect(new Uint8Array(putArgs?.body as Uint8Array)).toEqual(RIV)
  })

  test('recusa extensão errada antes de olhar os bytes', async () => {
    const response = await upload('nave.svg', RIV)
    expect(response.status).toBe(400)
    expect(putArgs).toBeNull()
  })

  test('recusa um arquivo que só FINGE ser .riv (o portão são os bytes)', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
    const response = await upload('nave.riv', png)
    expect(response.status).toBe(400)
    expect((await response.json()).error.message).toContain('não é uma animação Rive')
    expect(putArgs).toBeNull()
  })

  test('Content-Length ausente é 411 (corpo chunked passaria sem teto)', async () => {
    const response = await POST(requisicao(null, { 'content-type': 'multipart/form-data' }))
    expect(response.status).toBe(411)
  })

  test('Content-Length acima do teto é 413, antes de materializar o corpo', async () => {
    const response = await POST(
      requisicao(new FormData(), {
        'content-type': 'multipart/form-data; boundary=x',
        'content-length': String(50 * 1024 * 1024),
      }),
    )
    expect(response.status).toBe(413)
    expect(putArgs).toBeNull()
  })

  test('sem sessão de admin não sobe nada', async () => {
    const { NextResponse } = await import('next/server')
    sessao = NextResponse.json({ error: 'nope' }, { status: 401 })
    expect((await upload('nave.riv', RIV)).status).toBe(401)
    expect(putArgs).toBeNull()
  })
})

describe('GET /api/media/module-rive/preview', () => {
  test('⚠️ recusa qualquer src fora do acervo do painel (guarda anti-SSRF)', async () => {
    for (const src of [
      'https://atacante.test/carga.riv',
      `${R2_PUBLIC_URL}/admin/attachments/segredo.pdf`,
      `${R2_PUBLIC_URL}.atacante.test/admin/module-rive/x.riv`,
      'http://169.254.169.254/latest/meta-data/',
      '',
    ]) {
      const response = await preview(src)
      expect(response.status).toBe(400)
    }
  })

  test('serve o arquivo do acervo sem deixar o navegador ativar o tipo', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async () =>
      new Response(RIV as BlobPart, { status: 200 })) as unknown as typeof globalThis.fetch
    try {
      const response = await preview(`${PREFIXO}nave.riv`)
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('application/octet-stream')
      expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

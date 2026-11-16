import { NextResponse } from 'next/server'
import { descreverArteCenario, validarArteCenario } from '@/lib/cenarios-assets'
import { requireLocalAdminSession } from '@/server/local-admin-session'
import { MediaNotConfiguredError, r2PutObjectPrivate, r2ReadCenarioAsset } from '@/server/r2'

type Context = { params: Promise<{ arquivo: string }> }
const privativo = { 'cache-control': 'private, no-store' }
let envios = 0
function falha(error: unknown) {
  if (error instanceof MediaNotConfiguredError)
    return NextResponse.json(
      { error: { code: 'ARTE_INDISPONIVEL', message: 'Armazenamento privado não configurado.' } },
      { status: 503, headers: privativo },
    )
  const nome = (error as { name?: string })?.name
  if (nome === 'NoSuchKey' || nome === 'NotFound')
    return NextResponse.json(
      { error: { code: 'ARTE_AUSENTE', message: 'Arte ainda não preparada no acervo.' } },
      { status: 404, headers: privativo },
    )
  throw error
}
export async function GET(request: Request, context: Context) {
  const s = await requireLocalAdminSession('Somente administradores podem acessar o acervo.', {
    signal: request.signal,
  })
  if (s instanceof NextResponse) return s
  let d: ReturnType<typeof descreverArteCenario>
  try {
    d = descreverArteCenario((await context.params).arquivo)
  } catch {
    return NextResponse.json(
      { error: { code: 'ARTE_INVALIDA', message: 'Identificador inválido.' } },
      { status: 400, headers: privativo },
    )
  }
  try {
    const bytes = await r2ReadCenarioAsset(d.key, d.maxBytes)
    return new Response(new Uint8Array(bytes), {
      headers: {
        'content-type': d.contentType,
        'content-length': String(bytes.byteLength),
        'cache-control': 'private, max-age=604800, immutable',
        vary: 'Cookie',
        'x-content-type-options': 'nosniff',
      },
    })
  } catch (e) {
    return falha(e)
  }
}
export async function PUT(request: Request, context: Context) {
  const s = await requireLocalAdminSession('Somente administradores podem preparar o acervo.', {
    signal: request.signal,
  })
  if (s instanceof NextResponse) return s
  let d: ReturnType<typeof descreverArteCenario>
  const arquivo = (await context.params).arquivo
  try {
    d = descreverArteCenario(arquivo)
  } catch {
    return NextResponse.json(
      { error: { code: 'ARTE_INVALIDA', message: 'Identificador inválido.' } },
      { status: 400, headers: privativo },
    )
  }
  if (envios >= 2)
    return NextResponse.json(
      { error: { code: 'ACERVO_OCUPADO', message: 'Aguarde os envios atuais.' } },
      { status: 429, headers: { ...privativo, 'retry-after': '2' } },
    )
  if (
    request.headers.has('content-encoding') ||
    request.headers.get('content-type')?.split(';')[0] !== d.contentType
  )
    return NextResponse.json(
      { error: { code: 'ARTE_INVALIDA', message: 'Tipo de arquivo inválido.' } },
      { status: 400, headers: privativo },
    )
  if (Number(request.headers.get('content-length') ?? 0) > d.maxBytes)
    return new Response(null, { status: 413, headers: privativo })
  if (!request.body) return new Response(null, { status: 400, headers: privativo })
  envios++
  const reader = request.body.getReader()
  try {
    const partes: Uint8Array[] = []
    let tamanho = 0
    for (;;) {
      const r = await reader.read()
      if (r.done) break
      tamanho += r.value.byteLength
      if (tamanho > d.maxBytes) {
        await reader.cancel()
        return new Response(null, { status: 413, headers: privativo })
      }
      partes.push(r.value)
    }
    const bytes = Buffer.concat(partes)
    try {
      validarArteCenario(arquivo, bytes)
    } catch (e) {
      return NextResponse.json(
        {
          error: {
            code: 'ARTE_INVALIDA',
            message: e instanceof Error ? e.message : 'Arquivo inválido.',
          },
        },
        { status: 422, headers: privativo },
      )
    }
    await r2PutObjectPrivate({ key: d.key, body: bytes, contentType: d.contentType })
    return NextResponse.json({ digest: d.digest, bytes: bytes.length }, { headers: privativo })
  } catch (e) {
    return falha(e)
  } finally {
    envios--
    reader.releaseLock()
  }
}

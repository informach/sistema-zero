import { NextResponse } from 'next/server'
import { mediaErrorResponse, moduleRivePublicPrefix, requireMediaSession } from '@/server/media'

/**
 * Serve um `.riv` já publicado para a prévia do painel.
 *
 * ⚠️ POR QUE UM PROXY, e não buscar o CDN direto do navegador: o `connect-src`
 * do admin é uma das poucas diretivas realmente estreitas que restaram
 * (`'self'` + três hosts nomeados, sem `https:`), e o host público do R2 MUDA
 * por ambiente (`*.r2.dev` em dev, domínio próprio em produção). Derivar da env
 * no `next.config.ts` também não serve: o `headers()` é serializado para o
 * `routes-manifest.json` no BUILD, então exigiria a variável presente no build
 * do container. Com o proxy, `connect-src 'self'` já cobre e a CSP fica estática
 * e correta em todo ambiente.
 *
 * ⚠️ O prefixo exato é o guarda anti-SSRF: sem ele esta rota buscaria qualquer
 * URL que o cliente mandasse, autenticada como o painel.
 */
export async function GET(req: Request) {
  const session = await requireMediaSession()
  if (session instanceof NextResponse) return session

  try {
    const src = new URL(req.url).searchParams.get('src') ?? ''
    if (!src.startsWith(moduleRivePublicPrefix())) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Animação fora do acervo do painel.' } },
        { status: 400 },
      )
    }
    const upstream = await fetch(src)
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Animação não encontrada no acervo.' } },
        { status: 404 },
      )
    }
    return new NextResponse(upstream.body, {
      headers: {
        'content-type': 'application/octet-stream',
        'x-content-type-options': 'nosniff',
        // A chave carrega UUID novo a cada upload, então o conteúdo nunca muda.
        'cache-control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    return mediaErrorResponse(error)
  }
}

import { NextResponse } from 'next/server'
import { getInvoicePdf } from '@/server/nfse'

/**
 * PDF da nota — streaming pass-through do binário do fiscal (via gateway).
 * Erros (404 sem PDF, 401 etc.) chegam como JSON e são repassados no envelope.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const res = await getInvoicePdf(id)

  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null)
    return NextResponse.json(
      body ?? { error: { code: 'PDF_UNAVAILABLE', message: 'PDF indisponível.' } },
      { status: res.ok ? 502 : res.status },
    )
  }

  // `id` vem da URL — sanitiza p/ o filename do header (sem aspas/CR/LF).
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '')
  const headers = new Headers({
    'content-type': res.headers.get('content-type') ?? 'application/pdf',
    'content-disposition':
      res.headers.get('content-disposition') ?? `inline; filename="nfse-${safeId}.pdf"`,
    'cache-control': 'no-store',
  })
  const length = res.headers.get('content-length')
  if (length) headers.set('content-length', length)

  return new Response(res.body, { status: 200, headers })
}

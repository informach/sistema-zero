import 'server-only'
import { NextResponse } from 'next/server'
import { normalizeUpstreamError } from '@/lib/upstream'

interface UpstreamResult {
  status: number
  body: unknown
}

/**
 * Repassa a resposta de uma chamada ao gateway de volta ao client. Em SUCESSO
 * (status < 400) repassa o corpo intacto; em ERRO, normaliza para o envelope
 * `{ error: { code, message } }` (ver `normalizeUpstreamError`) para não vazar o
 * corpo interno do upstream. Substitui o antigo `NextResponse.json(body, { status })`
 * espalhado nos route handlers de pass-through. Achado do 3º full review.
 */
export function forwardUpstream({ status, body }: UpstreamResult): NextResponse {
  if (status < 400) return NextResponse.json(body, { status })
  return NextResponse.json(normalizeUpstreamError(body), { status })
}

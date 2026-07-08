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
 * corpo interno do upstream. Use SEMPRE no pass-through em vez de
 * `NextResponse.json(body, { status })`. (Padrão herdado do admin.)
 */
export function forwardUpstream({ status, body }: UpstreamResult): NextResponse {
  // 204/205/304 não admitem corpo — o construtor do Response LANÇA com json()
  // (o DELETE de artigo do helpdesk responde 204).
  if (status === 204 || status === 205 || status === 304) {
    return new NextResponse(null, { status })
  }
  if (status < 400) return NextResponse.json(body, { status })
  return NextResponse.json(normalizeUpstreamError(body), { status })
}

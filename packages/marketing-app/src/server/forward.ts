import 'server-only'
import { retryAfterHeaders } from '@sistemazero/marketing-contracts'
import { NextResponse } from 'next/server'
import { normalizeUpstreamError } from '@/lib/upstream'

interface UpstreamResult {
  status: number
  body: unknown
  retryAfterMs?: number
}

/**
 * Repassa a resposta de uma chamada ao gateway de volta ao client. Em SUCESSO
 * (status < 400) repassa o corpo intacto; em ERRO, normaliza para o envelope
 * `{ error: { code, message } }` (ver `normalizeUpstreamError`) para não vazar o
 * corpo interno do upstream. Use SEMPRE no pass-through em vez de
 * `NextResponse.json(body, { status })`. (Padrão herdado do admin.)
 */
export function forwardUpstream({ status, body, retryAfterMs }: UpstreamResult): NextResponse {
  if (status < 400) return NextResponse.json(body, { status })
  return NextResponse.json(normalizeUpstreamError(body), {
    status,
    headers: retryAfterHeaders(retryAfterMs),
  })
}

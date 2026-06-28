import { NextResponse } from 'next/server'
import { isValidCancelReason } from '@/lib/nfse'
import { forwardUpstream } from '@/server/forward'
import { cancelInvoice } from '@/server/nfse'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = (await req.json().catch(() => null)) as { reason?: unknown } | null
  const reason = typeof payload?.reason === 'string' ? payload.reason.trim() : ''
  if (!isValidCancelReason(reason)) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_REASON',
          message: 'Informe o motivo do cancelamento (15 a 255 caracteres — exigência da Sefin).',
        },
      },
      { status: 400 },
    )
  }
  const { status, body } = await cancelInvoice(id, reason)
  return forwardUpstream({ status, body })
}

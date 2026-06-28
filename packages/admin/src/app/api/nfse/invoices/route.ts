import { NextResponse } from 'next/server'
import { parseLimit, parseOffset } from '@/lib/list-params'
import { isValidUuid } from '@/lib/nfse'
import { forwardUpstream } from '@/server/forward'
import { createManualInvoice, listInvoices } from '@/server/nfse'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const { status, body } = await listInvoices({
    status: searchParams.get('status') ?? undefined,
    q: searchParams.get('q') ?? undefined,
    limit: parseLimit(searchParams.get('limit')),
    offset: parseOffset(searchParams.get('offset')),
  })
  return forwardUpstream({ status, body })
}

/** Emissão MANUAL por pagamento — valida o uuid AQUI (400) antes de ir ao gateway. */
export async function POST(req: Request) {
  const payload = (await req.json().catch(() => null)) as { paymentId?: unknown } | null
  const paymentId = typeof payload?.paymentId === 'string' ? payload.paymentId.trim() : ''
  if (!isValidUuid(paymentId)) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_PAYMENT_ID',
          message: 'Informe o Payment ID no formato UUID.',
        },
      },
      { status: 400 },
    )
  }
  const { status, body } = await createManualInvoice(paymentId)
  return forwardUpstream({ status, body })
}

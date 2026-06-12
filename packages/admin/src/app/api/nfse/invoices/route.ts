import { NextResponse } from 'next/server'
import { isValidUuid } from '@/lib/nfse'
import { createManualInvoice, listInvoices } from '@/server/nfse'

function num(value: string | null): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const { status, body } = await listInvoices({
    status: searchParams.get('status') ?? undefined,
    q: searchParams.get('q') ?? undefined,
    limit: num(searchParams.get('limit')),
    offset: num(searchParams.get('offset')),
  })
  return NextResponse.json(body, { status })
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
  return NextResponse.json(body, { status })
}

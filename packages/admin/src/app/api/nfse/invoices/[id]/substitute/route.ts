import { NextResponse } from 'next/server'
import { forwardUpstream } from '@/server/forward'
import { type SubstituteInvoiceBody, substituteInvoice } from '@/server/nfse'

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = (await req.json().catch(() => null)) as Record<string, unknown> | null

  const body: SubstituteInvoiceBody = {}
  const customerName = str(payload?.customerName)
  if (customerName) body.customerName = customerName
  const customerDocument = str(payload?.customerDocument)
  if (customerDocument) body.customerDocument = customerDocument
  const serviceDescription = str(payload?.serviceDescription)
  if (serviceDescription) body.serviceDescription = serviceDescription

  if (Object.keys(body).length === 0) {
    return NextResponse.json(
      {
        error: {
          code: 'NO_FIELDS',
          message: 'Informe ao menos um campo a corrigir na nota substituta.',
        },
      },
      { status: 400 },
    )
  }

  const { status, body: result } = await substituteInvoice(id, body)
  return forwardUpstream({ status, body: result })
}

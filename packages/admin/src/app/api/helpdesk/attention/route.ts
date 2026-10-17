import { NextResponse } from 'next/server'
import { isTicketPage, toAttentionView } from '@/lib/helpdesk-panel'
import { forwardUpstream } from '@/server/forward'
import { listHelpdeskAttentionTickets } from '@/server/helpdesk'

export async function GET() {
  const result = await listHelpdeskAttentionTickets()
  if (result.status >= 400) return forwardUpstream(result)
  if (!isTicketPage(result.body)) {
    return NextResponse.json(
      {
        error: {
          code: 'UPSTREAM_INVALID',
          message: 'O atendimento respondeu num formato inesperado.',
        },
      },
      { status: 502 },
    )
  }
  return NextResponse.json(toAttentionView(result.body))
}

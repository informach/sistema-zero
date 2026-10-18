import { forwardUpstream } from '@/server/forward'
import { getHelpdeskTicketStats } from '@/server/helpdesk'

export async function GET() {
  return forwardUpstream(await getHelpdeskTicketStats())
}

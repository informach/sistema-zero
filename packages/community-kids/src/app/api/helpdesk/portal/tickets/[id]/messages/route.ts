import { requireParentGateAccountOnly } from '@/server/parent-gate'
import { shell } from '@/server/shell'

export const POST = requireParentGateAccountOnly(shell.routes.helpdeskTicketMessages.POST)

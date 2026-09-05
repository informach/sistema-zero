import { requireParentGateAccountOnly } from '@/server/parent-gate'
import { shell } from '@/server/shell'

// Tickets são da conta/e-mail do responsável. Sessão de perfil é recusada antes
// de a chamada alcançar o gateway ou o Helpdesk.
export const GET = requireParentGateAccountOnly(shell.routes.helpdeskTickets.GET)
export const POST = requireParentGateAccountOnly(shell.routes.helpdeskTickets.POST)

import { requireParentGateAccountOnly } from '@/server/parent-gate'
import { shell } from '@/server/shell'
export const GET = requireParentGateAccountOnly(shell.routes.paymentsMyRetryIntents.GET)
export const POST = requireParentGateAccountOnly(shell.routes.paymentsMyRetryIntents.POST)

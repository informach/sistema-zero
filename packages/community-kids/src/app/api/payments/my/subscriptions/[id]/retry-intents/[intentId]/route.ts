import { requireParentGateAccountOnly } from '@/server/parent-gate'
import { shell } from '@/server/shell'
export const GET = requireParentGateAccountOnly(shell.routes.paymentsMyRetryIntent.GET)
export const POST = requireParentGateAccountOnly(shell.routes.paymentsMyRetryIntent.POST)

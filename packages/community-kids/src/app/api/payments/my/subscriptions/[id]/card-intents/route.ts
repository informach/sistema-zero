import { requireParentGateAccountOnly } from '@/server/parent-gate'
import { shell } from '@/server/shell'
export const GET = requireParentGateAccountOnly(shell.routes.paymentsMyCardIntents.GET)
export const POST = requireParentGateAccountOnly(shell.routes.paymentsMyCardIntents.POST)

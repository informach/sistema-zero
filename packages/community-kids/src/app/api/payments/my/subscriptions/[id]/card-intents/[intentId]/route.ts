import { requireParentGateAccountOnly } from '@/server/parent-gate'
import { shell } from '@/server/shell'
export const GET = requireParentGateAccountOnly(shell.routes.paymentsMyCardIntent.GET)
export const POST = requireParentGateAccountOnly(shell.routes.paymentsMyCardIntent.POST)

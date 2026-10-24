import { requireOwnAdultAccount } from '@/server/own-account'
import { shell } from '@/server/shell'
export const GET = requireOwnAdultAccount(shell.routes.paymentsMyCardIntents.GET)
export const POST = requireOwnAdultAccount(shell.routes.paymentsMyCardIntents.POST)

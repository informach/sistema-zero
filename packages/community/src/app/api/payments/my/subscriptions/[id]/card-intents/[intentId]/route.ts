import { requireOwnAdultAccount } from '@/server/own-account'
import { shell } from '@/server/shell'
export const GET = requireOwnAdultAccount(shell.routes.paymentsMyCardIntent.GET)
export const POST = requireOwnAdultAccount(shell.routes.paymentsMyCardIntent.POST)

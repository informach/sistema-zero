import { requireParentGateAccountOnly } from '@/server/parent-gate'
import { shell } from '@/server/shell'
export const GET = requireParentGateAccountOnly(shell.routes.arquipelagoMinijogosDaFamilia.GET)

export const POST = requireParentGateAccountOnly(shell.routes.arquipelagoMinijogosDaFamilia.POST)

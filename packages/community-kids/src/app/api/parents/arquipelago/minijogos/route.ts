import { requireParentGateAccountOnly } from '@/server/parent-gate'
import { shell } from '@/server/shell'
export const GET = requireParentGateAccountOnly(shell.routes.arquipelagoTodosMinijogosDaFamilia.GET)

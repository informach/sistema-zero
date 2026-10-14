import { requireParentGateAccountOnly } from '@/server/parent-gate'
import { shell } from '@/server/shell'
export const GET = requireParentGateAccountOnly(shell.routes.parentLive)
export const POST = requireParentGateAccountOnly(shell.routes.parentLive)

import { requireParentGate } from '@/server/parent-gate'
import { shell } from '@/server/shell'

// Resumo de progresso dos filhos — só atrás do portão de senha do responsável.
export const GET = requireParentGate(shell.routes.childrenStats.GET)

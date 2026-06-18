import { requireParentGate } from '@/server/parent-gate'
import { shell } from '@/server/shell'

// Compras do RESPONSÁVEL — só na área dos pais (sessão da conta, atrás do portão de senha).
export const GET = requireParentGate(shell.routes.paymentsMy.GET)

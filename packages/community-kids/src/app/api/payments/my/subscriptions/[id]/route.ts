import { requireParentGateAccountOnly } from '@/server/parent-gate'
import { shell } from '@/server/shell'

// Cancelar assinatura é decisão do RESPONSÁVEL — atrás do portão de senha.
export const DELETE = requireParentGateAccountOnly(shell.routes.paymentsMySubscriptionCancel.DELETE)

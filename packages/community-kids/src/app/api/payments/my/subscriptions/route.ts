import { requireParentGateAccountOnly } from '@/server/parent-gate'
import { shell } from '@/server/shell'

// Assinaturas do RESPONSÁVEL — só na área dos pais (mesma régua do /payments/my:
// sessão da CONTA, atrás do portão de senha; a criança é recusada).
export const GET = requireParentGateAccountOnly(shell.routes.paymentsMySubscriptions.GET)

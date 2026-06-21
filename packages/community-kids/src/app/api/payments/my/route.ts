import { requireParentGateAccountOnly } from '@/server/parent-gate'
import { shell } from '@/server/shell'

// Compras do RESPONSÁVEL — só na área dos pais (sessão da CONTA, atrás do portão de
// senha). Estrito (account-only): o `/payments/my` é filtrado por e-mail e a sessão de
// perfil herda o e-mail do responsável, então a criança NÃO pode passar (403).
export const GET = requireParentGateAccountOnly(shell.routes.paymentsMy.GET)

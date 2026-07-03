import { requireParentGateAccountOnly } from '@/server/parent-gate'
import { shell } from '@/server/shell'

// Preferência do report semanal dos pais (opt-out) — EXCLUSIVO dos pais (sessão da
// CONTA + portão de senha), mesma régua do children-stats/payments-my: a sessão de
// perfil (criança) é RECUSADA.
export const GET = requireParentGateAccountOnly(shell.routes.parentReportPrefs.GET)
export const PUT = requireParentGateAccountOnly(shell.routes.parentReportPrefs.PUT)

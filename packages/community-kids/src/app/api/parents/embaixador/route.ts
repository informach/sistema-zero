import { requireParentGateAccountOnly } from '@/server/parent-gate'
import { shell } from '@/server/shell'

// Embaixador da Bolsa do Primeiro Jogo (auto-cadastro do responsável) —
// EXCLUSIVO dos pais (sessão da CONTA + portão de senha), mesma régua do
// children-stats/report-prefs: a sessão de perfil (criança) é RECUSADA.
export const GET = requireParentGateAccountOnly(shell.routes.ambassadorMe.GET)
export const POST = requireParentGateAccountOnly(shell.routes.ambassadorMe.POST)

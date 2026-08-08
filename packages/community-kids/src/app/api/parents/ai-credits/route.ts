import { requireParentGateAccountOnly } from '@/server/parent-gate'
import { shell } from '@/server/shell'

// MESMO payload da rota da criança; o que muda é o portão. Sessão de perfil é
// RECUSADA aqui (régua do children-stats/report-prefs) — o painel do mês vive na
// área dos pais, atrás da senha do responsável.
export const GET = requireParentGateAccountOnly(shell.routes.aiCredits.GET)

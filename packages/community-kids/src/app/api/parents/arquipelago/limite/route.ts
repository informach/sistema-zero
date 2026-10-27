import { requireParentGateAccountOnly } from '@/server/parent-gate'
import { shell } from '@/server/shell'

// Arquipélago Vagalume: o tempo livre diário da família (padrão 30 minutos). EXCLUSIVO dos pais
// (sessão da CONTA + portão de senha), mesma régua do children-stats.
export const GET = requireParentGateAccountOnly(shell.routes.arquipelagoLimiteDaFamilia.GET)
export const PUT = requireParentGateAccountOnly(shell.routes.arquipelagoLimiteDaFamilia.PUT)

import { requireParentGateAccountOnly } from '@/server/parent-gate'
import { shell } from '@/server/shell'

// A foto do avatar de cada filho, para o menu da área dos pais (debaixo de Família). EXCLUSIVO
// dos pais (sessão da CONTA), mesma régua do children-stats: a sessão de perfil é RECUSADA.
export const GET = requireParentGateAccountOnly(shell.routes.familyAvatars.GET)
